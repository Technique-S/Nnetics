import {test,expect} from '@playwright/test';
import {MockOwnerAdapter} from '../../src/data/mock-adapter';
import {navigateOwner,openAccountMenu} from './navigation-helpers';
import {fixtureWorkspace} from './release-fixture';

test('zero-budget empty vault renders safely and administration stays contextual',async({page})=>{
 const snapshot=await new MockOwnerAdapter(0).snapshot();snapshot.mode='testnet';snapshot.protocolVersion=88;snapshot.access={organization:'studio',accountId:'owner.testnet',role:'owner',vaultOwner:snapshot.vault.owner};
 Object.assign(snapshot.vault,{budget:'0',spent:'0',reserved:'0',funded:'0',paused:true,agent:null});snapshot.vendors=[];snapshot.orders=[];snapshot.invoices=[];snapshot.payments=[];snapshot.queue=[];
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/live/config',r=>r.fulfill({json:{network:'testnet',organization:'studio',contract:'vault.owner.testnet',worker:'worker.owner.testnet',publicKey:'',configured:true,transactionsEnabled:false}}));
 await page.route('**/api/live/identity',r=>r.fulfill({json:{accountId:'owner.testnet',network:'testnet',organizations:[{id:'studio',name:'Content studio',status:'ready',role:'owner'}],notice:''}}));
 await page.route('**/api/live/contractors/owner**',r=>r.fulfill({json:{mode:'persistent',profiles:[],orders:[],invoices:[]}}));
 await page.route('**/api/live/snapshot**',async r=>{await gate;await r.fulfill({json:snapshot});});
 await page.goto('/');await expect(page.getByText('Loading verified workspace records…',{exact:true})).toBeVisible();release();
 await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
 if((page.viewportSize()?.width||0)>760){const before=await page.locator('#owner-navigation').boundingBox();await openAccountMenu(page);await page.getByText('About this wallet session',{exact:true}).click();expect(await page.locator('#owner-navigation').boundingBox()).toEqual(before);await page.locator('.account-menu>summary').click();}
 await navigateOwner(page,'Contractors');await expect(page.getByRole('main')).toHaveCount(1);await expect(page.locator('main main')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Review owner transaction in wallet'})).toHaveCount(0);
 await navigateOwner(page,'Vault');await expect(page.getByRole('button',{name:'Review owner transaction in wallet'})).toBeDisabled();await expect(page.getByRole('button',{name:'Grant viewer access'})).toHaveCount(0);
 await navigateOwner(page,'Access');await expect(page.getByRole('button',{name:'Grant viewer access'})).toBeVisible();await expect(page.getByRole('button',{name:'Review owner transaction in wallet'})).toHaveCount(0);
 await navigateOwner(page,'Recovery');await expect(page.getByText('Payment attempts will appear here.',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'Activity',exact:true})).toBeVisible();expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('navigation preference and mobile focus are independent of authentication',async({page},info)=>{
 await fixtureWorkspace(page);
 const toggle=page.getByRole('button',{name:'Toggle navigation',exact:true});await toggle.click();
 if(info.project.name==='mobile'){
  await expect(page.getByRole('dialog',{name:'Workspace navigation'})).toBeVisible();expect(await page.locator('.workspace-main').evaluate(e=>(e as HTMLElement).inert)).toBe(true);await page.keyboard.press('Escape');await expect(toggle).toBeFocused();expect(await page.locator('.workspace-main').evaluate(e=>(e as HTMLElement).inert)).toBe(false);
 }else{await expect(page.locator('html')).toHaveAttribute('data-nav-collapsed','true');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-nav-collapsed','true');}
 await navigateOwner(page,'Work orders');await navigateOwner(page,'Payment history');await page.goBack();await expect(page.getByRole('heading',{name:'Contractors',exact:true,level:1})).toBeVisible();
});
