/** Reference policy only. The NEAR contract must enforce payment rules atomically. */
export type WorkOrder = {
  id: string;
  vendorId: string;
  recipient: string;
  amount: string;
  asset: 'NEAR';
  expiresAt: number;
  status: 'approved' | 'revoked';
};
export type Invoice = {
  id: string;
  workOrderId: string;
  vendorId: string;
  recipient: string;
  amount: string;
  asset: string;
};
export type Context = {
  now: number;
  paused: boolean;
  agentAuthorized: boolean;
  vendorActive: boolean;
  availableBalance: string;
  remainingBudget: string;
  maxPayment: string;
  paidWorkOrderIds: readonly string[];
  pendingWorkOrderIds: readonly string[];
  usedInvoiceIds: readonly string[];
};
export type Reason =
  | 'INVALID_INPUT' | 'PAUSED' | 'AGENT_REVOKED' | 'VENDOR_INACTIVE'
  | 'WORK_ORDER_REVOKED' | 'EXPIRED' | 'ALREADY_PAID' | 'PAYMENT_PENDING'
  | 'INVOICE_ALREADY_USED' | 'WORK_ORDER_MISMATCH' | 'VENDOR_MISMATCH'
  | 'RECIPIENT_MISMATCH' | 'ASSET_MISMATCH' | 'AMOUNT_MISMATCH'
  | 'PAYMENT_LIMIT' | 'BUDGET_LIMIT' | 'INSUFFICIENT_BALANCE';
export type Decision = { status: 'eligible' | 'review'; reasons: Reason[] };

const uint = (v: unknown): v is string => typeof v === 'string' && /^(0|[1-9][0-9]*)$/.test(v);
const id = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v === v.trim();
// MVP uses named testnet accounts. Full account validation remains a contract/SDK concern.
const recipient = (v: unknown): v is string => id(v) && v.length <= 64 &&
  /^[a-z0-9]+(?:[-_][a-z0-9]+)*(?:\.[a-z0-9]+(?:[-_][a-z0-9]+)*)*\.testnet$/.test(v);

export function evaluate(invoice: Invoice, order: WorkOrder, ctx: Context): Decision {
  const invalid: Decision = { status: 'review', reasons: ['INVALID_INPUT'] };
  // Runtime checks also protect callers loading untrusted JSON, despite TypeScript types.
  if (!invoice || !order || !ctx ||
      ![invoice.id, invoice.workOrderId, invoice.vendorId, order.id, order.vendorId].every(id) ||
      !recipient(invoice.recipient) || !recipient(order.recipient) ||
      ![invoice.amount, order.amount, ctx.availableBalance, ctx.remainingBudget, ctx.maxPayment].every(uint) ||
      !Number.isSafeInteger(ctx.now) || ctx.now < 0 ||
      !Number.isSafeInteger(order.expiresAt) || order.expiresAt < 0 ||
      ![ctx.paused, ctx.agentAuthorized, ctx.vendorActive].every(v => typeof v === 'boolean') ||
      !['approved', 'revoked'].includes(order.status) || order.asset !== 'NEAR' ||
      typeof invoice.asset !== 'string' ||
      ![ctx.paidWorkOrderIds, ctx.pendingWorkOrderIds, ctx.usedInvoiceIds].every(v => Array.isArray(v) && v.every(id))) return invalid;
  const amount = BigInt(invoice.amount);
  if (amount <= 0n || BigInt(order.amount) <= 0n) return invalid;
  const reasons: Reason[] = [];
  const check = (fails: boolean, reason: Reason) => { if (fails) reasons.push(reason); };
  check(ctx.paused, 'PAUSED');
  check(!ctx.agentAuthorized, 'AGENT_REVOKED');
  check(!ctx.vendorActive, 'VENDOR_INACTIVE');
  check(order.status !== 'approved', 'WORK_ORDER_REVOKED');
  check(ctx.now >= order.expiresAt, 'EXPIRED');
  check(ctx.paidWorkOrderIds.includes(order.id), 'ALREADY_PAID');
  check(ctx.pendingWorkOrderIds.includes(order.id), 'PAYMENT_PENDING');
  check(ctx.usedInvoiceIds.includes(invoice.id), 'INVOICE_ALREADY_USED');
  check(invoice.workOrderId !== order.id, 'WORK_ORDER_MISMATCH');
  check(invoice.vendorId !== order.vendorId, 'VENDOR_MISMATCH');
  check(invoice.recipient !== order.recipient, 'RECIPIENT_MISMATCH');
  check(invoice.asset !== order.asset, 'ASSET_MISMATCH');
  check(invoice.amount !== order.amount, 'AMOUNT_MISMATCH');
  check(amount > BigInt(ctx.maxPayment), 'PAYMENT_LIMIT');
  check(amount > BigInt(ctx.remainingBudget), 'BUDGET_LIMIT');
  check(amount > BigInt(ctx.availableBalance), 'INSUFFICIENT_BALANCE');
  return { status: reasons.length ? 'review' : 'eligible', reasons };
}
