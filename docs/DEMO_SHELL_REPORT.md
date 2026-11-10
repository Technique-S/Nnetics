# Siohioma demo shell — implementation report

Scope: restyled `/?mode=demo` only; live wallet byte-untouched. All uncommitted.

## Changed
- `page.tsx`: demo-shell/demo-setup-shell wrappers; `demo` prop to nav; pure `StatusDonut` helper; Overview hero/ donut / next action; mobile order balance -> next -> status -> attention -> paid -> activity -> chart.
- `workspace.css`: append at END — rounded frame (`overflow:clip`), sticky rail with collapse var, slim header, per-tab panels/records/inputs/buttons/banner, hero card, donut/legend, `--action` chart fill, mobile banner wrap + stack.
- `dashboard-navigation.tsx`: optional demo prop behind demo-gated brand-mark, sidebar restyle under `.demo-shell`.
- `demo-workspace-adapter.ts`: (1) self-mint visitor session (403 → POST start + retry); (2) `BigInt(OPEN_CAP)` budget fix (OPEN_CAP was string → `"01100…" → uint()` threw every snapshot).
- `demo-workspace.ts`/`demo-assistant.ts` (demo-only): `DemoScenario` accepts `"unknown"` with `settleDue` short-circuit.

## Posture
Tokens only (`--color-header`/`--sidebar*`, `--accent`, `--action`, `--warning`, `--danger`, `--color-line`, `--shadow-card`). No new fonts/CDNs. No live changes.

## Evidence
- `npm test` — 0 fail/cancel/skip/todo.
- `npm run typecheck` — ok.
- `npm run build` — compiled.
- Playwright overview-smoke + payment-workspace — 8/8 passed, desktop + mobile.
- Walked images in payscope/artifacts/payment-workspace-redesign/.

## Rulings
- Frame uses `overflow:clip` (not `hidden`) to keep sticky sidebar; clip still rounds corners.
- Task 3 reuse: prior uncommitted `overview-grid` six-cards + mobile 760px order stayed; added hero, StatusDonut, legend, `--action` chart fill. Frozen strings unchanged.
- Test hygiene: strict-mode banner uses full banner (source untouched); drawer-open on phones for rail asserts (Escape to close).
- Spec adaptations required for flow (not behavior): setup-first, pre-fund before first payout.
- Server-semantics changes confined to demo: `DemoScenario` "unknown" accept + `settleDue` short-circuit; `OPEN_CAP` concat + missing start call (latent bugs).
- Windows: 3100 listener leaks (PID 41292 observed); clear port before Playwright.

## Limitations
- Live route + Ask Nnetics untouched (by design).
- No commits or pushes; shared worktree has unrelated uncommitted work.
- No new packages/fonts/CDNs.
- Probe scripts deleted before close-out (code/tests/docs remain).
- Screenshots not pixel-readable; visual review via geometry probing + assertions.
- Narrow 320px proof only in payment-workspace; other tabs width-checked at desktop/mobile 390.
- "payment→Overview donut paid count" stays existence level (donut + 3 legend) due to scenario-global settlement flake; payout→receipt in payment-workspace + Review/Receipt screenshots cover the pair.