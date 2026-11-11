import {test} from "node:test";
import assert from "node:assert/strict";
import {matchesPayable,payableFor,projectPayables} from "../src/data/payables.ts";
import type {ContractorBill,ContractorProfile} from "../src/data/contractor-adapter.ts";
import type {DemoWsPayment} from "../src/data/demo-workspace-adapter.ts";

const profile:ContractorProfile={id:"writer",name:"Writer",generation:1,linkActive:true,wallet:"approved.testnet",walletVersion:1,pendingWallet:null,archived:false,archivedAt:null};
const bill=(over:Partial<ContractorBill>={}):ContractorBill=>({id:"invoice",contractorId:"writer",reference:"INV-1",orderId:"",amount:"2",asset:"NEAR",recipient:"old.testnet",text:"Original request",description:"Article",status:"Submitted",reasons:[],ownerNote:"",attachment:null,transactionUrl:null,submittedAt:"2026-11-01T00:00:00Z",...over});
const payment=(status:DemoWsPayment["status"]):DemoWsPayment=>({id:"attempt",contractor:"Writer",recipient:"approved.testnet",amount:"2000000000000000000000000",fee:"0",total:"2000000000000000000000000",description:"Article",status,reason:status==="failed"?"Mock solver failed":"",reference:"SIM-1",createdAt:"2026-11-01T00:00:00Z",settledAt:null,billId:"invoice",awaitingConfirmation:status==="prepared"});

test("one payable follows the authoritative invoice and linked attempt through its lifecycle",()=>{
    assert.equal(payableFor(bill(),profile).stage,"Awaiting Approval");
    const approved=bill({status:"Approved"});
    assert.equal(payableFor(approved,profile).stage,"Ready to Pay");
    assert.equal(payableFor(approved,profile,[payment("prepared")]).stage,"Processing");
    assert.equal(payableFor(approved,profile,[payment("pending")]).stage,"Processing");
    const paid=payableFor(approved,profile,[payment("confirmed")]);assert.equal(paid.stage,"Paid");assert.equal(paid.remainingAmount,"0");
    assert.equal(projectPayables({mode:"simulation",profiles:[profile],orders:[],invoices:[approved]},[payment("confirmed"),{...payment("failed"),id:"old-attempt"}]).length,1);
});
test("failed attempts remain retryable without losing approved invoice context",()=>{
    const item=payableFor(bill({status:"Approved"}),profile,[payment("failed")]);
    assert.equal(item.stage,"Ready to Pay");assert.equal(item.approvalStatus,"Approved");
    assert.equal(matchesPayable(item,"Ready to Pay"),true);assert.equal(matchesPayable(item,"Rejected / Failed"),true);
    assert.equal(item.description,"Article");assert.equal(item.recipient,"approved.testnet");
});
test("requested and approved amounts/provenance stay distinct; absent facts stay unknown",()=>{
    const item=payableFor(bill({status:"Approved",requestedAmount:"3",requestedAsset:"NEAR",approval:{amount:"2",asset:"NEAR",by:"owner.testnet",at:"2026-11-03T00:00:00Z",adjustmentReason:"Recorded scope correction"}}),profile);
    assert.equal(item.requestedAmount,"3");assert.equal(item.approvedAmount,"2");assert.equal(item.adjustmentReason,"Recorded scope correction");assert.equal(item.approver,"owner.testnet");
    const legacy=payableFor(bill({status:"Approved"}),profile);assert.equal(legacy.approver,null);assert.equal(legacy.approvedAt,null);assert.equal(legacy.adjustmentReason,null);assert.equal(legacy.overdue,null);
});
test("wallet requirements and persistent settlement evidence remain independent of invoice approval",()=>{
    const item=payableFor(bill({status:"Approved"}),{...profile,wallet:null});assert.equal(item.stage,"Ready to Pay");assert.ok(item.blockers.some(b=>b.includes("Approved wallet")));
    const live=payableFor(bill({status:"Paid"}),profile,[],"persistent");assert.notEqual(live.stage,"Paid");assert.ok(live.blockers.some(b=>b.includes("settlement evidence")));
    assert.equal(payableFor(bill({status:"Approved",payment:{state:"unknown",reason:"Awaiting reconciliation",orderId:"chain",transactionUrl:null,confirmed:false}}),profile,[],"persistent").stage,"Processing");
    assert.equal(payableFor(bill({status:"Paid",payment:{state:"paid",reason:"Verified",orderId:"chain",transactionUrl:null,confirmed:true}}),profile,[],"persistent").stage,"Paid");
});
test("search and overdue filters use recorded dates without inferring a due date",()=>{
    const item=payableFor(bill({status:"Approved",dueAt:"2026-11-01T00:00:00Z"}),profile,[],"simulation",Date.parse("2026-11-11T00:00:00Z"));
    assert.equal(item.overdue,true);assert.equal(matchesPayable(item,"All","writer"),true);assert.equal(matchesPayable(item,"All","INV-1"),true);assert.equal(matchesPayable(item,"Paid"),false);
    assert.equal(payableFor(bill({dueAt:"invalid"}),profile).overdue,null);
});
