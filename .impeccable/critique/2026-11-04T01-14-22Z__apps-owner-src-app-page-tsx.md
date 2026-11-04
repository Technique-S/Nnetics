---
target: Nnetics full application UI and sidebar
total_score: 22
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 7
target_identity: "file:C:\\Users\\Kazi\\Documents\\PayScope_Foundation\\payscope\\apps\\owner\\src\\app\\page.tsx"
target_fingerprint: "sha256:a125b37f2110f06ad3e920ec3dacf6214e743f66930b1d4a3d9c8078afdb3225"
target_path: "C:\\Users\\Kazi\\Documents\\PayScope_Foundation\\payscope\\apps\\owner\\src\\app\\page.tsx"
timestamp: 2026-11-04T01-14-22Z
slug: apps-owner-src-app-page-tsx
---
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
# Assessment A — Nnetics implemented interface

Method: independent design assessment by `/root/design_review`, completed without detector output. Assessment B and synthesis belong to the parent run. Date: 2026-11-04.

Target: `C:/Users/Kazi/Documents/PayScope_Foundation/payscope/apps/owner/src/app`. This is the current implementation, including approved uncommitted changes. Audit only; no production files, wallets, organization records, or databases were changed.

## Design specificity verdict

Nnetics has an identifiable, suitable direction: forest-green navigation, an ivory working canvas, restrained serif page titles, plain sans-serif operational text, thin borders, and deliberate emphasis on fixed recipients and bounded payment authority. Keep that direction. A new logo, glass treatment, gradient system, or different visual brand would not address the current problems.

The strongest product-specific design appears in invoice comparison and the distinction between available funds, reserved funds, and spending authority. The weakest appears in the five administrative views: a shared developer-oriented control block gives different tasks almost the same first screen. The composition is authored, but the information architecture still exposes implementation boundaries. In particular, users must learn two work-order and invoice-review systems, then manually bridge their identifiers.

The largest opportunity is to make each page begin with the record or decision the user came for. Preserve the existing safety facts and authority model while giving technical evidence a deliberate secondary position.

## Evidence and coverage

I read `page.tsx`, `onboarding.tsx`, `vault-onboarding.tsx`, `testnet-controls.tsx`, `dashboard-navigation.tsx`, `contractor-owner.tsx`, `contractor/page.tsx`, `demo/portal-ui.tsx`, `demo/contractors/page.tsx`, relevant adapter methods, `globals.css`, and `demo/portal.module.css`. The critical source locations are cited below. I read the Impeccable Assessment A/cognitive-load/scoring instructions and Apple design skill. No detector reports were opened.

Screenshots were inspected using `view_image`. These are rendered source-backed fixtures, not evidence that real wallet approval, deployment, access changes, or payments were executed. The black “AUDIT FIXTURE” badge is capture infrastructure and is excluded from UI criticism. Fixture identifiers and synthetic ledger combinations are not treated as production data defects.

| Actual surface / state | Evidence inspected | Coverage limit |
|---|---|---|
| Public `/` sign-in | `audit-v2/evidence/actual-public-signin.png`, `signin-narrow.png`; earlier `implemented/actual-public-signin.png` | Real public rendering inspected; no wallet interaction |
| Restore and retryable verification error | `implemented/state-restoring.png`, `state-rpc-error.png`; same states copied into audit-v2 evidence | Rendered fixture plus source |
| Wallet connection, awaiting message approval, signature failure, accepted-message/workspace-load failure, switch/sign-out | `onboarding.tsx:235–278`, `286–320`, `448–505` | Source-only transitions; no real Meteor approval, rejection, or cancellation tested |
| No organizations / create organization | `implemented/state-empty.png`, `onboarding.tsx:324–425` | Empty state rendered; creation success/failure source-only |
| Organization selection / draft organization / vault start | `implemented/state-draft.png`, `onboarding.tsx:344–388` | Draft selection rendered; multiple authorized organizations and selection errors source-only |
| Vault provisioning prepared, disabled, awaiting-chain, failed/retry, verified | `provision-prepared-desktop-full.png`, `provision-awaiting_chain-mobile-full.png`, `provision-failed-desktop-full.png`, `provision-verified-mobile-full.png`; `vault-onboarding.tsx:93–255` | All four progress states rendered as fixtures; actual wallet dispatch, checked review state and chain transitions source-only |
| Owner vendor/order/invoice dialogs | `dialog-vendors.png`, `dialog-work-orders.png`, `dialog-invoice-review.png`; `page.tsx:109–181,1218–1354` | All three open dialogs rendered with default fields; submission and validation errors source-only |
| All nine owner views | Expanded desktop evidence for Overview, Contractors, Vendors, Work orders, Invoice review, Payment history, Vault, Access, Recovery; full-height Vendors, Work orders, Contractors | Every actual owner view visually inspected |
| Mobile owner views | `owner-overview-mobile.png`, `owner-contractor-mobile.png`, `invoice-review-mobile.png`, `payment-history-mobile.png`, `vault-mobile.png`, `access-mobile.png`, `recovery-mobile.png`, `vendors-mobile.png`, `work-orders-mobile-full.png` | Mostly 390px; representative 320px Invoice review and 768px Overview/Contractors also inspected |
| Sidebar / account controls | `sidebar-collapsed.png`, `sidebar-mobile-open.png`, `sidebar-wallet-note-expanded.png`, `account-menu.png` | Rendered; focus trapping, Escape, return focus, inert content checked in source rather than exercised |
| Viewer, zero budget, no pending transfers | `implemented/state-viewer.png`, `state-zero-budget.png`, `state-zero-pending.png` | Rendered fixtures; do not infer ledger correctness from intentionally varied fixtures |
| Contractor `/contractor` three sections | Expanded desktop My payments and Wallet details, desktop/mobile full Submit a bill; narrow Wallet details | All three sections rendered; real private-link authentication not tested |
| Contractor pending wallet / revoked access | `implemented/contractor-wallet-pending.png`, `contractor-revoked.png` | Rendered fixtures plus source |
| Contractor clarification, extraction consent/confirmation, upload errors, empty orders/history, owner record lock/retry | `contractor/page.tsx:90–168`, `contractor-owner.tsx:22–103`, `demo/portal-ui.tsx` | Clarification card rendered; remaining interaction/error branches source-only |
| `/?mode=demo` and `/demo/contractors` | `audit-v2/evidence/demo-route.png`, `demo-owner-route.png` | Both actual routes rendered; no demo mutations performed |

No claim is made that every state was exercised at every width. Expanded captures exist at 320/390/768/1440; this assessment manually sampled those widths as recorded above. Motion was reviewed in source, not in a live frame-by-frame session.

## Nielsen design health

Scores are quality scores: 0 = absent/poor, 4 = excellent. All ten heuristics apply to this operational product.

| # | Heuristic | Score | Evidence-led assessment |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Restore skeleton, status messages, fixed-recipient information and pending reservations are strong. Administrative requests lack local busy/disabled feedback; several states are described only in generic page-level notices. |
| 2 | Match between system and real world | 2 | “Submit a bill” and owner clarification work well. “Weak subjectivity,” “historical verifier,” “bootstrap trust,” and duplicate kinds of approved work require implementation knowledge. |
| 3 | User control and freedom | 3 | Modal cancel/Escape, wallet switching, sign-out, drawer close, retry verification, and clarification cancellation exist. Unsaved text has no stated recovery contract. |
| 4 | Consistency and standards | 2 | Cohesive color/type system; three contractor tabs are familiar. Two invoice-review/work-order concepts share names, and danger buttons inherit a green primary background. |
| 5 | Error prevention | 2 | Signature/authority gates and immutable-recipient guidance are explicit. Operational forms still accept blank/invalid values until dispatch, repeated clicks remain enabled in TestnetControls, and dangerous link replacement is immediate. This score concerns interaction design, not a security audit. |
| 6 | Recognition rather than recall | 2 | Overview queue is recognizable. Recovery asks for a remembered attempt ID; invoice linkage asks for a chain order ID; Access does not display current viewers. |
| 7 | Flexibility and efficiency | 2 | Hash navigation, persistent sidebar collapse, native controls, refresh and scrollable tables are useful. Operators repeatedly traverse broad admin blocks and manually bridge identifiers. |
| 8 | Aesthetic and minimalist design | 2 | Calm palette and restrained decoration. Required tasks are displaced by repeated technical prose; nested cards and duplicate headings enlarge several workflows. |
| 9 | Recognize, diagnose and recover from errors | 2 | Saved-session retry and clarification preserve the correct task direction. Many adapter errors are displayed as raw message strings, field-level diagnosis is limited, and Recovery does not explain where to get the requested ID. |
| 10 | Help and documentation | 2 | Strong inline authority/funding boundaries and wallet-proof explanation. Help often explains the backend instead of the next user step; no concise “what do I do now?” path spans billing approval to a verified payment attempt. |
| **Total** | | **22/40** | A credible foundation with substantial workflow and responsive gaps. |

## What works

1. **A calm, appropriate financial workspace.** The dark green sidebar creates stable orientation, the 36px serif titles identify the page without decoration, and numerical amounts remain prominent. The off-white canvas and thin borders keep the operational surface quiet. This visual direction already has enough character.
2. **The product makes important distinctions visible.** The overview separates authority, reserves, spend and payment funds. Invoice review puts invoice recipient and approved recipient together. Contractor wallet status distinguishes the current approved wallet from a requested replacement. These choices directly support correct decisions.
3. **Recovery-oriented states are present.** Session restoration explains that another signature is unnecessary; retryable verification failure offers a saved-session retry; contractor clarification retains the same invoice; revoked access removes private records and says what to request. Source also contains real focus management for the mobile drawer and reduced-motion handling.

## Priority issues

### 1. [P1] Administrative plumbing occupies the page before the records

**Rendered evidence:** In `vendors-desktop-full.png` the first vendor cards start near y=986; in `work-orders-desktop-full.png` the “Approved work” panel starts near y=913. Their first viewport is dominated by “Import existing references.” On the mobile Work orders capture the actual records begin around y=1280. Vault, Access and Recovery repeat the same organization ID, disconnect control, owner/vault line, block hash and deployment paragraph before reaching the task. Their mobile action fields are below the first viewport.

**Source evidence:** `page.tsx:567` renders `TestnetControls` before page-specific records. `testnet-controls.tsx:35–63` repeats the generic preamble for every section. The reference type initializes to `order` at line 27, including on the Vendors page.

**Why it matters:** The first screen tells owners that importing a technical reference is the main task even when records already exist. Mobile users pay a full screen of reading and scrolling before seeing the object they came to inspect. Blanket caution is losing its ability to direct attention.

**Recommendation:** Put vendor records and approved orders first. Make “Import existing vendor/order” a secondary, contextual disclosure next to the list and default it to the current object. On Vault/Access/Recovery, keep a compact identity/network line and show only the task-relevant warning before the form. Put block/hash/review details in “Verification details,” preserving all substantive facts. Move session disconnect into the existing account control. Give empty states their next permitted step. Suggested commands: `$impeccable layout`, `$impeccable distill`, `$impeccable clarify`.

### 2. [P1] The embedded contractor workspace breaks at tablet widths

**Rendered evidence:** `owner-contractor-tablet.png` at 768px retains the 240px sidebar and a two-column contractor grid. Nested invoice content becomes so narrow that “Needs clarification” and “0.001 NEAR” split inside words, with “NEA / R” on separate lines. References become tall vertical blocks. Desktop has a second “Contractors and bills” h1 below “Contractors”; mobile repeats those two introductions before reaching a contractor.

**Source evidence:** `globals.css` reserves `--shell-nav:240px` above 760px. `portal.module.css:1–2` sets two columns until a viewport breakpoint of 700px, which cannot detect the much narrower available space inside the owner shell. `contractor-owner.tsx:94` creates its own full-page introduction and h1; `page.tsx:531,566` wraps it in another.

**Why it matters:** This is a readability failure for payment amounts and record identity at a common working width, not a cosmetic preference. The same component needs to work as a standalone portal and as an embedded surface.

**Recommendation:** Make the embedded component respond to its container width. Stack its sections when the available content cannot support readable forms and invoice cards; retain the full two-column layout only when it fits. A local owner-layout breakpoint is a reasonable fallback. Keep amount+asset together, let references wrap at useful boundaries, and remove the repeated page-level introduction in embedded mode. Validate 768/900/1024px with long names and amounts, plus 200% zoom. Suggested commands: `$impeccable adapt`, `$impeccable typeset`.

### 3. [P1] Billing approval and payment authority require a mental bridge

**Rendered evidence:** The sidebar offers “Contractors,” “On-chain vendors,” “Work orders,” and “Invoice review.” Inside Contractors there is another “Approved work orders” panel and another “Invoice review” panel. The main page’s subtitle says each order authorizes an exact payment; the contractor introduction says work-order approval there is off-chain only. The distinction is technically stated, but users must hold it in memory while moving between similar names.

**Source evidence:** `contractor-owner.tsx:94,102–103` contains off-chain work approval and bill review, then asks for “Approved on-chain work order ID” to link an approved bill. `page.tsx:299–307,890–961` represents on-chain orders and structured invoice review separately. `dashboard-navigation.tsx:3,23` exposes nine peer destinations without domain grouping.

**Why it matters:** An owner can correctly approve a contractor bill and still not know where it will appear next, why it is not payable, or which “work order” was just approved. Exact manual identifiers create a recall burden in a workflow whose core promise is explicit, verifiable linkage.

**Recommendation:** Keep the two authority domains, but name them at the point of action: for example “Billing work approval” and “On-chain payment authorization.” Show each bill’s next state and linkage requirement beside that bill, with the recipient and amount repeated. Where existing data supports it, provide a matching approved-order selection; otherwise explain where to copy the required ID and validate the match before commit. Group sidebar links into small labeled sections such as work/billing and vault administration without hiding active locations. State counts by domain so “Invoice review 2” cannot imply it includes the one bill visible elsewhere. Suggested commands: `$impeccable shape`, `$impeccable clarify`.

### 4. [P1] Vault, Access and Recovery expose commands without enough current-state context

**Rendered evidence:** Vault is an action dropdown and “0.1” field with no current funding/limit summary on the page. Access has one blank account field and equally weighted Grant/Revoke buttons with no current viewers shown. Recovery asks for a recorded attempt ID, while an empty durable-invoice message and a global unresolved-transfer banner can appear together. The fixture may legitimately contain different record domains; the wording does not help users distinguish them.

**Source evidence:** `testnet-controls.tsx:21–28,64–160,198–220`. These controls do not receive a busy state; their fieldset disables only for a non-owner. Inputs are not in a validated form and submit buttons are enabled for empty values. Recovery renders `snapshot.queue`, whereas the global pending banner derives from `snapshot.payments` in `page.tsx:294,599`. The shared claim “Each action opens your wallet” at `testnet-controls.tsx:54–56` is inaccurate for the Access `api("members", ...)` requests at lines 131 and 149.

**Why it matters:** Owners must infer whether an amount adds funds or replaces a limit, whether a viewer already has access, and whether an empty queue means no unresolved payment. Missing local request feedback invites repeated actions. Incorrect wallet expectations weaken trust in otherwise careful signing explanations.

**Recommendation:** Vault should show relevant current ledger/limit values above the existing action, distinguish “Add” from “Set total,” and show the proposed change before the wallet. Access should explain that it changes read-only organization membership and identify the target account in feedback; display known current membership when supported. Recovery should explicitly separate worker-queue records from finalized transfer attempts and provide a recorded-attempt selection or clear ID source. Disable only the action in progress, show its pending/completed result locally, and validate blank or malformed values before dispatch. Preserve read-only behavior and unknown-outcome reservations. Suggested commands: `$impeccable harden`, `$impeccable clarify`.

### 5. [P2] Contractor actions need a cleaner completion path and reliable visual semantics

**Rendered evidence:** The contractor bill form is roughly 3,400px tall at 390px. Optional attachment/AI controls appear before the required work-order field; the formatted preview follows the submit button on mobile. A blank preview announces “Needs clarification” before a person has attempted anything. `owner-contractor-desktop-full.png` and `demo-owner-route.png` show Revoke access and Reject bill as red text on dark green. The AI consent checkbox sits detached above its long label because broad input styles also style checkboxes.

**Source evidence:** `contractor/page.tsx:144–157` sequences text, format, amount, attachment, extraction, required payment details, submit, then preview. `portal.module.css:1` styles `.card input` as a full-width block; line 27 later resets every `.button` background to green after the `.danger` rule on line 1. `contractor-owner.tsx:99` replaces or revokes a private link immediately; the consequence explanation appears in the generated invitation at line 97 rather than adjacent to the existing-link action.

**Why it matters:** A first-time contractor must decide whether formatting, local extraction, AI extraction, attachment, or direct entry is the intended path. The mobile preview cannot conveniently support the review decision. Destructive actions lose the familiar color distinction and may be hard to read. Immediate link replacement can unexpectedly end a contractor’s current access.

**Recommendation:** Put the essential sequence first: approved work, work description, amount, review, submit. Keep extraction and attachments in a clear optional disclosure, retaining informed consent before external extraction. Bring a concise payment summary beside the final action on mobile. Reserve “Needs clarification” for an actual review state; use “Add a description” for an untouched field. Add `.button.danger` styling with a readable destructive palette and a proper checkbox/label row. Put link-replacement consequences next to the control and use a focused review step for immediate access invalidation. Suggested commands: `$impeccable onboard`, `$impeccable polish`, `$impeccable harden`.

## Cognitive load

Intrinsic complexity is real: organizations, wallet identity, billing approval, chain authorization and unresolved payment outcomes are distinct. The UI should teach those distinctions through the current decision rather than repeat all of them everywhere.

| Checklist | Result | Specific observation |
|---|---|---|
| Single focus | Fail | Record lists compete with import/setup, and the contractor form competes with extraction choices. |
| Chunking, four or fewer | Fail | Nine ungrouped owner destinations; a provisioning review exposes about twelve technical facts in one definition list. |
| Related grouping | Pass | Panels, invoice recipient comparisons and contractor tabs generally group related information. |
| Visual hierarchy | Fail | Import/setup leads records; tablet nested cards lose hierarchy; the Overview primary CTA is invoice entry rather than the visible review queue. |
| One decision at a time | Fail | Contractor creation, existing-link access controls, order approval and invoice decisions are simultaneously open. |
| Minimal choices | Fail | The nine-item owner navigation and combined contractor workbench exceed four peer choices. Four funding actions and three contractor tabs are within the stated threshold themselves. |
| Working memory | Fail | Chain-order and recorded-attempt IDs must be obtained elsewhere; users must distinguish two work-order domains. |
| Progressive disclosure | Fail | Technical warnings and optional extraction appear in the default reading path. Sign-in’s optional account disclosure is a good exception. |

**Seven failures = high cognitive load under the skill rubric.** That applies to the combined operational surface; the three-tab contractor navigation itself is low load. A sidebar exceeding four items is not by itself a blocker. Here, grouping is useful because the destinations correspond to materially different authority domains.

## Emotional journey

**Arrival:** The restrained brand and “no transaction, funds or keys” explanation reassure, but the sign-in introduction starts with wallet capability and access constraints before saying what Nnetics helps a person accomplish. At 320px the text consumes most of the first screen. Lead with the task and show one clear connect action, retaining the necessary testnet/identity facts near it.

**Restore:** A strong moment: the interface explicitly says no new signature is needed and renders a skeleton. The retryable-error state preserves a saved-session retry. Give that recovery path visual precedence when it is the recommended route instead of allowing the green Connect action to compete.

**First organization:** Zero counts are honest. Draft creation then becomes a valley: a large technical vault setup appears before the still-usable billing workspace, and “Create vault” means preparing a review rather than immediate creation. Label the first step as reviewing setup; separate billing readiness from vault readiness. Expanded prepared/awaiting-chain/failed/verified fixtures confirm that most progress feedback lives near the bottom of the twelve-fact evidence table. Bring a plain state and next action to the top. A verified vault still leads to a generic “Resume / reconcile provisioning” control; give completion a clear end and appropriate next step while retaining read-only reconciliation as secondary. Real wallet dispatch/approval remains source-only.

**Routine work:** Recipient/amount comparison is the positive peak. The user can see what was approved. The repeated administration preamble and duplicate approval vocabularies then interrupt momentum.

**High-stakes change:** The product explains that messages, membership and payment authority differ, but some controls undermine the explanation through generic wallet copy, anonymous amount fields, and non-local pending feedback. At these moments use specific action/result language and current/proposed values.

**Completion:** “No payment was initiated” is valuable, but as a repeated ending it leaves a bill submitter without a next expectation. The endpoint should say what was saved, who acts next, and where status can be followed. Keep payment-disabled facts visible in the appropriate context. The clarification card’s owner note and “Answer clarification” already do this well.

## Per-surface design plan

| Surface | Concrete next design action |
|---|---|
| Sign-in | Keep one Connect CTA; place the task promise before connector restrictions; preserve specific-account disclosure; emphasize saved-session retry when appropriate. |
| Wallet approval/error | Keep off-chain-message reassurance adjacent to the pending stage; expose clear retry/cancel consequences; distinguish an accepted signature followed by workspace failure. Source-only state recommendations. |
| Organization creation/selection | Show each organization’s name, role and readiness in a consistent list; separate “Open billing records” from vault readiness; put new-organization creation behind a secondary action when organizations already exist. |
| Vault onboarding | Separate prepare/review/sign/verify; show a concise network/owner/funding summary first and hashes in expandable evidence; show configuration availability before suggesting creation. Put current progress and recommended next action above the long evidence list; distinguish verification from a retry that can request a transaction. Give the verified state a clear completion path. Never hide funding or immutable-code facts from approval. |
| Sidebar | Preserve 44px rows and active state; group work versus administration; keep screen-reader names/tooltips in collapsed mode; adapt desktop width before starving content. |
| Overview | Put the review queue and actionable unresolved status nearer the top on mobile; retain the four financial concepts but explain authority versus cash in plain terms. Remove promotional “Clear boundaries” text if it displaces useful limits on narrow screens. |
| Contractors | Use one page title; choose a contractor then show their current workflow; stack based on container width; distinguish billing work approval from chain authorization. |
| Vendors | Lead with known vendor records; contextual vendor import; make recipient-change implications part of the edit decision. |
| Work orders | Lead with approved orders; contextual order import; preserve fixed recipient/amount/expiry; on small screens keep amount, status and next action together instead of requiring a table pan for the decision. |
| Invoice review | Keep desktop side-by-side comparison; make mobile selection lead directly to the chosen invoice detail with a clear return to the queue; distinguish structured invoices from contractor bills. |
| Payment history | Keep all outcomes and unknown-outcome explanation; prefer contextual record details on mobile so outcome/reference are available without a horizontal memory bridge. |
| Vault | Show current balances/limits and the meaning of Add versus Set; retain wallet review and separate storage/payment ledgers. |
| Access | Present current read-only membership when available; show the selected target and resulting change; remove claims that membership requests open the wallet. |
| Recovery | Label queue versus finalized attempts; surface unresolved records and their IDs; clarify that reconcile checks evidence and does not authorize an unknown-outcome retry. |
| Contractor Submit a bill | Put required fields first; disclose optional assistance; put final summary before submit at narrow widths; correct checkbox and danger styles. |
| Contractor My payments | Keep the owner note/action pairing; add a concise next expectation to each real status; do not call off-chain approval Paid. |
| Contractor Wallet details | Keep approved/requested wallets separate; replace protocol explanation with a plain first sentence and optional verification detail; make pending owner action prominent. |
| Contractor unavailable | Retain privacy-preserving blank state; give a simple actionable route to ask the known owner for a replacement link when contact information exists. Do not expose private data in an error. |
| Both demo routes | Preserve explicit simulation labels; retain production vocabulary distinctions; explain where demo changes persist and how to return to the real sign-in flow. |

## Persona red flags

**First-time studio owner:** Approves a contractor’s bill, then sees a different Invoice review destination and must identify an on-chain work-order ID. The current copy states the boundary but does not walk them across it. The draft organization first foregrounds blocked vault setup over usable billing records.

**Finance operator on a tablet:** At 768px the Contractors view fractures amounts and identifiers; the global navigation takes almost a third of the viewport. Recovery requires typing an attempt ID without a visible record picker or source. Routine work is slower precisely where accurate reading matters.

**Contractor working from a phone:** The task is simple—request an agreed amount for completed work—but the form presents formatting, attachments and extraction before the required approved-work selection. The preview appears after submit, and a browser reload has no stated draft guarantee. The pending wallet state is much clearer than the initial form.

## Minor observations and verification boundaries

- Header refresh is discoverable by accessible label but visually quiet and detached from the content on wide screens. A visible “Updated…” time/status would reduce needless repeated refreshes if the data source can supply one.
- The expanded wallet-session notice increases header height while desktop sidebar positioning assumes 98px in the final `globals.css` rule. The screenshot shows the sidebar beginning beneath a taller notice; validate long account names and zoom rather than relying on a fixed offset.
- Native dialog semantics and drawer focus trapping are good source evidence. Do not report a full keyboard or screen-reader pass from these screenshots.
- Open vendor/order/invoice dialogs are visually coherent: centered surface, dimmed context, labeled fields, Cancel and an accessible close control. Improve the final “Review / submit” label to name the exact effect. In the order dialog, repeat the selected vendor’s recipient before signing: the immutable recipient is currently absent from the visible approval fields. In the invoice dialog, explain the existing worker-queue consequence where applicable rather than assuming that the generic verb conveys it.
- The mobile table scroll hint is helpful; it does not solve the need to compare a recipient, amount and offscreen authority action in one decision.
- A disabled viewer CTA is visible in `state-viewer.png` without an adjacent role-specific explanation. Place “Read-only viewer” near the page actions, not solely inside administrative identity copy.
- The default sign-in state and the restore-error state use similar body-text treatment for normal guidance and alerts. Make the recovery message/action a recognizable group.
- The source has 140–180ms color/notice/drawer transitions and reduced-motion overrides. These are appropriate for this restrained product. No evidence supports adding spring effects or translucent materials merely to imitate Apple. Fluid gestures are not a current requirement.
- Unsaved draft retention is limited to component state (`contractor/page.tsx:17,22`). Tabs preserve the mounted state, but a reload or valid privacy lock clears it. Clarify that contract; any draft recovery must respect private-link revocation and profile boundaries.
- Do not count synthetic `SIM-*` references, the fixture badge, or intentionally varied pending/reserved values as production defects. The Recovery issue concerns labeling different record domains, not proof of incorrect ledger accounting.

## Questions for synthesis

1. Can an owner tell, from the currently open bill, exactly what approval has happened and what must happen next without visiting a second “Invoice review”?
2. What is the minimum current state an owner needs before funding, granting access or reconciling an outcome—and why is that state less prominent than the technical preamble today?
3. If Nnetics succeeds at creating calm, why does its common mobile bill task require reading several screens before the final payment details are established?

Questions skipped for this sub-assessment: user-facing questions belong to the parent critique synthesis.
