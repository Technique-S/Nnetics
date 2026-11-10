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
assert.equal(vault.owner,'grandtheft.testnet');assert.equal(vault.paused,true);assert.equal(vault.agent,null);assert.equal(String(vault.last_attempt),'1');
for(const f of ['funded','budget','payment_cap'])assert.equal(vault[f],'1000000000000000000000');assert.equal(vault.spent,'1000000000000000000000');assert.equal(vault.reserved,'0');
assert.equal(vaultKeys.keys.length,0);assert.deepEqual(checkpoint,p.transactions[1].actions[0].args.checkpoint);
validateBootstrapAge(checkpoint.head.inner_lite.timestamp,BigInt(block.timestamp));
assert.equal(order.enabled,true);assert.equal(order.status,'Paid');assert.equal(order.vendor_id,'babygoat-acceptance');assert.equal(order.recipient,'babygoat.testnet');assert.equal(order.amount,'1000000000000000000000');assert.ok(BigInt(order.expires_at_ns)>BigInt(block.timestamp));
assert.equal(vendor.active,true);assert.equal(vendor.recipient,order.recipient);
assert.equal(keys.keys.length,1);assert.equal(keys.keys[0].public_key,c.publicKey);assert.deepEqual(keys.keys[0].access_key.permission,{FunctionCall:{allowance:keys.keys[0].access_key.permission.FunctionCall.allowance,method_names:['execute_payment'],receiver_id:c.contract}});
assert.ok(BigInt(worker.amount)>=251000000000000000000000n+BigInt(worker.storage_usage)*10000000000000000000n);
const db=new DatabaseSync(c.database,{readOnly:true}),billing=new DatabaseSync(root+'/artifacts/live/contractors.db',{readOnly:true}),identity=new DatabaseSync(root+'/artifacts/live/identities.db',{readOnly:true});
const jobs=db.prepare('SELECT * FROM invoices').all(),metadata=db.prepare('SELECT * FROM metadata').all();assert.equal(jobs.length,1);
const job=jobs[0],invoice=JSON.parse(job.payload),bill=JSON.parse(billing.prepare('SELECT payload FROM demo_bills WHERE id=?').get(p.invoice.id).payload),intents=billing.prepare('SELECT * FROM contractor_queue_intents WHERE org=?').all(c.organization),binding=identity.prepare('SELECT vault,owner FROM organization_vaults WHERE organization=?').get(c.organization);
assert.equal(binding.vault,c.contract);assert.equal(binding.owner,vault.owner);assert.equal(job.id,p.invoice.reference);assert.equal(job.order_id,'ACCEPTANCE-001');assert.equal(job.state,'paid');assert.equal(job.hash,'6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1');assert.equal(typeof job.signed,'string');assert.equal(job.attempt,'1');assert.equal(invoice.reviewed,true);assert.equal(invoice.amount,order.amount);assert.equal(invoice.recipient,order.recipient);
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
const payment=await view('get_payment',{attempt_id:'1'});assert.equal(payment.status,'Paid');assert.equal(payment.recipient,'babygoat.testnet');assert.equal(payment.amount,'1000000000000000000000');assert.equal(payment.invoice_id,job.id);assert.equal(payment.order_id,job.order_id);
const evidence={checked_at:new Date().toISOString(),block,vault:c.contract,state:vault,payment,order,worker_keys:keys.keys,worker_balance:worker.amount,owner_balance:owner.amount,recipient_balance:recipient.amount,job:{id:job.id,state:job.state,hash:job.hash,attempt:job.attempt},one_job:true,one_intent:true,invoice_unchanged:true,transactions_disabled:true};fs.writeFileSync(root+'/artifacts/payment-acceptance/v3-contained-final-state.json',JSON.stringify(evidence,null,2),{flag:'wx'});console.log(JSON.stringify(evidence));