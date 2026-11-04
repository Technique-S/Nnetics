"use client";
import {ActionButton} from "./action-button";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { requireNear } from "../data/invoice-currency";
import { DEMO_AGENT } from "../data/mock-adapter";
import { NearOwnerAdapter, api } from "../data/near-adapter";
import {LiveContextChanged} from "../data/config-context";
import {PersistentContractorOwner} from "./contractor-owner";
import { DashboardNavigation } from "./dashboard-navigation";
import { LoadingSkeleton } from "./loading-skeleton";
import { Onboarding } from "./onboarding";
import { TestnetControls } from "./testnet-controls";

import {
  account,
  amountFromNear,
  formatNear,
  reasonText,
  review,
  uint,
} from "../data/owner-adapter";
import type {
  Invoice,
  OwnerAdapter,
  OwnerSnapshot,
  PaymentStatus,
  TransferScenario,
} from "../data/owner-adapter";

type View =
  | "Overview"
  | "Vendors"
  | "Work orders"
  | "Invoice review"
  | "Payment history"
  | "Contractors" | "Vault" | "Access" | "Recovery";
type DialogName = "vendor" | "order" | "invoice" | null;
const views: View[] = [
  "Overview",
  "Vendors",
  "Work orders",
  "Invoice review",
  "Payment history", "Contractors", "Vault", "Access", "Recovery",
];
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
    <span className={"badge " + tone}>
      <span className="status-dot" />
      {status}
    </span>
  );
}
const vendorName = (s: OwnerSnapshot, id: string) =>
  s.vendors.find((v) => v.id === id)?.name ?? id;
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
function Modal({
  live = false,
  title,
  error,
  busy,
  onClose,
  onSubmit,
  children,
}: {
  live?: boolean;
  title: string;
  error: string | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-head">
        <div>
          <span className="eyebrow">
            {live ? "NEAR TESTNET" : "LOCAL SIMULATION"}
          </span>
          <h2 id="modal-title">{title}</h2>
        </div>
      </div>
      <form
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          onSubmit(new FormData(e.currentTarget));
        }}
      >
        <div className="form-fields">{children}</div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <ActionButton type="button" className="button secondary" onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton className="button primary" pending={busy} pendingLabel="Saving…" retryLabel={live?"Review wallet request":"Save simulated change"} state={error?"error":"idle"}>
            {busy
              ? "Saving…"
              : live
                ? "Review wallet request"
                : "Save simulated change"}
          </ActionButton>
        </div>
      </form>
    </dialog>
  );
}

export default function OwnerDashboard() {
  return (
    <Onboarding
      renderDashboard={(adapter, name) => <Dashboard adapter={adapter} organizationName={name} />}
    />
  );
}

function Dashboard({ adapter, organizationName }: { adapter: OwnerAdapter; organizationName?: string }) {
  const live = adapter instanceof NearOwnerAdapter ? adapter : null;

  const [snapshot, setSnapshot] = useState<OwnerSnapshot | null>(null);
  const [view, setView] = useState<View>("Overview");
  const [selected, setSelected] = useState(
    adapter.mode === "simulation" ? "INV-1042" : "",
  );
  const [dialog, setDialog] = useState<DialogName>(null);
  const [busy, setBusy] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [scenario, setScenario] = useState<TransferScenario>("success");
  const [historyFilter, setHistoryFilter] = useState("All outcomes");
  const contextInvalid=useRef(false);
  async function refresh() {
    try {
      const next = await adapter.snapshot();
      if(contextInvalid.current)return;
      setSnapshot((old) =>
        !old || next.revision >= old.revision ? next : old,
      );
    } catch (e) {
      if(live){setSnapshot(null);setDialog(null);setSelected("");}
      if(e instanceof LiveContextChanged)contextInvalid.current=true;
      setError(
        e instanceof Error ? e.message : "Unable to load the simulation.",
      );
    }
  }
  useEffect(() => {
    contextInvalid.current=false;
    void refresh();
    const unsubscribe=adapter.subscribe(() => {
      void refresh();
    });
    return ()=>{contextInvalid.current=true;unsubscribe();};
  }, [adapter]); // Adapter is fixed for this session.
  async function run(
    key: string,
    action: () => Promise<void>,
    message?: string,
  ) {
    setError(null);
    setBusy((old) => [...old, key]);
    try {
      await action();
      await refresh();
      if (message) setNotice(message);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The simulated request failed.",
      );
    } finally {
      setBusy((old) => old.filter((x) => x !== key));
    }
  }
  const invoiceSubmission = useRef("");
  function open(name: DialogName) {
    invoiceSubmission.current = crypto.randomUUID();
    setError(null);
    setDialog(name);
  }
  function go(next: View) {
    window.location.hash = encodeURIComponent(next);
    setView(next);
    setError(null);
  }
  useEffect(() => {
    const restore = () => { try {const name = decodeURIComponent(location.hash.slice(1)); if (views.includes(name as View)) setView(name as View);} catch {/* Invalid route hints never affect account authority. */} };
    restore(); window.addEventListener("hashchange", restore);
    return () => window.removeEventListener("hashchange", restore);
  }, []);
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
        {!error && <LoadingSkeleton />}
        {error && (
          <>
            <p role="alert">{error}</p>
            <ActionButton busy={busy.length>0} className="button primary" onClick={() => void refresh()}>
              Retry loading
            </ActionButton>
          </>
        )}
      </main>
    );
  const s = snapshot,
    v = s.vault;
  const readOnly = !!live && s.access?.role !== "owner";
  const invoice = s.invoices.find((i) => i.id === selected) ?? s.invoices[0];
  const reasons = invoice ? review(s, invoice) : [];
  const ready = s.invoices.filter((i) => review(s, i).length === 0);
  const committed = BigInt(v.spent) + BigInt(v.reserved);
  const pending = s.payments.filter((p) => p.status === "Pending");
  const defaultOrder =
    s.orders.find((o) => o.status === "Approved" && o.enabled) ?? s.orders[0];
  const subtitle: Record<View, string> = {
    Contractors: "Private invitations, wallet approvals and submitted bills.",
    Vault: "Payment funds and spending authority are separate. Review both before signing.",
    Access: "Manage who can view this organization. Owner authority stays on chain.",
    Recovery: "Inspect unresolved attempts without retrying an unknown outcome.",
    Overview: "Approved work. Bounded authority. A clear record.",
    Vendors: "Keep recipient details explicit and approvals in your hands.",
    "Work orders": "Each order authorizes one exact payment to one recipient.",
    "Invoice review": "Compare invoice claims with existing owner approval.",
    "Payment history":
      "Follow every attempt, including outcomes that remain unresolved.",
  };
  async function submit(data: FormData) {
    const field = (name: string) => String(data.get(name) ?? "");
    await run(
      "form",
      async () => {
        if (dialog === "vendor")
          await adapter.command({
            method: "register_vendor",
            args: {
              vendor_id: field("vendor_id"),
              recipient: account(field("recipient")),
            },
          });
        if (dialog === "order")
          await adapter.command({
            method: "approve_work_order",
            args: {
              order_id: field("order_id"),
              vendor_id: field("vendor_id"),
              amount: amountFromNear(field("amount")),
              expires_at_ns: uint(
                (
                  BigInt(new Date(field("expiry") + "T23:59:59").getTime()) *
                  1_000_000n
                ).toString(),
                (1n << 64n) - 1n,
              ),
            },
          });
        if (dialog === "invoice") {
          const order = s.orders.find((o) => o.id === field("order_id"))!;
          const draft: Omit<Invoice, "reviewed"> = {
            id: invoiceSubmission.current || (invoiceSubmission.current = crypto.randomUUID()),
            order_id: order.id,
            vendor_id: order.vendor_id,
            recipient: account(field("recipient")),
            amount: amountFromNear(field("amount")),
            asset: "NEAR",
            text: field("text"),
          };
          requireNear(draft.asset,draft.text);
          if (!live) {
            const response=await fetch("/api/demo/owner-invoices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(draft)});
            const saved=await response.json();
            if(!response.ok) throw Error(saved.error || "Invoice submission failed.");
            await adapter.addInvoice(saved);setSelected(saved.id);
          } else {await adapter.addInvoice(draft);setSelected("");}
          setView("Invoice review");
        }
        setDialog(null);
      },
      live
        ? "Request submitted. Refresh finalized state to confirm owner actions; eligible invoices enter the durable worker queue."
        : "Local simulation updated. No transaction was submitted.",
    );
  }
  const queue = (compact = false) => (
    <div className="queue-list">
      {s.invoices.length === 0 ? (
        <div className="empty">No invoices to review.</div>
      ) : (
        s.invoices.slice(0, compact ? 3 : undefined).map((i) => {
          const codes = review(s, i);
          return (
            <ActionButton busy={busy.length>0}
              key={i.id}
              className={
                "queue-row " +
                (view === "Invoice review" && invoice?.id === i.id
                  ? "selected"
                  : "")
              }
              onClick={() => {
                setSelected(i.id);
                go("Invoice review");
              }}
            >
              <span className="avatar small">
                {vendorName(s, i.vendor_id)
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <span className="queue-person">
                <strong>{vendorName(s, i.vendor_id)}</strong>
                <small>
                  {i.id} · {i.order_id}
                </small>
              </span>
              <span className="queue-summary">
                <Amount value={i.amount} />
                <Badge
                  status={
                    codes.length
                      ? "Needs review"
                      : live
                        ? "Ready for worker"
                        : "Ready to simulate"
                  }
                />
              </span>
              <Icon name="arrow" size={17} />
            </ActionButton>
          );
        })
      )}
    </div>
  );
  const history = (compact = false) => (
    <><p className="scroll-hint">Scroll horizontally for all columns</p><div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable payment records">
      <table>
        <thead>
          <tr>
            <th>Work & recipient</th>
            <th>Amount</th>
            <th>Outcome</th>
            <th>Reference</th>
          </tr>
        </thead>
        <tbody>
          {s.payments
            .filter(
              (p) =>
                historyFilter === "All outcomes" || p.status === historyFilter,
            )
            .slice(0, compact ? 3 : undefined)
            .map((p) => (
              <tr key={p.attempt_id}>
                <td>
                  <strong>
                    {s.orders.find((o) => o.id === p.order_id)?.title ??
                      p.order_id}
                  </strong>
                  <small className="mono">{p.recipient}</small>
                  <small>{p.invoice_id}</small>
                </td>
                <td>
                  <Amount value={p.amount} />
                </td>
                <td>
                  <Badge status={p.status} />
                  {p.status === "Pending" && (
                    <small>Unknown outcome · funds locked</small>
                  )}
                </td>
                <td>
                  {live && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(p.reference) ? (
                    <a
                      className="mono"
                      href={`https://testnet.nearblocks.io/txns/${encodeURIComponent(p.reference)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View transaction
                    </a>
                  ) : (
                    <span className="mono">{p.reference}</span>
                  )}
                  <small>
                    {live ? "Testnet transaction" : "Simulated receipt"}
                  </small>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {s.payments.filter(
        (p) => historyFilter === "All outcomes" || p.status === historyFilter,
      ).length === 0 && (
        <div className="empty">No attempts match this outcome.</div>
      )}
    </div></>
  );
  return (
    <div className="app-shell"><a className="skip-link" href="#workspace-content">Skip to content</a>
      <DashboardNavigation view={view} onNavigate={name => go(name as View)} live={!!live} organization={organizationName || s.access?.organization || "Content studio"} invoiceCount={s.invoices.length} />
      <div className="workspace-main">
        {!live && <div className="simulation-banner">
          <span className="simulation-tag">
            {live ? "TESTNET" : "SIMULATION"}
          </span>
          <span>
            {live
              ? "Live testnet data. Owner actions require wallet signatures; queued invoices may be paid by the authorized worker."
              : "Synthetic data. No wallet connected. No tokens moved. Saved invoices persist; other demo changes reset on reload."}
          </span>
        </div>}
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace</span>
            <span className="slash">/</span>
            {view}
          </div>
          <div className="topbar-actions">
            <ActionButton busy={busy.length>0}
              className="icon-button"
              aria-label={
                live ? "Refresh finalized state" : "Refresh mock state"
              }
              onClick={() =>
                void run(
                  "refresh",
                  async () => {},
                  live ? "Finalized state refreshed." : "Mock state refreshed.",
                )
              }
              disabled={busy.includes("refresh")}
            >
              <Icon name="refresh" size={18} />
            </ActionButton>
            <span className="owner-label">
              {live ? s.access?.accountId : v.owner}
            </span>
            <span className="avatar owner">OW</span>
          </div>
        </header>
        <MainSurface aria-busy={busy.length > 0} className="main-content" id="workspace-content" tabIndex={-1}>

          <div className="page-heading">
            <div>
              <div className="eyebrow">Owner workspace</div>
              <h1>{view === "Overview" ? "Your payment desk" : view}</h1>
              <p>{subtitle[view]}</p>
            </div>
            <div className="heading-actions">

              {view === "Vendors" ? (
                <ActionButton busy={busy.length>0}
                  className="button primary"
                  onClick={() => open("vendor")}
                  disabled={readOnly}
                >
                  <Icon name="plus" size={16} />
                  Manage vendor
                </ActionButton>
              ) : view === "Work orders" ? (
                <ActionButton busy={busy.length>0}
                  className="button primary"
                  onClick={() => open("order")}
                  disabled={readOnly}
                >
                  <Icon name="plus" size={16} />
                  New work order
                </ActionButton>
              ) : ["Overview", "Invoice review", "Payment history"].includes(view) ? (
                <ActionButton busy={busy.length>0}
                  className="button primary"
                  onClick={() => open("invoice")}
                  disabled={readOnly}
                >
                  <Icon name="plus" size={16} />
                  {live ? "Enter structured invoice" : "Add sample invoice"}
                </ActionButton>
              ) : null}
            </div>
          </div>
          {view === "Contractors" && (live ? <PersistentContractorOwner embedded organization={s.access?.organization || live.config.organization}/> : <p className="notice">Explore the <a href="/demo/contractors">explicitly simulated contractor workspace</a>.</p>)}
          {live && ["Vault", "Access", "Recovery"].includes(view) && <TestnetControls adapter={live} snapshot={s} run={run} section={view === "Access" ? "access" : view === "Recovery" ? "recovery" : "vault"}/>}
          {!live && ["Vault", "Access", "Recovery"].includes(view) && <p className="notice">These controls require a verified testnet organization. No live account is attached to this simulation.</p>}
          {busy.length > 0 && <p className="action-progress" role="status">Updating verified records…</p>}
          {error && !dialog && (
            <div
              className="error-banner"
              role="alert"
              aria-label={live ? "Testnet error" : "Simulation error"}
            >
              {error}
              <ActionButton busy={busy.length>0}
                onClick={() => {
                  setError(null);
                  void refresh();
                }}
              >
                Retry refresh
              </ActionButton>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              <Icon name="check" size={16} />
              {notice}
              <ActionButton busy={busy.length>0}
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                ×
              </ActionButton>
            </div>
          )}
          {(v.paused || !v.agent) && <div className="pause-banner"><Icon name="shield"/><div><strong>{v.paused ? "Payments paused." : "Worker authority revoked."}</strong> {!v.agent && "Worker access revoked. "}{pending.length ? `${pending.length} transfer(s) awaiting confirmation; funds remain reserved.` : "No unresolved transfers."}</div></div>}
          {view === "Overview" && (
            <>
              <section
                className="stats"
                aria-label={
                  live
                    ? "Finalized vault accounting"
                    : "Simulated vault accounting"
                }
              >
                {[
                  [
                    "Uncommitted authority",
                    (BigInt(v.budget) - committed).toString(),
                    "Within your cumulative authority",
                  ],
                  [
                    "Reserved in flight",
                    v.reserved,
                    `${pending.length} unresolved attempt${pending.length === 1 ? "" : "s"}`,
                  ],
                  [
                    "Confirmed spend",
                    v.spent,
                    "Only conclusively successful transfers",
                  ],
                  [
                    "Available payment funds",
                    (BigInt(v.funded) - committed).toString(),
                    live
                      ? "Funded less spent and reserved · storage excluded"
                      : "Synthetic deposits · storage excluded",
                  ],
                ].map(([label, value, hint], i) => (
                  <article key={label} className={"stat-card stat-" + i}>
                    <div className="stat-label">
                      {label}
                      <span className="stat-corner">
                        {i === 0 ? "↗" : i === 1 ? "◷" : i === 2 ? "✓" : "◇"}
                      </span>
                    </div>
                    <Amount large value={value} />
                    <small>{hint}</small>
                  </article>
                ))}
              </section>
              <div className="overview-grid">
                <div className="overview-primary">
                  <section className="panel">
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">Next up</span>
                        <h2>
                          Invoices at your desk{" "}
                          <span className="count">{s.invoices.length}</span>
                        </h2>
                      </div>
                      <ActionButton busy={busy.length>0}
                        className="text-button"
                        onClick={() => go("Invoice review")}
                      >
                        Open review <Icon name="arrow" size={15} />
                      </ActionButton>
                    </div>
                    {queue(true)}
                    <div className="panel-foot">
                      <span className="status-dot" />
                      {ready.length} ready for{" "}
                      {live ? "the worker" : "a local simulation"}. Review
                      cannot override a failed rule.
                    </div>
                  </section>
                  <section className="panel">
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">Payment records</span>
                        <h2>Recent payment attempts</h2>
                      </div>
                      <ActionButton busy={busy.length>0}
                        className="text-button"
                        onClick={() => go("Payment history")}
                      >
                        View history <Icon name="arrow" size={15} />
                      </ActionButton>
                    </div>
                    {history(true)}
                  </section>
                </div>
                <aside className="overview-secondary">
                  <section className="guardrail-panel">
                    <div className="guardrail-icon">
                      <Icon name="shield" size={25} />
                    </div>
                    <span className="eyebrow">Payment limits</span>
                    <h2>
                      Clear boundaries. <br />
                      Before every payment.
                    </h2>
                    <p>
                      Every request stays tied to an immutable, owner-approved
                      work order.
                    </p>
                    <div className="budget-track">
                      <span
                        style={{
                          width: `${Number((BigInt(v.spent) * 100n) / (BigInt(v.budget) || 1n))}%`,
                        }}
                      />
                      <span
                        style={{
                          width: `${Number((BigInt(v.reserved) * 100n) / (BigInt(v.budget) || 1n))}%`,
                        }}
                      />
                    </div>
                    <div className="budget-legend">
                      <span>
                        <i />
                        Spent
                      </span>
                      <span>
                        <i />
                        Reserved
                      </span>
                      <span>Uncommitted</span>
                    </div>
                    <dl>
                      <div>
                        <dt>Cumulative budget</dt>
                        <dd>
                          <Amount value={v.budget} />
                        </dd>
                      </div>
                      <div>
                        <dt>Per-payment cap</dt>
                        <dd>
                          <Amount value={v.payment_cap} />
                        </dd>
                      </div>
                      <div>
                        <dt>Vendor slots</dt>
                        <dd>{s.vendors.length} / 3</dd>
                      </div>
                    </dl>
                    <div className="control-row">
                      <div>
                        <strong>New payment requests</strong>
                        <small>
                          {v.paused
                            ? "Paused"
                            : "Open within approved authority"}
                        </small>
                      </div>
                      <ActionButton busy={busy.length>0}
                        role="switch"
                        aria-checked={!v.paused}
                        aria-label={
                          live
                            ? "Allow new testnet payments"
                            : "Allow new simulated payments"
                        }
                        className={"switch " + (!v.paused ? "on" : "")}
                        disabled={readOnly || busy.includes("pause")}
                        onClick={() =>
                          void run("pause", () =>
                            adapter.command({
                              method: "set_paused",
                              args: { paused: !v.paused },
                            }),
                          )
                        }
                      >
                        <span />
                      </ActionButton>
                    </div>
                  </section>
                  <section className="panel worker-panel">
                    <div className="worker-icon">
                      <Icon name="shield" size={18} />
                    </div>
                    <h3>Worker permission</h3>
                    <p className="mono">
                      {v.agent?.account_id ?? "No authorized worker"}
                    </p>
                    <Badge status={v.agent ? "Active" : "Revoked"} />
                    <p>
                      Revocation stops future initiation. It cannot cancel a
                      transfer already sent.
                    </p>
                    <ActionButton busy={busy.length>0}
                      className="button secondary full"
                      disabled={readOnly || busy.includes("agent")}
                      onClick={() =>
                        void run("agent", () =>
                          adapter.command(
                            v.agent
                              ? { method: "revoke_agent", args: {} }
                              : {
                                  method: "authorize_agent",
                                  args: live
                                    ? live.workerIdentity()
                                    : DEMO_AGENT,
                                },
                          ),
                        )
                      }
                    >
                      {v.agent
                        ? "Revoke worker authority"
                        : live
                          ? "Authorize configured testnet worker"
                          : "Authorize synthetic worker"}
                    </ActionButton>
                  </section>
                </aside>
              </div>
            </>
          )}
          {view === "Vendors" && (
            <>
              <div className="context-note">
                <Icon name="shield" size={18} />
                <span>
                  Recipient changes apply to future orders. Existing work orders
                  retain their approved recipient. Three permanent vendor slots
                  are available.
                </span>
              </div>
              {s.vendors.length === 0 && <div className="empty-state"><h2>No vendor references loaded</h2><p>Add a vendor or import an existing reference below. Existing approved orders retain their original recipient.</p></div>}
              <section className="vendor-grid">
                {s.vendors.map((vendor, i) => (
                  <article className="panel vendor-card" key={vendor.id}>
                    <div className="vendor-card-top">
                      <span className={"avatar vendor-avatar color-" + i}>
                        {vendor.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                      <Badge status={vendor.active ? "Active" : "Disabled"} />
                    </div>
                    <span className="eyebrow">{vendor.role}</span>
                    <h2>{vendor.name}</h2>
                    <p>
                      Vendor ID: <strong>{vendor.id}</strong>
                    </p>
                    <div className="recipient-box">
                      <small>Recipient for new orders</small>
                      <span className="mono">{vendor.recipient}</span>
                    </div>
                    <div className="vendor-detail">
                      <span>Work orders</span>
                      <strong>
                        {
                          s.orders.filter((o) => o.vendor_id === vendor.id)
                            .length
                        }
                      </strong>
                    </div>
                    <ActionButton busy={busy.length>0}
                      className="button secondary full"
                      disabled={readOnly || busy.includes(vendor.id)}
                      onClick={() =>
                        void run(vendor.id, () =>
                          adapter.command(
                            vendor.active
                              ? {
                                  method: "disable_vendor",
                                  args: { vendor_id: vendor.id },
                                }
                              : {
                                  method: "register_vendor",
                                  args: {
                                    vendor_id: vendor.id,
                                    recipient: vendor.recipient,
                                  },
                                },
                          ),
                        )
                      }
                    >
                      {vendor.active
                        ? "Disable future payments"
                        : "Enable vendor"}
                    </ActionButton>
                  </article>
                ))}
              </section>
            </>
          )}
          {view === "Work orders" && (
            <section className="panel">
              <div className="section-head">
                <div>
                  <span className="eyebrow">One order, one payment</span>
                  <h2>
                    Approved work{" "}
                    <span className="count">{s.orders.length}</span>
                  </h2>
                </div>
                <span className="subtle">Order IDs are never reused</span>
              </div>
              <><p className="scroll-hint">Scroll horizontally for all columns</p><div className="table-scroll" tabIndex={0} role="region" aria-label="Scrollable payment records">
                <table>
                  <thead>
                    <tr>
                      <th>Work order</th>
                      <th>Approved recipient</th>
                      <th>Amount & expiry</th>
                      <th>Status</th>
                      <th>Authority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.orders.length === 0 && <tr><td colSpan={6}><div className="empty-state">No work orders loaded. Import an existing reference below, or add a vendor and approve one exact amount and recipient.</div></td></tr>}
                    {s.orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <strong>{o.title}</strong>
                          <small>
                            {o.id} · {vendorName(s, o.vendor_id)}
                          </small>
                        </td>
                        <td className="mono">{o.recipient}</td>
                        <td>
                          <Amount value={o.amount} />
                          <small>{date(o.expires_at_ns)}</small>
                        </td>
                        <td>
                          <Badge status={o.status} />
                          {!o.enabled && <small>Authority revoked</small>}
                        </td>
                        <td>
                          {o.enabled && o.status !== "Paid" ? (
                            <ActionButton busy={busy.length>0}
                              className="text-button danger"
                              disabled={readOnly || busy.includes(o.id)}
                              onClick={() =>
                                void run(o.id, () =>
                                  adapter.command({
                                    method: "revoke_work_order",
                                    args: { order_id: o.id },
                                  }),
                                )
                              }
                            >
                              Revoke order
                            </ActionButton>
                          ) : (
                            <span className="subtle">
                              {o.status === "Paid" ? "Closed" : "Revoked"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></>
            </section>
          )}
          {view === "Invoice review" && (
            <div className="review-grid">
              <section className="panel review-queue">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Review queue</span>
                    <h2>{live ? "Structured invoices" : "Sample invoices"}</h2>
                  </div>
                </div>
                {queue()}
                <div className="panel-foot">
                  Invoice text is untrusted data. No AI extraction is running.
                </div>
              </section>
              {invoice ? (
                <section className="panel invoice-detail">
                  <div className="section-head">
                    <div>
                      <span className="eyebrow">{invoice.id}</span>
                      <h2>{vendorName(s, invoice.vendor_id)}</h2>
                    </div>
                    <Badge
                      status={
                        reasons.length
                          ? "Needs review"
                          : live
                            ? "Ready for worker"
                            : "Ready to simulate"
                      }
                    />
                  </div>
                  <div className="invoice-detail-body">
                    <div className="invoice-amount">
                      <Amount large value={invoice.amount} />
                      <small>
                        {live
                          ? "Requested payment · structured invoice"
                          : "Requested payment · synthetic invoice"}
                      </small>
                    </div>
                    <dl className="invoice-facts">
                      <div>
                        <dt>Work order</dt>
                        <dd>{invoice.order_id}</dd>
                      </div>
                      <div>
                        <dt>Invoice recipient</dt>
                        <dd className="mono">{invoice.recipient}</dd>
                      </div>
                      <div>
                        <dt>Approved recipient</dt>
                        <dd className="mono">
                          {s.orders.find((o) => o.id === invoice.order_id)
                            ?.recipient ?? "No order"}
                        </dd>
                      </div>
                    </dl>
                    <div
                      className={
                        "decision-box " +
                        (reasons.length ? "blocked" : "eligible")
                      }
                    >
                      <strong>
                        <Icon name="shield" size={18} />
                        {reasons.length
                          ? `${reasons.length} rule${reasons.length > 1 ? "s" : ""} require review`
                          : "Matches existing owner approval"}
                      </strong>
                      {reasons.length ? (
                        <ul>
                          {reasons.map((code) => (
                            <li key={code}>{reasonText[code]}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>
                          Exact recipient and amount match. Budget and order
                          guards permit{" "}
                          {live
                            ? "worker eligibility review"
                            : "this local simulation"}
                          .
                        </p>
                      )}
                    </div>
                    <label className="source-label">
                      {live
                        ? "Original invoice text"
                        : "Original sample invoice"}
                    </label>
                    <pre className="invoice-source">
                      {invoice.text || "No source text supplied."}
                    </pre>
                    <div className="invoice-actions">
                      <ActionButton busy={busy.length>0}
                        className="button secondary"
                        disabled={
                          readOnly ||
                          busy.includes("review") ||
                          invoice.reviewed
                        }
                        onClick={() =>
                          void run(
                            "review",
                            () => adapter.markReviewed(invoice.id),
                            "Review acknowledged. Failed rules still block payment.",
                          )
                        }
                      >
                        {invoice.reviewed
                          ? "Review acknowledged"
                          : "Mark reviewed"}
                      </ActionButton>
                      <ActionButton busy={busy.length>0}
                        className="button primary"
                        disabled={
                          readOnly ||
                          reasons.length > 0 ||
                          busy.includes("payment")
                        }
                        onClick={() =>
                          void run(
                            "payment",
                            () =>
                              live
                                ? live.enqueueInvoice(invoice.id)
                                : adapter.simulatePayment(invoice.id, scenario),
                            live
                              ? "Invoice queued. The worker reconciles finalized results before any new submission."
                              : "Simulation finished. Inspect its outcome in payment history.",
                          )
                        }
                      >
                        {busy.includes("payment")
                          ? live
                            ? "Queueing…"
                            : "Simulation in flight…"
                          : live
                            ? "Queue reviewed invoice"
                            : "Simulate payment"}
                        <Icon name="arrow" size={15} />
                      </ActionButton>
                    </div>
                    <p className="footnote">
                      {live
                        ? "Review acknowledgement grants no payment authority. Only finalized contract approvals authorize worker payments."
                        : "Review acknowledgement grants no payment authority. No real transaction or signature is created."}
                    </p>
                  </div>
                </section>
              ) : (
                <section className="panel empty">
                  {live
                    ? "Enter a structured invoice to begin."
                    : "Add a sample invoice to begin."}
                </section>
              )}
            </div>
          )}
          {view === "Payment history" && (
            <section className="panel">
              <div className="section-head">
                <div>
                  <span className="eyebrow">
                    {live
                      ? "Finalized contract attempts"
                      : "Simulated receipts"}
                  </span>
                  <h2>Every attempt stays visible</h2>
                </div>
                <label className="filter-label">
                  Outcome
                  <select
                    aria-label="Filter payment outcomes"
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value)}
                  >
                    {["All outcomes", "Pending", "Paid", "Failed"].map(
                      (status) => (
                        <option key={status}>{status}</option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              {history()}
              <div className="panel-foot">
                An unknown outcome stays pending and reserved. A refresh or
                timeout does not authorize a retry.
              </div>
            </section>
          )}
          {!live && (
            <section
              className="demo-tools"
              aria-label="Local simulation controls"
            >
              <div>
                <strong>Local simulation controls</strong>
                <small>
                  Saved invoices persist; other demo changes reset on reload. Wallet connection, funding and
                  deployment are unavailable.
                </small>
              </div>
              <label>
                Next transfer
                <select
                  aria-label="Next simulated transfer outcome"
                  value={scenario}
                  onChange={(e) =>
                    setScenario(e.target.value as TransferScenario)
                  }
                >
                  <option value="success">Confirmed success</option>
                  <option value="failure">Confirmed failure</option>
                  <option value="unknown">
                    Unknown outcome · stays locked
                  </option>
                </select>
              </label>
              <ActionButton busy={busy.length>0}
                className="text-button"
                onClick={() => {
                  adapter.failNextRequest();
                  void run("refresh", async () => {});
                }}
              >
                Simulate load error
              </ActionButton>
              <ActionButton busy={busy.length>0}
                className="text-button"
                onClick={() => {
                  adapter.reset();
                  setSelected("INV-1042");
                  setNotice("Synthetic workspace reset.");
                }}
              >
                Reset demo
              </ActionButton>
            </section>
          )}
          {live && ["Vendors", "Work orders"].includes(view) && <details className="reference-disclosure"><summary>Import existing {view === "Vendors" ? "vendor" : "work order"}</summary><TestnetControls key={view} adapter={live} snapshot={s} run={run} section="references" referenceKind={view === "Vendors" ? "vendor" : "order"}/></details>}
          <footer>
            <span>Nnetics · Payment desk</span>
            <span>
              <Icon name="shield" size={13} />
              Testnet deployment requires explicit authorization
            </span>
          </footer>
        </MainSurface>
      </div>
      {dialog && (
        <Modal
          live={!!live}
          title={
            dialog === "vendor"
              ? "Manage a vendor"
              : dialog === "order"
                ? "Approve a work order"
                : live
                  ? "Enter a structured invoice"
                  : "Add a sample invoice"
          }
          error={error}
          busy={busy.includes("form")}
          onClose={() => open(null)}
          onSubmit={(data) => void submit(data)}
        >
          {dialog === "vendor" && (
            <>
              <p>
                All {s.vendors.length} of 3 slots are used. Enter an existing ID
                to update its recipient and enable it. Approved orders keep
                their original recipient.
              </p>
              <label>
                Vendor ID
                <input
                  name="vendor_id"
                  required
                  maxLength={64}
                  defaultValue="writer"
                />
              </label>
              <label>
                Recipient account
                <input
                  name="recipient"
                  required
                  maxLength={64}
                  defaultValue="writer-demo.testnet"
                />
              </label>
            </>
          )}
          {dialog === "order" && (
            <>
              <p>
                This authorizes one exact payment. To change the approval later,
                revoke it and use a new order ID.
              </p>
              <label>
                New work order ID
                <input
                  name="order_id"
                  required
                  maxLength={64}
                  placeholder="article-004"
                />
              </label>
              <label>
                Vendor
                <select
                  name="vendor_id"
                  defaultValue={s.vendors.find((x) => x.active)?.id}
                >
                  {s.vendors
                    .filter((x) => x.active)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name} · {x.id}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Exact amount in NEAR
                <input
                  name="amount"
                  inputMode="decimal"
                  required
                  placeholder="2"
                />
              </label>
              <label>
                Expiry date
                <input
                  name="expiry"
                  type="date"
                  required
                  defaultValue={new Date(Date.now() + 14 * 86400000)
                    .toISOString()
                    .slice(0, 10)}
                />
              </label>
            </>
          )}
          {dialog === "invoice" && (
            <>
              <p>
                Enter {live ? "invoice" : "sample"} fields manually. No
                extractor is running. Conflicting fields will be flagged for
                review.
              </p>
              <p>Invoice reference assigned automatically on successful submission.</p>
              <p>Currency: NEAR · Testnet</p>
              <label>
                Claimed work order
                <select name="order_id" defaultValue={defaultOrder.id}>
                  {s.orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} · {o.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Requested amount in NEAR
                <input
                  name="amount"
                  inputMode="decimal"
                  required
                  defaultValue={formatNear(defaultOrder.amount)}
                />
              </label>
              <label>
                Invoice recipient
                <input
                  name="recipient"
                  required
                  maxLength={64}
                  defaultValue={defaultOrder.recipient}
                />
              </label>
              <label>
                {live ? "Original invoice text" : "Original sample text"}
                <textarea
                  name="text"
                  maxLength={8000}
                  rows={4}
                  placeholder={
                    live
                      ? "Optional source text; it cannot change payment authority."
                      : "Paste synthetic invoice text only."
                  }
                />
              </label>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
