import {test, expect, type Page} from '@playwright/test';
import {navigateOwner} from './navigation-helpers';
import {fixtureWorkspace} from './release-fixture';

async function post(page:Page, path:string, body:unknown) {
  return page.evaluate(async ({path,body})=>{
    const response=await fetch('/api/demo/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    return {status:response.status,body:await response.json()};
  },{path,body});
}

test('labels simulations, disables deployment, navigates and fits the viewport',async({page})=>{
  await fixtureWorkspace(page);
  const external:string[]=[];
  page.on('request',request=>{if(new URL(request.url()).origin!==new URL(page.url()).origin)external.push(request.url());});
  await expect(page.getByText('Demo · simulated funds · no wallets, keys or tokens involved')).toBeVisible();
  await expect(page.getByRole('button',{name:'Deployment disabled'})).toHaveCount(0);
  for(const view of ['Contractors','Invoices','Payments','Activity','Vault & Controls','Overview']) {
    await navigateOwner(page,view);
    await expect(page.getByRole('heading',{name:view,exact:true,level:1})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  expect(external).toEqual([]);
});

test('wallet changes preserve immutable work orders and pause controls refuse new payments',async({page})=>{
  const {profileId,orderId}=await fixtureWorkspace(page);
  const proof=await post(page,'contractors/contractor',{action:'wallet-challenge',account:'writer-new.testnet'});
  expect(proof.status).toBe(200);
  expect((await post(page,'contractors/contractor',{action:'wallet-proof',challenge:proof.body.challenge})).status).toBe(200);
  const records=await (await page.request.get('/api/demo/contractors/owner')).json();
  expect((await post(page,'contractors/owner',{action:'approve-wallet',profileId,requestId:records.profiles[0].pendingWallet.id})).status).toBe(200);
  expect((await post(page,'contractors/owner',{action:'create-order',profileId,reference:'NEW-WALLET',title:'New work',amount:'1'})).status).toBe(200);
  const updated=await (await page.request.get('/api/demo/contractors/owner')).json();
  expect(updated.orders.find((o:{id:string})=>o.id===orderId).recipient).toBe('editor-demo.testnet');
  expect(updated.orders.find((o:{reference:string})=>o.reference==='NEW-WALLET').recipient).toBe('writer-new.testnet');
  await navigateOwner(page,'Vault & Controls');
  await page.getByRole('button',{name:'Pause the demo vault'}).click();
  const refused=await post(page,'workspace/payment/prepare',{idempotencyKey:crypto.randomUUID(),recipient:'writer-new.testnet',amount:'1000000000000000000000000',description:'Paused'});
  expect(refused.status).toBe(400);expect(refused.body.error).toMatch(/paused/i);
  await page.getByRole('button',{name:'Resume the demo vault'}).click();
  await expect(page.getByText(/Demo vault resumed/)).toBeVisible();
});

test('invoice review cannot override a source conflict; unknown payment outcomes stay reserved',async({page})=>{
  await fixtureWorkspace(page,{text:'Action work delivered. Amount: 4 NEAR',amount:'4'});
  await navigateOwner(page,'Invoices');
  await expect(page.getByRole('button',{name:/Approve bill/})).toBeDisabled();
  await page.getByRole('textbox',{name:/Review note/}).fill('Confirm the amount against the work order.');
  await page.getByRole('button',{name:/Request clarification/}).click();
  await expect(page.locator('article [data-status="Needs clarification"]')).toBeVisible();
  await navigateOwner(page,'Vault & Controls');
  await page.locator('input[name=amount]').fill('5');await page.getByRole('button',{name:'Fund vault',exact:true}).click();
  await navigateOwner(page,'Settings');
  await page.getByLabel('Simulated settlement outcome').selectOption('unknown');
  await expect(page.getByText(/Set to unknown/)).toBeVisible();
  const prepared=await post(page,'workspace/payment/prepare',{idempotencyKey:crypto.randomUUID(),recipient:'editor-demo.testnet',amount:'1000000000000000000000000',description:'Unknown outcome'});
  expect(prepared.status).toBe(200);
  expect((await post(page,'workspace/payment/confirm',{paymentId:prepared.body.payment.id,confirmationSecret:prepared.body.confirmationSecret})).status).toBe(200);
  await navigateOwner(page,'Activity');await page.getByRole('button',{name:'Refresh workspace'}).click();
  const attempts=page.getByRole('region',{name:'Payment attempts'});
  await expect(attempts).toContainText('Pending');
  await page.reload();await expect(attempts).toContainText('Do not send this payment again');
  const state=await (await page.request.get('/api/demo/workspace/state')).json();
  expect(BigInt(state.vault.reserved)).toBeGreaterThan(0n);expect(state.payments).toHaveLength(1);
});

test('load failures recover and untrusted invoice text stays literal',async({page})=>{
  const text='<img src="https://invalid.example" onerror="window.injected=1">';
  await fixtureWorkspace(page,{text});
  let down=true;
  await page.route('**/api/demo/workspace/state',route=>down?route.fulfill({status:503,json:{error:'Temporary failure'}}):route.continue());
  await page.getByRole('button',{name:'Refresh workspace'}).click();
  await expect(page.getByRole('alert',{name:'Simulation error'})).toBeVisible();
  down=false;await page.getByRole('button',{name:'Retry refresh'}).click();
  await expect(page.getByRole('alert',{name:'Simulation error'})).toHaveCount(0);
  await navigateOwner(page,'Invoices');
  await page.getByText('Original billing text',{exact:true}).click();
  await expect(page.locator('pre')).toHaveText(text);await expect(page.locator('pre img')).toHaveCount(0);
  expect(await page.evaluate(()=>('injected' in window))).toBe(false);
});

test('submitted invoices receive durable server references and reject source currencies',async({page})=>{
  const {orderId}=await fixtureWorkspace(page,{submitInvoice:false});
  const fields={orderId,amount:'3',asset:'NEAR',recipient:''};
  const rejected=await post(page,'contractors/contractor',{action:'submit-invoice',submissionId:crypto.randomUUID(),fields,text:'Amount: 3 USDC',description:'Invalid currency'});
  expect(rejected.status).toBe(400);expect(rejected.body.error).toMatch(/currency|NEAR/i);
  expect((await post(page,'contractors/contractor',{action:'submit-invoice',submissionId:crypto.randomUUID(),fields,text:'Amount: 3 NEAR',description:'Delivered work'})).status).toBe(200);
  const saved=await (await page.request.get('/api/demo/contractors/owner')).json();
  expect(saved.invoices).toHaveLength(1);expect(saved.invoices[0].reference).toMatch(/^CTR-\d+-INV-0001$/);
  await navigateOwner(page,'Invoices');await expect(page.getByText(saved.invoices[0].reference,{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByText(saved.invoices[0].reference,{exact:true})).toBeVisible();
});
