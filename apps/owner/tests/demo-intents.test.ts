import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DemoWorkspaceStore} from "../src/server/demo-workspace.ts";
import {DemoContractorStore} from "../src/server/demo-contractors.ts";
import {ContractorRecordStore} from "../src/server/contractor-records.ts";
import {LocalDemoIntents} from "../src/server/demo-intents.ts";
import {amountFromNear} from "../src/data/owner-adapter.ts";
import type {IntentScenario} from "../src/data/demo-intents.ts";
import {DatabaseSync} from "node:sqlite";

function fixture() {
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),"nnetics-intents-"));
    let time=Date.now(),ledger=new DemoWorkspaceStore(path.join(dir,"ledger.db"),{now:()=>time});
    const portal=new DemoContractorStore(path.join(dir,"portal.db")),owner=portal.ownerStart("");
    const token=ledger.start("").token;
    ledger.createWorkspace(token,{profileName:"Owner",vaultName:"Studio"});ledger.fund(token,amountFromNear("10"));
    const profileId=portal.ownerCommand(owner,{action:"create-profile",name:"Designer"}).profileId!;
    const session=portal.enter(portal.ownerCommand(owner,{action:"issue-link",profileId}).token!);
    let engine=new LocalDemoIntents(ledger,portal,()=>time,60_000,1000);
    function wallet(account="designer.testnet"){
        const challenge=portal.command(session,{action:"wallet-challenge",account}).challenge!;
        portal.command(session,{action:"wallet-proof",challenge});
        const request=portal.ownerSnapshot(owner).profiles[0].pendingWallet!;
        portal.ownerCommand(owner,{action:"approve-wallet",profileId,requestId:request.id});
    }
    let sequence=0;
    function bill(approve=true){
        const invoice=portal.command(session,{action:"submit-invoice",submissionId:`bill-${++sequence}`,fields:{orderId:"",amount:"1",asset:"NEAR",recipient:"attacker.testnet"},text:"Delivered one design for 1 NEAR.",description:"Design"}).invoice!;
        if(approve)portal.ownerCommand(owner,{action:"review-invoice",invoiceId:invoice.id,decision:"approve",note:""});
        return invoice;
    }
    const quote=(billId:string,scenario:IntentScenario="success",key=crypto.randomUUID())=>engine.quote(token,owner,{billId,sourceAsset:"usdc-ethereum",scenario,key});
    return {get ledger(){return ledger;},portal,owner,token,session,profileId,wallet,bill,quote,get engine(){return engine;},advance(ms=2000){time+=ms;},
        restart(){ledger.close();ledger=new DemoWorkspaceStore(path.join(dir,"ledger.db"),{now:()=>time});engine=new LocalDemoIntents(ledger,portal,()=>time,60_000,1000);},
        close(){ledger.close();portal.db.close();fs.rmSync(dir,{recursive:true,force:true});}};
}

test("unlinked bill can precede wallet approval; invoice wallet injection is ignored",()=>{
    const f=fixture();try{const bill=f.bill();assert.equal(bill.orderId,"");assert.equal(bill.recipient,"");assert.throws(()=>f.quote(bill.id),/Approved recipient wallet/);f.wallet();const q=f.quote(bill.id);assert.equal(q.intent.recipient,"designer.testnet");assert.equal(f.portal.ownerSnapshot(f.owner).orders.length,0);}finally{f.close();}
});
test("cross-asset mock quote, exact settlement, immutable audit, duplicate prevention and restart persistence",()=>{
    const f=fixture();try{
        f.wallet();const bill=f.bill(),q=f.quote(bill.id,"success","key");
        assert.equal(q.intent.sourceChain,"Ethereum");assert.equal(q.intent.sourceAmount,"4.01");assert.equal(q.intent.destinationAmount,"1");assert.equal(q.intent.solver,"Mock Emerald Solver");
        assert.equal(f.quote(bill.id,"success","key").intent.id,q.intent.id);
        assert.throws(()=>f.quote(bill.id,"refund","key"),/Idempotency/);
        assert.throws(()=>f.engine.execute(f.token,f.owner,q.intent.id),/authorization/);
        const approved=f.engine.authorize(f.token,f.owner,q.intent.id);assert.equal(approved.intent.state,"APPROVED");
        assert.equal(f.ledger.state(f.token).vault.reserved,q.intent.total);
        const other=f.quote(bill.id);assert.throws(()=>f.engine.authorize(f.token,f.owner,other.intent.id),/active or completed/);
        assert.throws(()=>f.ledger.cancelPayment(f.token,q.intent.id),/Intents lifecycle/);
        f.engine.execute(f.token,f.owner,q.intent.id);f.engine.execute(f.token,f.owner,q.intent.id);
        assert.equal(f.ledger.state(f.token).vault.spent,"0");
        f.restart();f.advance();const completed=f.engine.list(f.token,f.owner).find(v=>v.intent.id===q.intent.id)!;
        assert.equal(completed.intent.state,"COMPLETED");assert.deepEqual(completed.audit.map(e=>e.state),["CREATED","AWAITING_APPROVAL","QUOTE_READY","APPROVED","EXECUTING","COMPLETED"]);
        const state=f.ledger.state(f.token);assert.equal(state.vault.spent,q.intent.total);assert.equal(state.vault.reserved,"0");
        const activityAudit=state.history.filter(event=>event.kind==="control"&&event.label.includes(q.intent.reference));
        assert.equal(activityAudit.length,6);assert.ok(activityAudit.some(event=>event.label.includes("COMPLETED")));
        assert.equal(BigInt(state.vault.funded),BigInt(state.vault.available)+BigInt(state.vault.spent)+BigInt(state.vault.reserved));
        assert.equal(state.receipts.length,1);assert.equal(f.portal.snapshot(f.session).invoices[0].status,"Paid");
        f.restart();assert.equal(f.engine.list(f.token,f.owner).find(v=>v.intent.id===q.intent.id)!.intent.state,"COMPLETED");
        f.engine.execute(f.token,f.owner,q.intent.id);assert.equal(f.ledger.state(f.token).receipts.length,1);
        assert.throws(()=>f.ledger.db.prepare("DELETE FROM demo_intent_audit WHERE intent=?").run(q.intent.id),/Immutable/);
        assert.throws(()=>f.quote(bill.id),/Approved invoice/);
    }finally{f.close();}
});
for(const scenario of ["failure","refund"] as const)test(`${scenario} releases exactly once, preserves approved bill and allows recovery`,()=>{
    const f=fixture();try{f.wallet();const bill=f.bill(),q=f.quote(bill.id,scenario);f.engine.authorize(f.token,f.owner,q.intent.id);f.engine.execute(f.token,f.owner,q.intent.id);f.advance();
        assert.equal(f.engine.list(f.token,f.owner)[0].intent.state,scenario==="failure"?"FAILED":"REFUNDED");
        f.engine.list(f.token,f.owner);let state=f.ledger.state(f.token);assert.equal(state.vault.spent,"0");assert.equal(state.vault.reserved,"0");assert.equal(state.vault.available,state.vault.funded);assert.equal(f.portal.snapshot(f.session).invoices[0].status,"Approved");
        const retry=f.quote(bill.id);f.engine.authorize(f.token,f.owner,retry.intent.id);f.engine.execute(f.token,f.owner,retry.intent.id);f.advance();f.engine.list(f.token,f.owner);assert.equal(f.portal.snapshot(f.session).invoices[0].status,"Paid");
    }finally{f.close();}
});
test("quote expiry releases reservation without paying; quote must be renewed",()=>{
    const f=fixture();try{f.wallet();const q=f.quote(f.bill().id);f.engine.authorize(f.token,f.owner,q.intent.id);f.advance(61_000);assert.equal(f.engine.execute(f.token,f.owner,q.intent.id).intent.state,"EXPIRED");assert.equal(f.ledger.state(f.token).vault.reserved,"0");assert.equal(f.ledger.state(f.token).vault.spent,"0");}finally{f.close();}
});
test("wallet changes between authorization and execution require recipient revalidation",()=>{
    const f=fixture();try{f.wallet();const bill=f.bill(),q=f.quote(bill.id);f.engine.authorize(f.token,f.owner,q.intent.id);f.wallet("replacement.testnet");assert.equal(f.engine.execute(f.token,f.owner,q.intent.id).intent.state,"FAILED");assert.match(f.engine.list(f.token,f.owner)[0].intent.reason,/Wallet changed/);assert.equal(f.ledger.state(f.token).vault.reserved,"0");assert.equal(f.quote(bill.id).intent.recipient,"replacement.testnet");}finally{f.close();}
});
test("funds, policy, pause, owner, contractor and organization guards fail closed",()=>{
    const f=fixture();try{f.wallet();const q=f.quote(f.bill().id);assert.throws(()=>f.engine.authorize(f.token,"",q.intent.id),/owner authorization/);assert.throws(()=>f.engine.authorize(f.token,f.session,q.intent.id),/owner authorization/);
        const foreign=f.portal.ownerStart("");assert.throws(()=>f.engine.list(f.token,foreign),/isolation/);
        const second=f.ledger.start("").token;f.ledger.createWorkspace(second,{profileName:"Other",vaultName:"Other"});assert.throws(()=>f.engine.authorize(second,foreign,q.intent.id),/access denied/);
        f.ledger.setLimit(f.token,amountFromNear("0.5"));assert.throws(()=>f.engine.authorize(f.token,f.owner,q.intent.id),/policy/);f.ledger.setLimit(f.token,"");
        f.ledger.setPaused(f.token,true);assert.throws(()=>f.engine.authorize(f.token,f.owner,q.intent.id),/paused/);f.ledger.setPaused(f.token,false);
        f.ledger.db.prepare("UPDATE demo_ws_workspaces SET vault=? WHERE workspace=?").run(JSON.stringify({funded:"0",spent:"0",reserved:"0",limit:"",paused:false}),q.intent.workspace);
        assert.throws(()=>f.engine.authorize(f.token,f.owner,q.intent.id),/Insufficient simulated/);assert.equal(f.ledger.state(f.token).payments.length,0);
    }finally{f.close();}
});
test("simulation adapter refuses a persistent contractor database and cannot mutate it",()=>{
    const f=fixture(),dir=fs.mkdtempSync(path.join(os.tmpdir(),"nnetics-real-")),real=new ContractorRecordStore(path.join(dir,"real.db"),"persistent");try{assert.throws(()=>new LocalDemoIntents(f.ledger,real),/simulation contractor store/);assert.throws(()=>real.markSimulatedPaid("org","bill","SIM-INT"),/real invoices/);}finally{real.db.close();fs.rmSync(dir,{recursive:true,force:true});f.close();}
});
test("owner can associate and unlink an existing order without changing original bill or review history",()=>{
    const f=fixture();try{f.wallet();const bill=f.bill();f.portal.ownerCommand(f.owner,{action:"create-order",profileId:f.profileId,reference:"WO-1",title:"Design",amount:"1"});const order=f.portal.ownerSnapshot(f.owner).orders[0];
        f.portal.ownerCommand(f.owner,{action:"associate-order",invoiceId:bill.id,orderId:order.id});let changed=f.portal.snapshot(f.session).invoices[0];assert.equal(changed.orderId,order.id);assert.equal(changed.originalText,bill.text);assert.equal(changed.status,"Approved");
        f.portal.ownerCommand(f.owner,{action:"associate-order",invoiceId:bill.id,orderId:""});assert.equal(f.portal.snapshot(f.session).invoices[0].orderId,"");assert.equal((f.portal.db.prepare("SELECT count(*) n FROM demo_bill_history WHERE bill=?").get(bill.id) as {n:number}).n,3);
    }finally{f.close();}
});

test("existing mandatory-order databases migrate without losing original invoice payloads",()=>{
    const directory=fs.mkdtempSync(path.join(os.tmpdir(),"nnetics-order-migration-")),file=path.join(directory,"old.db");
    const db=new DatabaseSync(file);
    db.exec("CREATE TABLE demo_bills(id TEXT PRIMARY KEY,org TEXT NOT NULL,profile TEXT NOT NULL,reference TEXT NOT NULL,order_id TEXT NOT NULL UNIQUE,payload TEXT NOT NULL,UNIQUE(org,profile,reference))");
    const original=JSON.stringify({id:"bill",orderId:"",originalText:"Original request",attachment:{id:"upload"},status:"Approved"});
    db.prepare("INSERT INTO demo_bills VALUES ('bill','org','profile','INV-1','direct-legacy',?)").run(original);db.close();
    const store=new DemoContractorStore(file);
    try{
        const row=store.db.prepare("SELECT payload,order_id FROM demo_bills WHERE id='bill'").get() as {payload:string;order_id:string|null};
        assert.equal(row.payload,original);assert.equal(row.order_id,null);
        const column=(store.db.prepare("PRAGMA table_info(demo_bills)").all() as {name:string;notnull:number}[]).find(c=>c.name==="order_id")!;
        assert.equal(column.notnull,0);
        store.db.prepare("INSERT INTO demo_bills VALUES ('bill-2','org','profile','INV-2',NULL,?)").run(original);
    }finally{store.db.close();fs.rmSync(directory,{recursive:true,force:true});}
});

test("simulation completes with all outbound network requests disabled",()=>{
    const original=globalThis.fetch;
    globalThis.fetch=async()=>{throw Error("Network access forbidden in simulation");};
    const f=fixture();try{
        f.wallet();const q=f.quote(f.bill().id);f.engine.authorize(f.token,f.owner,q.intent.id);f.engine.execute(f.token,f.owner,q.intent.id);f.advance();
        assert.equal(f.engine.list(f.token,f.owner)[0].intent.state,"COMPLETED");
    }finally{f.close();globalThis.fetch=original;}
});
