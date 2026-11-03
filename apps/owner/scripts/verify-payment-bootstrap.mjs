// Reverify immutable approved bootstrap and a current, off-chain recovery path.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {baseDecode,baseEncode,PublicKey} from 'near-api-js';
import {normalizeUpdate,normalizeCheckpoint} from '../../../src/near-proof.ts';
import {validateBootstrapSets,validateBootstrapAge} from '../src/server/bootstrap-inputs.ts';
const dir='../../artifacts/payment-acceptance',raw=JSON.parse(fs.readFileSync(dir+'/bootstrap-raw.json')),update=JSON.parse(fs.readFileSync(dir+'/v2-current-light-update.json'));
const p=JSON.parse(fs.readFileSync('../../docs/PAYMENT_ACCEPTANCE_TESTNET_V2.json')).plan;
const sha=b=>crypto.createHash('sha256').update(b).digest(),H=s=>Buffer.from(baseDecode(s)),cat=(...bs)=>Buffer.concat(bs.map(b=>Buffer.from(b)));
const le=(n,s)=>{let v=BigInt(n),b=Buffer.alloc(s);for(let i=0;i<s;i++){b[i]=Number(v&255n);v>>=8n;}if(v)throw Error('Overflow');return b;};
const str=s=>cat(le(Buffer.byteLength(s),4),Buffer.from(s));
const vh=bps=>sha(cat(le(bps.length,4),...bps.map(v=>cat([0],str(v.account_id),[0],H(v.public_key.slice(8)),le(v.stake,16)))));
function header(l){const h=l.inner_lite;const inner=cat(le(h.height,8),H(h.epoch_id),H(h.next_epoch_id),H(h.prev_state_root),H(h.outcome_root),le(h.timestamp_nanosec,8),H(h.next_bp_hash),H(h.block_merkle_root));return sha(cat(sha(cat(sha(inner),H(l.inner_rest_hash))),H(l.prev_block_hash)));}
function verify(l,bps){const h=header(l),next=sha(cat(H(l.next_block_inner_hash),h)),msg=cat([0],next,le(BigInt(l.inner_lite.height)+2n,8));let total=0n,approved=0n;for(let i=0;i<bps.length;i++){total+=BigInt(bps[i].stake);const s=l.approvals_after_next[i];if(s){if(!s.startsWith('ed25519:')||!PublicKey.fromString(bps[i].public_key).verify(msg,H(s.slice(8))))throw Error('Signature mismatch');approved+=BigInt(bps[i].stake);}}if(approved<=total*2n/3n)throw Error('Quorum insufficient');if(l.next_bps&&!vh(l.next_bps).equals(H(l.inner_lite.next_bp_hash)))throw Error('Validator commitment mismatch');return baseEncode(h);}
validateBootstrapSets(raw.current_bps,raw.block.next_bps,raw.block.approvals_after_next);
const normalized={checkpoint:normalizeCheckpoint(raw.block,raw.current_bps)};
if(sha(JSON.stringify(normalized)).toString('hex')!==p.checkpoint.args_sha256||verify(raw.block,raw.current_bps)!==p.checkpoint.head_hash)throw Error('Approved bootstrap changed');
const current=raw.block.inner_lite,head=update.inner_lite;
if(head.epoch_id!==current.epoch_id&&head.epoch_id!==current.next_epoch_id)throw Error('Unsupported epoch skip');
const signers=head.epoch_id===current.epoch_id?raw.current_bps:raw.block.next_bps;
if(!update.next_bps)throw Error('Following set missing');
validateBootstrapSets(signers,update.next_bps,update.approvals_after_next);normalizeUpdate(update,[]);
const newHash=verify(update,signers);
async function rpc(method,params){const r=await fetch('https://test.rpc.fastnear.com',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)});const j=await r.json();if(j.error)throw Error(j.error.cause?.name||'RPC error');return j.result;}
const final=await rpc('block',{finality:'final'});validateBootstrapAge(current.timestamp_nanosec,BigInt(final.header.timestamp_nanosec));
const canonical=await rpc('block',{block_id:head.height});if(canonical.header.hash!==newHash||head.height>final.header.height)throw Error('Update not canonical finalized');
const proof=await rpc('EXPERIMENTAL_light_client_block_proof',{block_hash:p.checkpoint.head_hash,light_client_head:newHash});let root=H(p.checkpoint.head_hash);
if(proof.block_proof.length>64)throw Error('Ancestry limit');for(const item of proof.block_proof){if(item.direction==='Left')root=sha(cat(H(item.hash),root));else if(item.direction==='Right')root=sha(cat(root,H(item.hash)));else throw Error('Ancestry direction');}
if(!root.equals(H(head.block_merkle_root)))throw Error('Recovery ancestry mismatch');
const e={verified_at:new Date().toISOString(),approved_checkpoint:p.checkpoint.head_hash,quorum_and_commitment:true,recovery_update:newHash,recovery_height:head.height,epoch_transition:head.epoch_id!==current.epoch_id,ancestry_verified:true,on_chain_update_sent:false};
fs.writeFileSync(dir+'/v2-recovery-path-verification.json',JSON.stringify(e,null,2),{flag:'wx'});fs.writeFileSync(dir+'/v2-recovery-ancestry.json',JSON.stringify(proof,null,2),{flag:'wx'});console.log(JSON.stringify(e));
