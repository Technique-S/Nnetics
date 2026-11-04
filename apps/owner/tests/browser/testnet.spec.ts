import {navigateOwner, openAccountMenu} from "./navigation-helpers";
import { test, expect } from "@playwright/test";
import { MockOwnerAdapter } from "../../src/data/mock-adapter";

test("organization viewers can navigate but cannot invoke owner or invoice mutations", async ({
  page,
}) => {
  const snapshot = await new MockOwnerAdapter(0).snapshot();
  snapshot.mode = "testnet";
  snapshot.protocolVersion = 88;
  snapshot.blockHash = "viewer-final-block";
  snapshot.access = {
    organization: "studio",
    accountId: "viewer.testnet",
    role: "viewer",
    vaultOwner: snapshot.vault.owner,
  };
  await page.route("**/api/live/identity", (route) =>
    route.fulfill({
      json: {
        accountId: snapshot.access!.accountId,
        network: "testnet",
        organizations: [
          {
            id: "studio",
            name: "studio",
            status: "ready",
            role: snapshot.access!.role,
          },
        ],
        notice: "",
      },
    }),
  );
  await page.route("**/api/live/config", (route) =>
    route.fulfill({
      json: {
        network: "testnet",
        organization: "studio",
        contract: "vault.owner.testnet",
        worker: "worker.owner.testnet",
        publicKey: "ed25519:fixture",
        configured: true,
        transactionsEnabled: true,
      },
    }),
  );
  await page.route("**/api/live/snapshot**", (route) =>
    route.fulfill({ json: snapshot }),
  );
  await page.goto("/");
  await navigateOwner(page, "Vault");
  await expect(
    page.getByText("Read-only viewer", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review owner transaction in wallet" }),
  ).toBeDisabled();
  await navigateOwner(page, "Access");
  await expect(
    page.getByRole("button", { name: "Grant viewer access" }),
  ).toBeDisabled();
  await navigateOwner(page, "Overview");
  await expect(
    page.getByRole("button", { name: "Enter structured invoice" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("switch", { name: "Allow new testnet payments" }),
  ).toBeDisabled();
  await navigateOwner(page, "Vendors");
  await expect(
    page.getByRole("button", { name: "Manage vendor" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Disable future payments" }).first(),
  ).toBeDisabled();
  await navigateOwner(page, "Invoice review");
  await expect(
    page.getByRole("button", { name: "Mark reviewed" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Queue reviewed invoice" }),
  ).toBeDisabled();
});
test("controlled live adapter reads show finality and block unverified protocol-89 signing before opening wallet", async ({
  page,
}) => {
  // HTTP fixtures exercise UI wiring only; this is not a deployed testnet test.
  const snapshot = await new MockOwnerAdapter(0).snapshot();
  snapshot.mode = "testnet";
  snapshot.protocolVersion = 89;
  snapshot.blockHash = "controlled-final-block";
  snapshot.access = {
    organization: "studio",
    accountId: snapshot.vault.owner,
    role: "owner",
    vaultOwner: snapshot.vault.owner,
  };
  await page.route("**/api/live/identity", (route) =>
    route.fulfill({
      json: {
        accountId: snapshot.access!.accountId,
        network: "testnet",
        organizations: [
          {
            id: "studio",
            name: "studio",
            status: "ready",
            role: snapshot.access!.role,
          },
        ],
        notice: "",
      },
    }),
  );
  await page.route("**/api/live/config", (route) =>
    route.fulfill({
      json: {
        network: "testnet",
        contract: "vault.owner.testnet",
        organization: "studio",
        worker: "worker.owner.testnet",
        publicKey: "ed25519:fixture",
        configured: true,
        transactionsEnabled: true,
      },
    }),
  );
  await page.route("**/api/live/snapshot**", (route) =>
    route.fulfill({ json: snapshot }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your payment desk", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Verified wallet"),
  ).toBeVisible();
  await expect(page.getByLabel("Local simulation controls")).toHaveCount(0);
  await navigateOwner(page, "Vault");
  await page.getByText("Verification details",{exact:true}).click();
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
