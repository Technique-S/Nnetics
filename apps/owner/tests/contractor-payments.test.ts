import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Queue} from "../src/server/queue.ts";
import {ContractorBackend} from "../src/server/contractor-service.ts";
import {IdentityAuth} from "../src/server/identity.ts";
import {reviewedPayment,importPaymentIntent} from "../src/server/contractor-payments.ts";
import {MockOwnerAdapter} from "../src/data/mock-adapter.ts";
import {formatNear,uint} from "../src/data/owner-adapter.ts";
import type {ContractorBill} from "../src/data/contractor-adapter.ts";
async function fixture(){const snapshot=await new MockOwnerAdapter(0).snapshot();snapshot.mode="testnet";snapshot.blockHash="finalized-fixture";snapshot.chainTimeNs=uint("1");const chain=snapshot.orders.find(o=>o.status==="Approved")!;const local={id:"local-order",reference:"WO-1",contractorId:"profile",title:"Work",amount:formatNear(chain.amount),recipient:chain.recipient};const bill:ContractorBill={id:"bill",reference:"CTR-0042-INV-0001",contractorId:"profile",orderId:local.id,amount:local.amount,asset:"NEAR",recipient:local.recipient,text:"Delivered work",originalText:"Delivered work",description:"Work",status:"Approved",reasons:[],ownerNote:"",attachment:null,transactionUrl:null,submittedAt:"now"};return {snapshot,chain,local,bill};}
test("queue mapping requires exactly one approved chain order and independently derives recipient/amount/vendor",async()=>{
 const f=await fixture(),invoice=reviewedPayment(f.bill,f.local,f.snapshot,f.chain.id);assert.equal(invoice.amount,f.chain.amount);assert.equal(invoice.recipient,f.chain.recipient);assert.equal(invoice.vendor_id,f.chain.vendor_id);
 for(const bill of [{...f.bill,status:"Submitted" as const},{...f.bill,recipient:"attacker.testnet"},{...f.bill,amount:"999999"},{...f.bill,reasons:["Clarify"]}])assert.throws(()=>reviewedPayment(bill,f.local,f.snapshot,f.chain.id));
 assert.throws(()=>reviewedPayment(f.bill,f.local,f.snapshot,"missing"));f.chain.status="Pending";assert.throws(()=>reviewedPayment(f.bill,f.local,f.snapshot,f.chain.id));
});
test("durable intent resumes across both database restarts without resetting submitted/paid claims",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"nnetics-contractor-queue-")),f=await fixture(),invoice=reviewedPayment(f.bill,f.local,f.snapshot,f.chain.id);
 const identities=new IdentityAuth({network:"testnet",origin:"http://127.0.0.1:3100",rpc:"https://test.rpc.fastnear.com",database:path.join(dir,"identities.db")});
 let backend=new ContractorBackend(path.join(dir,"contractors.db"),identities),queue=new Queue(path.join(dir,"queue.db"),"fixture-scope");queue.bindOrganization("org");
 try{
  // Crash after intent is committed, before queue import.
  backend.db.prepare("INSERT INTO contractor_queue_intents VALUES (?,?,?,?,?)").run(f.bill.id,"org",invoice.order_id,JSON.stringify(invoice),"prepared");backend.db.close();queue.close();backend=new ContractorBackend(path.join(dir,"contractors.db"),identities);queue=new Queue(path.join(dir,"queue.db"),"fixture-scope");
  const job=importPaymentIntent(backend.db,"org",f.bill.id,invoice,queue);assert.equal(job.state,"review");assert.equal(job.invoice.reviewed,true);assert.equal(queue.all().length,1);
  // Repeated owner requests while held, then an app/queue restart: same job,
  // no signing material or payment attempt can appear just from linkage.
  for(let i=0;i<25;i++)assert.equal(importPaymentIntent(backend.db,"org",f.bill.id,invoice,queue).id,job.id);
  backend.db.close();queue.close();backend=new ContractorBackend(path.join(dir,"contractors.db"),identities);queue=new Queue(path.join(dir,"queue.db"),"fixture-scope");
  const held=importPaymentIntent(backend.db,"org",f.bill.id,invoice,queue);assert.equal(held.state,"review");assert.equal(held.hash,null);assert.equal(held.signed,null);assert.equal(held.attempt,null);assert.equal(queue.all().length,1);
  assert.equal((backend.db.prepare("SELECT count(*) n FROM contractor_queue_intents WHERE bill=?").get(f.bill.id) as {n:number}).n,1);
  queue.update(job.id,"submitted","Unknown outcome",{hash:"same-hash",signed:"same-bytes"});
  assert.equal(importPaymentIntent(backend.db,"org",f.bill.id,invoice,queue).state,"submitted");assert.equal(queue.all().length,1);
  // Crash after queue import, before recording linkage completion.
  backend.db.exec("UPDATE contractor_queue_intents SET state='prepared'");backend.db.close();queue.close();backend=new ContractorBackend(path.join(dir,"contractors.db"),identities);queue=new Queue(path.join(dir,"queue.db"),"fixture-scope");
  const resumed=importPaymentIntent(backend.db,"org",f.bill.id,invoice,queue);assert.equal(resumed.hash,"same-hash");assert.equal(resumed.signed,"same-bytes");assert.equal(resumed.state,"submitted");
  assert.throws(()=>importPaymentIntent(backend.db,"org","another-bill",{...invoice,id:"CTR-0043-INV-0001"},queue),/different durable/);
  assert.throws(()=>queue.importReviewed({...invoice,id:"another"}),/already has/);assert.throws(()=>queue.importReviewed({...invoice,amount:uint("1")}),/differs/);assert.throws(()=>queue.bindOrganization("outsider"),/different organization/);
  queue.update(invoice.id,"paid");assert.equal(importPaymentIntent(backend.db,"org",f.bill.id,invoice,queue).state,"paid");assert.equal(queue.all().length,1);
 }finally{backend.db.close();queue.close();identities.db.close();fs.rmSync(dir,{recursive:true});}
});
