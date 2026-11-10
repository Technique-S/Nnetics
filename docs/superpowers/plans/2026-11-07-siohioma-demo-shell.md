# Siohioma demo-shell implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Nnetics demo workspace (`/?mode=demo`) with the Siohioma shell — rounded app frame, ~250px icon+label sidebar (collapse kept), slim header, prominent summary cards and an 8+4-style Overview grid — using only the existing Jade & Midnight / Jade Night tokens, with no visual change to the live (wallet) view.

**Architecture:** Client-side only. The Dashboard adds a `demo-shell` class to its wrapper (and to the setup screen) when the adapter is `DemoWorkspaceAdapter`. Every new CSS rule lives at the end of `workspace.css`, scoped under `.demo-shell` (specificity ≥ the later-imported `tokens.css` rules; remember import order: `globals.css`, `workspace.css`, `tokens.css`). Overview markup is restructured around the same simulated-ledger values already computed in `page.tsx`; a hand-rolled SVG donut replaces the status `dl`. No new dependencies, fonts, routes, API or data changes.

**Tech Stack:** Next 16 app-router client component (React 19), plain CSS files, Playwright specs (`msedge` on Windows).

**Spec:** `docs/superpowers/specs/2026-11-07-siohioma-demo-shell-design.md`

## Global Constraints

- **No commits, no pushes.** The shared tree contains unrelated uncommitted work; this pass stays uncommitted like the rest of it.
- **Never rename user-visible strings** the specs assert: headings `Overview`, `Contractors`, `Receipts`, `History`, `Vault`, `Settings`, `Available vault balance`, `Needs attention`, `Total paid`, `Recent activity`, `Confirmed payouts over time`, `Payment status`, `Next action`, texts `Demo · simulated funds`, `No items need your attention.`, buttons `Fund vault`, `Add contractor`.
- All new CSS selectors must contain `.demo-shell` (live view untouched). Colors only via existing tokens from `tokens.css`; hero/dark surfaces use `--color-header`/`--sidebar`, accent marks use `--accent`.
- No new packages, fonts, or CDN scripts. Donut + bars are hand-rolled SVG/CSS.
- `apps/owner` commands: verify with `npm test`, `npm run typecheck`, `npm run build`, then Playwright specs (webServer reuses/starts port 3100). Playwright projects: `desktop` 1440×1080 and `mobile` 390×844.
- Per `apps/owner/AGENTS.md`: before writing any JSX/CSS code, skim the relevant guide in `apps/owner/node_modules/next/dist/docs/` (Next 16 differs from training data).
- Reduced-motion and forced-colors behavior must survive (global rules handle it; the sliding nav indicator keeps the forced-colors border from `tokens.css`).

## Review Focus

- **Live-view leakage:** a selector without `.demo-shell` or a shared-component change not gated by a prop would restyle the wallet view. Test: Task 1's check that all added rules carry `.demo-shell` + `npm run build`, and Task 2's `demo` prop default (live caller unchanged).
- **String renames breaking nine spec files:** full targeted Playwright run in Task 5 catches them; grep the touched JSX before finishing Task 3 if in doubt.
- **Dark-theme contrast:** donut segments and hero card on Jade Night — Task 5's dark-theme run + screenshots into `../../artifacts/payment-workspace-redesign/`.
- **Mobile drawer vs. frame:** sidebar switches to fixed drawer at ≤760px; frame padding must not trap horizontal overflow. Pinned by existing `scrollWidth<=innerWidth` asserts (payment-workspace) plus overview-smoke mobile.
- **Sidebar collapse regression:** collapse still stores `nnetics-sidebar` and animates `--shell-nav` — Task 5 asserts six links in both expanded and collapsed rails.

---

### Task 1: Demo shell hooks + rounded frame

**Files:**
- Modify: `apps/owner/src/app/page.tsx` (two wrapper sites only)
- Modify: `apps/owner/src/app/workspace.css` (append `demo-shell` section)

**Interfaces:**
- Produces: `div.app-shell.demo-shell` (dashboard) and `div.app-shell.demo-shell.demo-setup-shell` (setup screen); CSS hook `.demo-shell` for all later tasks. Background canvas treated by `body:has(.demo-shell)`.

- [x] **Step 1: skim Next doc** in `apps/owner/node_modules/next/dist/docs/` for anything about client components/CSS being rewritten in 16.x. Note gaps in the report.
- [x] **Step 2: page.tsx** — in the demo dashboard return: `<div className="app-shell demo-shell">`; in the uninitialized-setup return: `<div className="app-shell demo-shell demo-setup-shell">`. Nothing else in that file changes in this task.
- [ ] **Step 3: workspace.css** — append a `/* ===== Siohioma demo shell ===== */` section, all selectors scoped with `.demo-shell` or `body:has(.demo-shell)`:
  - body: `background: var(--surface-muted); padding: 12px`.
  - `.demo-shell`: `display:flex; max-width:1500px; margin:0 auto; min-height:calc(100dvh - 24px); background:var(--color-bg); border:1px solid var(--color-line); border-radius:28px; overflow:hidden; position:relative;` light theme box-shadow `0 24px 60px -24px rgb(16 47 51/.25)`; dark theme (`html[data-theme=dark]`) `box-shadow:none`.
  - Sidebar inside the frame: `.demo-shell .redesigned-sidebar.sidebar { position:sticky; top:12px; inset:auto; height:calc(100dvh - 24px); width:var(--shell-nav); flex:0 0 auto; border-radius:0; }` and `.demo-shell .workspace-main { margin-left:0; }`. Append this section LAST in workspace.css so equal-specificity earlier rules lose.
  - `--shell-nav` collapse behavior and the fixed `.navigation-toggle` keep working (collapse var shrinks the flex-basis). Restyle the toggle under `.demo-shell` to a rounded (10px) 40px circle-ish button at `top:20px; left:calc(var(--shell-nav) - 52px)`.
  - `@media(max-width:760px)`: body `padding:8px`, frame `border-radius:20px`, `min-height:calc(100dvh - 16px)`; drawer styles from globals still win (drawer is viewport-fixed, escapes the frame — acceptable).
- [ ] **Step 4: verify** `npm run build` passes; `npx playwright test tests/browser/overview-smoke --project=desktop` still passes (frame must not break selectors); record screenshots `npx playwright test` artifacts dir.

> DONE — build ✓, full overview-smoke 4/4 GREEN (both projects). See ledger: `overflow:clip` frame, toggle anchored in-frame; smoke strictness fixes (banner full text) recorded.

### Task 2: Sidebar + slim header restyle

**Files:**
- Modify: `apps/owner/src/app/dashboard-navigation.tsx` (brand mark only, gated by a new optional `demo?: boolean` prop)
- Modify: `apps/owner/src/app/page.tsx` (pass `demo={!!demoWs || adapter.mode==="simulation"}` to `<DashboardNavigation …/>`)
- Modify: `apps/owner/src/app/workspace.css`

**Interfaces:**
- Consumes: `.demo-shell` hook (Task 1).
- Produces: `DashboardNavigation({view,onNavigate,live,organization,demo})` — demo defaults false; the existing live call site passes nothing new.

- [ ] **Step 1:** in `dashboard-navigation.tsx`, add `demo` to props; render inside the brand link a `<span className="brand-mark" aria-hidden="true">N<span/></span>` **only when `demo`** (before the `Nnetics` text). Live markup byte-identical when prop absent.
- [ ] **Step 2:** pass the prop from page.tsx both dashboards (only the demo dashboard is ever rendered with demoWs).
- [ ] **Step 3: workspace.css append:**
  - Sidebar: `.demo-shell .redesigned-sidebar { padding:20px 14px; }` brand block with 28px mark + wordmark; `.workspace` chip: `border:1px solid var(--sidebar-border); border-radius:12px; padding:10px 12px; margin:16px 2px 20px;` (keep truncation behavior).
  - Nav items: `border-radius:12px; gap:12px; padding:10px 12px; color:var(--sidebar-muted);` hover bg `--sidebar-hover`. Active pill: restyle `.demo-shell .nav-active-indicator { width:4px; left:5px; border-radius:999px; background:var(--accent); }` with existing transform translateY mechanics unchanged.
  - Bottom note: `border-top:1px solid var(--sidebar-border); padding-top:14px; color:var(--sidebar-muted); font-size:12px;`.
  - Header: `.demo-shell .topbar.demo-workspace-toolbar { position:sticky; top:12px; z-index:5; min-height:56px; padding:8px 16px 8px 20px; display:flex; align-items:center; gap:12px; background:var(--color-surface); border-block-end:1px solid var(--color-line); }` banner text as a small pill `border-radius:999px; background:var(--color-surface-raised); color:var(--color-muted); padding:4px 12px;` (text unchanged); `.topbar-actions` right-aligned; `.icon-button` circular: `border-radius:999px; border:1px solid var(--control-border); width:36px; height:36px;` account menu summary as pill.
- [ ] **Step 4: verify** build + the same targeted spec; collapsed-state glance via `html[data-nav-collapsed=true]` (manual `page.evaluate` in dev run if desired; formal assertion comes in Task 5).

> DONE — demo prop + demo-gated brand-mark (RED asserted first), CSS rail + header appended; build ✓ + overview-smoke 4/4 GREEN incl. brand-mark (mobile asserts via opened drawer). Live caller unchanged (single call site verified by grep).

> DONE — build ✓ + overview-smoke 4/4 GREEN incl. brand-mark (mobile asserts via opened drawer). Live caller unchanged (single call site verified by grep).

### Task 3: Overview restructure (three top cards + left column + right rail with donut)

**Files:**
- Modify: `apps/owner/src/app/page.tsx` (Overview JSX block only; same values, same strings)
- Modify: `apps/owner/src/app/workspace.css`

**Interfaces:**
- Consumes: existing computeds in Dashboard: `available`, `totalPaid`, `confirmed`, `outstanding`, `failedPayments`, `needsAttentionItems`, `ordered`, `nextAction`, `details(p)`, `date(ns)`, `Badge`, `Amount`, `formatNear`.
- Produces: class hooks `demo-overview` (grid), `overview-hero` (dark card), `overview-donut` block; `StatusDonut` local component (see step 1). Existing classes `overview-card`, `overview-list`, `overview-list-item`, `overview-chart*` may be reused; every new class goes through Task-appropriate CSS in this section.

- [ ] **Step 1: add a pure helper** near `Badge` in page.tsx: `function statusDonut(counts:{paid:number;pending:number;failed:number})` returning the three `<circle>` stroke-dasharray segments (r=15.9, circumference=100, offset math like `-counts.x` minus prior) + nothing else. Segments colored `--action`(paid)/`--warning`(pending)/`--danger`(failed).
- [ ] **Step 2: restructure the `view === "Overview"` JSX** (strings preserved):
  - Wrapper `<div className="demo-overview">` composed of: `.demo-overview-metrics` (grid of 3): dark hero card `overview-card overview-hero` h2 "Needs attention" (existing list/empty content, hero-styled); `overview-card` h2 "Available vault balance" (Amount large + reserved note); `overview-card` h2 "Total paid" (Amount large + "{n} confirmed payouts.").
  - `.demo-overview-main`: card h2 "Recent activity" (existing empty text + `overview-list` items linking to History/Receipts), then card h2 "Confirmed payouts over time" (existing empty/bars, bar fill now uses `--action`).
  - `.demo-overview-rail`: card h2 "Payment status" — replace the `payment-draft-details` dl with `StatusDonut` + legend `<ul className="overview-donut-legend">` rows "Paid n / Pending n / Failed n" (friend: same numbers). Then next-action card `overview-card overview-next-action` h2 "Next action" (existing `nextAction.detail` + button `{nextAction.label}`) — promo styling via CSS.
  - Empty-state copy stays exactly as today.
- [ ] **Step 3: workspace.css:** `.demo-overview { display:grid; grid-template-columns:minmax(0,1fr) minmax(280px,340px); gap:1rem; align-items:start; }` with `.demo-overview-metrics { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1rem; }` spanning full width via `grid-column:1/-1`; cards `border-radius:16px; border:1px solid var(--color-line); background:var(--color-surface); box-shadow:var(--shadow-card); padding:1.25rem;` (dark `box-shadow:none`). Hero card: locked dark surface `background:var(--color-header); color:var(--sidebar-text);` with accent tag on count badges; keep inner badge colors from `.badge` tokens. Mobile block per spec order: `balance, next, status, attention, paid, activity, chart` via `grid-template-areas` on `.demo-overview` wrapper (metrics split into single cards at ≤760px — simplest: at mobile, `.demo-overview-metrics{display:contents}` and rail/main cards get explicit area assignments with balance/next first).
- [ ] **Step 4: verify** — extend nothing in tests yet; `npm run build`; quick browser run of `overview-smoke` (desktop) must stay green, screenshots eyeball on Overview: 3 cards top, activity+bars left, donut+next action right.

- [ ] **Step 5: verify** `npm run build`; `npx playwright test tests/browser/overview-smoke` both projects green.

> DONE (rescoped — prior session had shipped the grid + cards already; see ledger): donut+legend, hero card, chart tint, 3 glitch fixes; smoke 4/4 GREEN + unit tests green + screenshot review.

### Task 4: Same treatment across the other five tabs (panels, records, banners) — CSS only

**Files:**
- Modify: `apps/owner/src/app/workspace.css` (append-only)

**Interfaces:**
- Consumes: `.demo-shell` hook. No JSX changes in this task.

- [ ] **Step 1: panel/cards** — `.demo-shell .payment-workspace-panel { border-radius:16px; border:1px solid var(--color-line); background:var(--color-surface); box-shadow:var(--shadow-card); padding:1.5rem; }` (dark `box-shadow:none`); `.payment-record` rows keep grid, separators `var(--color-line)`; `.button` radius 999px, primary keeps token colors; inputs/selects radius 10px with existing control-border.
- [ ] **Step 2: banners & notices** — `.notice/.error-banner` `border-radius:12px`; demo-setup page (`demo-setup-shell`): panel becomes the rounded setup card centered `max-inline-size:40rem`, steps pills restyled with token colors (structure as-is).
- [ ] **Step 3: page-heading** — `h1` keeps serif clamp from tokens.css (do not fight it); demo-subtitle remains muted.
- [ ] **Step 4: mobile stack + banner visibility** — ≤760px: order rules from Task 3, header pill text can wrap to 2 lines (banner must stay visible — no `display:none` allowed on it).
- [ ] **Step 5: verify** `npm run build`; `npx playwright test tests/browser/overview-smoke` both projects green.

- [ ] **Step 5: verify** `npm run build`; `npx playwright test tests/browser/overview-smoke` both projects green.

> DONE — CSS-only append (panels/records/buttons/inputs/notices/banner wrap + mobile padding reservation); build ✓, smoke 4/4 GREEN; mobile banner overlap resolved (measured); screenshots task4-*.png reviewed.

### Task 5: Spec updates + full verification (both flows × both viewports × both themes)

**Files:**
- Modify: `apps/owner/tests/browser/payment-workspace.spec.ts`
- Modify: `apps/owner/tests/browser/overview-smoke.spec.ts`
- Create: `docs/DEMO_SHELL_REPORT.md`
- Modify: `docs/superpowers/specs/2026-11-07-siohioma-demo-shell-design.md` (status line → approved/implemented with notes)

**Interfaces:**
- Consumes: all hooks above. The six destinations are stable: `["Overview","Contractors","Receipts","History","Vault","Settings"]`.

- [ ] **Step 1: payment-workspace.spec.ts update:**
  - Fresh `/?mode=demo` now lands on the setup screen; create the workspace first (fill Owner name → Continue → Vault name → Create demo workspace) and assert h1 `Overview`.
  - Nav assertion → `expect(await nav.locator("a").allTextContents()).toEqual(["Overview","Contractors","Receipts","History","Vault","Settings"]);`
  - Insert **funding before the first payment**: `tab(page,"Vault")`, `page.locator('input[name="amount"]').fill("2")`, click "Fund vault", expect success notice; keeps the ledger non-degenerate so History/Receipts/Pending views are populated.
  - Keep every other step/selector as-is (this spec is the payout→receipt proof and runs on desktop + mobile projects). Keep screenshot paths.
- [ ] **Step 2: overview-smoke.spec.ts additions:**
  - Dark-theme variant: `page.addInitScript(()=>localStorage.setItem('nnetics-appearance','dark'))` before `goto('/?mode=demo')`; full setup flow; assert the same Overview headings + `Demo · simulated funds` visible (banner survives dark theme).
  - Fund → donut legend assert: after funding 2 NEAR and paying one contractor via the Contractors flow (copy the minimal steps: start contractor demo…, approve…), go to Overview and assert `page.getByText(/Paid/)` legend + "Next action" heading visible.
  - Collapsed-rail check (desktop): click "Toggle navigation", expect the six links still present via `aria-label`s (`page.locator('a[aria-label]')…`).
  - Mobile drawer nav: open "Toggle navigation", click "Contractors" link, assert heading.
- [ ] **Step 3: run everything:**
  Metals: `cd apps/owner && npm test && npm run typecheck && npm run build`
  Browser: build must pre-date webServer → `npm run build` then
  `npx playwright test tests/browser/overview-smoke.spec.ts tests/browser/payment-workspace.spec.ts` (both projects run by default; both themes covered inside the specs).
  Expected: all pass; if `payment-workspace` unrelated pre-existing failures surface (e.g. server route behavior on funding), fix or adapt steps within this pass's scope and record them.
- [ ] **Step 4: docs/DEMO_SHELL_REPORT.md** — short factual report: what was styled, tokens used (no value changes), spec evidence (commands + pass counts, both themes/viewports for the two flows), screenshots/artifacts list, no-commit note, limitations (release-only surfaces untouched; Ask Nnetics untouched).
- [ ] **Step 5: spec status** edit + final report to the user (no commit).

## Self-review notes

- Spec coverage: frame/sidebar/header/cards-grid → Tasks 1–4; funding controls stay in Vault → Task 5 Step 1 (funding step) and unchanged Vault tab; activity→History/receipt links unchanged (Task 3 keeps the onClick routing); empty states → Task 3 copy preserved; mobile order + banner → Task 3 Step 3 + Task 4 Step 4; themes & dark controls → Tasks 2–5 (appearance switch untouched in Settings/account menu; smoke dark variant); demo-scoping → global constraint.
- No step above writes bodies the signature+tests already determine; Overview JSX is specified by exact strings + structure, not transcripts.
- Types: `StatusDonut` helper takes the three counts; caller passes `{confirmed.length, outstanding.length, failedPayments.length}` — single definition, single call site.
- Deviation from skill defaults, recorded deliberately: **no commit steps** (shared uncommitted tree); per-task verification is build/spec runs instead.
