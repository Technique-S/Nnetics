import { test, expect, type Page } from "@playwright/test";
import { MockOwnerAdapter } from "../../src/data/mock-adapter";

async function meteor(page: Page, pending = false) {
  await page.addInitScript((hold) => {
    let listener: (data: unknown) => void;
    const probe = { requests: 0, decline: () => {} };
    (window as unknown as { meteorProbe: unknown }).meteorProbe = probe;
    (window as unknown as { meteorCom: unknown }).meteorCom = {
      addMessageDataListener(fn: (data: unknown) => void) {
        listener = fn;
      },
      sendMessageData(data: {
        uid: string;
        status: string;
        actionType: string;
        network: string;
        inputs?: { accountId: string };
      }) {
        if (data.actionType !== "sign_message" || data.network !== "testnet")
          throw Error("Unexpected wallet action");
        if (data.status !== "initializing") return;
        probe.requests++;
        probe.decline = () =>
          listener({ uid: data.uid, status: "closed_fail" });
        if (!hold)
          queueMicrotask(() =>
            listener({
              uid: data.uid,
              status: "closed_success",
              payload: {
                accountId: data.inputs!.accountId,
                publicKey: `ed25519:${"1".repeat(32)}`,
                signature: `${"A".repeat(86)}==`,
              },
            }),
          );
        else
          queueMicrotask(() =>
            listener({ uid: data.uid, status: "connected" }),
          );
      },
    };
  }, pending);
}
async function fixture(page: Page, initial = "", pending = false) {
  await meteor(page, pending);
  let account = initial,
    loginCalls = 0,
    logoutCalls = 0,
    deny = false;
  const orgs = new Map<
    string,
    { id: string; name: string; status: string; role: string }[]
  >();
  await page.route("**/api/live/config", (route) =>
    route.fulfill({
      json: {
        network: "testnet",
        organization: "studio",
        contract: "vault.owner.testnet",
        worker: "worker.owner.testnet",
        publicKey: "",
        configured: false,
        transactionsEnabled: false,
      },
    }),
  );
  await page.route("**/api/live/provisioning?*", (route) =>
    route.fulfill({
      json: {
        configured: false,
        enabled: false,
        network: "testnet",
        requiredFunding: "5000000000000000000000000",
      },
    }),
  );
  await page.route("**/api/live/identity", (route) =>
    account
      ? route.fulfill({
          json: {
            accountId: account,
            network: "testnet",
            organizations: orgs.get(account) || [],
            notice: "",
          },
        })
      : route.fulfill({ status: 401, json: { error: "Verify wallet" } }),
  );
  await page.route("**/api/live/logout", (route) => {
    account = "";
    logoutCalls++;
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/live/challenge", (route) => {
    const body = route.request().postDataJSON();
    expect(Object.keys(body)).toEqual(["accountId"]);
    return route.fulfill({
      json: {
        nonce: Buffer.alloc(32).toString("base64"),
        message: "Controlled identity-only login",
        recipient: "http://127.0.0.1:3100",
      },
    });
  });
  await page.route("**/api/live/login", (route) => {
    loginCalls++;
    if (deny)
      return route.fulfill({
        status: 401,
        json: {
          error: "Invalid wallet signature. Request a fresh login message.",
        },
      });
    const body = route.request().postDataJSON();
    expect(body.organization).toBeUndefined();
    account = body.accountId;
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/live/organizations", (route) => {
    const org = {
      id: account + "-org",
      name: route.request().postDataJSON().name,
      status: "unprovisioned",
      role: "creator",
    };
    orgs.set(account, [...(orgs.get(account) || []), org]);
    return route.fulfill({ json: org });
  });
  return {
    orgs,
    loginCalls: () => loginCalls,
    logoutCalls: () => logoutCalls,
    deny: (value: boolean) => {
      deny = value;
    },
  };
}
async function signIn(page: Page, id: string) {
  await page
    .getByRole("button", {
      name: /^(Connect to Meteor|Recheck Meteor connection)$/,
    })
    .click();
  await page.getByLabel("Testnet wallet account ID").fill(id);
  await page.getByRole("button", { name: "Sign message to sign in" }).click();
}
test("unconfigured vault does not block a new wallet; identity starts empty and organization creation grants no vault", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto("/");
  await signIn(page, "new-user.testnet");
  await expect(
    page.getByRole("heading", { name: "Your workspace" }),
  ).toBeVisible();
  await expect(page.getByText("No organizations yet.")).toBeVisible();
  const counts = page.getByRole("region", { name: "Account record counts" });
  await expect(counts).toContainText("Invoices: 0");
  await expect(counts).toContainText("Contractors: 0");
  await expect(counts).toContainText("Payment history: 0");
  await expect(page.getByText("Synthetic data", { exact: false })).toHaveCount(
    0,
  );
  await expect(page.getByText("NEAR", { exact: true })).toHaveCount(0);
  await page.getByLabel("Organization name").fill("My new studio");
  await page.getByRole("button", { name: "Create organization" }).click();
  await expect(
    page.getByRole("heading", { name: "Create vault", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "My new studio · Vault not provisioned" }),
  ).toBeVisible();
  expect(f.loginCalls()).toBe(1);
});
test("Create vault shows exact testnet authority and funding before any wallet request and keeps deployment gated", async ({
  page,
}) => {
  await fixture(page, "new-user.testnet");
  const plan = {
    configured: true,
    enabled: false,
    network: "testnet",
    requiredFunding: "5000000000000000000000000",
    state: "prepared",
    owner: "new-user.testnet",
    vault: "v-reviewed.v.operator.testnet",
    factory: "v.operator.testnet",
    vaultCodeHash: "reviewed-vault-hash",
    factoryCodeHash: "reviewed-factory-hash",
    planDigest: "a".repeat(64),
    transaction: {
      signer: "new-user.testnet",
      receiver: "v.operator.testnet",
      method: "create_vault",
      args: { request_id: "b".repeat(32) },
      deposit: "5000000000000000000000000",
      gas: "250000000000000",
    },
  };
  let dispatched = 0;
  await page.route("**/api/live/provisioning/prepare", (route) =>
    route.fulfill({ json: plan }),
  );
  await page.route("**/api/live/provisioning/dispatch", (route) => {
    dispatched++;
    return route.fulfill({
      status: 403,
      json: { error: "Deployment disabled" },
    });
  });
  await page.goto("/");
  await page.getByLabel("Organization name").fill("My own organization");
  await page
    .getByRole("button", { name: "Create organization", exact: true })
    .click();
  await page.getByRole("button", { name: "Create vault", exact: true }).click();
  const section = page.getByRole("region", {
    name: "Create vault",
    exact: true,
  });
  await expect(section).toContainText("new-user.testnet");
  await expect(section).toContainText("5 testnet NEAR");
  await expect(section).toContainText("250 Tgas");
  await expect(section).toContainText("reviewed-vault-hash");
  await expect(section).toContainText("create_vault");
  await section.getByRole("checkbox").check();
  await expect(
    section.getByRole("button", { name: "Request Meteor approval" }),
  ).toBeDisabled();
  await expect(section).toContainText("Payment controls remain unavailable");
  expect(dispatched).toBe(0);
  await expect(
    page.getByRole("button", { name: "Authorize configured testnet worker" }),
  ).toHaveCount(0);
});

test("switching clears private records, revokes the old session, and failed/new logins never retain prior workspace access", async ({
  page,
}) => {
  const f = await fixture(page, "old-owner.testnet");
  f.orgs.set("old-owner.testnet", [
    { id: "studio", name: "Private studio", status: "ready", role: "owner" },
  ]);
  const snapshot = await new MockOwnerAdapter(0).snapshot();
  snapshot.mode = "testnet";
  snapshot.protocolVersion = 88;
  snapshot.vendors[0].name = "Private vendor A";
  snapshot.access = {
    organization: "studio",
    accountId: "old-owner.testnet",
    role: "owner",
    vaultOwner: "old-owner.testnet",
  };
  await page.route("**/api/live/snapshot**", (route) =>
    route.fulfill({ json: snapshot }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your payment desk", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Switch wallet", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Nnetics · NEAR testnet" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your payment desk", exact: true }),
  ).toHaveCount(0);
  f.deny(true);
  await signIn(page, "new-user.testnet");
  await expect(
    page.getByRole("alert").filter({ hasText: "Invalid wallet signature" }),
  ).toBeVisible();
  await expect(page.getByText("Private studio")).toHaveCount(0);
  f.deny(false);
  await signIn(page, "new-user.testnet");
  await expect(page.getByText("No organizations yet.")).toBeVisible();
  await expect(page.getByText("Private vendor A")).toHaveCount(0);
  expect(f.logoutCalls()).toBeGreaterThanOrEqual(3);
});
test("message login waits for approval, and editing the pending account cancels its proof and requires a fresh challenge", async ({
  page,
}) => {
  const f = await fixture(page, "", true);
  await page.goto("/");
  await signIn(page, "first.testnet");
  await expect(
    page.getByRole("button", { name: "Awaiting wallet approval / verifying…" }),
  ).toBeDisabled();
  expect(f.loginCalls()).toBe(0);
  await page.getByLabel("Testnet wallet account ID").fill("second.testnet");
  await expect(
    page.getByRole("button", { name: "Sign message to sign in" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("alert").filter({ hasText: "Wallet switched" }),
  ).toBeVisible();
  expect(f.loginCalls()).toBe(0);
  await page.getByRole("button", { name: "Sign message to sign in" }).click();
  await page.evaluate(() =>
    (
      window as unknown as { meteorProbe: { decline: () => void } }
    ).meteorProbe.decline(),
  );
  await expect(
    page.getByRole("alert").filter({ hasText: "declined" }),
  ).toBeVisible();
  expect(f.loginCalls()).toBe(0);
});
test("leaving an authenticated page clears account data and requires verification on return", async ({
  page,
}) => {
  const f = await fixture(page, "new-user.testnet");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your workspace" }),
  ).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(
    page.getByRole("heading", { name: "Nnetics · NEAR testnet" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create organization" }),
  ).toHaveCount(0);
  await expect.poll(() => f.logoutCalls()).toBeGreaterThan(0);
});
test("a failed logout cannot restore private records on reload", async ({
  page,
}) => {
  await fixture(page, "new-user.testnet");
  await page.route("**/api/live/logout", (route) =>
    route.fulfill({ status: 503, json: { error: "Server unavailable" } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your workspace" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Switch wallet", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Nnetics · NEAR testnet" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your workspace" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Nnetics · NEAR testnet" }),
  ).toBeVisible();
});

test("slow verification never overlaps heartbeats and reports the actual failure", async ({
  page,
}) => {
  await page.clock.install();
  await fixture(page, "new-user.testnet");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your workspace" }),
  ).toBeVisible();
  let requests = 0;
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/live/identity", async (route) => {
    requests++;
    await held;
    await route.fulfill({
      status: 503,
      json: { error: "NEAR RPC HTTP 429; retry verification" },
    });
  });
  await page.clock.fastForward(10000);
  await expect.poll(() => requests).toBe(1);
  await page.clock.fastForward(30000);
  expect(requests).toBe(1);
  release();
  await expect(
    page.getByRole("alert").filter({ hasText: "Wallet verification" }),
  ).toContainText("NEAR RPC HTTP 429");
  await expect(
    page.getByRole("heading", { name: "Your workspace" }),
  ).toHaveCount(0);
});

test("missing extension and mainnet account errors explain recovery; demo stays explicit", async ({
  page,
}) => {
  await page.route("**/api/live/config", (route) =>
    route.fulfill({ json: { network: "testnet", configured: false } }),
  );
  await page.route("**/api/live/identity", (route) =>
    route.fulfill({ status: 401, json: { error: "Verify" } }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Connect to Meteor", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "browser profile containing Meteor" }),
  ).toBeVisible();
  await page.getByLabel("Testnet wallet account ID").fill("wallet.near");
  await expect(
    page.getByRole("button", { name: "Sign message to sign in" }),
  ).toBeDisabled();
  await page
    .getByRole("link", { name: "Open explicitly simulated demo" })
    .click();
  await expect(
    page.getByText("Synthetic data. No wallet connected.", { exact: false }),
  ).toBeVisible();
});
