# Nnetics — interface completion plan

Proposed 4 November 2026. Companion to [AUDIT.md](AUDIT.md). **Not implemented in this task.** Preserve the existing green/ivory identity, session policy, contract interfaces and payment evidence. Every page is an Operate surface: task clarity outranks ornament.

## 1. Rebuild the frame, not its offsets

```text
Viewport: top 0                                             bottom 0
┌──────────────────────┬───────────────────────────────────────────┐
│ Nnetics   [collapse] │ Organization / page context   Account     │
│                      ├───────────────────────────────────────────┤
│ Work                 │ Heading + primary permitted action       │
│ Overview             │ Relevant status / current state           │
│ Contractors          │                                           │
│   On-chain vendors   │ Main task / records                       │
│ Work orders          │                                           │
│ Invoice review       │ Independent content scroll                │
│ Payment history      │                                           │
│                      │                                           │
│ Controls             │                                           │
│ Vault · Access       │                                           │
│ Recovery             │                                           │
│ [organization/help]  │                                           │
└──────────────────────┴───────────────────────────────────────────┘
```

- The left rail owns the **entire viewport height**, including the region beside the content header. There is no full-width wallet strip above it and no `top:98px` compensation.
- The right column owns its header and content scroll. Account identity remains explicit in that header; session help moves into the account popover. Expanding help never moves or clips the rail.
- Sidebar internal layout: brand/organization region, scrollable grouped navigation, footer anchored by grid/flex layout. Remove the accidental oversized gap before navigation. Keep a recognizable Nnetics mark in compact mode.
- Proposed dimensions: 248px expanded, 72px compact, 64–72px content header that can grow for long identity text. At wide widths use the saved visual preference. At intermediate widths prefer compact navigation; small screens use an overlay drawer. Choose the actual switch point by minimum content width, not an arbitrary phone breakpoint. Initial candidates: expanded ≥1100px, compact 720–1099px, drawer below 720px. A user-expanded panel at intermediate widths must not crush the working form.
- Contractors / On-chain vendors remain separate entities. Indenting the latter expresses their relationship; it does not merge identifiers, approvals or stores. Recovery remains discoverable in Controls and deep-linked from a payment.
- Account popover: authenticated account, testnet, organization entry, optional selected-wallet check, Switch wallet, Sign out and Wallet-session help. Show scope/action labels accurately. Use a popover/dialog/portal that escapes scroll clipping, with Escape, focus return and outside dismissal.

**Affected:** `onboarding.tsx`, `page.tsx`, `dashboard-navigation.tsx`, `globals.css`; proposed `OwnerShell`, `AccountMenu`, `OrganizationSwitcher`, `Sidebar`.

**Lifetime constraint:** move presentation through slots/props; keep `Onboarding` identity/session owner stable. Do not duplicate heartbeat timers, adapters, subscriptions or wallet listeners. Draft organizations must not initialize a live vault adapter before verification. Route changes must never dispatch financial commands.

## 2. Finish the five requested task surfaces

| Page | First-screen composition | Secondary tools / states |
|---|---|---|
| **On-chain vendors** | Heading, small explanation of on-chain scope, permitted Manage vendor action, vendor records with recipient/status and readable identifiers | Import existing **vendor** beside the list, collapsed unless requested. Verification details inside record detail. Empty state explains prerequisites. Disabling a vendor explicitly affects future payments; existing approved recipients remain fixed. |
| **Work orders** | Approved order records: reference, vendor, exact amount, immutable recipient, enabled/paid/expired state; permitted New work order | Import existing **work order** defaults correctly. Creation separates description from payment authorization and shows expiry/caps. Existing-order detail exposes the exact authority; do not imply an off-chain billing order is already chain-authorized. |
| **Vault** | Current payment funds, reservations, confirmed spend, uncommitted authority and limits; compact paused/worker state | Separate Add payment funds, Add operating reserve and Set spending limit. Show current → proposed state, exact network/receiver/deposit/fees/permission scope before wallet approval. Evidence/hashes in Verification details; relevant review limitations remain visible at affected decisions. Do not hide them only in Help. |
| **Access** | Clear read-only membership scope and current verified owner; target-account form with explicit Grant or Revoke intent | Local validation, target-specific confirmation/result, busy state and retry. Do not promise a current viewer roster: the present UI/API does not expose one. If an authorized read capability is confirmed, render it; otherwise state that this form manages a known account, without inventing a list or owner-transfer feature. |
| **Recovery** | Separate headings for recorded chain attempts and worker jobs; actual unresolved count, reservation, exact outcome and safe next check | Prefer selecting a known recorded attempt where available; manual ID under advanced entry with its source explained. Read-only refresh/reconciliation and any broadcast/repair are visibly different actions. Empty queue ≠ no chain attempts. Never expose “retry payment” for an unknown outcome or invent proof that authorizes repair. |

Replace `TestnetControls` with focused presentation components using the existing handlers: `ReferenceImport`, `VaultFunding`, `SpendingLimits`, `AccessForm`, `AttemptRecovery`, `VerificationDetails`. Keep forms mounted or retain draft buffers deliberately when changing sub-sections. A field disappearing must not generate a new submission ID or erase a durable outbox.

## 3. Complete entry and all remaining pages

| Surface | Planned composition and interaction |
|---|---|
| **Sign-in** | Compact branded entry card, “Sign in with Meteor,” one primary Connect action and adjacent off-chain/no-funds explanation. Optional account entry and detailed compatibility help remain secondary. Constrain body measure to roughly 60–70 characters. Keep supported accounts, wrong-network and extension errors actionable. |
| **Approval / restoration / error** | Distinct Connecting, Waiting for Meteor, Verifying message and Loading workspace states. Saved-session restoration uses a stable skeleton; retryable RPC failure keeps the session and offers silent retry. Expiry explains fresh proof. Ordinary navigation/focus never introduces a signature. Do not suppress genuine authentication errors to simplify copy. |
| **New account / organization selection** | Same entry identity and spacing; honest zero counts; one Create organization action. Returning accounts see only authorized organizations, name, role and vault readiness. No fabricated balances and no permissions inferred from a connected wallet. |
| **Vault onboarding** | Review → wallet approval → on-chain verification progression. Owner, network, funding and fees remain above signing. Hashes and artifact details are expandable. Prepared, awaiting-chain, failed and verified each show one primary next action. A sent transaction is reconciled before retry; interrupted state restores the same intent. Never turn a UI “success” into a linked vault before owner/code checks pass. |
| **Overview** | Retain four distinct financial metrics and useful review/receipt entry points. Reduce oversized guardrail display text and duplicated status. Keep exact provenance and an unavailable state instead of fabricated zeros. |
| **Contractors owner** | One page title; profile list/detail with invitation, wallet request, orders and bills as sections. Container-driven single/two-column layout. Link replacement/revocation explains who loses access; consequential action gets explicit confirmation. Current approved recipient remains distinct from a wallet-change request. |
| **Invoice review** | Source text → reviewed fields → approved order → payment linkage. Label off-chain bill approval separately from chain eligibility. Show exact verified candidate/order if already available; otherwise explain ID source and validate the existing ID. Same invoice/reference/history across clarification. |
| **Payment history** | Readable amount/status/recipient, clear terminal vs unresolved outcome, confirmed-only transaction links. Payment detail owns its evidence and recovery entry. Approval/queueing never renders Paid. |
| **Contractor Submit a bill** | Work description and requested amount first; fixed NEAR testnet label, required work-order context next. Attachment/extraction under optional details. Structured preview and missing/conflicting details precede final submit. Pristine state is guidance, not a premature error. Preserve original text and label work-order-supplied fields. No new AI provider. |
| **My payments / Wallet details** | Stable three-tab contractor navigation. Current invoice state and clarification action are visible; confirmed-only links. Initial verification → owner approval timeline and separate wallet-change request state. Existing approved orders keep their original recipient. |
| **Demo routes / 404** | Same component quality with persistent simulated labels, accurate neutral/live/demo metadata and no private information in titles. Branded missing-route fallback gives a safe return to workspace; authority is rechecked before records display. |

## 4. Define the component and motion system together

Keep dark green structural navigation, pale green current selection, ivory canvas and white working surfaces. Use semantic tokens for ink, muted ink, divider, primary, destructive, warning, success and disabled combinations. Test actual foreground/background variants; a green base button must never overwrite a red destructive variant.

- Typography: restrained Georgia page titles can remain; one system/sans family for controls/data. Proposed 2rem page title, 1.25rem section title, .9375–1rem body, .8125–.875rem metadata. Use readable leading and rem spacing; test user text enlargement.
- Components: page heading, field/help/error, amount+asset, status, primary/secondary/destructive button, data list/table, empty state, skeleton, notice, dialog and verification disclosure. All receive default/hover/focus/pressed/disabled/loading/error states.
- Context-responsive composition: embedded billing stacks according to available content width. Amount+asset remains one readable unit; long IDs wrap in detail, not as vertical punctuation. Render fewer columns before shrinking type. Necessary tables may scroll inside a labeled region.

### Motion contract — Apple principles translated to this product

| Interaction | Planned behavior | Verification |
|---|---|---|
| Press | Immediate background/ink response on pointer-down; optional tiny 1–2% compression on primary controls | Release/cancel restores cleanly; no action commits until the existing click handler |
| Desktop collapse/expand | Icon rail remains anchored; labels reveal/fade, content gutter follows a coherent transition; retained preference restored without a flash | Retarget halfway through without a jump or locked input; no text scaling distortion, scrolling reset or authentication remount |
| Active destination | Restrained selection-surface movement between known rows; target text remains readable immediately | Different row distances, rapid back/forward, keyboard and reduced motion; no false loading animation |
| Mobile drawer | Enter/exit from the same left edge, scrim tracks progress, focus/inertness follows open state | Rapid open/close, resize, Escape, destination selection, long nav and interrupted motion |
| Popover / dialog | Short anchored reveal, reverse along the same path, focus established independently of animation completion | No clipping, obscured controls, delayed keyboard access or bounce on financial decisions |
| Loading / results | Skeleton only for real initial loading; retained data + action-local progress for updates; stable result/alert placement | Slow/failed requests, repeated refresh and resolution; no fake timer or success choreography |

Use a critically damped spring model (damping ratio 1, response roughly .24–.35s) for reversible spatial navigation, with no decorative overshoot. Animate from current presentation state and preserve velocity on retargeting. Select the implementation after a small profiling spike: a focused authored controller or lightweight existing runtime is preferable to adding a large animation dependency. Do not choose an SDK/version as part of this plan.

Opacity/transform are the default animated properties. Desktop content reflow must be profiled rather than assumed compositor-only: use limited layout interpolation or measured FLIP positioning without scaling text. Stop animation work at rest. No drag/swipe physics, haptics, sound or perpetual animation is needed to fix the sidebar.

Reduced motion uses static transitions or brief opacity feedback; no spring/slide. If translucent overlays are introduced, honor reduced-transparency and high-contrast preferences with solid surfaces and clear edges. The full-height green rail itself should remain solid and legible; Apple principles do not require imitating glass.

## 5. Execution order and gates

| Phase | Deliverable / dependency | Required gate before proceeding |
|---|---|---|
| 0 — evidence baseline | Preserve working diff, current screenshots/fixtures, current session and Paid evidence; map existing handlers/identifiers | No reset/rebase, secret/token copies or real mutations; all routes/states inventoried |
| 1 — release-quality primitives | Correct destructive/muted contrast, mobile expanded state, embedded landmark/heading metadata; establish variants/tokens | Actual computed contrast ≥4.5:1 normal / ≥3:1 large; all component states; truthful live/demo title; accurate drawer ARIA |
| 2 — full-height shell | `OwnerShell` and navigation/account slots; remove wallet-help bar and hard-coded offset; responsive/embedded layout | Rail top=0 and bottom=viewport bottom; stable auth owner and one subscription; help expansion cannot move rail; 320–1920px and text enlargement |
| 3 — five task surfaces | Decompose controls, records first, task-specific state and validation, secondary imports | Each first viewport contains useful records/state; correct default import kind; owner/viewer gates unchanged; no new roster/API assumed |
| 4 — entry/onboarding | Cohesive sign-in, empty workspace, picker and provisioning progression | No added signatures during navigation; all existing five-hour/session-switch tests; cancellation/interruption resume same outbox; owner verified before linking |
| 5 — billing/contractor | Container-based owner billing, preview-before-submit, correct wallet/request/review states | Invite → verification → owner approval → bill → clarification → review covered with fixtures; same text/reference/order/recipient preserved |
| 6 — motion integration | Interruptible sidebar/selection/drawer/popovers and local feedback | Rapid reversals, reduced motion, touch/keyboard, focus/inertness; no animation locks or duplicate actions; profile representative lower-powered environment |
| 7 — regression + visual acceptance | Full route/state goldens and browser checks, existing backend suite, read-only payment evidence | All functional tests pass without weakened assertions; visual/assistive-tech checks below; user accepts real-wallet navigation before publication |

The phases describe one planned completion pass. Do not ship phase 2 as another CSS offset patch and call the whole redesign complete.

## Acceptance checklist

- Every actual route and all nine owner views are checked at 320/390/768/900/1024/1280/1440/1920 CSS px. Test 200% zoom, 400% reflow and enlarged text; width alone is insufficient.
- Sidebar is continuous from top to bottom, independently scrollable when needed, recognizable collapsed, and unaffected by wallet-help/account expansion. No 98px gap, clipped footer, invisible focus target or blank gutter.
- Vendors and orders show their records before optional import. Vault shows current funds/limits; Access identifies scope/target; Recovery distinguishes jobs from attempts. Necessary action details remain visible before signing.
- All normal, hover, focus and disabled component combinations are reviewed; semantic destructive styling survives base rules. No payment amount breaks into characters at tablet widths.
- One main landmark and one page-level h1 per displayed page; appropriate embedded headings; accurate metadata; screen-reader check for account/drawer/status/validation flows.
- Desktop collapse, mobile open/close and selection reversals work during motion. Actual reduced-motion preference is tested separately from normal-motion clips. Frame timing and layout cost are measured before a performance claim.
- Skeletons match the page structure, reserve useful space and stop on completion/error. Empty/error/loading/paused/viewer/unknown-outcome states do not invent money, permissions or success.
- Session restoration survives navigation, refresh, focus changes and browser restart. Explicit logout/expiry and detected account changes clear protected records across tabs. No session transfers silently to a different Meteor selection.
- Existing work-order payment eligibility, immutable recipient, duplicate prevention, durable job and FINAL evidence rules remain authoritative. INV-0002's existing 0.001 NEAR Babygoat payment/link stays unchanged.
- Vault stays paused, worker revoked, execution disabled. No new signatures, deployment or live payment is authorized by UI acceptance. Read-only evidence verification is sufficient for preservation checks.
- Existing 96-backend / 94-browser-case baseline is rerun as appropriate with the new visual regression cases. Source-only states in the audit gain fixture coverage; real wallet acceptance is reported separately.

## Decisions and scope limits

Recommended decision: approve this complete sequence with the full-height shell as the structural foundation. The brand and basic left-navigation model are settled by the brief; no new aesthetic interview is required. Any missing backend read capability is reported before promising a UI that depends on it. No contract change, recurring payment, AI activation, provider, hosting rollout or data migration belongs in this plan.

Suggested skill sequence: `$impeccable harden` → `$impeccable layout` / `$impeccable adapt` → `$impeccable clarify` / `$impeccable onboard` → `$impeccable animate` → `$impeccable audit` → `$impeccable polish`. These are execution aids after approval, not new product features or substitutes for the explicit checks above.
