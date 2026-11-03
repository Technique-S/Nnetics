// Prepare only. No credential reads, signing, broadcasting, or automatic retries.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {actions,PublicKey,createTransaction,baseDecode,baseEncode,Transaction} from 'near-api-js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const sha=b=>crypto.createHash('sha256').update(b).digest();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const approved='0f569790060daca8ffb0f51a8aebd9c5ae80b94e1cde253ec1db32f99cabfa6a';
const amendment='bca85c64ac11e4a0a14808d290980c47db89353fa2450930f34022291cc91ae8';
const doc=read('docs/FRESH_USER_TESTNET_PLAN.json'),cli=read('docs/CLI_FACTORY_HANDOFF_PLAN.json');
for(const [d,digest] of [[doc,approved],[cli,amendment]])if(d.digest!==digest||sha(JSON.stringify(d.plan)).toString('hex')!==digest)throw Error('Approved plan changed');
const p=doc.plan,c=cli.plan,step=p.transactions[0];
if(JSON.stringify(c.actions)!==JSON.stringify(step.actions)||c.signer!==p.signer||c.receiver!==step.receiver)throw Error('Amendment scope differs');
const artifact=path.join(root,'artifacts/github/07181a0-provisioning-88/provisioning/factory.wasm');
const wasm=fs.readFileSync(artifact),vault=fs.readFileSync(path.join(path.dirname(artifact),'vault-provisioning.wasm'));
if(wasm.length!==c.actions[2].code_bytes||sha(wasm).toString('hex')!==c.actions[2].code_sha256||sha(vault).toString('hex')!==p.expected_vault_sha256)throw Error('Artifact mismatch');
const outbox=path.join(root,'artifacts/live/approved-factory-cli-infrastructure.json');
const signedFile=path.join(root,'artifacts/live/approved-factory-cli-infrastructure.cli-signed.json');
if(fs.existsSync(outbox)||fs.existsSync(signedFile))throw Error('CLI attempt already exists; reconcile it, never prepare another nonce');
const original=read(c.old_attempt.outbox);
if(original.hash!==c.old_attempt.hash||original.nonce!==c.old_attempt.nonce||original.finalized_height!==c.old_attempt.reference_height)throw Error('Original outbox mismatch');
async function rpc(method,params){const r=await fetch('https://test.rpc.fastnear.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:method,method,params}),signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error(`RPC HTTP ${r.status}`);const j=await r.json();if(j.error){const e=Error(j.error.cause?.name||'RPC error');e.rpcError=j.error;throw e;}return j.result;}
const status=await rpc('status',[]),block=await rpc('block',{finality:'final'}),h=block.header.hash;
const config=await rpc('EXPERIMENTAL_protocol_config',{block_id:h});
if(status.chain_id!=='testnet'||status.protocol_version!==88||config.protocol_version!==88)throw Error('Network/protocol changed');
const reference=await rpc('block',{block_id:c.old_attempt.reference_height});
if(reference.header.hash!==original.finalized_block||config.transaction_validity_period!==86400||block.header.height<=reference.header.height+86400)throw Error('Original validity unresolved');
try{await rpc('tx',{tx_hash:original.hash,sender_account_id:p.signer,wait_until:'NONE'});throw Error('Original transaction exists; inspect before replacement');}catch(e){if(e.rpcError?.cause?.name!=='UNKNOWN_TRANSACTION')throw e;}
const key=await rpc('query',{request_type:'view_access_key',account_id:p.signer,public_key:c.public_key,block_id:h});
const oldKey=await rpc('query',{request_type:'view_access_key',account_id:p.signer,public_key:c.old_attempt.public_key,block_id:h});
if(oldKey.nonce!==Number(c.old_attempt.nonce)-1||key.permission!=='FullAccess'||!Number.isSafeInteger(key.nonce))throw Error('Key/nonce changed; investigate');
const owner=await rpc('query',{request_type:'view_account',account_id:p.signer,block_id:h});
for(const account_id of [step.receiver,p.expected_vault]){try{await rpc('query',{request_type:'view_account',account_id,block_id:h});throw Error('Target already exists');}catch(e){if(e.rpcError?.cause?.name!=='UNKNOWN_ACCOUNT')throw e;}}
const runtime=config.runtime_config,fees=runtime.transaction_costs.action_creation_config,receipt=runtime.transaction_costs.action_receipt_creation_config;
const price=BigInt(block.header.gas_price),purchase=BigInt(runtime.min_gas_purchase_price)>price?BigInt(runtime.min_gas_purchase_price):price;
if(runtime.storage_amount_per_byte!==p.preflight.storage_amount_per_byte||price>100000000n||purchase>1000000000n)throw Error('Repricing approval required');
const send=BigInt(receipt.send_not_sir)+BigInt(fees.create_account_cost.send_not_sir)+BigInt(fees.transfer_cost.send_not_sir)+BigInt(fees.deploy_contract_cost.send_not_sir)+BigInt(wasm.length)*BigInt(fees.deploy_contract_cost_per_byte.send_not_sir);
const execution=BigInt(receipt.execution)+BigInt(fees.create_account_cost.execution)+BigInt(fees.transfer_cost.execution)+BigInt(fees.deploy_contract_cost.execution)+BigInt(wasm.length)*BigInt(fees.deploy_contract_cost_per_byte.execution);
const call=p.transactions[1].actions[0],argBytes=BigInt(Buffer.byteLength(call.method_name)+Buffer.byteLength(call.args_utf8));
const send2=BigInt(receipt.send_not_sir)+BigInt(fees.function_call_cost.send_not_sir)+argBytes*BigInt(fees.function_call_cost_per_byte.send_not_sir);
const execution2=BigInt(call.gas)+BigInt(receipt.execution)+BigInt(fees.function_call_cost.execution)+argBytes*BigInt(fees.function_call_cost_per_byte.execution);
if(send.toString()!==p.fee_calculation.infrastructure_send_gas||execution.toString()!==p.fee_calculation.infrastructure_receipt_gas||send2.toString()!==p.fee_calculation.customer_send_gas||execution2.toString()!==p.fee_calculation.customer_receipt_gas)throw Error('Fee schedule changed');
const fee=send*price+execution*purchase,fee2=send2*price+execution2*purchase;
if(fee>BigInt(c.maximum_upfront_fee_allowance)||fee2>BigInt(p.transactions[1].upfront_fee_allowance_yocto))throw Error('Fee allowance exceeded');
const required=BigInt(step.actions[1].deposit)+BigInt(call.deposit)+fee+fee2+BigInt(owner.storage_usage)*BigInt(runtime.storage_amount_per_byte);
if(BigInt(owner.amount)<required)throw Error('Insufficient full-plan balance including owner storage');
const db=new DatabaseSync(path.join(root,'artifacts/live/identities.db'),{readOnly:true});
let proof;
try{proof=db.prepare(`SELECT s.account,s.public_key,s.expires FROM identity_sessions s JOIN identity_browsers b ON b.id=s.browser AND b.generation=s.generation WHERE s.account=? AND s.expires>? AND s.context=? ORDER BY s.expires DESC LIMIT 1`).get(p.signer,Date.now(),JSON.stringify(['wallet-identity-v2','testnet','http://127.0.0.1:3100']));}finally{db.close();}
if(!proof||!p.permitted_existing_full_access_keys.includes(proof.public_key))throw Error('Fresh Grandtheft Meteor identity proof required');
const proofKey=await rpc('query',{request_type:'view_access_key',account_id:p.signer,public_key:proof.public_key,block_id:h});
if(proofKey.permission!=='FullAccess'||proof.expires<=Date.now())throw Error('Owner proof key changed or expired');
const nonce=String(BigInt(key.nonce)+1n);
const tx=createTransaction(p.signer,PublicKey.fromString(c.public_key),step.receiver,BigInt(nonce),[actions.createAccount(),actions.transfer(BigInt(step.actions[1].deposit)),actions.deployContract(wasm)],baseDecode(h));
const bytes=Buffer.from(tx.encode());if(!Buffer.from(Transaction.decode(bytes).encode()).equals(bytes))throw Error('Noncanonical unsigned transaction');
const prepared={plan_digest:approved,amendment_digest:amendment,prepared_at:new Date().toISOString(),status:'prepared_owner_offline_signature_required',signer:p.signer,public_key:c.public_key,receiver:step.receiver,actions:step.actions,nonce,previous_nonce:String(key.nonce),finalized_block:h,finalized_height:block.header.height,validity_blocks:86400,balance_before:owner.amount,owner_storage_reserve:(BigInt(owner.storage_usage)*BigInt(runtime.storage_amount_per_byte)).toString(),infrastructure_fee_allowance:fee.toString(),customer_fee_allowance:fee2.toString(),full_plan_required:required.toString(),remaining_after_allowances:(BigInt(owner.amount)-required).toString(),artifacts:{factory:sha(wasm).toString('hex'),vault:sha(vault).toString('hex')},proof,old_attempt_expired:true,unsigned:bytes.toString('base64'),hash:baseEncode(sha(bytes)),unsigned_sha256:sha(bytes).toString('hex')};
const fd=fs.openSync(outbox,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(prepared,null,2));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
const exe='C:/Users/Kazi/AppData/Roaming/npm/node_modules/near-cli-rs/node_modules/.bin_real/near.exe';
const quote=s=>`'${s.replaceAll("'","''")}'`;
const argv=['--offline','transaction','construct-transaction',p.signer,'receiver-id',step.receiver,'add-action','create-account','add-action','transfer','6.3324 NEAR','add-action','deploy-contract','use-file',artifact,'without-init-call','skip','network-config','testnet','sign-with-keychain','--signer-public-key',c.public_key,'--nonce',nonce,'--block-hash',h,'--block-height',String(block.header.height),'save-to-file',signedFile];
const command=`& ${quote(exe)} ${argv.map(quote).join(' ')}`;
const ps=`# Owner-run OFFLINE signing only. Saves a transaction; never broadcasts.\n$ErrorActionPreference='Stop'\nif(Test-Path -LiteralPath ${quote(signedFile)}){throw 'Signed output already exists; do not sign again.'}\nif((Get-FileHash -LiteralPath ${quote(artifact)} -Algorithm SHA256).Hash.ToLowerInvariant() -ne '${prepared.artifacts.factory}'){throw 'Factory artifact changed'}\n${command}\nif($LASTEXITCODE -ne 0){throw 'CLI signing did not complete. Do not retry or send; report the non-secret error.'}\n`;
const commandFile=path.join(root,'artifacts/live/sign-approved-factory.ps1');
fs.writeFileSync(commandFile,ps,{flag:'wx',mode:0o600});
console.log(JSON.stringify({prepared:true,outbox,commandFile,signedFile,...Object.fromEntries(Object.entries(prepared).filter(([k])=>k!=='unsigned')),command},null,2));
