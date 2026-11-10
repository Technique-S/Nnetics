import { test, expect } from "@playwright/test";

// Real browser acceptance for Ask Nnetics. This test intentionally uses the
// configured provider: it creates a fresh demo workspace, asks the assistant to
// create and count a contractor, follows the action chip, and confirms that a
// deletion request is refused without changing the record.
test("Ask Nnetics creates, counts and refuses to delete in the demo", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "One real-provider browser run is enough.");
  test.setTimeout(120_000);

  const name = `Browser Check ${Date.now().toString(36)}`;
  await page.goto("/?mode=demo");
  await page.getByLabel("Owner name").fill("Browser Owner");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Vault name").fill("Browser Vault");
  await page.getByRole("button", { name: "Create demo workspace" }).click();
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Ask Nnetics/ }).click();
  const panel = page.getByRole("dialog", { name: "Ask Nnetics demo assistant" });
  await expect(panel).toBeVisible();

  const input = panel.getByLabel("Message the demo assistant");
  await input.fill(`Create a contractor named ${name}`);
  await panel.getByRole("button", { name: "Send" }).click();
  const createReply = panel.locator(".ask-nnetics-assistant").last();
  await expect(createReply).toContainText(name, { timeout: 60_000 });

  // The create chip navigates to the contractor panel, where the persisted
  // record must be visible with its exact name.
  await panel.getByRole("button", { name: new RegExp(`View contractor "${name}"`) }).click();
  await expect(page.getByRole("heading", { name: "Contractors", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name, exact: true, level: 3 })).toBeVisible({ timeout: 20_000 });

  await input.fill("How many contractors do I have?");
  await panel.getByRole("button", { name: "Send" }).click();
  const countReply = panel.locator(".ask-nnetics-assistant").last();
  await expect(countReply).toContainText(/1 contractor|one contractor/i, { timeout: 60_000 });

  await input.fill(`Delete the contractor ${name}`);
  await panel.getByRole("button", { name: "Send" }).click();
  const deleteReply = panel.locator(".ask-nnetics-assistant").last();
  await expect(deleteReply).toContainText(/not available|unavailable|not supported|cannot|can't/i, { timeout: 60_000 });

  // The refused deletion leaves the persisted record intact.
  await expect(page.getByRole("heading", { name, exact: true, level: 3 })).toBeVisible();
});
