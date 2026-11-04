# Implementation proposal — not started

The current work only creates review artifacts under `docs/design-review/` and an ignored local rendering runtime. All phases below require the user's design approval first. No contract, database schema, transaction payload, authorization model, provider, hosting or session-policy change is included.

## Dependency and lifetime constraints

Current hierarchy:

```text
layout.tsx → globals.css
page.tsx → Onboarding (session, config, identity, active adapter)
  ├─ no session → sign-in / saved-session recovery
  ├─ organization picker → VaultOnboarding + PersistentContractorOwner
  └─ Dashboard (snapshot subscription, selected view, dialogs, busy/errors)
       ├─ TestnetControls (funding, repair, viewers, registry, queue)
       └─ showContractors early return → PersistentContractorOwner → PortalShell
contractor/page.tsx → persistent or demo adapter → PortalShell / BillCard
```

Risks to preserve explicitly:

- `Onboarding` owns epoch/AbortController fences, BroadcastChannel logout, retained session restore, 30-second checks and activity renewal. Its component must stay mounted across ordinary owner navigation. Do not key it by view, pathname, sidebar state or selected invoice.
- `Dashboard` subscribes once per adapter (live adapter polls ~10 seconds). Extracting pages must not create a second adapter or duplicate subscriptions. Identity/config drift clears private snapshots before replacement; stale requests cannot resurrect them.
- `PersistentContractorOwner` memoizes by organization, polls ~15 seconds and fences stale requests with generation/request version. It subscribes to identity revocation. A shared shell must not remove that subscription or allow an old response to populate a different org.
- Contractor portal polls ~2 seconds when visible, refreshes on focus and responds to link-revocation broadcasts. This is private-link state validation, not repeated owner wallet proof. Keep generation fences, hash-token removal and draft clearing when profile changes.
- `VaultOnboarding` request preparation, outbox reconciliation and hash handling stay explicit user actions. Do not move `run("prepare")` or dispatch into a route effect or automatically repeat after mount.
- Funding, authorization, order/vendor commands and enqueue calls are event handlers. No navigation, visibility effect, animation completion or data-loading hook may call them.
- Modal form buffers, invoice submission UUID, clarification ID and current order binding survive retries. Closing/navigating must cancel UI work safely without deleting durable intents or generating duplicate invoices/jobs. A deliberate discard confirmation may be needed for unsaved forms; it is not wallet re-verification.
- Maintain serialized BigInt/decimal arithmetic. Financial view models read one consistent snapshot; negative/inconsistent values are verification errors, not silently clamped successes. Zero budget renders an empty track rather than dividing by zero.
- Contractor profiles and on-chain vendors are **not** the same store. A presentation can group them but cannot silently merge/rename their IDs or infer authorization from the off-chain profile.
- Existing configuration has a single operational vault context. Organization URL parameters are selection hints only; verify ready/configured context and current authorization before loading. Do not invent cross-org live vault switching support without backend compatibility checks.

## Staged changes

| Stage | Affected files / proposed components | Dependencies and risks | Verification before next stage |
|---|---|---|---|
| 0. Baseline and action map | Preserve `992ca22`; current screenshots and `CONTROL_INVENTORY.md` | Existing session/hosting work and Paid evidence are baseline; no rebase/reset, record migration or blanket test snapshot update | Audit passes, clean production diff, read-only guard/evidence check |
| 1. Shared presentation primitives | `globals.css`, `demo/portal.module.css`; new `ui/Button`, `Field`, `Status`, `Notice`, `Amount`, `DataTable`, `Dialog` | CSS reset/global headings can affect portal; avoid adding component libraries and font/runtime dependencies | Render both shells and form states at 320/390/768/1280/1440/1920; contrast/focus/zoom checks; existing tests |
| 2. Stable owner shell | `onboarding.tsx`, `page.tsx`, new `OwnerShell`, `AccountMenu`, `OrganizationSwitcher`, `Sidebar` | Hoist presentation only around existing session/adapter lifetime; state migration can accidentally remount auth or duplicate polling | No new signature on nav/tab/refresh/browser restart; one polling subscription; explicit switch/logout still clear data across tabs; five-hour boundary unchanged |
| 3. URL navigation + contextual administration | Split `testnet-controls.tsx` into `VaultFunding`, `SpendingLimits`, `AccessSettings`, `ReferenceImport`, `PaymentRecovery`; pages consume existing adapter/callbacks | Keep exact payloads, roles, method guards and current financial disables. `view` query/record URL must not grant access. Deep link before restoration cannot show cached private data | Back/forward/direct-link/refresh + owner/viewer/unrelated-account cases; requests compare to baseline; fake modal cannot dispatch; unknown outcomes still blocked |
| 4. Owner work and invoice surfaces | `page.tsx`, `contractor-owner.tsx`, `demo/portal-ui.tsx`; shared `InvoiceList`, `InvoiceDetail`, `PaymentEvidence`, contractor detail | Two data models, off-chain review versus chain eligibility. Preserve idempotency IDs and invoice history; avoid mount-driven queue actions | Owner invite → wallet request → approval → bill → clarification → review → held-job view with fixtures. Repeated queue request/restart still one job; Paid never inferred |
| 5. Contractor simplification | `contractor/page.tsx`, `portal-ui.tsx`, portal styles | Optional field disclosure must retain values/validation. Text + amount primary; deterministic parsing strict and source-aware. No AI activation | Malformed/ambiguous amount, unsupported currency, prompt-like text, upload limit, stale invite, changed wallet, same-invoice clarification, duplicate click/retry tests |
| 6. Onboarding/recovery polish | `vault-onboarding.tsx`, onboarding status components | Keep exact cost/owner/network/permissions visible before signing; no auto-create and no fabricated verified state. Generic anonymous 401 must not erase real expiry errors | Missing config, unsupported/wrong-network wallet, cancellation, expired proof, RPC outage, interrupted provisioning, verified existing vault; no signatures in presentation-only checks |
| 7. Final regression and review | Existing Node/browser suites; targeted UI cases, screenshots and accessibility pass | User acceptance is separate from fixture passing. Do not reopen paid execution to test a layout | Tests + manual Meteor login-only acceptance if needed; preserved payment/evidence state; user design sign-off; separate approval for commit push/hosting |

At stage 1, also guard the existing Overview percentage presentation against a zero budget and add a targeted browser regression for that reproduced crash. Do not change budget arithmetic or contract validation. Estimated order is dependency-driven; no new product feature or backend migration is justified solely by this redesign. Renaming a UI label must not rename persisted IDs or contract methods.

## Explicit acceptance criteria

- At **1280×720** and **1440×900**, Overview heading and meaningful state/metrics/review content are visible before scrolling. Target heading top ≤180 px including prototype annotation; live product will not contain that annotation.
- Vendors/Contractors and Payment history are visible primary nav destinations on desktop; one drawer opening away on mobile. No unrelated setup form sits before their title/list.
- Every inventory action remains discoverable in its named section; no giant omnibus accordion. Funding, limits, viewer access, reference imports, queue/attempt recovery and diagnostics are included.
- Drawer supports touch, visible Close, Escape, Tab/Shift+Tab wrap, focus restore, inert background and destination dismissal. Expanded/collapsed state uses accessible labels/tooltips and independent visual preference. Resize cannot leave an invisible modal/focus trap or sidebar gap.
- No unintended **page-level** horizontal overflow at 320, 360, 390, 768, 1024, 1280, 1440 and 1920 CSS px; test 200% zoom and 400% reflow equivalent. A necessary table region may scroll only with a label, visible affordance and no lost essential field.
- Keyboard order follows content. Skip link, semantic landmarks, one primary heading per view, real labels, error associations, statuses not conveyed by color alone. Test a screen reader separately; automated checks alone are insufficient.
- Loading skeletons represent actual initial loading, `aria-busy` is scoped, action buttons report actual progress. No new timer delays, invented charts, stale “up to date” claims or synthetic values in live contexts.
- Visible account is the authenticated account. Unreported Meteor selection never transfers permission. Focus/tab/navigation does not request signatures; actual verified identity change clears old records and requires new authentication. Five-hour absolute deadline, secure cookies, explicit logout and retryable RPC handling unchanged.
- One adapter/polling subscription per org context. Late responses after org change/logout cannot repopulate private data. Provider lifetime and cross-tab revocation tests are mandatory.
- Owner, viewer and unrelated-account roles are preserved at the backend. Viewers cannot initiate payments or change authority even via direct API calls. Drawer visibility is irrelevant to authorization.
- Monetary calculations stay exact; available funds and uncommitted authority use the distinct formulas. Test budget=0, reservation>0, capped authority, storage-only funding and unavailable snapshot.
- Off-chain order approval, bill approval, linkage, held/queued job, pending transfer, failed transfer and Paid are distinct. No approval, queue action or timeout may render Paid.
- Original billing text, reference, linked immutable order and recipient remain unchanged. Work-order mismatch/currency conflict cannot be resolved by relabeling or silently increasing an amount.
- Durable reference/submission and approved-order uniqueness persist through simultaneous clicks, retry and app/worker restart. UI route changes never create jobs.
- Preserve INV-0002's original record, 0.001 NEAR, ACCEPTANCE-001, Babygoat recipient, existing single job and confirmed link. Verify via read-only evidence, not a second transfer.
- Vault paused, worker revoked, deployment/payment execution disabled throughout. No new signing, payment or chain mutation authorized by visual acceptance.
- Existing Node and browser tests continue to pass; adjust only presentation selectors/expected layout where justified, never weaken guards or delete failing security assertions. Rust interfaces/payloads unchanged; prior protocol-86/88 CI is preserved, not represented as a new execution.

## Questions actually needing user decision

1. Approve the proposed shell, control destinations and retained green/serif direction before production implementation.
2. Optional: use **Contractors** as the top-level people destination (recommended, with On-chain vendors inside), or retain **Vendors** as the top-level label. The separate data models remain unchanged either way.

No request for wallet keys, hosting permissions, new transactions, AI setup, custom domain or new feature scope is needed for this design review.
