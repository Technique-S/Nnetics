import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {KeyPair,Transaction,baseEncode} from 'near-api-js';
import {createHash} from 'node:crypto';
import {ownerAttempt} from '../src/server/owner-attempt.ts';
import type {OrganizationService} from '../src/server/organization-api.ts';
import {requestMeteorOwnerTransaction,type MeteorExtension} from '../src/data/meteor-message.ts';
import {validateOwnerCall} from '../src/data/owner-transaction.ts';
import {configureOwnerScope} from './fixtures/owner-scope.ts';
function fixture(){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-owner-wallet-')),file=path.join(directory,'queue.db');let db=new DatabaseSync(file);
 const scope=configureOwnerScope(directory),publicKey=KeyPair.fromRandom('ed25519').getPublicKey().toString();
 let final=false,wrong=false,failure=false,nonce=12,prepared:any;
 const s={referenceEvidenceReader:{collect:async()=>{throw Error('Fixture has no authenticated reference evidence');}},get queue(){return {db};},auth:{authorize:async()=>({access:{organization:'org',accountId:'owner.testnet'},block:{hash:'1'.repeat(32),protocolVersion:88,timestamp:'100000000000000'}}),verify:()=>({public_key:publicKey})},chain:{config:{network:'testnet',organization:'org',contract:'vault.testnet',codeHash:'1'.repeat(32)},view:async()=>({head:{inner_lite:{timestamp:'1'}}}),rpc:async(method:string,params:any)=>{
  if(method==='gas_price')return {gas_price:'100000000'};
  if(method==='query')return params.request_type==='view_account'?{amount:'20000000000000000000000000',locked:'0',storage_usage:100}:{nonce};
  if(!final)throw new TypeError('lost response');
  return {final_execution_status:'FINAL',transaction:{hash:prepared.hash,signer_id:'owner.testnet',receiver_id:wrong?'wrong.testnet':'vault.testnet',public_key:publicKey,nonce:13,actions:[{FunctionCall:{method_name:prepared.method,deposit:prepared.deposit,gas:prepared.gas,args:Buffer.from(JSON.stringify(prepared.args)).toString('base64')}}]},status:failure?{Failure:{error:'contract fixture rejection'}}:{SuccessValue:''}};
 }}} as unknown as OrganizationService;
 return {s,scope,databaseFile:file,get db(){return db;},prepare:async()=>prepared=await ownerAttempt(s,'session',{action:'reserve',transport:'meteor',method:'fund_storage',args:{},deposit:'1000000000000000000'}),restart:()=>{db.close();db=new DatabaseSync(file);},setFinal:()=>final=true,setFailure:()=>failure=true,setWrong:(value:boolean)=>wrong=value,setNonce:(value:number)=>nonce=value,close:()=>{scope.close();db.close();fs.rmSync(directory,{recursive:true,force:true});}};
}
test('Meteor preparation pins exact bytes, funding, signer, gas and target before dispatch; simultaneous reserve is excluded',async()=>{
 const f=fixture();try{
  const settled=await Promise.allSettled([f.prepare(),f.prepare()]);assert.equal(settled.filter(r=>r.status==='fulfilled').length,1);
  const p=(settled.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<any>).value,tx=Transaction.decode(Buffer.from(p.unsigned,'base64'));
  assert.equal(p.state,'prepared');assert.equal(tx.signerId,'owner.testnet');assert.equal(tx.receiverId,'vault.testnet');assert.equal(tx.actions.length,1);assert.equal(tx.actions[0].functionCall!.methodName,'fund_storage');assert.equal(tx.actions[0].functionCall!.deposit,1000000000000000000n);assert.equal(String(tx.actions[0].functionCall!.gas),p.gas);assert.equal(p.hash,baseEncode(createHash('sha256').update(tx.encode()).digest()));assert.equal(p.maxFee,'20400000000000000000000');
  await ownerAttempt(f.s,'session',{action:'rejected',id:p.id});assert.equal(await ownerAttempt(f.s,'session'),null);
 }finally{f.close();}
});
test('Meteor timeout/restart retains hash; rejection after dispatch and repeated reserve cannot release exclusion; only exact final evidence resolves',async()=>{
 const f=fixture();try{const p=await f.prepare();await ownerAttempt(f.s,'session',{action:'dispatch',id:p.id});f.restart();
  await assert.rejects(ownerAttempt(f.s,'session'),/lost response/);
  await assert.rejects(ownerAttempt(f.s,'session',{action:'rejected',id:p.id}),/Reconcile/);
  await assert.rejects(f.prepare(),/already submitted/);
  const row=JSON.parse((f.db.prepare('SELECT payload FROM owner_wallet_attempts').get() as {payload:string}).payload);assert.equal(row.id,p.id);assert.equal(row.hash,p.hash);
  f.setFinal();f.setWrong(true);await assert.rejects(ownerAttempt(f.s,'session'),/differs/);f.setWrong(false);
  assert.equal((await ownerAttempt(f.s,'session')).state,'confirmed');assert.equal(await ownerAttempt(f.s,'session'),null);assert.equal((f.db.prepare('SELECT count(*) n FROM owner_wallet_history').get() as {n:number}).n,1);
  f.restart();f.scope.plan.note='changed metadata';f.scope.save();await assert.rejects(f.prepare(),/already submitted/);
 }finally{f.close();}
});
test('expired reviews, changed nonces and out-of-scope activation block wallet dispatch',async()=>{
 const f=fixture();try{const p=await f.prepare();f.setNonce(13);await assert.rejects(ownerAttempt(f.s,'session',{action:'dispatch',id:p.id}),/nonce changed/);f.setNonce(12);
  f.db.prepare('UPDATE owner_wallet_attempts SET payload=?').run(JSON.stringify({...p,expires:0}));await assert.rejects(ownerAttempt(f.s,'session',{action:'dispatch',id:p.id}),/expired/);
  await ownerAttempt(f.s,'session',{action:'rejected',id:p.id});
  await assert.rejects(ownerAttempt(f.s,'session',{action:'reserve',transport:'meteor',method:'set_paused',args:{paused:false},deposit:'1'}),/acceptance scope/);
 }finally{f.close();}
});
test('a different wallet-reported hash is retained without replacing the original or releasing exclusion',async()=>{
 const f=fixture();try{const p=await f.prepare();await ownerAttempt(f.s,'session',{action:'dispatch',id:p.id});
  const reported='2'.repeat(44);await ownerAttempt(f.s,'session',{action:'reported',id:p.id,hash:reported});f.restart();f.setFinal();
  const held=await ownerAttempt(f.s,'session');assert.equal(held.hash,p.hash);assert.equal(held.reportedHash,reported);assert.equal(held.state,'manual_review');
  await assert.rejects(f.prepare(),/already submitted/);
 }finally{f.close();}
});
test('owner transaction schema excludes payments, keys, changed deposits and extra arguments',()=>{
 for(const [method,args,deposit] of [['execute_payment',{},'0'],['add_key',{},'1'],['set_budget',{budget:'10'},'0'],['deposit',{recipient:'attacker.testnet'},'10']] as const)assert.throws(()=>validateOwnerCall(method,args,deposit));
 validateOwnerCall('set_budget',{budget:'100'},'1');validateOwnerCall('reconcile_payment',{attempt_id:'1'},'0');
});
test('server dispatch rejects altered unsigned actions, accounts, arguments, deposits and gas before consuming acceptance',async()=>{
 const mutations=[(tx:any)=>tx.actions.push(tx.actions[0]),(tx:any)=>tx.signerId='other.testnet',(tx:any)=>tx.receiverId='other.testnet',(tx:any)=>tx.actions[0].functionCall.gas=200000000000000n,(tx:any)=>tx.actions[0].functionCall.deposit=1n,(tx:any)=>tx.actions[0].functionCall.args=Buffer.from('{"extra":true}'),(tx:any)=>tx.actions[0].functionCall.methodName='deposit'];
 for(const mutate of mutations){const f=fixture();try{const p=await f.prepare(),tx=Transaction.decode(Buffer.from(p.unsigned,'base64'));mutate(tx);const bytes=Buffer.from(tx.encode());f.db.prepare('UPDATE owner_wallet_attempts SET payload=?').run(JSON.stringify({...p,unsigned:bytes.toString('base64'),hash:baseEncode(createHash('sha256').update(bytes).digest())}));await assert.rejects(ownerAttempt(f.s,'session',{action:'dispatch',id:p.id}),/acceptance scope/);assert.equal((f.db.prepare('SELECT count(*) n FROM owner_acceptance_uses').get() as {n:number}).n,0);}finally{f.close();}}
});
test('a final contract failure is reconcilable with owner signing disabled but does not authorize a replacement',async()=>{
 const f=fixture();try{const p=await f.prepare();await ownerAttempt(f.s,'session',{action:'dispatch',id:p.id});process.env.NNETICS_OWNER_TRANSACTIONS_AUTHORIZED='';f.setFinal();f.setFailure();assert.equal((await ownerAttempt(f.s,'session')).state,'failed');assert.equal((f.db.prepare('SELECT state FROM owner_acceptance_uses').get() as {state:string}).state,'failed');process.env.NNETICS_OWNER_TRANSACTIONS_AUTHORIZED='testnet-reviewed';f.restart();await assert.rejects(f.prepare(),/already submitted/);}finally{f.close();}
});
test('disabling owner signing during preflight blocks dispatch without consuming the acceptance',async()=>{
 const f=fixture();try{const p=await f.prepare(),original=f.s.chain.rpc.bind(f.s.chain);f.s.chain.rpc=async<T>(method:string,params:unknown)=>{const result=await original<T>(method,params);if(method==='gas_price')process.env.NNETICS_OWNER_TRANSACTIONS_AUTHORIZED='';return result;};await assert.rejects(ownerAttempt(f.s,'session',{action:'dispatch',id:p.id}),/disabled/);assert.equal((f.db.prepare('SELECT count(*) n FROM owner_acceptance_uses').get() as {n:number}).n,0);assert.equal((await ownerAttempt(f.s,'session')).state,'prepared');}finally{f.close();}
});
test('a cancelled or missing durable attempt never authorizes dispatch',async()=>{
 const f=fixture();try{const p=await f.prepare();await ownerAttempt(f.s,'session',{action:'rejected',id:p.id});await assert.rejects(ownerAttempt(f.s,'session',{action:'dispatch',id:p.id}),/No recorded/);await assert.rejects(ownerAttempt(f.s,'session',{action:'sign'}),/Unsupported/);assert.equal((f.db.prepare('SELECT count(*) n FROM owner_acceptance_uses').get() as {n:number}).n,0);}finally{f.close();}
});
test('Meteor sign-and-send handles approval, malformed/mismatched responses, rejection and timeout without a second request identity',async()=>{
 let listener:(value:unknown)=>void=()=>{},uid='';const ids=new Set<string>();let mode='success';
 const extension:MeteorExtension={addMessageDataListener:fn=>listener=fn,sendMessageData:(value:any)=>{ids.add(value.uid);uid=value.uid;if(value.status!=='initializing')return;queueMicrotask(()=>listener({uid,status:mode==='success'?'closed_success':mode==='reject'?'closed_fail':'connected',network:'testnet',actionType:'sign',payload:{executionOutcomes:[{transaction:{hash:'1'.repeat(44)}}]}}));}};
 assert.equal(await requestMeteorOwnerTransaction(extension,'AA==',100),'1'.repeat(44));assert.equal(ids.size,1);
 mode='reject';await assert.rejects(requestMeteorOwnerTransaction(extension,'AA==',100),/outcome is unknown/);
 mode='timeout';await assert.rejects(requestMeteorOwnerTransaction(extension,'AA==',5),/timed out/);
 const pending=requestMeteorOwnerTransaction(extension,'AA==',100);listener({uid,status:'closed_success',network:'mainnet'});await assert.rejects(pending,/Unexpected wallet response/);
});

// Separate SQLite connections and explicit RPC barriers reproduce the actual race;
// timing and sleeps cannot determine these orderings.
for(const ordering of ['during RPC','after finalization'] as const)test(`conflicting wallet evidence ${ordering} survives finalization, multiple reports and restart`,async()=>{
 const f=fixture();let other:DatabaseSync|undefined;
 try{
  const p=await f.prepare();await ownerAttempt(f.s,'session',{action:'dispatch',id:p.id});f.setFinal();
  other=new DatabaseSync(f.databaseFile);
  const peer={...f.s,queue:{db:other}} as OrganizationService;
  const original=f.s.chain.rpc.bind(f.s.chain);
  let entered!:()=>void,release!:()=>void,arrivals=0;
  const started=new Promise<void>(resolve=>entered=resolve),held=new Promise<void>(resolve=>release=resolve);
  f.s.chain.rpc=async<T>(method:string,params:unknown)=>{if(method==='tx'){if(++arrivals===(ordering==='during RPC'?2:1))entered();await held;}return original<T>(method,params);};
  const pending=ownerAttempt(f.s,'session'),concurrent=ordering==='during RPC'?ownerAttempt(peer,'session'):null;await started;
  const conflicting='2'.repeat(44),another='3'.repeat(44);
  if(ordering==='after finalization'){release();assert.equal((await pending).state,'confirmed');}
  await ownerAttempt(peer,'session',{action:'reported',id:p.id,hash:conflicting});
  await ownerAttempt(peer,'session',{action:'reported',id:p.id,hash:another});
  await ownerAttempt(peer,'session',{action:'reported',id:p.id,hash:conflicting});
  if(ordering==='during RPC'){release();for(const result of await Promise.all([pending,concurrent!]))assert.equal(result.state,'manual_review');}
  other.close();other=undefined;f.restart();
  const result=await ownerAttempt(f.s,'session');assert.equal(result.hash,p.hash);assert.deepEqual(result.reportedHashes,[conflicting,another]);assert.equal(result.state,'manual_review');assert.equal(result.manualReviewRequired,true);
  if(ordering==='after finalization')assert.equal(result.expectedTransactionState,'confirmed');
  const history=JSON.parse((f.db.prepare('SELECT payload FROM owner_wallet_history').get() as {payload:string}).payload);
  assert.deepEqual(history.reportedHashes,result.reportedHashes);assert.equal(history.hash,p.hash);assert.equal(history.state,'manual_review');
  assert.equal((f.db.prepare('SELECT count(*) n FROM owner_wallet_history').get() as {n:number}).n,1);
  assert.equal((f.db.prepare('SELECT state FROM owner_acceptance_uses').get() as {state:string}).state,'manual_review');
  await assert.rejects(f.prepare(),/already submitted/);await assert.rejects(ownerAttempt(f.s,'session',{action:'rejected',id:p.id}),/Reconcile/);
  const unauthorized={...f.s,auth:{...f.s.auth,authorize:async()=>({access:{organization:'other-org',accountId:'other.testnet'},block:{hash:'1'.repeat(32)}})}} as unknown as OrganizationService;
  await assert.rejects(ownerAttempt(unauthorized,'session',{action:'reported',id:p.id,hash:'4'.repeat(44)}),/Invalid wallet-reported/);
 }finally{other?.close();f.close();}
});
test('concurrent successful reconciliations retain one history and consumed authorization',async()=>{
 const f=fixture();try{
  const p=await f.prepare();await ownerAttempt(f.s,'session',{action:'dispatch',id:p.id});f.setFinal();
  const original=f.s.chain.rpc.bind(f.s.chain);let release!:()=>void,entered!:()=>void,count=0;
  const held=new Promise<void>(resolve=>release=resolve),started=new Promise<void>(resolve=>entered=resolve);
  f.s.chain.rpc=async<T>(method:string,params:unknown)=>{if(method==='tx'){if(++count===2)entered();await held;}return original<T>(method,params);};
  const a=ownerAttempt(f.s,'session'),b=ownerAttempt(f.s,'session');await started;release();
  assert.deepEqual((await Promise.all([a,b])).map(r=>r.state),['confirmed','confirmed']);
  assert.equal(await ownerAttempt(f.s,'session'),null);assert.equal((f.db.prepare('SELECT count(*) n FROM owner_wallet_history').get() as {n:number}).n,1);
  f.restart();await assert.rejects(f.prepare(),/already submitted/);
 }finally{f.close();}
});

test('failed durable finalization rolls history and deletion back together',async()=>{
 const f=fixture();try{
  const p=await f.prepare();await ownerAttempt(f.s,'session',{action:'dispatch',id:p.id});f.setFinal();
  f.db.exec("CREATE TRIGGER reject_finalization BEFORE UPDATE ON owner_acceptance_uses BEGIN SELECT RAISE(ABORT, 'fixture storage failure'); END;");
  await assert.rejects(ownerAttempt(f.s,'session'),/fixture storage failure/);
  assert.equal((f.db.prepare('SELECT count(*) n FROM owner_wallet_history').get() as {n:number}).n,0);
  const active=JSON.parse((f.db.prepare('SELECT payload FROM owner_wallet_attempts').get() as {payload:string}).payload);
  assert.equal(active.id,p.id);assert.equal(active.hash,p.hash);assert.equal(active.state,'unknown');
  assert.equal((f.db.prepare('SELECT state FROM owner_acceptance_uses').get() as {state:string}).state,'dispatched');
  f.db.exec('DROP TRIGGER reject_finalization');
  assert.equal((await ownerAttempt(f.s,'session')).state,'confirmed');
  await assert.rejects(f.prepare(),/already submitted/);
 }finally{f.close();}
});
