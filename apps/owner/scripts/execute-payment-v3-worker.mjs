// One approved V3 payment through the existing durable worker; no retry loop.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {SignedTransaction} from 'near-api-js';
import {liveConfig} from '../src/server/config.ts';import {Queue,workerLock} from '../src/server/queue.ts';import {WorkerNearTransport} from '../src/server/signer.ts';import {PaymentWorker} from '../src/server/worker.ts';import {validateBootstrapAge} from '../src/server/bootstrap-inputs.ts';
const root='../..',dir=root+'/artifacts/payment-acceptance/v3-outbox',load=f=>JSON.parse(fs.readFileSync(f)),digest='9ea7cb9e479d5df6c6cd79793aeb1ea53fb34e6b76a8fc139895afa4b06a27d8';
const d=load(root+'/docs/PAYMENT_ACCEPTANCE_RESUMPTION_V3.json'),p=d.plan;
assert.equal(d.digest,digest);assert.equal(crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex'),digest);assert.equal(process.env.NNETICS_APPROVED_PAYMENT_V3,digest);assert.equal(process.env.NNETICS_TRANSACTIONS_AUTHORIZED,'testnet-reviewed');
const step=p.transactions.find(t=>t.id==='execute_payment'),a=step.actions[0],cfg=liveConfig();
assert.equal(cfg.contract,p.vault);assert.equal(cfg.worker,p.worker.account);assert.equal(cfg.publicKey,p.worker.public_key);assert.equal(cfg.organization,p.organization);
const proof=load(root+'/artifacts/payment-acceptance/'+process.env.NNETICS_V3_PROOF);assert.equal(proof.approved_digest,digest);assert.equal(proof.ancestry_verified,true);assert.ok(Date.now()-Date.parse(proof.verified_at)<30*60000);
for(const id of ['authorize_agent','set_paused']){const r=load(dir+'/'+id+'.result.json');assert.equal(r.final_execution_status,'FINAL');assert.ok('SuccessValue' in r.status);assert.ok(r.receipts_outcome.every(o=>!('Failure' in o.outcome.status)));}
function persist(name,data){const fd=fs.openSync(dir+'/'+name,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(data,null,2));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
const q=new Queue(cfg.database,`testnet:${cfg.contract}:${cfg.codeHash}`);q.bindOrganization(cfg.organization);const unlock=workerLock(cfg.database);
const prior=q.all();assert.equal(prior.length,1);assert.equal(prior[0].id,p.invoice.reference);assert.equal(prior[0].state,'queued');assert.equal(prior[0].signed,null);assert.equal(prior[0].hash,null);assert.equal(prior[0].attempt,null);
assert.equal(fs.existsSync(dir+'/execute_payment.prepared.json'),false);
class ScopedTransport extends WorkerNearTransport {
 async prepare(args){
  assert.deepEqual(args,a.args);
  const b=await this.rpc.finalized(),h=b.hash;assert.equal(b.protocolVersion,88);validateBootstrapAge(p.expiry.checkpoint_timestamp_ns,BigInt(b.timestamp));
  const v=await this.rpc.view('get_vault',{},h),checkpoint=await this.rpc.view('get_repair_checkpoint',{},h),order=await this.rpc.view('get_order',{order_id:a.args.order_id},h);
  assert.equal(v.owner,'grandtheft.testnet');assert.equal(v.paused,false);assert.equal(v.agent.account_id,cfg.worker);assert.equal(v.agent.public_key,cfg.publicKey);assert.equal(String(v.last_attempt),'0');assert.equal(v.spent,'0');assert.equal(v.reserved,'0');
  for(const f of ['funded','budget','payment_cap'])assert.equal(v[f],a.args.amount);
  const pinned=load(root+'/docs/PAYMENT_ACCEPTANCE_TESTNET_V2.json').plan.transactions.find(t=>t.id==='initialize_repair_checkpoint').actions[0].args.checkpoint;assert.deepEqual(checkpoint,pinned);
  assert.equal(order.status,'Approved');assert.equal(order.enabled,true);assert.equal(order.recipient,a.args.recipient);assert.equal(order.amount,a.args.amount);assert.ok(BigInt(order.expires_at_ns)>BigInt(b.timestamp));
  const keys=await this.rpc.rpc('query',{request_type:'view_access_key_list',account_id:cfg.worker,block_id:h});assert.equal(keys.keys.length,1);assert.equal(keys.keys[0].public_key,cfg.publicKey);assert.deepEqual(keys.keys[0].access_key.permission,{FunctionCall:{allowance:'270000000000000000000000',method_names:['execute_payment'],receiver_id:cfg.contract}});
  const config=await this.rpc.rpc('EXPERIMENTAL_protocol_config',{block_id:h}),block=await this.rpc.rpc('block',{block_id:h});assert.equal(config.protocol_version,88);assert.equal(config.runtime_config.storage_amount_per_byte,'10000000000000000000');
  const rt=config.runtime_config,price=BigInt(block.header.gas_price),purchase=BigInt(rt.min_gas_purchase_price);assert.ok(price<=100000000n);assert.ok(purchase<=1000000000n);const r=rt.transaction_costs.action_receipt_creation_config,f=rt.transaction_costs.action_creation_config,n=BigInt(Buffer.byteLength(a.method_name)+Buffer.from(a.args_base64,'base64').length);
  const fee=(BigInt(r.send_not_sir)+BigInt(f.function_call_cost.send_not_sir)+n*BigInt(f.function_call_cost_per_byte.send_not_sir))*price+(BigInt(r.execution)+BigInt(f.function_call_cost.execution)+n*BigInt(f.function_call_cost_per_byte.execution)+BigInt(a.gas))*(purchase>price?purchase:price);assert.ok(fee<=BigInt(step.maximum_upfront_fee_yocto));
  const balance=await this.rpc.rpc('query',{request_type:'view_account',account_id:cfg.worker,block_id:h});assert.ok(BigInt(balance.amount)>=fee+BigInt(balance.storage_usage)*BigInt(rt.storage_amount_per_byte));
  const recipient=await this.rpc.rpc('query',{request_type:'view_account',account_id:a.args.recipient,block_id:h});
  persist('execute_payment.prepared.json',{digest,args,block:h,chain_time_ns:b.timestamp,recipient_pre_balance:recipient.amount,recipient_code_hash:recipient.code_hash,fee_allowance:fee.toString(),worker_nonce:keys.keys[0].access_key.nonce,state:'Claimed before signing; never create replacement while unknown'});
  const signed=await super.prepare(args),tx=SignedTransaction.decode(Buffer.from(signed.signed,'base64')).transaction;
  assert.equal(tx.signerId,step.signer);assert.equal(tx.receiverId,step.receiver);assert.equal(tx.publicKey.toString(),p.worker.public_key);assert.equal(tx.actions.length,1);assert.equal(tx.actions[0].functionCall.methodName,a.method_name);assert.equal(tx.actions[0].functionCall.gas,BigInt(a.gas));assert.equal(tx.actions[0].functionCall.deposit,0n);assert.deepEqual(JSON.parse(Buffer.from(tx.actions[0].functionCall.args)),a.args);
  persist('execute_payment.signed.json',{digest,...signed});return signed;
 }
 async broadcast(signed){
  assert.equal(signed,load(dir+'/execute_payment.signed.json').signed);
  const b=await this.rpc.finalized();validateBootstrapAge(p.expiry.checkpoint_timestamp_ns,BigInt(b.timestamp));
  persist('execute_payment.broadcast.json',{digest,hash:load(dir+'/execute_payment.signed.json').hash,time:new Date().toISOString(),status:'One broadcast attempt; reconcile same hash only'});
  const result=await this.rpc.rpc('send_tx',{signed_tx_base64:signed,wait_until:'FINAL'});persist('execute_payment.result.json',result);assert.equal(result.final_execution_status,'FINAL');assert.equal(result.transaction.hash,load(dir+'/execute_payment.signed.json').hash);assert.ok('SuccessValue' in result.status);assert.ok(result.receipts_outcome.every(o=>!('Failure' in o.outcome.status)));
 }
}
try{const t=new ScopedTransport(cfg),worker=new PaymentWorker(q,t);await worker.tick();const job=q.get(p.invoice.reference);const b=await t.rpc.finalized(),vault=await t.rpc.view('get_vault',{},b.hash),order=await t.rpc.view('get_order',{order_id:a.args.order_id},b.hash),recipient=await t.rpc.rpc('query',{request_type:'view_account',account_id:a.args.recipient,block_id:b.hash});persist('payment-after-tick.json',{checked_at:new Date().toISOString(),job:{id:job.id,state:job.state,hash:job.hash,attempt:job.attempt},block:b,vault,order,recipient});console.log(JSON.stringify({job:job.id,state:job.state,hash:job.hash,attempt:job.attempt,spent:vault.spent,reserved:vault.reserved,recipient_post_balance:recipient.amount}));if(job.state!=='paid')throw Error('Not confirmed paid; STOP and contain. No retries.');}finally{unlock();q.close();}
