// Read-only chain collection + local durable proposal. No key access or transaction submission.
import {isDeepStrictEqual} from 'node:util';
import {baseEncode} from 'near-api-js';
import {NearRpc} from '../src/server/chain.ts';
import {liveConfig} from '../src/server/config.ts';
import {Queue} from '../src/server/queue.ts';
import {normalizeUpdate} from '../../../src/near-proof.ts';
import {checkpointHeadHash,stageCheckpointAdvance,reconcileCheckpointStages} from '../src/server/checkpoint-lifecycle.ts';
import {assertTestedProtocol} from '../src/data/protocol.ts';
import {rpcRequest} from '../src/server/rpc-request.ts';
import {TESTNET_GENESIS} from '../src/server/reference-block-policy.ts';
const c=liveConfig();if(!c.configured)throw Error('Complete testnet configuration first.');
const primary=new NearRpc({...c,rpc:'https://archival-rpc.testnet.near.org'}),secondary=new NearRpc({...c,rpc:'https://rpc.testnet.near.org'});
// Corroboration may not silently fall back onto the other source.
for(const source of [primary,secondary])source.rpc=<T>(method:string,params:unknown)=>rpcRequest<T>(source.config.rpc,method,params,{allowFallback:false});
async function pair(method:string,params:unknown){const [a,b]=await Promise.all([primary.rpc<any>(method,params),secondary.rpc<any>(method,params)]);if(!isDeepStrictEqual(a,b))throw Error('Checkpoint sources disagree. Stop; no proposal signed.');return a;}
const block=await primary.finalized();assertTestedProtocol(block.protocolVersion);
for(const source of [primary,secondary]){const status=await source.rpc<any>('status',[]);if(status.chain_id!=='testnet'||status.genesis_hash!==TESTNET_GENESIS||status.protocol_version!==88||status.sync_info?.syncing!==false)throw Error('Checkpoint source network/genesis/protocol mismatch.');}
const canonical=await pair('block',{block_id:block.hash});
let checkpoint=await primary.view<any>('get_repair_checkpoint',{},block.hash);
if(!checkpoint)throw Error('Existing trust root required; initialization is not permitted.');
const corroborated=await secondary.view<any>('get_repair_checkpoint',{},block.hash);
if(!isDeepStrictEqual(checkpoint,corroborated))throw Error('Stored checkpoint disagreement.');
const queue=new Queue(c.database,`testnet:${c.contract}:${c.codeHash}`);
try{
 queue.bindOrganization(c.organization);
 reconcileCheckpointStages(queue.db,c.contract,checkpoint);
 for(let n=0;n<8;n++){
  const from=baseEncode(checkpointHeadHash(checkpoint.head));
  // Recent nodes can prune the old light-client cache. Archive supplies the signed
  // update; quorum/commitment/ancestry are verified from the existing stored root.
  // Two-source canonical block agreement is corroboration, not a replacement for signatures.
  const raw=await primary.rpc<any>('next_light_client_block',{last_block_hash:from});
  if(!raw)throw Error('No authenticated next update available; payments remain blocked.');
  const update=normalizeUpdate(raw,[]),to=baseEncode(checkpointHeadHash(update.header));
  // Archive supplies old canonical headers unavailable on pruned nodes. Its header
  // is not a substitute for the validator quorum and ancestry verified below.
  const head=await primary.rpc<any>('block',{block_id:raw.inner_lite.height});
  if(head.header.hash!==to)throw Error('Update differs from the archival canonical header.');
  const proof=await primary.rpc<any>('EXPERIMENTAL_light_client_block_proof',{block_hash:from,light_client_head:to});
  const normalized=normalizeUpdate(raw,proof.block_proof);
  const result=stageCheckpointAdvance(queue.db,c.contract,checkpoint,normalized,{height:String(canonical.header.height),timestamp:canonical.header.timestamp_nanosec});
  console.log(JSON.stringify({id:result.id,from:result.from,to:result.to,fresh:result.fresh,state:result.state,gas:result.gas,deposit:result.deposit,warning:'Local dependent proposal only; not installed. VM preflight and explicit approval required.'}));
  // Do not stop at a head about to expire. Prepare at least twelve hours of
  // remaining freshness so review and the bounded acceptance can finish safely.
  if(BigInt(canonical.header.timestamp_nanosec)-BigInt(result.checkpoint.head.inner_lite.timestamp)<12n*3600n*1000000000n)break;
  checkpoint=result.checkpoint;
  if(n===7)throw Error('Eight-update collection bound reached before freshness; stop and review.');
 }
}finally{queue.close();}
