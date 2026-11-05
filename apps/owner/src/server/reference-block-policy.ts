/** Evidence verification only: no signing, dispatch, history mutation or gate activation.
 * Historical assessments stay separate from trusted runtime intent binding.
 */
import {createHash,createPublicKey,verify} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {DatabaseSync} from 'node:sqlite';
import {Transaction,baseEncode,baseDecode} from 'near-api-js';
import {safeRead,httpError,RequestError,wait} from '../data/request-policy.ts';
import {validateOwnerCall} from '../data/owner-transaction.ts';
const runtimePolicies=new WeakSet<object>();
export const REFERENCE_BOUNDS=Object.freeze({reviewMs:180000,preparedBlockAgeMs:30000,referenceAdvance:256,inclusionBlocks:16,inclusionMs:30000,receiptBlocks:16,receiptMs:30000,maxHeaders:35,maxHttpAttempts:128,collectionMs:180000,headSkewBlocks:32,minRequestSpacingMs:1000,headerBatch:1});
export const REFERENCE_SOURCES=['https://test.rpc.fastnear.com','https://rpc.testnet.near.org'] as const;
export const TESTNET_GENESIS='FWJ9kR6KFWoyMoNjpLXXGHeuiy7tEY6GmoFeCA5yuc6b';
const sha=(b:string|Uint8Array)=>createHash('sha256').update(b).digest('hex');
const canonical=(v:any):string=>JSON.stringify(v&&typeof v==='object'?Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))])):v);
function check(ok:unknown,code:string):asserts ok{if(!ok)throw Error(code);}
const uint=(v:any)=>{check(typeof v==='string'&&v.length<=39&&/^(0|[1-9][0-9]*)$/.test(v),'INVALID_INTEGER');check(BigInt(v)<(1n<<128n),'INTEGER_OVERFLOW');return BigInt(v);};
const number=(v:any)=>{check(typeof v==='number'&&Number.isSafeInteger(v)&&v>=0,'INVALID_HEIGHT');return v;};
const hash=(v:any)=>{check(typeof v==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v),'INVALID_HASH');check(baseDecode(v).length===32&&baseEncode(baseDecode(v))===v,'INVALID_HASH');return v as string;};
const decimal=(v:any)=>typeof v==='number'?(number(v),String(v)):(uint(v),v as string);
const freeze=(v:any):any=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export interface ReferencePolicy {version:3;mode:'assessment-only';policyId:string;network:'testnet';genesisHash:string;baseV2Sha256:string;intentSha256:string;attemptId:string;candidateHash:string;bounds:typeof REFERENCE_BOUNDS;sources:readonly string[];newTransactionsAuthorized:false;[key:string]:unknown}
export function validateReferencePolicy(p:ReferencePolicy){
 check(p.version===3&&p.mode==='assessment-only'&&p.policyId==='meteor-reference-block-v1'&&p.network==='testnet'&&p.genesisHash===TESTNET_GENESIS&&p.newTransactionsAuthorized===false&&p.historicalDispositionAuthorized===false&&p.runtimeActivation===false&&p.collectionClock==='monotonic-performance'&&p.skippedHeightRule==='dual-UNKNOWN_BLOCK-only-with-direct-parent-link','UNREVIEWED_POLICY');
 check(isDeepStrictEqual(p.bounds,REFERENCE_BOUNDS)&&isDeepStrictEqual(p.sources,[...REFERENCE_SOURCES]),'UNSUPPORTED_BOUNDS_OR_SOURCES');
 check(/^[a-f0-9]{64}$/.test(p.baseV2Sha256)&&/^[a-f0-9]{64}$/.test(p.intentSha256),'INVALID_POLICY_PIN');hash(p.candidateHash);
}
export interface ReferenceIntent {id:string;scopeId:string;planHash:string;network:string;organization:string;owner:string;contract:string;publicKey:string;nonce:string;nonceFloor:string;unsigned:string;hash:string;created:number;expires:number;maxFee:string;codeHash:string}
export function intentFingerprint(i:ReferenceIntent){return sha(canonical(Object.fromEntries(['id','scopeId','planHash','network','organization','owner','contract','publicKey','nonce','nonceFloor','unsigned','hash','created','expires','maxFee','codeHash'].map(k=>[k,(i as any)[k]]))));}
/** Trusted server binding only. A wire/JSON flag cannot enable this variant. */
export function bindRuntimeReferencePolicy(template:ReferencePolicy,i:ReferenceIntent,candidate:string):ReferencePolicy {
 validateReferencePolicy(template);const tx=Transaction.decode(Buffer.from(i.unsigned,'base64')),c=tx.actions[0]?.functionCall;
 check(tx.actions.length===1&&c,'UNSUPPORTED_ACTIONS');validateOwnerCall(c.methodName,JSON.parse(Buffer.from(c.args).toString()),String(c.deposit));
 const p={...template,attemptId:i.id,originalHash:i.hash,candidateHash:candidate,intentSha256:intentFingerprint(i),baseV2Sha256:i.planHash,consumedScopeId:i.scopeId,owner:i.owner,organization:i.organization,contract:i.contract,publicKey:i.publicKey,nonce:i.nonce,expectedCodeHash:i.codeHash,action:{type:'FunctionCall',method:c.methodName,argsBase64:Buffer.from(c.args).toString('base64'),depositYoctoNEAR:String(c.deposit),gas:String(c.gas)},feeAllowanceCeilingYoctoNEAR:i.maxFee,totalAllowanceCeilingYoctoNEAR:String(BigInt(i.maxFee)+c.deposit)};
 runtimePolicies.add(p);return p;
}
function decodeIntent(i:ReferenceIntent,p:ReferencePolicy){
 validateReferencePolicy(p);check(i.id===p.attemptId&&intentFingerprint(i)===p.intentSha256&&i.planHash===p.baseV2Sha256&&i.network===p.network,'INTENT_PIN_MISMATCH');
 check(p.originalHash===i.hash&&p.consumedScopeId===i.scopeId&&p.owner===i.owner&&p.organization===i.organization&&p.contract===i.contract&&p.publicKey===i.publicKey&&p.nonce===i.nonce&&p.expectedCodeHash===i.codeHash&&(runtimePolicies.has(p)||p.candidateHash!==i.hash),'DECLARED_SCOPE_MISMATCH');
 if(!runtimePolicies.has(p))check(isDeepStrictEqual(p.action,{type:'FunctionCall',method:'fund_storage',argsBase64:'e30=',depositYoctoNEAR:'1000000000000000000',gas:'100000000000000'})&&p.feeAllowanceCeilingYoctoNEAR==='22000000000000000000000'&&p.totalAllowanceCeilingYoctoNEAR==='22001000000000000000000','DECLARED_ACTION_MISMATCH');
 check(Number.isSafeInteger(i.created)&&Number.isSafeInteger(i.expires)&&i.created>=0&&i.expires>i.created,'INVALID_REVIEW_WINDOW');
 check(typeof i.unsigned==='string'&&i.unsigned.length<=(runtimePolicies.has(p)?131072:20000),'INVALID_UNSIGNED_BYTES');const bytes=Buffer.from(i.unsigned,'base64');check(bytes.toString('base64')===i.unsigned,'INVALID_UNSIGNED_BYTES');const tx=Transaction.decode(bytes);check(Buffer.from(tx.encode()).equals(bytes)&&baseEncode(createHash('sha256').update(bytes).digest())===i.hash,'PREPARED_BYTES_MISMATCH');
 check(tx.signerId===i.owner&&tx.receiverId===i.contract&&tx.publicKey.toString()===i.publicKey&&String(tx.nonce)===i.nonce&&uint(i.nonce)===uint(i.nonceFloor)+1n,'INTENT_ENVELOPE_MISMATCH');
 check(i.owner.endsWith('.testnet')&&i.contract.endsWith('.testnet')&&i.owner!==i.contract&&i.publicKey.startsWith('ed25519:'),'UNSUPPORTED_IDENTITY');
 check(tx.actions.length===1,'UNSUPPORTED_ACTIONS');const c=tx.actions[0].functionCall;check(c,'OUT_OF_SCOPE_ACTION');
 if(runtimePolicies.has(p)){
  validateOwnerCall(c.methodName,JSON.parse(Buffer.from(c.args).toString()),String(c.deposit));
  check(isDeepStrictEqual(p.action,{type:'FunctionCall',method:c.methodName,argsBase64:Buffer.from(c.args).toString('base64'),depositYoctoNEAR:String(c.deposit),gas:String(c.gas)})&&String(c.gas)===(c.methodName==='advance_repair_head'?'250000000000000':'100000000000000')&&p.feeAllowanceCeilingYoctoNEAR===i.maxFee&&p.totalAllowanceCeilingYoctoNEAR===String(BigInt(i.maxFee)+c.deposit),'OUT_OF_SCOPE_ACTION');
 }else check(c.methodName==='fund_storage'&&Buffer.from(c.args).toString()==='{}'&&String(c.deposit)==='1000000000000000000'&&String(c.gas)==='100000000000000','OUT_OF_SCOPE_ACTION');
 check((i as any).transport==='meteor'&&(i as any).method===c.methodName&&Buffer.from(c.args).toString()===JSON.stringify((i as any).args)&&(i as any).deposit===String(c.deposit)&&(i as any).gas===String(c.gas)&&(i as any).referenceBlock===baseEncode(Uint8Array.from(tx.blockHash)),'INTENT_METADATA_MISMATCH');
 check(uint(i.maxFee)<=(runtimePolicies.has(p)&&c.methodName==='advance_repair_head'?55000000000000000000000n:22000000000000000000000n),'FEE_ALLOWANCE_MISMATCH');hash(i.codeHash);return {bytes,tx,call:{FunctionCall:{method_name:c.methodName,args:Buffer.from(c.args).toString('base64'),deposit:String(c.deposit),gas:String(c.gas)}}};
}
const normalizeActions=(a:any)=>{check(Array.isArray(a),'MISSING_ACTIONS');return a.map(x=>{check(x&&Object.keys(x).length===1&&x.FunctionCall,'ALTERED_ACTION');const c=x.FunctionCall;check(isDeepStrictEqual(Object.keys(c).sort(),['args','deposit','gas','method_name']),'ALTERED_ACTION_FIELDS');return {FunctionCall:{method_name:c.method_name,args:c.args,deposit:decimal(c.deposit),gas:decimal(c.gas)}};});};
const outcomeView=(r:any)=>({id:r.id,block_hash:r.block_hash,outcome:{executor_id:r.outcome?.executor_id,receipt_ids:r.outcome?.receipt_ids,status:r.outcome?.status,tokens_burnt:r.outcome?.tokens_burnt,gas_burnt:r.outcome?.gas_burnt,logs:r.outcome?.logs,contracts:r.outcome?.metadata?.contracts??[]}});
const txView=(r:any)=>({final_execution_status:r.final_execution_status,status:r.status,transaction:r.transaction,transaction_outcome:outcomeView(r.transaction_outcome),receipts:r.receipts,receipts_outcome:r.receipts_outcome?.map(outcomeView).sort((a:any,b:any)=>String(a.id).localeCompare(String(b.id)))});
interface Header {hash:string;height:number;prev_hash:string;timestamp_nanosec:string}
const header=(b:any):Header=>{const h=b?.header;check(h,'MISSING_HEADER');return {hash:hash(h.hash),height:number(h.height),prev_hash:hash(h.prev_hash),timestamp_nanosec:(check(uint(h.timestamp_nanosec)<(1n<<64n),'INVALID_TIMESTAMP'),h.timestamp_nanosec)};};
const isFailure=(status:any)=>status && Object.keys(status).length===1 && status.Failure && typeof status.Failure==="object";
const cleanupIntent=(i:ReferenceIntent,p:ReferencePolicy)=>runtimePolicies.has(p)&&(i as any).cleanupRecovery===true&&((i as any).method==="revoke_agent"||((i as any).method==="set_paused"&&(i as any).args?.paused===true));
interface Bundle {cleanupState?:unknown;intentHash:string;policyHash:string;candidateHash:string;transaction:any;headers:Header[];anchor:Header;codeHash:string;vault:any;validity:number;genesis:string;sourceOrigins:string[];networkAttestations:unknown[];collection:{httpAttempts:number;elapsedMs:number}}
const sealed=new WeakSet<object>();
/** Only this reader can seal evidence. Callers cannot attest raw JSON with a boolean. */
export class ReferenceEvidenceReader {
 private readonly fetcher:typeof fetch;private readonly pause:typeof wait;
 constructor(fetcher:typeof fetch=fetch,pause:typeof wait=wait){this.fetcher=fetcher;this.pause=pause;} // Trusted server transport seam; fixtures inject fake HTTPS responses.
 async collect(i:ReferenceIntent,p:ReferencePolicy,signal?:AbortSignal):Promise<unknown>{
  const abort=new AbortController(),cancel=()=>abort.abort(signal?.reason);signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();try{
  const runtime=runtimePolicies.has(p);i=freeze(structuredClone(i));p=freeze(structuredClone(p));if(runtime)runtimePolicies.add(p);const {tx}=decodeIntent(i,p);const clock=()=>performance.now(),started=clock(),deadline=started+p.bounds.collectionMs;let attempts=0;let nextRead=0;
  const read=async(origin:string,method:string,params:unknown):Promise<any>=>{
   check(REFERENCE_SOURCES.includes(origin as any)&&['status','block','EXPERIMENTAL_tx_status','EXPERIMENTAL_protocol_config','query'].includes(method),'UNTRUSTED_RPC_SOURCE');
   return safeRead(async signal=>{const scheduled=Math.max(clock(),nextRead),delay=Math.max(0,scheduled-clock());nextRead=scheduled+p.bounds.minRequestSpacingMs;check(delay<deadline-clock(),'COLLECTION_TIME_BUDGET');if(delay)await this.pause(delay,signal);check(++attempts<=p.bounds.maxHttpAttempts,'RPC_ATTEMPT_BUDGET');
    const r=await this.fetcher(origin,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'reference-assessment-read-only',method,params}),signal,cache:'no-store'});
    check(r.url===origin||r.url===origin+'/', 'UNTRUSTED_RPC_RESPONSE_ORIGIN');if(!r.ok&&r.status!==422){const error=httpError(r.status,r.headers.get('retry-after'));error.message+=' '+origin+' '+method+(method==='block'?' '+JSON.stringify(params):'');throw error;}check(r.body,'MISSING_RPC_BODY');const reader=r.body.getReader(),chunks:Uint8Array[]=[];let size=0;try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;check(size<=2097152,'RPC_BODY_TOO_LARGE');chunks.push(part.value);}}finally{await reader.cancel().catch(()=>{});}const body=JSON.parse(Buffer.concat(chunks).toString());
    if(!r.ok&&!(method==='block'&&body.error?.cause?.name==='UNKNOWN_BLOCK')){const error=httpError(r.status,r.headers.get('retry-after'));error.message+=' '+origin+' '+method;throw error;}
    if(body.error){const code=body.error.cause?.name;if(method==='block'&&code==='UNKNOWN_BLOCK')return null;throw new RequestError('Reference evidence unavailable','rpc',false);}
    check(body.result!==undefined,'MISSING_RPC_RESULT');return body.result;
   },{deadline,now:clock,signal:abort.signal,timeouts:[5000,10000,15000]});
  };
  const pair=async(method:string,params:unknown,view:(r:any)=>any=(r:any)=>r)=>{
   const [a,b]=await Promise.all(REFERENCE_SOURCES.map(s=>read(s,method,params)));const va=a===null?null:view(a),vb=b===null?null:view(b);check(isDeepStrictEqual(va,vb),'RPC_DISAGREEMENT');return va;
  };
  const statuses=await Promise.all(REFERENCE_SOURCES.map(s=>read(s,'status',[])));for(const s of statuses)check(s.chain_id===p.network&&s.genesis_hash===p.genesisHash&&s.protocol_version===88&&s.sync_info?.syncing===false,'WRONG_NETWORK_OR_PROTOCOL');
  const tips=await Promise.all(REFERENCE_SOURCES.map(s=>read(s,'block',{finality:'final'}).then(header)));check(Math.abs(tips[0].height-tips[1].height)<=p.bounds.headSkewBlocks,'FINAL_HEAD_DISAGREEMENT');
  const commonHeight=Math.min(...tips.map(t=>t.height)),anchor=await pair('block',{block_id:commonHeight},header);check(anchor&&anchor.height===commonHeight&&tips.filter(t=>t.height===commonHeight).every(t=>t.hash===anchor.hash),'MISSING_FINAL_ANCHOR');
  const result=await pair('EXPERIMENTAL_tx_status',{tx_hash:p.candidateHash,sender_account_id:i.owner,wait_until:'FINAL'},txView);const failed=cleanupIntent(i,p)&&isFailure(result?.status);check(result?.final_execution_status==='FINAL'&&(failed||isDeepStrictEqual(result.status,{SuccessValue:''})),'NOT_FINAL_SUCCESS');
  check(result.transaction?.hash===p.candidateHash&&Array.isArray(result.receipts)&&Array.isArray(result.receipts_outcome),'MISSING_TRANSACTION_OR_RECEIPTS');
  const originalHash=baseEncode(Uint8Array.from(tx.blockHash));const prepared=await pair('block',{block_id:originalHash},header);check(prepared&&prepared.hash===originalHash,'MISSING_PREPARED_BLOCK');
  const protocol=await pair('EXPERIMENTAL_protocol_config',{block_id:originalHash},r=>({chain_id:r.chain_id,transaction_validity_period:r.transaction_validity_period,protocol_version:r.protocol_version}));check(protocol.chain_id===p.network&&protocol.protocol_version===88&&protocol.transaction_validity_period===86400,'UNREVIEWED_PROTOCOL_VALIDITY');
  const executionHeaders:Header[]=[];for(const o of [result.transaction_outcome,...result.receipts_outcome]){const h=await pair('block',{block_id:hash(o.block_hash)},header);check(h&&h.hash===o.block_hash,'MISSING_EXECUTION_BLOCK');executionHeaders.push(h);}
  const inclusion=executionHeaders[0],end=Math.max(...executionHeaders.map(h=>h.height));
  check(end>=inclusion.height&&end-inclusion.height<=p.bounds.receiptBlocks&&end<=anchor.height,'CANONICAL_RANGE_BOUNDS');
  const low=Math.max(prepared.height+(runtime?0:1),inclusion.height-p.bounds.inclusionBlocks),high=Math.min(inclusion.height,prepared.height+p.bounds.referenceAdvance);check(low<=high,'REFERENCE_HEIGHT_BOUNDS');
  const canonicalPrepared=await pair('block',{block_id:prepared.height},header);check(isDeepStrictEqual(canonicalPrepared,prepared),'NONCANONICAL_PREPARED_BLOCK');
  const tail:Header[]=[];
  // Intersection of the reference and inclusion bounds needs at most 17 candidates;
  // candidate-to-receipt ancestry needs at most 33 headers, not a 289-height scan.
  for(let start=low;start<=end;start+=p.bounds.headerBatch){const batch=await Promise.all(Array.from({length:Math.min(p.bounds.headerBatch,end-start+1)},(_,n)=>pair('block',{block_id:start+n},header).then(h=>{if(h)check(h.height===start+n,'WRONG_CANONICAL_HEIGHT');return h;})));tail.push(...batch.filter(Boolean));}
  if(tail[0]?.height===prepared.height) {check(isDeepStrictEqual(tail[0],prepared),'NONCANONICAL_PREPARED_BLOCK');tail.shift();}
  const headers=[prepared,...tail];
  check(new Set(headers.map(h=>h.hash)).size===headers.length&&headers.length+1<=p.bounds.maxHeaders&&(tail.at(-1)??prepared).height===end&&(!tail.length||uint(tail[0].timestamp_nanosec)>uint(prepared.timestamp_nanosec)),'INCOMPLETE_CANONICAL_HEADERS');
  if(tail[0]?.height===prepared.height+1)check(tail[0].prev_hash===prepared.hash,'BROKEN_CANONICAL_CHAIN');
  for(let n=1;n<tail.length;n++)check(tail[n].prev_hash===tail[n-1].hash&&uint(tail[n].timestamp_nanosec)>uint(tail[n-1].timestamp_nanosec),'BROKEN_CANONICAL_CHAIN');
  for(const h of executionHeaders)check(headers.some(x=>isDeepStrictEqual(x,h)),'NONCANONICAL_EXECUTION_BLOCK');
  const firstReceipt=result.receipts.find((r:any)=>r.receipt_id===result.transaction_outcome.outcome.receipt_ids?.[0]);check(firstReceipt,'MISSING_ACTION_RECEIPT');const actionOutcome=result.receipts_outcome.find((o:any)=>o.id===firstReceipt.receipt_id);check(actionOutcome,'MISSING_ACTION_OUTCOME');
  const block_id=actionOutcome.block_hash;
  const account=await pair('query',{request_type:'view_account',account_id:i.contract,block_id},r=>({code_hash:r.code_hash,block_hash:r.block_hash}));check(account.code_hash===i.codeHash&&account.block_hash===block_id,'UNEXPECTED_CONTRACT_CODE');
  const vault=await pair('query',{request_type:'call_function',account_id:i.contract,method_name:'get_vault',args_base64:'e30=',block_id},r=>{check(r.block_hash===block_id,'WRONG_VAULT_READ_BLOCK');return JSON.parse(Buffer.from(r.result).toString());});check(vault.owner===i.owner&&(runtimePolicies.has(p)||(vault.paused===true&&vault.agent===null)),'UNEXPECTED_VAULT_AUTHORITY');
  const cleanupState=failed?await pair('query',{request_type:'call_function',account_id:i.contract,method_name:'get_vault',args_base64:'e30=',block_id:anchor.hash},r=>{
   check(r.block_hash===anchor.hash,'WRONG_CLEANUP_STATE_BLOCK');const value=JSON.parse(Buffer.from(r.result).toString());
   check(value.owner===i.owner&&typeof value.paused==='boolean'&&(value.agent===null||(typeof value.agent?.account_id==='string'&&typeof value.agent?.public_key==='string')),'INVALID_CLEANUP_STATE');
   return {block:anchor.hash,paused:value.paused,agent:value.agent};
  }):undefined;
  if(failed){const latestCode=await pair('query',{request_type:'view_account',account_id:i.contract,block_id:anchor.hash},r=>({code_hash:r.code_hash,block_hash:r.block_hash}));check(latestCode.code_hash===i.codeHash&&latestCode.block_hash===anchor.hash,'UNEXPECTED_CLEANUP_CODE');}
  const bundle:Bundle={...(failed?{cleanupState}:{}),intentHash:intentFingerprint(i),policyHash:sha(canonical(p)),candidateHash:p.candidateHash,transaction:result,headers,anchor,codeHash:account.code_hash,vault,validity:protocol.transaction_validity_period,genesis:p.genesisHash,sourceOrigins:[...REFERENCE_SOURCES],networkAttestations:statuses.map((s,n)=>({origin:REFERENCE_SOURCES[n],chainId:s.chain_id,genesisHash:s.genesis_hash,protocol:s.protocol_version,finalizedTip:tips[n]})),collection:{httpAttempts:attempts,elapsedMs:Math.ceil(clock()-started)}};freeze(bundle);sealed.add(bundle);return bundle;
  }finally{abort.abort();signal?.removeEventListener('abort',cancel);}
 }
}
export interface ReferenceAssessment {verdict:'compatible_under_proposal'|'finalized_cleanup_failure'|'manual_review';manualReviewRequired:true;submissionAuthorized:false;policyId:string;policyDigest:string;reason?:string;[key:string]:unknown}
export function evaluateReferenceRefresh(i:ReferenceIntent,p:ReferencePolicy,evidence:unknown):ReferenceAssessment {
 const common={manualReviewRequired:true as const,submissionAuthorized:false as const,policyId:p.policyId,policyDigest:sha(canonical(p))};
 try{
  const prepared=decodeIntent(i,p);check(evidence&&typeof evidence==='object'&&sealed.has(evidence),'UNTRUSTED_EVIDENCE');const e=evidence as Bundle;
  check(e.intentHash===intentFingerprint(i)&&e.policyHash===common.policyDigest&&e.genesis===p.genesisHash&&e.candidateHash===p.candidateHash&&e.codeHash===i.codeHash,'EVIDENCE_CONTEXT_MISMATCH');
  const r=e.transaction,t=r.transaction;check(t.signer_id===i.owner&&t.public_key===i.publicKey&&decimal(t.nonce)===i.nonce&&t.receiver_id===i.contract&&t.hash===p.candidateHash,'ALTERED_ENVELOPE');
  check((t.priority_fee===undefined||decimal(t.priority_fee)==='0')&&t.nonce_index==null&&t.nonce_mode==null,'UNSUPPORTED_TRANSACTION_VERSION');
  check(isDeepStrictEqual(normalizeActions(t.actions),[prepared.call]),'ALTERED_ACTIONS');
  const failed=cleanupIntent(i,p)&&isFailure(r.status);check(r.final_execution_status==='FINAL'&&(failed||isDeepStrictEqual(r.status,{SuccessValue:''})),'NOT_FINAL_SUCCESS');
  const byHash=new Map(e.headers.map(h=>[h.hash,h])),original=byHash.get(baseEncode(Uint8Array.from(prepared.tx.blockHash)));check(original,'MISSING_ORIGINAL_REFERENCE');
  const root=r.transaction_outcome,rootHeader=byHash.get(root.block_hash);check(rootHeader,'MISSING_INCLUSION_HEADER');
  const created=BigInt(i.created)*1000000n,end=BigInt(Math.min(i.expires,i.created+p.bounds.reviewMs))*1000000n,originalTime=uint(original.timestamp_nanosec),includedTime=uint(rootHeader.timestamp_nanosec);
  check(originalTime<=created&&created-originalTime<=BigInt(p.bounds.preparedBlockAgeMs)*1000000n,'STALE_PREPARED_REFERENCE');check(includedTime>=created&&includedTime<=end,'REVIEW_WINDOW_EXCEEDED');
  const matches=e.headers.filter(h=>{
   if(h.height<original.height||(!runtimePolicies.has(p)&&h.height===original.height)||h.height-original.height>p.bounds.referenceAdvance||rootHeader.height<h.height||rootHeader.height-h.height>p.bounds.inclusionBlocks)return false;
   const time=uint(h.timestamp_nanosec);if(time<originalTime||time>end||time>includedTime||includedTime-time>BigInt(p.bounds.inclusionMs)*1000000n)return false;
   const tx=Transaction.decode(prepared.bytes);tx.blockHash=baseDecode(h.hash);return baseEncode(createHash('sha256').update(tx.encode()).digest())===p.candidateHash;
  });check(matches.length===1,'NO_BOUNDED_REFERENCE_RECONSTRUCTION');
  const ref=matches[0],rebuilt=Transaction.decode(prepared.bytes);rebuilt.blockHash=baseDecode(ref.hash);const bytes=Buffer.from(rebuilt.encode()),digest=createHash('sha256').update(bytes).digest();
  check(typeof t.signature==='string'&&/^ed25519:[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(t.signature),'MISSING_SIGNATURE');const signature=baseDecode(t.signature.slice(8));check(signature.length===64,'INVALID_SIGNATURE');const key=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(baseDecode(i.publicKey.slice(8)))]),format:'der',type:'spki'});check(verify(null,digest,key,signature),'INVALID_SIGNATURE');
  const receipts=r.receipts,outs=r.receipts_outcome;const count=receipts.length;check((count===2||(failed&&count===3))&&outs.length===count&&new Set([r.transaction_outcome.id,...outs.map((x:any)=>x.id)]).size===count+1&&new Set(receipts.map((x:any)=>x.receipt_id)).size===count&&new Set(outs.map((x:any)=>x.id)).size===count,'UNEXPECTED_RECEIPT_SET');
  check(root.id===t.hash&&root.outcome.executor_id===i.owner&&root.outcome.receipt_ids.length===1&&isDeepStrictEqual(root.outcome.status,{SuccessReceiptId:root.outcome.receipt_ids[0]}),'TRANSACTION_RECEIPT_LINK_MISMATCH');
  const action=receipts.find((x:any)=>x.receipt_id===root.outcome.receipt_ids[0]);check(action&&action.predecessor_id===i.owner&&action.receiver_id===i.contract,'ACTION_RECEIPT_LINK_MISMATCH');const ac=action.receipt?.Action;check(Object.keys(action.receipt??{}).length===1&&ac&&uint(ac.gas_price)>0n&&ac.signer_id===i.owner&&ac.signer_public_key===i.publicKey&&ac.input_data_ids.length===0&&ac.output_data_receivers.length===0&&!ac.is_promise_yield&&isDeepStrictEqual(normalizeActions(ac.actions),[prepared.call]),'ALTERED_ACTION_RECEIPT');
  const actionOut=outs.find((x:any)=>x.id===action.receipt_id);check(actionOut&&(isDeepStrictEqual(actionOut.outcome.contracts,[{local:i.codeHash}])||(failed&&isDeepStrictEqual(actionOut.outcome.contracts,[])))&&actionOut.outcome.executor_id===i.contract&&isDeepStrictEqual(actionOut.outcome.status,failed?r.status:{SuccessValue:''})&&actionOut.outcome.receipt_ids.length===count-1&&new Set(actionOut.outcome.receipt_ids).size===count-1,'ACTION_EXECUTION_FAILED');
  for(const refundId of actionOut.outcome.receipt_ids){const refund=receipts.find((x:any)=>x.receipt_id===refundId);check(refund&&refund!==action&&refund.predecessor_id==='system'&&refund.receiver_id===i.owner,'REFUND_LINK_MISMATCH');const rc=refund.receipt?.Action;check(Object.keys(refund.receipt??{}).length===1&&rc&&rc.gas_price==='0'&&rc.signer_id===i.owner&&rc.signer_public_key===i.publicKey&&rc.actions.length===1&&Object.keys(rc.actions[0]).length===1&&rc.actions[0].Transfer&&isDeepStrictEqual(Object.keys(rc.actions[0].Transfer),['deposit'])&&uint(rc.actions[0].Transfer.deposit)>=0n&&rc.input_data_ids.length===0&&rc.output_data_receivers.length===0&&!rc.is_promise_yield,'ALTERED_REFUND');const actionHeader=byHash.get(actionOut.block_hash),refundHeader=byHash.get(outs.find((x:any)=>x.id===refund.receipt_id)?.block_hash);check(actionHeader&&refundHeader&&refundHeader.height>=actionHeader.height&&uint(refundHeader.timestamp_nanosec)>=uint(actionHeader.timestamp_nanosec),'RECEIPT_CAUSALITY_MISMATCH');const refundOut=outs.find((x:any)=>x.id===refund.receipt_id);check(refundOut&&refundOut.outcome.executor_id===i.owner&&isDeepStrictEqual(refundOut.outcome.status,{SuccessValue:''})&&refundOut.outcome.receipt_ids.length===0,'REFUND_EXECUTION_FAILED');}
  let fee=0n;for(const o of [root,...outs]){hash(o.id);check(o.outcome.logs.length===0,'UNEXPECTED_LOGS');fee+=uint(o.outcome.tokens_burnt);const h=byHash.get(o.block_hash);check(h&&h.height>=rootHeader.height&&h.height-rootHeader.height<=p.bounds.receiptBlocks,'RECEIPT_HEIGHT_BOUNDS');const time=uint(h.timestamp_nanosec);check(time>=includedTime&&time-includedTime<=BigInt(p.bounds.receiptMs)*1000000n,'RECEIPT_TIME_BOUNDS');}
  check(fee<=uint(i.maxFee)&&fee+prepared.tx.actions[0].functionCall!.deposit<=uint(p.totalAllowanceCeilingYoctoNEAR),'FEE_CEILING_EXCEEDED');
  if(failed)check(e.cleanupState,'MISSING_FINAL_CLEANUP_STATE');
  return {...common,verdict:failed?'finalized_cleanup_failure':'compatible_under_proposal',...(failed?{cleanupState:e.cleanupState,finalizedTransaction:r}:{}),intentDigest:intentFingerprint(i),evidenceDigest:sha(canonical(e)),originalHash:i.hash,candidateHash:p.candidateHash,reference:ref,inclusion:rootHeader,feeYoctoNEAR:String(fee),canonicalHeaderCount:e.headers.length+1,collection:e.collection,trust:'two configured HTTPS RPC sources; not a light-client proof',requiresExplicitHistoricalDisposition:true};
 }catch(error){return {...common,verdict:'manual_review',reason:error instanceof Error?error.message:'INCOMPLETE_EVIDENCE'};}
}
/** Never finalizes the live attempt. The second SQLite snapshot detects evidence arriving during reads. */
export async function assessDurableReferenceRefresh(db:DatabaseSync,scopeKey:string,p:ReferencePolicy,codeHash:string,reader:ReferenceEvidenceReader):Promise<ReferenceAssessment>{
 const snapshot=()=>{const row=db.prepare('SELECT payload FROM owner_wallet_attempts WHERE scope=?').get(scopeKey) as {payload:string}|undefined;check(row,'MISSING_DURABLE_ATTEMPT');const a=JSON.parse(row.payload);const use=db.prepare('SELECT * FROM owner_acceptance_uses WHERE attempt=?').all(a.id),history=db.prepare('SELECT payload FROM owner_wallet_history WHERE id=?').all(a.id);return {row:row.payload,a,use,history};};
 const before=snapshot();const intent={...before.a,codeHash} as ReferenceIntent;let assessment:ReferenceAssessment;
 try{check(before.use.length===1&&before.history.length===1&&before.a.id===p.attemptId&&before.a.state==='manual_review'&&before.a.manualReviewRequired===true&&scopeKey===before.a.organization+':'+before.a.owner&&(before.use[0] as any).scope===before.a.scopeId&&(before.use[0] as any).state==='manual_review'&&isDeepStrictEqual(JSON.parse((before.history[0] as any).payload),before.a)&&isDeepStrictEqual(JSON.parse((before.use[0] as any).payload),before.a),'MISSING_CONSUMED_MANUAL_REVIEW');check(isDeepStrictEqual(before.a.reportedHashes,[p.candidateHash]),'ADDITIONAL_CONFLICTING_EVIDENCE');assessment=evaluateReferenceRefresh(intent,p,await reader.collect(intent,p));}catch(error){assessment={verdict:'manual_review',manualReviewRequired:true,submissionAuthorized:false,policyId:p.policyId,policyDigest:sha(canonical(p)),reason:error instanceof Error?error.message:'EVIDENCE_UNAVAILABLE'};}
 db.exec('BEGIN');try{const after=snapshot();assessment={...assessment,durableSnapshotDigest:sha(canonical(before)),assessedAt:new Date().toISOString()};if(!isDeepStrictEqual(before,after))assessment={...assessment,verdict:'manual_review',reason:'DURABLE_EVIDENCE_CHANGED'};db.exec('COMMIT');return assessment;}catch(error){db.exec('ROLLBACK');throw error;}
}
