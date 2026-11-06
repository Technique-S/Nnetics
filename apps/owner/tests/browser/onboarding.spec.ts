import {navigateOwner, openAccountMenu} from "./navigation-helpers";
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import { chromium, test, expect, type Page } from "@playwright/test";
import { MockOwnerAdapter } from "../../src/data/mock-adapter";

async function meteor(page: Page, pending = false, selected="new-user.testnet") {
  await page.addInitScript(({hold,selected}) => {
    let listener: (data: unknown) => void;
    const probe = { requests: 0, decline: () => {}, selected };
    (window as unknown as { meteorProbe: unknown }).meteorProbe = probe;
    (window as unknown as { meteorCom: unknown }).meteorCom = {
      addMessageDataListener(fn: (data: unknown) => void) {
        listener = fn;
      },
      sendMessageData(data: {
        uid: string;
        status: string;
        actionType: string;
        network: string;
        inputs?: { accountId: string };
      }) {
        if (data.actionType !== "sign_message" || data.network !== "testnet")
          throw Error("Unexpected wallet action");
        if (data.status !== "initializing") return;
        probe.requests++;
        probe.decline = () =>
          listener({ uid: data.uid, status: "closed_fail" });
        if (!hold)
          queueMicrotask(() =>
            listener({
              uid: data.uid,
              status: "closed_success",
              payload: {
                accountId: data.inputs?.accountId ?? probe.selected,
                publicKey: `ed25519:${"1".repeat(32)}`,
                signature: `${"A".repeat(86)}==`,
              },
            }),
          );
        else
          queueMicrotask(() =>
            listener({ uid: data.uid, status: "connected" }),
          );
      },
    };
  }, {hold:pending,selected});
}
async function fixture(page: Page, initial = "", pending = false) {
  await meteor(page, pending,initial||"new-user.testnet");
  let account = initial,
    loginCalls = 0,
    logoutCalls = 0,
    renewCalls = 0, resumeCalls = 0,
    deny = false;
  const orgs = new Map<
    string,
    { id: string; name: string; status: string; role: string }[]
  >();
  await page.route("**/api/live/config", async (route) => {
    return route.fulfill({
      json: {
        network: "testnet",
        organization: "studio",
        contract: "vault.owner.testnet",
        worker: "worker.owner.testnet",
        publicKey: "",
        configured: false,
        transactionsEnabled: false,
      },
    });
  });
  await page.route("**/api/live/provisioning?*", (route) =>
    route.fulfill({
      json: {
        configured: false,
        enabled: false,
        network: "testnet",
        requiredFunding: "5000000000000000000000000",
      },
    }),
  );
  await page.route("**/api/live/identity", (route) =>
    account
      ? route.fulfill({
          json: {
            accountId: account,
            network: "testnet",
            organizations: orgs.get(account) || [],
            notice: "",
          },
        })
      : route.fulfill({ status: 401, json: { error: "Verify wallet" } }),
  );
  await page.route('**/api/live/session',route=>account?route.fulfill({json:{accountId:account,idleExpires:Date.now()+1800000,absoluteExpires:Date.now()+28800000}}):route.fulfill({status:401,json:{error:'Wallet verification required: session expired'}}));
  await page.route('**/api/live/session/renew',route=>{renewCalls++;return route.fulfill({json:{accountId:account}})});
  await page.route('**/api/live/session/challenge',route=>route.fulfill({json:{nonce:Buffer.alloc(32).toString('base64'),message:'Controlled foreground identity proof',recipient:'http://127.0.0.1:3100'}}));
  await page.route('**/api/live/session/resume',route=>{resumeCalls++;const input=route.request().postDataJSON(),accountChanged=account!==input.accountId;if(accountChanged)account='';return route.fulfill({json:{accountId:input.accountId,accountChanged,authenticationRequired:accountChanged}})});
  await page.route("**/api/live/logout", (route) => {
    account = "";
    logoutCalls++;
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/live/challenge", (route) => {
    const body = route.request().postDataJSON();
    expect(body.discover===true?Object.keys(body):Object.keys(body)).toEqual(body.discover===true?["discover"]:["accountId"]);
    return route.fulfill({
      json: {
        nonce: Buffer.alloc(32).toString("base64"),
        message: "Controlled identity-only login",
        recipient: "http://127.0.0.1:3100",
      },
    });
  });
  await page.route("**/api/live/login", (route) => {
    loginCalls++;
    if (deny)
      return route.fulfill({
        status: 401,
        json: {
          error: "Invalid wallet signature. Request a fresh login message.",
        },
      });
    const body = route.request().postDataJSON();
    expect(body.organization).toBeUndefined();
    account = body.accountId;
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/live/organizations", (route) => {
    const org = {
      id: account + "-org",
      name: route.request().postDataJSON().name,
      status: "unprovisioned",
      role: "creator",
    };
    orgs.set(account, [...(orgs.get(account) || []), org]);
    return route.fulfill({ json: org });
  });
  return {
    orgs,
    loginCalls: () => loginCalls,
    renewCalls: () => renewCalls,resumeCalls: () => resumeCalls,
    logoutCalls: () => logoutCalls,
    deny: (value: boolean) => {
      deny = value;
    },
  };
}
// Advance only after the browser has classified each response and scheduled backoff.
// Waiting for route callbacks alone races response parsing and timer registration.
function exhaustReads(page:Page,operation:string,delays=[500,1000,2000]){
 const failures:number[]=[];
 page.on('console',message=>{try{const e=JSON.parse(message.text());if(e.operation===operation&&(e.status>=500||e.status===429))failures.push(e.attempt);}catch{}});
 return async()=>{for(let i=0;i<4;i++){await expect.poll(()=>failures.length).toBe(i+1);if(i<3)await page.clock.runFor(delays[i]);}};
}
async function signIn(page:Page,id:string){
  // Sign-in always uses discovery: Meteor returns its selected account (the
  // fixture sets it to 'id'). The typed-account UI was removed by request.
  await page.getByRole('region',{name:'Meteor connection'}).getByRole('button',{name:/^(Connect to Meteor|Try again)$/}).click();
}
test("unconfigured vault does not block a new wallet; identity starts empty and organization creation grants no vault", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto("/");
  await signIn(page, "new-user.testnet");
  await expect(
    page.getByRole("heading", { name: "Your workspace" }),
  ).toBeVisible();
  await expect(page.getByText("No organizations yet.")).toBeVisible();
  const counts = page.getByRole("region", { name: "Account record counts" });
  await expect(counts).toContainText("Invoices: 0");
  await expect(counts).toContainText("Contractors: 0");
  await expect(counts).toContainText("Payment history: 0");
  await expect(page.getByText("Synthetic data", { exact: false })).toHaveCount(
    0,
  );
  await expect(page.getByText("NEAR", { exact: true })).toHaveCount(0);
  await page.getByLabel("Organization name").fill("My new studio");
  await page.getByRole("button", { name: "Create organization" }).click();
  await expect(
    page.getByRole("heading", { name: "Create vault", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "My new studio · Vault not provisioned" }),
  ).toBeVisible();
  expect(f.loginCalls()).toBe(1);
});
test("Create vault shows exact testnet authority and funding before any wallet request and keeps deployment gated", async ({
  page,
}) => {
  await fixture(page, "new-user.testnet");
  const plan = {
    configured: true,
    enabled: false,
    network: "testnet",
    requiredFunding: "5000000000000000000000000",
    state: "prepared",
    owner: "new-user.testnet",
    vault: "v-reviewed.v.operator.testnet",
    factory: "v.operator.testnet",
    vaultCodeHash: "reviewed-vault-hash",
    factoryCodeHash: "reviewed-factory-hash",
    planDigest: "a".repeat(64),
    transaction: {
      signer: "new-user.testnet",
      receiver: "v.operator.testnet",
      method: "create_vault",
      args: { request_id: "b".repeat(32) },
      deposit: "5000000000000000000000000",
      gas: "250000000000000",
    },
  };
  let dispatched = 0;
  await page.route("**/api/live/provisioning/prepare", (route) =>
    route.fulfill({ json: plan }),
  );
  await page.route("**/api/live/provisioning/dispatch", (route) => {
    dispatched++;
    return route.fulfill({
      status: 403,
      json: { error: "Deployment disabled" },
    });
  });
  await page.goto("/");
  await page.getByLabel("Organization name").fill("My own organization");
  await page
    .getByRole("button", { name: "Create organization", exact: true })
    .click();
  await page.getByRole("button", { name: "Create vault", exact: true }).click();
  const section = page.getByRole("region", {
    name: "Create vault",
    exact: true,
  });
  await expect(section).toContainText("new-user.testnet");
  await expect(section).toContainText("5 testnet NEAR");
  await expect(section).toContainText("250 Tgas");
  await expect(section).toContainText("reviewed-vault-hash");
  await expect(section).toContainText("create_vault");
  await section.getByRole("checkbox").check();
  await expect(
    section.getByRole("button", { name: "Request Meteor approval" }),
  ).toBeDisabled();
  await expect(section).toContainText("Payment controls remain unavailable");
  expect(dispatched).toBe(0);
  await expect(
    page.getByRole("button", { name: "Authorize configured testnet worker" }),
  ).toHaveCount(0);
});

test("switching clears private records, revokes the old session, and failed/new logins never retain prior workspace access", async ({
  page,
}) => {
  const f = await fixture(page, "old-owner.testnet");
  await page.route("**/api/live/config",route=>route.fulfill({json:{network:"testnet",organization:"studio",contract:"vault.owner.testnet",worker:"worker.owner.testnet",publicKey:"",configured:true,transactionsEnabled:false}}));
  f.orgs.set("old-owner.testnet", [
    { id: "studio", name: "Private studio", status: "ready", role: "owner" },
  ]);
  const snapshot = await new MockOwnerAdapter(0).snapshot();
  snapshot.mode = "testnet";
  snapshot.protocolVersion = 88;
  snapshot.vendors[0].name = "Private vendor A";
  snapshot.access = {
    organization: "studio",
    accountId: "old-owner.testnet",
    role: "owner",
    vaultOwner: "old-owner.testnet",
  };
  await page.route("**/api/live/snapshot**", (route) =>
    route.fulfill({ json: snapshot }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Vault", exact: true }),
  ).toBeVisible();
  await openAccountMenu(page);await page
    .getByRole("button", { name: "Switch wallet", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sign in" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Vault", exact: true }),
  ).toHaveCount(0);
  f.deny(true);
  // Meteor must report the newly picked account; the pinned-account input is gone,
  // so flip the fixture's selection directly (as the unreported-selection test does).
  await page.evaluate(() => { (window as unknown as { meteorProbe: { selected: string } }).meteorProbe.selected = "new-user.testnet"; });
  await signIn(page, "new-user.testnet");
  await expect(
    page.getByRole("alert").filter({ hasText: "wallet access couldn't be verified" }),
  ).toBeVisible();
  await expect(page.getByText("Private studio")).toHaveCount(0);
  f.deny(false);
  await signIn(page, "new-user.testnet");
  await expect(page.getByText("No organizations yet.")).toBeVisible();
  await expect(page.getByText("Private vendor A")).toHaveCount(0);
  expect(f.logoutCalls()).toBeGreaterThanOrEqual(3);
});

test("configuration drift clears the old workspace before showing a fresh server vault",async({page})=>{
 const f=await fixture(page,"old-owner.testnet");
 f.orgs.set("old-owner.testnet",[{id:"studio",name:"Private studio",status:"ready",role:"owner"}]);
 let contract="vault.owner.testnet";
 await page.route("**/api/live/config",route=>route.fulfill({json:{network:"testnet",organization:"studio",contract,worker:"worker.owner.testnet",publicKey:"",configured:true,transactionsEnabled:false}}));
 const snapshot=await new MockOwnerAdapter(0).snapshot();snapshot.mode="testnet";snapshot.protocolVersion=88;snapshot.access={organization:"studio",accountId:"old-owner.testnet",role:"owner",vaultOwner:"old-owner.testnet"};
 await page.route("**/api/live/snapshot**",route=>route.fulfill({json:snapshot}));
 await page.goto("/");await expect(page.getByRole("heading",{name:"Vault",exact:true})).toBeVisible();
 contract="changed.testnet";
 await page.getByRole("button",{name:"Refresh finalized state",exact:true}).click();
 await expect(page.getByText(/workspace configuration changed/)).toBeVisible();
 await expect(page.getByRole("heading",{name:"Vault",exact:true})).toHaveCount(0);
 await expect(page.getByRole("button",{name:"Review owner transaction in wallet",exact:true})).toHaveCount(0);
});
test('message login waits for approval', async ({
  page,
}) => {
  const f = await fixture(page, '', true);
  await page.goto('/');
  await signIn(page, 'new-user.testnet');
  // Pending Meteor approval: the button stays disabled and in busy state.
  await expect(
    page.getByRole('region', {name:'Meteor connection'}).locator('button[aria-busy=true]'),
  ).toBeDisabled();
  // Establish the first Meteor request really exists before any assertion on it.
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {meteorProbe:{requests:number}}).meteorProbe.requests)).toBe(1);
  expect(f.loginCalls()).toBe(0);
});
test('tab and focus transitions preserve private views without signatures',async({page})=>{
 const f=await fixture(page,'first.testnet');await page.goto('/');await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();
 await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));});
 await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();expect(f.logoutCalls()).toBe(0);expect(f.resumeCalls()).toBe(0);expect(await page.evaluate(()=>(window as any).meteorProbe.requests)).toBe(0);
});

test("a failed logout cannot restore private records on reload", async ({
  page,
}) => {
  await fixture(page, "new-user.testnet");
  await page.route("**/api/live/logout", (route) =>
    route.fulfill({ status: 503, json: { error: "Server unavailable" } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your workspace" }),
  ).toBeVisible();
  await openAccountMenu(page);await page
    .getByRole("button", { name: "Switch wallet", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sign in" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your workspace" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Sign in" }),
  ).toBeVisible();
});

test("slow verification never overlaps heartbeats and reports rate limiting without discarding the session", async ({page}) => {
 const f=await fixture(page,"new-user.testnet");await page.clock.install();await page.addInitScript(()=>{Math.random=()=>0;});await page.goto('/');
 await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();
 const exhausted=exhaustReads(page,'session',[2000,2000,2000]);let requests=0,release!:()=>void;const held=new Promise<void>(r=>{release=r;});
 await page.route('**/api/live/session',async route=>{requests++;if(requests===1)await held;await route.fulfill({status:429,headers:{'Retry-After':'2'},json:{error:'Provider rate limited verification'}}).catch(()=>{});});
 await page.clock.fastForward(30000);await expect.poll(()=>requests).toBe(1);
 await page.clock.runFor(10000);expect(requests).toBe(1);
 const response=page.waitForResponse(r=>r.url().endsWith('/api/live/session'));release();await response;await exhausted();
 await expect(page.getByRole('alert').filter({hasText:'limiting requests'})).toBeVisible();expect(requests).toBe(4);
 await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();expect(f.logoutCalls()).toBe(0);expect(f.loginCalls()).toBe(0);
 expect(await page.getByRole('main',{name:'Wallet onboarding'}).evaluate(e=>(e as HTMLElement).inert)).toBe(true);
});

test("missing extension and mainnet account errors explain recovery; demo stays explicit", async ({
  page,
}) => {
  await page.route("**/api/live/config", (route) =>
    route.fulfill({ json: { network: "testnet", configured: false } }),
  );
  await page.route("**/api/live/identity", (route) =>
    route.fulfill({ status: 401, json: { error: "Verify" } }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Connect to Meteor", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "browser with Meteor installed" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Open explicitly simulated demo" })
    .click();
  await expect(
    page.getByText(/No funds move/),
  ).toBeVisible();
});

test("temporary RPC failure retains records and recovers the same session without another wallet signature",async({page})=>{
 const f=await fixture(page,'new-user.testnet');await page.clock.install();await page.addInitScript(()=>{Math.random=()=>0;});await page.goto('/');await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();
 const exhausted=exhaustReads(page,'session');let down=true,calls=0;await page.route('**/api/live/session',route=>{calls++;return route.fulfill(down?{status:503,json:{error:'RPC temporarily unavailable',retryable:true}}:{json:{accountId:'new-user.testnet'}});});
 await page.clock.fastForward(30000);await expect.poll(()=>calls).toBe(1);await exhausted();
 await expect(page.getByRole('heading',{name:'Verification temporarily unavailable'})).toBeVisible();await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();expect(calls).toBe(4);expect(f.logoutCalls()).toBe(0);
 down=false;await page.getByRole('button',{name:'Retry verification',exact:true}).click();await expect(page.getByRole('heading',{name:'Verification temporarily unavailable'})).toHaveCount(0);expect(f.loginCalls()).toBe(0);expect(f.logoutCalls()).toBe(0);
});

test("pre-session login failure never automatically replays its proof or asks for another signature",async({page})=>{
 await fixture(page);let calls=0;await page.route('**/api/live/login',route=>{calls++;expect(route.request().postDataJSON().accountId).toBe('new-user.testnet');return route.fulfill({status:503,json:{error:'RPC temporarily unavailable',retryable:true}});});
 await page.goto('/');await signIn(page,'new-user.testnet');await expect(page.getByRole('alert').filter({hasText:"couldn't check your account"})).toBeVisible();
 await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));});expect(calls).toBe(1);expect(await page.evaluate(()=>(window as any).meteorProbe.requests)).toBe(1);
});

test("saved session can recover a reload-time RPC outage without requesting a new signature",async({page})=>{
 const f=await fixture(page,'new-user.testnet');await page.clock.install();await page.addInitScript(()=>{Math.random=()=>0;});let down=true,calls=0;const exhausted=exhaustReads(page,'identity');
 await page.route('**/api/live/identity',route=>{calls++;return route.fulfill(down?{status:503,json:{error:'RPC temporarily unavailable',retryable:true}}:{json:{accountId:'new-user.testnet',network:'testnet',organizations:[],notice:''}});});
 await page.goto('/');await expect.poll(()=>calls).toBe(1);await exhausted();expect(calls).toBe(4);await expect(page.getByRole('button',{name:'Continue to workspace',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Create organization',exact:true})).toHaveCount(0);
 down=false;await page.getByRole('button',{name:'Continue to workspace',exact:true}).click();await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();expect(f.loginCalls()).toBe(0);expect(f.logoutCalls()).toBe(0);
});

test('focused dashboard navigation, refresh and active renewal cross the former 15-minute failure interval without signatures',async({page})=>{
 const f=await fixture(page,'old-owner.testnet');f.orgs.set('old-owner.testnet',[{id:'studio',name:'Private studio',status:'ready',role:'owner'}]);
 await page.route('**/api/live/config',async route=>{return route.fulfill({json:{network:'testnet',organization:'studio',contract:'vault.owner.testnet',worker:'worker.owner.testnet',publicKey:'',configured:true,transactionsEnabled:false}})});
 const snapshot=await new MockOwnerAdapter(0).snapshot();snapshot.mode='testnet';snapshot.protocolVersion=88;snapshot.access={organization:'studio',accountId:'old-owner.testnet',role:'owner',vaultOwner:'old-owner.testnet'};
 await page.route('**/api/live/snapshot**',route=>route.fulfill({json:snapshot}));await page.clock.install();await page.goto('/');await expect(page.getByRole('heading',{name:'Vault',exact:true})).toBeVisible();
 await navigateOwner(page, "Work orders");
 await page.clock.fastForward(16*60000);await navigateOwner(page, "Payment history");await expect.poll(()=>f.renewCalls()).toBeGreaterThan(0);
 await page.reload();await expect(page.getByRole('heading',{name:'Payment history',exact:true})).toBeVisible();expect(f.loginCalls()).toBe(0);expect(f.resumeCalls()).toBe(0);expect(f.logoutCalls()).toBe(0);
});
test('a foreground blur notification does not log out an app that still has document focus',async({page})=>{
 const f=await fixture(page,'new-user.testnet');await page.goto('/');await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();expect(f.logoutCalls()).toBe(0);
});
test('an unreported Meteor selection never transfers the authenticated account or prompts on return',async({page})=>{
 const f=await fixture(page,'first.testnet');f.orgs.set('first.testnet',[{id:'private-first',name:'First private workspace',status:'unprovisioned',role:'creator'}]);await page.goto('/');await expect(page.getByRole('button',{name:/First private workspace/})).toBeVisible();
 await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));(window as any).meteorProbe.selected='second.testnet';window.dispatchEvent(new Event('focus'));});
 await expect(page.getByText('Signed in as first.testnet \u00b7 NEAR testnet',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/First private workspace/})).toBeVisible();expect(f.resumeCalls()).toBe(0);
 await openAccountMenu(page);await page.getByRole('button',{name:'Check selected Meteor account (optional)',exact:true}).click();await expect(page.getByRole('heading',{name:'Sign in'})).toBeVisible();await expect(page.getByRole('button',{name:/First private workspace/})).toHaveCount(0);expect(f.loginCalls()).toBe(0);
 await page.getByRole('button',{name:'Connect to Meteor',exact:true}).click();await expect(page.getByText('Signed in as second.testnet \u00b7 NEAR testnet',{exact:true})).toBeVisible();await expect(page.getByText('No organizations yet.')).toBeVisible();expect(f.loginCalls()).toBe(1);
});

test('explicit logout and genuine expiry clear records and show why a fresh signature is required',async({page})=>{
 const f=await fixture(page,'first.testnet');await page.clock.install();await page.goto('/');await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();
 await page.route('**/api/live/session',route=>route.fulfill({status:401,json:{error:'Your five-hour session has expired. Sign a fresh message.'}}));await page.clock.fastForward(30000);await expect(page.getByRole('heading',{name:'Sign in'})).toBeVisible();await expect(page.getByRole('alert').filter({hasText:'five-hour session'})).toBeVisible();expect(f.logoutCalls()).toBe(1);
});
test('a verified account change broadcasts revocation across tabs before separate authentication',async({page,context})=>{
 const f=await fixture(page,'first.testnet');f.orgs.set('first.testnet',[{id:'private-first',name:'First private workspace',status:'unprovisioned',role:'creator'}]);await page.goto('/');await expect(page.getByRole('button',{name:/First private workspace/})).toBeVisible();
 const other=await context.newPage();const g=await fixture(other,'first.testnet');await other.goto('/');await expect(other.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();await other.evaluate(()=>(window as any).meteorProbe.selected='second.testnet');await openAccountMenu(other);await other.getByRole('button',{name:'Check selected Meteor account (optional)',exact:true}).click();
 await expect(page.getByRole('button',{name:/First private workspace/})).toHaveCount(0);await expect(other.getByRole('heading',{name:'Sign in'})).toBeVisible();expect(g.loginCalls()).toBe(0);expect(f.logoutCalls()).toBe(0);await other.close();
});

test('sign out revokes the browser and refresh cannot restore private records',async({page})=>{
 const f=await fixture(page,'first.testnet');await page.goto('/');await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();await openAccountMenu(page);await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('heading',{name:'Sign in'})).toBeVisible();await page.reload();await expect(page.getByRole('button',{name:'Create organization',exact:true})).toHaveCount(0);expect(f.logoutCalls()).toBeGreaterThan(0);
});
test('ordinary navigation and refresh restore the same authenticated account without signatures',async({page})=>{
 const f=await fixture(page,'first.testnet');await page.goto('/');await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();await page.goto('/?returning=1');await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();expect(f.logoutCalls()).toBe(0);expect(f.resumeCalls()).toBe(0);
});

test('Connect to Meteor requests one off-chain selected-wallet proof without typing an account ID',async({page})=>{
 const f=await fixture(page);await page.goto('/');await expect(page.getByLabel('Testnet wallet account ID')).toHaveCount(0);await page.getByRole('button',{name:'Connect to Meteor',exact:true}).click();await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();expect(f.loginCalls()).toBe(1);expect(await page.evaluate(()=>(window as unknown as {meteorProbe:{requests:number}}).meteorProbe.requests)).toBe(1);await expect(page.getByText('No organizations yet.')).toBeVisible();
});

test('the five-hour client deadline logs out exactly at the boundary without background polling extending it',async({page})=>{
 await page.clock.install({time:new Date('2026-11-03T12:00:00Z')});const f=await fixture(page,'first.testnet');const base=Date.parse('2026-11-03T12:00:00Z'),deadline=base+5*3600000;
 await page.route('**/api/live/identity',async route=>route.fulfill({json:{accountId:'first.testnet',network:'testnet',organizations:[],notice:'',session:{idleExpires:deadline,absoluteExpires:deadline,serverTime:await page.evaluate(()=>Date.now())}}}));
 await page.route('**/api/live/session',async route=>{const now=await page.evaluate(()=>Date.now());return route.fulfill(now>=deadline?{status:401,json:{error:'Your five-hour session has expired.'}}:{json:{accountId:'first.testnet',idleExpires:deadline,absoluteExpires:deadline,serverTime:now}})});
 await page.goto('/');await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();await page.clock.pauseAt(new Date((await page.evaluate(()=>Date.now()))+1000));const remaining=deadline-(await page.evaluate(()=>Date.now()));const checked=page.waitForResponse(r=>r.url().endsWith('/api/live/session'));await page.clock.fastForward(remaining-1);await checked;await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();await page.clock.fastForward(1);await expect(page.getByRole('heading',{name:'Sign in'})).toBeVisible();await expect(page.getByRole('alert').filter({hasText:'five-hour session'})).toBeVisible();expect(f.loginCalls()).toBe(0);expect(f.logoutCalls()).toBeGreaterThan(0);
});
test('server remaining lifetime avoids immediate logout when the browser wall clock is ahead',async({page})=>{
 const base=Date.parse('2026-11-03T12:00:00Z');await page.clock.install({time:new Date(base+6*3600000)});const f=await fixture(page,'first.testnet');
 await page.route('**/api/live/identity',route=>route.fulfill({json:{accountId:'first.testnet',network:'testnet',organizations:[],notice:'',session:{idleExpires:base+5*3600000,absoluteExpires:base+5*3600000,serverTime:base}}}));
 await page.goto('/');await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();expect(f.logoutCalls()).toBe(0);
});

test('an accepted wallet message followed by workspace RPC failure offers saved-session recovery without another signature',async({page})=>{
 const f=await fixture(page);await page.clock.install();await page.addInitScript(()=>{Math.random=()=>0;});let failed=true,calls=0;const exhausted=exhaustReads(page,'identity');
 await page.route('**/api/live/identity',route=>{if(f.loginCalls()===0)return route.fulfill({status:401,json:{error:'Verify wallet'}});calls++;return route.fulfill(failed?{status:503,json:{error:'Workspace RPC temporarily unavailable',retryable:true}}:{json:{accountId:'new-user.testnet',network:'testnet',organizations:[],notice:''}});});
 await page.goto('/');await page.getByRole('button',{name:'Connect to Meteor',exact:true}).click();await expect.poll(()=>calls).toBe(1);await exhausted();expect(calls).toBe(4);
 await expect(page.getByRole('alert').filter({hasText:'Your wallet is verified'})).toBeVisible();await expect(page.getByRole('button',{name:'Retry verification',exact:true})).toBeEnabled();expect(f.loginCalls()).toBe(1);
 failed=false;await page.getByRole('button',{name:'Retry verification',exact:true}).click();await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Verification temporarily unavailable'})).toHaveCount(0);expect(f.loginCalls()).toBe(1);expect(await page.evaluate(()=>(window as any).meteorProbe.requests)).toBe(1);
});

test('focus loss does not cancel an in-flight organization action or require wallet proof',async({page})=>{
 const f=await fixture(page,'first.testnet');let release!:()=>void;const hold=new Promise<void>(r=>release=r);await page.route('**/api/live/organizations',async route=>{await hold;await route.fulfill({json:{id:'new-org',name:'New workspace',status:'unprovisioned',role:'creator'}})});
 await page.goto('/');await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();await page.getByLabel('Organization name').fill('New workspace');await page.getByRole('button',{name:'Create organization',exact:true}).click();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));release();await expect(page.getByRole('button',{name:'Create organization',exact:true})).toBeEnabled();expect(f.logoutCalls()).toBe(0);expect(f.resumeCalls()).toBe(0);
});

test('an unreadable RPC-service response retains records and can recover without revoking the valid identity session',async({page})=>{
 const f=await fixture(page,'first.testnet');await page.clock.install();await page.addInitScript(()=>{Math.random=()=>0;});await page.goto('/');await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();let calls=0;const exhausted=exhaustReads(page,'session');
 await page.route('**/api/live/session',route=>{calls++;return route.fulfill({status:503,contentType:'text/html',body:'<h1>Temporarily unavailable</h1>'});});await page.clock.fastForward(30000);await expect.poll(()=>calls).toBe(1);await exhausted();expect(calls).toBe(4);
 await expect(page.getByRole('heading',{name:'Verification temporarily unavailable'})).toBeVisible();await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();expect(f.logoutCalls()).toBe(0);
 await page.getByRole('button',{name:'Retry verification',exact:true}).click();await expect(page.getByRole('heading',{name:'Verification temporarily unavailable'})).toHaveCount(0);expect(f.loginCalls()).toBe(0);
});

test('persistent HttpOnly session survives a browser process restart and logout survives the next restart',async({},testInfo)=>{
 // Both desktop and emulated mobile persistent contexts are supported here.
 const address=String(testInfo.project.use.baseURL);
 const profile=await mkdtemp(join(tmpdir(),'nnetics-session-test-'));let context:Awaited<ReturnType<typeof chromium.launchPersistentContext>>|undefined;
 const launch=async()=>{context=await chromium.launchPersistentContext(profile,{headless:true,channel:process.platform==='win32'?'msedge':undefined,viewport:testInfo.project.use.viewport,isMobile:testInfo.project.use.isMobile,hasTouch:testInfo.project.use.hasTouch});const page=await context.newPage();const f=await fixture(page,'first.testnet');
 const hasSession=(cookie:string|undefined)=>cookie?.includes('test_identity=opaque-test-token');
 await page.route('**/api/live/identity',route=>route.fulfill(hasSession(route.request().headers().cookie)?{json:{accountId:'first.testnet',network:'testnet',organizations:[],notice:''}}:{status:401,json:{error:'Sign in required'}}));
 await page.route('**/api/live/login',route=>route.fulfill({headers:{'Set-Cookie':'test_identity=opaque-test-token; HttpOnly; SameSite=Strict; Path=/api/live; Max-Age=18000'},json:{ok:true}}));
 await page.route('**/api/live/logout',route=>route.fulfill({headers:{'Set-Cookie':'test_identity=; HttpOnly; SameSite=Strict; Path=/api/live; Max-Age=0'},json:{ok:true}}));return {page,f};};
 try{
 let run=await launch();await run.page.goto(address);await run.page.getByRole('button',{name:'Connect to Meteor',exact:true}).click();await expect(run.page.getByText('Signed in as first.testnet \u00b7 NEAR testnet',{exact:true})).toBeVisible();
 const cookie=(await context!.cookies()).find(c=>c.name==='test_identity')!;expect(cookie.httpOnly).toBe(true);expect(cookie.expires).toBeGreaterThan(Date.now()/1000);await context!.close();context=undefined;
 run=await launch();await run.page.goto(address);await expect(run.page.getByText('Signed in as first.testnet \u00b7 NEAR testnet',{exact:true})).toBeVisible();expect(await run.page.evaluate(()=>(window as any).meteorProbe.requests)).toBe(0);
 await openAccountMenu(run.page);await run.page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(run.page.getByRole('heading',{name:'Sign in'})).toBeVisible();await expect.poll(async()=>(await context!.cookies()).some(c=>c.name==='test_identity')).toBe(false);await context!.close();context=undefined;
 run=await launch();await run.page.goto(address);await expect(run.page.getByRole('button',{name:'Connect to Meteor',exact:true})).toBeVisible();await expect(run.page.getByRole('button',{name:'Create organization',exact:true})).toHaveCount(0);
 }finally{await context?.close();if(!profile.startsWith(join(tmpdir(),'nnetics-session-test-')))throw Error('Unexpected test profile path');await rm(profile,{recursive:true,force:true});}
});

test('a cancelled optional wallet check retains the authenticated account and its records',async({page})=>{
 const f=await fixture(page,'first.testnet',true);await page.goto('/');await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();await openAccountMenu(page);await page.getByRole('button',{name:'Check selected Meteor account (optional)',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).meteorProbe.requests)).toBe(1);await page.evaluate(()=>(window as any).meteorProbe.decline());await expect(page.getByRole('status').filter({hasText:'inconclusive'})).toBeVisible();await expect(page.getByText('Signed in as first.testnet \u00b7 NEAR testnet',{exact:true})).toBeVisible();expect(f.logoutCalls()).toBe(0);
});


test('refresh waits for saved-session restoration instead of falsely showing a disconnected wallet',async({page})=>{
 const f=await fixture(page,'first.testnet');let release!:()=>void;const hold=new Promise<void>(r=>release=r);await page.route('**/api/live/identity',async route=>{await hold;await route.fulfill({json:{accountId:'first.testnet',network:'testnet',organizations:[],notice:''}})});
 await page.goto('/');await expect(page.getByRole('heading',{name:'Restoring your saved session'})).toBeVisible();await expect(page.getByRole('button',{name:'Connect to Meteor',exact:true})).toHaveCount(0);release();await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();expect(f.loginCalls()).toBe(0);expect(f.logoutCalls()).toBe(0);
});


test('switching organizations cancels the previous selection before its late response can restore records',async({page})=>{
 const f=await fixture(page,'first.testnet');
 f.orgs.set('first.testnet',[{id:'org-a',name:'First organization',status:'unprovisioned',role:'creator'},{id:'org-b',name:'Second organization',status:'unprovisioned',role:'creator'}]);
 let release!:()=>void,captured=false,cancelled=false;const held=new Promise<void>(r=>{release=r;});
 page.on('requestfailed',r=>{if(r.url().includes('organization=org-a'))cancelled=true;});
 await page.route('**/api/live/organization?*',async route=>{if(new URL(route.request().url()).searchParams.get('organization')==='org-a'){captured=true;await held;}await route.fulfill({json:{}}).catch(()=>{});});
 await page.route('**/api/live/contractors/owner?*',route=>route.fulfill({json:{mode:'persistent',profiles:[],orders:[],invoices:[]}}));
 await page.goto('/');await page.getByRole('button',{name:/First organization/}).click();await expect.poll(()=>captured).toBe(true);
 try {await page.getByRole('button',{name:/Second organization/}).click();await expect.poll(()=>cancelled).toBe(true);await expect(page.getByRole('heading',{name:'Second organization',exact:true})).toBeVisible();}
 finally {release();}
 await expect(page.getByRole('heading',{name:'First organization',exact:true})).toHaveCount(0);expect(f.loginCalls()).toBe(0);expect(f.logoutCalls()).toBe(0);
});

test('wallet switching cancels workspace retry and the next identity cannot inherit its pending state',async({page})=>{
 const f=await fixture(page,'first.testnet');await page.clock.install();await page.addInitScript(()=>{Math.random=()=>0;});
 await page.goto('/');await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();
 const exhausted=exhaustReads(page,'session');
 await page.route('**/api/live/session',route=>route.fulfill({status:503,json:{error:'Temporary network failure',retryable:true}}));
 await page.clock.fastForward(30000);await exhausted();
 let release!:()=>void,captured=false;const held=new Promise<void>(r=>{release=r;});
 await page.route('**/api/live/identity',async route=>{
   if(f.loginCalls()===0){captured=true;await held;await route.fulfill({json:{accountId:'first.testnet',organizations:[],network:'testnet',notice:''}}).catch(()=>{});}
   else await route.fulfill({json:{accountId:'second.testnet',organizations:[],network:'testnet',notice:''}});
 });
 await page.getByRole('button',{name:'Retry verification',exact:true}).click();await expect.poll(()=>captured).toBe(true);
 try {
   await openAccountMenu(page);await page.getByRole('button',{name:'Switch wallet',exact:true}).click();
   await page.evaluate(()=>(window as any).meteorProbe.selected='second.testnet');
   await page.getByRole('button',{name:/^(Connect to Meteor|Try again)$/}).click();
   await expect(page.getByText('Signed in as second.testnet · NEAR testnet',{exact:true})).toBeVisible();
   await expect(page.getByRole('heading',{name:'Your workspace',exact:true})).toBeVisible();
   await expect(page.getByText('Checking your saved session…',{exact:true})).toHaveCount(0);
   expect(f.loginCalls()).toBe(1);
 } finally {release();}
 await expect(page.getByText('Signed in as first.testnet · NEAR testnet',{exact:true})).toHaveCount(0);
});
