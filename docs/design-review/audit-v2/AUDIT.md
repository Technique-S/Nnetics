# Nnetics — complete interface audit

4 November 2026 · Current working implementation · Audit and plan only

**Verdict: the previous pass improved access to pages but did not finish their design.** The green/ivory identity is appropriate. The shared frame, administrative page composition and onboarding sequence remain inconsistent. Do not replace the brand or add decorative motion to conceal these problems.

Read the [implementation plan](IMPLEMENTATION_PLAN.md) after this audit. Source assessments: [A: design review](ASSESSMENT_A.md), [B: technical/browser review](ASSESSMENT_B.md). They were performed by separate automated agents without seeing each other's findings. These are independent design assessments within this task, not human user testing or independent security review.

## Method and reliability

- Actual Apple Design and Impeccable skill files were read. Impeccable context ran once against `apps/owner/src/app/page.tsx`; it found no PRODUCT.md or DESIGN.md. The existing implementation, README, build brief and prior review remain visual/product authority. Missing context files do not make this a new product. No context repair, invented interview or new branding was performed.
- Mode: **Operate** for every application surface. The user succeeds by completing a controlled billing/payment task. Visual ambition belongs in precise hierarchy, readable evidence and responsive feedback.
- Repository: `C:/Users/Kazi/Documents/PayScope_Foundation/payscope`, branch `codex/nnetics-live-integration`; reviewed both committed baseline `992ca22717c3f851a6969387f223f07830584c4e` and existing uncommitted implementation. Those changes were preserved. No applicable repository/ancestor AGENTS.md was found in the prior inventory; no new instruction file was introduced.
- The running app at `http://127.0.0.1:3100` was reused. Authenticated inspection used new browser contexts and intercepted synthetic responses, with visible watermarks. No existing user cookies, private links, wallet signing, data writes or payments were used. The public sign-in/configuration check used actual GETs and reported transactions disabled.
- **80 capture cases:** 68 route/state cases plus 12 additional provisioning/dialog/404 cases. Four viewports: 320, 390, 768 and 1440 CSS px. Full-page captures supplement initial-viewport images. [Geometry](evidence/measurements.json), [additional flow geometry](evidence/flow-measurements.json).
- No JavaScript exception or document-level horizontal overflow occurred in those cases. **That does not establish good layout:** the 768px embedded billing view fits its box while splitting monetary values into unreadable fragments.
- Detector ran successfully once: exit 2, three contextual warnings. It flagged Arial and a functional left-border disclosure; those are not treated as release defects. The browser overlay was attempted but blocked by the app's CSP on four disposable views. The helper was stopped; no overlay or clean detector pass is claimed. Browser inspection and computed-style evidence proceeded without weakening CSP.
- This audit did not rerun the production test suite. The preceding implementation's recorded 96 backend / 93 browser passes + one skip remain historical regression evidence. Passing tests did not cover the visual defects below.

## Scores and strengths

Design heuristic assessment: **22/40**. Technical rubric: **13/20 provisional**. The latter includes a source-only performance estimate; it is neither a measured performance result nor WCAG certification. Full scoring and ten heuristic judgments are in A/B.

Keep: exact financial values, original invoice text, immutable recipients, explicit demo labels, separate approval/payment states, retained-session recovery, real initial-loading skeletons, native dialogs and keyboard drawer controls. Those are product-specific assets. Keep dark green navigation, pale green selection, warm neutral surfaces and restrained serif page titles. Operational labels, fields and data should remain a consistent sans-serif.

## Prioritized findings

Consolidated inventory: **0 P0, 7 P1, 6 P2, 1 P3**. Priorities describe interface impact, not contract vulnerabilities.

| ID | Priority | Finding, cause and impact | Required correction |
|---|---|---|---|
| F1 | P1 | **Administrative content still precedes records.** `page.tsx` mounts `TestnetControls` before vendor/order content. Vendor cards start around y=986 desktop; approved work around y=913. Mobile orders begin around y=1280. The import selector defaults to Work order even on Vendors. | Records first. Context-specific Import is secondary and defaults to its own entity. Remove repeated organization/disconnect/technical preamble from every page. |
| F2 | P1 | **Tablet contractor billing is unreadable.** The 240px rail leaves only ~528px at a 768px viewport, but portal columns stack only below a 700px *viewport* breakpoint. `0.001 NEAR`, statuses and IDs fragment vertically. | Container-aware layout and explicit embedded mode; keep amount+asset together. Do not equate “no overflow” with readability. |
| F3 | P1 | **Destructive buttons nearly disappear.** A later generic `.button` background overrides `.danger`: red `#a13f31` on green `#1b6650`, measured **1.068:1**. Revoke access and Reject bill take primary-action fill. | Fix variant precedence and all interaction states before release; no blanket base rule may override semantic variants. |
| F4 | P1 | **Supporting text falls below normal-text contrast requirements.** Computed examples measure about **3.92–4.48:1** on the actual flat surfaces; affected guardrail text, vendor IDs and portal supporting labels. | Semantic foreground/surface tokens tested in context, not just a token swatch sheet. See B2 for exact pairs. |
| F5 | P1 | **Mobile navigation state is inaccurate.** `aria-expanded={open || !collapsed}` uses the desktop preference even when the mobile drawer is hidden. | Responsive state owns the exposed expanded value; verify initial render, Escape, selection and resize. |
| F6 | P1 | **Vault, Access and Recovery lack decision context.** A generic transaction preamble appears before every form, while current limits, target membership or attempt context are absent. Inputs remain enabled during requests. Some membership/import actions are server writes, so “each action opens your wallet” is inaccurate. | Per-page state and local validation/progress. Identify the target and effect before dispatch; accurately distinguish server actions, read-only checks and wallet transactions. |
| F7 | P1 | **Billing approval and chain authority require a mental bridge.** Contractors contains orders and invoice review; separate Work orders/Invoice review expose chain records. Linkage asks for a chain order ID. | Explain the workflow and relationship on the current invoice; preserve the separate stores and authorities. Offer only already verified matching candidates if supported; never infer eligibility from a profile or invoice reference. |
| F8 | P2 | **The sidebar is structurally cut off.** `Onboarding` renders identity + wallet-help bars outside `Dashboard`. Final CSS uses `top:98px;height:calc(100dvh - 98px)`. Opening help or wrapping identity changes height without changing that offset. | Full-height left column from viewport top to bottom, with header only over the content column. Move wallet-session help into the account popover. Delete the compensating offset, not another patch. |
| F9 | P2 | **Sidebar motion is a collection of isolated effects.** Desktop gutter/labels snap, mobile uses one fixed-duration slide, active state changes fill only. No coordinated press/selection/reversal behavior. | A small, interruptible motion vocabulary tied to actual navigation state. No route-loading choreography or new gestures required. See motion contract in the plan. |
| F10 | P2 | **Sign-in and onboarding read like support documents.** Wide prose, repeated authority explanations, no compact staged task composition; new workspace and draft setup are visually detached from the owner shell. | Cohesive entry scaffold, one primary action per stage, short reassurance next to the action and secondary connection/verification details. Preserve every signing disclosure at its decision point. |
| F11 | P2 | **Contractor submission is too long.** Around 3400px at 390px: optional extraction/attachments precede required work details; preview follows Submit; pristine form already says Needs clarification. | Text + requested amount first, fixed currency, required order next, optional tools later, preview/clarification before final submit. Do not activate an AI provider. |
| F12 | P2 | **Embedded semantics and metadata drift.** Draft onboarding nests main landmarks and h1s. Live contractor tab title says “Contractor demo.” | Explicit standalone/embedded shell semantics and truthful route metadata; no private identity in titles. |
| F13 | P2 | **Recovery empty-state scope is ambiguous.** Queue may be empty while finalized transfer history has a pending attempt. “No durable invoices yet” sounds like global absence. | Distinguish queue records from finalized attempts and scope each empty state. Unknown outcomes remain reserved and cannot be retried from UI inference. |
| F14 | P3 | **Touch and small controls need refinement.** 40px nav toggle, 34×20 payment switch and detached checkbox indicators. These are comfort/style findings; size alone does not establish an AA failure where spacing exceptions apply. | At least 44px intended hit area, consistent checkbox rows, rem-based spacing and stable label alignment. |

### Evidence to review first

| Problem | Captures |
|---|---|
| The five requested sections | [Vendors](evidence/vendors-desktop-full.png), [Work orders](evidence/work-orders-desktop-full.png), [Vault](evidence/vault-desktop.png), [Access](evidence/access-desktop.png), [Recovery](evidence/recovery-desktop.png) |
| Broken shell boundary | [Wallet help expanded](evidence/sidebar-wallet-note-expanded.png), [collapsed rail](evidence/sidebar-collapsed.png), [mobile drawer](evidence/sidebar-mobile-open.png) |
| Embedded layout | [768px contractor owner view](evidence/owner-contractor-tablet.png), [mobile full bill form](evidence/contractor-submit-mobile-full.png) |
| Entry/setup discontinuity | [Sign-in](evidence/signin-desktop.png), [empty workspace](evidence/state-empty.png), [draft organization](evidence/state-draft.png), [awaiting-chain setup](evidence/provision-awaiting_chain-mobile-full.png) |

## Complete route and flow coverage

There are **three product page routes**, not nine separate owner routes. `/` renders identity/onboarding and nine hash-selected owner views. `/contractor` renders the private or explicit demo contractor flow. `/demo/contractors` is the demo owner route. `/?mode=demo` is an explicit root variant. API handlers and isolated design-review prototypes are not extra product pages. There is no custom 404/error page in this source tree; the default missing-route screen was captured.

| Surface | Audit result / plan implication | Inspection boundary |
|---|---|---|
| Sign-in `/` | Preserve selected-account Meteor connection; shorter copy, constrained card, recognizable Nnetics entry identity | Rendered at four widths; actual public GET inspected |
| Wallet connection / awaiting proof / failed proof / accepted proof awaiting workspace | Distinct stage labels; cancel/retry nearby; accepted proof failure offers saved-session recovery, not another signature | Source branches reviewed; no real wallet approval/cancellation executed |
| Restore / temporary RPC failure / expiry / account switch | Stable skeleton and retry surface; explain session preserved vs expired; never treat focus loss as identity change | Restoration/RPC/viewer fixtures rendered; expiry and switch branches source-reviewed |
| New account / organization creation | Empty account truth, no fabricated balances, one Create organization action | Empty fixture rendered; successful creation/errors source-reviewed |
| Organization picker / returning owner | Show authorized name, role and vault readiness; retain workspace context across transition | Ready and draft fixtures rendered; multiple-org permissions source-reviewed |
| Create vault / prepared / awaiting chain / failed / verified | Compact review → wallet → verify timeline, exact costs/owner/network visible, one safe next action | Four progress states rendered desktop/mobile; actual signing and chain transitions not performed |
| Overview | Preserve useful metrics; remove duplicate context and oversized guardrail typography; direct review/receipt links | Four widths, zero budget, paused, no-pending and viewer states |
| Contractors owner view | Remove duplicate page heading; container-aware profiles/order/bills; repair danger controls | Four widths, empty/error and wallet-request states; mutation rules source-reviewed |
| On-chain vendors | Actual recipients/status first; import secondary; explain future-disable vs immutable existing recipient | Four widths and open Manage vendor dialog |
| Work orders | Record list/status/recipient/amount first; import secondary; distinguish off-chain order from chain authority | Four widths and open New work order dialog |
| Invoice review | Keep source/order comparison; distinguish reviewed, linked, held, pending and paid; action-local validation | Four widths and open invoice dialog; no submission |
| Payment history | Preserve exact outcome and verified transaction link; readable mobile amount/status; direct recovery context | Four widths; unknown outcome and evidence rules source-reviewed |
| Vault | Ledger/authority/reserve/limits above Add funds or Set limit; current → proposed values | Four widths; existing handlers reviewed, not invoked |
| Access | Read-only membership scope, target account, clear grant/revoke results; roster only if supported by authorized read API | Four widths; no membership mutations; no current roster invented |
| Recovery | Recorded attempts first, reservation + evidence + next safe read-only check; queue separate | Four widths; no reconciliation or repair request sent |
| Contractor Submit a bill | Focus on work and amount, then order, then structured confirmation; optional extraction secondary | Four widths, full mobile form; validation branches source-reviewed |
| Contractor My payments | Review/payment states distinct, original reference and exact amount, confirmed-only links | Four widths; no new real payment evidence obtained |
| Contractor Wallet details | Current approved wallet distinct from request, immutable order warning, approval timeline | Four widths; pending-request and revoked-link fixtures |
| Explicit demos | Shared components but persistent simulated labeling and correct titles; no demo identity attached to live records | Both demo routes rendered; no demo mutation submitted in this audit |
| Default 404 | Explain route unavailable; propose safe return link in a branded fallback without exposing records | Default route rendered; custom fallback is proposed, not implemented |

No product webpage was omitted from the route inventory. Not every combination of validation, identity, network and transaction outcome was executed. Remaining source-only and manual boundaries above are deliberate and must not be relabeled as real-wallet acceptance.

## Cognitive and emotional flow

Current flow alternates between a polished payment desk and a technical control console. Entry produces uncertainty, the organization stage repeats ownership caveats, administrative pages ask users to recall IDs, and the contractor form postpones confirmation until after many optional decisions. That inconsistency creates the generic feeling more than the palette does.

The target emotional sequence is **recognition → safe entry → clear next step → confident review → trustworthy receipt**. For a new account, success is an honest empty workspace. For a returning owner, it is immediate authorized context. For a contractor, it is knowing what was submitted and whether the owner needs clarification. For Recovery, a calm truthful “unresolved; reserved; next check available” is a successful state; animation must not suggest transfer completion.

Questions skipped: the brief already settles preservation of the existing identity, full-height sidebar and complete application coverage. The one decision before code is approval of the linked phased implementation plan. No provider, hosting or financial approval is requested by this audit.
