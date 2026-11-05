// Read-only public evidence collection. No environment file, key, wallet or signer.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {baseEncode,baseDecode} from '../../apps/owner/node_modules/near-api-js/lib/index.js';
import {verifyCheckpointAdvance,checkpointHeadHash} from '../../apps/owner/src/server/checkpoint-lifecycle.ts';
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url))),expected='d6ee7587ed059a22e76ce05cf254d4de33d3066730d5abda7672424add9599f5';
const sha=b=>createHash('sha256').update(b).digest('hex'),bytes=fs.readFileSync(path.join(root,'docs/OPERATIONAL_TESTNET_ACCEPTANCE_V4.json'));assert.equal(sha(bytes),expected,'Original V4 changed');const plan=JSON.parse(bytes);
const out=path.join(root,'artifacts/v4-checkpoint-verification','bundle-'+new Date().toISOString().replaceAll(/[:.]/g,'-'));fs.mkdirSync(out,{recursive:true});
const sources=['https://test.rpc.fastnear.com','https://rpc.testnet.near.org'];const deadline=Date.now()+180000;
async function rpc(source,method,params){assert(Date.now()<deadline,'Collection elapsed budget');const response=await fetch(source,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'checkpoint-v4-read-only',method,params}),signal:AbortSignal.timeout(Math.min(30000,deadline-Date.now()))});assert(response.ok,`${method}: HTTP ${response.status}`);const j=await response.json();assert(!j.error,`${method}: ${j.error?.cause?.name||'RPC error'}`);return j.result;}
async function pair(method,params,view=x=>x){const results=await Promise.all(sources.map(s=>rpc(s,method,params)));assert.deepEqual(view(results[0]),view(results[1]),`${method}: source disagreement`);return results[0];}
for(const s of sources){const status=await rpc(s,'status',[]);assert.equal(status.chain_id,'testnet');assert.equal(status.genesis_hash,'FWJ9kR6KFWoyMoNjpLXXGHeuiy7tEY6GmoFeCA5yuc6b');assert.equal(status.protocol_version,88);assert.equal(status.sync_info.syncing,false);}
const tip=await rpc(sources[0],'block',{finality:'final'}),block=await pair('block',{block_id:tip.header.hash},b=>b.header);
const query=(request_type,extra={})=>pair('query',{request_type,account_id:plan.contract,block_id:block.header.hash,...extra});
const account=await query('view_account');assert.equal(account.code_hash,plan.expectedCodeHash);
const code=await query('view_code');const wasm=Buffer.from(code.code_base64,'base64');assert.equal(baseEncode(createHash('sha256').update(wasm).digest()),plan.expectedCodeHash,'Deployed WASM hash');
const state=await query('view_state',{prefix_base64:'',include_proof:false});
const checkpointRead=await query('call_function',{method_name:'get_repair_checkpoint',args_base64:'e30='});const checkpoint=JSON.parse(Buffer.from(checkpointRead.result).toString());assert.equal(baseEncode(checkpointHeadHash(checkpoint.head)),plan.evidence.storedCheckpoint.hash);
const vaultRead=await query('call_function',{method_name:'get_vault',args_base64:'e30='}),vault=JSON.parse(Buffer.from(vaultRead.result).toString());assert.equal(vault.owner,plan.owner);assert.equal(vault.paused,true);assert.equal(vault.agent,null);
const access=await query('view_access_key_list');assert.equal(access.keys.length,0,'Vault must have no access keys');
const protocol=await pair('EXPERIMENTAL_protocol_config',{block_id:block.header.hash});assert.equal(protocol.protocol_version,88);
fs.writeFileSync(path.join(out,'plan-v4.json'),bytes);fs.writeFileSync(path.join(out,'vault.wasm'),wasm);
const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
save('capture.json',{capturedAt:new Date().toISOString(),sources,trust:'Pinned testnet genesis, dual HTTPS RPC agreement; no consensus/state light-client proof or independent security review.',block:block.header,account,state,checkpoint,vault,protocol,ownerPublicKeyBytes:[0,...baseDecode(plan.ownerPublicKey.slice(8))]});
let current=checkpoint;const inputs=[];
for(const [n,op] of plan.operations.filter(o=>o.actions[0].method==='advance_repair_head').entries()){
 const a=op.actions[0],args=Buffer.from(JSON.stringify(a.args));assert.equal(sha(args),op.argsSha256);assert.equal(args.length,op.argsBytes);assert.equal(a.gas,'250000000000000');assert.equal(a.depositYoctoNEAR,'0');
 const verified=verifyCheckpointAdvance(current,a.args.update,{height:String(block.header.height),timestamp:block.header.timestamp_nanosec});assert.equal(verified.from,op.from);assert.equal(verified.to,op.to);
 const name=`input-${n+1}.json`;fs.writeFileSync(path.join(out,name),args);save(`expected-${n+1}.json`,verified.checkpoint);inputs.push({id:op.id,file:name,sha256:sha(args),bytes:args.length,from:verified.from,to:verified.to,gas:a.gas,deposit:a.depositYoctoNEAR});current=verified.checkpoint;
}
assert.equal(inputs.length,7);assert.equal(baseEncode(checkpointHeadHash(current.head)),plan.evidence.proposedCheckpoint.hash);
const total=plan.operations.reduce((n,o)=>n+BigInt(o.actions[0].depositYoctoNEAR)+BigInt(o.maxFeeYoctoNEAR),0n);assert.equal(String(total),plan.maximumOwnerAllowanceYoctoNEAR);assert.equal(String(total+BigInt(plan.worker.maxFeeYoctoNEAR)),plan.maximumAllAccountsAllowanceYoctoNEAR);
const manifest={format:1,planSha256:expected,wasmSha256:sha(wasm),wasmCodeHash:plan.expectedCodeHash,rootHash:plan.evidence.storedCheckpoint.hash,finalHash:plan.evidence.proposedCheckpoint.hash,capturedAt:new Date().toISOString(),protocol:88,rust:'1.93.0',vmRunner:'0.37.4',vmCrateSha256:'5dc1e62fcd234ddde5c8452081ddb61a9d98a1d00ca85405f7df96e916bbcff3',inputs,files:{},result:{nodePreflight:'passed: seven exact planned updates; signatures/commitments/quorum/ancestry/order verified from captured root',vmExecution:'NOT EXECUTED',planReady:false,invoiceBinding:'BLOCKED: actual bill/order UUID and durable job do not exist; expected reference is not sufficient',cleanup:'BLOCKED: V4 lacks explicit failed pause/revocation recovery dispositions'},node:process.version};
for(const file of fs.readdirSync(out))manifest.files[file]=sha(fs.readFileSync(path.join(out,file)));save('manifest.json',manifest);
fs.writeFileSync(path.join(root,'artifacts/v4-checkpoint-verification/latest-bundle.txt'),out+'\n');console.log(JSON.stringify({out,planSha256:expected,wasmSha256:manifest.wasmSha256,inputs:inputs.length,preflight:'passed',vm:'NOT EXECUTED',currentPlanExpired:Date.now()>=plan.validUntil,finalHeadFresh:BigInt(block.header.timestamp_nanosec)-BigInt(current.head.inner_lite.timestamp)<86400000000000n}));
