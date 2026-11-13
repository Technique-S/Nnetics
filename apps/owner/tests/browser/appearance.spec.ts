import {test,expect,chromium} from '@playwright/test';
import type {Page} from '@playwright/test';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {navigateOwner} from './navigation-helpers';
const directory=path.resolve('../../artifacts/submission-readiness/screenshots');
async function capture(page:Page,name:string){fs.mkdirSync(directory,{recursive:true});await page.screenshot({path:path.join(directory,name+'.png'),fullPage:true});}
// The demo workspace starts empty. Every run needs its own workspace before the
// dashboard surfaces exist.
async function demoWorkspace(page:Page){
  await page.goto('/?mode=demo');
  const setup=page.getByRole('heading',{name:'Try the Nnetics demo',exact:true});
  const dashboard=page.getByRole('heading',{name:'Overview',exact:true});
  await expect(setup.or(dashboard)).toBeVisible();
  if(await setup.count()){
    await page.getByLabel('Owner name').fill('Appearance');
    await page.getByRole('button',{name:'Continue'}).click();
    await page.getByLabel('Vault name').fill('Appearance vault');
    await page.getByRole('button',{name:'Create demo workspace'}).click();
  }
  await expect(dashboard).toBeVisible();
}
// Wait for the page's hydrated control; the layout fallback disappears when this slot mounts.
const themeSwitch=(page:Page)=>page.locator('.appearance-inline').getByRole('switch',{name:'Dark mode'});
for(const theme of ['light','dark'] as const){
  test(`${theme}: workspace, dialogs, responsive navigation and reduced motion`,async({page},info)=>{
   await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await demoWorkspace(page);await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
   // The active theme drives the design tokens, not a hard-coded palette value.
   await capture(page,`${info.project.name}-${theme}-overview`);
   for(const name of ['Contractors','Payables','Activity','Vault & Controls']){await navigateOwner(page,name);await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await capture(page,`${info.project.name}-${theme}-${name.toLowerCase().replaceAll(' ','-')}`);}
   await navigateOwner(page,'Contractors');await expect(page.getByLabel('Search contractors')).toBeVisible();await expect(page.locator('main').getByRole('alert')).toHaveCount(0);await capture(page,`${info.project.name}-${theme}-contractors`);
   await page.setViewportSize({width:320,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.getByRole('button',{name:'Toggle navigation'}).click();const drawer=page.getByRole('dialog',{name:'Workspace navigation'});await expect(drawer).toBeVisible();const focusable=drawer.locator('button,a[href]');await focusable.last().focus();await page.keyboard.press('Tab');await expect(focusable.first()).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(focusable.last()).toBeFocused();await capture(page,`${info.project.name}-${theme}-320-navigation`);await page.keyboard.press('Escape');await expect(drawer).not.toBeVisible();
   await page.setViewportSize({width:720,height:540});await navigateOwner(page,'Overview');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await capture(page,`${info.project.name}-${theme}-200-percent-reflow`);
   expect(await page.locator('.nav-active-indicator').evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');
  });
  test(`${theme}: sign-in, loading, access error and not-found`,async({page},info)=>{
   await page.emulateMedia({colorScheme:theme});await page.route('**/api/live/config',route=>route.fulfill({json:{network:'testnet',wallet:'meteor',missing:[],configurationValid:true,transactionsEnabled:false,paymentExecutionEnabled:false}}));
   await page.goto('/');await expect(page.getByRole('heading',{name:'Sign in'})).toBeVisible();await capture(page,`${info.project.name}-${theme}-signin`);
   await page.goto('/contractor');await expect(page.getByRole('heading',{name:'Private access unavailable'})).toBeVisible();await capture(page,`${info.project.name}-${theme}-contractor-invalid`);
   let release!:()=>void;const gate=new Promise<void>(r=>{ release=r; });let requested=false;
   await page.route('**/api/demo/contractors/owner',async route=>{requested=true;await gate;await route.fulfill({status:503,json:{error:'Fixture unavailable'}});});
   await page.goto('/demo/contractors');await expect.poll(()=>requested).toBeTruthy();await capture(page,`${info.project.name}-${theme}-loading`);release();await expect(page.getByRole('heading',{name:'Contractor records unavailable'})).toBeVisible();await capture(page,`${info.project.name}-${theme}-error`);
   await page.goto('/unavailable-theme-fixture');await expect(page.getByRole('heading',{name:'Page not found'})).toBeVisible();await capture(page,`${info.project.name}-${theme}-not-found`);
  });
  test(`${theme}: labeled contractor bill, history, clarification and wallet details`,async({page},info)=>{
   await page.emulateMedia({colorScheme:theme});const profile={id:'theme-fixture',name:'Sample contractor',generation:1,linkActive:true,wallet:'sample-recipient.testnet',walletVersion:1,pendingWallet:null},order={id:'sample-order',reference:'SAMPLE-001',contractorId:profile.id,title:'Sample article',amount:'0.001',recipient:profile.wallet};
   const invoice={id:'sample-invoice',contractorId:profile.id,reference:'CTR-0001-INV-0001',orderId:order.id,orderReference:order.reference,amount:'0.001',asset:'NEAR',recipient:profile.wallet,text:'Sample article completed; requesting 0.001 NEAR.',originalText:'Sample article completed; requesting 0.001 NEAR.',description:'Sample article',status:'Needs clarification',reasons:['Confirm the delivery date.'],ownerNote:'Please confirm delivery.',attachment:null,transactionUrl:null,submittedAt:'2026-11-05T00:00:00.000Z'};
   await page.route('**/api/demo/contractors/contractor',route=>route.fulfill({json:{mode:'simulation',profile,orders:[order],invoices:[invoice]}}));
   await page.goto('/contractor?mode=demo');await expect(page.getByRole('heading',{name:'Sample contractor · Billing'})).toBeVisible();await capture(page,`${info.project.name}-${theme}-contractor-submit`);await page.getByRole('button',{name:'My payments',exact:true}).click();await expect(page.getByText('CTR-0001-INV-0001',{exact:true})).toBeVisible();await capture(page,`${info.project.name}-${theme}-contractor-payments`);await page.getByRole('button',{name:'Wallet details',exact:true}).click();await expect(page.getByText('sample-recipient.testnet',{exact:true}).first()).toBeVisible();await capture(page,`${info.project.name}-${theme}-contractor-wallet`);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  });
}
test('visual preference persists across refresh and tabs; system changes apply only without an override',async({page,context})=>{
  await page.emulateMedia({colorScheme:'light'});await page.goto('/?mode=demo');await expect(page.locator('html')).toHaveAttribute('data-theme','light');await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(themeSwitch(page)).toHaveAttribute('aria-checked','true');await themeSwitch(page).click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');const other=await context.newPage();await other.goto('/?mode=demo');await expect(other.locator('html')).toHaveAttribute('data-theme','light');await themeSwitch(other).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.emulateMedia({colorScheme:'light'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await other.close();
});
test('blocked preference storage still allows toggling, system default and ordinary navigation',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(Storage.prototype,'getItem',{configurable:true,value(){throw new DOMException('Unavailable','SecurityError');}});Object.defineProperty(Storage.prototype,'setItem',{configurable:true,value(){throw new DOMException('Unavailable','SecurityError');}});});await page.emulateMedia({colorScheme:'dark'});await page.goto('/?mode=demo');await expect(page.getByLabel('Owner name')).toBeVisible();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(themeSwitch(page)).toHaveAttribute('aria-checked','true');await themeSwitch(page).click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');await page.getByLabel('Owner name').fill('Appearance');await page.getByRole('button',{name:'Continue'}).click();await page.getByLabel('Vault name').fill('Appearance vault');await page.getByRole('button',{name:'Create demo workspace'}).click();await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();await navigateOwner(page,'Contractors');await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});
test('Windows forced-colors keeps a visible keyboard outline',async({page})=>{
  await page.emulateMedia({forcedColors:'active',colorScheme:'dark'});await page.goto('/?mode=demo');await expect(page.getByLabel('Owner name')).toBeVisible();const control=themeSwitch(page);await control.focus();expect(await control.evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('solid');expect(await control.evaluate(el=>getComputedStyle(el).outlineWidth)).toBe('2px');
});
test('visual preference survives closing and relaunching an isolated browser process',async({},info)=>{
  test.setTimeout(90000);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-theme-browser-'));let context;const origin=process.env.NNETICS_BROWSER_BASE_URL||'http://127.0.0.1:3100';
  try{context=await chromium.launchPersistentContext(dir,{headless:true,channel:process.platform==='win32'?'msedge':undefined});let page=await context.newPage();await page.emulateMedia({colorScheme:'light'});await page.goto(origin+'/?mode=demo');await expect(page.getByLabel('Owner name')).toBeVisible();await themeSwitch(page).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await context.close();context=await chromium.launchPersistentContext(dir,{headless:true,channel:process.platform==='win32'?'msedge':undefined});page=await context.newPage();await page.emulateMedia({colorScheme:'light'});await page.goto(origin+'/?mode=demo');await expect(page.getByLabel('Owner name')).toBeVisible();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');}finally{await context?.close();const resolved=path.resolve(dir);expect(resolved.startsWith(path.resolve(os.tmpdir())+path.sep+'nnetics-theme-browser-')).toBeTruthy();fs.rmSync(resolved,{recursive:true,force:true});}
});
