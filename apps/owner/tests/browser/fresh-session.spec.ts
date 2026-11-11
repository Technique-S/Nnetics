import {test, expect} from "@playwright/test";

test("a clean visitor sees sign-in and enters a persisted demo workspace", async ({page, context}) => {
  expect(await context.cookies()).toHaveLength(0);
  const identity = page.waitForResponse(response => response.url().endsWith("/api/live/identity"));
  await page.goto("/");
  expect((await identity).status()).toBe(400);
  await expect(page.getByRole("heading", {name: "Sign in", exact: true})).toBeVisible();
  await expect(page.getByText("Your session has ended. Sign in again to continue.")).toHaveCount(0);
  const denied = await page.request.get("/api/live/identity");
  expect(denied.status()).toBe(400);
  await page.getByRole("link", {name: "Try demo", exact: true}).click();
  await page.getByLabel("Owner name").fill("Fresh visitor");
  await page.getByRole("button", {name: "Continue", exact: true}).click();
  await page.getByLabel("Vault name").fill("Fresh vault");
  await page.getByRole("button", {name: "Create demo workspace"}).click();
  await expect(page.getByRole("heading", {name: "Overview", exact: true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", {name: "Overview", exact: true})).toBeVisible();
  await expect(page.getByLabel("Owner name")).toHaveCount(0);
});

test("unavailable session verification keeps recovery feedback", async ({page}) => {
  await page.route("**/api/live/identity", route => route.fulfill({status: 503, json: {error: "Session provider unavailable", automaticRetry: false, retryable: true, verificationUnavailable: true}}));
  await page.goto("/");
  await expect(page.getByRole("button", {name: "Continue to workspace", exact: true})).toBeVisible();
  await expect(page.getByRole("alert").filter({hasText: /try again|temporarily|couldn't check/i})).toBeVisible();
});
