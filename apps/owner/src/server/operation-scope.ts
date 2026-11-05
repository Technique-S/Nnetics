/** Explicit bounded operational plans, separate from the consumed V2 acceptance.
 * Selecting a step never dispatches it. Every step is consumed durably by owner-attempt.
 */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {validateOwnerCall} from '../data/owner-transaction.ts';
import {account} from '../data/owner-adapter.ts';
import type {OwnerScope} from './transaction-gates.ts';
import {TESTNET_GENESIS} from './reference-block-policy.ts';
import {PublicKey} from 'near-api-js';
export function assertOperationalNetwork(status:any){if(status?.chain_id!=='testnet'||status.genesis_hash!==TESTNET_GENESIS||status.protocol_version!==88||status.sync_info?.syncing!==false)throw Error('Reviewed testnet genesis/protocol could not be verified. No submission permitted.');}
export function isCleanup(method:string,args:Record<string,unknown>|undefined) {
 return method==='revoke_agent'||(method==='set_paused'&&args?.paused===true);
}
export function operationScope(p:any,planHash:string,step:string|undefined):OwnerScope {
 const reject=()=>{throw Error('Invalid bounded owner operation plan');};
 const recovery=p.version===5&&p.cleanupRecovery==='finalized-failure-v1';
 if((p.version!==4&&!recovery)||p.scopePolicy!=='bounded-owner-operations-v1'||p.network!=='testnet'||p.status!=='ready-for-review'||!step||!Array.isArray(p.operations)||p.operations.length<1||p.operations.length>16||!/^[a-zA-Z0-9_-]{8,64}$/.test(p.approvalId)||p.referencePolicySha256!=='1ff5abb96c4633d8d6f510ec4a2ab44c1fbf0bfe45d959edc05dc7bbd6543709'||p.preservedHistoricalRecordSha256!=='8e64a71240fc3292f01ae8ed3782e2c3343e34a21bd3c5e0e7b9c3cf355fcdfc')reject();
 for(const id of [p.owner,p.contract]){account(id);if(!id.endsWith('.testnet'))reject();}
 if(typeof p.ownerPublicKey!=='string'||!p.ownerPublicKey.startsWith('ed25519:')||PublicKey.fromString(p.ownerPublicKey).toString()!==p.ownerPublicKey)reject();
 if(!/^[A-Za-z0-9_-]{1,64}$/.test(p.organization)||! /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(p.expectedCodeHash)||p.reviewValidityMs!==180000||!Number.isSafeInteger(p.validUntil))reject();
 if(recovery&&(!Number.isSafeInteger(p.cleanupValidUntil)||p.cleanupValidUntil<p.validUntil||p.cleanupValidUntil-p.validUntil>30*60*1000))reject();
 const ids=new Set(),replaced=new Set(),cleanupMethods=new Set();let total=0n;
 for(const op of p.operations){
  if(!/^[a-z0-9_-]{1,64}$/.test(op.id)||ids.has(op.id)||!Array.isArray(op.actions)||op.actions.length!==1)reject();ids.add(op.id);
  const a=op.actions[0];if(!isDeepStrictEqual(Object.keys(a).sort(),['args','depositYoctoNEAR','gas','method','type'])||a.type!=='FunctionCall')reject();
  validateOwnerCall(a.method,a.args,a.depositYoctoNEAR);
  if(op.id.startsWith('cleanup-')&&!isCleanup(a.method,a.args))reject();
  if(recovery&&isCleanup(a.method,a.args)&&!op.id.startsWith('cleanup-'))reject();
  if(op.replaces!==undefined){
   const original=p.operations.slice(0,p.operations.indexOf(op)).find((o:any)=>o.id===op.replaces);
   if(!recovery||!op.id.startsWith('cleanup-')||!original?.id.startsWith('cleanup-')||original.replaces!==undefined||replaced.has(op.replaces)||!isDeepStrictEqual(op.actions,original.actions))reject();
   replaced.add(op.replaces);
  }else if(recovery&&op.id.startsWith('cleanup-')){
   if(cleanupMethods.has(a.method))reject();
   cleanupMethods.add(a.method);
  }
  const relay=a.method==='advance_repair_head';
  if(a.gas!==(relay?'250000000000000':'100000000000000')||op.maxFeeYoctoNEAR!==(relay?'55000000000000000000000':'22000000000000000000000'))reject();
  total+=BigInt(a.depositYoctoNEAR)+BigInt(op.maxFeeYoctoNEAR);
 }
 if(String(total)!==p.maximumOwnerAllowanceYoctoNEAR)reject();
 const op=p.operations.find((o:any)=>o.id===step);if(!op)reject();const a=op.actions[0];
 const cleanupRecovery=recovery&&op.id.startsWith('cleanup-'),validUntil=cleanupRecovery?p.cleanupValidUntil:p.validUntil;
 if(Date.now()>=validUntil)reject();
 const scopeId=(o:any)=>createHash('sha256').update(JSON.stringify(['bounded-owner-operations-v1',p.approvalId,p.network,p.organization,p.owner,p.contract,p.expectedCodeHash,o.id,o.actions[0]])).digest('hex');
 const id=scopeId(op),prerequisites=op.id.startsWith('cleanup-')?[]:p.operations.slice(0,p.operations.indexOf(op)).map(scopeId);
 return {id,planHash,network:'testnet',owner:p.owner,organization:p.organization,contract:p.contract,codeHash:p.expectedCodeHash,method:a.method,args:a.args,deposit:a.depositYoctoNEAR,gas:a.gas,maxFee:op.maxFeeYoctoNEAR,reviewValidityMs:p.reviewValidityMs,operational:true,validUntil,publicKey:p.ownerPublicKey,prerequisites,cleanupRecovery,replaces:op.replaces===undefined?undefined:scopeId(p.operations.find((o:any)=>o.id===op.replaces))};
}
