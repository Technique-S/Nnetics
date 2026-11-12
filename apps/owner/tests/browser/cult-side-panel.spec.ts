import { test, expect } from "@playwright/test";
import { cultFixture, fixtureRecipient, fixtureSource } from "./cult-fixture";

// Focus: the Cult UI Side Panel port (BillingSource) replaces the plain
// <details> "Original billing text" disclosure. Every request is intercepted
// by the fixture (see cult-fixture.ts) — no real service is contacted and no
// mutation reaches the app. The owner variant exercises the authenticated
// owner Payables surface through the same disclosure component.

test("billing source expands as a named disclosure with focus and bounds kept in the contractor portal", async ({ page }) => {
    const fixture = await cultFixture(page);
    await page.goto("/contractor?mode=demo");
    const trigger = page.getByRole("button", { name: "Original billing text", exact: true });
    const region = page.getByRole("region", { name: "Original billing text", exact: true });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(region).toBeHidden();
    await expect(page.locator("main")).toContainText("3.125 NEAR");
    await expect(page.locator("main")).toContainText(fixtureRecipient);
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(region.locator("pre")).toHaveText(fixtureSource);
    await expect.poll(() => region.evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(region).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(region).toBeVisible();
    await trigger.click();
    await expect(region).toBeHidden();
    expect(fixture.forbidden).toEqual([]);
});

test("owner payables keeps the billing source disclosure for the approved invoice", async ({ page }) => {
    const fixture = await cultFixture(page, { owner: true });
    await page.goto("/#Payables/cult-invoice");
    await expect(page.getByRole("heading", { name: "Payables", exact: true, level: 1 })).toBeVisible();
    const detail = page.locator(".payable-details");
    await expect(detail).toContainText("CTR-0001-INV-0001");
    const disclosure = detail.getByText("View details", { exact: true });
    if (await disclosure.count()) await disclosure.click();
    const trigger = detail.getByRole("button", { name: "Original billing text", exact: true });
    await trigger.click();
    await expect(detail.getByRole("region", { name: "Original billing text" }).locator("pre")).toHaveText(fixtureSource);
    await expect(detail).toContainText(fixtureRecipient);
    await expect(detail).toContainText("3.125 NEAR");
    expect(fixture.forbidden).toEqual([]);
});
