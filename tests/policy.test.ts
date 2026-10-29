import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../src/policy.ts';
import type { Reason } from '../src/policy.ts';
import { scenario } from '../fixtures/scenario.ts';

test('approved invoice is eligible using exact integer amounts', () => {
  const s = scenario();
  assert.deepEqual(evaluate(s.invoice, s.order, s.ctx), { status: 'eligible', reasons: [] });
});

const cases: [string, (s: ReturnType<typeof scenario>) => void, Reason][] = [
  ['paused', s => { s.ctx.paused = true; }, 'PAUSED'],
  ['agent revoked', s => { s.ctx.agentAuthorized = false; }, 'AGENT_REVOKED'],
  ['vendor disabled', s => { s.ctx.vendorActive = false; }, 'VENDOR_INACTIVE'],
  ['order revoked', s => { s.order.status = 'revoked'; }, 'WORK_ORDER_REVOKED'],
  ['expiry boundary', s => { s.ctx.now = s.order.expiresAt; }, 'EXPIRED'],
  ['past expiry', s => { s.ctx.now = s.order.expiresAt + 1; }, 'EXPIRED'],
  ['paid order with new invoice ID', s => { s.invoice.id = 'NEW-ID'; s.ctx.paidWorkOrderIds = [s.order.id]; }, 'ALREADY_PAID'],
  ['in flight payment', s => { s.ctx.pendingWorkOrderIds = [s.order.id]; }, 'PAYMENT_PENDING'],
  ['invoice ID reused', s => { s.ctx.usedInvoiceIds = [s.invoice.id]; }, 'INVOICE_ALREADY_USED'],
  ['wrong work order', s => { s.invoice.workOrderId = 'WO-002'; }, 'WORK_ORDER_MISMATCH'],
  ['wrong vendor', s => { s.invoice.vendorId = 'designer'; }, 'VENDOR_MISMATCH'],
  ['changed recipient', s => { s.invoice.recipient = 'other-demo.testnet'; }, 'RECIPIENT_MISMATCH'],
  ['wrong asset', s => { s.invoice.asset = 'USDC'; }, 'ASSET_MISMATCH'],
  ['one yoctoNEAR over order', s => { s.invoice.amount = String(BigInt(s.order.amount) + 1n); }, 'AMOUNT_MISMATCH'],
  ['underpayment', s => { s.invoice.amount = '1'; }, 'AMOUNT_MISMATCH'],
  ['over payment cap', s => { s.ctx.maxPayment = '1'; }, 'PAYMENT_LIMIT'],
  ['over remaining budget', s => { s.ctx.remainingBudget = '1'; }, 'BUDGET_LIMIT'],
  ['insufficient spendable balance', s => { s.ctx.availableBalance = '1'; }, 'INSUFFICIENT_BALANCE'],
  ['zero amount', s => { s.invoice.amount = '0'; }, 'INVALID_INPUT'],
  ['negative amount', s => { s.invoice.amount = '-1'; }, 'INVALID_INPUT'],
  ['decimal amount', s => { s.invoice.amount = '2.0'; }, 'INVALID_INPUT'],
  ['exponent notation', s => { s.invoice.amount = '2e24'; }, 'INVALID_INPUT'],
  ['noncanonical leading zero', s => { s.invoice.amount = '01'; }, 'INVALID_INPUT'],
  ['missing amount', s => { s.invoice.amount = undefined as never; }, 'INVALID_INPUT'],
  ['empty invoice ID', s => { s.invoice.id = ''; }, 'INVALID_INPUT'],
  ['padded invoice ID', s => { s.invoice.id = ' INV-001 '; }, 'INVALID_INPUT'],
  ['invalid recipient', s => { s.invoice.recipient = 'Writer.testnet'; }, 'INVALID_INPUT'],
  ['nonboolean authorization', s => { s.ctx.agentAuthorized = 'true' as never; }, 'INVALID_INPUT'],
  ['missing ledger', s => { s.ctx.paidWorkOrderIds = undefined as never; }, 'INVALID_INPUT'],
  ['invalid time', s => { s.ctx.now = NaN; }, 'INVALID_INPUT']
];
for (const [name, mutate, expected] of cases) test(name, () => {
  const s = scenario(); mutate(s);
  const result = evaluate(s.invoice, s.order, s.ctx);
  assert.equal(result.status, 'review');
  assert.ok(result.reasons.includes(expected));
});
test('exact budget, cap and balance boundary is eligible', () => {
  const s = scenario();
  s.ctx.maxPayment = s.ctx.remainingBudget = s.ctx.availableBalance = s.invoice.amount;
  assert.equal(evaluate(s.invoice, s.order, s.ctx).status, 'eligible');
});
test('reports concurrent policy failures for review', () => {
  const s = scenario(); s.ctx.paused = true; s.ctx.agentAuthorized = false;
  assert.deepEqual(evaluate(s.invoice, s.order, s.ctx).reasons, ['PAUSED', 'AGENT_REVOKED']);
});
test('evaluation does not mutate approved inputs', () => {
  const s = scenario(); const before = structuredClone(s);
  evaluate(s.invoice, s.order, s.ctx);
  assert.deepEqual(s, before);
});
