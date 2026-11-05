import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
import {workerScope,assertWorkerArguments} from '../src/server/worker-scope.ts';import {liveConfig} from '../src/server/config.ts';
import {WorkerNearTransport} from '../src/server/signer.ts';import {uint} from '../src/data/owner-adapter.ts';
import {Queue,structuredInvoice} from '../src/server/queue.ts';
test('single-job worker plan binds network, vault, key, job, order, recipient, amount and fee ceiling',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-worker-scope-')),file=path.join(directory,'plan.json');
 const c={...liveConfig(),organization:'org',contract:'vault.testnet',worker:'worker.testnet',publicKey:'ed25519:fixture',codeHash:'1'.repeat(32)} as ReturnType<typeof liveConfig>;
 const p={version:4,status:'ready-for-review',network:'testnet',organization:c.organization,contract:c.contract,expectedCodeHash:c.codeHash,validUntil:Date.now()+3600000,worker:{account:c.worker,publicKey:c.publicKey,maximumTransactions:1,method:'execute_payment',gas:'250000000000000',deposit:'0',maxFeeYoctoNEAR:'55000000000000000000000'},payment:{orderId:'ONE-ORDER',invoiceId:'CTR-0001-INV-0003',recipient:'recipient.testnet',amount:'1000000000000000000000',asset:'NEAR',maximumTransfers:1}};
 const write=(value:unknown)=>{const bytes=JSON.stringify(value);fs.writeFileSync(file,bytes);return {NNETICS_PAYMENT_PLAN:file,NNETICS_PAYMENT_PLAN_SHA256:createHash('sha256').update(bytes).digest('hex'),NNETICS_PAYMENT_JOB_ID:'CTR-0001-INV-0003'};};
 try{
  const env=write(p),scope=workerScope(c,env);assert.doesNotThrow(()=>assertWorkerArguments(scope,scope.args));
  for(const change of [{order_id:'other'},{invoice_id:'other'},{recipient:'other.testnet'},{amount:'1'},{extra:true}])assert.throws(()=>assertWorkerArguments(scope,{...scope.args,...change}));
  assert.throws(()=>workerScope(c,{}));assert.throws(()=>workerScope(c,{...env,NNETICS_PAYMENT_PLAN_SHA256:'0'.repeat(64)}));
  assert.throws(()=>workerScope(c,{...env,NNETICS_PAYMENT_JOB_ID:'CTR-0001-INV-0004'}));
  const bill='3ac9a1d7-4190-4b33-9600-d7861f8e861c',job=`acceptance-${bill}`,args={...scope.args,invoice_id:job};
  const binding={organization:c.organization,bill,agreement:'58e918ed-f5ee-402a-a9e6-f869c8121f0d',job,args,argsBase64:Buffer.from(JSON.stringify(args)).toString('base64')};
  const next={...p,version:5,payment:{...p.payment,binding},worker:{...p.worker,transaction:{signer:c.worker,receiver:c.contract,actions:[{type:'FunctionCall',method:'execute_payment',args,depositYoctoNEAR:'0',gas:p.worker.gas}]}}};
  const scoped=(value:unknown)=>workerScope(c,{...write(value),NNETICS_PAYMENT_JOB_ID:job});
  assert.deepEqual(scoped(next).binding,binding);
  for(const change of [(v:typeof next)=>v.payment.binding.argsBase64='e30=',(v:typeof next)=>v.payment.binding.job='CTR-0001-INV-0003',(v:typeof next)=>v.worker.transaction.actions[0].depositYoctoNEAR='1'])
   {const altered=structuredClone(next);change(altered);assert.throws(()=>scoped(altered));}
  for(const mutate of [(v:any)=>v.network='mainnet',(v:any)=>v.validUntil=0,(v:any)=>v.worker.maximumTransactions=2,(v:any)=>v.worker.gas='300000000000000',(v:any)=>v.worker.maxFeeYoctoNEAR='56000000000000000000000',(v:any)=>v.contract='other.testnet']){const altered=structuredClone(p);mutate(altered);assert.throws(()=>workerScope(c,write(altered)));}
  const active={...write(p),NNETICS_PAYMENT_EXECUTION_AUTHORIZED:'testnet-reviewed',NNETICS_WORKER_KEY_FILE:path.join(directory,'key-must-never-be-read')},names=Object.keys(active),saved=names.map(n=>process.env[n]);
  try{
   Object.assign(process.env,active);const transport=new WorkerNearTransport(c);transport.rpc.finalized=async()=>({hash:'1'.repeat(32),timestamp:uint('100'),protocolVersion:88});transport.rpc.view=async<T>()=>({head:{inner_lite:{timestamp:'1'}}}) as T;
   transport.rpc.rpc=async<T>(method:string,params:any)=>{if(method==='status')return {chain_id:'testnet',genesis_hash:'FWJ9kR6KFWoyMoNjpLXXGHeuiy7tEY6GmoFeCA5yuc6b',protocol_version:88,sync_info:{syncing:false}} as T;if(method==='gas_price')return {gas_price:'100000000'} as T;if(params.request_type==='view_access_key')return {nonce:1,block_hash:'1'.repeat(32),permission:{FunctionCall:{receiver_id:c.contract,method_names:['execute_payment'],allowance:'100000000000000000000000'}}} as T;process.env.NNETICS_PAYMENT_EXECUTION_AUTHORIZED='';return {amount:'1000000000000000000000000',storage_usage:0} as T;};
   await assert.rejects(transport.prepare(scope.args),/permission changed during preflight/);
   const fixtureScope=scoped(next);
   Object.assign(process.env,{...write(next),NNETICS_PAYMENT_JOB_ID:job,NNETICS_PAYMENT_EXECUTION_AUTHORIZED:'testnet-reviewed'});
   const queue=new Queue(path.join(directory,'queue.db'));
   try{
    const invoice=structuredInvoice({id:job,order_id:args.order_id,vendor_id:'fixture',recipient:args.recipient,amount:args.amount,asset:'NEAR',text:'Fixture bill.'});
    queue.stagePayment(c.organization,bill,binding.agreement,invoice);
    queue.releaseStagedPayment(invoice,fixtureScope.planHash);
    queue.db.prepare('INSERT INTO metadata VALUES (?,?)').run('cleanup:'+fixtureScope.planHash,'failed-cleanup');
    const afterCleanup=new WorkerNearTransport(c,queue);
    afterCleanup.rpc.finalized=transport.rpc.finalized;
    afterCleanup.rpc.view=transport.rpc.view;
    afterCleanup.rpc.rpc=async()=>{throw Error('Unexpected network request before payout latch');};
    await assert.rejects(afterCleanup.prepare(args),/permanently closed/);
   }finally{queue.close();}
  }finally{names.forEach((n,i)=>{if(saved[i]===undefined)delete process.env[n];else process.env[n]=saved[i];});}
 }finally{fs.rmSync(directory,{recursive:true});}
});
