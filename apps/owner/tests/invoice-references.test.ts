import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Worker} from "node:worker_threads";
import {account,uint} from "../src/data/owner-adapter.ts";
import {Queue} from "../src/server/queue.ts";
const draft={id:"submission-1",order_id:"order-1",vendor_id:"vendor-1",recipient:account("writer.testnet"),amount:uint("1000000000000000000000000"),asset:"NEAR",text:"One article"};
test("owner entry generates durable references, rejects currencies and retains work-order claims",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"nnetics-reference-")),file=path.join(dir,"queue.db");let q=new Queue(file);
 try {
  for(const text of ["Amount: 2 EUR","Please pay in dollars","Amount: 2 USDC"])
   assert.throws(()=>q.submitGenerated({...draft,text},[]),/Currency conflict/);
  assert.throws(()=>q.submitGenerated({...draft,asset:"USD"},[]),/Currency conflict/);
  const first=q.submitGenerated(draft,["Review required"]);assert.match(first.id,/^CTR-\d+-INV-0001$/);
  assert.equal(q.submitGenerated(draft,[]).id,first.id);assert.equal(q.get(first.id)!.state,"review");
  assert.throws(()=>q.submitGenerated({...draft,amount:uint("2")},[]),/different invoice/);
  assert.equal(q.submitGenerated({...draft,id:"new-attempt"},[]).id,first.id);
  assert.throws(()=>q.submitGenerated({...draft,id:"changed",text:"Different request"},[]),/already has/);
  q.close();q=new Queue(file);assert.equal(q.submitGenerated(draft,[]).id,first.id);
  const second=q.submitGenerated({...draft,id:"second",order_id:"order-2"},[]);assert.equal(second.id,first.id.replace(/0001$/,"0002"));
  assert.equal(q.all().length,2);
 }finally{q.close();fs.rmSync(dir,{recursive:true});}
});
test("independent SQLite writers return one invoice for simultaneous identical submissions",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"nnetics-reference-race-")),file=path.join(dir,"queue.db");const initial=new Queue(file);initial.close();
 const run=(input:typeof draft)=>new Promise<string>((resolve,reject)=>{
  const worker=new Worker(`const {workerData,parentPort}=require('node:worker_threads');(async()=>{const {Queue}=await import(workerData.module);const q=new Queue(workerData.file);try{parentPort.postMessage(q.submitGenerated(workerData.input,[]).id);}finally{q.close();}})().catch(e=>{throw e;});`,{eval:true,workerData:{module:new URL("../src/server/queue.ts",import.meta.url).href,file,input}});
  worker.once("message",resolve);worker.once("error",reject);
 });
 try{const ids=await Promise.all(Array.from({length:4},()=>run(draft)));assert.equal(new Set(ids).size,1);
  const others=await Promise.all(Array.from({length:4},(_,i)=>run({...draft,id:`new-${i}`,order_id:`new-order-${i}`})));
  assert.equal(new Set(others).size,4);const q=new Queue(file);assert.equal(q.all().length,5);q.close();
 }finally{fs.rmSync(dir,{recursive:true});}
});
