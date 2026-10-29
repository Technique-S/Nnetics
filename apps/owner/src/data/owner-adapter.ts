// JSON DTOs preserve the frozen Rust contract's field names and integer strings.
// There is deliberately no live adapter, wallet capability or deployment method.
export type UInt = string & { readonly __uint: unique symbol };
export type AccountId = string & { readonly __account: unique symbol };
export const DEPLOYMENT_ENABLED = false as const;
export const NEAR = 10n ** 24n;
export function uint(value: string, maximum = (1n << 128n) - 1n): UInt {
  if (!/^(0|[1-9][0-9]*)$/.test(value) || BigInt(value) > maximum)
    throw new Error("Use a canonical unsigned integer.");
  return value as UInt;
}
export function account(value: string): AccountId {
  if (
    value.length < 2 ||
    value.length > 64 ||
    !/^[a-z0-9]+(?:[-_][a-z0-9]+)*(?:\.[a-z0-9]+(?:[-_][a-z0-9]+)*)*$/.test(
      value,
    )
  )
    throw new Error("Enter a valid NEAR account ID.");
  return value as AccountId;
}
export function amountFromNear(input: string): UInt {
  if (!/^(0|[1-9][0-9]*)(?:\.[0-9]{1,24})?$/.test(input))
    throw new Error("Use an exact NEAR amount, with up to 24 decimal places.");
  const [whole, fraction = ""] = input.split(".");
  const value = uint(
    (BigInt(whole) * NEAR + BigInt(fraction.padEnd(24, "0"))).toString(),
  );
  if (BigInt(value) === 0n) throw new Error("The amount must be positive.");
  return value;
}
export function formatNear(value: UInt | string): string {
  const n = BigInt(value);
  const fraction = (n % NEAR).toString().padStart(24, "0").replace(/0+$/, "");
  return (n / NEAR).toString() + (fraction ? "." + fraction : "");
}
export interface Vendor {
  id: string;
  name: string;
  role: string;
  recipient: AccountId;
  active: boolean;
}
export interface WorkOrder {
  id: string;
  title: string;
  vendor_id: string;
  recipient: AccountId;
  amount: UInt;
  expires_at_ns: UInt;
  enabled: boolean;
  status: "Approved" | "Pending" | "Paid";
  current_attempt: UInt;
  attempts: number;
}
export type PaymentStatus =
  | "Pending"
  | "TransferSucceeded"
  | "TransferFailed"
  | "Paid"
  | "Failed";
export interface Payment {
  attempt_id: UInt;
  order_id: string;
  invoice_id: string;
  recipient: AccountId;
  amount: UInt;
  initiated_at_ns: UInt;
  status: PaymentStatus;
  reference: string;
}
export interface Invoice {
  id: string;
  order_id: string;
  vendor_id: string;
  recipient: AccountId;
  amount: UInt;
  asset: string;
  text: string;
  reviewed: boolean;
}
export interface Vault {
  owner: AccountId;
  agent: { account_id: AccountId; public_key: string } | null;
  paused: boolean;
  budget: UInt;
  payment_cap: UInt;
  funded: UInt;
  spent: UInt;
  reserved: UInt;
  last_attempt: UInt;
}
export interface OwnerSnapshot {
  mode: "simulation";
  revision: number;
  vault: Vault;
  vendors: Vendor[];
  orders: WorkOrder[];
  invoices: Invoice[];
  payments: Payment[];
  audit: { id: number; description: string; time: string }[];
}
// Each variant keeps the exact owner method name and argument shape. Off-chain
// labels, invoice review and simulated execution remain separate operations.
export type OwnerCommand =
  | { method: "set_paused"; args: { paused: boolean } }
  | { method: "revoke_agent"; args: Record<string, never> }
  | {
      method: "authorize_agent";
      args: { account_id: AccountId; public_key: string };
    }
  | {
      method: "register_vendor";
      args: { vendor_id: string; recipient: AccountId };
    }
  | { method: "disable_vendor"; args: { vendor_id: string } }
  | {
      method: "approve_work_order";
      args: {
        order_id: string;
        vendor_id: string;
        amount: UInt;
        expires_at_ns: UInt;
      };
    }
  | { method: "revoke_work_order"; args: { order_id: string } };
export type TransferScenario = "success" | "failure" | "unknown";
export type ReviewCode =
  | "PAUSED"
  | "AGENT_REVOKED"
  | "VENDOR_INACTIVE"
  | "ORDER_MISSING"
  | "ORDER_REVOKED"
  | "EXPIRED"
  | "ALREADY_PAID"
  | "PAYMENT_PENDING"
  | "INVOICE_USED"
  | "VENDOR_MISMATCH"
  | "RECIPIENT_MISMATCH"
  | "AMOUNT_MISMATCH"
  | "ASSET_MISMATCH"
  | "PAYMENT_LIMIT"
  | "BUDGET_LIMIT"
  | "INSUFFICIENT_FUNDS";
export const reasonText: Record<ReviewCode, string> = {
  PAUSED: "New payments are paused.",
  AGENT_REVOKED: "Worker authority has been revoked.",
  VENDOR_INACTIVE: "The vendor is disabled.",
  ORDER_MISSING: "No approved work order matches this reference.",
  ORDER_REVOKED: "This work order was revoked.",
  EXPIRED: "The work order has expired.",
  ALREADY_PAID: "This work order has already been paid.",
  PAYMENT_PENDING: "A payment is already pending. Its funds remain reserved.",
  INVOICE_USED: "This invoice reference is already claimed.",
  VENDOR_MISMATCH: "The invoice vendor differs from the approved order.",
  RECIPIENT_MISMATCH:
    "The invoice recipient differs from the approved recipient.",
  AMOUNT_MISMATCH: "The amount must exactly match the approved order.",
  ASSET_MISMATCH: "Only native NEAR is supported.",
  PAYMENT_LIMIT: "The amount exceeds the payment cap.",
  BUDGET_LIMIT: "The amount exceeds the uncommitted budget.",
  INSUFFICIENT_FUNDS: "The payment ledger has insufficient uncommitted funds.",
};
export function review(
  snapshot: OwnerSnapshot,
  invoice: Invoice,
  now = BigInt(Date.now()) * 1_000_000n,
): ReviewCode[] {
  const order = snapshot.orders.find((o) => o.id === invoice.order_id);
  if (!order) return ["ORDER_MISSING"];
  const v = snapshot.vault,
    reasons: ReviewCode[] = [];
  const check = (failed: boolean, code: ReviewCode) => {
    if (failed) reasons.push(code);
  };
  check(v.paused, "PAUSED");
  check(!v.agent, "AGENT_REVOKED");
  check(
    !snapshot.vendors.find((x) => x.id === order.vendor_id)?.active,
    "VENDOR_INACTIVE",
  );
  check(!order.enabled, "ORDER_REVOKED");
  check(now >= BigInt(order.expires_at_ns), "EXPIRED");
  check(order.status === "Paid", "ALREADY_PAID");
  check(order.status === "Pending", "PAYMENT_PENDING");
  check(
    snapshot.payments.some(
      (p) => p.invoice_id === invoice.id && p.status !== "Failed",
    ),
    "INVOICE_USED",
  );
  check(invoice.vendor_id !== order.vendor_id, "VENDOR_MISMATCH");
  check(invoice.recipient !== order.recipient, "RECIPIENT_MISMATCH");
  check(invoice.asset !== "NEAR", "ASSET_MISMATCH");
  check(
    invoice.amount !== order.amount || BigInt(invoice.amount) === 0n,
    "AMOUNT_MISMATCH",
  );
  check(BigInt(invoice.amount) > BigInt(v.payment_cap), "PAYMENT_LIMIT");
  const committed = BigInt(v.spent) + BigInt(v.reserved);
  check(BigInt(invoice.amount) + committed > BigInt(v.budget), "BUDGET_LIMIT");
  check(
    BigInt(invoice.amount) + committed > BigInt(v.funded),
    "INSUFFICIENT_FUNDS",
  );
  return reasons;
}
export interface OwnerAdapter {
  readonly mode: "simulation";
  readonly deploymentEnabled: false;
  snapshot(): Promise<OwnerSnapshot>;
  subscribe(listener: () => void): () => void;
  command(command: OwnerCommand): Promise<void>;
  addInvoice(draft: Omit<Invoice, "reviewed">): Promise<void>;
  markReviewed(id: string): Promise<void>;
  simulatePayment(id: string, scenario: TransferScenario): Promise<void>;
  reset(): void;
  failNextRequest(): void;
}
