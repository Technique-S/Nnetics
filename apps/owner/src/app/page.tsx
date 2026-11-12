"use client";
import {DemoButton} from "../components/demo/demo-button";
import {DemoGrid, DemoCard, DemoActivity, DemoRecordFeed, DemoCount, DemoTyping, DemoEntryRays} from "../components/demo/demo-surfaces";

import {BrandMark, WorkspacePreview} from "./brand-mark";
import {ViewMetadata} from "./view-metadata";
import {getUserMessage} from "../data/user-message";
import {matchesRecords, RecordSearch} from "./record-search";
import {ActionButton} from "./action-button";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MockOwnerAdapter } from "../data/mock-adapter";
import { NearOwnerAdapter, LiveApiError } from "../data/near-adapter";
import { DemoWorkspaceAdapter } from "../data/demo-workspace-adapter";
import { MockContractorOwnerAdapter, PersistentContractorOwnerAdapter, type ContractorBill, type PortalSnapshot } from "../data/contractor-adapter";
import { DEMO_FEE } from "../data/demo-constants";
import { LiveContextChanged } from "../data/config-context";
import { DemoContractorWorkspace, PersistentContractorOwner, type DemoAssistantIntent } from "./contractor-owner";
import { AskNnetics, type AssistantAction } from "./ask-nnetics";
import { DashboardNavigation, workspaceView, receiptView, type View } from "./dashboard-navigation";
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
  const tone = ["Paid", "Active", "Approved", "Ready to simulate", "Funded"].includes(
    status,
  )
    ? "green"
    : ["Pending", "Needs review", "Paused", "Prepared", "In review", "Under review", "Needs clarification"].includes(status)
      ? "amber"
      : ["Failed", "Revoked", "Disabled", "Rejected"].includes(status)
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
const shortDate = (value: string | number) => new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const date = (ns: string) => shortDate(Number(BigInt(ns) / 1_000_000n));
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
  const [view, setView] = useState<View>(() => (adapter instanceof DemoWorkspaceAdapter ? "Overview" : "Vault & Controls"));
  const [receipt, setReceipt] = useState("");
  const [busy, setBusy] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [scenario, setScenario] = useState<TransferScenario>("success");
  const [intent, setIntent] = useState<DemoAssistantIntent | null>(null);
  const [contractorRevision, setContractorRevision] = useState(0);
  const [billingRefreshVersion,setBillingRefreshVersion]=useState(0);
  const [assistantConfigured, setAssistantConfigured] = useState<boolean | null>(null);
  const [assistantModel, setAssistantModel] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState("All outcomes");
  const [activitySearch, setActivitySearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [paymentSort, setPaymentSort] = useState("newest");
  const [activityFilter, setActivityFilter] = useState("All activity");
  const [invoiceContractor, setInvoiceContractor] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState("All invoices");
  const [portal, setPortal] = useState<PortalSnapshot | null>(null);
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
      setBillingRefreshVersion(version=>version+1);
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
    const changed=()=>{setContractorRevision(n=>n+1);void refresh();};
    window.addEventListener("nnetics-contractor-changed",changed);
    return ()=>window.removeEventListener("nnetics-contractor-changed",changed);
  });

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
  // The Invoices and Activity surfaces read the same portal records the
  // contractor panel uses, so there is one source of truth for a bill.
  useEffect(() => {
    if (view !== "Payables" && view !== "Activity" && view !== "Overview") return;
    const source = live
      ? new PersistentContractorOwnerAdapter(live.config.organization)
      : new MockContractorOwnerAdapter();
    let cancelled = false;
    void source.snapshot().then(value => { if (!cancelled) setPortal(value); }).catch(() => {});
    return () => { cancelled = true; };
  }, [view, live, snapshot?.revision, billingRefreshVersion]);
  // Ask Nnetics actions run through the same UI commands a manual visit would.
  function handleAssistantAction(action: AssistantAction) {
    if(action.kind==="open-payables") {
      setInvoiceContractor("");go("Payables");
      if(action.id)location.hash=`Payables/${encodeURIComponent(action.id)}`;
    } else if (action.kind === "create-contractor") {
      // The agent already persisted the record; remount the contractor panel so
      // its snapshot reflects the new contractor instead of prefilling a duplicate.
      setContractorRevision(n => n + 1);
      go("Contractors");
    } else if (action.kind === "prepare-payment-draft") {
      setIntent({ draft: { contractor: action.contractor, amount: action.amount, description: action.description } });
      go("Payables");
    } else if (action.kind === "confirm-contractor-lifecycle") {
      // The owner pressed the confirmation chip. The server revalidates the
      // operation and applies it once. The assistant never completes it.
      void (async () => {
        try {
          const response = await fetch("/api/demo/contractors/owner/confirm-lifecycle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operationId: action.operationId, secret: action.secret }),
          });
          const data = await response.json().catch(() => null) as { error?: string; operation?: { kind: string; contractorName: string } } | null;
          if (!response.ok || !data) {
            setError(data?.error || "The confirmed operation could not be completed.");
            return;
          }
          setContractorRevision(n => n + 1);
          setNotice(`${data.operation?.contractorName ?? "The contractor"} was ${data.operation?.kind === "delete" ? "deleted" : data.operation?.kind === "archive" ? "archived" : "restored"}.`);
          await refresh();
        } catch {
          setError("The confirmed operation could not be completed.");
        }
      })();
      go("Contractors");
    } else if (action.kind === "find-receipt") {
      const found = action.reference ? snapshot?.payments.find(p => p.reference === action.reference) : undefined;
      if (found?.status === "Paid") go("Activity", found.attempt_id);
      else go("Activity");
    } else if (
      action.kind === "list-contractors" ||
      action.kind === "get-contractor" ||
      action.kind === "update-contractor"
    ) {
      go("Contractors");
    } else if (
      action.kind === "get-contractor-invoices" ||
      action.kind === "list-invoices" ||
      action.kind === "get-invoice" ||
      action.kind === "get-pending-invoices" ||
      action.kind === "get-overdue-invoices"
    ) {
      setInvoiceContractor(action.kind === "get-contractor-invoices" ? action.contractorId : "");
      go("Payables");
    } else if (
      action.kind === "get-vault-balance" ||
      action.kind === "get-vault-status" ||
      action.kind === "get-vault-available-balance" ||
      action.kind === "get-vault-transaction-history"
    ) {
      go("Vault & Controls");
    } else if (action.kind === "get-organization-overview" || action.kind === "get-organization-statistics") {
      go("Overview");
    } else {
      setInvoiceContractor("");
      go("Payables");
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
    location.hash = receiptId ? `Activity/${encodeURIComponent(receiptId)}` : next;
    setView(next);
    setReceipt(receiptId ?? "");
    if (receiptId) setActivityFilter("Payments");
    setError(null);
  }
  useEffect(() => {
    function restore() {
      const target = workspaceView(location.hash);
      if (demoWs && !location.hash.replace(/^#/, "").trim())
        setView("Overview");
      else setView(target.view);
      setReceipt(receiptView(location.hash) || target.receipt);
    }
    restore();
    window.addEventListener("hashchange", restore);
    return () => window.removeEventListener("hashchange", restore);
  }, []);
  useEffect(() => {
    if (view === "Activity" && receipt) document.getElementById(`receipt-${receipt}`)?.focus();
  }, [view, receipt, snapshot]);
  const MainSurface = "main";
  if (!snapshot)
    return (
      <main className="loading-page">
        <BrandMark/>
        <h1>Opening your payment desk</h1>
        <p>
          {adapter.mode === "simulation"
            ? "Loading clearly labeled synthetic data…"
            : "Loading verified NEAR network records…"}
        </p>
        <OperationFeedback active={loading} message={demoWs ? "Loading demo workspace records…" : "Loading verified workspace records…"} />
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
    return <div className="app-shell demo-shell demo-setup-shell"><DemoEntryRays/><ViewMetadata name="Demo setup"/><a className="skip-link" href="#workspace-content">Skip to content</a>
      <main className="main-content demo-setup" id="workspace-content" tabIndex={-1}>
        <header className="entry-header"><a className="entry-brand-link" href="/"><BrandMark/>Nnetics</a><AppearanceControl inline/></header>
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
    Contractors: "Invite people, verify their payout wallets and keep their records tidy.",
    Payables: "Review the request, approve the invoice and authorize payment in one place.",
    Activity: "Every payment, invoice and audit event, with proof of completed transfers.",
    "Vault & Controls": "Check your available funds, payment limits and anything that needs your attention.",
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
    ? { label: "Fund vault", view: "Vault & Controls" as View, detail: "Add simulated funds before paying a contractor." }
    : s.payments.length === 0
      ? { label: "Manage contractors", view: "Contractors" as View, detail: "Invite a contractor and prepare the first payment." }
      : needsAttentionItems.length > 0
        ? { label: "Review outstanding", view: "Activity" as View, detail: "Check pending and failed payment records." }
        : { label: "Manage contractors", view: "Contractors" as View, detail: "Keep your contractor list up to date." };
  // The portal record may come from an organization that has no contractor
  // workspace yet, so every collection is read defensively.
  const portalProfiles = Array.isArray(portal?.profiles) ? portal.profiles : [];
  const portalInvoices = Array.isArray(portal?.invoices) ? portal.invoices : [];
  const portalEvents = Array.isArray(portal?.events) ? portal.events : [];
  const portalNameById = new Map([...portalProfiles, ...(portal?.archivedProfiles ?? [])].map(profile => [profile.id, profile.name]));
  const portalContractorName = (id: string) => portalNameById.get(id) ?? "Contractor";
  const paymentLabels = {prepared: "Prepared", pending: "Pending", confirmed: "Paid", failed: "Failed", cancelled: "Cancelled"} as const;
  const demoPayments = demoWs?.demo()?.payments ?? [];
  const queueMatches = demoPayments.filter(payment => !payment.billId &&
    (!paymentFilter || payment.status === paymentFilter) &&
    matchesRecords(paymentSearch, payment.contractor, payment.recipient, payment.reference, payment.description, shortDate(payment.createdAt), formatNear(payment.amount)))
    .sort((a,b) => paymentSort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
  const auditEvents = [
    ...(demoWs?.demo()?.history ?? []).filter(h => h.kind === "control").map(h => ({id: h.id, label: h.label, at: h.at})),
    ...portalEvents.map(e => ({id: e.id, label: `${e.profileName} · ${e.action} · ${e.detail}`, at: e.at})),
    ...(live ? s.audit.map(a => ({id: `live-${a.id}`, label: a.description, at: a.time})) : []),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const funding = (demoWs?.demo()?.history ?? []).filter(event => event.kind === "funding");
  const activityPayments = ordered.filter(payment => {
    const status = ["TransferSucceeded", "TransferFailed"].includes(payment.status) ? "Pending" : paymentDisplayStatus(s, payment);
    return (historyFilter === "All outcomes" || status === historyFilter) &&
      matchesRecords(activitySearch, details(payment).contractor, payment.recipient, payment.invoice_id, payment.reference, date(payment.initiated_at_ns), formatNear(payment.amount));
  });
  const activityQueue = (s.queue ?? []).filter(job =>
    !s.payments.some(payment => payment.invoice_id === job.id) &&
    (historyFilter === "All outcomes" || (job.state === "failed" ? "Failed" : "Pending") === historyFilter) &&
    matchesRecords(activitySearch, job.id, job.state));
  const activityInvoices = portalInvoices.filter(bill =>
    matchesRecords(activitySearch, bill.reference, bill.status, bill.description, portalContractorName(bill.contractorId), bill.orderReference, bill.amount, shortDate(bill.submittedAt)));
  const visibleAudit = auditEvents.filter(event => matchesRecords(activitySearch, event.label, shortDate(event.at)));
  const visibleFunding = funding.filter(event => matchesRecords(activitySearch, event.label, shortDate(event.at), event.amount));
  const visibleReceipts = confirmed.filter(payment => payment.attempt_id === receipt ||
    matchesRecords(activitySearch, details(payment).contractor, payment.recipient, payment.invoice_id, date(payment.initiated_at_ns), formatNear(payment.amount)));
  const recentActivity = [
    ...ordered.map(payment => {
      const status = paymentDisplayStatus(s, payment);
      return {key: `payment-${payment.attempt_id}`, label: details(payment).contractor, amount: payment.amount, date: date(payment.initiated_at_ns), time: Number(BigInt(payment.initiated_at_ns) / 1_000_000n), status, receipt: status === "Paid" ? payment.attempt_id : undefined};
    }),
    ...funding.map(event => ({key: event.id, label: "Vault funded", amount: amountFromNear(event.amount).toString(), date: shortDate(event.at), time: Date.parse(event.at), status: "Funded", receipt: undefined})),
  ].sort((a,b) => b.time - a.time);
  const activeContractorCount = portalProfiles.length;
  const pendingInvoiceCount = portalInvoices.filter(b => b.status !== "Paid" && b.status !== "Rejected").length;
  const overviewWarnings: string[] = [];
  if (vault.paused) overviewWarnings.push("The demo vault is paused. New simulated payments are refused until you resume it in Vault & Controls.");
  if (available <= 0n) overviewWarnings.push("There are no available demo funds. Fund the demo vault before preparing a payment.");
  const walletsMissing = portalProfiles.filter(p => !p.wallet).length;
  if (walletsMissing > 0) overviewWarnings.push(`${walletsMissing} contractor${walletsMissing === 1 ? " has" : "s have"} no approved payout wallet yet.`);
  if (failedPayments.length > 0) overviewWarnings.push(`${failedPayments.length} payment${failedPayments.length === 1 ? "" : "s"} failed. Review them in Activity.`);
  const ownerScope = live?.config.ownerTransactionRestriction;
  const pauseReview = ownerScope?.method === "set_paused" && typeof ownerScope.args?.paused === "boolean" ? ownerScope.args.paused : null;
  return (
    <div className={demoWs ? "app-shell demo-shell" : "app-shell"}>
      {live && <OwnerTransactionReview adapter={live}/>}
      <ViewMetadata name={view}/>
      <a className="skip-link" href="#workspace-content">Skip to content</a>
      <DashboardNavigation view={view} onNavigate={go} live={!!live} organization={organizationName || s.access?.organization || demoWs?.demo()?.profile.vaultName || "Demo workspace"} demo={!!demoWs}/>
      <div className="workspace-main">
        <header className={live ? "topbar" : "topbar demo-workspace-toolbar"}>
          {!live && <span className="demo-mode-label">{demoWs ? <>Demo · simulated funds<span className="demo-mode-detail"> · no wallets, keys or tokens involved</span></> : "Simulation · No funds move"}</span>}
          <div className="topbar-actions">
            {!live && <details className="account-menu"><summary>Demo account</summary><div className="account-menu-actions"><a className="text-button" href="#Settings" onClick={e=>{e.preventDefault();go("Settings");}}>Settings</a><AppearanceControl inline/></div></details>}
            <ActionButton className="icon-button" aria-label="Refresh workspace" busy={loading} onClick={() => void refresh()}><Icon name="refresh" size={18}/></ActionButton>
          </div>
        </header>
        <MainSurface className="main-content" id="workspace-content" tabIndex={-1}>
          <div className="page-heading">
            <div><h1>{view}</h1><p>{subtitles[view]}</p></div>
            {view === "Vault & Controls" && !readOnly && <DemoButton className="button primary" onClick={() => go("Contractors")}><Icon name="plus" size={16}/>Add contractor</DemoButton>}
          </div>
          <OperationFeedback active={loading || busy.length > 0} message="Checking workspace records…"/>
          {error && <div className="error-banner" role="alert" aria-label={live ? "Testnet error" : "Simulation error"}>{getUserMessage(error)} <DemoButton onClick={() => void refresh()}>Retry refresh</DemoButton></div>}
          {notice && <div className="notice" role="status">{notice} <DemoButton className="text-button" onClick={() => setNotice("")}>Dismiss</DemoButton></div>}
          {view === "Overview" && (
            <DemoGrid className="overview-grid">
              <DemoCard className="overview-card overview-balance">
                <div className="overview-vault-heading">
                  <h2>Available vault balance</h2>
                  <span className="overview-vault-state"><Icon name={vault.paused ? "pause" : "shield"} size={15}/>{vault.paused ? "Paused" : "Active"}</span>
                </div>
                <p className="payment-workspace-amount"><Amount value={available > 0n ? available.toString() : "0"} large/></p>
                {demoWs && <p>Simulated NEAR</p>}
                <div className="overview-vault-footer">
                  <div><h3>Reserved funds</h3><Amount value={vault.reserved}/></div>
                  <DemoButton className="button secondary" onClick={() => go("Vault & Controls")}>Open vault <Icon name="arrow" size={16}/></DemoButton>
                </div>
              </DemoCard>
              <DemoCard className="overview-card overview-attention">
                <h2>Needs attention</h2>
                {overviewWarnings.length > 0 && <ul className="overview-warnings">{overviewWarnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
                {needsAttentionItems.length === 0 && overviewWarnings.length === 0 && <p className="empty">No items need your attention.</p>}
                {overviewWarnings.length === 0 && <p>{nextAction.detail}</p>}
                <DemoButton effect="primary" className="button primary" onClick={() => go(nextAction.view)}>{nextAction.label}</DemoButton>
              </DemoCard>
              <div className="overview-metrics" aria-label="Workspace metrics">
                <DemoCard className="overview-card">
                  <h2>Pending invoices</h2>
                  <p className="overview-metric"><DemoCount value={pendingInvoiceCount}/></p>
                  <DemoButton className="text-button" onClick={() => go("Payables")}>Open payables <Icon name="arrow" size={14}/></DemoButton>
                </DemoCard>
                <DemoCard className="overview-card">
                  <h2>Active contractors</h2>
                  <p className="overview-metric"><DemoCount value={activeContractorCount}/></p>
                  <DemoButton className="text-button" onClick={() => go("Contractors")}>Open contractors <Icon name="arrow" size={14}/></DemoButton>
                </DemoCard>
                <DemoCard className="overview-card overview-paid">
                  <h2>Total paid</h2>{demoWs&&<p className="muted">NEAR equivalent · payout assets shown in receipts</p>}
                  <p className="overview-metric"><Amount value={totalPaid.toString()}/></p>
                  <p><DemoCount value={confirmed.length}/> confirmed {confirmed.length === 1 ? "payout" : "payouts"}</p>
                </DemoCard>
              </div>
              <DemoCard className="overview-card overview-activity">
                <div className="record-heading"><h2>Recent activity</h2><DemoButton className="text-button" onClick={() => go("Activity")}>View activity <Icon name="arrow" size={14}/></DemoButton></div>
                {recentActivity.length === 0 ? <p className="empty">Funding and payment records appear here.</p> :
                  <DemoActivity className="overview-list">{recentActivity.slice(0, 5).map(record => (
                    <button key={record.key} className="overview-list-item" type="button" onClick={() => go("Activity", record.receipt)}>
                      <span><strong>{record.label}</strong><small>{record.date}</small></span>
                      <Amount value={record.amount}/><Badge status={record.status}/>
                    </button>
                  ))}</DemoActivity>}
              </DemoCard>
              <DemoCard className="overview-card overview-rail-card">
                <h2>Payment status</h2>
                <div className="payment-status-visual">
                  {demoWs && <StatusDonut paid={confirmed.length} pending={outstanding.length} failed={failedPayments.length}/>}
                  <ul className="payment-status-legend">
                    <li><i className="payment-status-swatch" style={{background:"var(--action)"}} aria-hidden="true"/><span>Paid</span><strong><DemoCount value={confirmed.length}/></strong></li>
                    <li><i className="payment-status-swatch" style={{background:"var(--warning)"}} aria-hidden="true"/><span>Pending</span><strong><DemoCount value={outstanding.length}/></strong></li>
                    <li><i className="payment-status-swatch" style={{background:"var(--danger)"}} aria-hidden="true"/><span>Failed</span><strong><DemoCount value={failedPayments.length}/></strong></li>
                  </ul>
                </div>
              </DemoCard>
              <DemoCard className="overview-card overview-chart-card">
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
              </DemoCard>
              <DemoCard className="overview-card overview-next-action">
                <h2>Quick actions</h2>
                <div className="actions">
                  <DemoButton effect="primary" className="button secondary" onClick={() => go("Contractors")}>Add contractor</DemoButton>
                  <DemoButton className="button secondary" onClick={() => go("Payables")}>Prepare a payment</DemoButton>
                  <button className="button secondary" onClick={() => go("Vault & Controls")}>Fund the vault</button>
                </div>
              </DemoCard>
            </DemoGrid>
          )}

          {view === "Overview" && demoWs?.demo() && <DemoFirstSteps key={demoWs.demo()!.profile.createdAt} workspace={demoWs.demo()!.profile.createdAt} funded={BigInt(vault.funded) > 0n} hasContractor={activeContractorCount > 0} go={go}/>}

          {view === "Vault & Controls" && <>
            <section className="panel payment-workspace-panel">
              <h2>Available payout funds</h2>
              <p className="payment-workspace-amount"><Amount value={available > 0n ? available.toString() : "0"} large/></p>
              <p>{formatNear(vault.reserved)} NEAR set aside for pending payments.</p>
              {vault.paused && <p><Badge status="Paused"/> New payments cannot be sent while the vault is paused.</p>}
              {!vault.agent && <p>Automatic payments are off.</p>}
              {outstanding.length > 0 && <DemoButton className="text-button" onClick={() => go("Activity")}>Check {outstanding.length} outstanding {outstanding.length === 1 ? "payment" : "payments"}</DemoButton>}
            </section>
            {live ? <TestnetControls adapter={live} snapshot={s} run={run} section="vault"/> : demoWs ? <DemoVaultCard demoWs={demoWs} run={run}/> : <section className="panel payment-workspace-panel"><h2>Payment limits</h2><p>{formatNear(vault.payment_cap)} NEAR per payment · {formatNear(vault.budget)} NEAR total</p><p>Funding is unavailable in the simulation.</p></section>}
            {live && !readOnly && live.config.ownerTransactionsEnabled && pauseReview !== null &&
              <ActionButton effect="none" className="button secondary" busy={busy.length>0} onClick={()=>void run("pause",()=>live.command({method:"set_paused",args:{paused:pauseReview}}))}>{pauseReview ? "Review pause in wallet" : "Review unpause in wallet"}</ActionButton>}
            {live && !readOnly && live.config.ownerTransactionsEnabled && ownerScope?.method === "revoke_agent" &&
              <ActionButton effect="none" className="button secondary" busy={busy.length>0} onClick={()=>void run("revoke",()=>live.command({method:"revoke_agent",args:{}}))}>Review turning off automatic payments</ActionButton>}
          </>}
          {view === "Contractors" && (live
            ? <PersistentContractorOwner embedded organization={s.access?.organization || live.config.organization} readOnly={readOnly} limit={vault.payment_cap}/>
            : <DemoContractorWorkspace
                key={contractorRevision}
                onViewBills={demoWs ? id => {setInvoiceContractor(id);go("Payables");} : undefined}
                onPrepare={demoWs
                  ? async draft => {
                      // Phase one: the demo ledger validates the request and
                      // reserves the amount. Nothing is executed yet.
                      const prepared = await demoWs.preparePayment(draft);
                      return {
                        id: prepared.payment.id,
                        reference: prepared.payment.reference,
                        contractor: prepared.payment.contractor,
                        recipient: prepared.payment.recipient,
                        amount: prepared.payment.amount,
                        fee: prepared.payment.fee,
                        total: prepared.payment.total,
                        description: prepared.payment.description,
                        confirmationSecret: prepared.confirmationSecret
                      };
                    }
                  : undefined}
                onConfirm={demoWs
                  ? async prepared => {
                      // Phase two: the owner's explicit confirmation releases
                      // the simulated transfer. The secret is single-use.
                      await demoWs.confirmPayment(prepared.id, prepared.confirmationSecret);
                      await refresh();
                    }
                  : undefined}
                onCancel={demoWs
                  ? async prepared => {
                      await demoWs.cancelPayment(prepared.id);
                      await refresh();
                    }
                  : undefined}
                paymentFee={demoWs ? DEMO_FEE : undefined}
                intent={intent ?? undefined}/>)}
          {demoWs && intent && <DemoButton className="text-button" onClick={() => setIntent(null)}>Clear the prepared assistant step</DemoButton>}
                              {view === "Activity" && (
            <div className="activity-surface">
              <section className="panel payment-workspace-panel" aria-label="Activity filters">
                <RecordSearch label="Search activity" query={activitySearch} onQuery={setActivitySearch}
                  onReset={activitySearch || activityFilter !== "All activity" || historyFilter !== "All outcomes" ? () => {setActivitySearch("");setActivityFilter("All activity");setHistoryFilter("All outcomes");} : undefined}>
                  <label className="filter-label">Event type<select aria-label="Filter activity" value={activityFilter} onChange={e => setActivityFilter(e.target.value)}>
                    {["All activity","Payments",...(demoWs ? ["Funding"] : []),"Invoices","Audit events"].map(option=><option key={option}>{option}</option>)}
                  </select></label>
                </RecordSearch>
              </section>
              {(activityFilter === "All activity" || activityFilter === "Payments" || receipt) && (
                <>
                  <section className="panel payment-workspace-panel" aria-label="Payment attempts">
                    <h2>Payments</h2>
                    <label className="filter-label">Outcome<select aria-label="Filter payment outcomes" value={historyFilter} onChange={e => setHistoryFilter(e.target.value)}>
                      {["All outcomes","Pending","Paid","Failed"].map(status => <option key={status}>{status}</option>)}
                    </select></label>
                    <p className="record-count">{activityPayments.length + activityQueue.length} payment records</p>
                    <DemoRecordFeed>{activityPayments.map(p => {
                      const info = details(p), status = paymentDisplayStatus(s,p);
                      return <article className="payment-record" key={p.attempt_id}>
                        <div><h2>{info.contractor}</h2><p>{date(p.initiated_at_ns)} · {p.invoice_id}</p>{status === "Pending" && <p>Awaiting confirmation. Do not send this payment again.</p>}{["TransferSucceeded","TransferFailed"].includes(status) && <p>The transfer result is recorded. Final accounting is pending.</p>}</div>
                        <div className="payment-record-actions"><Amount value={p.amount}/><Badge status={["TransferSucceeded","TransferFailed"].includes(status)?"Pending":status}/>{status === "Paid" && <a href={`#Activity/${encodeURIComponent(p.attempt_id)}`} onClick={e=>{e.preventDefault();go("Activity",p.attempt_id);}}>View receipt</a>}{status !== "Paid" && info.url && <a href={info.url} target="_blank" rel="noreferrer">View transaction</a>}</div>
                      </article>;
                    })}</DemoRecordFeed>
                    <DemoRecordFeed>{activityQueue.map(job => <article key={job.id} className="payment-record"><div><h2>{job.id}</h2><p>{job.state === "review" ? "Awaiting authorization" : job.state === "failed" ? "Payment failed" : "Outstanding. Check the existing attempt before taking action."}</p></div><Badge status={job.state === "failed" ? "Failed" : "Pending"}/></article>)}</DemoRecordFeed>
                    {!activityPayments.length && !activityQueue.length && <p className="empty">{s.payments.length || s.queue?.length ? "No payments match these filters." : "Payment attempts will appear here."}</p>}
                  </section>
                  <section className="panel payment-workspace-panel" aria-label="Confirmed receipts">
                    <h2>Receipts</h2>
                    {visibleReceipts.length === 0 && <p className="empty">{confirmed.length ? "No receipts match this search." : "Receipts appear here after payment is confirmed."}</p>}
                    <DemoRecordFeed>{visibleReceipts.map(p => {
                      const info = details(p);
                      const summary = [live ? "Nnetics testnet receipt" : "Nnetics demo receipt · simulated funds", p.reference, info.contractor, p.recipient, `${formatNear(p.amount)} ${demoWs?"NEAR equivalent":"NEAR"}`, date(p.initiated_at_ns), info.description, info.url].filter(Boolean).join("\n");
                      return <article className="payment-record" key={p.attempt_id} id={`receipt-${p.attempt_id}`} tabIndex={-1}>
                        <div><h2>{info.contractor}</h2><p>{date(p.initiated_at_ns)} · {live ? "Payment initiated" : "Simulated receipt"} · {p.invoice_id}</p>{info.description && <p className="payment-record-description">{info.description}</p>}</div>
                        <div className="payment-record-actions"><Amount value={p.amount}/><Badge status="Paid"/>
                          {info.url && <a href={info.url} target="_blank" rel="noreferrer">View transaction</a>}
                          <DemoButton className="text-button" onClick={async () => {try{await navigator.clipboard.writeText(summary);setNotice("Receipt copied.");}catch{setNotice("Clipboard unavailable. Select the receipt details to copy them.");}}}>Copy receipt</DemoButton>
                          <a className="text-button" download={`nnetics-receipt-${p.attempt_id}.txt`} href={`data:text/plain;charset=utf-8,${encodeURIComponent(summary)}`}>Download receipt</a>
                        </div>
                      </article>;
                    })}</DemoRecordFeed>
                  </section>
                </>
              )}
              {(activityFilter === "All activity" || activityFilter === "Invoices") && (
                <section className="panel payment-workspace-panel" aria-label="Invoice activity">
                  <h2>Invoices</h2>
                  <p className="record-count">{activityInvoices.length} invoice records</p>
                  {activityInvoices.length === 0 && <p className="empty">{portalInvoices.length ? "No invoices match this search." : "Invoice activity appears here after a contractor submits a bill."}</p>}
                  <DemoRecordFeed>{activityInvoices.map(b => <article className="payment-record" key={b.id}>
                    <div><h2>{b.reference}</h2><p>{portalContractorName(b.contractorId)} · {b.amount} NEAR</p><p className="payment-record-description">{b.description}</p></div>
                    <div className="payment-record-actions"><Badge status={b.status}/></div>
                  </article>)}</DemoRecordFeed>
                </section>
              )}
              {demoWs && (activityFilter === "All activity" || activityFilter === "Funding") &&
                <section className="panel payment-workspace-panel" aria-label="Vault funding">
                  <h2>Vault funding</h2>
                  <p className="record-count">{visibleFunding.length} funding records</p>
                  {visibleFunding.length === 0 && <p className="empty">{funding.length ? "No funding records match this search." : "Simulated funding appears here."}</p>}
                  <DemoRecordFeed>{visibleFunding.map(event => <article className="payment-record" key={event.id}>
                    <div><h3>{event.label}</h3><p>{shortDate(event.at)}</p></div><Amount value={amountFromNear(event.amount).toString()}/>
                  </article>)}</DemoRecordFeed>
                </section>}
              {(activityFilter === "All activity" || activityFilter === "Audit events") && (
                <section className="panel payment-workspace-panel" aria-label="Audit events">
                  <h2>Audit events</h2>
                  <p className="record-count">{visibleAudit.length} audit events</p>
                  {visibleAudit.length === 0 && <p className="empty">{auditEvents.length ? "No audit events match this search." : "Vault controls and contractor changes appear here."}</p>}
                  <DemoRecordFeed>{visibleAudit.map(event => <article className="payment-record" key={event.id}><div><h2>{event.label}</h2><p>{new Date(event.at).toLocaleString("en-GB", {day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</p></div></article>)}</DemoRecordFeed>
                </section>
              )}
              {live && recoveryNeeded && <details className="reference-disclosure"><summary>Check unresolved payments</summary><TestnetControls adapter={live} snapshot={s} run={run} section="recovery"/></details>}
            </div>
          )}
          {view === "Payables" && demoWs && <DemoContractorWorkspace key={invoiceContractor} focus="payables" invoiceContractor={invoiceContractor} paymentRecords={demoPayments} demoVault={demoWs?.demo()?.vault} refreshVersion={billingRefreshVersion} onPaymentChanged={()=>void refresh()}/>}
          {view === "Payables" && live && <PersistentContractorOwner embedded focus="payables" refreshVersion={billingRefreshVersion} organization={s.access?.organization || live.config.organization} readOnly={readOnly}/> }
          {view === "Payables" && !demoWs && !live && (
            <section className="panel payment-workspace-panel" aria-label="Invoices">
              <label className="filter-label">Status<select aria-label="Filter invoices" value={invoiceFilter} onChange={e => setInvoiceFilter(e.target.value)}>
                {["All invoices","Submitted","Under review","Needs clarification","Approved","Rejected","Paid"].map(option=><option key={option}>{option}</option>)}
              </select></label>
              {portalInvoices.length === 0 && <p className="empty">Invoices appear here after a contractor submits one in their portal.</p>}
              {portalInvoices.filter(b => invoiceFilter === "All invoices" || b.status === invoiceFilter).map(b => <article className="payment-record" key={b.id}>
                <div><h2>{b.reference}</h2><p>{portalContractorName(b.contractorId)} · {b.amount} NEAR</p><p className="payment-record-description">{b.description}</p>{b.orderReference && <p className="payment-record-description">Agreement: {b.orderReference}</p>}</div>
                <div className="payment-record-actions"><Badge status={b.status}/></div>
              </article>)}
            </section>
          )}
          {view === "Payables" && (
            <details className="other-payments" open={intent?.draft||(typeof location!=="undefined"&&location.hash.startsWith("#Payments"))?true:undefined}><summary>Other payments · no invoice</summary><div className="payment-surface">
              <section className="panel payment-workspace-panel" aria-label="Payment queue">
                <h2>Payment queue</h2>
                <p>Direct contractor payments without an invoice. Invoice-linked attempts stay with their payable above.</p>
                {demoWs && <>
                  <RecordSearch label="Search payments" query={paymentSearch} onQuery={setPaymentSearch} onReset={paymentSearch || paymentFilter || paymentSort !== "newest" ? () => {setPaymentSearch("");setPaymentFilter("");setPaymentSort("newest");} : undefined}>
                    <label className="filter-label">Status<select value={paymentFilter} onChange={event => setPaymentFilter(event.target.value)}>
                      <option value="">All payment states</option>{Object.entries(paymentLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
                    </select></label>
                    <label className="filter-label">Sort payments<select value={paymentSort} onChange={event => setPaymentSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
                  </RecordSearch>
                  <p className="record-count" role="status">{queueMatches.length} of {demoPayments.filter(p=>!p.billId).length} payments</p>
                </>}
                {demoWs ? queueMatches.map(p => <article className="payment-record" key={p.id}>
                  <div><h2>{p.contractor || p.recipient}</h2><p>{p.reference} · {p.description}</p><p className="payment-record-description">{new Date(p.createdAt).toLocaleString("en-GB", {day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}{p.awaitingConfirmation ? " · awaiting your confirmation" : ""}{p.reason ? ` · ${p.reason}` : ""}</p></div>
                  <div className="payment-record-actions"><Amount value={p.amount}/><Badge status={paymentLabels[p.status]}/></div>
                </article>) : s.queue?.map(job => <article className="payment-record" key={job.id}><div><h2>{job.id}</h2><p>{job.state === "review" ? "Awaiting authorization" : job.state === "failed" ? "Payment failed" : "Outstanding."}</p></div><Badge status={job.state === "failed" ? "Failed" : "Pending"}/></article>)}
                {demoWs && !queueMatches.length && <p className="empty">{demoPayments.length ? "No payments match these filters." : "Prepared and completed payments appear here."}</p>}
                {!demoWs && !s.queue?.length && <p className="empty">The payment queue is empty.</p>}
              </section>
              {live ? <PersistentContractorOwner embedded focus="payments" organization={s.access?.organization || live.config.organization} readOnly={readOnly} limit={vault.payment_cap}/> : <DemoContractorWorkspace
                key={contractorRevision}
                focus="payments"
                paymentRecords={demoPayments}
                onPrepare={demoWs ? async draft => {
                  const prepared = await demoWs.preparePayment(draft);
                  return {id: prepared.payment.id, reference: prepared.payment.reference, contractor: prepared.payment.contractor, recipient: prepared.payment.recipient, amount: prepared.payment.amount, fee: prepared.payment.fee, total: prepared.payment.total, description: prepared.payment.description, confirmationSecret: prepared.confirmationSecret};
                } : undefined}
                onConfirm={demoWs ? async prepared => { await demoWs.confirmPayment(prepared.id, prepared.confirmationSecret); await refresh(); } : undefined}
                onCancel={demoWs ? async prepared => { await demoWs.cancelPayment(prepared.id); await refresh(); } : undefined}
                paymentFee={demoWs ? DEMO_FEE : undefined}
                intent={intent ?? undefined}/>}
            </div></details>
          )}
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
                  <DemoButton className="button secondary">Save limit</DemoButton>
                  <DemoButton type="button" className="text-button" onClick={() => void run("demo-limit", () => demoWs.setLimit(""), "Demo spending limit cleared.")}>Clear limit</DemoButton>
                </div>
              </form>
              <p>Demo assistant: {assistantConfigured === null ? "checking configuration…" : assistantConfigured ? `model answers configured server-side (${assistantModel ?? "configured model"}) · the API key never enters the browser or logs` : "provider unavailable. A server model must be configured to answer requests."}</p>
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
  const ownerField = useRef<HTMLInputElement>(null);
  const vaultField = useRef<HTMLInputElement>(null);
  return <div className="demo-setup-layout">
    <section className="demo-setup-panel">
      <h1>Try the Nnetics demo</h1>
      <p><DemoTyping>Your workspace and vault are private to this browser session. All funds and payments are simulated.</DemoTyping></p>
      <ol className="demo-setup-steps" aria-label="Workspace setup progress">
        <li aria-current={step === 1 ? "step" : undefined}>Owner profile</li>
        <li aria-current={step === 2 ? "step" : undefined}>Demo vault</li>
      </ol>
      {step === 1 ? <form onSubmit={event => { event.preventDefault(); setStep(2); requestAnimationFrame(() => vaultField.current?.focus()); }}>
        <h2>Set up your workspace</h2>
        <label htmlFor="demo-owner-name">Owner name</label>
        <input ref={ownerField} id="demo-owner-name" value={profile} onChange={event => setProfile(event.target.value)} maxLength={80} required placeholder="e.g. Alex Morgan"/>
        <DemoButton effect="primary" className="button primary" disabled={!profile.trim()}>Continue</DemoButton>
      </form> : <form onSubmit={event => { event.preventDefault(); if (!busy) void onCreate(profile.trim(), vault.trim()); }}>
        <h2>Name your demo vault</h2>
        <label htmlFor="demo-vault-name">Vault name</label>
        <input ref={vaultField} id="demo-vault-name" value={vault} onChange={event => setVault(event.target.value)} maxLength={80} required placeholder="e.g. Studio operations"/>
        <p>Start with an empty vault. Add simulated NEAR from Vault &amp; Controls when you are ready.</p>
        <div className="actions">
          <ActionButton effect="primary" className="button primary" busy={busy} pendingLabel="Creating demo workspace…" disabled={busy || !vault.trim()}>Create demo workspace</ActionButton>
          <DemoButton type="button" className="text-button" disabled={busy} onClick={() => {setStep(1);requestAnimationFrame(() => ownerField.current?.focus());}}>Back</DemoButton>
        </div>
      </form>}
      {flowError && <p className="error-banner" role="alert">{getUserMessage(flowError)}</p>}
    </section>
    <WorkspacePreview/>
  </div>;
}

function DemoFirstSteps({workspace, funded, hasContractor, go}: {
  workspace: string; funded: boolean; hasContractor: boolean; go: (view: View) => void;
}) {
  const key = `nnetics-demo-guide-${workspace}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(key) === "complete"; } catch { return false; }
  });
  const complete = funded && hasContractor;
  useEffect(() => {
    if (!complete && !dismissed) return;
    try { localStorage.setItem(key, "complete"); } catch {}
  }, [complete, dismissed, key]);
  if (complete || dismissed) return null;
  return <DemoCard className="overview-card demo-first-steps">
    <div className="record-heading"><h2>Get started</h2><DemoButton type="button" className="text-button" onClick={() => setDismissed(true)}>Skip guide</DemoButton></div>
    <ol>
      <li><span>Workspace created</span><strong>Done</strong></li>
      <li><span>Fund the demo vault</span>{funded ? <strong>Done</strong> : <DemoButton className="text-button" onClick={() => go("Vault & Controls")}>Open vault</DemoButton>}</li>
      <li><span>Add your first contractor</span>{hasContractor ? <strong>Done</strong> : <DemoButton className="text-button" onClick={() => go("Contractors")}>Open contractors</DemoButton>}</li>
    </ol>
  </DemoCard>;
}

function DemoVaultCard({demoWs, run}: {demoWs: DemoWorkspaceAdapter; run: (key: string, action: () => Promise<void>, message?: string) => Promise<void>}) {
  const raw = demoWs.demo();
  const paused = raw?.vault.paused === true;
  return <section className="panel payment-workspace-panel demo-vault-controls">
    <div className="record-heading"><h2>Demo Wallet · simulated funds</h2><Badge status={paused ? "Paused" : "Active"}/></div>
    {paused && <p className="warning-banner">New simulated payments are refused while the demo vault is paused.</p>}
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
        <DemoButton className="button primary">Fund vault</DemoButton>
      </div>
      <p>Demo wallet funding is simulated NEAR only; no blockchain, wallet or token is involved. Fundings stack, so repeat the amount any time.</p>
    </form>
    <div className="actions">
      <button className="button secondary" aria-label={paused ? "Resume the demo vault" : "Pause the demo vault"} onClick={() => {
        void run("demo-pause", () => demoWs.setPaused(!paused), paused ? "Demo vault resumed. Simulated payments can be prepared again." : "Demo vault paused. New simulated payments are refused until it is resumed.");
      }}>{paused ? "Resume demo vault" : "Pause demo vault"}</button>
      <button className="button secondary" onClick={() => { if (window.confirm("Reset the demo workspace? This visitor's funding history, payments and receipts return to a blank walkthrough.")) void run("demo-reset", () => demoWs.resetWorkspace(), "Demo workspace reset. A fresh walkthrough can start."); }}>Reset demo workspace</button>
    </div>
  </section>;
}
