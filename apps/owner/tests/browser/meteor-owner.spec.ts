import {test,expect,type Page} from '@playwright/test';
import {KeyPair,PublicKey,createTransaction,actions,baseDecode,baseEncode} from 'near-api-js';
import {createHash} from 'node:crypto';
import {MockOwnerAdapter} from '../../src/data/mock-adapter';
import {navigateOwner} from './navigation-helpers';
async function fixture(page:Page,mode:'success'|'compatible'|'manual-reference'|'rejected'|'timeout'|'mismatch'|'unknown'|'missing'='success') {
 const snapshot=await new MockOwnerAdapter(0).snapshot(),publicKey=KeyPair.fromRandom('ed25519').getPublicKey().toString();
 snapshot.mode='testnet';snapshot.protocolVersion=88;snapshot.blockHash='1'.repeat(32);snapshot.access={organization:'studio',accountId:snapshot.vault.owner,role:'owner',vaultOwner:snapshot.vault.owner};
 let attempt:any=null,reserves=0,dispatches=0,reads=0;
 await page.addInitScript(({mode,owner,publicKey})=>{
  let listener:(data:unknown)=>void=()=>{};const signed=new Set<string>();
  (window as any).meteorFixture={signs:0,messages:0};
  (window as any).meteorCom={addMessageDataListener:(fn:any)=>listener=fn,sendMessageData:(data:any)=>{
   if(data.status!=='initializing'||signed.has(data.uid))return;signed.add(data.uid);
   const probe=(window as any).meteorFixture;
   if(data.actionType==='sign_message'){probe.messages++;queueMicrotask(()=>listener({uid:data.uid,status:'closed_success',network:'testnet',actionType:data.actionType,payload:{accountId:mode==='mismatch'?'other.testnet':owner,publicKey,signature:'A'.repeat(86)+'=='}}));}
   else if(data.actionType==='sign'){probe.signs++;if(mode==='timeout')return;queueMicrotask(()=>listener({uid:data.uid,status:mode==='rejected'?'closed_fail':'closed_success',network:'testnet',actionType:'sign',...(mode==='compatible'?{payload:{executionOutcomes:[{transaction:{hash:'2'.repeat(44)}}]}}:{})}));}
  }};
 },{mode,owner:snapshot.vault.owner,publicKey});
 await page.route('**/api/live/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/api/live/')[1],body=route.request().method()==='POST'?route.request().postDataJSON():null;
  if(path==='config')return route.fulfill({json:{network:'testnet',organization:'studio',contract:'vault.owner.testnet',worker:'worker.testnet',publicKey:'worker-fixture',configured:true,transactionsEnabled:true,ownerTransactionsEnabled:true,paymentExecutionEnabled:false}});
  if(path==='identity')return route.fulfill({json:{accountId:snapshot.vault.owner,network:'testnet',organizations:[{id:'studio',status:'ready',role:'owner'}],notice:''}});
  if(path==='session'||path==='session/renew')return route.fulfill({json:{accountId:snapshot.vault.owner,idleExpires:Date.now()+18000000,absoluteExpires:Date.now()+18000000}});
  if(path==='session/challenge')return route.fulfill({json:{nonce:Buffer.alloc(32).toString('base64'),message:'Fixture financial identity check',recipient:'http://127.0.0.1:3114'}});
  if(path==='session/resume')return route.fulfill({json:{accountId:body.accountId,accountChanged:mode==='mismatch'}});
  if(path==='owner-attempt'){
   if(body?.action==='reserve'){
    if(attempt)return route.fulfill({status:409,json:{error:'Owner transaction outcome is unknown. Reconcile the recorded transaction.'}});
    const gas=body.method==='advance_repair_head'?'250000000000000':'100000000000000';
    reserves++;const tx=createTransaction(snapshot.vault.owner,PublicKey.fromString(publicKey),'vault.owner.testnet',1n,[actions.functionCall(body.method,body.args,BigInt(gas),BigInt(body.deposit))],baseDecode('1'.repeat(32)));
    attempt={id:'existing-owner-request',network:'testnet',organization:'studio',owner:snapshot.vault.owner,contract:'vault.owner.testnet',method:body.method,args:body.args,deposit:body.deposit,gas,maxFee:body.method==='advance_repair_head'?'50400000000000000000000':'20400000000000000000000',expires:Date.now()+180000,state:'prepared',unsigned:Buffer.from(tx.encode()).toString('base64'),hash:baseEncode(createHash('sha256').update(tx.encode()).digest())};return route.fulfill({json:attempt});
   }
   if(body?.action==='dispatch'){dispatches++;if(mode==='missing')return route.fulfill({json:null});attempt.state='unknown';return route.fulfill({json:attempt});}
   if(body?.action==='rejected'){attempt=null;return route.fulfill({json:null});}
   if(body?.action==='reported'){attempt.reportedHash=body.hash;attempt.reportedHashes=[body.hash];return route.fulfill({json:attempt});}
   reads++;
   if(mode==='unknown')return route.fulfill({json:attempt});
   if(attempt&&(mode==='success'||(['compatible','manual-reference'].includes(mode)&&attempt.reportedHash))){attempt.state='confirmed';if(mode!=='success')attempt.verifiedReferenceHash=attempt.reportedHash;}
   return route.fulfill({json:attempt});
  }
  return route.fulfill({json:snapshot});
 });
 return {snapshot,get reserves(){return reserves;},get dispatches(){return dispatches;},get reads(){return reads;}};
}
for(const mode of ['success','compatible','rejected','mismatch','unknown'] as const)test(`Meteor owner flow: ${mode} preserves review and durable exclusion`,async({page})=>{
 const f=await fixture(page,mode);await page.goto('/');await navigateOwner(page,'Vault');
 await page.getByRole('button',{name:'Review owner transaction in wallet',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Review owner transaction',exact:true});await expect(dialog).toBeVisible();await expect(dialog).toContainText('0.1 NEAR');await expect(dialog).toContainText('vault.owner.testnet');
 await expect.poll(()=>page.evaluate(()=>(window as any).meteorFixture.signs)).toBe(0);
 await dialog.getByRole('button',{name:'Continue to Meteor',exact:true}).click();
 if(mode==='mismatch'){await expect(page.getByRole('button',{name:/Connect to Meteor|Try again/,exact:true})).toBeVisible();expect(f.dispatches).toBe(0);expect(await page.evaluate(()=>(window as any).meteorFixture.signs)).toBe(0);}
 else {
  await expect.poll(()=>page.evaluate(()=>(window as any).meteorFixture.signs)).toBe(1);
  if(mode==='success'||mode==='compatible')await expect(page.getByText('Owner transaction: Confirmed',{exact:true})).toBeVisible();
  else {await expect(page.getByRole('alert',{name:'Testnet error'})).toContainText('not confirmed');await page.getByRole('button',{name:'Review owner transaction in wallet',exact:true}).click();await expect(page.getByRole('alert',{name:'Testnet error'})).toContainText('not confirmed');expect(f.reserves).toBe(1);expect(await page.evaluate(()=>(window as any).meteorFixture.signs)).toBe(1);}
  expect(f.dispatches).toBe(1);
 }
});
test('Meteor wallet timeout keeps one request across refresh and read-only reconciliation',async({page})=>{
 await page.clock.install();const f=await fixture(page,'timeout');await page.goto('/');await navigateOwner(page,'Vault');await page.getByRole('button',{name:'Review owner transaction in wallet',exact:true}).click();await page.getByRole('button',{name:'Continue to Meteor',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).meteorFixture.signs)).toBe(1);await page.clock.runFor(120001);await expect(page.getByRole('alert',{name:'Testnet error'})).toContainText('not confirmed');
 await page.reload();await navigateOwner(page,'Vault');await page.getByRole('button',{name:'Check transaction status',exact:true}).click();await expect(page.getByText('Owner transaction: Outcome not confirmed; check the existing transaction before signing again',{exact:true})).toBeVisible();expect(f.reserves).toBe(1);expect(f.dispatches).toBe(1);expect(f.reads).toBeGreaterThan(0);expect(await page.evaluate(()=>(window as any).meteorFixture.signs)).toBe(0);
});
test('cancelling the native owner review never opens Meteor and releases only the unsubmitted review',async({page})=>{
 const f=await fixture(page);await page.goto('/');await navigateOwner(page,'Vault');await page.getByRole('button',{name:'Review owner transaction in wallet',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Review owner transaction',exact:true});await expect(dialog).toBeVisible();await dialog.press('Escape');
 await expect(dialog).toHaveCount(0);await expect(page.getByRole('alert',{name:'Testnet error'})).toContainText('Review cancelled');expect(f.dispatches).toBe(0);expect(await page.evaluate(()=>(window as any).meteorFixture.messages)).toBe(0);expect(await page.evaluate(()=>(window as any).meteorFixture.signs)).toBe(0);
 await page.getByRole('button',{name:'Review owner transaction in wallet',exact:true}).click();await expect(page.getByRole('dialog',{name:'Review owner transaction',exact:true})).toBeVisible();expect(f.reserves).toBe(2);
});
test('owner-only acceptance displays its exact storage scope while automated payments remain disabled',async({page})=>{
 const f=await fixture(page);const restriction={id:'fixture-scope',planHash:'a'.repeat(64),owner:f.snapshot.vault.owner,contract:'vault.owner.testnet',method:'fund_storage',deposit:'1000000000000000000',gas:'100000000000000'};
 await page.route('**/api/live/config',route=>route.fulfill({json:{network:'testnet',organization:'studio',contract:restriction.contract,worker:'worker.testnet',publicKey:'worker-fixture',configured:true,transactionsEnabled:true,ownerTransactionsEnabled:true,paymentExecutionEnabled:false,ownerTransactionRestriction:restriction}}));
 await page.goto('/');await navigateOwner(page,'Vault');await expect(page.getByRole('combobox',{name:'Action',exact:true})).toHaveValue('fund_storage');await expect(page.getByRole('combobox',{name:'Action',exact:true})).toBeDisabled();await expect(page.getByLabel('Amount (NEAR)',{exact:true})).toHaveValue('0.000001');await expect(page.getByLabel('Amount (NEAR)',{exact:true})).toHaveAttribute('readonly','');
 await page.getByRole('button',{name:'Review owner transaction in wallet',exact:true}).click();const review=page.getByRole('dialog',{name:'Review owner transaction',exact:true});await expect(review).toContainText('0.000001 NEAR');await expect(review).toContainText('Adds storage reserve');expect(f.dispatches).toBe(0);expect(await page.evaluate(()=>(window as any).meteorFixture.signs)).toBe(0);await review.getByRole('button',{name:'Cancel review',exact:true}).click();
});
test('a payment-only capability cannot enable owner signing or open Meteor',async({page})=>{
 const f=await fixture(page);await page.route('**/api/live/config',route=>route.fulfill({json:{network:'testnet',organization:'studio',contract:'vault.owner.testnet',worker:'worker.testnet',publicKey:'worker-fixture',configured:true,transactionsEnabled:false,ownerTransactionsEnabled:false,paymentExecutionEnabled:true}}));await page.goto('/');await navigateOwner(page,'Vault');await expect(page.getByRole('button',{name:'Review owner transaction in wallet',exact:true})).toBeDisabled();expect(f.reserves).toBe(0);expect(f.dispatches).toBe(0);expect(await page.evaluate(()=>(window as any).meteorFixture.signs)).toBe(0);
});
test('missing dispatch acknowledgement cannot open the wallet transaction interface',async({page})=>{
 const f=await fixture(page,'missing');await page.goto('/');await navigateOwner(page,'Vault');await page.getByRole('button',{name:'Review owner transaction in wallet',exact:true}).click();await page.getByRole('button',{name:'Continue to Meteor',exact:true}).click();await expect(page.getByRole('alert',{name:'Testnet error'})).toContainText('not confirmed');expect(f.dispatches).toBe(1);expect(await page.evaluate(()=>(window as any).meteorFixture.signs)).toBe(0);
});

test('bounded operational limit review displays the limit rather than its attached one-yocto deposit',async({page})=>{
 const f=await fixture(page);await page.route('**/api/live/config',route=>route.fulfill({json:{network:'testnet',organization:'studio',contract:'vault.owner.testnet',configured:true,transactionsEnabled:true,ownerTransactionsEnabled:true,paymentExecutionEnabled:false,ownerTransactionRestriction:{id:'scope-limit',owner:f.snapshot.vault.owner,method:'set_budget',args:{budget:'2000000000000000000000'},deposit:'1',gas:'100000000000000',operational:true}}}));await page.goto('/');await navigateOwner(page,'Vault');await expect(page.getByLabel('Amount (NEAR)',{exact:true})).toHaveValue('0.002');await page.getByRole('button',{name:'Review owner transaction in wallet',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Review owner transaction',exact:true});await expect(dialog).toContainText('0.002 NEAR');expect(f.dispatches).toBe(0);await dialog.getByRole('button',{name:'Cancel review'}).click();
});
test('reviewed security update uses a separate 250-Tgas zero-deposit review without starting payments',async({page})=>{
 const f=await fixture(page);await page.route('**/api/live/config',route=>route.fulfill({json:{network:'testnet',organization:'studio',contract:'vault.owner.testnet',configured:true,transactionsEnabled:true,ownerTransactionsEnabled:true,paymentExecutionEnabled:false,ownerTransactionRestriction:{id:'scope-checkpoint',owner:f.snapshot.vault.owner,method:'advance_repair_head',args:{update:{header:{inner_lite:{height:'51'}}}},deposit:'0',gas:'250000000000000',operational:true}}}));await page.goto('/');await navigateOwner(page,'Recovery');await page.getByText('Check unresolved payments',{exact:true}).click();await page.getByRole('button',{name:'Review security update in wallet'}).click();const dialog=page.getByRole('dialog',{name:'Review owner transaction',exact:true});await expect(dialog).toContainText('0 NEAR');await expect(dialog).toContainText('250000000000000');await expect(dialog).toContainText('existing trust root');expect(f.dispatches).toBe(0);expect(await page.evaluate(()=>(window as any).meteorFixture.signs)).toBe(0);await dialog.getByRole('button',{name:'Cancel review'}).click();
});
test('a manually recovered Meteor transaction ID is reported as evidence without replacing the original or signing again',async({page})=>{
 const f=await fixture(page,'manual-reference');await page.goto('/');await navigateOwner(page,'Vault');await page.getByRole('button',{name:'Review owner transaction in wallet',exact:true}).click();await page.getByRole('button',{name:'Continue to Meteor',exact:true}).click();await expect(page.getByRole('alert',{name:'Testnet error'})).toContainText('not confirmed');await page.getByLabel('Existing wallet transaction hash').fill('2'.repeat(44));await page.getByRole('button',{name:'Check transaction status',exact:true}).click();await expect(page.getByText('Owner transaction: Confirmed',{exact:true})).toBeVisible();expect(f.reserves).toBe(1);expect(f.dispatches).toBe(1);expect(await page.evaluate(()=>(window as any).meteorFixture.signs)).toBe(1);
});

test('persisted conflicting owner evidence survives refresh and blocks replacement signing',async({page})=>{
 const f=await fixture(page,'unknown');const expected='1'.repeat(44),reported=['2'.repeat(44),'3'.repeat(44)];let reserves=0,checks=0;
 await page.route('**/api/live/owner-attempt',async route=>{
  const body=route.request().method()==='POST'?route.request().postDataJSON():null;
  if(body?.action==='reserve'){reserves++;return route.fulfill({status:409,json:{error:'This acceptance was already submitted.'}});}
  checks++;return route.fulfill({json:{id:'held-conflicting-attempt',hash:expected,state:'manual_review',manualReviewRequired:true,reportedHashes:reported,reportedHash:reported[0]}});
 });
 await page.goto('/');await navigateOwner(page,'Vault');await page.getByRole('button',{name:'Check transaction status',exact:true}).click();
 await expect(page.getByText('Owner transaction: Manual review required; do not sign a replacement',{exact:true})).toBeVisible();
 await expect(page.getByRole('alert',{name:'Testnet error'})).toContainText('manual review');
 await page.getByText('Transaction ID',{exact:true}).click();for(const hash of [expected,...reported])await expect(page.getByText(hash,{exact:true})).toBeVisible();
 await page.reload();await navigateOwner(page,'Vault');await page.getByRole('button',{name:'Check transaction status',exact:true}).click();
 await expect(page.getByRole('alert',{name:'Testnet error'})).toContainText('manual review');
 await page.getByRole('button',{name:'Review owner transaction in wallet',exact:true}).click();
 await expect(page.getByRole('alert',{name:'Testnet error'})).toContainText('one-use acceptance was already submitted');
 await expect(page.getByText('Owner transaction: Manual review required; do not sign a replacement',{exact:true})).toBeVisible();
 expect(reserves).toBe(1);expect(f.dispatches).toBe(0);expect(checks).toBeGreaterThan(1);expect(await page.evaluate(()=>(window as any).meteorFixture.signs)).toBe(0);
});
