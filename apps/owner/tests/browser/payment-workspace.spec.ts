import {test,expect,type Page} from "@playwright/test";
import path from "node:path";

async function tab(page: Page, name: string) {
  const requested=name;name=["Invoices","Payments"].includes(name)?"Payables":name;
  const nav=page.getByRole("navigation",{name:"Owner dashboard"});
  if(!await nav.isVisible())await page.getByRole("button",{name:"Toggle navigation"}).click();
  await nav.getByRole("link",{name,exact:true}).click();
  await expect(page.getByRole("heading",{name,exact:true,level:1})).toBeVisible();
  if(requested==="Payments")await page.getByText("Other payments · no invoice",{exact:true}).click();
}

test("five tabs, synced appearance and a contractor payment without a bill",async({page,browser},info)=>{
  await page.emulateMedia({colorScheme:"light",reducedMotion:"reduce"});
  await page.goto("/?mode=demo");
  // fresh demo visitors create the workspace first, then land on Overview
  await page.getByLabel("Owner name").fill("Alex");
  await page.getByRole("button",{name:"Continue"}).click();
  await page.getByLabel("Vault name").fill("Team budget");
  await page.getByRole("button",{name:"Create demo workspace"}).click();
  await expect(page.getByRole("heading",{name:"Overview",exact:true})).toBeVisible();
  const nav=page.locator('nav[aria-label="Owner dashboard"]');
  expect(await nav.locator("a").allTextContents()).toEqual(["Overview","Contractors","Payables","Activity","Vault & Controls"]);
  const shots=path.resolve("../../artifacts/payment-workspace-redesign");
  await page.screenshot({path:path.join(shots,`${info.project.name}-overview-light.png`)});
  // the vault is funded before the first payout so the ledger isn't degenerate
  await tab(page,"Vault & Controls");
  await page.locator('input[name="amount"]').fill("2");
  await page.getByRole("button",{name:"Fund vault"}).click();
  await expect(page.getByText(/Funded the Demo Wallet with 2 NEAR/)).toBeVisible();
  await page.screenshot({path:path.join(shots,`${info.project.name}-vault-light.png`)});
  // Settings lives in the utility navigation, not in the primary destinations.
  await page.locator(".account-menu summary").click();
  await page.getByRole("link",{name:"Settings",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Settings",exact:true})).toBeVisible();
  // Close the utility menu again so the appearance checks start from a known state.
  await page.locator(".account-menu summary").click();
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
  // Close the utility menu again so the appearance checks start from a known state.
  await page.locator(".account-menu summary").click();
  await tab(page,"Contractors");
  // The demo owner session starts with the workspace, so the contractor panel
  // is already authorised and no separate "start" step is required.
  await expect(page.getByRole("heading",{name:"Contractors",exact:true})).toBeVisible();
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
    await tab(page,"Payments");
    await page.getByText("Prepare payment",{exact:true}).click();
    await page.getByLabel("Amount (NEAR)",{exact:true}).fill("0.1");
    await page.getByLabel("Payment description").fill("Sample article delivered");
    await page.getByRole("button",{name:"Review payment"}).click();
    const review=page.getByRole("region",{name:"Review payment"});
    await expect(review).toContainText("writer-demo.testnet");
    await expect(review).toContainText("0.1 NEAR");
    await expect(review).toContainText("no funds move");
    await review.screenshot({path:path.join(shots,`${info.project.name}-payment-review-dark.png`)});
    // Phase one: preparation reserves the amount and waits for confirmation.
    await page.getByRole("button",{name:"Prepare simulated payment"}).click();
    const confirm=page.getByRole("region",{name:"Confirm simulated payment"});
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText("writer-demo.testnet");
    await expect(confirm).toContainText("0.1 NEAR");
    await expect(confirm).toContainText("SIM-");
    await expect(confirm).toContainText("is held until this payment settles or is cancelled");
    // Phase two: the owner confirms, and only then does the simulation run.
    await page.getByRole("button",{name:"Confirm and simulate payment"}).click();
    await expect(page.getByText("Simulated payment recorded.",{exact:false})).toBeVisible();
    await page.waitForTimeout(1200);
    await tab(page, "Activity");
    await page.getByRole("button", { name: "Refresh workspace" }).click();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Refresh workspace" }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole("heading",{name:"Activity",exact:true})).toBeVisible();
    // The settled payment must actually exist. A missing record is a failure,
    // not a silently passing assertion.
    const record=page.locator("[aria-label=\"Payment attempts\"] .payment-record").filter({hasText:"0.1 NEAR"});
    await expect(record).toHaveCount(1);
    await expect(record.first()).toContainText("Paid");
    await page.screenshot({path:path.join(shots,`${info.project.name}-receipts-dark.png`)});
    // The receipt for the completed payment lives in the same Activity surface.
    const receipt=page.locator("[aria-label=\"Confirmed receipts\"] .payment-record").filter({hasText:"0.1 NEAR"});
    await expect(receipt).toHaveCount(1);
    await expect(receipt.first()).toContainText("Simulated receipt");
    // The demo ledger really moved: available funds dropped by amount plus fee.
    await tab(page,"Vault & Controls");
    const available=await page.getByRole("heading",{name:"Available payout funds"}).locator("..").innerText();
    expect(available).toContain("1.899");
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

test("a paused demo vault refuses new payments and resumes cleanly",async({page})=>{
  await page.emulateMedia({colorScheme:"light",reducedMotion:"reduce"});
  await page.goto("/?mode=demo");
  await page.getByLabel("Owner name").fill("Paula");
  await page.getByRole("button",{name:"Continue"}).click();
  await page.getByLabel("Vault name").fill("Paused vault");
  await page.getByRole("button",{name:"Create demo workspace"}).click();
  await expect(page.getByRole("heading",{name:"Overview",exact:true})).toBeVisible();
  await tab(page,"Vault & Controls");
  await page.locator('input[name="amount"]').fill("2");
  await page.getByRole("button",{name:"Fund vault"}).click();
  await expect(page.getByText(/Funded the Demo Wallet with 2 NEAR/)).toBeVisible();
  // The owner pauses the demo vault.
  await page.getByRole("button",{name:"Pause the demo vault"}).click();
  await expect(page.locator(".demo-vault-controls [data-status=Paused]")).toBeVisible();
  // A new payment is refused with the precise reason and nothing is recorded.
  const refused=await page.evaluate(async()=>{
    const r=await fetch("/api/demo/workspace/payment/prepare",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idempotencyKey:"browser-paused-1",recipient:"writer-demo.testnet",amount:"100000000000000000000000",description:"Refused while paused"})});
    const state=await (await fetch("/api/demo/workspace/state")).json();
    return {status:r.status,error:(await r.json()).error,payments:state.payments.length,reserved:state.vault.reserved};
  });
  expect(refused.status).toBe(400);
  expect(refused.error).toMatch(/paused/i);
  expect(refused.payments).toBe(0);
  expect(refused.reserved).toBe("0");
  // The owner resumes, and payments work again.
  await page.getByRole("button",{name:"Resume the demo vault"}).click();
  await expect(page.getByText(/Demo vault resumed/)).toBeVisible();
  const accepted=await page.evaluate(async()=>{
    const r=await fetch("/api/demo/workspace/payment/prepare",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idempotencyKey:"browser-resumed-1",recipient:"writer-demo.testnet",amount:"100000000000000000000000",description:"Accepted after resume"})});
    const d=await r.json();
    const state=await (await fetch("/api/demo/workspace/state")).json();
    return {status:r.status,prepared:d.payment?.status,payments:state.payments.length,paused:state.vault.paused};
  });
  expect(accepted.status).toBe(200);
  expect(accepted.prepared).toBe("prepared");
  expect(accepted.payments).toBe(1);
  expect(accepted.paused).toBe(false);
});

test("a demo payment never reaches the chain, a wallet or a signer",async({page})=>{
  await page.emulateMedia({colorScheme:"light",reducedMotion:"reduce"});
  const forbidden:string[]=[];
  // Any request to a chain provider or a wallet endpoint fails the test.
  await page.route("**/*",route=>{
    const url=route.request().url();
    const external=!url.startsWith("http://127.0.0.1:3100")&&!url.startsWith("http://localhost:3100");
    if(external&&/rpc\.testnet|nearblocks|api\.near\.org|wallet|solana|ethereum/i.test(url)){
      forbidden.push(url);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/?mode=demo");
  await page.getByLabel("Owner name").fill("Noah");
  await page.getByRole("button",{name:"Continue"}).click();
  await page.getByLabel("Vault name").fill("No chain");
  await page.getByRole("button",{name:"Create demo workspace"}).click();
  await expect(page.getByRole("heading",{name:"Overview",exact:true})).toBeVisible();
  await tab(page,"Vault & Controls");
  await page.locator('input[name="amount"]').fill("1");
  await page.getByRole("button",{name:"Fund vault"}).click();
  await expect(page.getByText(/Funded the Demo Wallet with 1 NEAR/)).toBeVisible();
  // Prepare and confirm a simulated payment with the chain blocked.
  const result=await page.evaluate(async()=>{
    const prepared=await (await fetch("/api/demo/workspace/payment/prepare",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idempotencyKey:"no-chain-1",recipient:"writer-demo.testnet",amount:"100000000000000000000000",description:"Simulated only"})})).json();
    const confirmed=await (await fetch("/api/demo/workspace/payment/confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({paymentId:prepared.payment.id,confirmationSecret:prepared.confirmationSecret})})).json();
    return {prepared:prepared.payment.payment?.status||prepared.payment.status,confirmed:confirmed.payment?.status};
  });
  expect(result.prepared).toBe("prepared");
  expect(result.confirmed).toBe("pending");
  await page.waitForTimeout(1200);
  const state=await page.evaluate(async()=>{
    const s=await (await fetch("/api/demo/workspace/state")).json();
    return {status:s.payments[0]?.status,spent:s.vault.spent,receipts:s.receipts.length};
  });
  expect(state.status).toBe("confirmed");
  expect(state.spent).toBe("101000000000000000000000");
  expect(state.receipts).toBe(1);
  expect(forbidden).toEqual([]);
});
