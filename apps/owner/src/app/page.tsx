"use client";
import {ViewMetadata} from "./view-metadata";
import {getUserMessage} from "../data/user-message";
import {ActionButton} from "./action-button";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MockOwnerAdapter } from "../data/mock-adapter";
import { NearOwnerAdapter, LiveApiError } from "../data/near-adapter";
import { DemoWorkspaceAdapter } from "../data/demo-workspace-adapter";
import { MockContractorOwnerAdapter } from "../data/contractor-adapter";
import { DEMO_FEE } from "../data/demo-constants";
import { LiveContextChanged } from "../data/config-context";
import { DemoContractorWorkspace, PersistentContractorOwner, type DemoAssistantIntent } from "./contractor-owner";
import { AskNnetics, type AssistantAction } from "./ask-nnetics";
import { DashboardNavigation, workspaceView, type View } from "./dashboard-navigation";
import { AppearanceControl } from "./appearance-control";
import { OperationFeedback } from "./operation-feedback";
import { LoadingSkeleton } from "./loading-skeleton";
import { Onboarding } from "./onboarding";
import { TestnetControls } from "./testnet-controls";
import { OwnerTransactionReview } from "./owner-transaction-review";
import { paymentDisplayStatus } from "../data/payment-status";
import { formatNear, amountFromNear, type OwnerAdapter, type OwnerSnapshot, type TransferScenario } from "../data/owner-adapter";

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
// Siohioma right-rail donut: paid/pending/failed shares of the demo ledger.
function StatusDonut({paid, pending, failed}: {paid: number; pending: number; failed: number}) {
  const total = paid + pending + failed;
  const segments: Array<[number, string, string]> = [
    [paid, "var(--action)", "paid"],
    [pending, "var(--warning)", "pending"],
    [failed, "var(--danger)", "failed"],
  ];
  let offset = 25; // start at 12 o'clock, sweep clockwise
  return (
    <svg viewBox="0 0 36 36" className="payment-status-donut" role="img" aria-label={`Paid ${paid}, pending ${pending}, failed ${failed}`}>
      <circle className="payment-status-track" cx="18" cy="18" r="15.9" fill="none" strokeWidth="4.2"/>
      {segments.map(([len, color, key]) => {
        if (!len) return null;
        const frac = len / total * 100;
        const el = (
          <circle key={key} cx="18" cy="18" r="15.9" fill="none" pathLength={100} stroke={color} strokeWidth="4.2"
            strokeDasharray={`${Math.max(frac - .4, .01)} ${100 - Math.max(frac - .4, .01)}`}
            strokeDashoffset={offset}/>
        );
        offset -= frac;
        return el;
      })}
    </svg>
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
  const demoWs = adapter instanceof DemoWorkspaceAdapter ? adapter : null;

  const [snapshot, setSnapshot] = useState<OwnerSnapshot | null>(null);
  const [view, setView] = useState<View>(() => (adapter instanceof DemoWorkspaceAdapter ? "Overview" : "Vault"));
  const [receipt, setReceipt] = useState("");
  const [busy, setBusy] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [scenario, setScenario] = useState<TransferScenario>("success");
  const [intent, setIntent] = useState<DemoAssistantIntent | null>(null);
  const [contractorRevision, setContractorRevision] = useState(0);
  const [assistantConfigured, setAssistantConfigured] = useState<boolean | null>(null);
  const [assistantModel, setAssistantModel] = useState<string | null>(null);
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
  // Demo assistant status is fetched server-side only; it never exposes a key.
  useEffect(() => {
    if (!demoWs) return;
    void demoWs.assistantStatus().then(s => { setAssistantConfigured(s.configured); setAssistantModel(s.model); }).catch(() => { setAssistantConfigured(false); setAssistantModel(null); });
  }, [demoWs]);
  // The demo workspace and the contractor owner portal are separate sessions.
  // Open the owner portal with the dashboard so Ask Nnetics can create and read
  // contractors before the user has visited the Contractors tab.
  useEffect(() => {
    if (!demoWs) return;
    void new MockContractorOwnerAdapter().start().catch(() => {});
  }, [demoWs]);
  // Demo settlements are lazy: the next state check settles due payments, so
  // a pending record refreshes itself once, ~1.5s later, without polling loops.
  const hasPendingPayments = !!snapshot && snapshot.payments.some(p => p.status === "Pending");
  useEffect(() => {
    if (!demoWs || !hasPendingPayments) return;
    const timer = setTimeout(() => { void refresh(); }, 1600);
    return () => clearTimeout(timer);
  }, [demoWs, hasPendingPayments, snapshot?.revision]); // eslint-disable-line react-hooks/exhaustive-deps
  // Ask Nnetics actions run through the same UI commands a manual visit would.
  function handleAssistantAction(action: AssistantAction) {
    if (action.kind === "create-contractor") {
      // The agent already persisted the record; remount the contractor panel so
      // its snapshot reflects the new contractor instead of prefilling a duplicate.
      setContractorRevision(n => n + 1);
      go("Contractors");
    } else if (action.kind === "prepare-payment-draft") {
      setIntent({ draft: { contractor: action.contractor, amount: action.amount, description: action.description } });
      go("Contractors");
    } else if (action.kind === "find-receipt") {
      const found = action.reference ? snapshot?.payments.find(p => p.reference === action.reference) : undefined;
      if (found?.status === "Paid") go("Receipts", found.attempt_id);
      else go("History");
    } else if (
      action.kind === "list-contractors" ||
      action.kind === "get-contractor" ||
      action.kind === "update-contractor" ||
      action.kind === "get-contractor-invoices" ||
      action.kind === "list-invoices" ||
      action.kind === "get-invoice" ||
      action.kind === "get-pending-invoices" ||
      action.kind === "get-overdue-invoices"
    ) {
      // Contractor and invoice records live in the contractor panel, including
      // invoices. There is no separate invoice destination.
      go("Contractors");
    } else if (
      action.kind === "get-vault-balance" ||
      action.kind === "get-vault-status" ||
      action.kind === "get-vault-available-balance" ||
      action.kind === "get-vault-transaction-history"
    ) {
      go("Vault");
    } else if (action.kind === "get-organization-overview" || action.kind === "get-organization-statistics") {
      go("Overview");
    } else {
      // summarize-outstanding: approved, unpaid bills live in the contractor panel.
      go("Contractors");
    }
  }
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
      if (demoWs && !location.hash.replace(/^#/, "").trim())
        setView("Overview");
      else setView(target.view);
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
            : "Loading verified NEAR network records…"}
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
  // A fresh demo visitor starts from a deliberately blank workspace: the owner
  // profile and vault are created in one labelled walkthrough, then every tab
  // behaves like the standard dashboard on simulated funds.
  if (demoWs && !demoWs.demo()?.initialized)
    return <div className="app-shell demo-shell demo-setup-shell"><ViewMetadata name="Vault"/><a className="skip-link" href="#workspace-content">Skip to content</a>
      <main className="main-content demo-setup" id="workspace-content" tabIndex={-1}>
        <div className="page-heading"><div><h1>Try the Nnetics demo</h1><p>No account, wallet, keys or tokens needed. Everything below is simulated.</p></div></div>
        <DemoWorkspaceSetup busy={busy.length > 0} flowError={error} onCreate={async (profileName, vaultName) => {
          await run("demo-create", async () => { await demoWs.createWorkspace(profileName, vaultName); }, "Demo workspace created. Your vault is ready.");
        }}/>
      </main>
    </div>;
  const readOnly = !!live && s.access?.role !== "owner";
  const available = BigInt(vault.funded) - BigInt(vault.spent) - BigInt(vault.reserved);
  const outstanding = s.payments.filter(p => paymentDisplayStatus(s,p) === "Pending");
  const confirmed = s.payments.filter(p => paymentDisplayStatus(s,p) === "Paid");
  const ordered = [...s.payments].sort((a,b) => BigInt(a.initiated_at_ns) < BigInt(b.initiated_at_ns) ? 1 : -1);
  const subtitles: Record<View,string> = {
    Overview: "Your demo vault, payouts and next steps at a glance.",
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
    return {contractor: demo?.contractorName(p.invoice_id) ?? demoWs?.contractorName(p.invoice_id) ?? (vendor?.name && vendor.name !== vendor.id ? vendor.name : p.recipient), description, url};
  }
  const recoveryNeeded = !readOnly && (s.payments.some(p => ["Pending","TransferSucceeded","TransferFailed"].includes(p.status)));
  const failedPayments = s.payments.filter(p => paymentDisplayStatus(s, p) === "Failed");
  const needsAttentionItems = s.payments.filter(p => {
    const status = paymentDisplayStatus(s, p);
    return status === "Pending" || status === "Failed";
  });
  const totalPaid = confirmed.reduce((sum, payment) => sum + BigInt(payment.amount), 0n);
  const nextAction = available <= 0n
    ? { label: "Fund vault", view: "Vault" as View, detail: "Add simulated funds before paying a contractor." }
    : s.payments.length === 0
      ? { label: "Add contractor", view: "Contractors" as View, detail: "Invite a contractor and prepare the first payment." }
      : needsAttentionItems.length > 0
        ? { label: "Review outstanding", view: "History" as View, detail: "Check pending and failed payment records." }
        : { label: "Add contractor", view: "Contractors" as View, detail: "Keep your contractor list up to date." };
  const ownerScope = live?.config.ownerTransactionRestriction;
  const pauseReview = ownerScope?.method === "set_paused" && typeof ownerScope.args?.paused === "boolean" ? ownerScope.args.paused : null;
  return (
    <div className={demoWs ? "app-shell demo-shell" : "app-shell"}>
      {live && <OwnerTransactionReview adapter={live}/>}
      <ViewMetadata name={view}/>
      <a className="skip-link" href="#workspace-content">Skip to content</a>
      <DashboardNavigation view={view} onNavigate={go} live={!!live} organization={organizationName || s.access?.organization || "Demo workspace"} demo={!!demoWs}/>
      <div className="workspace-main">
        <header className={live ? "topbar" : "topbar demo-workspace-toolbar"}>
          {!live && <span>{demoWs ? "Demo · simulated funds · no wallets, keys or tokens involved" : "Simulation · No funds move"}</span>}
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
          {view === "Overview" && <>
            <div className="overview-grid">
              <section className="overview-card overview-balance">
                <h2>Available vault balance</h2>
                <p className="payment-workspace-amount"><Amount value={available > 0n ? available.toString() : "0"} large/></p>
                <p>{formatNear(vault.reserved)} NEAR set aside for pending payments.</p>
              </section>
              <section className="overview-card overview-next-action">
                <h2>Next action</h2>
                <p>{nextAction.detail}</p>
                <button className="button primary" onClick={() => go(nextAction.view)}>{nextAction.label}</button>
              </section>
              <section className={`overview-card overview-attention${demoWs ? ' overview-hero' : ''}`}>
                <h2>Needs attention</h2>
                {needsAttentionItems.length === 0
                  ? <p className="empty">No items need your attention.</p>
                  : <div className="overview-list">
                      {needsAttentionItems.slice(0, 6).map(p => {
                        const info = details(p);
                        const status = paymentDisplayStatus(s, p);
                        return <button key={p.attempt_id} className="overview-list-item" type="button" onClick={() => go(status === "Paid" ? "Receipts" : "History", status === "Paid" ? p.attempt_id : undefined)}>
                          <span>{info.contractor}</span>
                          <span>{formatNear(p.amount)} NEAR</span>
                          <Badge status={status === "Paid" ? "Paid" : (status === "Failed" ? "Failed" : "Pending")}/>
                        </button>;
                      })}
                    </div>}
              </section>
              <section className="overview-card overview-paid">
                <h2>Total paid</h2>
                <p className="payment-workspace-amount"><Amount value={totalPaid.toString()} large/></p>
                <p>{confirmed.length} confirmed {confirmed.length === 1 ? "payout" : "payouts"}.</p>
              </section>
              <section className="overview-card overview-rail-card">
                <h2>Payment status</h2>
                {demoWs ? (
                  <div className="payment-status-visual">
                    <StatusDonut paid={confirmed.length} pending={outstanding.length} failed={failedPayments.length}/>
                    <ul className="payment-status-legend">
                      <li><i className="payment-status-swatch" style={{background:"var(--action)"}} aria-hidden="true"/><span>Paid</span><strong>{confirmed.length}</strong></li>
                      <li><i className="payment-status-swatch" style={{background:"var(--warning)"}} aria-hidden="true"/><span>Pending</span><strong>{outstanding.length}</strong></li>
                      <li><i className="payment-status-swatch" style={{background:"var(--danger)"}} aria-hidden="true"/><span>Failed</span><strong>{failedPayments.length}</strong></li>
                    </ul>
                  </div>
                ) : (
                  <dl className="payment-draft-details">
                    <dt>Paid</dt><dd>{confirmed.length}</dd>
                    <dt>Pending</dt><dd>{outstanding.length}</dd>
                    <dt>Failed</dt><dd>{failedPayments.length}</dd>
                  </dl>
                )}
              </section>
              <section className="overview-card overview-activity">
                <h2>Recent activity</h2>
                {ordered.length === 0
                  ? <p className="empty">Activity appears here after you fund the vault or pay a contractor.</p>
                  : <div className="overview-list">
                      {ordered.slice(0, 8).map(p => {
                        const info = details(p);
                        const status = paymentDisplayStatus(s, p);
                        return <button key={p.attempt_id} className="overview-list-item" type="button" onClick={() => go(status === "Paid" ? "Receipts" : "History", status === "Paid" ? p.attempt_id : undefined)}>
                          <span>{info.contractor}</span>
                          <span>{formatNear(p.amount)} NEAR · {date(p.initiated_at_ns)}</span>
                          <Badge status={status === "Paid" ? "Paid" : (status === "Failed" ? "Failed" : "Pending")}/>
                        </button>;
                      })}
                    </div>}
              </section>
              <section className="overview-card overview-chart-card">
                <h2>Confirmed payouts over time</h2>
                {confirmed.length === 0
                  ? <p className="empty">Confirmed payouts will appear here over time.</p>
                  : (() => {
                      const buckets = new Map<string, bigint>();
                      [...confirmed].sort((a, b) => BigInt(a.initiated_at_ns) < BigInt(b.initiated_at_ns) ? -1 : 1).forEach(p => {
                        const key = date(p.initiated_at_ns);
                        buckets.set(key, (buckets.get(key) ?? 0n) + BigInt(p.amount));
                      });
                      const entries = [...buckets.entries()];
                      const max = entries.reduce((m, [, v]) => v > m ? v : m, 1n);
                      return <div className="overview-chart">
                        {entries.map(([label, value]) => (
                          <div key={label} className="overview-chart-bar">
                            <span className="overview-chart-value">{formatNear(value.toString())}</span>
                            <div className="overview-chart-track"><div className="overview-chart-fill" style={{width: `${Math.max(8, Number((value * 100n) / max))}%`}}/></div>
                            <span className="overview-chart-label">{label}</span>
                          </div>
                        ))}
                      </div>;
                    })()}
              </section>
            </div>
          </>}

          {view === "Vault" && <>
            <section className="panel payment-workspace-panel">
              <h2>Available payout funds</h2>
              <p className="payment-workspace-amount"><Amount value={available > 0n ? available.toString() : "0"} large/></p>
              <p>{formatNear(vault.reserved)} NEAR set aside for pending payments.</p>
              {vault.paused && <p><Badge status="Paused"/> New payments cannot be sent while the vault is paused.</p>}
              {!vault.agent && <p>Automatic payments are off.</p>}
              {outstanding.length > 0 && <button className="text-button" onClick={() => go("History")}>Check {outstanding.length} outstanding {outstanding.length === 1 ? "payment" : "payments"}</button>}
            </section>
            {live ? <TestnetControls adapter={live} snapshot={s} run={run} section="vault"/> : demoWs ? <DemoVaultCard demoWs={demoWs} run={run}/> : <section className="panel payment-workspace-panel"><h2>Payment limits</h2><p>{formatNear(vault.payment_cap)} NEAR per payment · {formatNear(vault.budget)} NEAR total</p><p>Funding is unavailable in the simulation.</p></section>}
            {live && !readOnly && live.config.ownerTransactionsEnabled && pauseReview !== null &&
              <ActionButton className="button secondary" busy={busy.length>0} onClick={()=>void run("pause",()=>live.command({method:"set_paused",args:{paused:pauseReview}}))}>{pauseReview ? "Review pause in wallet" : "Review unpause in wallet"}</ActionButton>}
            {live && !readOnly && live.config.ownerTransactionsEnabled && ownerScope?.method === "revoke_agent" &&
              <ActionButton className="button secondary" busy={busy.length>0} onClick={()=>void run("revoke",()=>live.command({method:"revoke_agent",args:{}}))}>Review turning off automatic payments</ActionButton>}
          </>}
          {view === "Contractors" && (live
            ? <PersistentContractorOwner embedded organization={s.access?.organization || live.config.organization} readOnly={readOnly} limit={vault.payment_cap}/>
            : <DemoContractorWorkspace
                key={contractorRevision}
                onPay={demoWs
                  ? async draft => { await run("demo-pay", () => demoWs.payContractor(draft)); }
                  : demo
                    ? async draft => { await run("demo-pay", async () => { await demo.payContractor(draft, scenario); await refresh(); }); }
                    : undefined}
                paymentFee={demoWs ? DEMO_FEE : undefined}
                intent={intent ?? undefined}/>)}
          {demoWs && intent && <button className="text-button" onClick={() => setIntent(null)}>Clear the prepared assistant step</button>}
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
            {demoWs && demoWs.demo() && demoWs.demo()!.history.some(h => h.kind === "funding") && <section className="panel payment-workspace-panel" aria-label="Demo Wallet funding">
              <h2>Demo Wallet funding · simulated funds</h2>
              {demoWs.demo()!.history.filter(h => h.kind === "funding").slice(0, 30).map(h => <article className="payment-record" key={h.id}><div><p>{h.label}</p><p className="payment-record-description">{new Date(h.at).toLocaleString("en-GB", {day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"})}</p></div><div className="payment-record-actions"><Badge status={h.status === "confirmed" ? "Active" : "Pending"}/><Amount value={amountFromNear(h.amount).toString()}/></div></article>)}
            </section>}
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
            {demoWs && <section className="panel payment-workspace-panel"><h2>Demo workspace controls</h2>
              <p>Demo · simulated funds. These controls change only this visitor's demo workspace.</p>
              <label>Simulated settlement outcome
                <select aria-label="Simulated settlement outcome" value={demoWs.demo()?.scenario ?? "success"} onChange={e => void run("demo-scenario", () => demoWs.setScenario(e.target.value === "failure" ? "failure" : "success"), e.target.value === "failure" ? "Set to failure: the next pending payments become failed demo records without debits. This is repeatable." : "Pending payments will settle as confirmed demo receipts from now on.")}>
                  <option value="success">Settlement succeeds</option>
                  <option value="failure">Settlement fails (dry record; repeatable)</option>
                </select>
              </label>
              <form onSubmit={e => {
                e.preventDefault();
                const raw = String(new FormData(e.currentTarget).get("limit") ?? "").trim();
                void run("demo-limit", () => demoWs.setLimit(raw), raw ? "Demo spending limit updated. Larger attempts decline as failed records." : "Demo spending limit cleared.");
              }}>
                <label>Demo spending limit per payment · NEAR
                  <input name="limit" inputMode="decimal" defaultValue={demoWs.demo()?.vault.limit ? formatNear(demoWs.demo()!.vault.limit) : ""} placeholder="e.g. 2 · leave empty for no limit"/>
                </label>
                <div className="actions">
                  <button className="button secondary">Save limit</button>
                  <button type="button" className="text-button" onClick={() => void run("demo-limit", () => demoWs.setLimit(""), "Demo spending limit cleared.")}>Clear limit</button>
                </div>
              </form>
              <p>Demo assistant: {assistantConfigured === null ? "checking configuration…" : assistantConfigured ? `model answers configured server-side (${assistantModel ?? "configured model"}) · the API key never enters the browser or logs` : "scripted demo answers are always available · no server model configured (set OPENROUTER_API_KEY and NNETICS_ASSISTANT_MODEL)"}</p>
              <div className="actions">
                <button className="button secondary" onClick={() => { if (window.confirm("Reset the demo workspace? This visitor's funding history, payments and receipts return to a blank walkthrough.")) void run("demo-reset", () => demoWs.resetWorkspace(), "Demo workspace reset. A fresh walkthrough can start."); }}>Reset demo workspace</button>
              </div>
            </section>}
          </>}
        </MainSurface>
      </div>
      {demoWs && <AskNnetics onAction={handleAssistantAction}/>}
    </div>
  );
}

function DemoWorkspaceSetup({busy, flowError, onCreate}: {busy: boolean; flowError: string | null; onCreate: (profileName: string, vaultName: string) => Promise<void>}) {
  const [profile, setProfile] = useState("");
  const [vault, setVault] = useState("");
  const [step, setStep] = useState(1);
  return <section className="panel payment-workspace-panel demo-setup-panel">
    <h2>Try the demo · no wallet, keys or tokens</h2>
    <p>This walkthrough needs no account and no blockchain request. Your browser session receives a private demo workspace with simulated funds; everything it produces is labelled Demo · simulated funds.</p>
    <ol className="demo-setup-steps">
      <li className={step >= 1 ? "current" : ""}>Owner profile</li>
      <li className={step >= 2 ? "current" : ""}>Demo vault</li>
      <li>Pay simulated invoices</li>
    </ol>
    {step === 1 ? <form onSubmit={e => { e.preventDefault(); setStep(2); }}>
      <label htmlFor="demo-owner-name">Owner name</label>
      <input id="demo-owner-name" value={profile} onChange={e => setProfile(e.target.value)} maxLength={80} required placeholder="e.g. Alex"/>
      <div className="actions"><button className="button primary" disabled={!profile.trim()}>Continue</button></div>
    </form> : <form onSubmit={e => { e.preventDefault(); if (!busy) void onCreate(profile.trim(), vault.trim()); }}>
      <label htmlFor="demo-vault-name">Vault name</label>
      <input id="demo-vault-name" value={vault} onChange={e => setVault(e.target.value)} maxLength={80} required placeholder="e.g. Team budget"/>
      <p>After this step the vault holds 0 simulated NEAR; fund it from the Demo Wallet card in the Vault tab.</p>
      <div className="actions">
        <button className="button primary" disabled={busy || !vault.trim()}>Create demo workspace</button>
        <button type="button" className="text-button" onClick={() => setStep(1)}>Back</button>
      </div>
    </form>}
    {flowError && <p role="alert">{flowError}</p>}
  </section>;
}

function DemoVaultCard({demoWs, run}: {demoWs: DemoWorkspaceAdapter; run: (key: string, action: () => Promise<void>, message?: string) => Promise<void>}) {
  const raw = demoWs.demo();
  return <section className="panel payment-workspace-panel">
    <h2>Demo Wallet · simulated funds</h2>
    <dl className="payment-draft-details">
      <dt>Available demo funds</dt><dd>{formatNear(raw?.vault.available ?? "0")} NEAR</dd>
      <dt>Funded so far</dt><dd>{formatNear(raw?.vault.funded ?? "0")} NEAR</dd>
      <dt>Spent in this walkthrough</dt><dd>{formatNear(raw?.vault.spent ?? "0")} NEAR</dd>
      <dt>Reserved for pending payments</dt><dd>{formatNear(raw?.vault.reserved ?? "0")} NEAR</dd>
      {raw?.vault.limit && <><dt>Demo spending limit</dt><dd>{formatNear(raw.vault.limit)} NEAR per payment · Settings can change it</dd></>}
    </dl>
    <form onSubmit={e => {
      e.preventDefault();
      const amount = String(new FormData(e.currentTarget).get("amount") ?? "").trim();
      if (!amount) return;
      void run("demo-fund", () => demoWs.fund(amount), `Funded the Demo Wallet with ${amount} NEAR (simulated funds). Funding can repeat freely.`);
      (e.target as HTMLFormElement).reset();
    }}>
      <label htmlFor="demo-fund-amount">Fund the Demo Wallet · NEAR</label>
      <div className="actions">
        <input id="demo-fund-amount" name="amount" inputMode="decimal" required placeholder="e.g. 5 · any positive exact amount"/>
        <button className="button primary">Fund vault</button>
      </div>
      <p>Demo wallet funding is simulated NEAR only; no blockchain, wallet or token is involved. Fundings stack, so repeat the amount any time.</p>
    </form>
    <div className="actions">
      <button className="button secondary" onClick={() => { if (window.confirm("Reset the demo workspace? This visitor's funding history, payments and receipts return to a blank walkthrough.")) void run("demo-reset", () => demoWs.resetWorkspace(), "Demo workspace reset. A fresh walkthrough can start."); }}>Reset demo workspace</button>
    </div>
  </section>;
}
