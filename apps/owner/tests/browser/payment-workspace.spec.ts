import {test,expect,type Page} from "@playwright/test";
import path from "node:path";

async function tab(page: Page, name: string) {
  const nav=page.getByRole("navigation",{name:"Owner dashboard"});
  if(!await nav.isVisible())await page.getByRole("button",{name:"Toggle navigation"}).click();
  await nav.getByRole("link",{name,exact:true}).click();
  await expect(page.getByRole("heading",{name,exact:true,level:1})).toBeVisible();
}

test("six tabs, synced appearance and a contractor payment without a bill",async({page,browser},info)=>{
  await page.emulateMedia({colorScheme:"light",reducedMotion:"reduce"});
  await page.goto("/?mode=demo");
  // fresh demo visitors create the workspace first, then land on Overview
  await page.getByLabel("Owner name").fill("Alex");
  await page.getByRole("button",{name:"Continue"}).click();
  await page.getByLabel("Vault name").fill("Team budget");
  await page.getByRole("button",{name:"Create demo workspace"}).click();
  await expect(page.getByRole("heading",{name:"Overview",exact:true})).toBeVisible();
  const nav=page.locator('nav[aria-label="Owner dashboard"]');
  expect(await nav.locator("a").allTextContents()).toEqual(["Overview","Contractors","Receipts","History","Vault","Settings"]);
  const shots=path.resolve("../../artifacts/payment-workspace-redesign");
  await page.screenshot({path:path.join(shots,`${info.project.name}-overview-light.png`)});
  // the vault is funded before the first payout so the ledger isn't degenerate
  await tab(page,"Vault");
  await page.locator('input[name="amount"]').fill("2");
  await page.getByRole("button",{name:"Fund vault"}).click();
  await expect(page.getByText(/Funded the Demo Wallet with 2 NEAR/)).toBeVisible();
  await page.screenshot({path:path.join(shots,`${info.project.name}-vault-light.png`)});
  await tab(page,"Settings");
  const appearance=page.getByRole("heading",{name:"Appearance",exact:true}).locator("..").getByRole("switch");
  await appearance.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
  const menu=page.locator(".account-menu summary");
  await menu.click();
  const menuSwitch=menu.locator("..").getByRole("switch");
  await expect(menuSwitch).toHaveAttribute("aria-checked","true");
  await menuSwitch.click();
  await expect(appearance).toHaveAttribute("aria-checked","false");
  await appearance.click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
  await expect(page.getByRole("heading",{name:"Settings",exact:true})).toBeVisible();
  await tab(page,"Contractors");
  await page.getByRole("button",{name:"Start contractor demo"}).click();
  await page.getByLabel("Contractor name",{exact:true}).fill("Sample writer");
  await page.getByRole("button",{name:"Add contractor",exact:true}).click();
  await page.getByRole("button",{name:"Create private link · Sample writer"}).click();
  const invitation=await page.getByLabel("Private invitation link · shown once").inputValue();
  const ctx=await browser.newContext({baseURL:process.env.NNETICS_BROWSER_BASE_URL||"http://127.0.0.1:3100"});
  try {
    const contractor=await ctx.newPage();
    await contractor.goto(invitation);
    await expect(contractor.getByRole("button",{name:"Wallet details"})).toHaveAttribute("aria-current","page");
    await contractor.getByRole("textbox",{name:/testnet wallet/}).fill("writer-demo.testnet");
    await contractor.getByRole("button",{name:"Prepare simulated verification"}).click();
    await contractor.getByRole("button",{name:"Simulate proof and request approval"}).click();
    await page.getByRole("button",{name:"Refresh owner records"}).click();
    await page.getByRole("button",{name:"Approve wallet · Sample writer"}).click();
    await page.getByText("Prepare payment",{exact:true}).click();
    await page.getByLabel("Amount (NEAR)",{exact:true}).fill("0.1");
    await page.getByLabel("Payment description").fill("Sample article delivered");
    await page.getByRole("button",{name:"Review payment"}).click();
    const review=page.getByRole("region",{name:"Review payment"});
    await expect(review).toContainText("writer-demo.testnet");
    await expect(review).toContainText("0.1 NEAR");
    await expect(review).toContainText("no funds move");
    await review.screenshot({path:path.join(shots,`${info.project.name}-payment-review-dark.png`)});
    await page.getByRole("button",{name:"Approve simulated payment"}).click();
    await page.waitForTimeout(1000);
    await tab(page, "History");
    await page.getByRole("button", { name: "Refresh workspace" }).click();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Refresh workspace" }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole("heading",{name:"History",exact:true})).toBeVisible();
    await expect(page.getByRole("heading",{name:"History",exact:true})).toBeVisible();
    const record=page.locator(".payment-record").filter({hasText:"0.1 NEAR"});
    await page.screenshot({path:path.join(shots,`${info.project.name}-receipts-dark.png`)});
    // the paid payment shows up in the Overview right rail
    await tab(page,"Overview");
    await expect(page.locator(".payment-status-donut")).toBeVisible();
    const legend=page.locator(".payment-status-legend li");
    await expect(legend).toHaveCount(3);
    await expect(legend.nth(0)).toBeVisible();
    await page.screenshot({path:path.join(shots,`${info.project.name}-overview-dark.png`)});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    await page.setViewportSize({width:320,height:740});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  } finally { await ctx.close(); }
});
