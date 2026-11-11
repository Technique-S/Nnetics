import {test,after} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const folder=fs.mkdtempSync(path.join(os.tmpdir(),"nnetics-payables-"));
process.env.NNETICS_DEMO_WORKSPACE_DB=path.join(folder,"workspace.db");
process.env.NNETICS_DEMO_PORTAL_DB=path.join(folder,"portal.db");
const {demoWorkspace}=await import("../src/server/demo-workspace.ts");
const {demoContractors}=await import("../src/server/demo-contractors.ts");
const {AgentToolExecutor}=await import("../src/server/agent-tool-executor.ts");
const {catalogForMode}=await import("../src/server/agent-tool-catalog.ts");
const ledger=demoWorkspace(),portal=demoContractors();
after(()=>{ledger.close();portal.db.close();fs.rmSync(folder,{recursive:true,force:true});});
function fixture(){
    const token=ledger.start("").token;ledger.createWorkspace(token,{profileName:"Owner",vaultName:"Vault"});ledger.fund(token,"10000000000000000000000000");
    const owner=portal.ownerStart(""),profileId=portal.ownerCommand(owner,{action:"create-profile",name:"Writer"}).profileId!;
    const session=portal.enter(portal.ownerCommand(owner,{action:"issue-link",profileId}).token!);
    const invoice=portal.command(session,{action:"submit-invoice",submissionId:"original",fields:{orderId:"",amount:"2",asset:"NEAR"},text:"Invoice: SOURCE-1\nAmount: 2 NEAR\nOriginal article request",description:"Article"}).invoice!;
    const executor=new AgentToolExecutor(true,{orgId:"demo",isDemo:true,demoWorkspaceToken:token,demoPortalToken:owner});
    return {token,owner,profileId,session,invoice,executor};
}
test("clarification preserves the initial request, approval snapshots the confirmed amount and records time without inventing a demo user",()=>{
    const f=fixture();portal.ownerCommand(f.owner,{action:"review-invoice",invoiceId:f.invoice.id,decision:"clarify",note:"Please confirm the corrected claim."});
    portal.command(f.session,{action:"clarify-invoice",invoiceId:f.invoice.id,submissionId:"clarified",fields:{orderId:"",amount:"1",asset:"NEAR"},text:"Amount: 1 NEAR\nCorrected article request",description:"Article"});
    portal.ownerCommand(f.owner,{action:"review-invoice",invoiceId:f.invoice.id,decision:"approve",note:""});
    const bill=portal.ownerSnapshot(f.owner).invoices[0];
    assert.equal(bill.requestedAmount,"2");assert.equal(bill.amount,"1");assert.equal(bill.approval?.amount,"1");assert.equal(bill.approval?.by,null);assert.ok(Number.isFinite(Date.parse(bill.approval!.at)));
    assert.equal(bill.sourceReference,"SOURCE-1");assert.equal(bill.originalText,f.invoice.text);assert.deepEqual(bill.reviewEvents?.map(e=>e.action),["clarify","approve"]);
    const stored=JSON.parse((portal.db.prepare("SELECT payload FROM demo_bills WHERE id=?").get(bill.id) as {payload:string}).payload);assert.deepEqual(stored.approval,bill.approval);
});
test("Payables tools expose authorized original context and unknown due dates without approving or paying",async()=>{
    const f=fixture();portal.ownerCommand(f.owner,{action:"review-invoice",invoiceId:f.invoice.id,decision:"approve",note:""});
    const result=await f.executor.getPayable({id:f.invoice.reference});assert.equal(result.success,true);
    if(result.success){const item=result.data as {requestedAmount:string;approvedAmount:string;approver:unknown;approvedAt:string;originalInvoiceText:string;blockers:string[];overdue:unknown};assert.equal(item.requestedAmount,"2");assert.equal(item.approvedAmount,"2");assert.equal(item.approver,null);assert.ok(item.approvedAt);assert.equal(item.originalInvoiceText,f.invoice.text);assert.equal(item.overdue,null);assert.ok(item.blockers.some(b=>b.includes("Approved wallet")));}
    const overdue=await f.executor.listPayables({overdue:true});assert.equal(overdue.success,true);if(overdue.success){assert.equal((overdue.data as {count:number}).count,0);assert.equal((overdue.data as {dueDatesUnknown:number}).dueDatesUnknown,1);}
    assert.equal(ledger.state(f.token).payments.length,0);assert.equal(ledger.state(f.token).vault.reserved,"0");
    const foreign=fixture();assert.equal((await foreign.executor.getPayable({id:f.invoice.id})).success,false);
    const unauthorized=new AgentToolExecutor(true,{orgId:"demo",isDemo:true,demoWorkspaceToken:f.token,demoPortalToken:f.session});assert.equal((await unauthorized.listPayables({})).success,false);
    assert.equal(catalogForMode("live").some(tool=>tool.name==="get_payable"||tool.name==="list_payables"),false);
});
