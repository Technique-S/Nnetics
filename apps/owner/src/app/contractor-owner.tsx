"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { MockContractorOwnerAdapter, PersistentContractorOwnerAdapter } from "../data/contractor-adapter";
import type { OwnerPortalCommand, PortalSnapshot, ContractorOwnerAdapter } from "../data/contractor-adapter";
import { PortalShell, BillCard, s } from "./demo/portal-ui";
const adapter = new MockContractorOwnerAdapter();
export default function DemoContractorOwner() {return <ContractorOwnerPanel adapter={adapter}/>;}
export function PersistentContractorOwner({organization}:{organization:string}){const adapter=useMemo(()=>new PersistentContractorOwnerAdapter(organization),[organization]);return <ContractorOwnerPanel key={organization} adapter={adapter} organization={organization}/>;}
export function ContractorOwnerPanel({adapter,organization}:{adapter:ContractorOwnerAdapter;organization?:string}) {
    const persistent=adapter.mode === "persistent", generation=useRef(0);
    const [snapshot, setSnapshot] = useState<PortalSnapshot | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [invite, setInvite] = useState(""), [notice, setNotice] = useState(""), [name, setName] = useState(""), [notes, setNotes] = useState<Record<string, string>>({});
    const [orders, setOrders] = useState<Record<string, {
        reference: string;
        title: string;
        amount: string;
    }>>({});
    async function refresh() { try {
        const mine=generation.current; const value=await adapter.snapshot();if(mine===generation.current)setSnapshot(value);
    }
    catch (e) {
        setSnapshot(null);setInvite("");setError(e instanceof Error?e.message:"Owner access unavailable.");
    } }
    useEffect(() => {const clear=()=>{generation.current++;setSnapshot(null);setInvite("");setError("Wallet verification changed. Return to sign in.");};const channel=new BroadcastChannel("nnetics-identity");channel.onmessage=clear;void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh();},15000);return ()=>{generation.current++;channel.close();clearInterval(timer);};}, [adapter]);
    async function run(command: OwnerPortalCommand) { const mine=generation.current; setError(""); setNotice(""); setBusy(true); try {
        if(command.action==="issue-link")setInvite("");
        const result = await adapter.command(command);
        if(mine!==generation.current)return;
        if(command.action==="revoke-link" || command.action==="issue-link") {const channel=new BroadcastChannel("nnetics-contractor-access");channel.postMessage({profileId:command.profileId,mode:adapter.mode});channel.close();}
        if (result.token)
            setInvite(`${location.origin}/contractor${persistent ? "" : "?mode=demo"}#${result.token}`);
        if (command.action === "revoke-link")
            setInvite("");
        await refresh();
        if(mine!==generation.current)return;
        setNotice(persistent?"Private record saved. No payment or deployment was initiated.":"Simulated change saved. No live transaction was requested.");
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Demo request failed.");
    }
    finally {
        setBusy(false);
    } }
    return <PortalShell owner persistent={persistent}><div className={s.intro}><span className={s.tag}>PEOPLE & PAYABLES</span><h1 className={s.heading}>A clear path from work to bill.</h1><p className={s.muted}>Invite a contractor, review their wallet, then approve a fixed work order. {persistent ? "These are your organization’s persistent billing records. Work-order approval here is off-chain only; it does not authorize a vault payment." : "Every change here belongs to this isolated demo workspace."}</p></div>{error && <p role="alert" className={`${s.notice} ${s.error}`}>{error}</p>}{notice && <p role="status" className={s.notice}>{notice}</p>}
 {!snapshot && persistent ? <section className={s.card}><h2>Verified owner access required</h2><p>Sign in with Meteor on the owner page and select your organization. Records require current organization authority.</p><button className={s.button} onClick={refresh}>Retry owner access</button></section> : !snapshot ? <section className={s.card}><h2>Start an empty demo workspace</h2><p>No real wallet or organization is used. Your browser receives a separate demo owner session.</p><button className={s.button} onClick={async () => { await adapter.start?.(); await refresh(); }}>Start contractor demo</button></section> : <>
 <div className={s.grid}><section className={s.card}><h2>Contractors <span className={s.count}>{snapshot.profiles.length}/3</span></h2><form onSubmit={e => { e.preventDefault(); void run({ action: "create-profile", name }); setName(""); }}><label htmlFor="contractor-name">Contractor name</label><input id="contractor-name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ada · Content writer"/><div className={s.actions}><button className={s.button} disabled={busy || snapshot.profiles.length >= 3}>Create contractor profile</button><button type="button" className={`${s.button} ${s.secondary}`} onClick={refresh}>Refresh owner records</button></div></form>
 {invite && <div className={s.notice}><label htmlFor="private-link">Private invitation link · shown once</label><input id="private-link" readOnly value={invite}/><p className={s.small}>Anyone with this link can access this contractor’s {persistent ? "private records" : "demo records"}. Expires in 7 days. Replacing or revoking it invalidates active access.</p><a className={s.link} href={invite} target="_blank" rel="noreferrer">Open contractor portal</a></div>}
 {snapshot.profiles.length === 0 && <p className={s.empty}>No contractors yet. Create your first profile to invite them.</p>}
 {snapshot.profiles.map(p => <article key={p.id} className={s.row}><h3>{p.name}</h3><span className={s.pill}>{p.linkActive ? "Private link active" : "Access not active"}</span><p className={s.meta}>Approved wallet: {p.wallet || "Awaiting initial submission"}</p><div className={s.actions}><button disabled={busy} className={`${s.button} ${s.secondary}`} onClick={() => run({ action: "issue-link", profileId: p.id })}>{p.linkActive ? "Replace private link" : "Create private link"} · {p.name}</button>{p.linkActive && <button disabled={busy} className={`${s.button} ${s.danger}`} onClick={() => run({ action: "revoke-link", profileId: p.id })}>Revoke access · {p.name}</button>}</div>
 {p.pendingWallet && <div className={s.notice}><strong>{p.wallet ? "Wallet change request" : "Initial wallet approval"}</strong><p className={s.meta}>{p.pendingWallet.account}</p><p className={s.small}>{persistent ? "Signed wallet control verified; current on-chain key is rechecked at approval." : "Simulated verification only."} Approval affects future work orders; existing recipients stay fixed.</p><div className={s.actions}><button disabled={busy} className={s.button} onClick={() => run({ action: "approve-wallet", profileId: p.id, requestId: p.pendingWallet!.id })}>Approve wallet · {p.name}</button><button disabled={busy} className={`${s.button} ${s.secondary}`} onClick={() => run({ action: "reject-wallet", profileId: p.id, requestId: p.pendingWallet!.id })}>Reject wallet · {p.name}</button></div></div>}
 {p.wallet && <form onSubmit={e => { e.preventDefault(); const f = orders[p.id]; if (f)
                void run({ action: "create-order", profileId: p.id, ...f }); }}><label>Work order reference<input aria-label={`Work order reference · ${p.name}`} required value={orders[p.id]?.reference || ""} onChange={e => setOrders({ ...orders, [p.id]: { ...orders[p.id], reference: e.target.value } })}/></label><label>Work description<input aria-label={`Work description · ${p.name}`} required value={orders[p.id]?.title || ""} onChange={e => setOrders({ ...orders, [p.id]: { ...orders[p.id], title: e.target.value } })}/></label><label>Exact amount (NEAR)<input aria-label={`Amount · ${p.name}`} required value={orders[p.id]?.amount || ""} onChange={e => setOrders({ ...orders, [p.id]: { ...orders[p.id], amount: e.target.value } })}/></label><div className={s.actions}><button className={s.button} disabled={busy}>Approve work order · {p.name}</button></div></form>}</article>)}
 </section><div><section className={s.card}><h2>Approved work orders</h2>{snapshot.orders.length === 0 ? <p className={s.empty}>Approve a wallet before creating a work order.</p> : snapshot.orders.map(o => <div key={o.id} className={s.row}><h3>{o.reference} · {o.title}</h3><p>{o.amount} NEAR</p><p className={s.meta}>Immutable recipient: {o.recipient}</p></div>)}</section><section className={s.card}><h2>Invoice review <span className={s.count}>{snapshot.invoices.length}</span></h2>{snapshot.invoices.length === 0 && <p className={s.empty}>Contractor submissions will appear here.</p>}{snapshot.invoices.map(b => <BillCard key={b.id} bill={b} persistent={persistent} organization={organization}>{["Submitted", "Under review", "In review", "Needs clarification"].includes(b.status) && <>{persistent && b.status === "Submitted" && <button className={s.button} disabled={busy} onClick={()=>run({action:"review-invoice",invoiceId:b.id,decision:"begin-review",note:""})}>Start review · {b.reference}</button>}<label>Review note<input aria-label={`Review note · ${b.reference}`} value={notes[b.id] || ""} onChange={e => setNotes({ ...notes, [b.id]: e.target.value })}/></label><div className={s.actions}><button className={s.button} disabled={busy || b.reasons.length > 0} onClick={() => run({ action: "review-invoice", invoiceId: b.id, decision: "approve", note: "" })}>Approve bill · {b.reference}</button><button className={`${s.button} ${s.secondary}`} disabled={busy} onClick={() => run({ action: "review-invoice", invoiceId: b.id, decision: "clarify", note: notes[b.id] || "" })}>Request clarification · {b.reference}</button><button className={`${s.button} ${s.danger}`} disabled={busy} onClick={() => run({ action: "review-invoice", invoiceId: b.id, decision: "reject", note: notes[b.id] || "" })}>Reject bill · {b.reference}</button></div></>}</BillCard>)}<div className={s.disabled}>Payment execution and live deployment are disabled. Approving a bill does not initiate a transfer.</div></section></div></div></>}
 </PortalShell>;
}
