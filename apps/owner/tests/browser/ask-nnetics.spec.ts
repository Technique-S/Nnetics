import {test, expect} from "@playwright/test";

test("Ask Nnetics uses its configured model to create, find and follow up on demo records", async ({page}, info) => {
  test.skip(info.project.name !== "desktop", "One configured-provider run covers model behavior.");
  test.setTimeout(180_000);
  const name = `Design Acceptance ${Date.now().toString(36)}`;
  await page.goto("/?mode=demo");
  await page.getByLabel("Owner name").fill("Browser Owner");
  await page.getByRole("button", {name: "Continue", exact: true}).click();
  await page.getByLabel("Vault name").fill("Browser Vault");
  await page.getByRole("button", {name: "Create demo workspace", exact: true}).click();
  await expect(page.getByRole("heading", {name: "Overview", exact: true})).toBeVisible();
  await page.getByRole("button", {name: "Ask Nnetics", exact: true}).click();
  const panel = page.getByRole("dialog", {name: "Ask Nnetics demo assistant"});
  await expect(panel).toBeVisible();
  const input = panel.getByLabel("Message the demo assistant");

  async function ask(message: string) {
    const replies = panel.locator(".ask-nnetics-assistant");
    const next = await replies.count();
    await input.fill(message);
    const reply = page.waitForResponse(response => response.url().endsWith("/api/agent") && response.request().method() === "POST", {timeout: 65_000});
    await panel.getByRole("button", {name: "Send", exact: true}).click();
    const response = await reply;
    const body = await response.json();
    expect(response.status(), body.error || body.reply).toBe(200);
    await expect(replies.nth(next)).toBeVisible();
    return replies.nth(next);
  }

  await expect(await ask(`Create a contractor named "${name}".`)).toContainText(name);
  await panel.getByRole("button", {name: `View contractor "${name}"`}).click();
  await expect(page.getByRole("heading", {name, exact: true, level: 3})).toBeVisible();
  await expect(await ask("What is the available balance in my demo vault?")).toContainText(/0(?:\.0+)?\s*(?:simulated\s*)?NEAR/i);
  await expect(await ask("How many contractors do I have, including the one you just created?")).toContainText(/1\s*contractor|one\s*contractor/i);
  await page.getByRole("button", {name: "Close the demo assistant"}).click();
  await expect(page.getByRole("button", {name: "Ask Nnetics", exact: true})).toBeFocused();
  await page.reload();
  await expect(page.getByRole("heading", {name, exact: true, level: 3})).toBeVisible();
  await page.getByRole("button", {name: "Ask Nnetics", exact: true}).click();
  await expect(panel.getByText("What is the available balance in my demo vault?", {exact: true})).toBeVisible();
});
