import {navigateOwner} from "./navigation-helpers";
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

test.beforeEach(async ({ page }) => {
  await page.goto("/?mode=demo");
  await expect(page).toHaveTitle("Payment overview workspace | Nnetics");
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
    if (new URL(request.url()).origin !== new URL(page.url()).origin)
      external.push(request.url());
  });
  await expect(
    page.getByText("Synthetic data. No wallet connected.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Deployment disabled", exact: true }),
  ).toHaveCount(0);
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
    await navigateOwner(page,view);
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
  await navigateOwner(page, "Vendors");
  await page.getByRole("button", { name: "Manage vendor" }).click();
  const modal = page.getByRole("dialog");
  await modal.getByLabel("Recipient account").fill("writer-new.testnet");
  await modal.getByRole("button", { name: "Save simulated change" }).click();
  await expect(modal).not.toBeVisible();
  await expect(
    page.getByText("writer-new.testnet", { exact: true }),
  ).toBeVisible();
  await navigateOwner(page, "Work orders");
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
  await navigateOwner(page, "Overview");
  await page
    .getByRole("switch", { name: "Allow new simulated payments" })
    .click();
  await expect(
    page.getByRole("switch", { name: "Allow new simulated payments" }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Revoke worker authority" }).click();
  await expect(
    page.getByText("Worker access revoked.", { exact: false }),
  ).toBeVisible();
});
test("invoice review cannot override a conflict; unknown outcomes stay locked", async ({
  page,
}, info) => {
  const nav = page.getByRole("navigation", { name: "Owner dashboard" });
  await navigateOwner(page, "Invoice review");
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
  await navigateOwner(page, "Payment history");
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
    "Something went wrong on our side. Please try again in a moment.",
  );
  await page.getByRole("button", { name: "Retry refresh" }).click();
  await expect(page.getByRole("alert", { name: "Simulation error" })).not.toBeVisible();
  await page
    .getByRole("button", { name: "Add sample invoice", exact: true })
    .click();
  const modal = page.getByRole("dialog");
  await expect(modal.getByLabel("Invoice reference")).toHaveCount(0);
  await expect(modal.getByText("Currency: NEAR · Testnet")).toBeVisible();
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

test("owner-entered invoices receive durable server references and reject source currencies",async({page})=>{
 await page.getByRole("button",{name:"Add sample invoice",exact:true}).click();const modal=page.getByRole("dialog");
 await expect(modal.getByText("Currency: NEAR · Testnet",{exact:true})).toBeVisible();
 await modal.getByLabel("Original sample text").fill("Amount: 1 USDC");await modal.getByRole("button",{name:"Save simulated change"}).click();
 await expect(modal.getByRole("alert")).toContainText("mentions another currency");await expect(modal).toBeVisible();
 await modal.getByLabel("Original sample text").fill("Article delivered. Amount: 1 NEAR");await modal.getByRole("button",{name:"Save simulated change"}).click();await expect(modal).not.toBeVisible();
 const saved=await(await page.request.get("/api/demo/owner-invoices")).json();expect(saved).toHaveLength(1);expect(saved[0].id).toMatch(/^CTR-\d+-INV-0001$/);
 await expect(page.locator(".invoice-detail")).toContainText(saved[0].id);await page.reload();await navigateOwner(page, "Invoice review");await expect(page.getByRole("button",{name:new RegExp(saved[0].id)})).toBeVisible();
});
