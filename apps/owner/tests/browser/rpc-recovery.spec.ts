import {test,expect,type Page} from '@playwright/test';
import {MockOwnerAdapter} from '../../src/data/mock-adapter';
import {navigateOwner,openAccountMenu} from './navigation-helpers';

async function fixture(page:Page) {
  const snapshot=await new MockOwnerAdapter(0).snapshot();
  snapshot.mode='testnet';snapshot.protocolVersion=88;snapshot.blockHash='verified-fixture';
  snapshot.access={organization:'studio',accountId:snapshot.vault.owner,role:'owner',vaultOwner:snapshot.vault.owner};
  let logout=0,signing=0;
  await page.route('**/api/live/**',async route=>{
    const path=new URL(route.request().url()).pathname.split('/api/live/')[1];
    if(path==='config')return route.fulfill({json:{network:'testnet',organization:'studio',contract:'vault.owner.testnet',worker:'worker.owner.testnet',publicKey:'fixture',configured:true,transactionsEnabled:true}});
    if(path==='identity')return route.fulfill({json:{accountId:snapshot.vault.owner,network:'testnet',organizations:[{id:'studio',name:'Studio',status:'ready',role:'owner'}],notice:''}});
    if(path==='session'||path==='session/renew')return route.fulfill({json:{accountId:snapshot.vault.owner,idleExpires:Date.now()+1800000,absoluteExpires:Date.now()+1800000}});
    if(path==='logout'){logout++;return route.fulfill({json:{ok:true}});}
    if(route.request().method()==='POST')signing++;
    return route.fulfill({json:snapshot});
  });
  return {snapshot,get logout(){return logout;},get signing(){return signing;}};
}
test('slow workspace read gives accessible feedback, recovers and retains session',async({page})=>{
 const f=await fixture(page);await page.clock.install();let requests=0,release!:()=>void;const held=new Promise<void>(r=>{release=r;});
 await page.route('**/api/live/snapshot**',async route=>{requests++;await held;await route.fulfill({json:f.snapshot}).catch(()=>{});});
 await page.goto('/');await expect(page.getByText('Loading verified workspace records…',{exact:true})).toBeVisible();
 await page.clock.pauseAt(new Date((await page.evaluate(()=>Date.now()))+1000));await page.clock.runFor(10000);
 try {await expect(page.getByText('This process is taking longer than expected. We’re still trying.',{exact:true})).toBeVisible();expect(requests).toBe(1);}
 finally {release();}
 await expect(page.getByRole('heading',{name:/^(Your payment desk|Your payments)$/})).toBeVisible();
 expect(requests).toBe(1);expect(f.logout).toBe(0);expect(f.signing).toBe(0);
});

test('refresh retries keep funding form and existing data; wallet switch ignores stale result',async({page})=>{
  const f=await fixture(page);await page.goto('/');await navigateOwner(page,'Vault');
  const amount=page.getByLabel('Amount (NEAR)',{exact:true});await amount.fill('0.234');
  let calls=0;
  await page.route('**/api/live/snapshot**',async route=>{
    calls++;if(calls===1)return route.fulfill({status:503,json:{error:'Temporary provider timeout',retryable:true}});
    return route.fulfill({json:f.snapshot});
  });
  await page.getByRole('button',{name:/^Refresh (finalized|confirmed) state$/}).click();
  await expect.poll(()=>calls).toBeGreaterThanOrEqual(2);
  await expect(amount).toHaveValue('0.234');expect(f.logout).toBe(0);
  let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/live/snapshot**',async route=>{await held;await route.fulfill({json:f.snapshot}).catch(()=>{});});
  await page.getByRole('button',{name:/^Refresh (finalized|confirmed) state$/}).click();
  await openAccountMenu(page);await page.getByRole('button',{name:'Switch wallet',exact:true}).click();release();
  await expect(amount).toHaveCount(0);expect(f.signing).toBe(0);
});
test('browser CSP allows the documented FastNear endpoint for safe reads',async({page})=>{
  let calls=0;
  await page.route('https://rpc.testnet.fastnear.com/**',route=>{calls++;return route.fulfill({headers:{'access-control-allow-origin':'*'},json:{result:{chain_id:'testnet'}}});});
  await page.goto('/?mode=demo');
  const result=await page.evaluate(async()=>{
    const response=await fetch('https://rpc.testnet.fastnear.com/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'status',params:[]})});
    return response.json();
  });
  expect(result.result.chain_id).toBe('testnet');expect(calls).toBeGreaterThan(0);
});

test('missing Meteor extension is identified without a funding request or connectivity error',async({page})=>{
 const f=await fixture(page);await page.goto('/');await navigateOwner(page,'Vault');
 await page.getByRole('button',{name:'Review owner transaction in wallet',exact:true}).click();
 await expect(page.getByRole('alert',{name:'Testnet error'})).toContainText('Meteor installed');
 await expect(page.getByRole('alert',{name:'Testnet error'})).not.toContainText("couldn't check your account");
 expect(f.signing).toBe(0);expect(f.logout).toBe(0);
});

test('disabled owner funding controls disclose the gate without pretending the network is unavailable',async({page})=>{
 const f=await fixture(page);
 await page.route('**/api/live/config',route=>route.fulfill({json:{network:'testnet',organization:'studio',contract:'vault.owner.testnet',worker:'worker.owner.testnet',publicKey:'fixture',configured:true,transactionsEnabled:false}}));
 await page.goto('/');await navigateOwner(page,'Vault');
 await expect(page.getByRole('button',{name:'Review owner transaction in wallet',exact:true})).toBeDisabled();
 await expect(page.getByText('Testnet transactions are disabled.',{exact:false})).toBeVisible();
 await expect(page.getByRole('alert',{name:'Testnet error'})).toHaveCount(0);expect(f.signing).toBe(0);expect(f.logout).toBe(0);
});
