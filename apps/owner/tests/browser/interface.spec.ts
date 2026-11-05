import {navigateOwner, openAccountMenu} from "./navigation-helpers";
import {test, expect} from '@playwright/test';

const empty = {mode:'simulation',profiles:[],orders:[],invoices:[]};
const noSession = 'Open a demo owner workspace first. This is not live wallet login.';

test('owner load failure offers retry, and failed creation retains the name', async ({page}) => {
  let failLoad = true;
  await page.route('**/api/demo/contractors/owner', route => {
    if (route.request().method() === 'POST') return route.fulfill({status:503,json:{error:'Save unavailable'}});
    return route.fulfill(failLoad ? {status:503,json:{error:'Records unavailable'}} : {json:empty});
  });
  await page.goto('/demo/contractors');
  await expect(page.getByRole('heading',{name:'Contractor records unavailable'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Start contractor demo'})).toHaveCount(0);
  failLoad = false;
  await page.getByRole('button',{name:'Retry owner access'}).click();
  await page.getByLabel('Contractor name',{exact:true}).fill('Keep this name');
  await page.getByRole('button',{name:'Create contractor profile'}).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText("We couldn't check your account right now. Please try again shortly.");
  await expect(page.getByLabel('Contractor name',{exact:true})).toHaveValue('Keep this name');
});

test('first demo session reports start failures and can retry', async ({page}) => {
  let started=false, failStart=true;
  await page.route('**/api/demo/contractors/owner', route => route.fulfill(started ? {json:empty} : {status:400,json:{error:noSession}}));
  await page.route('**/api/demo/contractors/owner/start', route => {
    if(failStart)return route.fulfill({status:503,json:{error:'Try starting again'}});
    started=true;return route.fulfill({json:{}});
  });
  await page.goto('/demo/contractors');
  await page.getByRole('button',{name:'Start contractor demo'}).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Something went wrong on our side. Please try again in a moment.');
  failStart=false;
  await page.getByRole('button',{name:'Start contractor demo'}).click();
  await expect(page.getByLabel('Contractor name',{exact:true})).toBeVisible();
});

test('late owner snapshot cannot restore records after identity revocation', async ({page}) => {
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  let hold=false,captured=false;
  const data={...empty,profiles:[{id:'private',name:'Private contractor',wallet:null,linkActive:false,generation:1,walletVersion:0,pendingWallet:null}]};
  await page.route('**/api/demo/contractors/owner',async route=>{
    if(hold){captured=true;await gate;}
    await route.fulfill({json:data});
  });
  await page.goto('/demo/contractors');
  await expect(page.getByRole('heading',{name:'Private contractor',exact:true})).toBeVisible();
  hold=true;
  await page.getByRole('button',{name:'Refresh owner records'}).click();
  await expect.poll(()=>captured).toBeTruthy();
  await page.evaluate(()=>{const channel=new BroadcastChannel('nnetics-identity');channel.postMessage('lock');channel.close();});
  await expect(page.getByRole('heading',{name:'Verify your wallet again'})).toBeVisible();
  release();await page.unrouteAll({behavior:'wait'});
  await expect(page.getByRole('heading',{name:'Private contractor',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Create contractor profile'})).toHaveCount(0);
});

test('vendor cards retain their content inside the tablet breakpoint',async({page})=>{
  await page.setViewportSize({width:768,height:900});
  await page.route('**/api/demo/owner-invoices',route=>route.fulfill({json:[]}));
  await page.goto('/?mode=demo');
  await navigateOwner(page, "Vendors");
  await expect(page.locator('.vendor-card')).toHaveCount(3);
  expect(await page.locator('.vendor-card').evaluateAll(cards=>cards.every(card=>card.scrollWidth<=card.clientWidth))).toBeTruthy();
});
