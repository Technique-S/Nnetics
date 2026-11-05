"use client";
import {ViewMetadata} from "./view-metadata";
import {getUserMessage} from "../data/user-message";
import {ActionButton} from "./action-button";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MockOwnerAdapter } from "../data/mock-adapter";
import { NearOwnerAdapter, LiveApiError } from "../data/near-adapter";
import { LiveContextChanged } from "../data/config-context";
import { DemoContractorWorkspace, PersistentContractorOwner } from "./contractor-owner";
import { DashboardNavigation, workspaceView, type View } from "./dashboard-navigation";
import { AppearanceControl } from "./appearance-control";
import { OperationFeedback } from "./operation-feedback";
import { LoadingSkeleton } from "./loading-skeleton";
import { Onboarding } from "./onboarding";
import { TestnetControls } from "./testnet-controls";
import { OwnerTransactionReview } from "./owner-transaction-review";
import { paymentDisplayStatus } from "../data/payment-status";
import { formatNear, type OwnerAdapter, type OwnerSnapshot, type TransferScenario } from "../data/owner-adapter";

const iconPaths: Record<string, string> = {
  Overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  Vendors:
    "M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  "Work orders": "M9 3h6v4H9z M9 5H5v16h14V5h-4 M8 12h8 M8 16h6",
  "Invoice review": "M7 3h10l3 3v15l-4-2-4 2-4-2-4 2V6z M8 9h8 M8 13h5",
  "Payment history": "M3 12a9 9 0 1 0 3-6 M3 3v6h6 M12 7v5l3 2",
  shield: "M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z M8 12l3 3 5-6",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  plus: "M12 5v14 M5 12h14",
  pause: "M8 5v14 M16 5v14",
  check: "M5 12l4 4L19 6",
  refresh: "M20 7a9 9 0 1 0 1 8 M20 2v6h-6",
  close: "M6 6l12 12 M18 6L6 18",
};
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[name] ?? iconPaths.shield} />
    </svg>
  );
}
function Badge({ status }: { status: string }) {
  const tone = ["Paid", "Active", "Approved", "Ready to simulate"].includes(
    status,
  )
    ? "green"
    : ["Pending", "Needs review", "Paused"].includes(status)
      ? "amber"
      : ["Failed", "Revoked", "Disabled"].includes(status)
        ? "red"
        : "neutral";
  return (
    <span className={"badge " + tone} data-status={status}>
      {status === "Paid" ? <Icon name="check" size={14}/> : <span className="status-dot" aria-hidden="true" />}
      {status}
    </span>
  );
}
const date = (ns: string) =>
  new Date(Number(BigInt(ns) / 1_000_000n)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
function Amount({ value, large = false }: { value: string; large?: boolean }) {
  return (
    <span className={large ? "amount large" : "amount"}>
      {formatNear(value)} <span>NEAR</span>
    </span>
  );
}
export default function OwnerDashboard() {
  return (
    <Onboarding
      renderDashboard={(adapter, name, accountActions) => <Dashboard adapter={adapter} organizationName={name} accountActions={accountActions}/>}
    />
  );
}

function Dashboard({ adapter, organizationName, accountActions }: { adapter: OwnerAdapter; organizationName?: string; accountActions?:ReactNode }) {
  const live = adapter instanceof NearOwnerAdapter ? adapter : null;

  const [snapshot, setSnapshot] = useState<OwnerSnapshot | null>(null);
  const [view, setView] = useState<View>("Vault");
  const [receipt, setReceipt] = useState("");
  const [busy, setBusy] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [scenario, setScenario] = useState<TransferScenario>("success");
  const [historyFilter, setHistoryFilter] = useState("All outcomes");
  const contextInvalid=useRef(false);
  const dashboardGeneration=useRef(0);
  const refreshing=useRef(false), inFlight=useRef(new Set<string>());
  const autoRefreshBlocked=useRef(false);
  const [loading,setLoading]=useState(true);
  async function refresh() {
    if(refreshing.current || contextInvalid.current)return;
    const generation=dashboardGeneration.current;
    refreshing.current=true;setLoading(true);setError(null);
    try {
      const next = await adapter.snapshot();
      if(contextInvalid.current || generation!==dashboardGeneration.current)return;
      autoRefreshBlocked.current=false;
      setSnapshot((old) =>
        !old || next.revision >= old.revision ? next : old,
      );
    } catch (e) {
      if(contextInvalid.current || generation!==dashboardGeneration.current)return;
      autoRefreshBlocked.current=true;
      if(live && !(e instanceof LiveApiError && e.retryable)){setSnapshot(null);setReceipt("");}
      if(e instanceof LiveContextChanged)contextInvalid.current=true;
      setError(
        e instanceof Error ? e.message : "Unable to load the simulation.",
      );
    } finally { if(generation===dashboardGeneration.current){refreshing.current=false;if(!contextInvalid.current)setLoading(false);} }
  }
  useEffect(() => {
    dashboardGeneration.current++;refreshing.current=false;
    contextInvalid.current=false;live?.activate();
    void refresh();
    const unsubscribe=adapter.subscribe(() => {
      if(!autoRefreshBlocked.current)void refresh();
    });
    return ()=>{dashboardGeneration.current++;contextInvalid.current=true;live?.cancel();unsubscribe();};
  }, [adapter]); // Adapter is fixed for this session.
  async function run(
    key: string,
    action: () => Promise<void>,
    message?: string,
  ) {
    if(inFlight.current.size || contextInvalid.current)return;
    inFlight.current.add(key);
    setError(null);
    setBusy((old) => [...old, key]);
    try {
      await action();
      if(contextInvalid.current)return;
      await refresh();
      if(contextInvalid.current)return;
      if (message) setNotice(message);
    } catch (e) {
      if(contextInvalid.current)return;
      setError(
        e instanceof Error ? e.message : "The simulated request failed.",
      );
    } finally {
      inFlight.current.delete(key);
      if(!contextInvalid.current)setBusy((old) => old.filter((x) => x !== key));
    }
  }
  function go(next: View, receiptId?: string) {
    location.hash = receiptId ? `Receipts/${encodeURIComponent(receiptId)}` : next;
    setView(next);
    setReceipt(receiptId ?? "");
    setError(null);
  }
  useEffect(() => {
    function restore() {
      const target = workspaceView(location.hash);
      setView(target.view);
      setReceipt(target.receipt);
    }
    restore();
    window.addEventListener("hashchange", restore);
    return () => window.removeEventListener("hashchange", restore);
  }, []);
  useEffect(() => {
    if (view === "Receipts" && receipt) document.getElementById(`receipt-${receipt}`)?.focus();
  }, [view, receipt, snapshot]);
  const MainSurface = "main";
  if (!snapshot)
    return (
      <main className="loading-page">
        <div className="brand-mark">N</div>
        <h1>Opening your payment desk</h1>
        <p>
          {adapter.mode === "simulation"
            ? "Loading clearly labeled synthetic data…"
            : "Loading verified NEAR testnet records…"}
        </p>
        <OperationFeedback active={loading} message="Loading verified workspace records…" />
        {!error && <LoadingSkeleton />}
        {error && (
          <>
            <p role="alert">{getUserMessage(error)}</p>
            <ActionButton busy={busy.length>0} className="button primary" disabled={loading} onClick={() => void refresh()}>
              Retry loading
            </ActionButton>
          </>
        )}
      </main>
    );
  const s = snapshot;
  const vault = s.vault;
  const readOnly = !!live && s.access?.role !== "owner";
  const available = BigInt(vault.funded) - BigInt(vault.spent) - BigInt(vault.reserved);
  const outstanding = s.payments.filter(p => paymentDisplayStatus(s,p) === "Pending");
  const confirmed = s.payments.filter(p => paymentDisplayStatus(s,p) === "Paid");
  const ordered = [...s.payments].sort((a,b) => BigInt(a.initiated_at_ns) < BigInt(b.initiated_at_ns) ? 1 : -1);
  const subtitles: Record<View,string> = {
    Vault: "Check your available funds, payment limits and anything that needs your attention.",
    Contractors: "Invite people, verify their payout wallets and prepare payments.",
    Receipts: "Find proof of completed transfers and copy a receipt when you need it.",
    History: "Track outstanding, failed and confirmed payments in one place.",
    Settings: "Manage workspace access and choose how Nnetics looks.",
  };
  const demo = adapter instanceof MockOwnerAdapter ? adapter : null;
  function details(p: OwnerSnapshot["payments"][number]) {
    const order = s.orders.find(o => o.id === p.order_id);
    const invoice = s.invoices.find(i => i.id === p.invoice_id);
    const vendor = s.vendors.find(v => v.id === order?.vendor_id);
    const description = invoice?.text || (order?.title !== p.order_id ? order?.title : "");
    const url = live && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(p.reference)
      ? `https://testnet.nearblocks.io/txns/${encodeURIComponent(p.reference)}` : null;
    return {contractor: demo?.contractorName(p.invoice_id) ?? (vendor?.name && vendor.name !== vendor.id ? vendor.name : p.recipient), description, url};
  }
  const recoveryNeeded = !readOnly && (s.payments.some(p => ["Pending","TransferSucceeded","TransferFailed"].includes(p.status)));
  const ownerScope = live?.config.ownerTransactionRestriction;
  const pauseReview = ownerScope?.method === "set_paused" && typeof ownerScope.args?.paused === "boolean" ? ownerScope.args.paused : null;
  return (
    <div className="app-shell">
      {live && <OwnerTransactionReview adapter={live}/>}
      <ViewMetadata name={view}/>
      <a className="skip-link" href="#workspace-content">Skip to content</a>
      <DashboardNavigation view={view} onNavigate={go} live={!!live} organization={organizationName || s.access?.organization || "Demo workspace"}/>
      <div className="workspace-main">
        <header className={live ? "topbar" : "topbar demo-workspace-toolbar"}>
          {!live && <span>Simulation · No funds move</span>}
          <div className="topbar-actions">
            {!live && <details className="account-menu"><summary>Demo account</summary><div className="account-menu-actions"><AppearanceControl inline/></div></details>}
            <ActionButton className="icon-button" aria-label="Refresh workspace" busy={loading} onClick={() => void refresh()}><Icon name="refresh" size={18}/></ActionButton>
          </div>
        </header>
        <MainSurface className="main-content" id="workspace-content" tabIndex={-1}>
          <div className="page-heading">
            <div><h1>{view}</h1><p>{subtitles[view]}</p></div>
            {view === "Vault" && !readOnly && <button className="button primary" onClick={() => go("Contractors")}><Icon name="plus" size={16}/>Add contractor</button>}
          </div>
          <OperationFeedback active={loading || busy.length > 0} message="Checking workspace records…"/>
          {error && <div className="error-banner" role="alert">{getUserMessage(error)} <button onClick={() => void refresh()}>Retry refresh</button></div>}
          {notice && <div className="notice" role="status">{notice} <button className="text-button" onClick={() => setNotice("")}>Dismiss</button></div>}
          {view === "Vault" && <>
            <section className="panel payment-workspace-panel">
              <h2>Available payout funds</h2>
              <p className="payment-workspace-amount"><Amount value={available > 0n ? available.toString() : "0"} large/></p>
              <p>{formatNear(vault.reserved)} NEAR set aside for pending payments.</p>
              {vault.paused && <p><Badge status="Paused"/> New payments cannot be sent while the vault is paused.</p>}
              {!vault.agent && <p>Automatic payments are off.</p>}
              {outstanding.length > 0 && <button className="text-button" onClick={() => go("History")}>Check {outstanding.length} outstanding {outstanding.length === 1 ? "payment" : "payments"}</button>}
            </section>
            {live ? <TestnetControls adapter={live} snapshot={s} run={run} section="vault"/> : <section className="panel payment-workspace-panel"><h2>Payment limits</h2><p>{formatNear(vault.payment_cap)} NEAR per payment · {formatNear(vault.budget)} NEAR total</p><p>Funding is unavailable in the simulation.</p></section>}
            {live && !readOnly && live.config.ownerTransactionsEnabled && pauseReview !== null &&
              <ActionButton className="button secondary" busy={busy.length>0} onClick={()=>void run("pause",()=>live.command({method:"set_paused",args:{paused:pauseReview}}))}>{pauseReview ? "Review pause in wallet" : "Review unpause in wallet"}</ActionButton>}
            {live && !readOnly && live.config.ownerTransactionsEnabled && ownerScope?.method === "revoke_agent" &&
              <ActionButton className="button secondary" busy={busy.length>0} onClick={()=>void run("revoke",()=>live.command({method:"revoke_agent",args:{}}))}>Review turning off automatic payments</ActionButton>}
          </>}
          {view === "Contractors" && (live
            ? <PersistentContractorOwner embedded organization={s.access?.organization || live.config.organization} readOnly={readOnly} limit={vault.payment_cap}/>
            : <DemoContractorWorkspace onPay={demo ? async (draft) => {await demo.payContractor(draft,scenario);await refresh();} : undefined}/>)}
          {view === "Receipts" && <section className="panel payment-workspace-panel" aria-label="Confirmed receipts">
            {confirmed.length === 0 && <p className="empty">Receipts appear here after payment is confirmed.</p>}
            {ordered.filter(p => confirmed.includes(p)).map(p => {
              const info = details(p);
              const summary = [info.contractor, `${formatNear(p.amount)} NEAR`, date(p.initiated_at_ns), info.description, info.url].filter(Boolean).join("\n");
              return <article className="payment-record" key={p.attempt_id} id={`receipt-${p.attempt_id}`} tabIndex={-1}>
                <div><h2>{info.contractor}</h2><p>{date(p.initiated_at_ns)} · {live ? "Payment initiated" : "Simulated receipt"} · {p.invoice_id}</p>{info.description && <p className="payment-record-description">{info.description}</p>}</div>
                <div className="payment-record-actions"><Amount value={p.amount}/><Badge status="Paid"/>
                  {info.url && <a href={info.url} target="_blank" rel="noreferrer">View transaction</a>}
                  <button className="text-button" onClick={async () => {try{await navigator.clipboard.writeText(summary);setNotice("Receipt copied.");}catch{setNotice("Clipboard unavailable. Select the receipt details to copy them.");}}}>Copy receipt</button>
                </div>
              </article>;
            })}
          </section>}
          {view === "History" && <>
            <section className="panel payment-workspace-panel" aria-label="Payment attempts">
              <label className="filter-label">Outcome<select aria-label="Filter payment outcomes" value={historyFilter} onChange={e => setHistoryFilter(e.target.value)}>
                {["All outcomes","Pending","Paid","Failed"].map(status => <option key={status}>{status}</option>)}
              </select></label>
              {ordered.filter(p => historyFilter === "All outcomes" || (["TransferSucceeded","TransferFailed"].includes(p.status) ? "Pending" : paymentDisplayStatus(s,p)) === historyFilter).map(p => {
                const info = details(p), status = paymentDisplayStatus(s,p);
                return <article className="payment-record" key={p.attempt_id}>
                  <div><h2>{info.contractor}</h2><p>{date(p.initiated_at_ns)} · {p.invoice_id}</p>{status === "Pending" && <p>Awaiting confirmation. Do not send this payment again.</p>}{["TransferSucceeded","TransferFailed"].includes(status) && <p>The transfer result is recorded. Final accounting is pending.</p>}</div>
                  <div className="payment-record-actions"><Amount value={p.amount}/><Badge status={["TransferSucceeded","TransferFailed"].includes(status)?"Pending":status}/>{status === "Paid" && <a href={`#Receipts/${encodeURIComponent(p.attempt_id)}`} onClick={e=>{e.preventDefault();go("Receipts",p.attempt_id);}}>View receipt</a>}{status !== "Paid" && info.url && <a href={info.url} target="_blank" rel="noreferrer">View transaction</a>}</div>
                </article>;
              })}
              {s.queue?.filter(job => !s.payments.some(p => p.invoice_id === job.id) && (historyFilter === "All outcomes" || (job.state === "failed" ? "Failed" : "Pending") === historyFilter)).map(job => <article key={job.id} className="payment-record"><div><h2>{job.id}</h2><p>{job.state === "review" ? "Awaiting authorization" : job.state === "failed" ? "Payment failed" : "Outstanding. Check the existing attempt before taking action."}</p></div><Badge status={job.state === "failed" ? "Failed" : "Pending"}/></article>)}
              {!s.payments.length && !s.queue?.length && <p className="empty">Payment attempts will appear here.</p>}
            </section>
            {live && recoveryNeeded && <details className="reference-disclosure"><summary>Check unresolved payments</summary><TestnetControls adapter={live} snapshot={s} run={run} section="recovery"/></details>}
          </>}
          {view === "Settings" && <>
            {live && <section className="panel payment-workspace-panel"><h2>Account and wallet</h2><p>Signed in as {s.access?.accountId}</p><div className="actions">{accountActions}</div></section>}
            <section className="panel payment-workspace-panel"><h2>Appearance</h2><p>Use the same preference across the workspace and account menu.</p><AppearanceControl inline/></section>
            {live && <TestnetControls adapter={live} snapshot={s} run={run} section="access"/>}
            {live && <details className="reference-disclosure"><summary>Advanced settings</summary><TestnetControls adapter={live} snapshot={s} run={run} section="references"/>{ownerScope?.method==="advance_repair_head"&&<TestnetControls adapter={live} snapshot={s} run={run} section="recovery"/>}</details>}
            {demo && <section className="panel payment-workspace-panel"><h2>Simulation controls</h2><label>Next transfer outcome<select aria-label="Next simulated transfer outcome" value={scenario} onChange={e => setScenario(e.target.value as TransferScenario)}><option value="success">Confirmed success</option><option value="failure">Confirmed failure</option><option value="unknown">Unknown outcome</option></select></label></section>}
          </>}
        </MainSurface>
      </div>
    </div>
  );
}
