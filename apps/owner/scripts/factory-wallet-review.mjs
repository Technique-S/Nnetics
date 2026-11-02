// One approved infrastructure transaction only. No private keys, server signing,
// server broadcasting, generic action input, or fresh-nonce retries.
// 2026-11-02 actual result: Meteor blocked DeployContract from apps. This tool is
// retained as evidence, not a supported deployment route. Its server is stopped.
// Preserve/reconcile the existing outbox; never disable the wallet protection.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { actions, PublicKey, createTransaction, baseDecode, baseEncode } from 'near-api-js';

const root = path.resolve('../..');
const approved = '0f569790060daca8ffb0f51a8aebd9c5ae80b94e1cde253ec1db32f99cabfa6a';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest();
const doc = JSON.parse(fs.readFileSync(path.join(root, 'docs/FRESH_USER_TESTNET_PLAN.json'), 'utf8'));
if (doc.digest !== approved || sha(JSON.stringify(doc.plan)).toString('hex') !== approved ||
    process.env.NNETICS_FACTORY_REVIEW_APPROVED_DIGEST !== approved) throw Error('Exact approval required');
const p = doc.plan, step = p.transactions[0];
if (p.network !== 'testnet' || p.signer !== 'grandtheft.testnet' || step.receiver !== 'v.grandtheft.testnet' ||
    JSON.stringify(step.actions.map(a => a.type)) !== '["CreateAccount","Transfer","DeployContract"]' ||
    step.actions[1].deposit !== '6332400000000000000000000') throw Error('Unexpected scope');
const wasm = fs.readFileSync(path.join(root, 'artifacts/github/07181a0-provisioning-88/provisioning/factory.wasm'));
if (wasm.length !== step.actions[2].code_bytes || sha(wasm).toString('hex') !== step.actions[2].code_sha256) throw Error('Artifact mismatch');
const dir = path.join(root, 'artifacts/live');
const outbox = path.join(dir, 'approved-factory-infrastructure.json');
const resultFile = path.join(dir, 'approved-factory-infrastructure.result.json');
const rpcUrl = 'https://test.rpc.fastnear.com';
const origin = 'http://127.0.0.1:3101';
async function rpc(method, params) {
  const r = await fetch(rpcUrl, {method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0', id:'factory-review', method, params}), signal:AbortSignal.timeout(25000)});
  if (!r.ok) throw Error(`RPC HTTP ${r.status}`);
  const j = await r.json();
  if (j.error) { const e = Error(JSON.stringify(j.error)); e.rpcError = j.error; throw e; }
  return j.result;
}
function readProof() {
  const db = new DatabaseSync(path.join(dir, 'identities.db'), {readOnly:true});
  try {
    const proof = db.prepare(`SELECT s.account, s.public_key, s.expires FROM identity_sessions s
      JOIN identity_browsers b ON b.id=s.browser AND b.generation=s.generation
      WHERE s.account=? AND s.expires>? AND s.context=? ORDER BY s.expires DESC LIMIT 1`)
      .get(p.signer, Date.now(), JSON.stringify(['wallet-identity-v2','testnet','http://127.0.0.1:3100']));
    if (!proof || !p.permitted_existing_full_access_keys.includes(proof.public_key)) throw Error('Fresh verified Meteor proof required');
    return proof;
  } finally { db.close(); }
}
// Capture only verified public identity metadata before the deployment review
// tab causes the application to revoke its browser session on focus loss.
const proof = fs.existsSync(outbox) ? null : readProof();
async function preflight() {
  if (!proof || proof.expires <= Date.now()) throw Error('Verified proof expired; return to login');
  const status = await rpc('status', []);
  if (status.chain_id !== 'testnet' || status.protocol_version !== 88) throw Error('Wrong network/protocol');
  const block = await rpc('block', {finality:'final'}), h = block.header.hash;
  const config = await rpc('EXPERIMENTAL_protocol_config', {block_id:h});
  const c = config.runtime_config, f = c.transaction_costs.action_creation_config;
  const receipt = c.transaction_costs.action_receipt_creation_config;
  if (config.protocol_version !== 88 || c.storage_amount_per_byte !== p.preflight.storage_amount_per_byte ||
      BigInt(block.header.gas_price) > 100000000n || BigInt(c.min_gas_purchase_price) > 1000000000n) throw Error('Repricing approval required');
  const price = BigInt(block.header.gas_price), purchase = BigInt(c.min_gas_purchase_price) > price ? BigInt(c.min_gas_purchase_price) : price;
  const send = BigInt(receipt.send_not_sir) + BigInt(f.create_account_cost.send_not_sir) + BigInt(f.transfer_cost.send_not_sir) + BigInt(f.deploy_contract_cost.send_not_sir) + BigInt(wasm.length)*BigInt(f.deploy_contract_cost_per_byte.send_not_sir);
  const execution = BigInt(receipt.execution) + BigInt(f.create_account_cost.execution) + BigInt(f.transfer_cost.execution) + BigInt(f.deploy_contract_cost.execution) + BigInt(wasm.length)*BigInt(f.deploy_contract_cost_per_byte.execution);
  if (send.toString() !== p.fee_calculation.infrastructure_send_gas || execution.toString() !== p.fee_calculation.infrastructure_receipt_gas ||
      send*price + execution*purchase > BigInt(step.upfront_fee_allowance_yocto)) throw Error('Fee schedule changed');
  const account = await rpc('query', {request_type:'view_account', account_id:p.signer, block_id:h});
  const key = await rpc('query', {request_type:'view_access_key', account_id:p.signer, public_key:proof.public_key, block_id:h});
  if (key.permission !== 'FullAccess' || !Number.isSafeInteger(key.nonce) || BigInt(account.amount) < BigInt(p.funding_summary.required_with_both_upfront_allowances)) throw Error('Key or full-plan funding check failed');
  for (const id of [step.receiver,p.expected_vault]) {
    try { await rpc('query', {request_type:'view_account',account_id:id,block_id:h}); throw Error('Target exists: '+id); }
    catch(e) { if (e.rpcError?.cause?.name !== 'UNKNOWN_ACCOUNT') throw e; }
  }
  const tx = createTransaction(p.signer,PublicKey.fromString(proof.public_key),step.receiver,BigInt(key.nonce)+1n,
    [actions.createAccount(),actions.transfer(BigInt(step.actions[1].deposit)),actions.deployContract(wasm)],baseDecode(h));
  return {plan_digest:approved, signer:p.signer, public_key:proof.public_key, receiver:step.receiver,
    unsigned:Buffer.from(tx.encode()).toString('base64'), hash:baseEncode(sha(tx.encode())),
    unsigned_sha256:sha(tx.encode()).toString('hex'), nonce:String(BigInt(key.nonce)+1n),
    finalized_block:h, finalized_height:block.header.height, balance_before:account.amount,
    proof_expires:proof.expires, status:'prepared_unknown_until_reconciled'};
}
let busy = false;
const review = {network:p.network,signer:p.signer,publicKey:proof?.public_key,receiver:step.receiver,
  actions:step.actions,planDigest:approved,feeAllowance:step.upfront_fee_allowance_yocto};
const html = `<!doctype html><meta charset="utf-8"><title>Nnetics approved factory deployment</title>
<style>body{font:17px system-ui;max-width:850px;margin:36px auto;padding:20px;background:#101824;color:#edf4ff}pre{white-space:pre-wrap;overflow-wrap:anywhere}button{padding:16px;font-size:18px}#status{padding:16px}</style>
<h1>Approved NEAR testnet infrastructure</h1><p>Deploy the pinned, locked factory. Transfer 6.3324 testnet NEAR. No keys, payments or unpause.</p>
<p>This local deployment tool is separate from organization authorization. Your fresh Grandtheft login was verified before opening it. Meteor must approve the exact signer and actions.</p>
<pre>${JSON.stringify(review,null,2)}</pre><button id="sign">Request this approved deployment in Meteor</button><p id="status">No transaction requested.</p>
<script>
const button=document.querySelector('#sign'),output=document.querySelector('#status');
button.onclick=async()=>{button.disabled=true;try{
 const response=await fetch('/dispatch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({digest:${JSON.stringify(approved)}})});
 const tx=await response.json();if(!response.ok)throw Error(tx.error);
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',Uint8Array.from(atob(tx.unsigned),c=>c.charCodeAt(0))))).map(b=>b.toString(16).padStart(2,'0')).join('');
 if(digest!==tx.unsigned_sha256)throw Error('Transaction hash mismatch');
 output.textContent='Recorded transaction '+tx.hash+'. Approve only Grandtheft / testnet / 6.3324 NEAR / CreateAccount + Transfer + DeployContract in Meteor.';
 const ext=window.meteorCom;if(!ext)throw Error('Enable Meteor extension for this local page. Outcome remains blocked; reconcile the recorded hash.');
 const uid=crypto.randomUUID();let status='initializing',closed=false;
 const send=()=>ext.sendMessageData({uid,status,network:'testnet',actionType:'sign',endTags:[],...(status==='initializing'?{inputs:{transactions:tx.unsigned}}:{})});
 const stop=message=>{if(closed)return;closed=true;clearInterval(timer);clearTimeout(timeout);output.textContent=message+' Recorded hash: '+tx.hash;};
 ext.addMessageDataListener(data=>{if(!data||data.uid!==uid)return;if((data.network&&data.network!=='testnet')||(data.actionType&&data.actionType!=='sign'))return stop('Mismatched wallet response; reconcile before retry.');
 if(data.status==='connected')status='connected';else if(data.status==='closed_success')stop('Wallet returned success; authoritative chain verification is still required.');else if(['closed_fail','closed_window','disconnected'].includes(data.status))stop('Wallet cancelled or failed; outcome unknown until reconciliation.');});
 const timer=setInterval(send,450),timeout=setTimeout(()=>stop('Wallet timeout; reconcile before retry.'),120000);send();
 }catch(e){output.textContent=e.message+' Do not retry with a new transaction.';}};
</script>`;
const server = http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Frame-Options','DENY');res.setHeader('X-Content-Type-Options','nosniff');
  if (req.headers.host !== '127.0.0.1:3101') {res.writeHead(403).end();return;}
  try {
    if(req.method==='GET'&&req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
    if(req.method==='POST'&&req.url==='/dispatch'){
      if(req.headers.origin!==origin||req.headers['content-type']!=='application/json'||busy||fs.existsSync(outbox))throw Error('Dispatch denied; reconcile existing outbox');
      busy=true;try{
        let body='';for await(const chunk of req){body+=chunk;if(body.length>1024)throw Error('Oversized request');}
        if(JSON.parse(body).digest!==approved)throw Error('Wrong digest');
        const prepared=await preflight();fs.mkdirSync(dir,{recursive:true});const fd=fs.openSync(outbox,'wx',0o600);
        try{fs.writeFileSync(fd,JSON.stringify(prepared,null,2));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
        res.setHeader('Content-Type','application/json');res.end(JSON.stringify(prepared));
      }finally{busy=false;}return;
    }
    res.writeHead(404).end();
  }catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}
});
if(process.argv.includes('--preflight-only')){
  const check=await preflight();
  console.log(JSON.stringify({checked:true,signer:check.signer,public_key:check.public_key,receiver:check.receiver,
    finalized_height:check.finalized_height,balance:check.balance_before,outbox_created:false}));
}else server.listen(3101,'127.0.0.1',()=>console.log(`Exact approved factory review: ${origin}; no signing/broadcast until the user requests Meteor. Outbox exists: ${fs.existsSync(outbox)}.`));
