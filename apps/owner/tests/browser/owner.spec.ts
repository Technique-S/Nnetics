import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Nnetics · Owner simulation");
  await expect(page.locator("body")).toContainText("Nnetics");
  await expect(
    page.getByRole("heading", { name: "Your payment desk", exact: true }),
  ).toBeVisible();
});
test("labels simulations, disables deployment, navigates and fits the viewport", async ({
  page,
}, info) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:3100/"))
      external.push(request.url());
  });
  await expect(
    page.getByText("Synthetic data. No wallet connected.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Deployment disabled", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("switch", { name: "Allow new simulated payments" }),
  ).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  const directory = path.resolve("../../artifacts/owner");
  fs.mkdirSync(directory, { recursive: true });
  await page.screenshot({
    path: path.join(directory, info.project.name + "-overview.png"),
    fullPage: true,
  });
  for (const view of [
    "Vendors",
    "Work orders",
    "Invoice review",
    "Payment history",
  ]) {
    await page
      .getByRole("navigation", { name: "Owner dashboard" })
      .getByRole("button", { name: new RegExp("^" + view) })
      .click();
    await expect(
      page.getByRole("heading", { name: view, exact: true }),
    ).toBeVisible();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(external).toEqual([]);
});
test("manages vendors, immutable work orders and pause/revocation controls", async ({
  page,
}) => {
  const nav = page.getByRole("navigation", { name: "Owner dashboard" });
  await nav.getByRole("button", { name: "Vendors", exact: true }).click();
  await page.getByRole("button", { name: "Manage vendor" }).click();
  const modal = page.getByRole("dialog");
  await modal.getByLabel("Recipient account").fill("writer-new.testnet");
  await modal.getByRole("button", { name: "Save simulated change" }).click();
  await expect(modal).not.toBeVisible();
  await expect(
    page.getByText("writer-new.testnet", { exact: true }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Work orders", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "writer-demo.testnet", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New work order" }).click();
  await modal.getByLabel("New work order ID").fill("article-004");
  await modal.getByLabel("Exact amount in NEAR").fill("1");
  await modal.getByRole("button", { name: "Save simulated change" }).click();
  await expect(modal).not.toBeVisible();
  const row = page.getByRole("row").filter({ hasText: "article-004" });
  await expect(
    row.getByText("writer-new.testnet", { exact: true }),
  ).toBeVisible();
  await row.getByRole("button", { name: "Revoke order" }).click();
  await expect(row.getByText("Authority revoked")).toBeVisible();
  await nav.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByRole("switch", { name: "Allow new simulated payments" })
    .click();
  await expect(
    page.getByRole("switch", { name: "Allow new simulated payments" }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Revoke worker authority" }).click();
  await expect(
    page.getByText("Worker authority is revoked.", { exact: true }),
  ).toBeVisible();
});
test("invoice review cannot override a conflict; unknown outcomes stay locked", async ({
  page,
}, info) => {
  const nav = page.getByRole("navigation", { name: "Owner dashboard" });
  await nav.getByRole("button", { name: /^Invoice review/ }).click();
  await page.getByRole("button", { name: /Miles Chen.*INV-1043/ }).click();
  await expect(
    page.getByRole("button", { name: "Simulate payment", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(
    page.getByRole("button", { name: "Review acknowledged" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Simulate payment", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Noor Okafor.*INV-1042/ }).click();
  await page
    .getByLabel("Next simulated transfer outcome")
    .selectOption("unknown");
  await page
    .getByRole("button", { name: "Simulate payment", exact: true })
    .click();
  await expect(
    page.getByText("A payment is already pending. Its funds remain reserved.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Simulate payment", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: path.resolve(
      "../../artifacts/owner/" + info.project.name + "-review.png",
    ),
    fullPage: true,
  });
  await nav
    .getByRole("button", { name: "Payment history", exact: true })
    .click();
  await page.getByLabel("Filter payment outcomes").selectOption("Pending");
  await expect(page.getByRole("row")).toHaveCount(3);
  await page.getByRole("button", { name: "Refresh mock state" }).click();
  await expect(page.getByRole("row")).toHaveCount(3);
});
test("load failures recover and untrusted invoice text stays literal", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Simulate load error" }).click();
  await expect(page.getByRole("alert", { name: "Simulation error" })).toContainText(
    "Simulated adapter request failed",
  );
  await page.getByRole("button", { name: "Retry refresh" }).click();
  await expect(page.getByRole("alert", { name: "Simulation error" })).not.toBeVisible();
  await page
    .getByRole("button", { name: "Add sample invoice", exact: true })
    .click();
  const modal = page.getByRole("dialog");
  await modal.getByLabel("Invoice reference").fill("INV-XSS");
  await modal
    .getByLabel("Original sample text")
    .fill('<img src="https://invalid.example" onerror="window.injected=1">');
  await modal.getByRole("button", { name: "Save simulated change" }).click();
  await expect(modal).not.toBeVisible();
  await expect(page.locator("pre")).toHaveText(
    '<img src="https://invalid.example" onerror="window.injected=1">',
  );
  expect(await page.locator("pre img").count()).toBe(0);
});
