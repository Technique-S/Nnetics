import {NEAR_ASSET} from "../data/billing-assets.ts";
import type {ContractorBill,ContractorOrder} from "../data/contractor-adapter.ts";
import {amountFromNear} from "../data/owner-adapter.ts";
import type {OwnerSnapshot} from "../data/owner-adapter.ts";
import {boundedId} from "./queue.ts";
import type {Queue} from "./queue.ts";
import type {DatabaseSync} from "node:sqlite";
import {sourceQuestions} from "./billing-extraction.ts";

// No AI field can supply payment authority. Caller supplies a pinned, verified
// chain snapshot; actual recipient, vendor and amount all come from that order.
export function reviewedPayment(bill:ContractorBill,local:ContractorOrder,snapshot:OwnerSnapshot,orderId:string){
 if(bill.asset!=="NEAR"||(bill.payoutAsset??NEAR_ASSET)!==NEAR_ASSET)throw Error("Live settlement supports native NEAR only; invoice review remains available.");
 if(bill.status!=="Approved"||bill.reasons.length||bill.orderId!==local.id||bill.contractorId!==local.contractorId)throw Error("One reviewed invoice and its own approved billing order are required.");
 if(sourceQuestions(bill.text,bill.amount).length)throw Error("Source billing details still require clarification; no queue entry created.");
 const order=snapshot.orders.find(o=>o.id===boundedId(orderId));
 if(snapshot.mode!=="testnet"||!snapshot.blockHash||!order||!order.enabled||order.status!=="Approved"||BigInt(order.expires_at_ns)<=BigInt(snapshot.chainTimeNs||"0"))throw Error("A current finalized approved on-chain work order is required.");
 const vendor=snapshot.vendors.find(v=>v.id===order.vendor_id);
 if(!vendor?.active||vendor.recipient!==order.recipient||order.recipient!==local.recipient||bill.recipient!==local.recipient||order.amount!==amountFromNear(local.amount)||amountFromNear(bill.amount)!==order.amount||bill.asset!=="NEAR")throw Error("Chain work order, approved billing order and invoice differ; no queue entry created.");
 if(bill.text.length>8000)throw Error("Billing text exceeds the durable payment queue's 8,000-character limit. Keep the original record and resolve before linkage.");
 return {id:boundedId(bill.reference),order_id:order.id,vendor_id:order.vendor_id,recipient:order.recipient,amount:order.amount,asset:"NEAR",text:bill.text};
}
export function importPaymentIntent(db:DatabaseSync,org:string,billId:string,invoice:ReturnType<typeof reviewedPayment>,queue:Queue){
 db.prepare("INSERT OR IGNORE INTO contractor_queue_intents VALUES (?,?,?,?,?)").run(billId,org,invoice.order_id,JSON.stringify(invoice),"prepared");
 const intent=db.prepare("SELECT payload FROM contractor_queue_intents WHERE bill=? AND org=?").get(billId,org) as {payload:string}|undefined;
 if(!intent||intent.payload!==JSON.stringify(invoice))throw Error("Invoice/order already has a different durable linkage. Investigate before retry.");
 const job=queue.importReviewed(invoice);
 db.prepare("UPDATE contractor_queue_intents SET state='linked' WHERE bill=? AND org=?").run(billId,org);
 return job;
}
