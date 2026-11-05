/** Local preflight mirroring the pinned Rust verifier. The contract remains authoritative.
 * Never creates a new trust root, signs, submits, or marks a proposed head installed.
 */
import {createHash} from 'node:crypto';
import {PublicKey,baseEncode} from 'near-api-js';
import {isDeepStrictEqual} from 'node:util';
import type {DatabaseSync} from 'node:sqlite';
import {CHECKPOINT_MAX_AGE_NS} from './checkpoint-validity.ts';
const check=(v:unknown,m:string)=>{if(!v)throw Error(m);};
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest();
const cat=(...a:Uint8Array[])=>Buffer.concat(a);
const le=(v:string|number,n:number)=>{check(/^(0|[1-9][0-9]*)$/.test(String(v)),'Invalid integer');let x=BigInt(v);const b=Buffer.alloc(n);for(let i=0;i<n;i++){b[i]=Number(x&255n);x>>=8n;}check(x===0n,'Integer overflow');return b;};
const hash=(v:any)=>{check(Array.isArray(v)&&v.length===32&&v.every(x=>Number.isInteger(x)&&x>=0&&x<=255),'Invalid hash');return Buffer.from(v);};
export function checkpointHeadHash(h:any):Buffer {
 const i=h.inner_lite;
 return sha(cat(sha(cat(sha(cat(le(i.height,8),hash(i.epoch_id),hash(i.next_epoch_id),hash(i.prev_state_root),hash(i.outcome_root),le(i.timestamp,8),hash(i.next_bp_hash),hash(i.block_merkle_root))),hash(h.inner_rest_hash))),hash(h.prev_block_hash)));
}
function validators(v:any[]) {
 check(Array.isArray(v)&&v.length>0&&v.length<=128,'Validator bounds');
 const ids=new Set();let total=0n;
 const bytes=v.map(x=>{check(typeof x.account_id==='string'&&/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(x.account_id)&&x.account_id.length<=64&&!ids.has(x.account_id),'Validator identity');ids.add(x.account_id);check(typeof x.public_key==='string'&&x.public_key.startsWith('ed25519:'),'Validator key');const key=PublicKey.fromString(x.public_key);total+=BigInt(x.stake);check(BigInt(x.stake)>0n&&total<(1n<<128n),'Validator stake');const id=Buffer.from(x.account_id);return cat(Buffer.from([0]),le(id.length,4),id,Buffer.from(key.toString().startsWith('ed25519:')?[0]:[255]),Buffer.from(key.data),le(x.stake,16));});
 return {total,commitment:sha(cat(le(v.length,4),...bytes))};
}
export function verifyCheckpointAdvance(current:any,update:any,finalized:{height:string;timestamp:string}) {
 const old=current.head.inner_lite,next=update.header.inner_lite;
 validators(current.current_bps);validators(current.next_bps);
 check(validators(current.next_bps).commitment.equals(hash(old.next_bp_hash)),'Stored next-validator commitment');
 check(BigInt(next.height)>BigInt(old.height)&&BigInt(next.timestamp)>BigInt(old.timestamp),'Stale checkpoint update');
 check(BigInt(next.height)<=BigInt(finalized.height)&&BigInt(next.timestamp)<=BigInt(finalized.timestamp),'Future checkpoint update');
 check(!isDeepStrictEqual(next.epoch_id,next.next_epoch_id),'Invalid epochs');
 const transition=isDeepStrictEqual(next.epoch_id,old.next_epoch_id);
 check(transition||isDeepStrictEqual(next.epoch_id,old.epoch_id),'Unsupported epoch skip');
 if(!transition)check(isDeepStrictEqual(next.next_epoch_id,old.next_epoch_id)&&isDeepStrictEqual(next.next_bp_hash,old.next_bp_hash),'Changed validator commitment');
 check(!transition||update.next_bps!==null,'Next validator set required');
 check(Array.isArray(update.ancestry)&&update.ancestry.length<=64,'Ancestry bounds');let root=checkpointHeadHash(current.head);
 for(const p of update.ancestry){check(p.direction==='Left'||p.direction==='Right','Ancestry direction');root=sha(p.direction==='Left'?cat(hash(p.hash),root):cat(root,hash(p.hash)));}
 check(root.equals(hash(next.block_merkle_root)),'Checkpoint ancestry mismatch');
 const signers=transition?current.next_bps:current.current_bps;
 check(Array.isArray(update.approvals_after_next)&&update.approvals_after_next.length<=256,'Approval bounds');
 const message=cat(Buffer.from([0]),sha(cat(hash(update.next_block_inner_hash),checkpointHeadHash(update.header))),le(String(BigInt(next.height)+2n),8));let approved=0n;
 for(let i=0;i<signers.length;i++){const signature=update.approvals_after_next[i];if(signature!==null&&signature!==undefined){const b=Buffer.from(signature,'base64');check(b.length===64&&b.toString('base64')===signature&&PublicKey.fromString(signers[i].public_key).verify(message,b),'Invalid checkpoint signature');approved+=BigInt(signers[i].stake);}}
 check(approved>validators(signers).total*2n/3n,'Insufficient checkpoint quorum');
 const following=update.next_bps??current.next_bps;
 check(validators(following).commitment.equals(hash(next.next_bp_hash)),'Next-validator commitment mismatch');
 const checkpoint={head:update.header,current_bps:transition?current.next_bps:current.current_bps,next_bps:following};
 return {checkpoint,from:baseEncode(checkpointHeadHash(current.head)),to:baseEncode(checkpointHeadHash(update.header)),fresh:BigInt(finalized.timestamp)-BigInt(next.timestamp)<CHECKPOINT_MAX_AGE_NS,args:{update},gas:'250000000000000',deposit:'0'};
}
export function stageCheckpointAdvance(db:DatabaseSync,vault:string,current:any,update:any,finalized:{height:string;timestamp:string}) {
 const verified=verifyCheckpointAdvance(current,update,finalized),payload=JSON.stringify({vault,...verified});
 check(Buffer.byteLength(JSON.stringify(verified.args))<=65536,'Checkpoint request too large');
 const id=createHash('sha256').update(payload).digest('hex');
 db.exec('CREATE TABLE IF NOT EXISTS checkpoint_updates(id TEXT PRIMARY KEY,vault TEXT,previous TEXT,next TEXT,payload TEXT,state TEXT,UNIQUE(vault,previous))');
 db.exec('BEGIN IMMEDIATE');try{
  const prior=db.prepare('SELECT id,payload,state FROM checkpoint_updates WHERE vault=? AND previous=?').get(vault,verified.from) as {id:string;payload:string;state:string}|undefined;
  if(prior){check(JSON.parse(prior.payload).to===verified.to,'Conflicting checkpoint proposal; reconcile existing update');db.exec('COMMIT');return {id:prior.id,...JSON.parse(prior.payload),fresh:verified.fresh,state:prior.state};}
  db.prepare('INSERT INTO checkpoint_updates VALUES (?,?,?,?,?,?)').run(id,vault,verified.from,verified.to,payload,'awaiting_approval');db.exec('COMMIT');return {id,...verified,state:'awaiting_approval'};
 }catch(e){db.exec('ROLLBACK');throw e;}
}
/** Only call with a pinned finalized contract read, never an RPC-proposed head.
 * A later head is insufficient to establish which proposal executed.
 */
export function reconcileCheckpointStages(db:DatabaseSync,vault:string,installed:any) {
 db.exec('CREATE TABLE IF NOT EXISTS checkpoint_updates(id TEXT PRIMARY KEY,vault TEXT,previous TEXT,next TEXT,payload TEXT,state TEXT,UNIQUE(vault,previous))');
 const head=baseEncode(checkpointHeadHash(installed.head));
 db.exec('BEGIN IMMEDIATE');try{
  for(const row of db.prepare('SELECT id,payload FROM checkpoint_updates WHERE vault=? AND next=?').all(vault,head) as {id:string;payload:string}[]){
   const proposal=JSON.parse(row.payload);
   check(isDeepStrictEqual(installed,proposal.checkpoint),'Installed checkpoint differs from staged authenticated update');
   db.prepare("UPDATE checkpoint_updates SET state='installed' WHERE id=?").run(row.id);
  }
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
}
