"use client";
import {SimulatedIntentPayment} from "./simulated-intent";
import {getUserMessage} from "../data/user-message";
import {LiveApiError} from "../data/live-request";
import {OperationFeedback} from "./operation-feedback";
import {ActionButton} from "./action-button";
import {LoadingSkeleton} from "./loading-skeleton";
import { useEffect, useMemo, useRef, useState } from "react";
import { MockContractorOwnerAdapter, PersistentContractorOwnerAdapter } from "../data/contractor-adapter";
import type { OwnerPortalCommand, PortalSnapshot, ContractorOwnerAdapter, ContractorProfile } from "../data/contractor-adapter";
import { matchesRecords, RecordSearch } from "./record-search";
import type { DemoWsPayment } from "../data/demo-workspace-adapter";
import { PortalShell, BillCard, s } from "./demo/portal-ui";
import { ContractorPaymentForm, type PrepareContractorPayment, type ConfirmContractorPayment, type CancelContractorPayment } from "./contractor-payment-draft";
const adapter = new MockContractorOwnerAdapter();
// Assistant intent: one prepared step from Ask Nnetics, applied inside this
// panel through the same commands a manual user would take.
// Which part of the contractor workspace this panel shows. Payment
// preparation lives in the Payments destination, invoice review in Invoices.
export type ContractorFocus = "contractors" | "invoices" | "payments";
export interface DemoAssistantIntent {
  // create-contractor → prefill the contractor name field and focus it.
  ownerName?: string;
  // prepare-payment-draft → open that contractor's payment review prefilled.
  draft?: { contractor: string; amount: string; description: string };
}
export function DemoContractorWorkspace({onPrepare,onConfirm,onCancel,paymentFee,intent,focus,invoiceContractor,onViewBills,paymentRecords}:{onPrepare?:PrepareContractorPayment; onConfirm?:ConfirmContractorPayment; onCancel?:CancelContractorPayment; paymentFee?:string; intent?:DemoAssistantIntent; focus?:ContractorFocus;invoiceContractor?:string;onViewBills?:(id:string)=>void;paymentRecords?:DemoWsPayment[]}) {return <ContractorOwnerPanel adapter={adapter} embedded onPrepare={onPrepare} onConfirm={onConfirm} onCancel={onCancel} paymentFee={paymentFee} demoIntent={intent} focus={focus} invoiceContractor={invoiceContractor} onViewBills={onViewBills} paymentRecords={paymentRecords}/>;}
export default function DemoContractorOwner() {return <ContractorOwnerPanel adapter={adapter}/>;}
export function PersistentContractorOwner({organization, embedded = false, readOnly=false, limit, focus}:{organization:string;embedded?:boolean;readOnly?:boolean;limit?:string;focus?:ContractorFocus}){const adapter=useMemo(()=>new PersistentContractorOwnerAdapter(organization),[organization]);return <ContractorOwnerPanel key={organization} adapter={adapter} organization={organization} embedded={embedded} readOnly={readOnly} limit={limit} focus={focus}/>;}
export function ContractorOwnerPanel({adapter,organization,embedded=false,readOnly=false,onPrepare,onConfirm,onCancel,limit,paymentFee,demoIntent,focus="contractors",invoiceContractor,onViewBills,paymentRecords}:{adapter:ContractorOwnerAdapter;organization?:string;embedded?:boolean;readOnly?:boolean;onPrepare?:PrepareContractorPayment;onConfirm?:ConfirmContractorPayment;onCancel?:CancelContractorPayment;limit?:string;paymentFee?:string;demoIntent?:DemoAssistantIntent;focus?:ContractorFocus;invoiceContractor?:string;onViewBills?:(id:string)=>void;paymentRecords?:DemoWsPayment[]}) {
    const persistent=adapter.mode === "persistent", generation=useRef(0);
    const [snapshot, setSnapshot] = useState<PortalSnapshot | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false), [invite, setInvite] = useState(""), [notice, setNotice] = useState(""), [name, setName] = useState(""), [notes, setNotes] = useState<Record<string, string>>({}), [search, setSearch] = useState(""), [visible, setVisible] = useState(25);
    const [loadState, setLoadState] = useState<"loading" | "ready" | "start" | "error" | "locked">("loading");
    const requestVersion = useRef(0), accessLocked = useRef(false), hadSnapshot = useRef(false);
    const [billProfile,setBillProfile]=useState(invoiceContractor ?? "");
    const [invoiceSearch, setInvoiceSearch] = useState("");
    const [invoiceStatus, setInvoiceStatus] = useState("");
    const [invoiceSort, setInvoiceSort] = useState("newest");
    const [walletFilter, setWalletFilter] = useState("");
    const [contractorStatus, setContractorStatus] = useState("");
    const [agreementSearch, setAgreementSearch] = useState("");
    const [chainOrders,setChainOrders]=useState<Record<string,string>>({});
    const [orders, setOrders] = useState<Record<string, {
        reference: string;
        title: string;
        amount: string;
    }>>({});
    const readAbort=useRef<AbortController|null>(null),readRunning=useRef(false),pollPaused=useRef(false);
    const [reading,setReading]=useState(false);
    async function refresh(manual=true) {
        if(accessLocked.current||readRunning.current||(!manual&&pollPaused.current))return false;
        const controller=new AbortController();readAbort.current=controller;readRunning.current=true;setReading(true);
        const mine = generation.current, request = ++requestVersion.current;
        try {
            const value = await adapter.snapshot(controller.signal);
            if (mine !== generation.current || request !== requestVersion.current) return false;
            pollPaused.current=false;
            hadSnapshot.current = true;
            setSnapshot(value);
            setLoadState("ready");
            return true;
        } catch (e) {
            if (mine !== generation.current || request !== requestVersion.current) return false;
            pollPaused.current=true;
            if(e instanceof LiveApiError&&e.retryable){setError(e.message);setLoadState(hadSnapshot.current?"ready":"error");return false;}
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
        } finally {readRunning.current=false;if(mine===generation.current)setReading(false);}
    }
    async function startDemo() {
        const mine = generation.current;
        setBusy(true); setError("");
        try {
            await adapter.start?.();
            if (mine !== generation.current) return;
            await refresh();
        } catch (e) {
            if (mine === generation.current) {
                setError(e instanceof Error ? e.message : "Could not start the demo. Retry.");
                setLoadState("error");
            }
        } finally {
            if (mine === generation.current) setBusy(false);
        }
    }
    useEffect(() => {
        accessLocked.current = false;
        const clear = () => {
            generation.current++; readAbort.current?.abort();requestVersion.current++; accessLocked.current = true;
            setSnapshot(null); setInvite(""); setNotice(""); setBusy(false);
            setName(""); setNotes({}); setOrders({}); setLoadState("locked");
            setError("Wallet verification changed. Return to sign in.");
        };
        const channel = new BroadcastChannel("nnetics-identity");
        channel.onmessage = clear;
        if (!persistent && !embedded) void startDemo();
        else void refresh();
        const timer = setInterval(() => { if (!document.hidden && !accessLocked.current) void refresh(false); }, 15000);
        return () => { generation.current++;readAbort.current?.abort(); requestVersion.current++; readRunning.current=false; channel.close(); clearInterval(timer); };
    }, [adapter]);
    // An Ask Nnetics create-contractor intent prefills the existing form and
    // focuses it; submission still goes through the standard review flow.
    useEffect(() => {
        if (!readOnly || !demoIntent?.ownerName) return;
        setName(demoIntent.ownerName);
        const field = document.getElementById("contractor-name") as HTMLInputElement | null;
        field?.focus();
        field?.scrollIntoView({block: "center"});
    }, [demoIntent, readOnly]);
    // A prepare-payment-draft intent resolves to exactly one contractor; an
    // unmatched or ambiguous name never silently attaches to another profile.
    function draftPresetFor(profileId: string) {
        const draft = demoIntent?.draft;
        if (!draft) return undefined;
        const match = snapshot?.profiles.find(p => p.name.toLowerCase() === draft.contractor.toLowerCase());
        return match?.id === profileId ? {amount: draft.amount, description: draft.description} : undefined;
    }
    async function run(command: OwnerPortalCommand) { if(readOnly)return; const mine=generation.current; setError(""); setNotice(""); setBusy(true); try {
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
const profiles = [...(snapshot?.profiles ?? []), ...(snapshot?.archivedProfiles ?? [])];
const names = new Map(profiles.map(profile => [profile.id, profile.name]));
const visibleBills = (snapshot?.invoices ?? []).filter(bill =>
  (!billProfile || bill.contractorId === billProfile) &&
  (!invoiceStatus || (bill.status === "Under review" ? "In review" : bill.status) === invoiceStatus) &&
  matchesRecords(invoiceSearch, bill.reference, bill.orderReference, bill.description, bill.amount, bill.recipient, names.get(bill.contractorId)),
).sort((a,b) => invoiceSort === "oldest" ? a.submittedAt.localeCompare(b.submittedAt) : b.submittedAt.localeCompare(a.submittedAt));
const profileMatches = (p: ContractorProfile) =>
  matchesRecords(search, p.name, p.wallet, p.pendingWallet?.account) &&
  (!walletFilter || (walletFilter === "pending" ? !!p.pendingWallet : walletFilter === "ready" ? !!p.wallet && !p.pendingWallet : !p.wallet && !p.pendingWallet));
const matched = contractorStatus === "archived" ? [] : (snapshot?.profiles ?? []).filter(profileMatches);
const matchedArchived = contractorStatus === "active" ? [] : (snapshot?.archivedProfiles ?? []).filter(profileMatches);
const ordersShown = (snapshot?.orders ?? []).filter(order =>
  matchesRecords(agreementSearch, order.reference, order.title, order.recipient, names.get(order.contractorId)));
const shown = matched.slice(0, visible);
const payableCount = snapshot ? snapshot.profiles.filter(p => p.wallet).length : 0;
const payableContractors = (snapshot?.profiles ?? []).filter((p): p is ContractorProfile & {wallet: string} => typeof p.wallet === "string" && p.wallet.length > 0);
const payable = <section className={s.card}><h2>Ready to pay <span className={s.count}>{payableCount}</span></h2><p className={s.small}>Prepare a simulated payment for a contractor with an approved payout wallet. The amount is reserved on preparation and only moves when you confirm it.</p>{payableCount === 0 && <p className={s.empty}>Approve a contractor's payout wallet first, then their payment appears here.</p>}{payableContractors.map(p => <article key={p.id} className={s.row}><h3>{p.name}</h3><p className={s.meta}>Payout wallet: {p.wallet}</p><ContractorPaymentForm id={p.id} name={p.name} wallet={p.wallet} onPrepare={onPrepare} onConfirm={onConfirm} onCancel={onCancel} limit={limit} fee={paymentFee} preset={draftPresetFor(p.id)} paymentRecords={paymentRecords}/></article>)}</section>;
const reviewPanel = snapshot && (<section className={s.card} id="contractor-bills" tabIndex={-1}><h2>Invoice review <span className={s.count}>{snapshot.invoices.length}</span></h2><RecordSearch label="Search invoices" query={invoiceSearch} onQuery={setInvoiceSearch} onReset={invoiceSearch || invoiceStatus || billProfile || invoiceSort !== "newest" ? () => {setInvoiceSearch("");setInvoiceStatus("");setBillProfile("");setInvoiceSort("newest");} : undefined}>
  <label className="filter-label">Status<select aria-label="Filter invoices" value={invoiceStatus} onChange={event => setInvoiceStatus(event.target.value)}>
    <option value="">All invoices</option>{["Submitted", "In review", "Needs clarification", "Approved", "Rejected", "Paid"].map(status => <option key={status}>{status}</option>)}
  </select></label>
  <label className="filter-label">Contractor bills<select value={billProfile} onChange={event => setBillProfile(event.target.value)}>
    <option value="">All contractors</option>{[...snapshot.profiles,...(snapshot.archivedProfiles ?? [])].map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
  </select></label>
  <label className="filter-label">Sort invoices<select value={invoiceSort} onChange={event => setInvoiceSort(event.target.value)}>
    <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
  </select></label>
</RecordSearch>
<p className="record-count" role="status">{visibleBills.length} of {snapshot.invoices.length} invoices</p>
{!visibleBills.length && <p className={s.empty}>{snapshot.invoices.length ? "No invoices match these filters." : "Contractor submissions will appear here."}</p>}{visibleBills.map(b => <BillCard key={b.id} bill={b} persistent={persistent} organization={organization}>{!persistent && !readOnly && ["Approved","Paid"].includes(b.status) && <SimulatedIntentPayment billId={b.id} onChanged={()=>void refresh()}/>}{!readOnly && b.status!=="Paid" && <label>Work order (optional)<select aria-label={`Work order association · ${b.reference}`} disabled={busy} value={b.orderId} onChange={e=>void run({action:"associate-order",invoiceId:b.id,orderId:e.target.value})}><option value="">No work order</option>{snapshot.orders.filter(o=>o.contractorId===b.contractorId).map(o=><option key={o.id} value={o.id}>{o.reference} · {o.title}</option>)}</select></label>}{!readOnly&&persistent&&b.status==="Approved"&&<details className="reference-disclosure"><summary>Existing payment linkage</summary><section aria-label={`Payment linkage · ${b.reference}`}><label>Approved on-chain work order ID<input aria-label={`Chain order · ${b.reference}`} value={chainOrders[b.id]||b.payment?.orderId||""} onChange={e=>setChainOrders({...chainOrders,[b.id]:e.target.value})}/></label><p className={s.small}>Billing approval is off-chain. This form links the bill to an existing confirmed agreement with the same recipient and amount. The queue stays held; no transfer is initiated. Verified provisioning is required.</p><ActionButton busy={busy} className={s.button} disabled={busy||!(chainOrders[b.id]||b.payment?.orderId)} onClick={()=>run({action:"queue-invoice",invoiceId:b.id,orderId:chainOrders[b.id]||b.payment!.orderId})}>Link reviewed invoice · {b.reference}</ActionButton></section></details>}{!readOnly && ["Submitted", "Under review", "In review", "Needs clarification"].includes(b.status) && <>{persistent && b.status === "Submitted" && <ActionButton busy={busy} aria-label={`Start review · ${b.reference}`} className={s.button} disabled={busy} onClick={()=>run({action:"review-invoice",invoiceId:b.id,decision:"begin-review",note:""})}>Start review</ActionButton>}<label>Review note<input aria-label={`Review note · ${b.reference}`} value={notes[b.id] || ""} onChange={e => setNotes({ ...notes, [b.id]: e.target.value })}/></label><div className={s.actions}><ActionButton busy={busy} aria-label={`Approve bill · ${b.reference}`} className={s.button} disabled={busy || b.reasons.length > 0} onClick={() => run({ action: "review-invoice", invoiceId: b.id, decision: "approve", note: "" })}>Approve bill</ActionButton><ActionButton busy={busy} aria-label={`Request clarification · ${b.reference}`} className={`${s.button} ${s.secondary}`} disabled={busy} onClick={() => run({ action: "review-invoice", invoiceId: b.id, decision: "clarify", note: notes[b.id] || "" })}>Request clarification</ActionButton><ActionButton busy={busy} aria-label={`Reject bill · ${b.reference}`} className={`${s.button} ${s.danger}`} disabled={busy} onClick={() => run({ action: "review-invoice", invoiceId: b.id, decision: "reject", note: notes[b.id] || "" })}>Reject bill</ActionButton></div></>}</BillCard>)}<div className={s.disabled}>Payment execution and live deployment are disabled. Approving a bill does not initiate a transfer.</div></section>);
return <PortalShell owner persistent={persistent} embedded={embedded}><div className={s.intro}>{embedded ? <h2 className={s.heading}>Contractors and bills</h2> : <h1 className={s.heading}>Contractors and bills</h1>}<p className={s.muted} hidden={embedded && focus !== "contractors"}>Add a contractor, share their private link and approve their payout wallet. {persistent ? "Bill review and payment approval are separate." : "Every change here belongs to this isolated demo workspace."}</p></div>{error && <p role="alert" className={`${s.notice} ${s.error}`}>{getUserMessage(error)}</p>}{notice && <p role="status" className={s.notice}>{notice}</p>}
 <OperationFeedback active={reading} message="Loading contractor records…"/>{error&&snapshot&&<ActionButton disabled={reading} onClick={()=>void refresh()}>Retry verification</ActionButton>}{loadState === "loading" ? <section className={s.card} aria-busy="true"><p role="status">Loading contractor records…</p><LoadingSkeleton/></section> : !snapshot && loadState !== "start" ? <section className={s.card}><h2>{loadState === "locked" ? "Verify your wallet again" : "Contractor records unavailable"}</h2><p>{persistent ? "Sign in with Meteor on the owner page and select your organization. Records require current organization authority." : "Your records could not be loaded. Retry the request to check access."}</p>{loadState === "locked" ? <a className={s.link} href="/">Return to sign in</a> : <ActionButton busy={busy} className={s.button} onClick={() => { setError(""); setLoadState("loading"); if (!persistent && !embedded) void startDemo(); else void refresh(); }}>Retry owner access</ActionButton>}</section> : !snapshot ? <section className={s.card}><h2>Start an empty demo workspace</h2><p>No real wallet or organization is used. Your browser receives a separate demo owner session.</p><ActionButton busy={busy} className={s.button} disabled={busy} onClick={() => void startDemo()}>{busy ? "Starting demo…" : "Start contractor demo"}</ActionButton></section> : <>
 {focus==="invoices" ? <>{reviewPanel}</> : focus==="payments" ? <>{payable}</> : <div className={s.grid}>{<section className={s.card}><h2>Contractors <span className={s.count}>{snapshot.profiles.length}</span></h2>{!readOnly && <form onSubmit={e => { e.preventDefault(); void run({ action: "create-profile", name }); }}><label htmlFor="contractor-name">Contractor name</label><input id="contractor-name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ada · Content writer"/><div className={s.actions}><ActionButton busy={busy} className={s.button} disabled={busy}>Add contractor</ActionButton><ActionButton busy={busy} type="button" className={`${s.button} ${s.secondary}`} onClick={()=>void refresh()}>Refresh owner records</ActionButton></div></form>}
 {invite && <div className={s.notice}><label htmlFor="private-link">Private invitation link · shown once</label><input id="private-link" readOnly value={invite}/><p className={s.small}>Anyone with this link can access this contractor’s {persistent ? "private records" : "demo records"}. Expires in 7 days. Replacing or revoking it invalidates active access.</p><a className={s.link} href={invite} target="_blank" rel="noreferrer">Open contractor portal</a> <button type="button" className={s.button} onClick={async()=>{try{await navigator.clipboard.writeText(invite);setNotice("Private link copied.");}catch{setNotice("Select the private link and copy it manually.");}}}>Copy private link</button></div>}
<RecordSearch label="Search contractors" query={search} onQuery={value => {setSearch(value);setVisible(25);}}
  onReset={search || walletFilter || contractorStatus ? () => {setSearch("");setWalletFilter("");setContractorStatus("");setVisible(25);} : undefined}>
  <label className="filter-label">Wallet status<select value={walletFilter} onChange={event => {setWalletFilter(event.target.value);setVisible(25);}}>
    <option value="">Any wallet status</option><option value="ready">Approved wallet</option><option value="pending">Approval pending</option><option value="missing">Wallet needed</option>
  </select></label>
  <label className="filter-label">Contractor status<select value={contractorStatus} onChange={event => {setContractorStatus(event.target.value);setVisible(25);}}>
    <option value="">All profiles</option><option value="active">Active only</option><option value="archived">Archived only</option>
  </select></label>
</RecordSearch>
{profiles.length > 0 && <p className="record-count" role="status">{matched.length + matchedArchived.length} of {profiles.length} contractors</p>}
{profiles.length === 0 && <p className={s.empty}>No contractors yet. Create your first profile to invite them.</p>}
{matched.length + matchedArchived.length === 0 && profiles.length > 0 && <p className={s.empty}>No contractors match these filters.</p>}
 {shown.map(p => <article key={p.id} className={s.row}><h3>{p.name}</h3><span className={s.pill}>{p.linkActive ? "Private link active" : "Access not active"}</span><p className={s.meta}>Approved wallet: {p.wallet || "Awaiting initial submission"}</p>{!readOnly && <div className={s.actions}><ActionButton busy={busy} disabled={busy} className={`${s.button} ${s.secondary}`} aria-label={`${p.linkActive ? "Replace private link" : "Create private link"} · ${p.name}`} onClick={() => { if(!p.linkActive || window.confirm("Replace this link? The previous link and its active access will stop working.")) void run({ action: "issue-link", profileId: p.id }); }}>{p.linkActive ? "Replace private link" : "Create private link"}</ActionButton>{p.linkActive && <ActionButton busy={busy} aria-label={`Revoke access · ${p.name}`} disabled={busy} className={`${s.button} ${s.danger}`} onClick={() => { if(window.confirm("Revoke this private link? The contractor will immediately lose access. Existing invoices and approved recipients are preserved.")) void run({ action: "revoke-link", profileId: p.id }); }}>Revoke access</ActionButton>}</div>}
{!readOnly && !persistent && <ContractorLifecycleActions profile={p} busy={busy} onRename={value => void run({ action: "update-contractor", profileId: p.id, name: value })} onArchive={() => { if (window.confirm(`Archive ${p.name}? The contractor leaves your active list and loses portal access. Their invoices and payment history are preserved.`)) void run({ action: "archive-contractor", profileId: p.id }); }} onRestore={() => { if (window.confirm(`Restore ${p.name}? The contractor returns to your active list. No financial record changes.`)) void run({ action: "restore-contractor", profileId: p.id }); }} onDelete={() => { if (window.confirm(`Delete ${p.name}? This will permanently remove the contractor profile and revoke associated portal access. Completed payment records and receipts are kept. This action cannot be undone.`)) void run({ action: "delete-contractor", profileId: p.id }); }}/>}
 {!readOnly && p.pendingWallet && <div className={s.notice}><strong>{p.wallet ? "Wallet change request" : "Initial wallet approval"}</strong><p className={s.meta}>{p.pendingWallet.account}</p><p className={s.small}>{persistent ? "Signed wallet control verified; current on-chain key is rechecked at approval." : "Simulated verification only."} Approval affects future work orders; existing recipients stay fixed.</p><div className={s.actions}><ActionButton busy={busy} aria-label={`Approve wallet · ${p.name}`} disabled={busy} className={s.button} onClick={() => run({ action: "approve-wallet", profileId: p.id, requestId: p.pendingWallet!.id })}>Approve wallet</ActionButton><ActionButton busy={busy} aria-label={`Reject wallet · ${p.name}`} disabled={busy} className={`${s.button} ${s.secondary}`} onClick={() => run({ action: "reject-wallet", profileId: p.id, requestId: p.pendingWallet!.id })}>Reject wallet</ActionButton></div></div>}
 
 <a className={s.link} href="#Contractors" onClick={event=>{event.preventDefault();if(onViewBills){onViewBills(p.id);}else{setBillProfile(p.id);document.getElementById("contractor-bills")?.focus();}}}>View bills for {p.name}</a>
 {!readOnly && p.wallet && <details className="reference-disclosure"><summary>Billing agreement for optional bills</summary><p className={s.small}>Bills can be submitted without an agreement. Add one only when it is useful.</p><form onSubmit={e => { e.preventDefault(); const f = orders[p.id]; if (f)
                void run({ action: "create-order", profileId: p.id, ...f }); }}><label>Work order reference<input aria-label={`Work order reference · ${p.name}`} required value={orders[p.id]?.reference || ""} onChange={e => setOrders({ ...orders, [p.id]: { ...orders[p.id], reference: e.target.value } })}/></label><label>Work description<input aria-label={`Work description · ${p.name}`} required value={orders[p.id]?.title || ""} onChange={e => setOrders({ ...orders, [p.id]: { ...orders[p.id], title: e.target.value } })}/></label><label>Exact amount (NEAR)<input inputMode="decimal" aria-label={`Amount · ${p.name}`} required value={orders[p.id]?.amount || ""} onChange={e => setOrders({ ...orders, [p.id]: { ...orders[p.id], amount: e.target.value } })}/></label><div className={s.actions}><ActionButton busy={busy} aria-label={`Approve work order · ${p.name}`} className={s.button} disabled={busy}>Save billing agreement</ActionButton></div></form></details>}</article>)}
{matched.length > shown.length && <div className={s.actions}><button type="button" className={`${s.button} ${s.secondary}`} onClick={() => setVisible(v => v + 25)}>Show {Math.min(25, matched.length - shown.length)} more of {matched.length}</button></div>}
{matchedArchived.length > 0 && <details className="reference-disclosure" open={contractorStatus === "archived" || search.trim() !== "" || undefined}><summary>Archived contractors <span className={s.count}>{matchedArchived.length}</span></summary><p className={s.small}>Archived contractors keep every invoice, payment record and receipt. Their portal access is revoked and they no longer appear in the active list.</p>{matchedArchived.map(p => <article key={p.id} className={s.row}><h3>{p.name}</h3><span className={s.pill}>Archived</span><p className={s.meta}>Archived {p.archivedAt ? new Date(p.archivedAt).toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric"}) : ""}</p><div className={s.actions}>{!readOnly && <ActionButton busy={busy} className={`${s.button} ${s.secondary}`} aria-label={`Restore contractor · ${p.name}`} disabled={busy} onClick={() => { if (window.confirm(`Restore ${p.name}? The contractor returns to your active list. No financial record changes.`)) void run({ action: "restore-contractor", profileId: p.id }); }}>Restore contractor</ActionButton>}</div></article>)}</details>}
{(snapshot.events?.length ?? 0) > 0 && <details className="reference-disclosure"><summary>Contractor activity log</summary>{snapshot.events!.slice(0, 50).map(e => <p key={e.id} className={s.small}>{e.profileName} · {e.action} · {new Date(e.at).toLocaleString("en-GB", {day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})} · {e.detail}</p>)}</details>}
 </section>}<div><details className={s.card}><summary>Saved billing agreements</summary>{snapshot.orders.length > 0 && <><RecordSearch label="Search work orders" query={agreementSearch} onQuery={setAgreementSearch} onReset={agreementSearch ? () => setAgreementSearch("") : undefined}/><p className="record-count" role="status">{ordersShown.length} of {snapshot.orders.length} work orders</p></>}{ordersShown.length === 0 ? <p className={s.empty}>{snapshot.orders.length ? "No work orders match this search." : "Approve a wallet before creating a work order."}</p> : ordersShown.map(o => <div key={o.id} className={s.row}><h3>{o.reference} · {o.title}</h3><p>{o.amount} NEAR</p><p className={s.meta}>Immutable recipient: {o.recipient}</p></div>)}</details>{!onViewBills && reviewPanel}</div></div>}</>}
 </PortalShell>;
}

// The contextual action menu on a contractor card. Destructive actions always
// name the contractor and state the consequence before they run.
export function ContractorLifecycleActions({profile, busy, onRename, onArchive, onRestore, onDelete}:{
  profile: ContractorProfile; busy: boolean;
  onRename: (name: string) => void; onArchive: () => void; onRestore: () => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile.name);
  useEffect(() => { setDraft(profile.name); }, [profile.name]);
  return <details className="reference-disclosure">
    <summary>Contractor actions</summary>
    {!editing ? <>
      <div className={s.actions}>
        <button type="button" className={`${s.button} ${s.secondary}`} disabled={busy} onClick={() => { setDraft(profile.name); setEditing(true); }}>Edit contractor</button>
        {profile.archived
          ? <button type="button" className={`${s.button} ${s.secondary}`} disabled={busy} onClick={onRestore}>Restore contractor</button>
          : <button type="button" className={`${s.button} ${s.secondary}`} disabled={busy} onClick={onArchive}>Archive contractor</button>}
      </div>
      {!profile.archived && <>
        <p className={s.small}>{profile.deletable
          ? "This contractor has no invoices, work orders, attachments or active portal access, so the profile can be removed permanently. Completed payment records and receipts keep their contractor attribution and are never removed."
          : "This contractor still has linked records, so deletion is not available. Archive it instead: every invoice, payment record and receipt is preserved."}</p>
        <div className={s.actions}>
          <button type="button" className={`${s.button} ${s.danger}`} disabled={busy || !profile.deletable} onClick={onDelete}>Delete contractor</button>
        </div>
      </>}
      {profile.archived && <p className={s.small}>This contractor is archived. Their invoices and payment history are preserved and stay inspectable.</p>}
    </> : <form onSubmit={e => { e.preventDefault(); if (draft.trim()) { onRename(draft.trim()); setEditing(false); } }}>
      <label htmlFor={`contractor-name-${profile.id}`}>Contractor name</label>
      <input id={`contractor-name-${profile.id}`} required maxLength={80} value={draft} onChange={e => setDraft(e.target.value)}/>
      <div className={s.actions}>
        <button className={s.button} disabled={busy}>Save contractor</button>
        <button type="button" className={`${s.button} ${s.secondary}`} disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </form>}
  </details>;
}