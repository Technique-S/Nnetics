"use client";
import {LoadingSkeleton} from "./loading-skeleton";
import { useEffect, useMemo, useRef, useState } from "react";
import { MockContractorOwnerAdapter, PersistentContractorOwnerAdapter } from "../data/contractor-adapter";
import type { OwnerPortalCommand, PortalSnapshot, ContractorOwnerAdapter } from "../data/contractor-adapter";
import { PortalShell, BillCard, s } from "./demo/portal-ui";
const adapter = new MockContractorOwnerAdapter();
export default function DemoContractorOwner() {return <ContractorOwnerPanel adapter={adapter}/>;}
export function PersistentContractorOwner({organization, embedded = false}:{organization:string;embedded?:boolean}){const adapter=useMemo(()=>new PersistentContractorOwnerAdapter(organization),[organization]);return <ContractorOwnerPanel key={organization} adapter={adapter} organization={organization} embedded={embedded}/>;}
export function ContractorOwnerPanel({adapter,organization,embedded=false}:{adapter:ContractorOwnerAdapter;organization?:string;embedded?:boolean}) {
    const persistent=adapter.mode === "persistent", generation=useRef(0);
    const [snapshot, setSnapshot] = useState<PortalSnapshot | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [invite, setInvite] = useState(""), [notice, setNotice] = useState(""), [name, setName] = useState(""), [notes, setNotes] = useState<Record<string, string>>({});
    const [loadState, setLoadState] = useState<"loading" | "ready" | "start" | "error" | "locked">("loading");
    const requestVersion = useRef(0), accessLocked = useRef(false), hadSnapshot = useRef(false);
    const [chainOrders,setChainOrders]=useState<Record<string,string>>({});
    const [orders, setOrders] = useState<Record<string, {
        reference: string;
        title: string;
        amount: string;
    }>>({});
    async function refresh() {
        if (accessLocked.current) return false;
        const mine = generation.current, request = ++requestVersion.current;
        try {
            const value = await adapter.snapshot();
            if (mine !== generation.current || request !== requestVersion.current) return false;
            hadSnapshot.current = true;
            setSnapshot(value);
            setLoadState("ready");
            return true;
        } catch (e) {
            if (mine !== generation.current || request !== requestVersion.current) return false;
            const message = e instanceof Error ? e.message : "Owner access unavailable.";
            setSnapshot(null);
            setInvite("");
            setNotice("");
            if (!persistent && !hadSnapshot.current && message === "Open a demo owner workspace first. This is not live wallet login.") {
                setLoadState("start");
                setError("");
            } else {
                setLoadState("error");
                setError(message);
            }
            return false;
        }
    }
    async function startDemo() {
        const mine = generation.current;
        setBusy(true); setError("");
        try {
            await adapter.start?.();
            if (mine !== generation.current) return;
            await refresh();
        } catch (e) {
            if (mine === generation.current) setError(e instanceof Error ? e.message : "Could not start the demo. Retry.");
        } finally {
            if (mine === generation.current) setBusy(false);
        }
    }
    useEffect(() => {
        accessLocked.current = false;
        const clear = () => {
            generation.current++; requestVersion.current++; accessLocked.current = true;
            setSnapshot(null); setInvite(""); setNotice(""); setBusy(false);
            setName(""); setNotes({}); setOrders({}); setLoadState("locked");
            setError("Wallet verification changed. Return to sign in.");
        };
        const channel = new BroadcastChannel("nnetics-identity");
        channel.onmessage = clear;
        void refresh();
        const timer = setInterval(() => { if (!document.hidden && !accessLocked.current) void refresh(); }, 15000);
        return () => { generation.current++; requestVersion.current++; channel.close(); clearInterval(timer); };
    }, [adapter]);
    async function run(command: OwnerPortalCommand) { const mine=generation.current; setError(""); setNotice(""); setBusy(true); try {
        if(command.action==="issue-link")setInvite("");
        const result = await adapter.command(command);
        if(mine!==generation.current)return;
        if(command.action==="revoke-link" || command.action==="issue-link") {const channel=new BroadcastChannel("nnetics-contractor-access");channel.postMessage({profileId:command.profileId,mode:adapter.mode});channel.close();}
        if (result.token)
            setInvite(`${location.origin}/contractor${persistent ? "" : "?mode=demo"}#${result.token}`);
        if (command.action === "revoke-link")
            setInvite("");
        if(command.action === "create-profile") setName("");
        const refreshed = await refresh();
        if(mine!==generation.current || !refreshed)return;
        setNotice(persistent?"Private record saved. No payment or deployment was initiated.":"Simulated change saved. No live transaction was requested.");
    }
    catch (e) {
        if(mine===generation.current) setError(e instanceof Error ? e.message : "Request failed. Retry.");
    }
    finally {
        if(mine===generation.current) setBusy(false);
    } }
    return <PortalShell owner persistent={persistent} embedded={embedded}><div className={s.intro}>{embedded ? <h2 className={s.heading}>Contractors and bills</h2> : <h1 className={s.heading}>Contractors and bills</h1>}<p className={s.muted}>Invite a contractor, review their wallet, then approve a fixed work order. {persistent ? "These are your organization’s persistent billing records. Work-order approval here is off-chain only; it does not authorize a vault payment." : "Every change here belongs to this isolated demo workspace."}</p></div>{error && <p role="alert" className={`${s.notice} ${s.error}`}>{error}</p>}{notice && <p role="status" className={s.notice}>{notice}</p>}
 {loadState === "loading" ? <section className={s.card} aria-busy="true"><p role="status">Loading contractor records…</p><LoadingSkeleton/></section> : !snapshot && loadState !== "start" ? <section className={s.card}><h2>{loadState === "locked" ? "Verify your wallet again" : "Contractor records unavailable"}</h2><p>{persistent ? "Sign in with Meteor on the owner page and select your organization. Records require current organization authority." : "Your records could not be loaded. Retry the request to check access."}</p>{loadState === "locked" ? <a className={s.link} href="/">Return to sign in</a> : <button className={s.button} onClick={() => { setError(""); setLoadState("loading"); void refresh(); }}>Retry owner access</button>}</section> : !snapshot ? <section className={s.card}><h2>Start an empty demo workspace</h2><p>No real wallet or organization is used. Your browser receives a separate demo owner session.</p><button className={s.button} disabled={busy} onClick={() => void startDemo()}>{busy ? "Starting demo…" : "Start contractor demo"}</button></section> : <>
 <div className={s.grid}><section className={s.card}><h2>Contractors <span className={s.count}>{snapshot.profiles.length}/3</span></h2><form onSubmit={e => { e.preventDefault(); void run({ action: "create-profile", name }); }}><label htmlFor="contractor-name">Contractor name</label><input id="contractor-name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ada · Content writer"/><div className={s.actions}><button className={s.button} disabled={busy || snapshot.profiles.length >= 3}>Create contractor profile</button><button type="button" className={`${s.button} ${s.secondary}`} onClick={refresh}>Refresh owner records</button></div></form>
 {invite && <div className={s.notice}><label htmlFor="private-link">Private invitation link · shown once</label><input id="private-link" readOnly value={invite}/><p className={s.small}>Anyone with this link can access this contractor’s {persistent ? "private records" : "demo records"}. Expires in 7 days. Replacing or revoking it invalidates active access.</p><a className={s.link} href={invite} target="_blank" rel="noreferrer">Open contractor portal</a></div>}
 {snapshot.profiles.length === 0 && <p className={s.empty}>No contractors yet. Create your first profile to invite them.</p>}
 {snapshot.profiles.map(p => <article key={p.id} className={s.row}><h3>{p.name}</h3><span className={s.pill}>{p.linkActive ? "Private link active" : "Access not active"}</span><p className={s.meta}>Approved wallet: {p.wallet || "Awaiting initial submission"}</p><div className={s.actions}><button disabled={busy} className={`${s.button} ${s.secondary}`} aria-label={`${p.linkActive ? "Replace private link" : "Create private link"} · ${p.name}`} onClick={() => { if(!p.linkActive || window.confirm("Replace this link? The previous link and its active access will stop working.")) void run({ action: "issue-link", profileId: p.id }); }}>{p.linkActive ? "Replace private link" : "Create private link"}</button>{p.linkActive && <button aria-label={`Revoke access · ${p.name}`} disabled={busy} className={`${s.button} ${s.danger}`} onClick={() => { if(window.confirm("Revoke this private link? The contractor will immediately lose access. Existing invoices and approved recipients are preserved.")) void run({ action: "revoke-link", profileId: p.id }); }}>Revoke access</button>}</div>
 {p.pendingWallet && <div className={s.notice}><strong>{p.wallet ? "Wallet change request" : "Initial wallet approval"}</strong><p className={s.meta}>{p.pendingWallet.account}</p><p className={s.small}>{persistent ? "Signed wallet control verified; current on-chain key is rechecked at approval." : "Simulated verification only."} Approval affects future work orders; existing recipients stay fixed.</p><div className={s.actions}><button aria-label={`Approve wallet · ${p.name}`} disabled={busy} className={s.button} onClick={() => run({ action: "approve-wallet", profileId: p.id, requestId: p.pendingWallet!.id })}>Approve wallet</button><button aria-label={`Reject wallet · ${p.name}`} disabled={busy} className={`${s.button} ${s.secondary}`} onClick={() => run({ action: "reject-wallet", profileId: p.id, requestId: p.pendingWallet!.id })}>Reject wallet</button></div></div>}
 {p.wallet && <form onSubmit={e => { e.preventDefault(); const f = orders[p.id]; if (f)
                void run({ action: "create-order", profileId: p.id, ...f }); }}><label>Work order reference<input aria-label={`Work order reference · ${p.name}`} required value={orders[p.id]?.reference || ""} onChange={e => setOrders({ ...orders, [p.id]: { ...orders[p.id], reference: e.target.value } })}/></label><label>Work description<input aria-label={`Work description · ${p.name}`} required value={orders[p.id]?.title || ""} onChange={e => setOrders({ ...orders, [p.id]: { ...orders[p.id], title: e.target.value } })}/></label><label>Exact amount (NEAR)<input inputMode="decimal" aria-label={`Amount · ${p.name}`} required value={orders[p.id]?.amount || ""} onChange={e => setOrders({ ...orders, [p.id]: { ...orders[p.id], amount: e.target.value } })}/></label><div className={s.actions}><button aria-label={`Approve work order · ${p.name}`} className={s.button} disabled={busy}>Approve work order</button></div></form>}</article>)}
 </section><div><section className={s.card}><h2>Approved work orders</h2>{snapshot.orders.length === 0 ? <p className={s.empty}>Approve a wallet before creating a work order.</p> : snapshot.orders.map(o => <div key={o.id} className={s.row}><h3>{o.reference} · {o.title}</h3><p>{o.amount} NEAR</p><p className={s.meta}>Immutable recipient: {o.recipient}</p></div>)}</section><section className={s.card}><h2>Invoice review <span className={s.count}>{snapshot.invoices.length}</span></h2>{snapshot.invoices.length === 0 && <p className={s.empty}>Contractor submissions will appear here.</p>}{snapshot.invoices.map(b => <BillCard key={b.id} bill={b} persistent={persistent} organization={organization}>{persistent&&b.status==="Approved"&&<section aria-label={`Payment linkage · ${b.reference}`}><label>Approved on-chain work order ID<input aria-label={`Chain order · ${b.reference}`} value={chainOrders[b.id]||b.payment?.orderId||""} onChange={e=>setChainOrders({...chainOrders,[b.id]:e.target.value})}/></label><p className={s.small}>Billing approval is off-chain. Find the approved on-chain ID in Work orders; this form links this reviewed bill to exactly one finalized approved chain order with the same immutable recipient and amount. The queue stays held; no transfer is initiated. Verified provisioning is required.</p><button className={s.button} disabled={busy||!(chainOrders[b.id]||b.payment?.orderId)} onClick={()=>run({action:"queue-invoice",invoiceId:b.id,orderId:chainOrders[b.id]||b.payment!.orderId})}>Link reviewed invoice · {b.reference}</button></section>}{["Submitted", "Under review", "In review", "Needs clarification"].includes(b.status) && <>{persistent && b.status === "Submitted" && <button aria-label={`Start review · ${b.reference}`} className={s.button} disabled={busy} onClick={()=>run({action:"review-invoice",invoiceId:b.id,decision:"begin-review",note:""})}>Start review</button>}<label>Review note<input aria-label={`Review note · ${b.reference}`} value={notes[b.id] || ""} onChange={e => setNotes({ ...notes, [b.id]: e.target.value })}/></label><div className={s.actions}><button aria-label={`Approve bill · ${b.reference}`} className={s.button} disabled={busy || b.reasons.length > 0} onClick={() => run({ action: "review-invoice", invoiceId: b.id, decision: "approve", note: "" })}>Approve bill</button><button aria-label={`Request clarification · ${b.reference}`} className={`${s.button} ${s.secondary}`} disabled={busy} onClick={() => run({ action: "review-invoice", invoiceId: b.id, decision: "clarify", note: notes[b.id] || "" })}>Request clarification</button><button aria-label={`Reject bill · ${b.reference}`} className={`${s.button} ${s.danger}`} disabled={busy} onClick={() => run({ action: "review-invoice", invoiceId: b.id, decision: "reject", note: notes[b.id] || "" })}>Reject bill</button></div></>}</BillCard>)}<div className={s.disabled}>Payment execution and live deployment are disabled. Approving a bill does not initiate a transfer.</div></section></div></div></>}
 </PortalShell>;
}
