// Read-only evidence collection and cryptographic checks; never signs or submits.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {baseDecode,baseEncode,PublicKey} from 'near-api-js';
import {normalizeCheckpoint} from '../../../src/near-proof.ts';
import {validateBootstrapSets,validateBootstrapAge} from '../src/server/bootstrap-inputs.ts';
// near.org's legacy archival service is also Fastnear-maintained. A different
// hostname is not a second operator. Intear is separately listed in NEAR docs.
const primary='https://test.rpc.fastnear.com',secondary='https://testnet-rpc.intea.rs';
async function rpc(url,method,params){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error(`RPC HTTP ${r.status}`);const j=await r.json();if(j.error)throw Error(JSON.stringify(j.error));return j.result;}
const sha=b=>crypto.createHash('sha256').update(b).digest(),cat=(...b)=>Buffer.concat(b.map(x=>Buffer.from(x)));
const le=(n,size)=>{let v=BigInt(n),b=Buffer.alloc(size);for(let i=0;i<size;i++){b[i]=Number(v&255n);v>>=8n;}if(v)throw Error('Integer overflow');return b;};
const H=s=>Buffer.from(baseDecode(s));
const str=s=>cat(le(Buffer.byteLength(s),4),Buffer.from(s));
function validatorsHash(bps){return sha(cat(le(bps.length,4),...bps.map(v=>cat([0],str(v.account_id),[0],H(v.public_key.slice(8)),le(v.stake,16)))));}
const final=await rpc(primary,'block',{finality:'final'});
for(const endpoint of [primary,secondary]){const status=await rpc(endpoint,'status',[]);if(status.chain_id!=='testnet'||status.protocol_version!==88)throw Error('Unsupported network/protocol');}
const light=await rpc(primary,'next_light_client_block',{last_block_hash:final.header.epoch_id});
if(!light?.next_bps)throw Error('No next-set commitment in selected light block');
const canonical=await rpc(primary,'block',{block_id:light.inner_lite.height});
const ordered=await rpc(primary,'EXPERIMENTAL_validators_ordered',{block_id:canonical.header.hash});
const otherBlock=await rpc(secondary,'block',{block_id:canonical.header.height});
const otherOrdered=await rpc(secondary,'EXPERIMENTAL_validators_ordered',{block_id:canonical.header.hash});
if(otherBlock.header.hash!==canonical.header.hash||JSON.stringify(otherOrdered)!==JSON.stringify(ordered))throw Error('Providers disagree');
validateBootstrapSets(ordered,light.next_bps,light.approvals_after_next);
validateBootstrapAge(light.inner_lite.timestamp_nanosec,BigInt(final.header.timestamp_nanosec));
const c=normalizeCheckpoint(light,ordered),h=light.inner_lite;
const inner=cat(le(h.height,8),H(h.epoch_id),H(h.next_epoch_id),H(h.prev_state_root),H(h.outcome_root),le(h.timestamp_nanosec,8),H(h.next_bp_hash),H(h.block_merkle_root));
const blockHash=sha(cat(sha(cat(sha(inner),H(light.inner_rest_hash))),H(light.prev_block_hash)));
if(baseEncode(blockHash)!==canonical.header.hash||!validatorsHash(light.next_bps).equals(H(h.next_bp_hash)))throw Error('Header/next-validator commitment mismatch');
if(h.epoch_id!==canonical.header.epoch_id||h.next_epoch_id!==canonical.header.next_epoch_id||h.epoch_id===h.next_epoch_id||BigInt(h.height)>BigInt(final.header.height)||BigInt(h.timestamp_nanosec)>BigInt(final.header.timestamp_nanosec))throw Error('Epoch/finality mismatch');
const nextHash=sha(cat(H(light.next_block_inner_hash),blockHash));
const message=cat([0],nextHash,le(BigInt(h.height)+2n,8));
let total=0n,approved=0n;
for(let i=0;i<ordered.length;i++){const v=ordered[i];total+=BigInt(v.stake);const s=light.approvals_after_next[i];if(s){if(!PublicKey.fromString(v.public_key).verify(message,H(s.slice(8))))throw Error('Invalid current-set signature');approved+=BigInt(v.stake);}}
if(approved<=total*2n/3n)throw Error('Finality quorum insufficient');
const args={checkpoint:c},bytes=Buffer.byteLength(JSON.stringify(args));if(bytes>128000)throw Error('Checkpoint request exceeds contract bound');
const result={collected_at:new Date().toISOString(),providers:[primary,secondary],head_hash:canonical.header.hash,height:h.height,epoch_id:h.epoch_id,next_epoch_id:h.next_epoch_id,current_validators:ordered.length,next_validators:light.next_bps.length,approved_stake:approved.toString(),total_stake:total.toString(),args_bytes:bytes,args_sha256:sha(JSON.stringify(args)).toString('hex'),checks:{canonical_header:true,provider_agreement:true,next_set_commitment:true,current_quorum:true},trust_note:'Current ordered validators and initial checkpoint still require explicit trusted-bootstrap review; provider agreement and an implementation-author check are not independent security review.'};
const dir='../../artifacts/payment-acceptance';fs.mkdirSync(dir,{recursive:true});
for(const [name,value]of Object.entries({'bootstrap-raw':{block:light,current_bps:ordered,canonical,otherBlock},'checkpoint-args':args,'bootstrap-review':result}))fs.writeFileSync(`${dir}/${name}.json`,JSON.stringify(value,null,2),{flag:'wx'});
console.log(JSON.stringify(result,null,2));
