// A local SQLite simulation. No RPC, SDK, signing, deposits or live executors.
import crypto from "node:crypto";
import {billingAsset,NEAR_ASSET,decimalUnits,unitsDecimal} from "../data/billing-assets.ts";
import { DEMO_ASSETS } from "../data/demo-intents.ts";
import type { DemoIntentsAdapter, IntentEvent, IntentScenario, IntentState, IntentView, SimulatedIntent } from "../data/demo-intents.ts";
import { amountFromNear, formatNear, account } from "../data/owner-adapter.ts";
import type { ContractorRecordStore } from "./contractor-records.ts";
import { DemoWorkspaceStore, demoWorkspace } from "./demo-workspace.ts";
import { demoContractors } from "./demo-contractors.ts";

const terminal = new Set<IntentState>(["COMPLETED","FAILED","EXPIRED","REFUNDED"]);
const hash = (value:string) => crypto.createHash("sha256").update(value).digest("hex");
const ceilDiv = (a:bigint,b:bigint) => (a+b-1n)/b;
export function previewDemoQuote(invoiceAmount:string,sourceAsset:string,rates:Readonly<Record<string,string>>=Object.fromEntries(DEMO_ASSETS.map(a=>[a.id,a.nearPerUnit])),payoutAsset:string=NEAR_ASSET,invoiceCurrency="NEAR") {
    const asset=DEMO_ASSETS.find(a=>a.id===sourceAsset)||billingAsset(sourceAsset),destination=billingAsset(payoutAsset);
    if(!asset)throw Error("Unsupported simulated source asset.");
    if(!destination)throw Error("Unsupported simulated payout route.");
    const rateFor=(id:string,symbol:string,fallback:string)=>rates[id]??rates[DEMO_ASSETS.find(a=>a.symbol===symbol&&billingAsset(a.id)?.id===id)?.id??""]??fallback;
    const destinationRate=rateFor(destination.id,destination.symbol,destination.nearPerUnit);
    const fiat:Record<string,string>={USD:"0.25",EUR:"0.27",GBP:"0.32",NGN:"0.00016"};
    const denominationRate=fiat[invoiceCurrency]??(invoiceCurrency===destination.symbol?destinationRate:DEMO_ASSETS.find(a=>a.symbol===invoiceCurrency)?.nearPerUnit);
    if(!denominationRate)throw Error("Unsupported simulated invoice conversion.");
    const targetUnits=invoiceCurrency===destination.symbol?decimalUnits(invoiceAmount,destination.decimals):ceilDiv(decimalUnits(invoiceAmount,24)*BigInt(amountFromNear(denominationRate))*10n**BigInt(destination.decimals),10n**24n*BigInt(amountFromNear(destinationRate)));
    const destinationAmount=unitsDecimal(targetUnits,destination.decimals);
    const amount=ceilDiv(targetUnits*BigInt(amountFromNear(destinationRate)),10n**BigInt(destination.decimals));
    const modeledFee=ceilDiv(amount*25n,10_000n),rate=rates[asset.id]??rates[billingAsset(asset.id)?.id??""]??asset.nearPerUnit,perUnit=BigInt(amountFromNear(rate));
    if(perUnit<=0n)throw Error("Invalid illustrative exchange rate.");
    const sourceUnits=ceilDiv((amount+modeledFee)*10n**BigInt(asset.decimals),perUnit);
    const total=ceilDiv(sourceUnits*perUnit,10n**BigInt(asset.decimals)),fee=total-amount;
    return {asset,destination,destinationAmount,amount:amount.toString(),fee:fee.toString(),total:total.toString(),rate,destinationRate,
        sourceAmount:unitsDecimal(sourceUnits,asset.decimals),solver:asset.chain==="NEAR"?"Mock Cedar Solver":"Mock Emerald Solver"};
}

export class LocalDemoIntents implements DemoIntentsAdapter {
    readonly ledger:DemoWorkspaceStore;
    readonly portal:ContractorRecordStore;
    readonly now:()=>number;
    readonly quoteTtl:number;
    readonly delay:number;
    readonly rates:Readonly<Record<string,string>>;
    constructor(ledger:DemoWorkspaceStore, portal:ContractorRecordStore,
        now:()=>number=Date.now, quoteTtl=60_000, delay=1500,
        rates:Readonly<Record<string,string>>=Object.fromEntries(DEMO_ASSETS.map(a=>[a.id,a.nearPerUnit]))) {
        this.ledger=ledger;this.portal=portal;this.now=now;this.quoteTtl=quoteTtl;this.delay=delay;this.rates=rates;
        if(portal.mode!=="simulation") throw Error("Demo Intents requires a simulation contractor store.");
        ledger.db.exec(`CREATE TABLE IF NOT EXISTS demo_intents(id TEXT PRIMARY KEY,workspace TEXT NOT NULL,org TEXT NOT NULL,key TEXT NOT NULL,fingerprint TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(workspace,key));
          CREATE TABLE IF NOT EXISTS demo_intent_bindings(workspace TEXT PRIMARY KEY,org TEXT NOT NULL UNIQUE);
          CREATE TABLE IF NOT EXISTS demo_intent_audit(sequence INTEGER PRIMARY KEY AUTOINCREMENT,intent TEXT NOT NULL,state TEXT NOT NULL,at INTEGER NOT NULL,detail TEXT NOT NULL);
          CREATE TRIGGER IF NOT EXISTS demo_intent_audit_no_update BEFORE UPDATE ON demo_intent_audit BEGIN SELECT RAISE(ABORT,'Immutable simulation audit'); END;
          CREATE TRIGGER IF NOT EXISTS demo_intent_audit_no_delete BEFORE DELETE ON demo_intent_audit BEGIN SELECT RAISE(ABORT,'Immutable simulation audit'); END;`);
    }
    private write<T>(fn:()=>T):T {
        this.ledger.db.exec("BEGIN IMMEDIATE");
        try {const result=fn();this.ledger.db.exec("COMMIT");return result;}
        catch(error){this.ledger.db.exec("ROLLBACK");throw error;}
    }
    private scope(token:string,owner:string) {
        const scope=this.ledger.simulationScope(token), org=this.portal.owner(owner);
        if(!org) throw Error("Valid demo owner authorization required.");
        const bound=this.ledger.db.prepare("SELECT org FROM demo_intent_bindings WHERE workspace=?").get(scope.workspace) as {org:string}|undefined;
        if(bound && bound.org!==org) throw Error("Demo organization isolation: owner does not match workspace.");
        this.ledger.db.prepare("INSERT OR IGNORE INTO demo_intent_bindings VALUES (?,?)").run(scope.workspace,org);
        return {...scope,org};
    }
    private event(intent:SimulatedIntent,state:IntentState,detail:string) {
        intent.state=state;
        this.ledger.db.prepare("INSERT INTO demo_intent_audit(intent,state,at,detail) VALUES (?,?,?,?)").run(intent.id,state,this.now(),detail);
    }
    private save(intent:SimulatedIntent) {
        this.ledger.db.prepare("UPDATE demo_intents SET payload=? WHERE id=?").run(JSON.stringify(intent),intent.id);
    }
    private view(intent:SimulatedIntent):IntentView {
        return {intent,audit:this.ledger.db.prepare("SELECT sequence,state,at,detail FROM demo_intent_audit WHERE intent=? ORDER BY sequence").all(intent.id) as unknown as IntentEvent[]};
    }
    private load(workspace:string,org:string,id:string):SimulatedIntent {
        const row=this.ledger.db.prepare("SELECT payload FROM demo_intents WHERE id=? AND workspace=? AND org=?").get(id,workspace,org) as {payload:string}|undefined;
        if(!row) throw Error("Simulation payment access denied.");
        return JSON.parse(row.payload);
    }
    private recipient(owner:string,billId:string) {
        const snapshot=this.portal.ownerSnapshot(owner),bill=snapshot.invoices.find(b=>b.id===billId);
        if(!bill || bill.status!=="Approved" || bill.reasons.length) throw Error("Approved invoice without unresolved clarification required.");
        const profile=snapshot.profiles.find(p=>p.id===bill.contractorId);
        if(!profile?.wallet || profile.archived) throw Error("Approved recipient wallet required in Wallet Details.");
        const destination=billingAsset(bill.payoutAsset??NEAR_ASSET);
        if(!destination||destination.chain!=="NEAR")throw Error("Unsupported payout route: Wallet Details currently approves NEAR recipients only. Invoice review remains available.");
        account(profile.wallet);
        return {bill,profile};
    }
    private revalidate(owner:string,intent:SimulatedIntent) {
        const result=this.recipient(owner,intent.billId);
        if(result.profile.walletVersion!==intent.walletVersion || result.profile.wallet!==intent.recipient)
            throw Error("Wallet changed after quote/authorization. Revalidate recipient with a new quote.");
        if((intent.invoiceAmount??intent.destinationAmount)!==result.bill.amount||(intent.invoiceCurrency??"NEAR")!==result.bill.asset||(intent.destinationAssetId??NEAR_ASSET)!==(result.bill.payoutAsset??NEAR_ASSET)) throw Error("Invoice amount or payout changed; request a new quote.");
        return result;
    }
    private policy(vault:{paused:boolean;limit:string},intent:SimulatedIntent) {
        if(vault.paused) throw Error("Demo vault is paused.");
        if(vault.limit && BigInt(intent.total)>BigInt(vault.limit)) throw Error("Simulated total exceeds the spending policy and budget limit.");
    }
    quote(token:string,owner:string,input:{billId:string;sourceAsset:string;key:string;scenario:IntentScenario}):IntentView {
        return this.write(()=>{
            const scope=this.scope(token,owner);
            if(typeof input.key!=="string" || !input.key || input.key.length>80) throw Error("A simulation idempotency key is required.");
            const asset=DEMO_ASSETS.find(a=>a.id===input.sourceAsset)||billingAsset(input.sourceAsset);
            if(!asset) throw Error("Unsupported simulated source asset.");
            if(!["success","failure","refund","quote-failure"].includes(input.scenario)) throw Error("Select a deterministic simulation scenario.");
            if(input.scenario==="quote-failure")throw Error("Mock quote failed before authorization. No simulated funds reserved. Choose another outcome and retry.");
            const fingerprint=hash(JSON.stringify([input.billId,asset.id,input.scenario]));
            const prior=this.ledger.db.prepare("SELECT id,fingerprint FROM demo_intents WHERE workspace=? AND key=?").get(scope.workspace,input.key) as {id:string;fingerprint:string}|undefined;
            if(prior){if(prior.fingerprint!==fingerprint)throw Error("Idempotency key reused with different simulation details.");return this.view(this.load(scope.workspace,scope.org,prior.id));}
            const {bill,profile}=this.recipient(owner,input.billId);
            const {amount,fee,total,rate,sourceAmount,solver,destination,destinationAmount}=previewDemoQuote(bill.amount,asset.id,this.rates,bill.payoutAsset??NEAR_ASSET,bill.asset);
            const intent:SimulatedIntent={id:crypto.randomUUID(),reference:`SIM-INT-${crypto.randomUUID().slice(0,8)}`,billId:bill.id,organization:scope.org,workspace:scope.workspace,
                state:"CREATED",sourceAsset:asset.id,sourceChain:asset.chain,sourceSymbol:asset.symbol,sourceAmount,
                destinationAmount,destinationAsset:destination.symbol,destinationSymbol:destination.symbol,destinationChain:destination.chain,destinationAssetId:destination.id,sourceAssetId:billingAsset(asset.id)!.id,invoiceAmount:bill.amount,invoiceCurrency:bill.asset,quoteType:"EXACT_OUTPUT",recipient:profile.wallet!,walletVersion:profile.walletVersion,
                amount:amount.toString(),fee:fee.toString(),total:total.toString(),rate,solver,
                expiresAt:this.now()+this.quoteTtl,authorizationExpiresAt:0,scenario:input.scenario,settleAt:0,reason:"",createdAt:this.now()};
            this.ledger.db.prepare("INSERT INTO demo_intents VALUES (?,?,?,?,?,?)").run(intent.id,scope.workspace,scope.org,input.key,fingerprint,JSON.stringify(intent));
            this.ledger.db.prepare("INSERT INTO demo_intent_ids VALUES (?)").run(intent.id);
            this.event(intent,"CREATED","Simulation reference created; no blockchain transaction.");
            this.event(intent,"AWAITING_APPROVAL","Awaiting explicit owner payment authorization.");
            this.event(intent,"QUOTE_READY","Simulated Quote · illustrative rates and mock solver, no live market request.");
            this.save(intent);return this.view(intent);
        });
    }
    authorize(token:string,owner:string,id:string):IntentView {
        return this.write(()=>{
            const scope=this.scope(token,owner),intent=this.load(scope.workspace,scope.org,id);
            if(terminal.has(intent.state) || intent.state==="APPROVED" || intent.state==="EXECUTING") return this.view(intent);
            if(this.expire(intent)) return this.view(intent);
            const {bill,profile}=this.revalidate(owner,intent);this.policy(scope.vault,intent);
            const duplicate=this.ledger.db.prepare("SELECT id FROM demo_ws_payments WHERE workspace=? AND bill_id=? AND status IN ('prepared','pending','confirmed')").get(scope.workspace,bill.id);
            if(duplicate) throw Error("This invoice already has an active or completed payment.");
            if(BigInt(scope.vault.funded)-BigInt(scope.vault.spent)-BigInt(scope.vault.reserved)<BigInt(intent.total)) throw Error("Insufficient simulated funds. Fund the demo vault first.");
            this.portal.lockSimulatedSettlement(scope.org,bill.id,intent.id,false,{amount:intent.invoiceAmount??intent.destinationAmount,asset:intent.invoiceCurrency??"NEAR",payoutAsset:intent.destinationAssetId??NEAR_ASSET,recipient:intent.recipient,walletVersion:intent.walletVersion});
            scope.vault.reserved=(BigInt(scope.vault.reserved)+BigInt(intent.total)).toString();
            this.ledger.db.prepare("INSERT INTO demo_ws_payments(id,workspace,contractor,recipient,amount,fee,total,description,status,reason,reference,created_at,settle_after,settled_at,bill_id,confirm_secret) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,NULL,?,'')")
                .run(intent.id,scope.workspace,profile.name,intent.recipient,intent.amount,intent.fee,intent.total,`Simulated NEAR Intents · ${bill.description}`,"prepared","",intent.reference,new Date(this.now()).toISOString(),bill.id);
            this.ledger.db.prepare("UPDATE demo_ws_workspaces SET vault=?,revision=revision+1 WHERE workspace=?").run(JSON.stringify(scope.vault),scope.workspace);
            intent.authorizationExpiresAt=Math.min(intent.expiresAt,this.now()+60_000);
            this.event(intent,"APPROVED","Owner authorized this exact quote, invoice and wallet version. Simulated funds reserved.");
            this.save(intent);return this.view(intent);
        });
    }
    execute(token:string,owner:string,id:string):IntentView {
        return this.write(()=>{
            const scope=this.scope(token,owner),intent=this.load(scope.workspace,scope.org,id);
            if(terminal.has(intent.state) || intent.state==="EXECUTING")return this.view(intent);
            if(this.expire(intent))return this.view(intent);
            if(intent.state!=="APPROVED" || intent.authorizationExpiresAt<=this.now()) throw Error("Active owner payment authorization required.");
            try {this.revalidate(owner,intent);this.policy(scope.vault,intent);}
            catch(error){this.finish(intent,"FAILED",error instanceof Error?error.message:"Recipient validation failed.");return this.view(intent);}
            const payment=this.ledger.db.prepare("SELECT status FROM demo_ws_payments WHERE id=?").get(intent.id) as {status:string}|undefined;
            if(payment?.status!=="prepared")throw Error("The simulation reservation is no longer active.");
            intent.settleAt=this.now()+this.delay;
            this.ledger.db.prepare("UPDATE demo_ws_payments SET status='pending' WHERE id=?").run(intent.id);
            this.event(intent,"EXECUTING","Simulated funding reserved; mock solver processing. No deposit or signature.");
            this.save(intent);return this.view(intent);
        });
    }
    private expire(intent:SimulatedIntent) {
        if(!terminal.has(intent.state) && intent.state!=="EXECUTING" && intent.expiresAt<=this.now()) {
            this.finish(intent,"EXPIRED","Simulated quote expired. Request a new quote; any reservation released.");return true;
        }
        return false;
    }
    private finish(intent:SimulatedIntent,state:"COMPLETED"|"FAILED"|"EXPIRED"|"REFUNDED",reason:string) {
        if(terminal.has(intent.state))return;
        const payment=this.ledger.db.prepare("SELECT status FROM demo_ws_payments WHERE id=?").get(intent.id) as {status:string}|undefined;
        if(payment && ["prepared","pending"].includes(payment.status)) {
            const row=this.ledger.db.prepare("SELECT vault FROM demo_ws_workspaces WHERE workspace=?").get(intent.workspace) as {vault:string};
            const vault=JSON.parse(row.vault);
            if(BigInt(vault.reserved)<BigInt(intent.total))throw Error("Simulation reservation invariant failed.");
            vault.reserved=(BigInt(vault.reserved)-BigInt(intent.total)).toString();
            if(state==="COMPLETED")vault.spent=(BigInt(vault.spent)+BigInt(intent.total)).toString();
            this.ledger.db.prepare("UPDATE demo_ws_workspaces SET vault=?,revision=revision+1 WHERE workspace=?").run(JSON.stringify(vault),intent.workspace);
            this.ledger.db.prepare("UPDATE demo_ws_payments SET status=?,reason=?,settled_at=? WHERE id=?").run(state==="COMPLETED"?"confirmed":"failed",reason,new Date(this.now()).toISOString(),intent.id);
        }
        if(state==="COMPLETED"){intent.deliveredAmount=intent.destinationAmount;intent.deliveredAssetId=intent.destinationAssetId??NEAR_ASSET;}
        intent.reason=reason;this.event(intent,state,reason);this.save(intent);
    }
    list(token:string,owner:string):IntentView[] {
        const result=this.write(()=>{
            const scope=this.scope(token,owner);
            const rows=this.ledger.db.prepare("SELECT id FROM demo_intents WHERE workspace=? AND org=? ORDER BY rowid DESC").all(scope.workspace,scope.org) as {id:string}[];
            return rows.map(({id})=>{
                const intent=this.load(scope.workspace,scope.org,id);
                this.expire(intent);
                if(intent.state==="EXECUTING" && intent.settleAt<=this.now()) {
                    try {this.revalidate(owner,intent);}
                    catch(error){this.finish(intent,"FAILED",error instanceof Error?error.message:"Recipient validation failed.");}
                    if(intent.state==="EXECUTING") {
                        if(intent.scenario==="success")this.finish(intent,"COMPLETED","Simulated settlement completed. No real funds moved.");
                        else if(intent.scenario==="failure")this.finish(intent,"FAILED","Mock solver failed before settlement. Reserved funds released; invoice remains approved.");
                        else {
                            this.event(intent,"FAILED","Mock route failed after simulated funding; refund processing.");
                            // FAILED here is an audit transition; reservation stays held until refund in this transaction.
                            intent.state="EXECUTING";
                            this.finish(intent,"REFUNDED","Simulated funding refunded exactly once. Invoice remains approved.");
                        }
                    }
                }
                return this.view(intent);
            });
        });
        // Durable completion is the outbox. Repeated reads repair a crash between
        // the ledger commit and updating the separately persisted contractor bill.
        this.reconcile();return result;
    }
    reconcile() {
        const rows=this.ledger.db.prepare("SELECT payload FROM demo_intents").all() as {payload:string}[];
        for(const row of rows){const i=JSON.parse(row.payload) as SimulatedIntent;if(i.state==="COMPLETED")this.portal.markSimulatedPaid(i.organization,i.billId,i.reference);if(terminal.has(i.state))this.portal.lockSimulatedSettlement(i.organization,i.billId,i.id,true);}
    }
}
let singleton:LocalDemoIntents|undefined;
export function demoIntents(){return singleton??=new LocalDemoIntents(demoWorkspace(),demoContractors());}
