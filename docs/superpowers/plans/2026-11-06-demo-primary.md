# Plan: Make the Nnetics demo the primary hackathon experience

Date: 6 November 2026. Branch: `codex/nnetics-live-integration`, uncommitted changes preserved.

## Non-goals / hard boundaries
- No live testnet acceptance work, no signings, no deployments, no commits/pushes.
- Live transaction gates stay empty/disabled; INV-0002 (confirmed), staged INV-0003 and acceptance history untouched (they live in live stores/docs).
- Demo state stays in gitignored SQLite files under `artifacts/demo/`; never mixed with live stores.
- Keep the five-tab layout, light/dark themes, and existing demo routes (`/?mode=demo`, `/demo/contractors`, `/contractor?mode=demo`).

## Milestone 1 — Server store + assistant core (TDD, `node --test`)
1. `src/server/demo-workspace.ts` — `DemoWorkspaceStore` (SQLite, per-visitor cookie session, exact bigint arithmetic):
   blank workspace start, owner profile + vault onboarding, repeated fund with amount validation, payment intents (quote: recipient/amount/demo fee 0.001 NEAR/total), approve → pending → settle (lazy, scenario success/failure), confirmed = single debit + single receipt, declined insufficient funds + per-payment limit, idempotency keys block duplicate intents/debits, funding + payment history, reset.
   Tests: `tests/demo-workspace.test.ts` (watch fail → implement → pass).
2. `src/server/demo-contractors.ts` extension (demo mode only): contractor may submit an optional bill **without a prior work order**; owner reviews/clarifies inside the profile. Persistent behavior unchanged.
3. `src/server/demo-assistant.ts` — scripted assistant (create contractor, summarize outstanding, prepare payment draft, find receipt, clarification on ambiguity) + optional model path:
   server-only key (`OPENROUTER_API_KEY`, `NNETICS_ASSISTANT_MODEL`), demo-session scope, action + JSON-schema allowlist, rate limits, bounded calls, never echoes secrets. Tests: `tests/demo-assistant.test.ts` with injected fetch.

## Milestone 2 — API routes
- `src/app/api/demo/workspace/[...path]/route.ts` — GET snapshot, POST start/fund/reset/settle (+ commands), origin check, cookie `nnetics_demo_workspace`, `force-dynamic`.
- `src/app/api/demo/assistant/route.ts` — POST message → {reply, actions, mode}; rate limited; status-only provider info.

## Milestone 3 — Client
- `src/data/demo-workspace-adapter.ts` — `DemoWorkspaceAdapter implements OwnerAdapter` (+ demo extras: fund/reset/limit/settle/assistant) so the five-tab Dashboard works unchanged.
- `onboarding.tsx` — `?mode=demo` now uses the workspace adapter. Sign-in screen: prominent **Try demo** entry labeled “no account, wallet, keys or tokens needed”.
- `page.tsx` demo shell — blank-workspace setup screen (create owner profile → create vault → land on Vault, **Demo · Simulated funds** visible), Vault tab: Demo Wallet card with repeatable **Fund vault**, reset action; Settings: scenario (success/failure), spending limit, assistant status, reset; History: funding + pending/confirmed/failed with receipt links; Receipts: demo receipts.
- `ask-nnetics.tsx` — compact floating panel outside the five tabs; scripted mode default; model mode when configured server-side; all actions run through existing UI commands so state updates immediately; asks clarification when contractor/amount ambiguous; approval always stays in the review screen.
- `contractor-payment-draft.tsx` / `contractor-owner.tsx` — demo quote/approval screen (recipient, amount, demo fee, total debit), direct payment from profile without bill/work order, bill-without-order review, wallet approval stays explicit; invite links open across separate browser contexts (existing behavior).

## Milestone 4 — Verify & hand off
- `npm test` (root, owner), `typecheck`, `check:theme`, `production build` (own isolated port + temp demo DBs; do not disturb the running 3100 service).
- Update affected browser specs; run demo walkthrough desktop + mobile.
- Live model integration check with locally configured key (report separately if unavailable).
- Update `README.md` + `docs/DEMO_GUIDE.md`: demo route, recording sequence, exact model config, remaining blockers.
