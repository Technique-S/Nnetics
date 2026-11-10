// Fresh read-only verification and five-step amendment. No signing or submission.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {liveConfig} from '../src/server/config.ts';
import {validateBootstrapAge} from '../src/server/bootstrap-inputs.ts';
import {WorkerNearTransport} from '../src/server/signer.ts';
const root='../..',load=f=>JSON.parse(fs.readFileSync(f,'utf8')),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const old=load(root+'/docs/PAYMENT_ACCEPTANCE_TESTNET_V2.json');
assert.equal(sha(JSON.stringify(old.plan)),'978219497f70b4c76cf87b367eb032192c12566d074488566c40eece43301edf');
const p=old.plan,c=liveConfig(),transport=new WorkerNearTransport(c),rpc=transport.rpc;
assert.equal(c.contract,p.transactions[1].receiver);assert.equal(c.organization,p.organization);assert.equal(c.worker,p.worker.account);assert.equal(c.publicKey,p.worker.public_key);
assert.equal(process.env.NNETICS_PAYMENT_EXECUTION_AUTHORIZED==='testnet-reviewed',false);
assert.equal(process.env.NNETICS_OWNER_TRANSACTIONS_AUTHORIZED==='testnet-reviewed',false);
const block=await rpc.finalized(),h=block.hash;
assert.equal(block.protocolVersion,88);
const view=(method,args={})=>rpc.view(method,args,h);
const [vault,checkpoint,order,vendor,keys,worker,owner,recipient,vaultKeys]=await Promise.all([
 view('get_vault'),view('get_repair_checkpoint'),view('get_order',{order_id:'ACCEPTANCE-001'}),view('get_vendor',{vendor_id:'babygoat-acceptance'}),
 rpc.rpc('query',{request_type:'view_access_key_list',account_id:c.worker,block_id:h}),
 rpc.rpc('query',{request_type:'view_account',account_id:c.worker,block_id:h}),
 rpc.rpc('query',{request_type:'view_account',account_id:'grandtheft.testnet',block_id:h}),
 rpc.rpc('query',{request_type:'view_account',account_id:'babygoat.testnet',block_id:h}),
 rpc.rpc('query',{request_type:'view_access_key_list',account_id:c.contract,block_id:h})]);
assert.equal(vault.owner,'grandtheft.testnet');assert.equal(vault.paused,true);assert.equal(vault.agent,null);assert.equal(String(vault.last_attempt),'0');
for(const f of ['funded','budget','payment_cap'])assert.equal(vault[f],'1000000000000000000000');for(const f of ['spent','reserved'])assert.equal(vault[f],'0');
assert.equal(vaultKeys.keys.length,0);assert.deepEqual(checkpoint,p.transactions[1].actions[0].args.checkpoint);
validateBootstrapAge(checkpoint.head.inner_lite.timestamp,BigInt(block.timestamp));
assert.equal(order.enabled,true);assert.equal(order.status,'Approved');assert.equal(order.vendor_id,'babygoat-acceptance');assert.equal(order.recipient,'babygoat.testnet');assert.equal(order.amount,'1000000000000000000000');assert.ok(BigInt(order.expires_at_ns)>BigInt(block.timestamp));
assert.equal(vendor.active,true);assert.equal(vendor.recipient,order.recipient);
assert.equal(keys.keys.length,1);assert.equal(keys.keys[0].public_key,c.publicKey);assert.deepEqual(keys.keys[0].access_key.permission,{FunctionCall:{allowance:'270000000000000000000000',method_names:['execute_payment'],receiver_id:c.contract}});
assert.ok(BigInt(worker.amount)>=251000000000000000000000n+BigInt(worker.storage_usage)*10000000000000000000n);
const db=new DatabaseSync(c.database,{readOnly:true}),billing=new DatabaseSync(root+'/artifacts/live/contractors.db',{readOnly:true}),identity=new DatabaseSync(root+'/artifacts/live/identities.db',{readOnly:true});
const jobs=db.prepare('SELECT * FROM invoices').all(),metadata=db.prepare('SELECT * FROM metadata').all();assert.equal(jobs.length,1);
const job=jobs[0],invoice=JSON.parse(job.payload),bill=JSON.parse(billing.prepare('SELECT payload FROM demo_bills WHERE id=?').get(p.invoice.id).payload),intents=billing.prepare('SELECT * FROM contractor_queue_intents WHERE org=?').all(c.organization),binding=identity.prepare('SELECT vault,owner FROM organization_vaults WHERE organization=?').get(c.organization);
assert.equal(binding.vault,c.contract);assert.equal(binding.owner,vault.owner);assert.equal(job.id,p.invoice.reference);assert.equal(job.order_id,'ACCEPTANCE-001');assert.equal(job.state,'review');assert.equal(job.hash,null);assert.equal(job.signed,null);assert.equal(job.attempt,null);assert.equal(invoice.reviewed,true);assert.equal(invoice.amount,order.amount);assert.equal(invoice.recipient,order.recipient);
assert.equal(intents.length,1);assert.equal(intents[0].bill,p.invoice.id);assert.equal(intents[0].chain_order,job.order_id);assert.equal(intents[0].state,'linked');const {reviewed,...saved}=invoice;assert.deepEqual(saved,JSON.parse(intents[0].payload));
assert.equal(bill.status,'Approved');assert.equal(bill.amount,'0.001');assert.equal(bill.orderId,p.invoice.billing_order_id);assert.equal(bill.recipient,'babygoat.testnet');assert.equal(sha(bill.originalText),p.invoice.original_text_sha256);
assert.equal(metadata.find(r=>r.id==='scope').value,`testnet:${c.contract}:${c.codeHash}`);assert.equal(metadata.find(r=>r.id==='organization').value,c.organization);
db.close();billing.close();identity.close();
const publicApi=await fetch('http://127.0.0.1:3100/api/live/config').then(r=>r.json());
for(const k of ['contract','organization','worker','publicKey','network'])assert.equal(publicApi[k],c[k]);
const [vaultAccount,ownerAccess]=await Promise.all([
 rpc.rpc('query',{request_type:'view_account',account_id:c.contract,block_id:h}),
 rpc.rpc('query',{request_type:'view_access_key',account_id:'grandtheft.testnet',public_key:'ed25519:6vkGFeDZ2Z8M6mfubE4mYQpdr2d3M7eULrHWuonseBhZ',block_id:h})]);
assert.equal(ownerAccess.permission,'FullAccess');assert.ok(Number.isSafeInteger(ownerAccess.nonce));
assert.equal(vaultAccount.code_hash,c.codeHash);
assert.equal(vault.storage_stake,(BigInt(vaultAccount.storage_usage)*10000000000000000000n).toString());
assert.ok(BigInt(vaultAccount.amount)>=BigInt(vault.storage_stake)+BigInt(vault.operating_reserve)+1000000000000000000000n);
const selected=['authorize_agent','set_paused','execute_payment','pause-after-payment','revoke_agent'];
const transactions=selected.map(id=>structuredClone(p.transactions.find(t=>t.id===id)));
const protocol=await rpc.rpc('EXPERIMENTAL_protocol_config',{block_id:h}),header=await rpc.rpc('block',{block_id:h});
assert.equal(protocol.protocol_version,88);
const rt=protocol.runtime_config,price=BigInt(header.header.gas_price),purchase=BigInt(rt.min_gas_purchase_price);
assert.equal(rt.storage_amount_per_byte,'10000000000000000000');assert.ok(price<=100000000n);assert.ok(purchase<=1000000000n);
const receipt=rt.transaction_costs.action_receipt_creation_config,fc=rt.transaction_costs.action_creation_config;
const feeChecks=transactions.map(t=>{
 let send=BigInt(receipt.send_not_sir),execution=BigInt(receipt.execution);
 for(const a of t.actions){assert.equal(a.type,'FunctionCall');assert.deepEqual(JSON.parse(Buffer.from(a.args_base64,'base64')),a.args);
  const bytes=BigInt(Buffer.byteLength(a.method_name)+Buffer.from(a.args_base64,'base64').length);
  send+=BigInt(fc.function_call_cost.send_not_sir)+bytes*BigInt(fc.function_call_cost_per_byte.send_not_sir);
  execution+=BigInt(a.gas)+BigInt(fc.function_call_cost.execution)+bytes*BigInt(fc.function_call_cost_per_byte.execution);
 }
 const upfront=send*price+execution*(purchase>price?purchase:price);assert.ok(upfront<=BigInt(t.maximum_upfront_fee_yocto));
 return {step:t.id,upfront_allowance_yocto:upfront.toString(),ceiling_yocto:t.maximum_upfront_fee_yocto};
});
const priorFees=BigInt(load(root+'/artifacts/payment-acceptance/v2-stopped-summary.json').owner_fees);
const ownerFees=transactions.filter(t=>t.signer==='grandtheft.testnet').reduce((s,t)=>s+BigInt(t.maximum_upfront_fee_yocto),0n),ownerStorage=BigInt(owner.storage_usage)*10000000000000000000n;
assert.equal(ownerFees,44000000000000000000000n);assert.ok(BigInt(owner.amount)>=ownerFees+4n+ownerStorage);
assert.ok(priorFees+ownerFees<=210000000000000000000000n);
const evidence={checked_at:new Date().toISOString(),block:h,protocol:88,vault:c.contract,owner:vault.owner,backend_config:c,public_config:publicApi,worker_transport_vault:transport.config.contract,state:vault,checkpoint_matches_approved:true,checkpoint_age_hours:Number((BigInt(block.timestamp)-BigInt(checkpoint.head.inner_lite.timestamp))/1000000000n)/3600,order,vendor,worker_keys:keys.keys,worker_balance:worker.amount,owner_balance:owner.amount,recipient_snapshot:recipient.amount,queue_metadata:metadata,jobs:[{id:job.id,order_id:job.order_id,state:job.state,hash:job.hash,attempt:job.attempt}],intent_count:intents.length,invoice_unchanged:true,ui_authenticated_verification:'Pending browser confirmation; public config is fresh and matched'};
evidence.fresh_fee_checks=feeChecks;evidence.prior_owner_fees=priorFees.toString();evidence.owner_storage_reserve=ownerStorage.toString();
evidence.vault_account=vaultAccount;evidence.owner_access=ownerAccess;
evidence.ui_authenticated_verification='Not completed: Brave owner tab observed logged out after wallet/page focus change on 3 November; fresh verification required before execution. Backend/public config alignment passed; no authenticated UI alignment is claimed.';
const evidencePath='artifacts/payment-acceptance/resumption-fresh-verification-'+Date.now()+'.json';
fs.writeFileSync(root+'/'+evidencePath,JSON.stringify(evidence,null,2),{flag:'wx'});
const amendment={version:3,status:'AWAITING_EXPLICIT_RESUMPTION_APPROVAL_NOT_AUTHORIZED',amends_digest:old.digest,reason:'V2 stopped on stale owner UI target; its one activation and containment transactions were consumed. Context guards fixed and regression tested.',network:'testnet',organization:c.organization,vault:c.contract,vault_code_hash:c.codeHash,invoice:p.invoice,worker:p.worker,checkpoint:p.checkpoint,testnet_risk_acceptance:p.testnet_risk_acceptance,transactions,existing_job:{id:job.id,order_id:job.order_id,state:'review',hash:null,attempt:null,preserve_existing_only:true},completed_setup:'Do not recreate worker, install/reset checkpoint, register vendor/order, deposit funds, or set budget/cap. Existing V2 artifacts remain immutable.',fee_ceilings:{additional_owner_fees:ownerFees.toString(),additional_owner_deposits:'4',additional_funding:'0',worker_payment_fee:'251000000000000000000000',worker_key_allowance:'270000000000000000000000',original_v2_owner_fee_ceiling:'210000000000000000000000',require_combined_actual_prior_and_new_caps_within_v2_ceiling:true},pre_execution_requirements:p.pre_execution_requirements.map(s=>s.replace('Before any initial setup signature','Before any resumption signature').replace('Before checkpoint signature','Before every resumption signature')).filter(s=>!s.startsWith('Checkpoint initialization only')),gates:p.gates,stop_conditions:p.stop_conditions,closure:p.closure,expiry:{checkpoint_max_age_hours:24,checkpoint_timestamp_ns:checkpoint.head.inner_lite.timestamp,checkpoint_valid_until_ns:(BigInt(checkpoint.head.inner_lite.timestamp)+24n*3600n*1000000000n).toString(),order_expires_at_ns:order.expires_at_ns,earliest_deadline_applies:true},sequence:['Fresh authenticated corrected UI/adapter/backend/queue/worker and chain alignment; one held job','Reauthorize exact existing restricted worker','Unpause after fresh validity/eligibility checks','Owner releases the SAME held job; execute it ONCE using scoped worker lock/outbox; snapshot recipient immediately beforehand','Verify native transfer + isolated recipient delta + FINAL attempt/accounting/linkage and matching Paid statuses','Immediately pause and revoke, verify state','Local repeat linkage/queue and app/worker restart checks retain same terminal job; no duplicate transaction'],preparation_evidence:evidencePath,approval_granted:false};
const digest=sha(JSON.stringify(amendment));
fs.writeFileSync(root+'/docs/PAYMENT_ACCEPTANCE_RESUMPTION_V3.json',JSON.stringify({plan:amendment,digest},null,2));
console.log(JSON.stringify({digest,contract:c.contract,worker:c.worker,held_jobs:1,checkpoint_age_hours:evidence.checkpoint_age_hours,owner_balance:owner.amount,worker_balance:worker.amount,additional_owner_fee_cap:ownerFees.toString(),order_expiry:order.expires_at_ns,checkpoint_valid_until:amendment.expiry.checkpoint_valid_until_ns,transactions:transactions.map(t=>t.id),authorized:false},null,2));
