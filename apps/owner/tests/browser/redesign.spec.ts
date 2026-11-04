import {test,expect} from '@playwright/test';
import {MockOwnerAdapter} from '../../src/data/mock-adapter';
import {navigateOwner,openAccountMenu} from './navigation-helpers';

test('zero-budget empty vault renders safely and administration stays contextual',async({page})=>{
 const snapshot=await new MockOwnerAdapter(0).snapshot();snapshot.mode='testnet';snapshot.protocolVersion=88;snapshot.access={organization:'studio',accountId:'owner.testnet',role:'owner',vaultOwner:snapshot.vault.owner};
 Object.assign(snapshot.vault,{budget:'0',spent:'0',reserved:'0',funded:'0',paused:true,agent:null});snapshot.vendors=[];snapshot.orders=[];snapshot.invoices=[];snapshot.payments=[];
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/live/config',r=>r.fulfill({json:{network:'testnet',organization:'studio',contract:'vault.owner.testnet',worker:'worker.owner.testnet',publicKey:'',configured:true,transactionsEnabled:false}}));
 await page.route('**/api/live/identity',r=>r.fulfill({json:{accountId:'owner.testnet',network:'testnet',organizations:[{id:'studio',name:'Content studio',status:'ready',role:'owner'}],notice:''}}));
 await page.route('**/api/live/snapshot**',async r=>{await gate;await r.fulfill({json:snapshot});});
 await page.goto('/');await expect(page.getByRole('status',{name:'Loading records'})).toBeVisible();release();
 const heading=page.getByRole('heading',{name:'Your payment desk',exact:true});await expect(heading).toBeVisible();expect((await heading.boundingBox())!.y).toBeLessThan(500);
 if((page.viewportSize()?.width||0)>760){const before=await page.locator('#owner-navigation').boundingBox();expect(before!.y).toBe(0);expect(before!.height).toBe(page.viewportSize()!.height);await openAccountMenu(page);await page.getByText('About this wallet session',{exact:true}).click();expect(await page.locator('#owner-navigation').boundingBox()).toEqual(before);await page.locator('.account-menu>summary').click();}else{await expect(page.getByRole('button',{name:'Toggle navigation',exact:true})).toHaveAttribute('aria-expanded','false');}
 await navigateOwner(page,'Vendors');await expect(page.getByRole('button',{name:'Manage vendor',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Import existing reference',exact:true})).toBeHidden();await page.getByText('Import existing vendor',{exact:true}).click();await expect(page.getByRole('combobox',{name:'Reference type',exact:true})).toHaveValue('vendor');
 await navigateOwner(page,'Contractors');await expect(page.getByRole('main')).toHaveCount(1);await expect(page.locator('main main')).toHaveCount(0);

 await expect(page.getByText('No unresolved transfers.',{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:'Review owner transaction in wallet'})).toHaveCount(0);
 await navigateOwner(page,'Vault');await expect(page.getByRole('button',{name:'Review owner transaction in wallet'})).toBeVisible();await expect(page.getByRole('button',{name:'Grant viewer access'})).toHaveCount(0);
 await navigateOwner(page,'Access');await expect(page.getByRole('button',{name:'Grant viewer access'})).toBeVisible();await expect(page.getByRole('button',{name:'Review owner transaction in wallet'})).toHaveCount(0);
 await navigateOwner(page,'Recovery');await expect(page.getByText('No worker jobs in this organization queue.',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Refresh recorded state · read-only',exact:true}).click();await expect(page.getByRole('button',{name:'Reconcile recorded outcome',exact:true})).toBeDisabled();
 await navigateOwner(page,'Payment history');await page.reload();await expect(page.getByRole('heading',{name:'Payment history',exact:true})).toBeVisible();expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('navigation preference and mobile focus are independent of authentication',async({page},info)=>{
 await page.route('**/api/demo/owner-invoices',r=>r.fulfill({json:[]}));await page.goto('/?mode=demo');await expect(page.getByRole('heading',{name:'Your payment desk',exact:true})).toBeVisible();
 const toggle=page.getByRole('button',{name:'Toggle navigation',exact:true});await toggle.click();
 if(info.project.name==='mobile'){
  await expect(page.getByRole('dialog',{name:'Workspace navigation'})).toBeVisible();expect(await page.locator('.workspace-main').evaluate(e=>(e as HTMLElement).inert)).toBe(true);await page.keyboard.press('Escape');await expect(toggle).toBeFocused();expect(await page.locator('.workspace-main').evaluate(e=>(e as HTMLElement).inert)).toBe(false);
 }else{await expect(page.locator('html')).toHaveAttribute('data-nav-collapsed','true');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-nav-collapsed','true');}
 await navigateOwner(page,'Work orders');await navigateOwner(page,'Payment history');await page.goBack();await expect(page.getByRole('heading',{name:'Work orders',exact:true})).toBeVisible();
});
