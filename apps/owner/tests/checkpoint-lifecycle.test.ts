import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {baseEncode,baseDecode} from 'near-api-js';
import {DatabaseSync} from 'node:sqlite';
import {checkpointHeadHash,verifyCheckpointAdvance,stageCheckpointAdvance,reconcileCheckpointStages} from '../src/server/checkpoint-lifecycle.ts';
const h=(s:string)=>[...createHash('sha256').update(s).digest()];
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest();
const le=(v:bigint,n:number)=>{const b=Buffer.alloc(n);for(let i=0;i<n;i++){b[i]=Number(v&255n);v>>=8n;}return b;};
function fixture(transition=false){
 const keys=Array.from({length:3},()=>generateKeyPairSync('ed25519'));
 const validators=keys.map((k,i)=>({account_id:`validator${i}.testnet`,public_key:'ed25519:'+baseEncode(k.publicKey.export({format:'der',type:'spki'}).subarray(-32)),stake:'1'}));
 const commitment=[...sha(Buffer.concat([le(3n,4),...validators.map(v=>{const id=Buffer.from(v.account_id);return Buffer.concat([Buffer.from([0]),le(BigInt(id.length),4),id,Buffer.from([0]),Buffer.from(baseDecode(v.public_key.slice(8))),le(1n,16)]);})]))];
 const current={head:{prev_block_hash:h('prev'),inner_rest_hash:h('rest'),inner_lite:{height:'50',timestamp:'1000000000',epoch_id:h('epoch'),next_epoch_id:h('next'),prev_state_root:h('state'),outcome_root:h('outcome'),next_bp_hash:commitment,block_merkle_root:h('root')}},current_bps:validators,next_bps:validators};
 const header=structuredClone(current.head);Object.assign(header.inner_lite,{height:'51',timestamp:'2000000000',block_merkle_root:[...checkpointHeadHash(current.head)]});
 if(transition){header.inner_lite.epoch_id=h('next');header.inner_lite.next_epoch_id=h('following');}
 const nextHash=h('nextinner'),message=Buffer.concat([Buffer.from([0]),sha(Buffer.concat([Buffer.from(nextHash),checkpointHeadHash(header)])),le(53n,8)]);
 const update={header,next_block_inner_hash:nextHash,next_bps:validators,approvals_after_next:keys.map(k=>sign(null,message,k.privateKey).toString('base64')),ancestry:[]};
 return {current,update,finalized:{height:'60',timestamp:'3000000000'}};
}
for(const transition of [false,true])test(`authenticated checkpoint update verifies ${transition?'next epoch':'same epoch'} without changing root trust`,()=>{const f=fixture(transition),r=verifyCheckpointAdvance(f.current,f.update,f.finalized);assert.equal(r.checkpoint.head.inner_lite.height,'51');assert.equal(r.fresh,true);assert.equal(r.gas,'250000000000000');assert.equal(r.deposit,'0');assert.equal(f.current.head.inner_lite.height,'50');});
for(const [name,change] of [
 ['epoch skip',(f:any)=>f.update.header.inner_lite.epoch_id=h('unknown')],
 ['ancestry',(f:any)=>f.update.header.inner_lite.block_merkle_root=h('forged')],
 ['future head',(f:any)=>f.finalized.height='50'],
 ['invalid signature',(f:any)=>f.update.approvals_after_next[0]=Buffer.alloc(64).toString('base64')],
 ['insufficient quorum',(f:any)=>f.update.approvals_after_next[0]=null],
 ['validator commitment',(f:any)=>f.update.next_bps[0].stake='2'],
 ['stale update',(f:any)=>f.update.header.inner_lite.height='50'],
 ['signature bounds',(f:any)=>f.update.approvals_after_next=Array(257).fill(null)],
] as [string,(f:any)=>void][])test('checkpoint preflight rejects '+name,()=>{const f=fixture();change(f);assert.throws(()=>verifyCheckpointAdvance(f.current,f.update,f.finalized));});
test('durable checkpoint staging is idempotent, rejects competing heads and never installs a proposal',()=>{const f=fixture(),db=new DatabaseSync(':memory:');try{const a=stageCheckpointAdvance(db,'vault.testnet',f.current,f.update,f.finalized),b=stageCheckpointAdvance(db,'vault.testnet',f.current,f.update,f.finalized);assert.equal(a.id,b.id);assert.equal((db.prepare('SELECT count(*) n FROM checkpoint_updates').get() as any).n,1);assert.equal(b.state,'awaiting_approval');assert.equal(f.current.head.inner_lite.height,'50');}finally{db.close();}});
test('checkpoint restart reconciliation requires the complete installed state, not height or timestamp',()=>{const f=fixture(),db=new DatabaseSync(':memory:');try{const a=stageCheckpointAdvance(db,'vault.testnet',f.current,f.update,f.finalized);reconcileCheckpointStages(db,'vault.testnet',f.current);assert.equal((db.prepare('SELECT state FROM checkpoint_updates').get() as any).state,'awaiting_approval');const altered=structuredClone(a.checkpoint);altered.current_bps[0].stake='2';assert.throws(()=>reconcileCheckpointStages(db,'vault.testnet',altered),/differs/);reconcileCheckpointStages(db,'vault.testnet',a.checkpoint);assert.equal((db.prepare('SELECT state FROM checkpoint_updates').get() as any).state,'installed');assert.equal(stageCheckpointAdvance(db,'vault.testnet',f.current,f.update,f.finalized).state,'installed');}finally{db.close();}});
