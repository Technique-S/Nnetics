import type { Context, Invoice, WorkOrder } from '../src/policy.ts';

export const ONE_NEAR = 10n ** 24n;
export function scenario(): { invoice: Invoice; order: WorkOrder; ctx: Context } {
  return {
    invoice: { id: 'INV-001', workOrderId: 'WO-001', vendorId: 'writer', recipient: 'writer-demo.testnet', amount: String(2n * ONE_NEAR), asset: 'NEAR' },
    order: { id: 'WO-001', vendorId: 'writer', recipient: 'writer-demo.testnet', amount: String(2n * ONE_NEAR), asset: 'NEAR', expiresAt: 1793577600, status: 'approved' },
    ctx: { now: 1793232000, paused: false, agentAuthorized: true, vendorActive: true, availableBalance: String(10n * ONE_NEAR), remainingBudget: String(6n * ONE_NEAR), maxPayment: String(3n * ONE_NEAR), paidWorkOrderIds: [], pendingWorkOrderIds: [], usedInvoiceIds: [] }
  };
}
export const vendors = [
  { id: 'writer', label: 'Writer', recipient: 'writer-demo.testnet' },
  { id: 'designer', label: 'Designer', recipient: 'designer-demo.testnet' },
  { id: 'editor', label: 'Video editor', recipient: 'editor-demo.testnet' }
];
// Illustrative fixture accounts only; these have not been provisioned or verified.
