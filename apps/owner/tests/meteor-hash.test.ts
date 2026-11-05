import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createHash,createPublicKey,verify} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {Transaction,baseEncode,baseDecode} from 'near-api-js';
import {requestMeteorOwnerTransaction,type MeteorExtension} from '../src/data/meteor-message.ts';
import {ownerAttempt} from '../src/server/owner-attempt.ts';
import {ownerTransactionGate} from '../src/server/transaction-gates.ts';
import {configureOwnerScope} from './fixtures/owner-scope.ts';
import type {OrganizationService} from '../src/server/organization-api.ts';
const evidence=JSON.parse(fs.readFileSync(new URL('./fixtures/meteor-reference-refresh.json',import.meta.url),'utf8'));
const p=evidence.prepared,t=evidence.outcome.transaction;
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest();
const key=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(baseDecode(t.public_key.split(':')[1]))]),format:'der',type:'spki'});
const signature=baseDecode(t.signature.split(':')[1]);

test('historical Meteor mismatch is exactly a reference-block refresh, authenticated by the finalized transaction signature',()=>{
 const before=Buffer.from(p.unsigned,'base64'),after=Buffer.from(evidence.executedUnsigned,'base64');
 assert.equal(baseEncode(digest(before)),p.hash);assert.equal(baseEncode(digest(after)),t.hash);assert.equal(before.length,213);assert.equal(after.length,before.length);
 const changed=Array.from(before.keys()).filter(i=>before[i]!==after[i]);assert.deepEqual(changed,Array.from({length:32},(_,i)=>130+i));
 const a=Transaction.decode(before),b=Transaction.decode(after);assert.equal(baseEncode(Uint8Array.from(a.blockHash)),p.referenceBlock);assert.equal(baseEncode(Uint8Array.from(b.blockHash)),evidence.executedReference.hash);
 a.blockHash=b.blockHash;assert.deepEqual(Buffer.from(a.encode()),after);
 assert.ok(verify(null,digest(after),key,signature));assert.equal(verify(null,digest(before),key,signature),false);
 assert.equal(b.signerId,p.owner);assert.equal(b.publicKey.toString(),p.publicKey);assert.equal(String(b.nonce),p.nonce);assert.equal(b.receiverId,p.contract);assert.equal(b.actions.length,1);
 const call=b.actions[0].functionCall!;assert.equal(call.methodName,'fund_storage');assert.equal(Buffer.from(call.args).toString(),'{}');assert.equal(String(call.deposit),'1000000000000000000');assert.equal(String(call.gas),'100000000000000');
 assert.equal(evidence.outcome.final_execution_status,'FINAL');assert.deepEqual(evidence.outcome.status,{SuccessValue:''});assert.equal(evidence.outcome.transaction_outcome.id,t.hash);assert.ok(evidence.outcome.receipts_outcome.every((r:{id:string})=>r.id!==t.hash&&r.id!==p.hash));
});

test('changing another transaction field cannot authenticate as the observed finalized transaction',()=>{
 const mutations=[(x:any)=>x.nonce++, (x:any)=>x.signerId='other.testnet',(x:any)=>x.receiverId='other.testnet',(x:any)=>x.actions.push(x.actions[0]),(x:any)=>x.actions[0].functionCall.methodName='deposit',(x:any)=>x.actions[0].functionCall.args=Buffer.from('{"extra":true}'),(x:any)=>x.actions[0].functionCall.deposit++,(x:any)=>x.actions[0].functionCall.gas++,(x:any)=>x.publicKey.ed25519Key.data[0]^=1];
 for(const mutate of mutations){const tx=Transaction.decode(Buffer.from(evidence.executedUnsigned,'base64'));mutate(tx);const hash=digest(tx.encode());assert.notEqual(baseEncode(hash),t.hash);assert.equal(verify(null,hash,key,signature),false);}
});

test('Meteor transport sends the prepared bytes unchanged and reads transaction.hash, never a receipt ID',async()=>{
 let listener:(data:unknown)=>void=()=>{};const frames:any[]=[];
 const extension:MeteorExtension={addMessageDataListener:fn=>listener=fn,sendMessageData:frame=>frames.push(frame)};
 const pending=requestMeteorOwnerTransaction(extension,p.unsigned,1000);
 const first=frames[0];assert.equal(first.network,'testnet');assert.equal(first.actionType,'sign');assert.deepEqual(first.inputs,{transactions:p.unsigned});
 listener({uid:first.uid,status:'closed_success',network:'testnet',actionType:'sign',payload:{executionOutcomes:[evidence.outcome]}});
 assert.equal(await pending,t.hash);assert.equal(frames.filter(f=>f.status==='initializing').length,1);assert.equal(new Set(frames.map(f=>f.uid)).size,1);
 const receiptOnly=requestMeteorOwnerTransaction(extension,p.unsigned,1000),last=frames.at(-1);
 listener({uid:last.uid,status:'closed_success',payload:{executionOutcomes:[{receipts_outcome:evidence.outcome.receipts_outcome,transaction_outcome:{id:evidence.outcome.receipts_outcome[0].id}}]}});
 assert.equal(await receiptOnly,undefined); // No inferred transaction ID from a receipt.
});

test('the real reference-refresh case stays consumed and in manual review across reopen under unchanged V2 semantics',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-meteor-hash-')),scope=configureOwnerScope(directory),file=path.join(directory,'attempt.db');let db=new DatabaseSync(file),txReads=0;
 try{
 Object.assign(scope.plan,{owner:p.owner,organization:p.organization,contract:p.contract,expectedCodeHash:'Fpxm2eovD9cdo5ik6yZURyQEWTbruj6GKJi2XA6UBArJ'});scope.save();assert.equal(ownerTransactionGate().scope!.id,p.scopeId);
 db.exec('CREATE TABLE owner_wallet_attempts(scope TEXT PRIMARY KEY,payload TEXT NOT NULL); CREATE TABLE owner_acceptance_uses(scope TEXT PRIMARY KEY,attempt TEXT NOT NULL,state TEXT NOT NULL,payload TEXT NOT NULL)');
 const dispatched={...p,state:'unknown'};db.prepare('INSERT INTO owner_wallet_attempts VALUES (?,?)').run(p.organization+':'+p.owner,JSON.stringify(dispatched));db.prepare('INSERT INTO owner_acceptance_uses VALUES (?,?,?,?)').run(p.scopeId,p.id,'dispatched',JSON.stringify(dispatched));
 const s={get queue(){return{db};},auth:{authorize:async()=>({access:{organization:p.organization,accountId:p.owner},block:{hash:'1'.repeat(32),protocolVersion:88}}),verify:()=>({public_key:p.publicKey})},chain:{config:{network:'testnet',organization:p.organization,contract:p.contract,codeHash:scope.plan.expectedCodeHash},rpc:async(method:string,params:any)=>{if(method==='tx'){txReads++;return evidence.outcome;}if(method==='gas_price')return{gas_price:'100000000'};return params.request_type==='view_account'?{amount:'20000000000000000000000000',storage_usage:264}:{nonce:Number(p.nonceFloor)};}}} as unknown as OrganizationService;
 await ownerAttempt(s,'session',{action:'reported',id:p.id,hash:t.hash});db.close();db=new DatabaseSync(file);
 const held=await ownerAttempt(s,'session');assert.equal(held.hash,p.hash);assert.deepEqual(held.reportedHashes,[t.hash]);assert.equal(held.state,'manual_review');assert.equal(held.manualReviewRequired,true);assert.equal(txReads,0);
 assert.equal((db.prepare('SELECT state FROM owner_acceptance_uses').get() as {state:string}).state,'manual_review');assert.equal((db.prepare('SELECT count(*) n FROM owner_wallet_history').get() as {n:number}).n,1);
 await assert.rejects(ownerAttempt(s,'session',{action:'reserve',transport:'meteor',method:'fund_storage',args:{},deposit:p.deposit}),/already submitted/);
 await assert.rejects(ownerAttempt(s,'session',{action:'hash',id:p.id,hash:t.hash}),/Reconcile the recorded hash/);
 await assert.rejects(ownerAttempt(s,'session',{action:'rejected',id:p.id}),/Reconcile/);
 }finally{db.close();scope.close();fs.rmSync(directory,{recursive:true,force:true});}
});
