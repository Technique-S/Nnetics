# Nnetics Feature Reconciliation Matrix — Phase 2

Date: 2026-11-12 · Basis: canonical baseline `chore/nnetics-repository-consolidation` (= `feature/nnetics-v3` 2587a29 + V3.1 acceptance preservation `c6eb904`)
Evidence sources:
1. **Live behavioral walkthrough** (this session): consolidated app in dev mode on `127.0.0.1:3100`, isolated SQLite demo workspace, contractor portal in an **isolated browser context**, full owner↔contractor journey. No live blockchain transactions; every payment step is labeled simulated by the app itself.
2. **Static commit analysis** (subagent A): cult-ui's 7 unique commits + preserved uncommitted work, commit-by-commit vs v3.
3. **Static supersession analysis** (subagent B): preserved lifecycle-verify edits and TaskDashboard demo vs v3 current state.
4. `docs/repository-consolidation-audit.md` (Phase 1) for branch topology and `git cherry` containment proofs.

## Verification label policy (per user decision)

Every walkthrough observation below is labeled:
- **[mock]** — app-simulated behavior (demo workspace, simulated NEAR Intents, mock solver). No wallets, keys, signatures or chain transactions involved.
- **[real-ui]** — real application UI/UX behavior exercised in a real browser (the interaction itself is real even when the funds are mock).
- **[recorded-real]** — historical evidence committed in the repo (e.g. the 0.001 NEAR transaction to `babygoat.testnet`, `docs/METEOR_OWNER_TRANSACTIONS.md`; V3.1 real-model acceptance GO in `docs/NNETICS_V31_REAL_MODEL_ACCEPTANCE.md`).
- Live wallet E2E is **intentionally skipped** (user decision); Playwright mocks + recorded evidence stand in.

## 1. Master matrix

Legend for the eight required columns: **in v3** = exists on the consolidation baseline; **in demo-intents** = exists on `feature/nnetics-demo-intents`; **more complete** / **more recent** = which variant; **functional** = verified behavior + label; **conflicts** = porting/merge risk; **integration work** = effort to reconcile; **decision** = Phase 3/4 action.

| # | Feature | in v3 | in demo-intents | more complete | more recent | functional (walkthrough evidence) | conflicts | integration work | decision |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Two-step demo onboarding wizard (owner profile → vault name) | Yes (`page.tsx` DemoWorkspaceSetup) | Same (ancestor content) | v3 (adds DemoTyping intro + DemoButton/ActionButton styling) | v3 (11-12 vs 11-12) | **[real-ui][mock]** blank wizard walked end-to-end; invalid states blocked (Continue disabled) | None — demo-intents contained | None | **Keep v3.** demo-intents archive |
| 2 | Demo vault funding (stacking balance) | Yes (`Vault & Controls` + `demo-workspace.ts`) | Same | v3 | v3 | **[real-ui][mock]** funded 2.5 NEAR; stacking message confirmed; balance survives reload | None | None | Keep v3 |
| 3 | Contractor CRUD, search, filters, archive/delete with retention guard | Yes (`contractor-service.ts`, `agent-deletion.ts`) | Same | v3 | v3 | **[real-ui][mock]** created "Morgan Writer"; **delete disabled live** — "This contractor still has linked records… Archive it instead" | None | None | Keep v3 |
| 4 | Private portal links (issue, shown-once, 7-day expiry, replace/revoke, credential invalidation) | Yes (`agent-invitations.ts`) | Same | v3 | v3 | **[real-ui][mock]** link issued + opened in isolated context; audit events record `portal-issued` + "Previous portal credentials are invalidated…" | None | None | Keep v3 |
| 5 | Contractor wallet verification + owner approval | Yes (`demo-contractors.ts`, route) | Same | v3 | v3 | **[real-ui][mock]** simulated challenge → request → owner approval → status "Owner-approved wallet" both sides; decision logged with JSON payload in audit | None | None | Keep v3 |
| 6 | Work orders with immutable recipient | Yes (V3.2 `5cebb10`) | **No** (pre-dates 5cebb10) | v3 | v3 | **[real-ui][mock]** DEMO-001 created; "Immutable recipient: morgan-demo.testnet" enforced | None — demo-intents contained | None | Keep v3 |
| 7 | Bill submission (free text, work-order link, invoice denominations NEAR/USDC/USDT/ETH/USD/EUR/GBP/NGN, payout asset+network, attachments/extraction, auto reference CTR-xxxx-INV-nnnn) | Yes | Partial (no work orders, fewer options) | v3 | v3 | **[real-ui][mock]** bill submitted with DEMO-001 link, 0.001 NEAR, live formatted preview, validation gates ("Ready for owner review") | None | None | Keep v3 |
| 8 | Bill review loop (approve / request clarification / reject; contractor answers) | Yes | Partial (no clarification round-trip proven on this branch tip) | v3 | v3 | **[real-ui][mock]** full loop walked: clarify note → contractor sees "Needs clarification" → answers → status back "In review" → owner approves | None | None | Keep v3 |
| 9 | **Approved ≠ Paid separation** | Yes (Payables unification `e39d339`) | No | v3 | v3 | **[real-ui][mock]** after approval: status "Ready to Pay", "Payment execution: Not started", "Invoice approved. Payment authorization is separate."; eligibility gate "Invoice approval required." | None | None | Keep v3 |
| 10 | Payment execution — simulated NEAR Intents (quote → explicit approval checkbox → authorize → execute → settle; failure outcomes solver-fail/route-fail/quote-unavailable; EXACT_OUTPUT, mock solver, 60 s expiry, fee model) | Yes (`demo-intents.ts`, `simulated-intent.tsx`) | Partial (intents demo existed pre-integration) | v3 (unified into Payables with guards) | v3 | **[real-ui][mock]** SIM-INT-a802ab30 walked through CREATED→AWAITING_APPROVAL→QUOTE_READY→APPROVED→EXECUTING→COMPLETED; "Authorized · funds reserved"; double-payment guard "do not pay again"; settled 0.001 NEAR, fee 0.0000025 modeled | None | None | Keep v3 |
| 11 | Receipts + Activity audit trail (payments/funding/invoices/audit filters, copy/download receipt) | Yes | Partial | v3 | v3 | **[real-ui][mock]** receipt rendered with SIM reference; download = client-side data URI (no leakage); 13 audit events incl. two-day-old history after full reload | None | None | Keep v3 |
| 12 | Ask Nnetics assistant (agent tools, clarification cards, server-side model key, real model `nvidia/nemotron-3.5-super-vl:free`) | Yes (`agent-*` server modules + `ask-nnetics.tsx`) | Partial (assistant existed pre-tools) | v3 (V3.2 work-order/invoice tools) | v3 | **[real-ui][mock+recorded-real]** prior-session conversation with real model visible (Tia deletion tool-confirmation card); live request today hit provider rate limit → **graceful failure** with "Retry request"; working-path acceptance recorded in `docs/NNETICS_V31_REAL_MODEL_ACCEPTANCE.md` (GO, 9 requests) | None | None | Keep v3 |
| 13 | Agent deletion retention guard (`historicalNames` conservative matching) | Yes — **byte-identical** to preserved version (`agent-deletion.ts` blob `0c6f125` created by `e39d339`; both streams converged) | No | Equal (identical) | Equal | **[real-ui][mock]** live UI: delete disabled with retention message; tests present (`agent-lifecycle.test.ts` rename-then-delete blocked) | None | None | **v3 already has it. Nothing to port** (subagent B: SUPERSEDED) |
| 14 | Preserved payables-tool *removal* (`251fa22`) | n/a — v3 deliberately restored + **extended** tools | n/a | v3 | v3 | n/a (static) | Porting would **regress** v3 (removes `list_payables`/`get_payable`, multi-currency record fields, work-order tools) | — | **Do not port** (subagent B: SUPERSEDED-in-reverse) |
| 15 | Theme system (dark/light, persisted preference, Magic UI `AnimatedThemeToggler` circular reveal, theme-aware blob backgrounds) | Yes (`tokens.css`, `appearance-control.tsx`, `3bd4ee1`/`9641f19`/`f10cbdd`) | Partial (static SVGs only) | v3 | v3 | **[real-ui]** toggled dark→light→dark live; light renders blob-scene background; preference survives interactions | cult-ui's `34cd12a` signin background is **fully merged already** (as `3bd4ee1`, body::before variant) | None | Keep v3 |
| 16 | Responsive / mobile layout (bottom tab bar, collapsed nav) | Yes | Same | v3 | v3 | **[real-ui]** resized to 390×844: hamburger nav + bottom tab bar (Overview/Contractors/Payables/Activity/More), stacked cards | None | None | Keep v3 |
| 17 | Multicurrency billing + cross-chain payout selection (USDC·NEAR, USDT·NEAR, USDC·ETH, ETH·ETH; funding-asset choice) | Yes (`multicurrency` fixes `4df155b`) | No | v3 | v3 | **[real-ui][mock]** denominations + payout/network combos rendered with policy note "Live settlement supports native NEAR only"; funding-asset selector in payment panel | None | None | Keep v3 |
| 18 | Testnet/live controls (policy-gated, default disabled) | Yes (`transaction-gates.ts`, `testnet-controls.tsx`) | No | v3 | v3 | Not exercised (policy: no live transactions); "Payment execution and deployment disabled." banner verified live **[real-ui]** | None | None | Keep v3 |
| 19 | Vault Rust contract + factory + sandbox (enforcement layer) | Yes (`contracts/`, CI matrix) | Same | Equal (same tree) | Equal | **[recorded-real]** CI-verified sandbox suites (`payment-core.yml`, `vault-provisioning.yml`); not re-run in walkthrough | None | None | Keep v3 |
| 20 | Durable payment queue + separate worker | Yes (`queue.ts`, `worker.ts`; web launcher never starts it) | Same | Equal | Equal | Not exercised in demo (separate process by design); unit suites exist | None | None | Keep v3 |
| 21 | Identity / organization / signed-message auth | Yes (`identity.ts`, `auth.ts`, `organization-api.ts`) | Same | Equal | Equal | Sign-in screen rendered; session cookie persisted across reload **[real-ui]** | None | None | Keep v3 |
| 22 | Hosting readiness (Render single-instance, Docker memory measurement, secretless CI) | Yes (`deploy/`, `hosted-readiness.yml`) | No | v3 | v3 | **[recorded-real]** workflow definitions verified in Phase 1 | None | None | Keep v3 |

## 2. Variant-by-variant disposition

### 2.1 `feature/nnetics-demo-intents` — fully contained
- `git cherry -v feature/nnetics-v3 feature/nnetics-demo-intents`: **both tip commits patch-identical (`-`)**; earlier intents work merged via `891d009`.
- Every feature it had that matters exists in v3 in a strictly newer form (rows 1–12, 15).
- **Decision: no porting work. Archive candidate.** Uncommitted duplicate sign-in copy already preserved on `keep/demo-intents-uncommitted` (f15ec4f).

### 2.2 `codex/nnetics-cult-ui` — visually superseded; accessibility upgrades evaluated on merit (subagent A)

| Cult commit | Purpose | v3 counterpart | Verdict | Conflict risk | Action |
|---|---|---|---|---|---|
| `2877a4d` Audit + baseline PNGs + `cult-fixture.ts` | audit harness | v3's `MAGIC_UI_DEMO_INTEGRATION.md` + Phase 1 audit | **SUPERSEDED** | none | Skip; optionally keep `cult-fixture.ts` if any spec is ported |
| `6643fe6` Cult Onboarding on demo setup | ARIA progressbar stepper | v3 plain `<ol class="demo-setup-steps">` + DemoButton restyle | **MERGE-IDEA** | high (`page.tsx` rewritten 133 lines by v3 in same functions; `layout.tsx` import collision) | Defer — only if stepper semantics wanted; target v3 markup |
| `9007a4c` Cult Minimal Card on getting-started guide | composable card | v3 `DemoCard`/MagicCard gradient card | **SUPERSEDED** | high (same `page.tsx` zone) | Skip |
| `35939c4` DirectionAwareTabs on contractor sections | real `tablist/tab/tabpanel`, roving focus, directional slide | v3 plain `nav` with `aria-current` buttons | **MERGE-IDEA** | medium (`contractor/page.tsx` tab region + 8 shared spec selector rewrites) | Candidate — best a11y payoff; do after Side Panel |
| `b93aeb5` Cult Popover on demo account menu | nonmodal dialog, Escape/outside/Tab-out, focus return | v3 still native `<details>` (but AnimatedThemeToggler drops into the same slot) | **MERGE-IDEA** | low-medium (one `page.tsx` hunk + 3 specs) | Candidate — composes with v3 theme toggler |
| `c8aa80e` Cult Side Panel → `BillingSource` | named `role="region"`, aria-expanded/controls, Escape collapse on "Original billing text" | **v3 never touched `demo/portal-ui.tsx`** — plain `<details>` remains | **PORT** | **near-zero** (target file untouched by v3; all cult-side files are new) | **Port now (Phase 4)** with `aced8ee`-fixed `motion.ts` + `react-use-measure` + side-panel CSS block + spec subset |
| `aced8ee` Verification pass | fixes popover focus, runtime reduced-motion subscription, 320px overflow; 28 fixture checks | v3 has own verification artifacts | **SUPERSEDED** as artifact; its `motion.ts` fix is a prerequisite for ports | low | Adopt fix inside any ported component |
| `34cd12a` preserved signin background | signin blob-scene background | **already merged** as v3 `3bd4ee1` (+`9641f19`) | **SUPERSEDED** | none | Nothing to salvage |

Dependency finding: both branches independently adopted `motion@14.12.0` (no engine clash). Cult-unique deps limited to `react-use-measure@2.1.7` + `@radix-ui/react-use-controllable-state@1.3.0` (only needed for popover/onboarding ports). `cult-ui.css` is additive, token-based (consumes v3's `--action/--selection/--focus/--radius-panel/--motion-panel`), coexists with `demo-magic.css`. Provenance docs (`registry-sources.json`, `LICENSE.cult-ui.md`) must ship with any port.

### 2.3 `keep/lifecycle-verify-uncommitted` (`251fa22`) — superseded (subagent B)
- `agent-deletion.ts` historicalNames guard: **byte-identical in v3** (blob `0c6f125`); both call sites pass historical names; tests present; delivery-doc lines already in v3. → Nothing to port.
- Payables-tool removal: v3 restored + extended (multi-currency quotes, conversionQuotes, amendments, work-order tools). → Porting = regression.
- Route revalidation line: already present verbatim (line 116) plus v3 added more guards.
- **Decision: no porting work; branch remains as preservation evidence.**

### 2.4 `keep/task-dashboard-uncommitted` (`2dd24d1`) — complementary, not product-worthy (subagent B)
- Synthetic-only UX demo (`/demo/task-dashboard`), unlinked anywhere in v3, patterns (skeleton, empty state, busy state, live regions, timer cancellation) already implemented by v3's real surfaces; `docs/NNETICS_RELEASE_ACCEPTANCE.md` documents it as deliberately excluded.
- Two copies in preservation are not duplicates: one full component + one 1-line re-export shim.
- **Decision: do not port into the product.** Keep on the keep/* branch; if ever wanted, port as-is minus the `src/components/` shim. Optional: add one line to README "experiments" note (Phase 8).

## 3. Conflicts & integration summary for Phase 3/4

**2026-11-13 consolidation update:** the Side Panel/BillingSource port is integrated with its pinned dependency, CSS, upstream license and provenance. Fresh verification and remaining limits are in [pre-submission-audit.md](pre-submission-audit.md). The earlier walkthrough below remains dated evidence. Its row 12 reference to recorded real-model GO must be read with the [evidence discrepancy](NNETICS_V31_REAL_MODEL_ACCEPTANCE.md#evidence-reconciliation--2026-11-13): the available raw artifact ends in a rate-limit failure and does not independently support full acceptance.

1. **Only port from cult-ui:** `c8aa80e` Side Panel/BillingSource (near-zero conflict) — files: `ui/cult/side-panel.tsx`, fixed `ui/cult/motion.ts`, `cult-ui.css` side-panel block, `registry-sources.json`, `LICENSE.cult-ui.md`, corresponding `cult-ui.spec.ts` subset (+optional `cult-fixture.ts`), dep `react-use-measure@2.1.7`. Single edit: `demo/portal-ui.tsx` `<details>` → `BillingSource`.
2. **Optional ports (defer, judge value before deadline):** `35939c4` tabs (medium), `b93aeb5` popover (low-medium), `6643fe6` onboarding stepper (high). None is a submission blocker.
3. **No porting from:** demo-intents (contained), lifecycle-verify (superseded), task-dashboard (excluded experiment), cult commits `2877a4d`/`9007a4c`/`aced8ee`/`34cd12a` (superseded).
4. **v3 is the superset** in every row of the master matrix; no v3 feature regresses by discarding the other branches after preservation.
5. Read `node_modules/next/dist/docs/` before any Phase 4 code change (Next 16.4.3 postdates training data — repo AGENTS.md rule).
6. Phase 5 cleanup may remove only what this matrix proves redundant, keeping all `keep/*` branches and preservation commits intact.

## 4. Walkthrough ledger (exact steps executed, 2026-11-12)

1. Reset demo workspace via Settings (confirm dialog) → blank wizard.
2. Wizard: owner "Alex Rivera" → vault "Alex Demo Vault" (six-destination dashboard renders).
3. Vault & Controls: funded Demo Wallet 2.5 NEAR (stacking confirmed).
4. Contractors: created "Morgan Writer"; private link issued (shown once, 7-day expiry, replace/revoke).
5. Portal opened in isolated browser context; wallet `morgan-demo.testnet` submitted; simulated challenge prepared; wallet request sent.
6. Owner: approved wallet (status "Approved wallet: morgan-demo.testnet" both sides; audit `wallet-approved` with JSON payload).
7. Owner: work order DEMO-001 "Sample article" 0.001 NEAR approved (immutable recipient).
8. Contractor: bill submitted → CTR-0371-INV-0001, "In review", linked DEMO-001, wallet-at-submission recorded.
9. Owner: review note + "Request clarification" → contractor sees "Needs clarification" + note → answers → "In review".
10. Owner: "Approve bill" → "Ready to Pay" (payment execution "Not started") — Approved ≠ Paid verified.
11. Payment: quote (EXACT_OUTPUT, mock solver, 0.0000025 fee, 60 s expiry, SIM-INT-a802ab30) → approval checkbox → authorize ("Authorized · funds reserved", double-pay guard) → execute (EXECUTING, mock solver) → settle → **Paid · Settled**, remaining payable 0.
12. Activity: payment record, confirmed receipt (copy/download), invoice record, funding record, 13 audit events incl. prior-session history.
13. Contractor portal: status **Paid** with settlement reference.
14. Full page reload: all state persisted (deep persistence incl. 2-day-old audit events).
15. Ask Nnetics: prior real-model conversation visible; new request hit provider rate limit twice → graceful "Request failed … Retry request" (working path recorded in V3.1 acceptance GO).
16. Theme: dark→light→dark toggled; light screenshot verified.
17. Responsive: 390×844 screenshot verified (bottom tab bar, collapsed nav); viewport restored 1440×900.
18. Console: owner tab 3 benign messages + 1 dev-mode a11y diagnostic (form field id/name, count 3); contractor tab 2 benign messages; **zero errors**.

Integrity note: no live blockchain transaction was initiated; the app labeled every payment step "Demo / Simulated · no blockchain transaction". The historical 0.001 NEAR transfer to `babygoat.testnet` remains evidence-only **[recorded-real]**.
