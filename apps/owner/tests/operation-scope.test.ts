import {test} from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';import {KeyPair} from 'near-api-js';
import {operationScope,assertOperationalNetwork} from '../src/server/operation-scope.ts';import {ownerAttempt} from '../src/server/owner-attempt.ts';import {transactionCapabilities,assertOwnerScopeInput} from '../src/server/transaction-gates.ts';import type {OrganizationService} from '../src/server/organization-api.ts';
const v2=JSON.parse(fs.readFileSync(new URL('../../../docs/METEOR_OWNER_ACCEPTANCE_PLAN_V2.json',import.meta.url),'utf8'));
const record=JSON.parse(fs.readFileSync(new URL('../../../docs/METEOR_HISTORICAL_ACCEPTANCE_V3.json',import.meta.url),'utf8'));
import {Queue} from '../src/server/queue.ts';
const fixturePublicKey=KeyPair.fromRandom('ed25519').getPublicKey().toString();
const plan=()=>({ownerPublicKey:fixturePublicKey,version:4,status:'ready-for-review',scopePolicy:'bounded-owner-operations-v1',approvalId:'fixture-operations-1',network:'testnet',owner:v2.owner,organization:v2.organization,contract:v2.contract,expectedCodeHash:v2.expectedCodeHash,reviewValidityMs:180000,validUntil:Date.now()+3600000,referencePolicySha256:record.policyFileSha256,preservedHistoricalRecordSha256:'8e64a71240fc3292f01ae8ed3782e2c3343e34a21bd3c5e0e7b9c3cf355fcdfc',maximumOwnerAllowanceYoctoNEAR:'45000000000000000000001',operations:[{id:'fund',actions:[{type:'FunctionCall',method:'deposit',args:{},depositYoctoNEAR:'1000000000000000000000',gas:'100000000000000'}],maxFeeYoctoNEAR:'22000000000000000000000'},{id:'limit',actions:[{type:'FunctionCall',method:'set_budget',args:{budget:'2000000000000000000000'},depositYoctoNEAR:'1',gas:'100000000000000'}],maxFeeYoctoNEAR:'22000000000000000000000'}]});
for(const method of ['set_paused','revoke_agent'])test(`finalized failed ${method} permits remaining cleanup without rearming payout`,async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cleanup-scope-')),file=path.join(dir,'plan.json'),queue=new Queue(path.join(dir,'queue.db'));
 const op=(id:string,method:string,args:object,replaces?:string)=>({id,replaces,actions:[{type:'FunctionCall',method,args,depositYoctoNEAR:'1',gas:'100000000000000'}],maxFeeYoctoNEAR:'22000000000000000000000'});
 const pause=op('cleanup-pause','set_paused',{paused:true}),revoke=op('cleanup-revoke','revoke_agent',{});
 const failed=method==='set_paused'?pause:revoke, remaining=failed===pause?revoke:pause;
 const replacement=op('cleanup-replacement',method,failed.actions[0].args,failed.id);
 const base=plan(),p={...base,version:5,cleanupRecovery:'finalized-failure-v1',cleanupValidUntil:base.validUntil+60000,operations:[...base.operations,failed,remaining,replacement],maximumOwnerAllowanceYoctoNEAR:'111000000000000000000004'};
 const bytes=JSON.stringify(p),hash=createHash('sha256').update(bytes).digest('hex');fs.writeFileSync(file,bytes);
 const original=operationScope(p,hash,failed.id);
 const env={NNETICS_OWNER_TRANSACTIONS_AUTHORIZED:'testnet-reviewed',NNETICS_OWNER_TRANSACTION_PLAN:file,NNETICS_OWNER_TRANSACTION_PLAN_SHA256:hash,NNETICS_OWNER_TRANSACTION_STEP:remaining.id};
 const saved=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));
 const worker={account_id:'worker.testnet',public_key:p.ownerPublicKey};let paused=false,agent:typeof worker|null=worker;
 const service={queue,auth:{authorize:async()=>({access:{organization:p.organization,accountId:p.owner},block:{hash:'1'.repeat(32),protocolVersion:88}}),verify:()=>({public_key:p.ownerPublicKey})},
  chain:{config:{network:p.network,organization:p.organization,contract:p.contract,codeHash:p.expectedCodeHash,worker:worker.account_id,publicKey:worker.public_key},
   view:async()=>({owner:p.owner,paused,agent}),rpc:async(m:string,params:any)=>m==='status'?{chain_id:'testnet',genesis_hash:'FWJ9kR6KFWoyMoNjpLXXGHeuiy7tEY6GmoFeCA5yuc6b',protocol_version:88,sync_info:{syncing:false}}:m==='gas_price'?{gas_price:'100000000'}:params.request_type==='view_account'?{amount:'50000000000000000000000000',storage_usage:100}:{nonce:12}}} as unknown as OrganizationService;
 const reserve=(step:typeof pause)=>ownerAttempt(service,'fixture',{action:'reserve',transport:'meteor',method:step.actions[0].method,args:step.actions[0].args,deposit:'1'});
 try{
  Object.assign(process.env,env);
  queue.db.exec('CREATE TABLE owner_wallet_attempts(scope TEXT PRIMARY KEY,payload TEXT);CREATE TABLE owner_acceptance_uses(scope TEXT PRIMARY KEY,attempt TEXT,state TEXT,payload TEXT)');
  const active={id:'original',state:'unknown',owner:p.owner,organization:p.organization,contract:p.contract};
  queue.db.prepare('INSERT INTO owner_wallet_attempts VALUES (?,?)').run(p.organization+':'+p.owner+':'+original.id,JSON.stringify(active));
  queue.db.prepare('INSERT INTO metadata VALUES (?,?)').run('cleanup:'+hash,active.id);
  await assert.rejects(reserve(remaining),/unresolved/);
  queue.db.prepare('DELETE FROM owner_wallet_attempts').run();
  queue.db.prepare('INSERT INTO owner_acceptance_uses VALUES (?,?,?,?)').run(original.id,active.id,'failed',JSON.stringify({...active,planHash:hash,referenceAssessment:{verdict:'finalized_cleanup_failure'}}));
  const review=await reserve(remaining);
  await ownerAttempt(service,'fixture',{action:'rejected',id:review.id});
  process.env.NNETICS_OWNER_TRANSACTION_STEP=failed.id;
  await assert.rejects(reserve(failed),/already submitted/);
  process.env.NNETICS_OWNER_TRANSACTION_STEP=replacement.id;
  if(failed===pause)paused=true;else agent=null;
  await assert.rejects(reserve(replacement),/already confirmed/);
  paused=false;agent=worker;
  const retry=await reserve(replacement);assert.notEqual(retry.scopeId,original.id);
  await ownerAttempt(service,'fixture',{action:'rejected',id:retry.id});
  assert.throws(()=>queue.assertPaymentWindow(hash),/permanently closed/);
  assert.throws(()=>operationScope({...p,operations:[...base.operations,failed,remaining,{...replacement,replaces:undefined}]},hash,replacement.id));
 }finally{queue.close();for(const [key,value] of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}fs.rmSync(dir,{recursive:true});}
});
test('bounded operational scopes bind the exact action, amounts, deadlines and distinct one-use identities',()=>{
 const p=plan(),a=operationScope(p,'a'.repeat(64),'fund'),b=operationScope(p,'a'.repeat(64),'limit');assert.notEqual(a.id,b.id);assert.equal(a.deposit,'1000000000000000000000');assert.doesNotThrow(()=>assertOwnerScopeInput(a,{action:'reserve',transport:'meteor',method:'deposit',args:{},deposit:a.deposit}));assert.throws(()=>assertOwnerScopeInput(a,{action:'reserve',transport:'meteor',method:'deposit',args:{},deposit:'1'}));
 const editorial=structuredClone(p);(editorial.operations[0] as any).note='Only a display note';assert.equal(operationScope(editorial,'b'.repeat(64),'fund').id,a.id);
 const network={chain_id:'testnet',genesis_hash:'FWJ9kR6KFWoyMoNjpLXXGHeuiy7tEY6GmoFeCA5yuc6b',protocol_version:88,sync_info:{syncing:false}};assert.doesNotThrow(()=>assertOperationalNetwork(network));for(const change of [{chain_id:'mainnet'},{genesis_hash:'wrong'},{protocol_version:89},{sync_info:{syncing:true}}])assert.throws(()=>assertOperationalNetwork({...network,...change}));
 for(const change of [(p:any)=>p.validUntil=0,(p:any)=>p.maximumOwnerAllowanceYoctoNEAR='1',(p:any)=>p.operations[0].actions.push(p.operations[0].actions[0]),(p:any)=>p.operations[0].actions[0].method='execute_payment',(p:any)=>p.operations[0].actions[0].gas='250000000000000',(p:any)=>p.preservedHistoricalRecordSha256='0'.repeat(64)]){const altered=structuredClone(p);change(altered);assert.throws(()=>operationScope(altered,'a'.repeat(64),'fund'));}
});
test('new reviewed operational scope preserves historical hold, consumes its own authorization and blocks parallel/replacement actions',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-operational-')),file=path.join(dir,'plan.json'),p=plan(),bytes=JSON.stringify(p);fs.writeFileSync(file,bytes);
 const names=['NNETICS_OWNER_TRANSACTIONS_AUTHORIZED','NNETICS_OWNER_TRANSACTION_PLAN','NNETICS_OWNER_TRANSACTION_PLAN_SHA256','NNETICS_OWNER_TRANSACTION_STEP','NNETICS_PAYMENT_EXECUTION_AUTHORIZED'],saved=names.map(n=>process.env[n]);
 const db=new DatabaseSync(':memory:');const publicKey=p.ownerPublicKey;
 const s={queue:{db},referenceEvidenceReader:{collect:async()=>{throw Error('Fixture unknown evidence');}},auth:{authorize:async()=>({access:{organization:p.organization,accountId:p.owner},block:{hash:'1'.repeat(32),protocolVersion:88,timestamp:'100000000000000'}}),verify:()=>({public_key:publicKey})},chain:{config:{network:'testnet',organization:p.organization,contract:p.contract,codeHash:p.expectedCodeHash},rpc:async(method:string,params:any)=>method==='status'?{chain_id:'testnet',genesis_hash:'FWJ9kR6KFWoyMoNjpLXXGHeuiy7tEY6GmoFeCA5yuc6b',protocol_version:88,sync_info:{syncing:false}}:method==='gas_price'?{gas_price:'100000000'}:params.request_type==='view_account'?{amount:'50000000000000000000000000',storage_usage:100}:{nonce:12}}} as unknown as OrganizationService;
 const historical={id:record.attempt,hash:record.preparedTransaction,reportedHashes:[record.transaction],reportedHash:record.transaction,state:'manual_review',manualReviewRequired:true,owner:p.owner,organization:p.organization,contract:p.contract,created:1};
 db.exec('CREATE TABLE metadata(id TEXT PRIMARY KEY,value TEXT);CREATE TABLE owner_wallet_attempts(scope TEXT PRIMARY KEY,payload TEXT)');db.prepare('INSERT INTO owner_wallet_attempts VALUES (?,?)').run(p.organization+':'+p.owner,JSON.stringify(historical));
 try{
  Object.assign(process.env,{NNETICS_OWNER_TRANSACTIONS_AUTHORIZED:'testnet-reviewed',NNETICS_OWNER_TRANSACTION_PLAN:file,NNETICS_OWNER_TRANSACTION_PLAN_SHA256:createHash('sha256').update(bytes).digest('hex'),NNETICS_OWNER_TRANSACTION_STEP:'fund',NNETICS_PAYMENT_EXECUTION_AUTHORIZED:''});assert.equal(transactionCapabilities().ownerTransactionsEnabled,true);assert.equal(transactionCapabilities().paymentExecutionEnabled,false);
  const a=await ownerAttempt(s,'fixture',{action:'reserve',transport:'meteor',method:'deposit',args:{},deposit:p.operations[0].actions[0].depositYoctoNEAR});assert.equal((db.prepare('SELECT count(*) n FROM owner_wallet_attempts').get() as any).n,2);
  await ownerAttempt(s,'fixture',{action:'dispatch',id:a.id});process.env.NNETICS_OWNER_TRANSACTIONS_AUTHORIZED='';assert.equal((await ownerAttempt(s,'fixture')).state,'unknown');
  assert.deepEqual(JSON.parse((db.prepare('SELECT payload FROM owner_wallet_attempts WHERE scope=?').get(p.organization+':'+p.owner) as any).payload),historical);
  process.env.NNETICS_OWNER_TRANSACTIONS_AUTHORIZED='testnet-reviewed';await assert.rejects(ownerAttempt(s,'fixture',{action:'reserve',transport:'meteor',method:'deposit',args:{},deposit:a.deposit}),/already submitted/);
  process.env.NNETICS_OWNER_TRANSACTION_STEP='limit';await assert.rejects(ownerAttempt(s,'fixture',{action:'reserve',transport:'meteor',method:'set_budget',args:{budget:'2000000000000000000000'},deposit:'1'}),/unresolved/);
  // Construct a completed fixture to test a late report arriving while the NEXT
  // scope is prepared. This is not a substitute for the verifier's success tests.
  const completed={...a,state:'confirmed',dispatched:1};db.prepare('INSERT INTO owner_wallet_history VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(a.id,JSON.stringify(completed));db.prepare('DELETE FROM owner_wallet_attempts WHERE scope=?').run(a.storageScope);db.prepare("UPDATE owner_acceptance_uses SET state='confirmed',payload=? WHERE attempt=?").run(JSON.stringify(completed),a.id);
  const next=await ownerAttempt(s,'fixture',{action:'reserve',transport:'meteor',method:'set_budget',args:{budget:'2000000000000000000000'},deposit:'1'});
  const held=await ownerAttempt(s,'fixture',{action:'reported',id:a.id,hash:'2'.repeat(44)});assert.equal(held.state,'manual_review');assert.equal(held.hash,a.hash);
  await assert.rejects(ownerAttempt(s,'fixture',{action:'dispatch',id:next.id}),/unresolved/);assert.equal((db.prepare('SELECT count(*) n FROM owner_acceptance_uses WHERE attempt=?').get(next.id) as any).n,0);assert.equal(JSON.parse((db.prepare('SELECT payload FROM owner_wallet_attempts WHERE scope=?').get(next.storageScope) as any).payload).state,'prepared');
 }finally{db.close();names.forEach((n,i)=>{if(saved[i]===undefined)delete process.env[n];else process.env[n]=saved[i];});fs.rmSync(dir,{recursive:true});}
});
