"use client";
import {useEffect,useId,useRef,useState} from "react";
import {DEMO_ASSETS} from "../data/demo-intents";
import type {IntentScenario,IntentView} from "../data/demo-intents";
import type {ContractorBill} from "../data/contractor-adapter";
import type {DemoWsSnapshot} from "../data/demo-workspace-adapter";
import {formatNear} from "../data/owner-adapter";
import {ActionButton} from "./action-button";
import {s} from "./demo/portal-ui";

export function SimulatedIntentPayment({billId,onChanged,invoice,contractorName,vault,canAuthorize=true}:{billId:string;onChanged:()=>void;invoice?:ContractorBill;contractorName?:string;vault?:DemoWsSnapshot["vault"];canAuthorize?:boolean}) {
    const field=useId(), lastStates=useRef("");
    const [opened,setOpened]=useState(false);
    const [source,setSource]=useState("near"),[scenario,setScenario]=useState<IntentScenario>("success");
    const [attempts,setAttempts]=useState<IntentView[]>([]),[active,setActive]=useState<IntentView|null>(null);
    const [busy,setBusy]=useState(false),[error,setError]=useState(""),[checked,setChecked]=useState(false),[tick,setTick]=useState(Date.now());
    async function read(){
        const response=await fetch("/api/demo/intents",{cache:"no-store"});const data=await response.json();
        if(!response.ok)throw Error(data.error);
        const records=(data.attempts as IntentView[]).filter(v=>v.intent.billId===billId);
        const matching=records.filter(({intent})=>!invoice||((intent.invoiceAmount??intent.destinationAmount)===invoice.amount&&(intent.invoiceCurrency??"NEAR")===invoice.asset&&(intent.destinationAssetId??"nep141:wrap.near")===(invoice.payoutAsset??"nep141:wrap.near")));
        setAttempts(records);setActive(previous=>matching.find(v=>v.intent.id===previous?.intent.id)||matching[0]||null);
        const states=records.map(v=>`${v.intent.id}:${v.intent.state}`).join("|");
        if(lastStates.current!==states){lastStates.current=states;onChanged();}
    }
    useEffect(()=>{let alive=true;setChecked(false);void read().catch(e=>{if(alive)setError(e.message);});const timer=setInterval(()=>{setTick(Date.now());if(alive&&!document.hidden)void read().catch(e=>{if(alive)setError(e.message);});},1500);return()=>{alive=false;clearInterval(timer);};},[billId,invoice?.amount,invoice?.asset,invoice?.payoutAsset]);
    async function action(action:"quote"|"authorize"|"execute") {
        setBusy(true);setError("");
        try {
            const response=await fetch("/api/demo/intents",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(action==="quote"?{action,billId,sourceAsset:source,key:crypto.randomUUID(),scenario}:{action,id:active?.intent.id})});
            const data=await response.json();if(!response.ok)throw Error(data.error);
            setActive(data);setChecked(false);await read();onChanged();
        }catch(e){setError(e instanceof Error?e.message:"Simulation unavailable. Retry this action.");}finally{setBusy(false);}
    }
    const intent=active?.intent,expired=!!intent&&intent.expiresAt<=tick;
    const retry=!intent||["FAILED","REFUNDED","EXPIRED"].includes(intent.state);
    return <>{canAuthorize&&<ActionButton effect="none" className={s.button} onClick={()=>setOpened(true)}>Pay approved amount</ActionButton>}<details className="reference-disclosure" open={opened} onToggle={e=>setOpened(e.currentTarget.open)}>
        <summary>Simulated NEAR Intents</summary>
        <section aria-label="Simulated NEAR Intents payment">
            <p className={s.notice}><strong>Demo / Simulated</strong> · No deposits, signatures or blockchain transactions.</p>
            <p className={s.small}>Illustrative source allocations share the demo vault’s NEAR-equivalent balance. Rates are fixed examples, never live market quotes. NEAR: 1; USDC/USDT/USD: 0.25; ETH: 750; EUR: 0.27; GBP: 0.32; NGN: 0.00016 NEAR equivalent per unit. These are simulated assumptions.</p>
            {error&&<p role="alert" className={`${s.notice} ${s.error}`}>{error}</p>}
            {retry&&canAuthorize&&<><label htmlFor={`${field}-asset`}>Funding asset and network</label><select id={`${field}-asset`} value={source} onChange={e=>setSource(e.target.value)}>{DEMO_ASSETS.map(a=><option key={a.id} value={a.id}>{a.symbol} · {a.chain}</option>)}</select>
                <label htmlFor={`${field}-outcome`}>Simulation outcome</label><select id={`${field}-outcome`} value={scenario} onChange={e=>setScenario(e.target.value as IntentScenario)}><option value="success">Successful settlement</option><option value="failure">Solver failure · release funds</option><option value="refund">Failed route · refund funding</option><option value="quote-failure">Quote unavailable · no reservation</option></select>
                <ActionButton className={s.button} busy={busy} disabled={busy} onClick={()=>void action("quote")}>Preview simulated quote</ActionButton></>}
            {intent&&<><h4>Simulated Quote</h4><dl className={s.intentDetails}>
                <dt>Source</dt><dd>{intent.sourceAmount} {intent.sourceSymbol} · {intent.sourceChain}</dd>
                <dt>Exact destination payout</dt><dd>{intent.destinationAmount} {intent.destinationSymbol??intent.destinationAsset} · {intent.destinationChain}</dd>
                <dt>Quote type</dt><dd>Simulated EXACT_OUTPUT · recipient amount fixed</dd><dt>Illustrative exchange rate</dt><dd>1 {intent.sourceSymbol} = {intent.rate} NEAR</dd>
                <dt>Illustrative fee</dt><dd>{formatNear(intent.fee)} NEAR equivalent · modeled 0.25% markup plus asset rounding</dd>
                <dt>Total demo vault debit</dt><dd>{formatNear(intent.total)} NEAR equivalent</dd>
                <dt>Mock solver</dt><dd>{intent.solver}</dd>
                <dt>Recipient · approved wallet</dt><dd>{intent.recipient} · version {intent.walletVersion}</dd>
                <dt>Quote expiry</dt><dd>{new Date(intent.expiresAt).toLocaleTimeString()} · {Math.max(0,Math.ceil((intent.expiresAt-tick)/1000))}s remaining</dd>
                <dt>Simulation reference</dt><dd>{intent.reference}</dd>
            </dl>{invoice&&<section aria-label="Payment confirmation summary"><h4>Payment confirmation summary</h4><dl className={s.intentDetails}>
                <dt>Invoice</dt><dd>{invoice.reference}</dd><dt>Contractor</dt><dd>{contractorName??"Not recorded"}</dd>
                <dt>Original request</dt><dd>{invoice.requestedAmount??invoice.amount} {invoice.requestedAsset??invoice.asset}</dd>
                <dt>Approved amount</dt><dd>{invoice.approval?.amount??invoice.amount} {invoice.approval?.asset??invoice.asset}</dd>
                <dt>Payout asset identifier</dt><dd>{intent.destinationAssetId??"nep141:wrap.near"}</dd><dt>Funding asset identifier</dt><dd>{intent.sourceAssetId??intent.sourceAsset}</dd><dt>Payment amount</dt><dd>{intent.destinationAmount} {intent.destinationSymbol??intent.destinationAsset}</dd><dt>Recipient</dt><dd>{intent.recipient}</dd>
                <dt>Rail</dt><dd>Simulated NEAR Intents · demo only</dd><dt>Purpose</dt><dd>{invoice.description}</dd>
                <dt>Approved by</dt><dd>{invoice.approval?.by??"Not recorded"}</dd><dt>Approval time</dt><dd>{invoice.approval?.at?new Date(invoice.approval.at).toLocaleString():"Not recorded"}</dd>
                <dt>Budget and spending eligibility</dt><dd>{!vault?"Balance and policy are rechecked by the server before authorization.":vault.paused?"Demo vault is paused.":BigInt(intent.total)>BigInt(vault.available)&&intent.state==="QUOTE_READY"?"Insufficient available demo funds.":vault.limit&&BigInt(intent.total)>BigInt(vault.limit)?"Exceeds the current spending limit.":"Within the current demo balance and spending limit; server checks still apply."}</dd>
            </dl></section>}<p role="status"><strong>{intent.state}</strong>{intent.reason&&` · ${intent.reason}`}</p>
            {canAuthorize&&intent.state==="QUOTE_READY"&&!expired&&<><label><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/> I approve this invoice, recipient, source amount and illustrative fee for simulated payment.</label><ActionButton effect="none" className={s.button} disabled={busy||!checked} busy={busy} onClick={()=>void action("authorize")}>Authorize simulated payment</ActionButton></>}
            {canAuthorize&&intent.state==="APPROVED"&&!expired&&<><p>Demo funds are reserved. The recipient and spending policy will be checked again.</p><ActionButton effect="none" className={s.button} busy={busy} disabled={busy} onClick={()=>void action("execute")}>Execute simulated payment</ActionButton></>}
            {intent.state==="COMPLETED"&&<p>Delivered {intent.deliveredAmount??intent.destinationAmount} {intent.destinationSymbol??intent.destinationAsset} on {intent.destinationChain} · simulated only.</p>}{intent.state==="EXECUTING"&&<p aria-live="polite">Mock solver processing. Demo funds stay reserved until settlement or refund.</p>}
            {expired&&["QUOTE_READY","APPROVED"].includes(intent.state)&&<ActionButton className={s.button} disabled={busy} onClick={()=>void read()}>Check expired quote</ActionButton>}
            </>}
            {attempts.length>0&&<details><summary>Payment audit history · {attempts.length} attempts</summary>{attempts.map(v=><section key={v.intent.id}><h4>{v.intent.reference} · {v.intent.state}</h4><ol>{v.audit.map(event=><li key={event.sequence}><strong>{event.state}</strong> · {new Date(event.at).toLocaleTimeString()}<p>{event.detail}</p></li>)}</ol></section>)}</details>}
        </section>
    </details></>;
}
