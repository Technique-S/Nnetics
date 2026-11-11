import {test,expect,type Page} from "@playwright/test";

async function workspace(page:Page) {
  await page.goto("/?mode=demo");
  await page.getByLabel("Owner name").fill("Lifecycle owner");
  await page.getByRole("button",{name:"Continue",exact:true}).click();
  await page.getByLabel("Vault name").fill("Lifecycle vault");
  await page.getByRole("button",{name:"Create demo workspace",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Overview",exact:true})).toBeVisible();
  await page.request.post("/api/demo/contractors/owner/start",{headers:{origin:new URL(page.url()).origin},data:{}});
}
async function ask(page:Page,action:Record<string,unknown>,message="Delete Tia") {
  await page.route("**/api/agent",route=>route.fulfill({json:{reply:"Review the exact action below.",mode:"demo",actions:[{action,label:"Review action"}]}}));
  if(!await page.getByRole("dialog").isVisible()) await page.getByRole("button",{name:"Ask Nnetics",exact:true}).click();
  await page.getByLabel("Message the demo assistant").fill(message);
  await page.getByRole("button",{name:"Send",exact:true}).click();
}
function action(id:string,kind="delete",extra={}) {return {kind:"confirm-contractor-lifecycle",operationId:crypto.randomUUID(),secret:"browser-only-confirmation-secret",contractorId:id,contractorName:"Tia",actionKind:kind,consequence:"Permanently remove this eligible profile. Audit history is preserved. This cannot be undone.",expiresAt:Date.now()+600000,...extra};}

// The model response is controlled here to verify client rendering and wiring.
// Server authorization/claim/expiry are independently exercised through the
// actual agent and confirmation route in agent-lifecycle.test.ts.
test("controlled-provider confirmation cards cancel, execute once and refresh real records",async({page},info)=>{
  await page.emulateMedia({reducedMotion:"reduce"});await workspace(page);
  const created=await page.request.post("/api/demo/contractors/owner",{headers:{origin:new URL(page.url()).origin},data:{action:"create-profile",name:"Tia"}});
  expect(created.ok()).toBe(true);
  const id=(await created.json()).profileId;
  let confirmations=0;
  await page.route("**/owner/cancel-lifecycle",route=>route.fulfill({json:{state:"cancelled"}}));
  await page.route("**/owner/confirm-lifecycle",async route=>{
    confirmations++;
    const response=await page.request.post("/api/demo/contractors/owner",{headers:{origin:new URL(page.url()).origin},data:{action:"delete-contractor",profileId:id}});
    await route.fulfill({status:response.status(),json:await response.json()});
  });
  await ask(page,action(id));
  const card=page.getByRole("region",{name:"delete confirmation"});
  await expect(card).toContainText(id);await expect(card).toContainText("Awaiting confirmation");
  await page.screenshot({path:`artifacts/v31-confirmation-${info.project.name}.png`,fullPage:true});
  await card.getByRole("button",{name:"Cancel",exact:true}).click();
  await expect(card.getByRole("status")).toHaveText("Cancelled");
  let snapshot=await (await page.request.get("/api/demo/contractors/owner")).json();expect(snapshot.profiles).toHaveLength(1);
  await ask(page,action(id));
  const next=page.getByRole("region",{name:"delete confirmation"}).last();
  await next.getByRole("button",{name:"Confirm delete",exact:true}).click();
  await expect(next.getByRole("status")).toHaveText("Completed");expect(confirmations).toBe(1);
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain("browser-only-confirmation-secret");
  snapshot=await (await page.request.get("/api/demo/contractors/owner")).json();expect(snapshot.profiles).toHaveLength(0);
  await expect(next.getByRole("status")).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("controlled-provider cards show executing, failure and expiry without automatic mutation",async({page})=>{
  await workspace(page);
  let release:()=>void=()=>{};
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route("**/owner/confirm-lifecycle",async route=>{await gate;await route.fulfill({status:400,json:{error:"Request changed. Prepare a fresh decision."}});});
  await ask(page,action("fixture-profile"));
  const card=page.getByRole("region",{name:"delete confirmation"});
  await card.getByRole("button",{name:"Confirm delete"}).click();
  await expect(card.getByRole("status")).toHaveText("Executing");release();
  await expect(card.getByRole("status")).toContainText("Failed: Request changed");
  await ask(page,action("fixture-profile","archive",{expiresAt:Date.now()+1000}));
  const expired=page.getByRole("region",{name:"archive confirmation"});
  await expect(expired.getByRole("status")).toHaveText("Expired");
  await expect(expired.getByRole("button")).toHaveCount(0);
});

test("controlled-provider invitation reveals a usable demo portal URL only through the private control",async({page,browser})=>{
  await workspace(page);
  const created=await page.request.post("/api/demo/contractors/owner",{headers:{origin:new URL(page.url()).origin},data:{action:"create-profile",name:"Sarah"}});
  const id=(await created.json()).profileId;
  const issued=await page.request.post("/api/demo/contractors/owner",{headers:{origin:new URL(page.url()).origin},data:{action:"issue-link",profileId:id}});
  const token=(await issued.json()).token;
  await page.route("**/owner/reveal-invitation",route=>route.fulfill({json:{path:`/contractor?mode=demo#${token}`}}));
  await ask(page,{kind:"reveal-contractor-invitation",reference:"opaque-fixture-reference",contractorName:"Sarah"},"Generate Sarah's portal invitation");
  await expect(page.getByLabel("Private invitation URL")).toHaveCount(0);
  await page.getByRole("button",{name:"Show invitation",exact:true}).click();
  const url=await page.getByLabel("Private invitation URL").inputValue();
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain(token);
  const context=await browser.newContext();
  try {const portal=await context.newPage();await portal.goto(url);await expect(portal.getByRole("button",{name:"Wallet details"})).toBeVisible();}
  finally {await context.close();}
});

test("controlled-provider wallet confirmation shows old/new recipient, decision and rejection reason",async({page})=>{
  await workspace(page);
  await ask(page,action("wallet-profile","reject-wallet-change",{details:{requestId:"exact-request",decision:"reject",oldWallet:"old.testnet",newWallet:"new.testnet",reason:"Verify identity with the contractor first."},consequence:"Reject this wallet request. Keep the current approved recipient."}),"Reject this wallet change");
  const card=page.getByRole("region",{name:"reject-wallet-change confirmation"});
  await expect(card).toContainText("old.testnet");await expect(card).toContainText("new.testnet");await expect(card).toContainText("Verify identity");
  await expect(card.getByRole("button",{name:"Confirm reject wallet change"})).toBeVisible();
});
