// Submit the one already approved and signature-verified infrastructure transaction.
// An exclusive marker is persisted before send. Subsequent runs only reconcile.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Transaction,baseEncode} from 'near-api-js';
import {verifySetupSignature} from './setup-signature.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest();
const p=load('artifacts/live/approved-factory-cli-infrastructure.json'),v=load('artifacts/live/approved-factory-cli-infrastructure.verified.json');
const doc=load('docs/FRESH_USER_TESTNET_PLAN.json'),amend=load('docs/CLI_FACTORY_HANDOFF_PLAN.json');
for(const [d,expected] of [[doc,'0f569790060daca8ffb0f51a8aebd9c5ae80b94e1cde253ec1db32f99cabfa6a'],[amend,'bca85c64ac11e4a0a14808d290980c47db89353fa2450930f34022291cc91ae8']])if(d.digest!==expected||sha(JSON.stringify(d.plan)).toString('hex')!==expected)throw Error('Approval changed');
const tx=Transaction.decode(Buffer.from(p.unsigned,'base64'));
const verified=verifySetupSignature(tx,v.signed);
if(verified.hash!==p.hash||v.hash!==p.hash||tx.signerId!==amend.plan.signer||tx.receiverId!==amend.plan.receiver||tx.publicKey.toString()!==amend.plan.public_key||String(tx.nonce)!==p.nonce)throw Error('Transaction mismatch');
const acts=tx.actions,wasm=fs.readFileSync(path.join(root,'artifacts/github/07181a0-provisioning-88/provisioning/factory.wasm'));
if(acts.length!==3||!acts[0].createAccount||String(acts[1].transfer?.deposit)!==amend.plan.actions[1].deposit||!Buffer.from(acts[2].deployContract?.code||[]).equals(wasm)||sha(wasm).toString('hex')!==amend.plan.actions[2].code_sha256)throw Error('Approved actions changed');
const marker=path.join(root,'artifacts/live/approved-factory-cli-infrastructure.broadcast.json');
async function rpc(method,params){const r=await fetch('https://test.rpc.fastnear.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:method,method,params}),signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`RPC HTTP ${r.status}`);const j=await r.json();if(j.error){const e=Error(j.error.cause?.name||'RPC error');e.rpcError=j.error;throw e;}return j.result;}
function persist(file,value){const fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(value,null,2));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
let existing;
try{existing=await rpc('tx',{tx_hash:p.hash,sender_account_id:p.signer,wait_until:'NONE'});}catch(e){if(e.rpcError?.cause?.name!=='UNKNOWN_TRANSACTION')throw e;}
if(existing){console.log(JSON.stringify({broadcast:false,existing:true,hash:p.hash,final_execution_status:existing.final_execution_status,status:existing.status}));process.exit(0);}
if(fs.existsSync(marker))throw Error('Broadcast already attempted; unknown outcome blocks another send. Reconcile recorded hash only.');
const status=await rpc('status',[]),block=await rpc('block',{finality:'final'}),h=block.header.hash,c=await rpc('EXPERIMENTAL_protocol_config',{block_id:h});
if(status.chain_id!=='testnet'||status.protocol_version!==88||c.protocol_version!==88||c.transaction_validity_period!==86400||block.header.height>p.finalized_height+86400)throw Error('Network/protocol/validity changed');
const reference=await rpc('block',{block_id:p.finalized_height});if(reference.header.hash!==p.finalized_block)throw Error('Reference no longer canonical');
const old=amend.plan.old_attempt;
try{await rpc('tx',{tx_hash:old.hash,sender_account_id:p.signer,wait_until:'NONE'});throw Error('Original transaction exists; inspect it');}catch(e){if(e.rpcError?.cause?.name!=='UNKNOWN_TRANSACTION')throw e;}
if(block.header.height<=old.conservative_finalized_expiry_height_exclusive)throw Error('Original expiry unresolved');
for(const account_id of [p.receiver,doc.plan.expected_vault]){try{await rpc('query',{request_type:'view_account',account_id,block_id:h});throw Error('Target exists');}catch(e){if(e.rpcError?.cause?.name!=='UNKNOWN_ACCOUNT')throw e;}}
const key=await rpc('query',{request_type:'view_access_key',account_id:p.signer,public_key:p.public_key,block_id:h});
const oldKey=await rpc('query',{request_type:'view_access_key',account_id:p.signer,public_key:old.public_key,block_id:h});
const account=await rpc('query',{request_type:'view_account',account_id:p.signer,block_id:h});
if(key.permission!=='FullAccess'||String(key.nonce)!==p.previous_nonce||oldKey.nonce!==Number(old.nonce)-1)throw Error('Key/nonce changed');
const runtime=c.runtime_config,f=runtime.transaction_costs.action_creation_config,r=runtime.transaction_costs.action_receipt_creation_config;
if(runtime.storage_amount_per_byte!==doc.plan.preflight.storage_amount_per_byte||BigInt(block.header.gas_price)>100000000n||BigInt(runtime.min_gas_purchase_price)>1000000000n)throw Error('Fee/storage price changed');
const send=BigInt(r.send_not_sir)+BigInt(f.create_account_cost.send_not_sir)+BigInt(f.transfer_cost.send_not_sir)+BigInt(f.deploy_contract_cost.send_not_sir)+BigInt(wasm.length)*BigInt(f.deploy_contract_cost_per_byte.send_not_sir);
const exec=BigInt(r.execution)+BigInt(f.create_account_cost.execution)+BigInt(f.transfer_cost.execution)+BigInt(f.deploy_contract_cost.execution)+BigInt(wasm.length)*BigInt(f.deploy_contract_cost_per_byte.execution);
const call=doc.plan.transactions[1].actions[0],n=BigInt(Buffer.byteLength(call.method_name)+Buffer.byteLength(call.args_utf8));
const send2=BigInt(r.send_not_sir)+BigInt(f.function_call_cost.send_not_sir)+n*BigInt(f.function_call_cost_per_byte.send_not_sir),exec2=BigInt(call.gas)+BigInt(r.execution)+BigInt(f.function_call_cost.execution)+n*BigInt(f.function_call_cost_per_byte.execution);
if(send.toString()!==doc.plan.fee_calculation.infrastructure_send_gas||exec.toString()!==doc.plan.fee_calculation.infrastructure_receipt_gas||send2.toString()!==doc.plan.fee_calculation.customer_send_gas||exec2.toString()!==doc.plan.fee_calculation.customer_receipt_gas||BigInt(account.amount)<BigInt(doc.plan.funding_summary.required_with_both_upfront_allowances)+BigInt(account.storage_usage)*BigInt(runtime.storage_amount_per_byte))throw Error('Fee schedule or full-plan funding changed');
// Store only public proof metadata. The fresh proof was checked during preparation;
// the exact-byte CLI signature additionally proves the approved signing key.
if(p.proof.expires<=Date.now())throw Error('Prepared owner proof expired; obtain fresh owner proof and inspect before broadcasting the same bytes');
persist(marker,{hash:p.hash,signer:p.signer,nonce:p.nonce,attempted_at:new Date().toISOString(),finalized_preflight:h,balance_before:account.amount,status:'broadcast_attempted_unknown_until_final'});
const result=await rpc('send_tx',{signed_tx_base64:verified.signed,wait_until:'FINAL'});
persist(path.join(root,'artifacts/live/approved-factory-cli-infrastructure.result.json'),result);
console.log(JSON.stringify({hash:p.hash,final_execution_status:result.final_execution_status,status:result.status,receipt_count:result.receipts_outcome?.length,fees_burnt:[result.transaction_outcome,...(result.receipts_outcome||[])].reduce((n,o)=>n+BigInt(o?.outcome?.tokens_burnt||'0'),0n).toString()}));
