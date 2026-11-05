import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';import {createTransaction,PublicKey,baseEncode,baseDecode,actions} from 'near-api-js';
import {ReferenceEvidenceReader,evaluateReferenceRefresh,assessDurableReferenceRefresh,intentFingerprint,REFERENCE_BOUNDS,TESTNET_GENESIS,type ReferenceIntent,type ReferencePolicy} from '../src/server/reference-block-policy.ts';
import {ownerTransactionGate,transactionCapabilities} from '../src/server/transaction-gates.ts';import {ownerAttempt} from '../src/server/owner-attempt.ts';import type {OrganizationService} from '../src/server/organization-api.ts';
import {RUNTIME_REFERENCE_POLICY,verifyRuntimeReference} from '../src/server/runtime-reference.ts';
import {Queue} from '../src/server/queue.ts';
const proposal=JSON.parse(fs.readFileSync(new URL('../../../docs/METEOR_REFERENCE_POLICY_V3.json',import.meta.url),'utf8'));
const historical=JSON.parse(fs.readFileSync(new URL('./fixtures/meteor-reference-refresh.json',import.meta.url),'utf8'));
const H=(s:string)=>baseEncode(createHash('sha256').update(s).digest());

for(const [method,args] of [['set_paused',{paused:true}],['revoke_agent',{}]] as const)
test(`cleanup ${method} retains final failure receipts and the payout latch after an unknown response and restart`,async()=>{
 const f=fixture({method,args,deposit:'1',mutate:(v,m)=>{
  if(m!=='EXPERIMENTAL_tx_status')return;
  v.status={Failure:{ActionError:{index:0,kind:{FunctionCallError:{ExecutionError:'fixture failure'}}}}};
  v.receipts_outcome[0].outcome.status=v.status;
 }});
 const a={...f.intent,operational:true,cleanupRecovery:true,planHash:'b'.repeat(64),referencePolicy:RUNTIME_REFERENCE_POLICY,
  state:'unknown',dispatched:1,reportedHash:f.policy.candidateHash,reportedHashes:[f.policy.candidateHash]};
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-cleanup-')),file=path.join(dir,'queue.db');
 let queue=new Queue(file);
 const service={get queue(){return queue;},referenceEvidenceReader:f.reader,auth:{authorize:async()=>({access:{organization:a.organization,accountId:a.owner}})},chain:{config:{contract:a.contract}}} as unknown as OrganizationService;
 try {
  queue.db.exec('CREATE TABLE owner_wallet_attempts(scope TEXT PRIMARY KEY,payload TEXT);CREATE TABLE owner_acceptance_uses(scope TEXT PRIMARY KEY,attempt TEXT,state TEXT,payload TEXT)');
  queue.db.prepare('INSERT INTO owner_wallet_attempts VALUES (?,?)').run(a.organization+':'+a.owner,JSON.stringify(a));
  queue.db.prepare('INSERT INTO owner_acceptance_uses VALUES (?,?,?,?)').run(a.scopeId,a.id,'dispatched',JSON.stringify(a));
  queue.db.prepare('INSERT INTO metadata VALUES (?,?)').run('cleanup:'+a.planHash,a.id);
  const collect=f.reader.collect.bind(f.reader);
  f.reader.collect=async()=>{throw Error('unknown transaction');};
  assert.equal((await ownerAttempt(service,'session')).referenceStatus,'awaiting_evidence');
  assert.throws(()=>queue.assertPaymentWindow(a.planHash),/permanently closed/);
  queue.close();queue=new Queue(file);f.reader.collect=collect;
  const result=await ownerAttempt(service,'session');
  assert.equal(result.state,'failed');
  assert.equal(result.hash,a.hash);
  assert.equal(result.verifiedReferenceHash,f.policy.candidateHash);
  assert.equal(result.referenceAssessment.finalizedTransaction.receipts.length,2);
  assert.deepEqual(result.referenceAssessment.cleanupState,{block:f.headers.get(f.last+1).header.hash,paused:true,agent:null});
  assert.equal(await ownerAttempt(service,'session'),null);
  queue.close();queue=new Queue(file);
  assert.throws(()=>queue.assertPaymentWindow(a.planHash),/permanently closed/);
  assert.deepEqual(queue.db.prepare('SELECT state FROM owner_acceptance_uses').get()?.state,'failed');
  await ownerAttempt(service,'session',{action:'reported',id:a.id,hash:H('late cleanup conflict')});
  assert.equal(queue.db.prepare('SELECT state FROM owner_acceptance_uses').get()?.state,'manual_review');
  assert.throws(()=>queue.assertPaymentWindow(a.planHash),/permanently closed/);
 }finally{queue.close();fs.rmSync(dir,{recursive:true});}
});
type Options={method?:string;args?:Record<string,unknown>;deposit?:string;advance?:number;inclusionBlocks?:number;inclusionMs?:number;receiptBlocks?:number;receiptMs?:number;stepMs?:number;preparedAgeMs?:number;mutate?:(value:any,method:string,params:any,origin:string)=>void};
function fixture(options:Options={}){
 const start=1000,ref=start+(options.advance??153),inc=ref+(options.inclusionBlocks??3),last=inc+(options.receiptBlocks??2),step=BigInt(options.stepMs??500),base=1700000000000000000n;
 const nanos=(h:number):bigint=>{if(h<=ref)return base+BigInt(h-start)*step*1000000n;if(h<=inc)return base+BigInt(ref-start)*step*1000000n+BigInt(options.inclusionMs??(inc-ref)*Number(step))*1000000n*BigInt(h-ref)/BigInt(inc-ref);return nanos(inc)+BigInt(options.receiptMs??(last-inc)*Number(step))*1000000n*BigInt(h-inc)/BigInt(last-inc);};
 const headers=new Map<number,any>();for(let h=start-1;h<=last+1;h++)headers.set(h,{header:{height:h,hash:H('fixture-header-'+h),prev_hash:H('fixture-header-'+(h-1)),timestamp_nanosec:String(nanos(h))}});
 const keys=generateKeyPairSync('ed25519'),publicKey='ed25519:'+baseEncode(new Uint8Array(keys.publicKey.export({format:'der',type:'spki'}).subarray(-32)));
 const method=options.method??'fund_storage',args=options.args??{},deposit=options.deposit??'1000000000000000000';
 const original=createTransaction(proposal.owner,PublicKey.fromString(publicKey),proposal.contract,13n,[actions.functionCall(method,args,100000000000000n,BigInt(deposit))],baseDecode(headers.get(start).header.hash));
 const bytes=Buffer.from(original.encode()),expected=baseEncode(createHash('sha256').update(bytes).digest()),created=Number(base/1000000n)+(options.preparedAgeMs??1000);
 const intent:ReferenceIntent={...historical.prepared,method,args,deposit,id:'fixture-reference-attempt',publicKey,nonce:'13',nonceFloor:'12',created,expires:created+180000,unsigned:bytes.toString('base64'),referenceBlock:headers.get(start).header.hash,hash:expected,codeHash:proposal.expectedCodeHash};
 original.blockHash=baseDecode(headers.get(ref).header.hash);const changed=Buffer.from(original.encode()),digest=createHash('sha256').update(changed).digest(),candidate=baseEncode(digest);
 const policy:ReferencePolicy={...structuredClone(proposal),attemptId:intent.id,originalHash:intent.hash,intentSha256:intentFingerprint(intent),candidateHash:candidate,publicKey,nonce:intent.nonce};
 const actionId=H('fixture-action-receipt'),refundId=H('fixture-refund-receipt'),call={FunctionCall:{method_name:method,args:Buffer.from(JSON.stringify(args)).toString('base64'),deposit,gas:100000000000000}};
 const outcome=(id:string,h:number,executor:string,receipt_ids:string[],status:any,fee:string)=>({id,block_hash:headers.get(h).header.hash,outcome:{executor_id:executor,receipt_ids,status,tokens_burnt:fee,gas_burnt:1,logs:[],metadata:{contracts:executor===intent.contract?[{local:intent.codeHash}]:[]}}});
 const action=(actions:any[],gas_price:string)=>({Action:{actions,gas_price,input_data_ids:[],output_data_receivers:[],is_promise_yield:false,signer_id:intent.owner,signer_public_key:publicKey}});
 const tx={final_execution_status:'FINAL',status:{SuccessValue:''},transaction:{hash:candidate,signer_id:intent.owner,public_key:publicKey,nonce:13,receiver_id:intent.contract,actions:[call],priority_fee:0,signature:'ed25519:'+baseEncode(sign(null,digest,keys.privateKey))},transaction_outcome:outcome(candidate,inc,intent.owner,[actionId],{SuccessReceiptId:actionId},'100'),receipts:[{receipt_id:actionId,predecessor_id:intent.owner,receiver_id:intent.contract,receipt:action([structuredClone(call)],'1')},{receipt_id:refundId,predecessor_id:'system',receiver_id:intent.owner,receipt:action([{Transfer:{deposit:'1'}}],'0')}],receipts_outcome:[outcome(actionId,inc+1,intent.contract,[refundId],{SuccessValue:''},'200'),outcome(refundId,last,intent.owner,[],{SuccessValue:''},'0')]};
 let requests=0;const fetcher=async(input:any,init:any)=>{
  requests++;assert.equal(init.redirect,'error');const {method,params}=JSON.parse(init.body);let value:any;
  if(method==='status')value={chain_id:'testnet',genesis_hash:TESTNET_GENESIS,protocol_version:88,sync_info:{syncing:false}};
  else if(method==='block')value=params.finality?headers.get(last+1):typeof params.block_id==='number'?headers.get(params.block_id):[...headers.values()].find(x=>x.header.hash===params.block_id);
  else if(method==='EXPERIMENTAL_tx_status')value=tx;
  else if(method==='EXPERIMENTAL_protocol_config')value={chain_id:'testnet',protocol_version:88,transaction_validity_period:86400};
  else if(method==='query')value=params.request_type==='view_account'?{code_hash:intent.codeHash,block_hash:params.block_id}:{result:[...Buffer.from(JSON.stringify({owner:intent.owner,paused:true,agent:null}))],block_hash:params.block_id};
  else throw Error('UNEXPECTED_NON_READ_METHOD');value=structuredClone(value);options.mutate?.(value,method,params,String(input));
  const response=new Response(JSON.stringify(value?{result:value}:{error:{cause:{name:'UNKNOWN_BLOCK'}}}),{status:value?200:422});Object.defineProperty(response,'url',{value:String(input)+'/'});return response;
 };
 const reader=new ReferenceEvidenceReader(fetcher as typeof fetch,async()=>{});
 return {intent,policy,reader,tx,headers,start,ref,inc,last,get requests(){return requests;},async assess(){try{return evaluateReferenceRefresh(intent,policy,await reader.collect(intent,policy));}catch(e){return {verdict:'manual_review',reason:(e as Error).message};}}};
}

test('bounded reference compatibility verifies signature, exact intent, canonical source agreement and complete receipts without authorizing submission',async()=>{
 const f=fixture(),r=await f.assess();assert.equal(r.verdict,'compatible_under_proposal');assert.equal((r as any).manualReviewRequired,true);assert.equal((r as any).submissionAuthorized,false);assert.equal((r as any).feeYoctoNEAR,'300');assert.equal((r as any).reference.height,f.ref);assert.ok(f.requests<=REFERENCE_BOUNDS.maxHttpAttempts);
});
for(const [name,options,pass] of [
 ['older reference',{advance:-1},false],['unchanged reference',{advance:0},false],['maximum height bounds',{advance:256,inclusionBlocks:16,receiptBlocks:16},true],['reference advance beyond limit',{advance:257},false],['inclusion height beyond limit',{inclusionBlocks:17},false],['receipt height beyond limit',{receiptBlocks:17},false],
 ['inclusion time boundary',{advance:3,inclusionMs:30000},true],['inclusion time beyond limit',{advance:3,inclusionMs:30001},false],['receipt time boundary',{receiptMs:30000},true],['receipt time beyond limit',{receiptMs:30001},false],
 ['prepared block age boundary',{preparedAgeMs:30000},true],['stale prepared block',{preparedAgeMs:30001},false],['review exact boundary',{stepMs:1000,inclusionMs:28000},true],['review exceeded by one millisecond',{stepMs:1000,inclusionMs:28001},false],
] as [string,Options,boolean][])test(name,async()=>{const f=fixture(options),r=await f.assess();assert.equal(r.verdict,pass?'compatible_under_proposal':'manual_review',String((r as any).reason));});
const changes:[string,(v:any)=>void][]=[
 ['signer',r=>r.transaction.signer_id='other.testnet'],['key',r=>r.transaction.public_key='ed25519:'+H('other-key')],['nonce',r=>r.transaction.nonce++],['receiver',r=>r.transaction.receiver_id='other.testnet'],['extra action',r=>r.transaction.actions.push(r.transaction.actions[0])],['method',r=>r.transaction.actions[0].FunctionCall.method_name='deposit'],['argument bytes',r=>r.transaction.actions[0].FunctionCall.args='eyJleHRyYSI6dHJ1ZX0='],['deposit',r=>r.transaction.actions[0].FunctionCall.deposit='1000000000000000001'],['gas',r=>r.transaction.actions[0].FunctionCall.gas++],['invalid signature',r=>r.transaction.signature='ed25519:'+baseEncode(new Uint8Array(64).fill(7))],['wrong candidate hash',r=>r.transaction.hash=H('not-candidate')],['non-final execution',r=>r.final_execution_status='EXECUTED'],['failed execution',r=>r.status={Failure:{error:'fixture'}}],['missing receipts',r=>delete r.receipts],['altered receipt',r=>r.receipts[0].receipt.Action.actions[0].FunctionCall.deposit='2'],['wrong receipt signer',r=>r.receipts[0].receipt.Action.signer_id='other.testnet'],['broken receipt link',r=>r.transaction_outcome.outcome.receipt_ids=[H('unrelated-receipt')]],['wrong executed code',r=>r.receipts_outcome[0].outcome.metadata.contracts=[{local:H('wrong-executed-code')}]],['failed action outcome',r=>r.receipts_outcome[0].outcome.status={Failure:{error:'fixture'}}],['wrong refund recipient',r=>r.receipts[1].receiver_id='other.testnet'],['receipt causality',r=>r.receipts_outcome[1].block_hash=r.transaction_outcome.block_hash],['failed refund',r=>r.receipts_outcome[1].outcome.status={Failure:{error:'fixture'}}],['extra outcome',r=>r.receipts_outcome.push({...r.receipts_outcome[1],id:H('extra-outcome')})],['excess fee',r=>r.receipts_outcome[0].outcome.tokens_burnt='22000000000000000000001'],['nonzero compatibility fee',r=>r.transaction.priority_fee=1],['unsupported nonce mode',r=>r.transaction.nonce_mode='Monotonic']
];
for(const [name,change]of changes)test('manual review: '+name,async()=>{const f=fixture({mutate:(v,m)=>{if(m==='EXPERIMENTAL_tx_status')change(v);}});assert.equal((await f.assess()).verdict,'manual_review');});
for(const [name,mutate]of [
 ['untrusted final anchor',(v:any,m:string,p:any)=>{if(m==='block'&&p.finality)v.header.hash=H('untrusted-final-anchor');}],['missing sync status',(v:any,m:string)=>{if(m==='status')delete v.sync_info;}],['wrong network',(v:any,m:string)=>{if(m==='status')v.chain_id='mainnet';}],['wrong genesis',(v:any,m:string)=>{if(m==='status')v.genesis_hash=H('fork');}],['protocol drift',(v:any,m:string)=>{if(m==='status')v.protocol_version=89;}],['protocol validity changed',(v:any,m:string)=>{if(m==='EXPERIMENTAL_protocol_config')v.transaction_validity_period=100000;}],['wrong contract code',(v:any,m:string,p:any)=>{if(m==='query'&&p.request_type==='view_account')v.code_hash=H('other-code');}],['wrong vault owner',(v:any,m:string,p:any)=>{if(m==='query'&&p.request_type==='call_function')v.result=[...Buffer.from(JSON.stringify({owner:'other.testnet',paused:true,agent:null}))];}],['untrusted canonical evidence',(v:any,m:string,p:any,o:string)=>{if(m==='block'&&typeof p.block_id==='number'&&o.includes('near.org'))v.header.hash=H('forged');}],['broken parent chain',(v:any,m:string,p:any)=>{if(m==='block'&&p.block_id===1151)v.header.prev_hash=H('wrong-parent');}],
] as [string,(v:any,m:string,p:any,o:string)=>void][])test('source hold: '+name,async()=>{assert.equal((await fixture({mutate}).assess()).verdict,'manual_review');});

test('raw and serialized block evidence cannot self-attest; supported evidence is immutable',async()=>{const f=fixture(),e=await f.reader.collect(f.intent,f.policy);assert.equal(evaluateReferenceRefresh(f.intent,f.policy,{trusted:true,...e as any}).verdict,'manual_review');assert.equal(evaluateReferenceRefresh(f.intent,f.policy,JSON.parse(JSON.stringify(e))).verdict,'manual_review');assert.throws(()=>{(e as any).headers[0].hash=H('forged');},TypeError);});
test('sources, bounds, declared identity and activation changes fail closed',async()=>{for(const change of [(p:any)=>p.sources=['https://attacker.invalid'],(p:any)=>p.bounds.referenceAdvance=257,(p:any)=>p.newTransactionsAuthorized=true,(p:any)=>p.runtimeActivation=true,(p:any)=>p.publicKey='ed25519:'+H('wrong-key')]){const f=fixture();change(f.policy);assert.equal((await f.assess()).verdict,'manual_review');assert.equal(f.requests,0);}});
test('V3 proposal cannot enable the existing owner gate or payment execution',()=>{const file=new URL('../../../docs/METEOR_REFERENCE_POLICY_V3.json',import.meta.url),bytes=fs.readFileSync(file);const gate=ownerTransactionGate({NNETICS_OWNER_TRANSACTIONS_AUTHORIZED:'testnet-reviewed',NNETICS_OWNER_TRANSACTION_PLAN:file.pathname.replace(/^\/([A-Z]:)/,'$1'),NNETICS_OWNER_TRANSACTION_PLAN_SHA256:createHash('sha256').update(bytes).digest('hex')});assert.equal(gate.enabled,false);assert.equal(transactionCapabilities({NNETICS_TRANSACTIONS_AUTHORIZED:'testnet-reviewed'}).paymentExecutionEnabled,false);});

async function durable(changeDuring:boolean){
 const f=fixture(),directory=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-reference-review-')),file=path.join(directory,'review.db');let db=new DatabaseSync(file);const a={...f.intent,state:'manual_review',manualReviewRequired:true,reportedHash:f.policy.candidateHash,reportedHashes:[f.policy.candidateHash]},scope=a.organization+':'+a.owner;
 db.exec('CREATE TABLE owner_wallet_attempts(scope TEXT PRIMARY KEY,payload TEXT);CREATE TABLE owner_wallet_history(id TEXT PRIMARY KEY,payload TEXT);CREATE TABLE owner_acceptance_uses(scope TEXT PRIMARY KEY,attempt TEXT,state TEXT,payload TEXT)');db.prepare('INSERT INTO owner_wallet_attempts VALUES (?,?)').run(scope,JSON.stringify(a));db.prepare('INSERT INTO owner_wallet_history VALUES (?,?)').run(a.id,JSON.stringify(a));db.prepare('INSERT INTO owner_acceptance_uses VALUES (?,?,?,?)').run(a.scopeId,a.id,'manual_review',JSON.stringify(a));db.close();db=new DatabaseSync(file,{readOnly:true});let entered!:()=>void,release!:()=>void;const started=new Promise<void>(r=>entered=r),held=new Promise<void>(r=>release=r),base=f.reader.collect.bind(f.reader);f.reader.collect=async(i,p)=>{const e=await base(i,p);entered();await held;return e;};
 const peer=new DatabaseSync(file);const service={queue:{db:peer},auth:{authorize:async()=>({access:{organization:a.organization,accountId:a.owner},block:{hash:H('block')}})},chain:{config:{contract:a.contract}}} as unknown as OrganizationService;
 try{const pending=assessDurableReferenceRefresh(db,scope,f.policy,a.codeHash,f.reader);await started;if(changeDuring)await ownerAttempt(service,'fixture',{action:'reported',id:a.id,hash:H('later-conflict')});release();const result=await pending;assert.equal(result.verdict,changeDuring?'manual_review':'compatible_under_proposal');if(changeDuring)assert.equal(result.reason,'DURABLE_EVIDENCE_CHANGED');else await ownerAttempt(service,'fixture',{action:'reported',id:a.id,hash:H('later-conflict')});
 db.close();db=new DatabaseSync(file,{readOnly:true});const current=JSON.parse((db.prepare('SELECT payload FROM owner_wallet_attempts').get() as any).payload);assert.equal(current.state,'manual_review');assert.equal(current.hash,a.hash);assert.equal(current.reportedHashes.length,2);assert.equal((db.prepare('SELECT count(*) n FROM owner_acceptance_uses').get() as any).n,1);assert.equal((db.prepare('SELECT state FROM owner_acceptance_uses').get() as any).state,'manual_review');assert.equal((db.prepare('SELECT count(*) n FROM owner_wallet_history').get() as any).n,1);
 }finally{peer.close();db.close();fs.rmSync(directory,{recursive:true,force:true});}
}
test('a concurrent later report invalidates assessment without losing evidence',()=>durable(true));
test('a report after assessment remains manual and consumed after restart',()=>durable(false));

test('a dual-confirmed skipped height is allowed only with a direct canonical parent link',async()=>{const f=fixture(),gap=f.inc-5;f.headers.delete(gap);f.headers.get(gap+1).header.prev_hash=f.headers.get(gap-1).header.hash;assert.equal((await f.assess()).verdict,'compatible_under_proposal');const missing=fixture();missing.headers.delete(missing.inc-5);assert.equal((await missing.assess()).verdict,'manual_review');});

test('cancelled evidence collection makes no requests and cannot create an eligible assessment',async()=>{const f=fixture(),abort=new AbortController();abort.abort();await assert.rejects(f.reader.collect(f.intent,f.policy,abort.signal));assert.equal(f.requests,0);});

test('duplicated intent labels cannot disagree with the original signed intent bytes',async()=>{for(const change of [(i:any)=>i.gas='100000000000001',(i:any)=>i.deposit='1000000000000000001',(i:any)=>i.args={extra:true},(i:any)=>i.method='deposit',(i:any)=>i.referenceBlock=H('another-block'),(i:any)=>i.transport='other-wallet']){const f=fixture();change(f.intent);assert.equal((await f.assess()).verdict,'manual_review');assert.equal(f.requests,0);}});

async function runtimeFixture(conflictDuring=false,interrupted=false){
 const f=fixture();const attempt={...f.intent,planHash:'a'.repeat(64),referencePolicy:RUNTIME_REFERENCE_POLICY,state:'unknown',dispatched:Date.now(),reportedHash:f.policy.candidateHash,reportedHashes:[f.policy.candidateHash]};
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-runtime-reference-')),file=path.join(directory,'queue.db');let db=new DatabaseSync(file);const key=attempt.organization+':'+attempt.owner;
 db.exec('CREATE TABLE owner_wallet_attempts(scope TEXT PRIMARY KEY,payload TEXT);CREATE TABLE owner_acceptance_uses(scope TEXT PRIMARY KEY,attempt TEXT,state TEXT,payload TEXT)');
 db.prepare('INSERT INTO owner_wallet_attempts VALUES (?,?)').run(key,JSON.stringify(attempt));db.prepare('INSERT INTO owner_acceptance_uses VALUES (?,?,?,?)').run(attempt.scopeId,attempt.id,'dispatched',JSON.stringify(attempt));
 const service={queue:{get db(){return db;}},referenceEvidenceReader:f.reader,auth:{authorize:async()=>({access:{organization:attempt.organization,accountId:attempt.owner},block:{hash:H('final')}})},chain:{config:{contract:attempt.contract}}} as unknown as OrganizationService;
 let entered!:()=>void,release!:()=>void;const started=new Promise<void>(r=>entered=r),held=new Promise<void>(r=>release=r),collect=f.reader.collect.bind(f.reader);
 f.reader.collect=async(i,p)=>{const result=await collect(i,p);entered();await held;return result;};
 try{
  if(interrupted){const ready=f.reader.collect;f.reader.collect=async()=>{throw new TypeError('Fixture provider interruption');};const unknown=await ownerAttempt(service,'session');assert.equal(unknown.referenceStatus,'awaiting_evidence');assert.equal(unknown.state,'manual_review');assert.equal(unknown.hash,attempt.hash);db.close();db=new DatabaseSync(file);f.reader.collect=ready;}
  const pending=ownerAttempt(service,'session');await started;
  if(conflictDuring)await ownerAttempt(service,'session',{action:'reported',id:attempt.id,hash:H('runtime-conflict')});
  release();const result=await pending;assert.equal(result.state,conflictDuring?'manual_review':'confirmed');
  if(!conflictDuring){assert.equal(result.hash,attempt.hash);assert.equal(result.verifiedReferenceHash,f.policy.candidateHash);assert.equal(await ownerAttempt(service,'session'),null);await ownerAttempt(service,'session',{action:'reported',id:attempt.id,hash:H('late-runtime-conflict')});}
  const persisted=JSON.parse((db.prepare('SELECT payload FROM owner_wallet_attempts WHERE scope=?').get(key) as any).payload);assert.equal(persisted.state,'manual_review');assert.equal(persisted.hash,attempt.hash);assert.equal(persisted.reportedHashes.length,2);assert.equal((db.prepare('SELECT count(*) n FROM owner_acceptance_uses').get() as any).n,1);assert.equal((db.prepare('SELECT count(*) n FROM owner_wallet_history').get() as any).n,1);
 }finally{release();db.close();fs.rmSync(directory,{recursive:true});}
}
test('normal runtime reconciliation accepts only verified reference refresh; late conflict restores consumed hold',()=>runtimeFixture());
test('normal runtime reconciliation cannot finalize over a concurrent conflicting report',()=>runtimeFixture(true));
test('unknown reference evidence preserves the consumed claim across restart; read-only reconciliation can later prove the same transaction',()=>runtimeFixture(false,true));
test('runtime cannot adopt the historical V2 authorization or its held attempt',async()=>{const f=fixture();await assert.rejects(verifyRuntimeReference({...f.intent,referencePolicy:RUNTIME_REFERENCE_POLICY,dispatched:1,state:'unknown'},f.policy.candidateHash,f.reader),/historical authorization/);assert.equal(f.requests,0);});
for(const options of [{advance:0},{method:'deposit',deposit:'1000000000000000000000'},{method:'set_budget',args:{budget:'2000000000000000000000'},deposit:'1'},{method:'set_paused',args:{paused:false},deposit:'1'},{method:'register_vendor',args:{vendor_id:'vendor',recipient:'recipient.testnet'},deposit:'1'}])test('runtime binds the exact independently authorized owner intent '+JSON.stringify(options),async()=>{const f=fixture(options);const result=await verifyRuntimeReference({...f.intent,planHash:'a'.repeat(64),referencePolicy:RUNTIME_REFERENCE_POLICY,dispatched:1,state:'unknown'},f.policy.candidateHash,f.reader);assert.equal(result.verdict,'compatible_under_proposal',String(result.reason));assert.equal(result.submissionAuthorized,false);});
