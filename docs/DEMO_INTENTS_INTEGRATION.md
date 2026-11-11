# Main application integration: demo Intents

Integrated on November 11, 2026 into `feature/nnetics-v3` in the existing
`C:\Users\Kazi\Documents\PayScope_Foundation\payscope` application.

## Git integration and recovery

- Target checkpoint: `checkpoint/nnetics-v3-before-demo-intents-20261111`,
  pointing to `21d30e0`.
- Source: `feature/nnetics-demo-intents`, including finalized implementation
  commit `4bdd144` in the preserved `payscope-demo-intents` worktree.
- Method: non-fast-forward merge, followed by main-dashboard integration in the
  merge result. The merge had no conflicts. No shared history was rewritten;
  nothing was force-pushed or deployed.
- The target worktree was clean before integration. The feature's remaining
  uncommitted work was preserved in its own commit before merging. Both the
  feature branch and isolated worktree are retained.
- SQLite online backups of existing demo workspace, demo contractor and
  persistent contractor databases were saved before migration under
  `artifacts/checkpoints/demo-intents-20261111`. These private local artifacts
  are not committed.

The final integration commit is the merge commit on `feature/nnetics-v3`;
`git log -1 --merges --oneline` identifies it. The chat handoff supplies its hash.

## Where the functionality lives

Users open the existing application at `http://127.0.0.1:3100/?mode=demo`.
No standalone owner preview or new navigation system is needed.

- **Contractors:** create a contractor, issue their existing private portal link,
  and approve wallet requests. Wallet management remains in Wallet Details.
- **Contractor portal:** Send a bill defaults to No work order, permits submission
  before wallet approval, preserves text/uploads/clarification, assigns the
  invoice number automatically, and has no invoice wallet input. These billing
  changes also apply to persistent organizations with their existing identity
  and revocable-link checks.
- **Invoices:** review unlinked bills, approve/reject/request clarification, or
  associate an existing work order. The actual persistent owner Invoices screen
  now uses the existing authorized review component rather than a summary-only
  list. In Demo Mode, approved/paid bills expose Simulated NEAR Intents in this
  same screen. Real organizations never render the simulator.
- **Payments:** the existing queue displays simulated intent attempts alongside
  existing demo payments. Open invoice payments leads to the existing Invoices
  destination for quote review and authorization.
- **Overview:** confirmed payouts and current vault balances refresh when an
  invoice intent is authorized, executed or settled. Paid invoice status is read
  from the same contractor store.
- **Activity:** existing payment history/receipts display simulation references;
  Audit events also projects the immutable simulator event records. The complete
  per-attempt audit remains available inside its invoice.
- **Refresh workspace:** refreshes the embedded invoice review and portal-derived
  dashboard data even when the ledger revision has not changed. This covers a
  contractor submitting another bill while the owner remains on Invoices.
- **Ask Nnetics:** the existing interface and model-driven `/api/agent` route
  expose unlinked invoices, payment eligibility, read-only illustrative quote
  previews and persisted payment status. Its preview shares the simulator's
  exact source-amount, fee, rate and mock-solver calculation. It cannot approve,
  authorize or execute payment. The View invoices action returns to the same
  dashboard review flow.

## Architecture and safety

The feature's billing schema migration, demo-only adapter, guards, append-only
audit events, deterministic scenarios, integer accounting, idempotency and
restart reconciliation are described in [the implementation report](DEMO_INTENTS_DELIVERY.md).

The simulator never invokes real payment execution. Source assets are clearly
illustrative allocations against one NEAR-equivalent demo vault, with fixed
example rates. Approved wallets are resolved server-side; invoice/AI recipient
claims cannot override them. Wallet versions are revalidated before execution.
Failure/refund releases reserved funds and leaves the approved bill retryable.

The merge does not change the sign-in/onboarding page, identity implementation,
dashboard navigation, theme tokens, provider credentials/configuration or live
transaction gate implementation. Existing production/testnet execution remains
subject to its existing permissions and verified agreement requirements.

## Verification on the integration target

These are new runs against the main application, not copied feature-branch
results:

- Root Node tests: **42 passed**.
- Owner/server tests: **336 passed**. This includes an additional controlled-model
  route test proving the real assistant executor returns the same eligible
  4.01 USDC preview and approved recipient as the simulator without reserving or
  paying funds. Audit projection is checked against the same persisted events.
- Main-dashboard end-to-end test: **desktop and mobile passed**. It creates and
  funds a demo workspace through the existing UI, submits a bill before wallet
  approval, verifies the missing-wallet guard, approves the wallet and invoice,
  completes a cross-asset simulation, checks Overview/Payments/Activity, verifies
  refresh persistence, and exercises both failure and refund followed by recovery.
- Existing Ask Nnetics UI: the configured-provider integration test passed,
  returning the correct source amount and recipient and navigating to invoice
  review without changing payment state.
- Production build, explicit typecheck and theme contrast checks passed.
- Mechanical UI detector and Git whitespace checks passed.

- Complete integrated browser regression: **208 passed, 2 skipped, 2 failed**
  in 10.8 minutes. Both failures were the desktop tests that call the external
  configured AI provider; both received HTTP **429 rate-limited**. The two mobile
  copies intentionally skip because provider behavior is checked on desktop.
  All other desktop/mobile regressions passed, including the new main-dashboard
  flow and the existing isolated feature-route tests.
- One bounded retry of those two provider-dependent tests after the cooldown,
  this time against the actual main server on port 3100, again received HTTP
  429. The existing provider configuration was not changed to bypass the limit.
  The initial configured-provider intent-preview check had passed before these
  repeated regression requests. Controlled-provider route/permission tests pass.
- Final running-app verification: the main application was rebuilt and its
  existing local server restarted on **3100**. The home/demo route returned HTTP
  **200**, and the complete main-dashboard billing/payment/failure/refund test
  passed against that running server (42.8 seconds). This run used the actual
  main app's default build and database configuration, with an isolated browser
  session; it did not open a standalone owner preview.
- The main server remains available at `http://127.0.0.1:3100/?mode=demo`.

The remaining limitation is external AI-provider availability: Ask Nnetics may
currently show its existing rate-limit message until the provider permits more
requests. Billing and simulated payments work without that provider. No local
application regression remains in the tested workflows.

## Launch and test

From `C:\Users\Kazi\Documents\PayScope_Foundation\payscope\apps\owner`:

```powershell
npm run build
npm run start
```

Open `http://127.0.0.1:3100/?mode=demo`. If an older local server already owns
3100, stop that known server before running `npm run start`; do not launch a
different standalone app. The existing `.env.local` is preserved. The billing
and simulated-payment flow needs no API key or wallet signer. Ask Nnetics uses
the application's existing AI provider configuration.

1. Create/fund a demo workspace, then open Contractors and add a contractor.
2. Open the contractor's private link. Send a bill with No work order and no
   invoice wallet field. Wallet approval can happen before or after submission.
3. Request a wallet from Wallet Details and approve it from Contractors.
4. Open Invoices, refresh workspace if necessary, and approve the bill.
5. Expand Simulated NEAR Intents. Select a demo source asset and preview its quote.
6. Review the destination and illustrative fees, check the confirmation box,
   authorize the simulation and execute it.
7. Check Paid status, Overview, Payments and Activity/audit history; refresh.
8. Repeat with Solver failure and Failed route/refund outcomes, then retry a
   successful quote on the same approved bill.
9. In Ask Nnetics, request eligibility and a simulated USDC quote preview for
   that invoice's exact reference/ID. Use View invoices for manual authorization.

Re-run verification with `npm test` at the root, then `npm test`,
`npm run typecheck`, `npm run build`, `npm run check:theme` and
`npm run test:browser` in `apps/owner`. The focused main-dashboard test is
`npm run test:browser -- demo-intents-integration.spec.ts`.

## Files and components

The implementation report lists the merged billing, simulator, API, UI and tool
files. Integration additionally changes:

- `apps/owner/src/app/page.tsx`: main invoice review, parent refresh, Payments link.
- `apps/owner/src/app/contractor-owner.tsx`: embedded panel refresh notifications.
- `apps/owner/src/app/simulated-intent.tsx`: notify on state changes, avoiding a
  repeated dashboard refresh for every unchanged polling response.
- `apps/owner/src/server/demo-workspace.ts`: immutable audit projection into Activity.
- `apps/owner/src/server/demo-intents.ts`: shared illustrative quote calculation.
- `apps/owner/src/server/agent-tool-executor.ts`: consistent previews and session scope.
- `apps/owner/tests/browser/demo-intents-integration.spec.ts`: actual dashboard flow
  and configured-provider Ask Nnetics integration.
- `apps/owner/tests/agent-route.test.ts` and `demo-intents.test.ts`: shared previews
  and Activity audit evidence.
- This integration report.

## Production boundary

This is an integrated **simulation**, not real NEAR Intents settlement. No live
swaps, deposits, signatures, transfers or blockchain confirmations are added.
Future production integration requires a separately reviewed adapter and verified
settlement reconciliation. Existing financial execution has not been replaced
with simulated success.
