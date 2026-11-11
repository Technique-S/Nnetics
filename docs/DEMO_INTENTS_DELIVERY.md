# Demo NEAR Intents and optional contractor billing

> This feature has now been integrated into the main `payscope` application on
> `feature/nnetics-v3`. See [main integration results and launch instructions](DEMO_INTENTS_INTEGRATION.md).
> The worktree and verification details below record the original implementation.

Implementation date: November 11, 2026. Branch: `feature/nnetics-demo-intents`.

The implementation is in the isolated worktree
`C:\Users\Kazi\Documents\PayScope_Foundation\payscope-demo-intents`.
During implementation the original `payscope` checkout was switched externally
back to `feature/nnetics-v3`; this work was preserved on its feature branch and
continued separately, without replacing that newer checkout.

To run the demo locally, use Node 24+ and the owner's existing npm scripts. From
`apps/owner`, build with `npm run build`, set
`NNETICS_APP_ORIGIN=http://127.0.0.1:3194`, then run
`npm run start -- --port 3194`. Open
`http://127.0.0.1:3194/?mode=demo`. No `.env.local`, wallet provider, private key or
API key is needed for the simulated payment workflow. Demo data remains local in
this worktree's separate `artifacts/demo` directory.

## Repository findings

The application has two distinct SQLite domains: `artifacts/demo/demo-workspace.db`
for visitor vault balances/payments and `artifacts/demo/contractors.db` for private
contractor portals. Persistent contractor organizations use their own backend and
identity authorization. Demo cookies never authorize that backend. Demo ledger
amounts are canonical integer yoctoNEAR strings; contractor bill amounts are NEAR
decimal strings converted at the boundary. Existing spending limits, pause controls,
reservations, receipts and payment history are reused as demo business rules.

Before this change the demo server supported unlinked bills, but the contractor UI
still required an order. Persistent billing required an order on both paths. The
`demo_bills.order_id` column was `NOT NULL UNIQUE`, and invoice recipient inputs
could supply a payment destination. Ask Nnetics uses the model-driven `/api/agent`
tool catalog; the older `/api/demo/assistant` is a separate compatibility surface.

## Data model and API changes

- Work-order association uses an empty `orderId` in billing DTOs and SQL `NULL`
  in `demo_bills.order_id`. The migration preserves existing payloads, references,
  attachments and review history, including legacy synthetic direct-order keys.
  Linked order IDs retain their uniqueness constraint.
- `BillFields.recipient` is an optional deprecated compatibility input. It has no
  authority: the server ignores it. Bills snapshot the approved profile wallet at
  submission, or an empty value when none exists. Payments resolve Wallet Details
  again, bind its version, and reject changed recipients before execution.
- `associate-order` is an owner command. It permits linking/unlinking an existing
  bill, validates contractor ownership and amount, and records the previous bill
  in review history. It never creates an order or initiates payment.
- `GET /api/demo/intents` returns scoped attempts and audit events.
- `POST /api/demo/intents` accepts `quote` (`billId`, `sourceAsset`, `key`,
  `scenario`), `authorize` (`id`), or `execute` (`id`). Requests require same-origin
  JSON, bounded bodies and both valid demo owner/workspace cookies. Recipient,
  invoice amount, fee and wallet version are resolved on the server.
- The generic demo payment endpoint refuses invoice-linked payments. Generic
  confirm/cancel calls cannot mutate an Intents reservation.

## Simulation architecture

`DemoIntentsAdapter` is the explicit simulation interface. `LocalDemoIntents`
implements it with local SQLite and exact integer arithmetic. It imports no RPC,
signing SDK, live transaction executor or network client. `DemoWorkspaceStore`
continues to enforce the demo database mode marker. The simulator also refuses a
persistent contractor store.

The registry includes NEAR on NEAR and illustrative USDC/ETH on Ethereum. The
destination is NEAR because approved contractor wallets currently use NEAR
accounts. Source assets are **quote allocations against one shared demo vault**,
valued in NEAR equivalents, rather than separately funded asset accounts. This is
explained in the interface. Example rates are 1 USDC = 0.25 NEAR and 1 ETH = 750
NEAR; constructor-supplied rates can replace these examples. These are not market
prices. Fees are an illustrative 25 basis points, rounded up in yoctoNEAR.

Quotes expire after 60 seconds by default. Each quote records its mock solver,
deterministic outcome and exact recipient wallet version. Authorization reserves
the debit atomically with creating its shared ledger payment. Execution checks
authorization, quote expiry, invoice approval, recipient version and policy again.
Reservations remain held while executing. Atomic completion spends the debit;
failure/expiry/refund release it. Idempotency keys are fingerprinted, and the shared
ledger prevents competing active or completed payments for the same invoice.

`demo_intents` stores attempts; `demo_intent_bindings` binds a workspace to its
contractor organization; `demo_intent_ids` keeps legacy settlement logic away from
Intents records. Append-only `demo_intent_audit` records lifecycle transitions;
SQLite triggers reject UPDATE and DELETE on those events.

Application states are CREATED → AWAITING_APPROVAL → QUOTE_READY → APPROVED →
EXECUTING → COMPLETED, with FAILED, EXPIRED and REFUNDED outcomes. These are
Nnetics simulation states, not copied 1Click API response enums. Invoice status
is separate. A failed/refunded payment leaves the invoice Approved and retryable.

Due outcomes advance during authenticated status reads, including dashboard
refresh. The due time is durable, so a restart resumes reconciliation. A completed
attempt acts as a durable outbox: repeated reconciliation safely repairs an
interruption between the ledger commit and marking the bill Paid in the separate
contractor database. Audit references use `SIM-INT-…`; no fake transaction hashes,
deposit addresses or blockchain explorer links are generated.

## Complete demonstration

1. Start Demo Mode and create an owner/vault organization with simulated funding.
2. Open Contractors and add a contractor.
3. Create/open the contractor private link; submit a simulated wallet verification
   from Wallet Details and approve that request as owner.
4. In Send a bill, leave Work order at **No work order**. Enter bill text,
   description and amount; optionally attach a file. Invoice numbers are automatic.
5. Return to owner invoice review; the bill is labeled **No work order**.
6. Approve the bill, or request clarification/reject it through the existing controls.
7. Open **Simulated NEAR Intents** within the approved bill.
8. Select USDC · Ethereum and preview the **Simulated Quote**. A 1 NEAR bill
   previews 4.01 USDC at the example rate, including a 0.0025 NEAR-equivalent fee.
9. Review recipient, amounts, fee, mock solver and expiry; check the structured
   approval checkbox, then select **Authorize simulated payment**.
10. Select **Execute simulated payment** and watch EXECUTING → COMPLETED.
11. The bill becomes Paid, reserved funds clear and the same demo vault/history
    reflects a 1.0025 NEAR-equivalent debit.
12. Expand Payment audit history to inspect every transition.
13. Refresh. Invoice status, balance, simulation reference and audit persist.
14. Submit/approve another bill. Select Solver failure; execute it and verify that
    the bill stays Approved and the reservation is released. Preview a fresh
    successful quote and retry. The refund scenario is also available.

Bills may also be submitted and approved before wallet approval. Quote/payment
creation then explains that an approved wallet is required. Changing an approved
wallet after authorization fails the old attempt and releases funds; a new quote
must explicitly revalidate the replacement recipient.

Ask Nnetics exposes `list_unlinked_invoices`, `preview_simulated_intent` and
`get_simulated_payment_status` in Demo Mode only. The preview explains eligibility,
fees and proposal/next steps without changing invoice/payment state. Its View
invoices action opens the existing review workflow. The LLM has no tool to approve,
authorize or execute payment; the owner supplies structured confirmation in the
dashboard, which calls the same guarded endpoints. The existing model-backed
assistant still needs its provider configuration; the 14-step payment demonstration
does not use an AI provider or API key.

## Verification

Verified results in this worktree:

- Root tests: 42 passed.
- Owner/server tests: 335 passed, including 11 new simulation/migration/network
  isolation tests and one new controlled-provider assistant permission test.
- Production build: passed. Explicit TypeScript check: passed.
- New end-to-end browser acceptance: desktop and mobile both passed, including
  refresh persistence and failed-payment recovery.
- Full local browser regression suite: **206 passed** across desktop and mobile
  (12.4 minutes). Command: `npm run test:browser -- --grep-invert 'Ask Nnetics uses its configured model'`.
  Only that external configured-provider smoke test was excluded from this
  key-free run; model permission/tool behavior passed using a controlled provider.
- `npm run check:theme`: passed, including light/dark palette contrast checks.
- Impeccable mechanical UI detector: no findings. Desktop/mobile screenshots
  inspected. Git whitespace check: passed.

Automated coverage
includes optional orders in demo and persistent billing, migration, owner review,
wallet claim exclusion, wallet approval/version checks, quote expiry, mock solver,
insufficient funds, spending controls, atomic settlement, failure/refund recovery,
duplicates, conservation, restart persistence, organization isolation, unauthorized
requests, assistant argument/permission enforcement and live-store rejection.

Browser acceptance runs the complete unlinked-bill and payment recovery flow on
1440×1080 desktop and 390×844 mobile, checks refresh persistence, source amounts,
absence of invoice wallet inputs/explorer links, and horizontal overflow. Its
screenshots are Playwright artifacts under `apps/owner/test-results`.

## Files changed

- Simulation DTO/interface/registry: `apps/owner/src/data/demo-intents.ts`.
- Engine and ledger integration: `apps/owner/src/server/demo-intents.ts`,
  `demo-workspace.ts`.
- Billing/schema/wallet validation: `apps/owner/src/data/contractor-adapter.ts`,
  `apps/owner/src/server/contractor-records.ts`, `contractor-service.ts`,
  `billing-extraction.ts`.
- API: `apps/owner/src/app/api/demo/intents/route.ts`,
  `api/demo/workspace/[...path]/route.ts`, `api/demo/contractors/[...path]/route.ts`.
- UI: `apps/owner/src/app/simulated-intent.tsx`, `contractor-owner.tsx`,
  `contractor/page.tsx`, `demo/portal-ui.tsx`, `demo/portal.module.css`.
- Ask Nnetics: `apps/owner/src/server/agent-tool-catalog.ts`,
  `agent-tool-executor.ts`, `agent-runtime.ts`, `agent-tools.ts`.
- Tests: `apps/owner/tests/demo-intents.test.ts`, `demo-contractors.test.ts`,
  `contractor.test.ts`, `agent-route.test.ts`, `browser/demo-intents.spec.ts`,
  `browser/contractor.spec.ts` (optional-order label and no simulated explorer link).
- This delivery report: `docs/DEMO_INTENTS_DELIVERY.md`.

## Protocol grounding and production boundary

No known regressions remain in the tested local workflows. The external AI
provider smoke test remains unverified in this key-free worktree. Source assets
use the explicitly labeled shared NEAR-equivalent demo allocation described
above; independently funded asset accounts are outside this implementation.

Official sources consulted:

- [1Click API overview](https://docs.near-intents.org/integration/distribution-channels/1click-api/about-1click-api)
- [Making a request and monitoring status](https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/making-a-request)

Their quote/solver/funding/status/refund concepts inform this simulation. Actual
1Click execution requires its own asset identifiers, deposit or signed-intent
funding flow, protocol statuses and verified settlement evidence. None of those
network actions is implemented here. Any future production integration requires a
separate reviewed adapter and real reconciliation. Existing live financial
execution permissions remain unchanged. This feature is a working local payment
simulation, not real NEAR Intents integration or blockchain settlement.
