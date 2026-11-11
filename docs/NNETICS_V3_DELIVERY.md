# Nnetics V3 delivery report

Branch `feature/nnetics-v3`. Every commit is independently revertible.

| Commit | Stage |
|---|---|
| `a3a4a35` | checkpoint: the working baseline as inherited |
| `ab210c5` | Stage A — simulated demo payments restored |
| `eb776d2` | Stage B — contractor lifecycle with owner-confirmed deletion |
| `7657c9f` | Stage C — dashboard navigation consolidated |
| `b9036dc` | the workspace design integrated on top of Stage C |
| `34d0137` | the remaining browser suites reconciled with the current workspace |
| `ac3b68e` | integrated demo acceptance recorded |
| `976562f` | the verified assistant model configured for local production |

Design: `docs/superpowers/specs/2026-11-10-nnetics-v3-design.md`.
Plan: `docs/superpowers/plans/2026-11-10-nnetics-v3.md`.
Integration and release acceptance: `docs/NNETICS_RELEASE_ACCEPTANCE.md`.
Page coverage and visual review: `docs/NNETICS_PAGE_COVERAGE.md`.
Assistant provider readiness: `docs/NNETICS_ASSISTANT_RELEASE_READINESS.md`.

---

## 1. Exact root cause of the paused demo payments

The brief asked for the condition that makes the demo Payments interface show
"Paused". **There is no such condition, and no demo Payments interface.**
Reproducing the flow in Chrome and reading the whole demo path showed:

- The dashboard had no Payments destination. Its navigation was
  `Overview, Contractors, Receipts, History, Vault, Settings`
  (`apps/owner/src/app/dashboard-navigation.tsx`). Payment preparation lived
  inside a per-contractor `<details>Prepare payment</details>` in Contractors.
- The demo vault had no pause state. `DemoWorkspaceSnapshot.vault` had no
  `paused` field, `DemoWorkspaceAdapter.snapshot()` hard-coded `paused: false`
  and the assistant executor did the same. Nothing in the demo could be paused.
- The only two "Paused" renders in the app are **live-vault**:
  `apps/owner/src/app/page.tsx` (the Vault tab, driven by the real NEAR testnet
  contract) and `apps/owner/src/app/testnet-controls.tsx`. The live testnet
  vault genuinely is `paused=true, agent=null`, as `docs/VALIDATION.md` records.
  A third path, `apps/owner/src/data/user-message.ts`, rewrites any error whose
  text matches `/paused/i` into "Payments are paused. The owner can review
  payment access in Balance."

**The demo payments failed for an entirely different reason, and silently.**

Root cause: a **money-unit mismatch between the demo client and the demo
server**.

- `ContractorPaymentForm` built the draft with
  `amount: amountFromNear(input).toString()`
  (`apps/owner/src/app/contractor-payment-draft.tsx`) — canonical
  **yoctoNEAR**.
- `DemoWorkspaceAdapter.payContractor()` posted `draft.amount` verbatim.
- `DemoWorkspaceStore.approvePayment()` called `amountFromNear(input.amount)`
  (`apps/owner/src/server/demo-workspace.ts`) — re-interpreting the
  **yoctoNEAR** string as a **NEAR decimal** and multiplying it by 10^24.
  0.5 NEAR became 5x10^47, which exceeds the uint128 ceiling, so `uint()`
  threw `"Use a canonical unsigned integer."` and the route answered
  `400 {"error":"Use a canonical unsigned integer."}`.

Two defects hid it:

1. `Dashboard.run()` caught the error and only set a banner; it never rethrew.
   The payment form therefore saw a resolved promise and printed *"Simulated
   attempt recorded. Check History for the outcome."* — a **false success**
   while nothing had been recorded.
2. The real message matched no rule in `getUserMessage()`, so the banner said
   *"Something went wrong on our side."*

The browser suite missed it because `payment-workspace.spec.ts` clicked
*"Approve simulated payment"* and then **never asserted that a payment
existed** — the locator it built was assigned to a variable and never used.

## 2. Whether demo payments now complete

Yes. Verified in the browser against the running application:

```
POST /api/demo/workspace/payment/prepare  200   (reservation held)
POST /api/demo/workspace/payment/confirm  200   (simulated execution)
```

Persisted ledger after one 0.5 NEAR payout with the 0.001 NEAR demo fee:

```json
{"vault":{"funded":"5000000000000000000000000","spent":"501000000000000000000000",
          "reserved":"0","limit":"","paused":false,"available":"4499000000000000000000000"},
 "payments":[{"ref":"SIM-0001","status":"confirmed","amount":"500000000000000000000000","total":"501000000000000000000000"}],
 "receipts":["SIM-0001"]}
```

The transaction record, the receipt, the debit and the released reservation are
all real rows in the demo SQLite ledger.

## 3. Payment execution and persisted-ledger evidence

- `apps/owner/src/server/demo-workspace.ts` — one money convention (canonical
  yoctoNEAR), `BigInt` only, no floating point anywhere.
- Two-phase lifecycle: `prepare` (validate, check the vault state, check the
  spendable funds, reserve, register a single-use confirmation secret) ->
  `confirm` (owner confirmation, re-validate, execute) -> settle -> atomic
  ledger update -> transaction persisted -> receipt generated.
- States: `prepared`, `pending`, `confirmed`, `failed`, `cancelled`.
- Guardrails enforced in the store, not in the UI: no negative balances, no
  debit beyond the funded balance, one invoice paid at most once, one debit per
  attempt, cross-workspace isolation, no payment while the demo vault is
  paused, an unconfirmed preparation expires and releases its reservation, and a
  pause between preparation and confirmation releases the reservation and
  records the refusal.
- The demo vault has a real `paused` flag. A new demo vault starts **ready to
  simulate** (`paused: false`); pausing is an explicit owner decision with an
  authorised resume. The live vault default is untouched.
- The owner-facing form shows the exact failure instead of claiming success.

## 4. Contractor deletion and archival, and the safeguards

- `archive` keeps every invoice, work order, attachment and payment record,
  moves the contractor out of the active list, revokes portal access, keeps an
  audit record and stays inspectable. `restore` brings it back.
- `delete` is allowed **only** when the contractor has no invoices, work
  orders, attachments or active portal link. It removes the profile, its links
  and its wallet proofs in one transaction. Payment records and receipts live in
  the separate workspace ledger and are **never** touched; a receipt keeps its
  contractor attribution.
- A failed multi-record update cannot leave inconsistent state: the lifecycle
  mutations run inside the store's existing `BEGIN IMMEDIATE` transaction.
- The lifecycle operations are demo-workspace operations. A verified
  organization keeps its current behaviour and is told so explicitly.
- The three-contractor cap is gone. The list has a name search and pages at
  twenty-five records.
- UI: a contextual action menu per contractor with **Edit contractor**,
  **Archive contractor** and **Delete contractor** (only when eligible).
  Destructive actions name the contractor and the consequence, for example
  *"Delete Tia? This will permanently remove the contractor profile and revoke
  associated portal access. Completed payment records and receipts are kept.
  This action cannot be undone."*

## 5. Changes to the Ask Nnetics tool catalogue

New tools, demo mode only, `confirmationRequired: true`:

| Tool | Behaviour |
|---|---|
| `archive_contractor` | prepares the archival; the owner confirms |
| `restore_contractor` | prepares the restore; the owner confirms |
| `delete_contractor` | prepares the deletion, or refuses and reports that archiving is the available option |

The flow is exactly the one the brief specifies: the model identifies the
operation and resolves the exact contractor; the backend loads the real record
and evaluates eligibility; the assistant prepares a confirmation; the owner
confirms; the backend revalidates and executes once; the assistant reports the
real result.

**The confirmation can never come from the model.** The tool only *prepares* an
operation and returns its id, the resolved contractor, its eligibility and the
consequence — never a confirmation. The single-use secret lives in
`apps/owner/src/server/contractor-lifecycle.ts`, scoped to the owner session,
and is returned only in the HTTP action chip, which the model never sees. The
runtime has no path from model output to the confirm endpoint, and the confirm
endpoint revalidates the eligibility, the permissions, the scope and the expiry
before applying the mutation exactly once.

`list_contractors` and `get_contractor` expose the lifecycle state
(`archived`, `deletable`) so the assistant answers from facts. The
"deletion is unavailable" line was removed from `UNSUPPORTED_OPERATIONS`.

## 6. Old navigation versus new navigation

| Before | After |
|---|---|
| Overview | Overview |
| Contractors | Contractors |
| — | **Invoices** (new) |
| — | **Payments** (new) |
| Receipts | **Activity** |
| History | **Activity** |
| Vault | **Vault & Controls** |
| Settings | utility navigation (account menu) |

Activity consolidates History and Receipts behind four filters: All activity,
Payments, Invoices, Audit events. Completed payments keep their transaction
details, amount and denomination, recipient, timestamp, status, simulated
indicator, linked invoice and receipt preview, copy and download.

Payment preparation and execution moved out of the contractor card into
Payments, which now carries the payment queue, the ready-to-pay items, the
reserved payments, the execution status and the failed or retryable
operations. The contractor card keeps the portal access, the wallet status and
the edit/archive/delete controls.

The old deep links keep working: `#Receipts` and `#History` resolve to
Activity, `#Receipts/<id>` still opens the completed record, `#Invoice review`
resolves to Invoices and `#Vault` resolves to Vault & Controls.

## 7. Where the receipt functionality lives

Unchanged in substance, moved in navigation. The receipt records are still the
same workspace-ledger rows; only the navigation destination changed. Activity
reads one source of truth (`snapshot.payments` plus `snapshot.history`) — no
second copy of payment history was introduced. Receipt generation, storage, the
copy action and the text download were not removed. The Receipts and History
deep links are aliased to Activity.

## 8. Desktop and mobile browser results

Desktop: persistent left rail with the six destinations, collapsible as before.

Mobile: a bottom bar with five primary destinations (Overview, Contractors,
Invoices, Payments, Activity) and a **More** sheet for Vault & Controls and
Settings. The active destination stays visible, the More button carries the
active state for the secondary destinations, nothing is hover-only, keyboard
accessibility is preserved and the assistant launcher no longer covers a
navigation target. The mobile drawer makes background content inert and
returns focus to its trigger.

## 9. Tests passed and failed

Every run below was executed after the final change, against the production
build of this checkout served on 127.0.0.1:3100 with the persisted provider
credential loaded.

| Check | Result |
|---|---|
| Repository unit tests (`npm test` at the repository root) | **42 passed, 0 failed** |
| Owner unit tests (`npm test` in `apps/owner`) | **323 passed, 0 failed** (297 at the baseline, 26 added) |
| Browser tests (`npx playwright test`, desktop and mobile) | **205 passed, 0 failed, 1 skipped** (206 cases) |
| Typecheck (`npm run typecheck`) | passed |
| Production build (`npm run build`) | passed |
| Theme and contrast check (`npm run check:theme`) | passed, all 42 semantic combinations |
| Provider smoke (`npm run agent:smoke`) | real `openrouter` call, `nvidia/nemotron-3.5-super-vl:free`, `stepLimitReached=false` |

The single skipped browser case is the pre-existing intentional skip: the
mobile provider case is skipped because the desktop case exercises the same
server model. It is not a suppressed product failure.

### Baseline comparison

The browser suite was **not green at the baseline checkpoint**. Measured on the
inherited working tree at `a3a4a35`, ten of the existing browser spec files
reported **38 failed / 32 passed** on desktop alone, because they asserted on a
demo interface and a navigation that had already been replaced before this work
started: an "Add sample invoice" button, a "Your payment desk" heading and a
"Start contractor demo" step that no longer exist.

Those suites were rewritten against the current workspace rather than deleted,
and the same ten files now report **0 failed**. The complete-directory run that
closed the milestone is the 205/206 above.

The unit suite was green at the baseline (297 passed) and is green now (323
passed).

## 10. Remaining blockers or unverified behaviour

- The **live/testnet path was deliberately not extended**. The contractor
  lifecycle and the demo payment lifecycle are demo-workspace operations; a
  verified organization keeps its current behaviour and is told so explicitly.
  Enabling them for a live organization is a one-line change in
  `ContractorRecordStore.ownerMutation`, but it has not been security-reviewed.
- The live-mode browser suites that depend on a reachable RPC provider and a
  real wallet session were not exercised. They pass against mocked fixtures.
- Full assistive-technology testing and a complete WCAG conformance evaluation
  remain outside the verified browser coverage.
- No live wallet signature, network transfer, deployment or checkpoint
  transaction was executed. The evidence uses demo records and mocked live
  fixtures.

## Non-negotiables honoured

- Live vault safeguards are untouched. `docs/VALIDATION.md`,
  `docs/V4_CHECKPOINT_VERIFICATION.md`, `chain.ts`, `signer.ts`, `worker.ts`,
  `checkpoint-lifecycle.ts`, `checkpoint-validity.ts`,
  `reference-block-policy.ts`, `service.ts`, `queue.ts` and `apps/owner/scripts/`
  have **no** diff against the baseline checkpoint.
- Financial history is never silently deleted. Hard deletion is impossible once
  a contractor has records; archival is the default.
- Ask Nnetics cannot perform a destructive action without a real user click on
  a server-held, single-use confirmation.
- Nothing was claimed as working without the ledger and the persisted
  transaction record being checked.
