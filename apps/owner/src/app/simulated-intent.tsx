"use client";
import {useEffect,useId,useRef,useState} from "react";
import {DEMO_ASSETS} from "../data/demo-intents";
import type {IntentScenario,IntentView} from "../data/demo-intents";
import {formatNear} from "../data/owner-adapter";
import {ActionButton} from "./action-button";
import {s} from "./demo/portal-ui";

export function SimulatedIntentPayment({billId,onChanged}:{billId:string;onChanged:()=>void}) {
    const field=useId(), lastStates=useRef("");
    const [source,setSource]=useState("usdc-ethereum"),[scenario,setScenario]=useState<IntentScenario>("success");
    const [attempts,setAttempts]=useState<IntentView[]>([]),[active,setActive]=useState<IntentView|null>(null);
    const [busy,setBusy]=useState(false),[error,setError]=useState(""),[checked,setChecked]=useState(false),[tick,setTick]=useState(Date.now());
    async function read(){
        const response=await fetch("/api/demo/intents",{cache:"no-store"});const data=await response.json();
        if(!response.ok)throw Error(data.error);
        const records=(data.attempts as IntentView[]).filter(v=>v.intent.billId===billId);
        setAttempts(records);setActive(previous=>records.find(v=>v.intent.id===previous?.intent.id)||records[0]||null);
        const states=records.map(v=>`${v.intent.id}:${v.intent.state}`).join("|");
        if(lastStates.current!==states){lastStates.current=states;onChanged();}
    }
    useEffect(()=>{let alive=true;void read().catch(e=>{if(alive)setError(e.message);});const timer=setInterval(()=>{setTick(Date.now());if(alive&&!document.hidden)void read().catch(e=>{if(alive)setError(e.message);});},1500);return()=>{alive=false;clearInterval(timer);};},[billId]);
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
    return <details className="reference-disclosure">
        <summary>Simulated NEAR Intents</summary>
        <section aria-label="Simulated NEAR Intents payment">
            <p className={s.notice}><strong>Demo / Simulated</strong> · No deposits, signatures or blockchain transactions.</p>
            <p className={s.small}>Illustrative source allocations share the demo vault’s NEAR-equivalent balance. Rates are fixed examples, never live market quotes.</p>
            {error&&<p role="alert" className={`${s.notice} ${s.error}`}>{error}</p>}
            {retry&&<><label htmlFor={`${field}-asset`}>Demo source asset</label><select id={`${field}-asset`} value={source} onChange={e=>setSource(e.target.value)}>{DEMO_ASSETS.map(a=><option key={a.id} value={a.id}>{a.symbol} · {a.chain}</option>)}</select>
                <label htmlFor={`${field}-outcome`}>Simulation outcome</label><select id={`${field}-outcome`} value={scenario} onChange={e=>setScenario(e.target.value as IntentScenario)}><option value="success">Successful settlement</option><option value="failure">Solver failure · release funds</option><option value="refund">Failed route · refund funding</option></select>
                <ActionButton className={s.button} busy={busy} disabled={busy} onClick={()=>void action("quote")}>Preview simulated quote</ActionButton></>}
            {intent&&<><h4>Simulated Quote</h4><dl className={s.intentDetails}>
                <dt>Source</dt><dd>{intent.sourceAmount} {intent.sourceSymbol} · {intent.sourceChain}</dd>
                <dt>Estimated destination</dt><dd>{intent.destinationAmount} NEAR · NEAR</dd>
                <dt>Illustrative exchange rate</dt><dd>1 {intent.sourceSymbol} = {intent.rate} NEAR</dd>
                <dt>Illustrative fee</dt><dd>{formatNear(intent.fee)} NEAR equivalent · 0.25%</dd>
                <dt>Total demo vault debit</dt><dd>{formatNear(intent.total)} NEAR equivalent</dd>
                <dt>Mock solver</dt><dd>{intent.solver}</dd>
                <dt>Recipient · approved wallet</dt><dd>{intent.recipient} · version {intent.walletVersion}</dd>
                <dt>Quote expiry</dt><dd>{new Date(intent.expiresAt).toLocaleTimeString()} · {Math.max(0,Math.ceil((intent.expiresAt-tick)/1000))}s remaining</dd>
                <dt>Simulation reference</dt><dd>{intent.reference}</dd>
            </dl><p role="status"><strong>{intent.state}</strong>{intent.reason&&` · ${intent.reason}`}</p>
            {intent.state==="QUOTE_READY"&&!expired&&<><label><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/> I approve this invoice, recipient, source amount and illustrative fee for simulated payment.</label><ActionButton className={s.button} disabled={busy||!checked} busy={busy} onClick={()=>void action("authorize")}>Authorize simulated payment</ActionButton></>}
            {intent.state==="APPROVED"&&!expired&&<><p>Demo funds are reserved. The recipient and spending policy will be checked again.</p><ActionButton className={s.button} busy={busy} disabled={busy} onClick={()=>void action("execute")}>Execute simulated payment</ActionButton></>}
            {intent.state==="EXECUTING"&&<p aria-live="polite">Mock solver processing. Demo funds stay reserved until settlement or refund.</p>}
            {expired&&["QUOTE_READY","APPROVED"].includes(intent.state)&&<ActionButton className={s.button} disabled={busy} onClick={()=>void read()}>Check expired quote</ActionButton>}
            </>}
            {attempts.length>0&&<details><summary>Payment audit history · {attempts.length} attempts</summary>{attempts.map(v=><section key={v.intent.id}><h4>{v.intent.reference} · {v.intent.state}</h4><ol>{v.audit.map(event=><li key={event.sequence}><strong>{event.state}</strong> · {new Date(event.at).toLocaleTimeString()}<p>{event.detail}</p></li>)}</ol></section>)}</details>}
        </section>
    </details>;
}
