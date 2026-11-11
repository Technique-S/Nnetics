import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DemoWorkspaceStore} from "../src/server/demo-workspace.ts";
import {DemoContractorStore} from "../src/server/demo-contractors.ts";
import {ContractorRecordStore} from "../src/server/contractor-records.ts";
import {LocalDemoIntents,previewDemoQuote} from "../src/server/demo-intents.ts";
import {amountFromNear} from "../src/data/owner-adapter.ts";
import {BILLING_ASSETS,NEAR_ASSET,validateInvoiceClaim} from "../src/data/billing-assets.ts";
import {projectPayables} from "../src/data/payables.ts";
const USDC=BILLING_ASSETS[1].id;
function fixture(){
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),"multi-billing-"));let now=Date.now();
    let ledger=new DemoWorkspaceStore(path.join(dir,"ledger.db"),{now:()=>now});
    const portal=new DemoContractorStore(path.join(dir,"portal.db")),owner=portal.ownerStart("");
    const token=ledger.start("").token;ledger.createWorkspace(token,{profileName:"Owner",vaultName:"Multi"});ledger.fund(token,amountFromNear("1000"));
    const profileId=portal.ownerCommand(owner,{action:"create-profile",name:"Video editor"}).profileId!;
    const session=portal.enter(portal.ownerCommand(owner,{action:"issue-link",profileId}).token!);
    let engine=new LocalDemoIntents(ledger,portal,()=>now,60000,1000);
    const submit=(asset="USDC",payoutAsset:string=USDC)=>portal.command(session,{action:"submit-invoice",submissionId:crypto.randomUUID(),fields:{orderId:"",amount:"500",asset,payoutAsset,denominationConfirmed:true},text:asset==="USDC"?"$500 for 2 edited videos":`500 ${asset} for 2 edited videos`,description:"2 edited videos"}).invoice!;
    const approve=(id:string)=>portal.ownerCommand(owner,{action:"review-invoice",invoiceId:id,decision:"approve",note:""});
    const wallet=()=>{const challenge=portal.command(session,{action:"wallet-challenge",account:"editor.testnet"}).challenge!;portal.command(session,{action:"wallet-proof",challenge});portal.ownerCommand(owner,{action:"approve-wallet",profileId,requestId:portal.ownerSnapshot(owner).profiles[0].pendingWallet!.id});};
    const quote=(id:string,scenario:"success"|"failure"|"refund"="success")=>engine.quote(token,owner,{billId:id,sourceAsset:"near",key:crypto.randomUUID(),scenario});
    return {portal,owner,token,session,profileId,submit,approve,wallet,quote,get ledger(){return ledger;},get engine(){return engine;},advance(ms=2000){now+=ms;},restart(){ledger.close();ledger=new DemoWorkspaceStore(path.join(dir,"ledger.db"),{now:()=>now});engine=new LocalDemoIntents(ledger,portal,()=>now,60000,1000);},close(){ledger.close();portal.db.close();fs.rmSync(dir,{recursive:true,force:true});}};
}
test("dollar ambiguity requires explicit denomination and payout, never infers USDC or 500 NEAR",()=>{
    assert.throws(()=>validateInvoiceClaim("$500 for 2 videos","500","USDC",false),/confirm/i);
    validateInvoiceClaim("$500 for 2 videos","500","USD",true);
    assert.throws(()=>validateInvoiceClaim("500 USDC","500","NEAR",true),/denomination/);
    assert.throws(()=>validateInvoiceClaim("500 USDC","50","USDC",true),/amount conflicts/);
});
test("unlinked 500 USDC invoice precedes wallet approval; exact NEAR-funded delivery persists and cannot repeat",()=>{
    const f=fixture();try{
        const b=f.submit();assert.equal(b.asset,"USDC");assert.equal(b.amount,"500");assert.equal(b.payoutAsset,USDC);assert.equal(b.recipient,"");assert.equal(b.originalText,"$500 for 2 edited videos");assert.equal(b.orderId,"");
        f.approve(b.id);assert.throws(()=>f.quote(b.id),/Approved recipient/);f.wallet();const q=f.quote(b.id);
        assert.equal(q.intent.destinationAmount,"500");assert.equal(q.intent.destinationAssetId,USDC);assert.equal(q.intent.sourceAssetId,NEAR_ASSET);assert.equal(q.intent.sourceAmount,"125.3125");assert.equal(q.intent.fee,amountFromNear("0.3125"));
        f.engine.authorize(f.token,f.owner,q.intent.id);assert.equal(f.ledger.state(f.token).vault.reserved,q.intent.total);
        assert.throws(()=>f.portal.ownerCommand(f.owner,{action:"propose-amendment",invoiceId:b.id,amount:"400",reason:"Scope changed",kind:"revised-approval"}),/active payment/);
        f.engine.execute(f.token,f.owner,q.intent.id);f.restart();f.advance();const paid=f.engine.list(f.token,f.owner)[0].intent;
        assert.equal(paid.deliveredAmount,"500");assert.equal(paid.deliveredAssetId,USDC);assert.equal(f.portal.snapshot(f.session).invoices[0].status,"Paid");
        assert.equal(f.ledger.state(f.token).vault.spent,q.intent.total);assert.match(f.ledger.state(f.token).receipts[0].summary,/500 USDC on NEAR/);
        f.engine.execute(f.token,f.owner,q.intent.id);assert.equal(f.ledger.state(f.token).receipts.length,1);assert.throws(()=>f.quote(b.id),/Approved invoice/);
    }finally{f.close();}
});
for(const outcome of ["failure","refund"] as const)test(`multi-currency ${outcome} refunds reservation and retains full obligation`,()=>{
    const f=fixture();try{f.wallet();const b=f.submit();f.approve(b.id);const q=f.quote(b.id,outcome);f.engine.authorize(f.token,f.owner,q.intent.id);f.engine.execute(f.token,f.owner,q.intent.id);f.advance();f.engine.list(f.token,f.owner);f.engine.list(f.token,f.owner);
        const state=f.ledger.state(f.token);assert.equal(state.vault.reserved,"0");assert.equal(state.vault.spent,"0");assert.equal(projectPayables(f.portal.ownerSnapshot(f.owner),state.payments)[0].remainingAmount,"500");
    }finally{f.close();}
});
test("quote expiry, insufficient balance, unsupported destination and forged amendments fail closed",()=>{
    const f=fixture();try{f.wallet();const b=f.submit();f.approve(b.id);const q=f.quote(b.id);assert.throws(()=>f.engine.quote(f.token,f.owner,{billId:b.id,sourceAsset:"near",key:crypto.randomUUID(),scenario:"quote-failure"}),/Mock quote failed/);assert.equal(f.ledger.state(f.token).vault.reserved,"0");f.ledger.setLimit(f.token,amountFromNear("1"));assert.throws(()=>f.engine.authorize(f.token,f.owner,q.intent.id),/limit/);f.ledger.setLimit(f.token,"");
        f.engine.authorize(f.token,f.owner,q.intent.id);f.advance(61000);assert.equal(f.engine.execute(f.token,f.owner,q.intent.id).intent.state,"EXPIRED");f.engine.list(f.token,f.owner);assert.equal(f.ledger.state(f.token).vault.reserved,"0");
        const retry=f.quote(b.id);f.ledger.db.prepare("UPDATE demo_ws_workspaces SET vault=json_set(vault,'$.funded','0') WHERE workspace=?").run(retry.intent.workspace);
        assert.throws(()=>f.engine.authorize(f.token,f.owner,retry.intent.id),/Insufficient simulated funds/);assert.equal(f.ledger.state(f.token).vault.reserved,"0");
        const other=f.submit("USDC",BILLING_ASSETS[3].id);f.approve(other.id);assert.throws(()=>f.quote(other.id),/Unsupported payout route/);
        assert.throws(()=>f.portal.command(f.session,{action:"propose-amendment",invoiceId:b.id,amount:"10",reason:"forged",kind:"revised-approval"} as never),/owner/);
    }finally{f.close();}
});
test("lower amount requires authenticated contractor acknowledgment and fresh approval; original request survives",()=>{
    const f=fixture();try{f.wallet();const b=f.submit();f.approve(b.id);const originalQuote=f.quote(b.id);
        assert.throws(()=>f.portal.ownerCommand(f.owner,{action:"propose-amendment",invoiceId:b.id,amount:"400",reason:"Not a supported partial payment",kind:"partial"} as never),/Partial payments/);
        const foreign=f.portal.ownerStart("");assert.throws(()=>f.portal.ownerCommand(foreign,{action:"propose-amendment",invoiceId:b.id,amount:"400",reason:"forged",kind:"revised-approval"}),/approved invoice/);
        f.portal.ownerCommand(f.owner,{action:"propose-amendment",invoiceId:b.id,amount:"400",reason:"One video removed by agreement",kind:"revised-approval"});
        assert.throws(()=>f.engine.authorize(f.token,f.owner,originalQuote.intent.id),/Approved invoice/);
        assert.throws(()=>f.approve(b.id),/acknowledge/);
        const pending=f.portal.snapshot(f.session).invoices[0];assert.equal(pending.amount,"500");
        f.portal.command(f.session,{action:"respond-amendment",invoiceId:b.id,amendmentId:pending.amendments![0].id,accept:true});
        assert.throws(()=>f.quote(b.id),/Approved invoice/);f.approve(b.id);const revised=f.quote(b.id);assert.equal(revised.intent.destinationAmount,"400");
        f.engine.authorize(f.token,f.owner,revised.intent.id);const record=f.portal.snapshot(f.session).invoices[0];assert.equal(record.requestedAmount,"500");assert.equal(record.approval?.amount,"400");assert.ok(record.amendments![0].acknowledgedAt);assert.ok(record.amendments![0].approvedAt);assert.ok(record.amendments![0].authorizedAt);
        assert.equal(projectPayables(f.portal.ownerSnapshot(f.owner),f.ledger.state(f.token).payments)[0].remainingAmount,"400");
    }finally{f.close();}
});
test("fiat invoice value remains separate from simulated crypto output",()=>{
    const f=fixture();try{const b=f.submit("EUR");f.approve(b.id);f.wallet();const q=f.quote(b.id);assert.equal(q.intent.invoiceCurrency,"EUR");assert.equal(q.intent.invoiceAmount,"500");assert.equal(q.intent.destinationAmount,"540");assert.equal(q.intent.destinationSymbol,"USDC");
        assert.equal(previewDemoQuote("1","near",undefined,BILLING_ASSETS[2].id,"USDT").destinationAmount,"1");
    }finally{f.close();}
});
test("persistent foreign invoice can be reviewed but never becomes a live multi-currency route",()=>{
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),"live-multi-")),store=new ContractorRecordStore(path.join(dir,"live.db"),"persistent");
    try{assert.throws(()=>new LocalDemoIntents({} as never,store),/simulation contractor store/);}finally{store.db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
