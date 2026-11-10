// Demo workspace adapter: the ?mode=demo dashboard speaks the frozen
// OwnerAdapter contract, but every record comes from the visitor's own
// server-backed demo workspace (Cookie session, SQLite, simulated funds only).
// Live client code stays untouched: no keys, no signing, no live requests.
//
// Money crosses this boundary as canonical yoctoNEAR, exactly like every other
// monetary field in the application. A NEAR decimal typed by the visitor is
// converted here, once, at the edge — never inside the ledger and never with
// floating point.
import { account, amountFromNear, NEAR, uint } from "./owner-adapter.ts";
import type {
  Invoice,
  OwnerAdapter,
  OwnerCommand,
  OwnerSnapshot,
  Payment,
  TransferScenario,
  Vault,
} from "./owner-adapter.ts";
import { DEMO_AGENT, type ContractorPaymentDraft } from "./mock-adapter.ts";

export { DEMO_FEE } from "./demo-constants.ts";

// Wire DTOs mirror the JSON the workspace route returns (snapshot with the
// session token stripped server-side).
export type DemoWsPaymentStatus = "prepared" | "pending" | "confirmed" | "failed" | "cancelled";

export interface DemoWsPayment {
  id: string;
  contractor: string;
  recipient: string;
  amount: string;
  fee: string;
  total: string;
  description: string;
  status: DemoWsPaymentStatus;
  reason: string;
  reference: string;
  createdAt: string;
  settledAt: string | null;
  billId: string | null;
  awaitingConfirmation: boolean;
}
export interface DemoWsHistory {
  id: string;
  kind: "funding" | "payment" | "control";
  label: string;
  amount: string;
  status: string;
  at: string;
}
export interface DemoWsReceipt {
  id: string;
  contractor: string;
  recipient: string;
  amount: string;
  reference: string;
  summary: string;
  at: string;
}
export interface DemoWsSnapshot {
  mode: "simulation";
  initialized: boolean;
  revision: number;
  profile: { name: string; vaultName: string; createdAt: string };
  vault: { funded: string; spent: string; reserved: string; limit: string; available: string; paused: boolean };
  payments: DemoWsPayment[];
  history: DemoWsHistory[];
  receipts: DemoWsReceipt[];
  scenario: "success" | "failure" | "unknown";
}

// A prepared payment and the single-use secret that binds the owner's
// confirmation to this exact attempt.
export interface PreparedDemoPayment {
  payment: DemoWsPayment;
  confirmationSecret: string;
}

const DEMO_OWNER = "owner-demo.testnet";
const OPEN_CAP = (1_100_000n * NEAR).toString(); // Display-only cap when no demo limit is set.

async function call<T>(path: string, body: unknown, method: "GET" | "POST"): Promise<T> {
  const response = await fetch(`/api/demo/workspace/${path}`, {
    method,
    cache: "no-store",
    ...(method === "POST" ? {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {})
    } : {})
  });
  const data = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok || !data)
    throw new Error(data?.error || `The demo workspace is unavailable. Retry refresh.`);
  return data as T;
}

// A NEAR decimal from a form becomes a canonical yoctoNEAR integer here.
// Nothing downstream ever sees a decimal amount.
function toYocto(amount: string, label: string): string {
  const text = String(amount ?? "").trim();
  if (!text) throw new Error(`Enter ${label}.`);
  return amountFromNear(text).toString();
}

export class DemoWorkspaceAdapter implements OwnerAdapter {
  readonly mode = "simulation" as const;
  readonly deploymentEnabled = false as const;
  private current: OwnerSnapshot | null = null;
  private raw: DemoWsSnapshot | null = null;
  private names = new Map<string, string>(); // payment reference → contractor display name
  private listeners = new Set<() => void>();
  private fail = false;

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  private emit() {
    for (const listener of this.listeners) listener();
  }
  private check() {
    if (this.fail) {
      this.fail = false;
      throw new Error(
        "Simulated demo request failed. No payment was executed anywhere. Refresh to inspect current state.",
      );
    }
  }

  async snapshot(): Promise<OwnerSnapshot> {
    this.check();
    let raw: DemoWsSnapshot;
    try {
      raw = await call<DemoWsSnapshot>("state", null, "GET");
    } catch (error) {
      // First visit: no demo session cookie exists yet, so GET state answers
      // "Start a demo workspace first." Mint the session (the response also
      // sets the cookie) and use the snapshot the start endpoint returns.
      if (!/Start a demo workspace first/.test(String(error))) throw error;
      raw = await call<DemoWsSnapshot>("start", null, "POST");
    }
    this.raw = raw;
    this.names.clear();
    for (const p of raw.payments)
      this.names.set(p.reference, p.contractor || p.recipient);
    // Newest first from the store: assign attempt numbers oldest → newest.
    const payments: Payment[] = raw.payments.map((p, index) => ({
      attempt_id: uint(String(raw.payments.length - index), (1n << 64n) - 1n),
      order_id: p.billId ?? "",
      invoice_id: p.reference,
      recipient: account(p.recipient || DEMO_OWNER),
      amount: uint(p.amount || "0"),
      initiated_at_ns: uint((BigInt(Date.parse(p.createdAt) || 0) * 1_000_000n).toString(), (1n << 64n) - 1n),
      status: p.status === "pending" || p.status === "prepared" ? "Pending" : p.status === "confirmed" ? "Paid" : "Failed",
      reference: p.reference,
    }));
    const vault: Vault = {
      owner: account(DEMO_OWNER),
      agent: structuredClone(DEMO_AGENT),
      paused: raw.vault.paused === true,
      budget: uint((BigInt(raw.vault.funded) + BigInt(raw.vault.spent) + BigInt(raw.vault.reserved) + BigInt(OPEN_CAP)).toString()),
      payment_cap: uint(raw.vault.limit ? raw.vault.limit : OPEN_CAP),
      funded: uint(raw.vault.funded || "0"),
      spent: uint(raw.vault.spent || "0"),
      reserved: uint(raw.vault.reserved || "0"),
      last_attempt: uint(String(raw.payments.length)),
    };
    // Mapped invoices give the shared tab logic a description for every demo record.
    const invoices: Invoice[] = raw.payments.map(p => ({
      id: p.reference,
      order_id: "",
      vendor_id: "",
      recipient: account(p.recipient || DEMO_OWNER),
      amount: uint(p.amount || "0"),
      asset: "NEAR",
      text: `${p.description} · Demo · simulated funds, no live transfer.`,
      reviewed: true,
    }));
    this.current = {
      mode: "simulation",
      revision: raw.revision,
      vendors: [],
      orders: [],
      invoices,
      vault,
      payments,
      audit: raw.history.map((entry, index) => ({ id: index, description: entry.label, time: entry.at })),
    };
    return structuredClone(this.current);
  }
  failNextRequest() { this.fail = true; }
  reset() { void this.resetWorkspace().catch(() => {}); }

  // Live-owner adapter operations are not part of the demo path; the demo
  // flows call their labelled demo extras instead.
  async command(_command: OwnerCommand): Promise<void> {
    throw new Error("Demo vault actions run in the Demo Wallet and contractor panels.");
  }
  async addInvoice(_draft: Omit<Invoice, "reviewed">): Promise<void> {
    throw new Error("Demo bills are submitted in the contractor portal.");
  }
  async markReviewed(_id: string): Promise<void> {
    throw new Error("Demo bills are reviewed in the contractor panel.");
  }
  async simulatePayment(_id: string, _scenario: TransferScenario): Promise<void> {
    throw new Error("Demo payments are prepared in the Payments workspace.");
  }

  // --- Demo extras -------------------------------------------------------
  async createWorkspace(profileName: string, vaultName: string): Promise<DemoWsSnapshot> {
    this.check();
    return call<DemoWsSnapshot>("create", { profileName, vaultName }, "POST");
  }
  async fund(amount: string): Promise<void> {
    this.check();
    await call<DemoWsSnapshot>("fund", { amount: toYocto(amount, "a funding amount") }, "POST");
    this.emit();
  }
  async setScenario(scenario: "success" | "failure"): Promise<void> {
    this.check();
    await call<DemoWsSnapshot>("scenario", { scenario }, "POST");
    this.emit();
  }
  async setLimit(amount: string): Promise<void> {
    this.check();
    const limit = String(amount ?? "").trim() === "" ? "" : toYocto(amount, "a spending limit");
    await call<DemoWsSnapshot>("limit", { amount: limit }, "POST");
    this.emit();
  }
  async setPaused(paused: boolean): Promise<void> {
    this.check();
    await call<DemoWsSnapshot>("pause", { paused }, "POST");
    this.emit();
  }
  async resetWorkspace(): Promise<void> {
    this.check();
    await call<DemoWsSnapshot>("reset", null, "POST");
    this.emit();
  }
  // Phase one: validate, reserve and wait for the owner's confirmation. The
  // draft amount is already canonical yoctoNEAR.
  async preparePayment(draft: ContractorPaymentDraft, billId?: string): Promise<PreparedDemoPayment> {
    this.check();
    const result = await call<{ payment: DemoWsPayment; confirmationSecret: string }>("payment/prepare", {
      idempotencyKey: draft.id,
      recipient: draft.recipient,
      amount: draft.amount,
      description: draft.description,
      contractor: draft.name,
      ...(billId ? { billId } : {})
    }, "POST");
    this.emit();
    return result;
  }
  // Phase two: the owner's explicit confirmation. A repeated confirmation
  // resolves to the same attempt and never debits twice.
  async confirmPayment(paymentId: string, confirmationSecret: string): Promise<DemoWsPayment> {
    this.check();
    const result = await call<{ payment: DemoWsPayment }>("payment/confirm", {
      paymentId,
      confirmationSecret
    }, "POST");
    this.emit();
    return result.payment;
  }
  async cancelPayment(paymentId: string): Promise<DemoWsPayment> {
    this.check();
    const result = await call<{ payment: DemoWsPayment }>("payment/cancel", { paymentId }, "POST");
    this.emit();
    return result.payment;
  }
  async assistantStatus(): Promise<{ configured: boolean; model: string | null; provider: string | null }> {
    const response = await fetch("/api/demo/assistant", { cache: "no-store" });
    if (!response.ok) return { configured: false, model: null, provider: null };
    const data = await response.json().catch(() => null) as
      | { configured?: boolean; model?: string | null; provider?: string | null } | null;
    return {
      configured: data?.configured === true,
      model: typeof data?.model === "string" ? data.model : null,
      provider: typeof data?.provider === "string" ? data.provider : null
    };
  }
  async assistantConfigured(): Promise<boolean> {
    return (await this.assistantStatus()).configured;
  }
  contractorName(reference: string) {
    return this.names.get(reference);
  }
  // Raw demo data for demo-only panels (funding records, limit, scenario,
  // receipts with their store-composed summaries).
  demo(): DemoWsSnapshot | null {
    return this.raw;
  }
}
