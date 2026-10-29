import { test, expect } from "@playwright/test";
import { MockOwnerAdapter } from "../../src/data/mock-adapter";

test("default mode never silently falls back to simulation or enables an unconfigured wallet", async ({
  page,
}) => {
  await page.route("**/api/live/config", (route) =>
    route.fulfill({
      json: {
        network: "testnet",
        contract: "vault.owner.testnet",
        owner: "owner.testnet",
        worker: "worker.owner.testnet",
        publicKey: "",
        configured: false,
        transactionsEnabled: false,
      },
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Nnetics · NEAR testnet" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Connect Nightly (testnet)" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Your payment desk", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Open explicitly simulated demo" })
    .click();
  await expect(
    page.getByText("Synthetic data. No wallet connected.", { exact: false }),
  ).toBeVisible();
});
test("controlled live adapter reads show finality and block unverified protocol-89 signing before opening wallet", async ({
  page,
}) => {
  // HTTP fixtures exercise UI wiring only; this is not a deployed testnet test.
  const snapshot = await new MockOwnerAdapter(0).snapshot();
  snapshot.mode = "testnet";
  snapshot.protocolVersion = 89;
  snapshot.blockHash = "controlled-final-block";
  await page.route("**/api/live/config", (route) =>
    route.fulfill({
      json: {
        network: "testnet",
        contract: "vault.owner.testnet",
        owner: snapshot.vault.owner,
        worker: "worker.owner.testnet",
        publicKey: "ed25519:fixture",
        configured: true,
        transactionsEnabled: true,
      },
    }),
  );
  await page.route("**/api/live/snapshot", (route) =>
    route.fulfill({ json: snapshot }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your payment desk", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Live testnet data.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Local simulation controls")).toHaveCount(0);
  await expect(
    page.getByText("Finalized block: controlled-final-block"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review owner transaction in wallet" })
    .click();
  await expect(
    page.getByRole("alert", { name: "Testnet error" }),
  ).toContainText(
    "Protocol 89 requires compatibility verification before signing.",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
