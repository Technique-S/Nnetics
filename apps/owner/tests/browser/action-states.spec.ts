import {test, expect} from "@playwright/test";

test("one wallet action stays pending, cancels, and cannot submit a login after cancellation", async ({page}) => {
  let challenges = 0, logins = 0;
  await page.route("**/api/live/**", route => {
    const name = new URL(route.request().url()).pathname.split("/").pop();
    if (name === "config") return route.fulfill({json: {network: "testnet", configured: false, transactionsEnabled: false}});
    if (name === "identity") return route.fulfill({status: 401, json: {error: "Verify wallet"}});
    if (name === "logout") return route.fulfill({json: {ok: true}});
    if (name === "challenge") {
      challenges++;
      return route.fulfill({json: {nonce: Buffer.alloc(32).toString("base64"), message: "Fixture login only", recipient: "http://127.0.0.1:3100"}});
    }
    if (name === "login") logins++;
    return route.fulfill({status: 400, json: {error: "Unexpected fixture request"}});
  });
  await page.addInitScript(() => {
    let listener: (value: unknown) => void;
    (window as unknown as {meteorCom: unknown}).meteorCom = {
      addMessageDataListener: (fn: typeof listener) => {listener = fn;},
      sendMessageData: (value: {uid: string; status: string; actionType: string}) => {
        if (value.status === "initializing") {
          if (value.actionType !== "sign_message") throw Error("A transaction was requested");
          queueMicrotask(() => listener({uid: value.uid, status: "connected"}));
        }
      },
    };
  });
  await page.goto("/");
  await page.getByRole("button", {name: "Connect to Meteor", exact: true}).click();
  await expect.poll(() => challenges).toBe(1);
  const connection = page.getByRole("region", {name: "Meteor connection"});
  await expect(connection.locator("button[aria-busy=true]")).toHaveCount(1);
  await expect(connection.locator("button[aria-busy=true]")).toBeDisabled();
  await expect(connection.getByRole("button", {name: "Try again", exact: true})).toHaveCount(0);
  await page.getByRole("button", {name: "Cancel sign-in", exact: true}).click();
  await expect(connection.locator("button[aria-busy=true]")).toHaveCount(0);
  expect(logins).toBe(0);
  expect(challenges).toBe(1);
});

test("saved-session recovery never opens a wallet or signs out while its read is unavailable", async ({page}) => {
  let available = false, walletRequests = 0, logouts = 0;
  let release!: () => void;
  const resumed = new Promise<void>(resolve => {release = resolve;});
  await page.route("**/api/live/**", async route => {
    const name = new URL(route.request().url()).pathname.split("/").pop();
    if (name === "config") return route.fulfill({json: {network: "testnet", configured: false, transactionsEnabled: false}});
    if (name === "identity") {
      if (available) await resumed;
      return route.fulfill(available
        ? {json: {accountId: "fixture-owner.testnet", organizations: [], network: "testnet", notice: ""}}
        : {status: 503, json: {error: "Verification unavailable", retryable: true, automaticRetry: false, verificationUnavailable: true}});
    }
    if (name === "challenge") walletRequests++;
    if (name === "logout") logouts++;
    return route.fulfill({json: {}});
  });
  await page.goto("/");
  const restore = page.getByRole("button", {name: "Continue to workspace", exact: true});
  await expect(restore).toBeVisible();
  await expect(page.getByRole("button", {name: "Connect to Meteor", exact: true})).toHaveCount(0);
  available = true;
  await restore.click();
  try {await expect(page.getByRole("button", {name: "Checking your saved session…", exact: true})).toBeDisabled();}
  finally {release();}
  await expect(page.getByRole("heading", {name: "Your workspace", exact: true})).toBeVisible();
  expect(walletRequests).toBe(0);
  expect(logouts).toBe(0);
});

test("a dialog has one cancel control and keeps its recipient and exact amount fields", async ({page}) => {
  await page.route("**/api/demo/owner-invoices", route => route.fulfill({json: []}));
  await page.goto("/?mode=demo");
  await page.getByRole("button", {name: "Add sample invoice", exact: true}).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", {name: "Cancel", exact: true})).toHaveCount(1);
  await expect(dialog.getByRole("button", {name: "Close dialog", exact: true})).toHaveCount(0);
  await expect(dialog.getByLabel("Requested amount in NEAR")).toHaveValue("3");
  await expect(dialog.getByLabel("Invoice recipient")).toHaveValue("editor-demo.testnet");
  await expect(dialog.getByText("Currency: NEAR · Testnet", {exact: true})).toBeVisible();
  await dialog.getByRole("button", {name: "Cancel", exact: true}).click();
  await expect(dialog).not.toBeVisible();
});

test("a recorded provisioning transaction offers only a status check, never another signing request", async ({page}) => {
  let dispatched = 0, checked = 0;
  const organization = {id: "fixture-org", name: "Fixture workspace", status: "unprovisioned", role: "creator"};
  const progress = {
    configured: true, enabled: true, state: "awaiting_chain", hash: "existing-fixture-transaction",
    network: "testnet", owner: "fixture-owner.testnet", vault: "fixture-vault.testnet", factory: "fixture-factory.testnet",
    requiredFunding: "5000000000000000000000000", message: "Check the existing transaction before making another wallet request.",
    transaction: {args: {request_id: "existing-request"}},
  };
  await page.route("**/api/live/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/config")) return route.fulfill({json: {network: "testnet", configured: false, transactionsEnabled: false}});
    if (path.endsWith("/identity")) return route.fulfill({json: {accountId: progress.owner, network: "testnet", organizations: [organization], notice: ""}});
    if (path.endsWith("/provisioning/dispatch")) dispatched++;
    if (path.endsWith("/provisioning/reconcile")) checked++;
    if (path.includes("/provisioning")) return route.fulfill({json: progress});
    if (path.includes("/contractors/")) return route.fulfill({json: {profiles: [], orders: [], invoices: []}});
    return route.fulfill({json: {}});
  });
  await page.goto("/");
  await page.getByRole("button", {name: /Fixture workspace/}).click();
  const setup = page.getByRole("region", {name: "Create vault", exact: true});
  await expect(setup.getByRole("button", {name: "Request Meteor approval", exact: true})).toHaveCount(0);
  await expect(setup.getByRole("button", {name: "Try again", exact: true})).toHaveCount(0);
  await expect(setup).toContainText(progress.owner);
  await expect(setup).toContainText("5 testnet NEAR");
  await setup.getByRole("button", {name: "Check setup status", exact: true}).click();
  await expect.poll(() => checked).toBe(1);
  expect(dispatched).toBe(0);
});

test("selecting invoices cannot turn their navigation controls into later loading actions", async ({page}) => {
  await page.emulateMedia({reducedMotion: "reduce"});
  await page.route("**/api/demo/owner-invoices", route => route.fulfill({json: []}));
  await page.goto("/?mode=demo#Invoice%20review");
  await page.getByRole("button", {name: /Miles Chen.*INV-1043/}).click();
  await page.getByRole("button", {name: /Noor Okafor.*INV-1042/}).click();
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.getByRole("button", {name: "Mark reviewed", exact: true}).click();
  await expect(page.locator(".queue-row[aria-busy=true]")).toHaveCount(0);
  await expect(page.locator(".invoice-detail button[aria-busy=true]")).toHaveCount(1);
  await page.clock.runFor(1000);
});
