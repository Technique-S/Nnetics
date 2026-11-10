# Nnetics V3 — Demo payments, contractor lifecycle, navigation consolidation

Branch: `codex/nnetics-live-integration` (workspace `payscope/`).
Baseline: 297 unit tests pass, `npm run dev` serving on 127.0.0.1:3100.

---

## Part 0 — Diagnosis: why demo payments do not complete

### 0.1 What the brief assumed vs. what the code shows

The brief asks to "locate the exact condition that causes the demo Payments interface to display
'Paused'". After reading the whole demo path and reproducing it in a browser, the premise is
incorrect in three specific ways, and the real defect is different:

| Assumption | Reality in this checkout |
|---|---|
| A demo "Payments" tab exists | **No.** The dashboard nav is `Overview, Contractors, Receipts, History, Vault, Settings` (`apps/owner/src/app/dashboard-navigation.tsx:3`). There is no Payments destination. Payment *preparation* lives inside the Contractors tab as a per-contractor `<details>Prepare payment</details>`. |
| The demo vault has a pause state that blocks payments | **No.** `DemoWorkspaceSnapshot.vault` has no `paused` field. `DemoWorkspaceAdapter.snapshot()` hard-codes `paused: false` (`apps/owner/src/data/demo-workspace-adapter.ts:138`) and the agent executor hard-codes it too (`apps/owner/src/server/agent-tool-executor.ts:250,446`). Nothing in the demo path can ever be paused. |
| The demo Payments interface renders "Paused" | The only two "Paused" renders are **live-vault** only: `apps/owner/src/app/page.tsx:475` (Vault tab, driven by the real NEAR testnet contract's `paused` flag) and `apps/owner/src/app/testnet-controls.tsx:41` (live controls). The live testnet vault genuinely *is* `paused=true, agent=null` — see `docs/VALIDATION.md`. A third path, `apps/owner/src/data/user-message.ts:49`, rewrites **any** error whose text matches `/paused/i` into the sentence *"Payments are paused. The owner can review payment access in Balance."* |

**Conclusion:** the "Paused" label is a **live/testnet** condition (real contract state, worker
revoked, payment execution disabled by configuration). The **demo** failure is a different bug
entirely, and it is silent.

### 0.2 The actual root cause (reproduced)

Reproduced in Chrome against the running dev server: create demo workspace → fund 5 NEAR → add
contractor "Tia" → issue private link → simulated wallet proof → owner approves wallet →
**Prepare payment → 0.5 NEAR → Review payment → Approve simulated payment**.

Network trace:

```
POST /api/demo/workspace/payment
  {"idempotencyKey":"pay-ba68e8cf-…","recipient":"tia-demo.testnet",
   "amount":"500000000000000000000000","description":"Milestone delivery","contractor":"Tia"}
-> 400 {"error":"Use a canonical unsigned integer."}
```

**Unit mismatch between the demo client and the demo server.**

* Client: `ContractorPaymentForm` builds the draft with `amount: amountFromNear(input).toString()`
  (`apps/owner/src/app/contractor-payment-draft.tsx:84`) — i.e. **yoctoNEAR**
  (`500000000000000000000000`).
* Client: `DemoWorkspaceAdapter.payContractor()` posts `draft.amount` verbatim
  (`apps/owner/src/data/demo-workspace-adapter.ts:214-220`).
* Server: `DemoWorkspaceStore.approvePayment()` calls `amountFromNear(input.amount)`
  (`apps/owner/src/server/demo-workspace.ts:281`) — it re-interprets the **yoctoNEAR** string as a
  **NEAR decimal** and multiplies by 10²⁴, producing 5×10⁴⁷, which exceeds the uint128 ceiling, so
  `uint()` throws `"Use a canonical unsigned integer."` (`apps/owner/src/data/owner-adapter.ts:8-9`).
* The route turns that into `400` (`apps/owner/src/app/api/demo/workspace/[...path]/route.ts:95`).

Every other money value in the app is already a canonical yoctoNEAR integer string; the demo
workspace HTTP boundary is the lone place that still speaks NEAR decimals for `fund`, `setLimit`
and `approvePayment`. That is where the two conventions drifted apart.

### 0.3 Why the failure was invisible (two masking defects)

1. **False success.** `Dashboard.run()` catches errors and only sets a banner
   (`apps/owner/src/app/page.tsx:247-252`); it never rethrows. `ContractorPaymentForm` therefore
   sees a resolved promise and renders *"Simulated attempt recorded. Check History for the
   outcome."* (`apps/owner/src/app/contractor-payment-draft.tsx:70`) even though **nothing was
   recorded**.
2. **Generic error text.** The real message (`"Use a canonical unsigned integer."`) matches no rule
   in `getUserMessage()`, so the banner shows *"Something went wrong on our side."* — no hint of
   the real cause.

The existing browser test `apps/owner/tests/browser/payment-workspace.spec.ts` clicks
*"Approve simulated payment"* at line 69 and then **never asserts that a payment exists**: line 78
assigns `const record = page.locator(".payment-record")…` and the variable is never used. The
regression therefore passed CI.

**No funds moved and no live call was made** — the demo POST is local SQLite only. The live path
was never reachable from the demo route.

### 0.4 Second-order gaps found during the trace

These are real but were not the cause of the 400:

* The demo vault has no pause/resume concept at all, so "intentional pause" cannot be enforced,
  tested, or resumed.
* Demo payments carry no invoice linkage (`billId` is never sent by the client), so "pay this
  approved invoice twice" cannot be prevented.
* `approvePayment` has no cross-record guard: a second, differently-keyed draft for the same
  contractor/amount debits again (by design today, but there is no invoice-level duplicate guard).
* The demo contractor list is hard-capped at three profiles
  (`apps/owner/src/server/contractor-records.ts:160` and the `N/3` counter + disabled button in
  `apps/owner/src/app/contractor-owner.tsx:134`).
* There is no contractor delete/archive/restore at all; `UNSUPPORTED_OPERATIONS` in
  `apps/owner/src/server/agent-tool-catalog.ts:172` explicitly tells the model deletion is
  unavailable.

---

## Part 1 — Stage A: restore demo payments

### 1.1 One money convention at the demo boundary

The demo workspace HTTP API carries **canonical yoctoNEAR integer strings** for every monetary
input, matching the rest of the app. `DemoWorkspaceStore` speaks yoctoNEAR only; the *client*
adapter converts NEAR-decimal UI input to yoctoNEAR exactly once, at the edge.

| Operation | Before | After |
|---|---|---|
| `fund` | store: `amountFromNear(NEAR decimal)` | store: `uint(yocto)`; adapter converts NEAR→yocto |
| `setLimit` | store: `amountFromNear(NEAR decimal)` | store: `uint(yocto)` or `""`; adapter converts |
| `approvePayment` | store: `amountFromNear(NEAR decimal)` | store: `uint(yocto)` |

All arithmetic stays in `BigInt`; no float ever touches a balance.

### 1.2 Two-phase simulated payment lifecycle

The brief specifies *prepare → reserve → confirm → execute*. Implement it literally:

```
approved invoice or direct contractor payment
   → prepare (server)      POST /api/demo/workspace/payment/prepare
   → vault state checked   (paused? limit? available?)
   → funds validated
   → amount reserved       (reservation held from prepare)
   → owner confirmation    POST /api/demo/workspace/payment/confirm  {paymentId, secret}
   → simulated execution   (settle delay → confirmed | failed)
   → atomic ledger update  (reserved -= total; spent += total)
   → transaction persisted
   → invoice/payment status updated
   → receipt metadata generated
   → Overview / Payments / Activity refreshed
```

New demo payment states: `prepared` → `pending` → `confirmed` | `failed`, plus `cancelled`.

Invariants enforced in the store (server-side, not UI):

* no negative balances (`reserved`/`spent`/`available` never go below 0);
* no duplicate debits — one reservation per payment record, one debit per record;
* never spend beyond `available`;
* an invoice can be paid at most once (guard on `bill_id`);
* no cross-organization access — every call is scoped by the session token's workspace;
* no payment while the demo vault is paused;
* the confirmation secret is required and single-use, so a repeated confirm returns the same
  record instead of a second debit.

### 1.3 Demo vault pause policy

The demo vault gets a real `paused` flag, **default `false`** (a new demo vault is ready to
simulate immediately). Live vault defaults are untouched. Pause/Resume live in **Vault & Controls**
and are authorised by the same demo owner session. While paused, `prepare` declines with the
precise reason *"The demo vault is paused. Resume it in Vault & Controls to simulate payments."*

### 1.4 Honest UI

* `Dashboard.run()` rethrows after recording the error so a failed action never renders success.
* `getUserMessage()` gains exact mappings for demo payment failures (insufficient funds, limit,
  paused, duplicate invoice, malformed amount).
* Every disabled control states its precise reason.

### 1.5 Stage A tests

New `apps/owner/tests/demo-payment-lifecycle.test.ts` + a rewritten browser spec that **asserts**
the outcome (the missing assertion at `payment-workspace.spec.ts:78` is the regression that hid
this).

Covering: happy path, insufficient funds, pause enforcement, resume, duplicate request, repeated
confirmation, failed execution rollback, multiple pending payments, reservation release on
failure, cross-organization isolation, no live RPC broadcast, no signing activity.

---

## Part 2 — Stage B: contractor lifecycle

### 2.1 Dependency map (verified)

`ContractorRecordStore` tables that reference a contractor id:

| Table | Reference | On delete |
|---|---|---|
| `demo_profiles` | the record itself | delete |
| `demo_links` | `profile` | revoke + delete links |
| `demo_sessions` | via `demo_links` | revoke sessions |
| `demo_orders` | `profile` | keep if archived; blocked from hard delete |
| `demo_bills` | `profile` | keep if archived; blocked from hard delete |
| `demo_bill_history` | via `demo_bills` | keep |
| `demo_uploads` | `profile` | keep if archived; blocked from hard delete |
| `demo_wallet_proofs` | `profile` | delete |

Demo **payments and receipts live in a different store** (`demo-workspace.ts`) and reference the
contractor by **name text**, never by id. Nothing cascades into payment history.

### 2.2 Operations

New `OwnerPortalCommand` actions, all inside the existing single-transaction `ownerCommand()`
wrapper so a failure rolls back completely:

* `archive-contractor` — sets `archived`, bumps `generation` and revokes the portal link, writes an
  audit event, keeps invoices/orders/uploads. Removed from the default active list; visible under
  *Archived* and still inspectable by an authorised owner.
* `restore-contractor` — clears `archived`, audits.
* `delete-contractor` — allowed **only** when the contractor has no bills, no orders, no uploads
  and no active link. Deletes the profile, its links and its wallet proofs in one transaction.
  Otherwise it is refused with the reason and the archive option is offered.

New table `demo_contractor_events(id, org, profile, profile_name, action, at, detail)` for the
audit trail.

### 2.3 UI

Each contractor card gets a contextual action menu:

* **Edit contractor** (rename) — always available.
* **Archive contractor** — always available; wording names the contractor.
* **Delete contractor** — only when eligible; otherwise the menu offers archive instead, with the
  reason.

Destructive actions require an explicit confirmation naming the contractor and the consequence,
e.g. *"Delete Tia? This will permanently remove the contractor profile and revoke associated
portal access. This action cannot be undone."*

### 2.4 Ask Nnetics tool catalogue

New tools (demo mode only):

| Tool | Risk | Confirmation |
|---|---|---|
| `archive_contractor` | write | required |
| `restore_contractor` | write | required |
| `delete_contractor` | write | required |

Model-facing flow, exactly as the brief specifies:

1. the model identifies the operation and resolves the exact contractor (ambiguous names → ask);
2. the backend loads the real record and evaluates eligibility;
3. the executor returns a **pending operation** (id, kind, contractor, eligibility, consequences)
   and performs **no mutation**;
4. the server keeps a single-use confirmation secret that is **never placed in the tool result the
   model sees** — it travels only in the HTTP `actions` chip;
5. the dashboard renders *"Delete Tia — confirm"*; only a user click posts it;
6. the backend revalidates eligibility and permissions, executes once, audits, and returns the
   real result.

An LLM-supplied "confirmed" is never consent: the runtime has no path from model text to the
confirm endpoint, and the confirm endpoint requires the server-held secret plus the owner session.

`UNSUPPORTED_OPERATIONS` is updated to drop the "no deletion or archive" statement.

### 2.5 Remove the three-contractor cap

Delete the `count.n >= 3` server check, the `N/3` counter and the disabled "Add contractor"
button. Contractors are listed with search and incremental paging (25 per page) so a workspace with
25+ profiles stays usable.

---

## Part 3 — Stage C: navigation consolidation

### 3.1 Destinations

| # | Destination | Content |
|---|---|---|
| 1 | Overview | available balance, reserved funds, pending invoices, pending payments, active contractor count, recent transactions, warnings, quick actions |
| 2 | Contractors | search + list, create, details, portal access, wallet status, edit/archive/delete, per-contractor invoices and payment history |
| 3 | Invoices | submitted / pending review / approved / rejected / paid, linked work orders, document details, secondary filters |
| 4 | Payments | payment queue, ready-to-pay items, preparation, reserved payments, execution status, failed/retryable, payment controls |
| 5 | Activity | **consolidates History + Receipts**: all activity / payments / invoices / audit filters, transaction details, amount, recipient, timestamp, status, simulated-vs-live indicator, linked invoice, receipt preview + download |
| 6 | Vault & Controls | balance and state, funding, budgets, reservations, pause/resume, authorization, warnings, demo/live distinction |

Settings, organization switching and account options move to persistent utility navigation
(the existing account menu) — not duplicated as a primary workflow. Ask Nnetics stays globally
available through its existing launcher.

### 3.2 Compatibility

* `workspaceView()` gains aliases: `Receipts`→Activity, `History`→Activity, `Vault`→Vault &
  Controls, `Payment history`→Activity, plus the existing legacy map.
* Receipt deep links keep working: `#Activity/<attempt id>` and the old `#Receipts/<id>` redirect to
  the same record.
* Receipt generation, storage, export and APIs are **preserved**; only the navigation destination
  is consolidated. Activity reads one source of truth (`demo_ws_payments` + `demo_ws_events` /
  `snapshot.payments` + `snapshot.history`), never a second parallel copy.

### 3.3 Responsive

* Desktop: persistent left rail with the six destinations, collapsible as today.
* Mobile: bottom bar with at most five primary destinations
  (Overview, Contractors, Invoices, Payments, Activity) plus a **More** sheet for Vault & Controls,
  Settings and account actions. The active destination stays visible; nothing is hover-only;
  keyboard accessibility preserved.

### 3.4 Styling

Existing Nnetics emerald/space-white/beige tokens, typography, spacing, card styling and
responsive rules are preserved. New surfaces reuse `workspace.css` classes
(`panel`, `payment-workspace-panel`, `overview-grid`, `overview-card`, `payment-record`,
`badge`, `reference-disclosure`). The sign-in page is not touched.

---

## Part 4 — Test matrix

| Group | Where |
|---|---|
| A simulated execution + ledger persistence | `tests/demo-payment-lifecycle.test.ts`, browser |
| B pause / resume enforcement | same + browser |
| C insufficient funds + duplicate prevention | same |
| D delete with no linked financial records | `tests/contractor-lifecycle.test.ts` |
| E archive with invoices/payments | same |
| F portal revocation + isolation | same |
| G Ask Nnetics deletion intent + confirmation | `tests/agent-*.test.ts` |
| H unlimited profiles (≥25) | `tests/contractor-lifecycle.test.ts` |
| I receipt preview + download from Activity | browser |
| J deep links from old History/Receipts | browser |
| K desktop + mobile navigation | browser |
| L Overview statistics after payments/lifecycle | browser |
| M regression: existing agent tools + contractor creation | existing suites + browser |
| N no live wallet signing / chain broadcast | server test asserting zero live calls |

---

## Non-negotiables honoured

* Live vault safeguards are untouched: pause checks, authorization, spending guards, reservations,
  signing, deployment and checkpoint safety all stay exactly as they are.
* The live vault default is never changed by demo code.
* Financial history is never silently deleted: hard delete is impossible once records exist;
  archival is the default for anything with history.
* Ask Nnetics cannot perform a destructive action without a real user click on a server-held,
  single-use confirmation.
* No success is claimed unless the simulated ledger and the persisted transaction record were
  actually updated (asserted in tests against the SQLite store, not against the UI text).
