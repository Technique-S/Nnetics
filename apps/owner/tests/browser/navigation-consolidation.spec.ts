import {test,expect,type Page} from "@playwright/test";

async function navTo(page:Page, name:string){
  const nav=page.getByRole("navigation",{name:"Owner dashboard"});
  if(!await nav.isVisible())await page.getByRole("button",{name:"Toggle navigation"}).click();
  await nav.getByRole("link",{name,exact:true}).click();
  await expect(page.getByRole("heading",{name,exact:true,level:1})).toBeVisible();
}

async function open(page:Page,url:string){
  await page.emulateMedia({colorScheme:"light",reducedMotion:"reduce"});
  await page.goto(url);
}

async function workspace(page:Page){
  await open(page,"/?mode=demo");
  await page.getByLabel("Owner name").fill("Rae");
  await page.getByRole("button",{name:"Continue"}).click();
  await page.getByLabel("Vault name").fill("Rae vault");
  await page.getByRole("button",{name:"Create demo workspace"}).click();
  await expect(page.getByRole("heading",{name:"Overview",exact:true})).toBeVisible();
}

test("the workspace offers the six consolidated destinations",async({page})=>{
  await workspace(page);
  const nav=page.getByRole("navigation",{name:"Owner dashboard"});
  if(!await nav.isVisible())await page.getByRole("button",{name:"Toggle navigation"}).click();
  expect(await nav.locator("a").allTextContents()).toEqual(["Overview","Contractors","Invoices","Payments","Activity","Vault & Controls"]);
  // Settings is a utility destination, not a primary workflow.
  expect(await nav.locator("a").filter({hasText:"Settings"}).count()).toBe(0);
  const close=page.getByRole("button",{name:"Close navigation"});
  if(await close.count())await close.click();
  await page.locator(".account-menu summary").click();
  await expect(page.getByRole("link",{name:"Settings",exact:true})).toBeVisible();
});

test("each destination opens its own surface",async({page})=>{
  await workspace(page);
  for(const name of ["Contractors","Invoices","Payments","Activity","Vault & Controls","Overview"]){
    await navTo(page,name);
    await expect(page.getByRole("heading",{name,exact:true,level:1})).toHaveText(name);
  }
});

test("the old History and Receipts links still reach Activity",async({page})=>{
  await workspace(page);
  await open(page,"/?mode=demo#History");
  await expect(page.getByRole("heading",{name:"Activity",exact:true})).toBeVisible();
  await open(page,"/?mode=demo#Receipts");
  await expect(page.getByRole("heading",{name:"Activity",exact:true})).toBeVisible();
  await open(page,"/?mode=demo#Vault");
  await expect(page.getByRole("heading",{name:"Vault & Controls",exact:true})).toBeVisible();
  await open(page,"/?mode=demo#Invoice%20review");
  await expect(page.getByRole("heading",{name:"Invoices",exact:true})).toBeVisible();
});

test("a receipt deep link opens the completed record in Activity",async({page})=>{
  await workspace(page);
  // Fund the vault and run one simulated payment so there is a receipt.
  await navTo(page,"Vault & Controls");
  await page.locator('input[name="amount"]').fill("1");
  await page.getByRole("button",{name:"Fund vault"}).click();
  await expect(page.getByText(/Funded the Demo Wallet with 1 NEAR/)).toBeVisible();
  const contractorId=await page.evaluate(async()=>{
    const post=await fetch("/api/demo/contractors/owner",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create-profile",name:"Deep link"})});
    const created=await post.json();
    const link=await (await fetch("/api/demo/contractors/owner",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"issue-link",profileId:created.profileId})})).json();
    const entered=await fetch("/api/demo/contractors/enter",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:link.token})});
    await entered.json();
    const challenge=await (await fetch("/api/demo/contractors/contractor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"wallet-challenge",account:"deeplink.testnet"})})).json();
    await (await fetch("/api/demo/contractors/contractor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"wallet-proof",challenge:challenge.challenge})})).json();
    const snapshot=await (await fetch("/api/demo/contractors/owner")).json();
    const profile=snapshot.profiles.find((p:any)=>p.name==="Deep link");
    await fetch("/api/demo/contractors/owner",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"approve-wallet",profileId:profile.id,requestId:profile.pendingWallet.id})});
    return profile.id;
  });
  expect(contractorId).toBeTruthy();
  await page.reload();
  await navTo(page,"Payments");
  await expect(page.getByRole("heading",{name:"Ready to pay",exact:false})).toBeVisible();
  await page.getByText("Prepare payment",{exact:true}).first().click();
  await page.getByLabel("Amount (NEAR)",{exact:true}).fill("0.25");
  await page.getByLabel("Payment description").fill("Deep link check");
  await page.getByRole("button",{name:"Review payment"}).click();
  await page.getByRole("button",{name:"Prepare simulated payment"}).click();
  await page.getByRole("button",{name:"Confirm and simulate payment"}).click();
  await expect(page.getByText("Simulated payment recorded.",{exact:false})).toBeVisible();
  await page.waitForTimeout(1200);
  // The old receipt deep link format still resolves to the completed record.
  await open(page,"/?mode=demo#Receipts/1");
  await expect(page.getByRole("heading",{name:"Activity",exact:true})).toBeVisible();
  await expect(page.locator("[aria-label=\"Confirmed receipts\"] .payment-record")).toHaveCount(1);
});

test("the mobile bar shows five destinations and a More sheet",async({page})=>{
  await workspace(page);
  await page.setViewportSize({width:390,height:844});
  await page.reload();
  await expect(page.getByRole("heading",{name:"Overview",exact:true})).toBeVisible();
  const bar=page.getByRole("navigation",{name:"Workspace destinations"});
  await expect(bar).toBeVisible();
  expect(await bar.locator("a").allTextContents()).toEqual(["Overview","Contractors","Invoices","Payments","Activity"]);
  await expect(bar.getByRole("button",{name:"More"})).toBeVisible();
  // The lower-frequency destinations are reachable from the sheet.
  await bar.getByRole("button",{name:"More"}).click();
  const sheet=page.getByRole("dialog",{name:"More destinations"});
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("link",{name:"Vault & Controls"})).toBeVisible();
  await expect(sheet.getByRole("link",{name:"Settings"})).toBeVisible();
  await sheet.getByRole("link",{name:"Vault & Controls"}).click();
  await expect(page.getByRole("heading",{name:"Vault & Controls",exact:true})).toBeVisible();
  // The active destination stays visible and nothing overflows the viewport.
  await expect(bar.locator("[aria-current=page]")).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test("the Overview reports the funded vault and displays every metric",async({page})=>{
  await workspace(page);
  await navTo(page,"Vault & Controls");
  await page.locator('input[name="amount"]').fill("2");
  await page.getByRole("button",{name:"Fund vault"}).click();
  await expect(page.getByText(/Funded the Demo Wallet with 2 NEAR/)).toBeVisible();
  await navTo(page,"Overview");
  await expect(page.getByRole("heading",{name:"Available vault balance",exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Reserved funds",exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Pending invoices",exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Active contractors",exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Quick actions",exact:true})).toBeVisible();
  // The balance card shows the funded amount.
  await expect(page.locator(".overview-balance .payment-workspace-amount")).toContainText("2");
});
