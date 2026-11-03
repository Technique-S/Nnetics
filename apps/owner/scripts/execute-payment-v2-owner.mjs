// Explicitly approved V2 only. One named owner transaction per invocation.
// No fresh retries, generic arguments, worker payment, private-key reads or loops.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {actions,PublicKey,createTransaction,baseDecode,baseEncode} from 'near-api-js';
import {verifySetupSignature} from './setup-signature.ts';
import {validateBootstrapAge} from '../src/server/bootstrap-inputs.ts';
const digest='978219497f70b4c76cf87b367eb032192c12566d074488566c40eece43301edf',root='../..',dir=root+'/artifacts/payment-acceptance/v2-outbox';
const load=f=>JSON.parse(fs.readFileSync(f,'utf8')),hash=b=>crypto.createHash('sha256').update(b).digest();
const d=load(root+'/docs/PAYMENT_ACCEPTANCE_TESTNET_V2.json'),p=d.plan;
if(d.digest!==digest||hash(JSON.stringify(p)).toString('hex')!==digest||process.env.NNETICS_APPROVED_PAYMENT_V2!==digest)throw Error('Exact explicit V2 approval required');
const step=p.transactions.find(t=>t.id===process.argv[2]),owner='grandtheft.testnet',ownerKey='ed25519:6vkGFeDZ2Z8M6mfubE4mYQpdr2d3M7eULrHWuonseBhZ';
if(!step||step.signer!==owner)throw Error('One named owner step required; payments must use durable worker');
fs.mkdirSync(dir,{recursive:true});const prefix=dir+'/'+step.id;
if(fs.existsSync(prefix+'.prepared.json')||fs.existsSync(prefix+'.broadcast.json'))throw Error('Step already claimed; reconcile its recorded hash, never sign another');
async function rpc(method,params){const r=await fetch('https://test.rpc.fastnear.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error(`RPC HTTP ${r.status}`);const j=await r.json();if(j.error){const e=Error(j.error.cause?.name||j.error.message);e.rpcCode=j.error.cause?.name;throw e;}return j.result;}
function persist(file,value){const fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(value,null,2));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
const b=await rpc('block',{finality:'final'}),h=b.header.hash,c=await rpc('EXPERIMENTAL_protocol_config',{block_id:h}),status=await rpc('status',[]),vault=p.transactions[1].receiver;
if(status.chain_id!=='testnet'||status.protocol_version!==88||c.protocol_version!==88||c.runtime_config.storage_amount_per_byte!=='10000000000000000000'||BigInt(b.header.gas_price)>100000000n||BigInt(c.runtime_config.min_gas_purchase_price)>1000000000n)throw Error('Network/protocol/price drift');
const cleanup=['pause-after-payment','revoke_agent'].includes(step.id);
if(!cleanup){validateBootstrapAge(p.transactions[1].actions[0].args.checkpoint.head.inner_lite.timestamp,BigInt(b.header.timestamp_nanosec));const proof=load(root+'/artifacts/payment-acceptance/v2-recovery-path-verification.json');if(!proof.ancestry_verified||Date.now()-Date.parse(proof.verified_at)>30*60000)throw Error('Fresh verified recovery path required');}
async function view(method,args={}){const r=await rpc('query',{request_type:'call_function',account_id:vault,block_id:h,method_name:method,args_base64:Buffer.from(JSON.stringify(args)).toString('base64')});return JSON.parse(Buffer.from(r.result).toString());}
const [account,keys,state,access,balance]=await Promise.all([rpc('query',{request_type:'view_account',account_id:vault,block_id:h}),rpc('query',{request_type:'view_access_key_list',account_id:vault,block_id:h}),view('get_vault'),rpc('query',{request_type:'view_access_key',account_id:owner,public_key:ownerKey,block_id:h}),rpc('query',{request_type:'view_account',account_id:owner,block_id:h})]);
if(account.code_hash!=='Fpxm2eovD9cdo5ik6yZURyQEWTbruj6GKJi2XA6UBArJ'||keys.keys.length||state.owner!==owner||access.permission!=='FullAccess'||!Number.isSafeInteger(access.nonce))throw Error('Code/owner/key mismatch');
const ids=new DatabaseSync(root+'/artifacts/live/identities.db',{readOnly:true}),link=ids.prepare('SELECT vault,owner FROM organization_vaults WHERE organization=?').get(p.organization);ids.close();
if(link?.vault!==vault||link?.owner!==owner)throw Error('Organization binding mismatch');
const bills=new DatabaseSync(root+'/artifacts/live/contractors.db',{readOnly:true}),bill=JSON.parse(bills.prepare('SELECT payload FROM demo_bills WHERE id=?').get(p.invoice.id).payload);bills.close();
if(bill.status!=='Approved'||bill.orderId!==p.invoice.billing_order_id||bill.amount!=='0.001'||bill.recipient!=='babygoat.testnet'||hash(bill.originalText).toString('hex')!==p.invoice.original_text_sha256)throw Error('Invoice drift');
if(!cleanup){
 if(!state.paused||String(state.last_attempt)!=='0'||state.spent!=='0'||state.reserved!=='0')throw Error('Pre-payment state mismatch');
 const index=p.transactions.indexOf(step);for(const previous of p.transactions.slice(0,index).filter(t=>t.signer===owner)){const file=dir+'/'+previous.id+'.result.json';if(!fs.existsSync(file))throw Error('Previous owner step not FINAL: '+previous.id);const r=load(file);if(r.final_execution_status!=='FINAL'||!('SuccessValue' in r.status)||r.receipts_outcome?.some(o=>'Failure' in o.outcome.status))throw Error('Previous step not successful');}
 if(step.id==='create-restricted-worker'){try{await rpc('query',{request_type:'view_account',account_id:p.worker.account,block_id:h});throw Error('Worker exists');}catch(e){if(e.rpcCode!=='UNKNOWN_ACCOUNT')throw e;}}
 if(step.id==='initialize_repair_checkpoint'&&(state.agent||await view('get_repair_checkpoint')))throw Error('Checkpoint/agent already installed');
 if(index>1){const checkpoint=await view('get_repair_checkpoint');if(JSON.stringify(checkpoint)!==JSON.stringify(p.transactions[1].actions[0].args.checkpoint))throw Error('Stored checkpoint differs from approved input');}
 if(step.id==='register_vendor'&&await view('get_vendor',{vendor_id:'babygoat-acceptance'}))throw Error('Vendor already exists');
 if(step.id==='approve_work_order'&&await view('get_order',{order_id:'ACCEPTANCE-001'}))throw Error('Order already exists');
 if(step.id==='deposit'&&state.funded!=='0')throw Error('Payment ledger already funded');
 if(step.id==='set_paused'){
  const db=new DatabaseSync(root+'/artifacts/live/contractors.db',{readOnly:true}),intent=db.prepare('SELECT chain_order,payload,state FROM contractor_queue_intents WHERE bill=? AND org=?').get(p.invoice.id,p.organization);db.close();if(intent?.chain_order!=='ACCEPTANCE-001'||intent?.state!=='linked')throw Error('One durable reviewed job required before unpause');
  if(state.funded!=='1000000000000000000000'||state.budget!==state.funded||state.payment_cap!==state.funded||state.agent?.account_id!==p.worker.account||state.agent?.public_key!==p.worker.public_key)throw Error('Funding/budget/cap/agent mismatch');
 }
}
// Reserve all remaining owner caps and deposits, including cleanup, before signing.
let remaining=BigInt(balance.storage_usage)*10000000000000000000n;
for(const t of p.transactions.filter(t=>t.signer===owner))if(!fs.existsSync(dir+'/'+t.id+'.result.json')){remaining+=BigInt(t.maximum_upfront_fee_yocto);for(const a of t.actions)remaining+=BigInt(a.deposit||'0');}
if(BigInt(balance.amount)<remaining)throw Error('Full remaining-plan balance/cleanup reserve insufficient');
const rt=c.runtime_config,r=rt.transaction_costs.action_receipt_creation_config,f=rt.transaction_costs.action_creation_config;let send=BigInt(r.send_not_sir),execute=BigInt(r.execution);
for(const a of step.actions){if(a.type==='FunctionCall'){const n=BigInt(Buffer.byteLength(a.method_name)+Buffer.from(a.args_base64,'base64').length);send+=BigInt(f.function_call_cost.send_not_sir)+n*BigInt(f.function_call_cost_per_byte.send_not_sir);execute+=BigInt(a.gas)+BigInt(f.function_call_cost.execution)+n*BigInt(f.function_call_cost_per_byte.execution);}else if(a.type==='AddKey'){const n=BigInt(Buffer.byteLength('execute_payment'));send+=BigInt(f.add_key_cost.function_call_cost.send_not_sir)+n*BigInt(f.add_key_cost.function_call_cost_per_byte.send_not_sir);execute+=BigInt(f.add_key_cost.function_call_cost.execution)+n*BigInt(f.add_key_cost.function_call_cost_per_byte.execution);}else{const fee=a.type==='CreateAccount'?f.create_account_cost:f.transfer_cost;send+=BigInt(fee.send_not_sir);execute+=BigInt(fee.execution);}}
const allowance=send*BigInt(b.header.gas_price)+execute*BigInt(rt.min_gas_purchase_price);if(allowance>BigInt(step.maximum_upfront_fee_yocto))throw Error('Fee cap exceeded');
const mapped=step.actions.map(a=>a.type==='CreateAccount'?actions.createAccount():a.type==='Transfer'?actions.transfer(BigInt(a.deposit)):a.type==='AddKey'?actions.addFunctionCallAccessKey(PublicKey.fromString(a.public_key),a.permission.FunctionCall.receiver_id,a.permission.FunctionCall.method_names,BigInt(a.permission.FunctionCall.allowance)):actions.functionCall(a.method_name,Buffer.from(a.args_base64,'base64'),BigInt(a.gas),BigInt(a.deposit)));
const tx=createTransaction(owner,PublicKey.fromString(ownerKey),step.receiver,BigInt(access.nonce)+1n,mapped,baseDecode(h)),unsigned=Buffer.from(tx.encode()).toString('base64'),txHash=baseEncode(hash(tx.encode()));
persist(prefix+'.prepared.json',{digest,step:step.id,hash:txHash,unsigned,nonce:String(tx.nonce),block:h,height:b.header.height,balance_before:balance.amount,fee_allowance:allowance.toString(),status:'claimed_before_signing_unknown_until_reconciled'});
const cli='C:/Users/Kazi/AppData/Roaming/npm/node_modules/near-cli-rs/node_modules/.bin_real/near.exe',signedFile=prefix+'.cli-signed.json';
try{execFileSync(cli,['--offline','transaction','sign-transaction',unsigned,'network-config','testnet','sign-with-keychain','--signer-public-key',ownerKey,'--nonce',String(tx.nonce),'--block-hash',h,'--block-height',String(b.header.height),'save-to-file',signedFile],{stdio:'pipe',timeout:30000,maxBuffer:2000000});}catch{throw Error('CLI signing failed/interrupted. Step remains claimed; inspect same outbox without retry.');}
const verified=verifySetupSignature(tx,load(signedFile).signed_transaction_as_base64);if(verified.hash!==txHash)throw Error('Signed hash mismatch');
persist(prefix+'.signed.json',{digest,hash:txHash,signed:verified.signed,signature_verified:true});
persist(prefix+'.broadcast.json',{digest,hash:txHash,time:new Date().toISOString(),status:'one_broadcast_attempt_unknown_until_final'});
const result=await rpc('send_tx',{signed_tx_base64:verified.signed,wait_until:'FINAL'});persist(prefix+'.result.json',result);
if(result.final_execution_status!=='FINAL'||result.transaction.hash!==txHash||!('SuccessValue' in result.status)||result.receipts_outcome?.some(o=>'Failure' in o.outcome.status))throw Error('Non-FINAL/failure result; halt plan and reconcile');
console.log(JSON.stringify({step:step.id,hash:txHash,FINAL:true,tokens_burnt:[result.transaction_outcome,...result.receipts_outcome].reduce((n,o)=>n+BigInt(o.outcome.tokens_burnt),0n).toString()}));
