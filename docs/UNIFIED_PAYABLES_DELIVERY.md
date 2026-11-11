# Unified Payables

Implemented in the main `payscope` application on `feature/nnetics-v3`, November
11, 2026. The existing contractor/assistant work was preserved in checkpoint
`9397cf7` and branch `checkpoint/nnetics-before-payables-20261111`. Additional
concurrent lifecycle edits are retained as requested.

## Workflow

Open the existing demo at `http://127.0.0.1:3100/?mode=demo` and choose **Payables**.
The primary destinations are Overview, Contractors, Payables, Activity and
Vault & Controls. Mobile has Overview, Contractors, Payables, Activity and More.
The old Invoices, Payments and Invoice review hash links resolve to Payables;
History and receipt links keep their existing Activity behavior.

Payables provides All, Awaiting Approval, Ready to Pay, Processing, Paid and
Rejected / Failed filters, plus search by invoice number, contractor or purpose.
Select a record to open Payable Details. The selected record stays open as it
moves between filters during review, authorization and settlement. Its deep link
is `#Payables/<invoice-id>` and survives refresh. An unavailable deep link does
not silently select a different invoice for payment.

The same detail contains the request, approval, current approved wallet, original
text/attachment links, work-order association, eligibility warnings, review
actions, existing simulated NEAR Intents controls, invoice timeline and payment
audit history. No separate tab is needed to authorize an approved invoice.

Legacy direct contractor payments remain under **Other payments · no invoice**
inside Payables. They keep their existing preparation/confirmation controls and
are explicitly distinguished from invoices. Invoice-linked payment attempts are
excluded from that supplementary queue, so they are not duplicated as unrelated
payment records.

## Data and source of truth

`src/data/payables.ts` is a presentation projection over existing authoritative
contractor invoices, profiles and payment attempts. It does not create another
invoice/payment table, perform conversions, reserve funds or execute transfers.
One invoice produces one payable, with active/completed payment attempts joined
by `billId`. Financial totals continue to use the existing ledger.

Invoice approval and attempt status stay separate. A failed/refunded attempt
leaves the approved invoice Ready to Pay and retryable; it also matches the
Rejected / Failed filter with an explicit last-attempt warning. These filters
describe different facts and are not additive financial totals. Processing and
confirmed Paid states use existing payment evidence. Persistent invoices are
never treated as settled solely because a display status says Paid.

Details distinguish:

- Originally requested amount/currency and the approved amount/currency.
- Remaining payable (full approved amount or zero after confirmed settlement;
  this change does not introduce partial payments).
- Current approved wallet and a previously recorded recipient when they differ.
- Invoice approval, payment execution status and recorded approval provenance.
- The automatic invoice number, source invoice reference when recorded, purpose,
  optional work order, original text, attachments and relevant audit events.

Optional JSON metadata on `ContractorBill` records the original request, source
reference, approval amount/currency, actual review time, reviewer account when
available, and review events. Existing requested amounts are recovered from
stored historical snapshots where available. New persistent approvals record
the already-authorized owner account; demo approvals do not invent a user
identity. Old approval identities/times remain **Not recorded** when unavailable.
No amount-adjustment editor or invented adjustment reason was added.

The existing bill history, identity, files and references remain intact. No
destructive schema migration or invoice recreation is needed.

## Payment and authorization controls

The simulated payment confirmation includes contractor, recipient, invoice,
original request, approved amount, payment amount, currency/rail, purpose,
recorded approval provenance and current budget/spending eligibility. The owner
still checks the structured confirmation box, authorizes the exact quote, and
executes it as separate steps.

The existing server independently revalidates invoice approval, wallet version,
owner authorization, quote/authorization expiry, policy, balance, reservations,
idempotency and duplicate-payment guards. The new projection and navigation have
no execution authority. Review visibility and payment-action visibility are
separate; persistent review permission never exposes the demo executor. Existing
live payment linkage/execution permissions and signing paths are unchanged.

Demo Intents remains a local simulation with illustrative rates and simulation
references. No real deposits, swaps, signatures, transfers or blockchain
settlement were introduced. Existing real settlement evidence and explorer links
remain restricted to verified persistent payments.

## Ask Nnetics

The existing demo tool catalogue gains read-only `list_payables` and `get_payable`
tools. They use the same projection and organization scope as the UI, report
awaiting/ready/processing/paid/failed states, original purpose, requested/approved
amounts, recorded approver/time, approved wallet and blocking reasons. They do not
approve invoices or authorize/execute payments. View payables opens the same
record in the existing dashboard. Existing invoice tools and action names remain
compatible.

Due dates are not inferred from submission dates. Where no due date is recorded,
the API returns overdue as unknown and reports the number of unknown due dates.
The new tools follow the existing demo-only assistant boundary; live financial
and organization permissions are not expanded. Existing provider configuration
is preserved.

## Verification

Results are recorded after verification against the main integration checkout.
The baseline with the preserved lifecycle work passed 343 server tests. New
coverage checks projection/deduplication, requested versus approved values,
unknown provenance, current versus recorded wallets, persistent settlement
evidence, failed retries, search, due-date handling, actual review persistence,
cross-organization/contractor denial and the real controlled-model agent route.

Browser coverage checks the full approval-to-settlement lifecycle in one pinned
Payable Details view, structured payment confirmation, remaining payable, audit
access, search, filtering, refresh/deep links and desktop/mobile navigation. The
existing full demo payment scenario also exercises failure and refund recovery.

Final results against the combined integration checkout:

- Owner/server suite: **352 passed**, zero failed.
- Root suite: **42 passed**, zero failed.
- Full desktop/mobile browser regression: **220 passed** (12.5 minutes), excluding
  configured external-provider/model smoke cases.
- Latest production build served on the main application at port 3100: **6
  focused desktop/mobile cases passed** (33.6 seconds), including cross-workspace
  deep-link denial, approval through settlement, refresh, aliases and search.
- Production build and explicit TypeScript check: passed.
- Theme check, Impeccable mechanical UI check (no findings), desktop/mobile
  screenshot inspection and `git diff --check`: passed.

The existing main local server was restarted with the latest default `.next`
production build and left running on `http://127.0.0.1:3100` for browser testing.
The broad browser run used an isolated demo database on port 3197; the final six
cases used the actual main local application on port 3100.

No implementation blocker remains for testing the Payables simulation. External
Ask Nnetics real-model acceptance remains blocked by the existing provider's HTTP
429 daily free-model quota, documented separately in
`NNETICS_V31_REAL_MODEL_ACCEPTANCE.md`; no retries, provider substitution or
permission expansion were made for this delivery. Controlled agent-route and
tool tests passed. Historical approver/time and due-date information remains
unknown where it was never recorded, and the interface says so. This delivery
does not introduce partial payments or an approval-amount editor.

## Main files

- `apps/owner/src/app/dashboard-navigation.tsx`: consolidated destinations and
  compatible hash links.
- `apps/owner/src/app/page.tsx`: main Payables integration, parent refresh and
  separate direct-payment disclosure.
- `apps/owner/src/app/payables-panel.tsx`: searchable list and persistent detail.
- `apps/owner/src/data/payables.ts`: shared read-only presentation projection.
- `apps/owner/src/app/contractor-owner.tsx`: reuses existing invoice review,
  work-order linkage and simulation modules inside Payables.
- `apps/owner/src/app/simulated-intent.tsx`: full financial confirmation context
  and independent action visibility.
- `apps/owner/src/app/workspace.css`: existing theme tokens and responsive layout.
- `apps/owner/src/data/contractor-adapter.ts`,
  `src/server/contractor-records.ts`, `src/server/contractor-service.ts`: optional
  request/approval metadata and actual reviewer provenance.
- `apps/owner/src/server/agent-tool-catalog.ts`, `agent-tool-executor.ts`,
  `agent-tools.ts`, `agent-runtime.ts` and `src/app/ask-nnetics.tsx`: authorized
  read tools and Payables navigation.
- `apps/owner/tests/payables*.test.ts` and `tests/browser/payables.spec.ts`: new
  projection, authority, AI and end-to-end coverage. Existing navigation and
  payment tests were updated for the unified presentation while retaining their
  financial/permission assertions.

## Launch

Use the existing application, not the isolated demo worktree:

```powershell
cd C:\Users\Kazi\Documents\PayScope_Foundation\payscope\apps\owner
npm run build
npm run start
```

Open `http://127.0.0.1:3100/?mode=demo#Payables`. If an old local server owns
3100, stop that known instance before starting the newly built application.
The billing/payment demonstration needs no API key, wallet connection or real
funds. Ask Nnetics uses its existing configured provider.
