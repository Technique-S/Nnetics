# Nnetics Repository Consolidation Audit — Phase 1

Date: 2026-11-12 · Auditor: consolidation agent · Method: read-only inspection, all findings evidence-backed
Scope: the Nnetics git repository at `C:\Users\Kazi\Documents\PayScope_Foundation\payscope` and its five sibling worktrees.

Continuation: the interrupted Side Panel integration was completed on 2026-11-13. This document retains the discovery-time topology and findings; see [pre-submission-audit.md](pre-submission-audit.md) for current verification, cleanup decisions and publication status.

---

## 1. Repository identity

| Property | Value | Evidence |
| --- | --- | --- |
| Git root | `payscope\.git` (the enclosing `PayScope_Foundation` folder is **not** a repo) | `Get-ChildItem -Recurse -Filter .git` |
| Origin remote | `https://github.com/Technique-S/Nnetics.git` | `git remote -v` |
| Remote branches | exactly 3: `codex/nnetics-live-integration` (2d4daf5), `codex/owner-dashboard-local` (7d194e4), `codex/payscope-milestone-1` (091aca0) | `git ls-remote --heads origin` |
| GitHub default branch | **`codex/payscope-milestone-1`** — stale (2026-10-29) | `git for-each-ref refs/remotes/origin/HEAD` |
| Commit identity | `Codex <codex@users.noreply.github.com>` (repo convention, kept) | `git config user.name` |
| Tags | `nnetics-v3-milestone` → 21d30e0 | `git tag -n1` |
| Tracked files | 1,032 | `git ls-files \| Measure-Object` |
| Env security | only `.env.example` tracked; `.env.local`, `.env.setup-*.local` untracked (contents not read, preserved locally) | `git ls-files \| Select-String '\.env'` |
| Hackathon deadline | **2026-11-15 00:59 WAT**; first implementation commit 2026-10-29 (inside permitted window) | `docs/README.md` §Hackathon provenance |

## 2. Worktree and branch map

One repository, **six worktrees** (`git worktree list`). The task premise of "two versions" is an undercount: there are **four unique feature lines** plus a checkpoint chain.

| Worktree folder | Branch (at audit start) | Tip | Tip date | Containment in v3 | Uncommitted work found | Action taken |
| --- | --- | --- | --- | --- | --- | --- |
| `payscope` | `feature/nnetics-v3` | 2587a29 | 11-12 11:47 | — (latest superset) | V3.1 real-model acceptance follow-up (GO), harness script, generated type churn | Preserved in **c6eb904** on `chore/nnetics-repository-consolidation` |
| `payscope-demo-intents` | `feature/nnetics-demo-intents` | 6cb9314 | 11-12 01:26 | **Zero unique content** — both tip commits patch-identical in v3 (`git cherry`: `-`), earlier work merged via 891d009 | sign-in copy change = uncommitted duplicate of v3 2587a29 | Preserved in **f15ec4f** on `keep/demo-intents-uncommitted` |
| `payscope-cult-ui` | `codex/nnetics-cult-ui` | aced8ee | 11-11 22:14 | **All 7 commits unique** (`git cherry`: `+`); based on demo-intents tip, 229-file divergence vs v3 | signin blob-scene background + 2 public SVGs | Preserved in **34cd12a** on `keep/cult-ui-uncommitted` |
| `payscope-final-design` | `codex/nnetics-final-design` | 976562f | 11-10 10:38 | Fully merged (ancestor) | none | none needed |
| `payscope-lifecycle-verify` | detached HEAD 0bac7d1 | 0bac7d1 | (checkpoint chain) | **Not contained** — see §3 | 5 files: retention-guard hardening, payables-tool removal | Preserved in **251fa22** on `keep/lifecycle-verify-uncommitted` |
| `payscope-task-dashboard-demo` | `feature/task-dashboard-demo` | cab265c | 11-02 17:01 | Fully merged (ancestor, spine base) | untracked TaskDashboard demo component, page, spec, AGENTS.md | Preserved in **2dd24d1** on `keep/task-dashboard-uncommitted` |

After preservation every worktree is clean (`git status --short` verified).

## 3. Commit topology and forensics

**Spine.** `9206f07` (first commit, 2026-10-29, guarded NEAR vault) → milestone/tag `21d30e0` (`nnetics-v3-milestone`) → merge **891d009 "Merge demo Intents into the main Nnetics V3 application"** → contractor-lifecycle checkpoint `9397cf7` → Payables unification (e39d339) + multicurrency fixes (4df155b) → theme system + Magic UI integration (3bd4ee1 → 9641f19 → f10cbdd → a2c1861 → 2ebb1ab) → V3.2 invoice/work-order agent tools (5cebb10) → sign-in copy (2587a29).

**Demo-intents proof.** `git cherry -v feature/nnetics-v3 feature/nnetics-demo-intents` → both commits `-` (patch-equivalent). Nothing to port; branch is an archive candidate.

**Cult-ui proof.** `git cherry -v feature/nnetics-v3 codex/nnetics-cult-ui` → all 7 commits `+` (unique). Genuine integration candidate.

**Checkpoint chain (custom ref namespace — not branches).**
`refs/checkpoints/nnetics-v31/` holds `baseline` 775075d → A f5c4abc → B 8d2ef64 → C c118a86 → D 07f1e79; `E` 4effc2c (parent 9397cf7); `verification` 0bac7d1 (parent E). `refs/checkpoints/nnetics-v32/baseline` 31d5f21 (parent 2ebb1ab). **None of these commits is reachable from any branch, tag or remote** (verified with `git branch -a --contains` per commit); they are held only by the custom refs. The chain content overlaps v3's landed lifecycle work; supersession must be confirmed per feature in Phase 2.

**Dangling objects.** `git fsck --dangling`: 10 dangling commits — 9 dropped-stash WIP snapshots (`stage-a-wip`, `stage-c-fixes`, `intents-wip`, `signin-removal-wip` …) and 1 orphan duplicate of checkpoint E (3ff6944). All pinned to `refs/keep/dangling-wip/<sha7>` for permanent recovery; no unreferenced work is at risk.

**No stashes** exist in any worktree (verified `git stash list` ×6).

## 4. Application inventory

### Frontend + backend app — `apps/owner` (the authoritative application)
- Next.js **16.4.3** / React 19.3.1 / Tailwind 4.3.3 / TypeScript 5.9.3; `near-api-js` 7.4.0; Wallet Selector 10.1.4 (core + nightly); `motion`, `lucide-react`. Dev/build/start on `127.0.0.1:3100`. Node ≥ 24 (hosting pinned 24.22.1).
- Routes: `src/app` (workspace page, sign-in screen, onboarding/vault onboarding, `contractor/` portal, `demo/`), API route groups `src/app/api/{agent,demo,health,live}`.
- Components: 20+ incl. `ask-nnetics.tsx`, `agent-confirmation.tsx`, `payables-panel.tsx`, `appearance-control.tsx`, `record-search.tsx`, `simulated-intent.tsx`, `testnet-controls.tsx`; design system in `tokens.css` / `workspace.css` / `globals.css` + `demo-magic.css` (Magic UI).
- Server layer (`src/server`, 43 modules): identity/auth, organization-api, contractor-{records,service,lifecycle,payments}, agent tool chain (catalog/tools/executor/contractor-tools/invitations/deletion/model/runtime + `demo-assistant`), invoice-references, billing-extraction, chain/rpc/signer, checkpoint-lifecycle/validity, transaction-gates, owner-attempt, provisioning, queue + worker (durable payment queue, separate process, web launcher never starts it), demo-{workspace,contractors,intents}.
- Tests: ~48 backend suites + 26 Playwright browser specs + fixtures. Last recorded evidence (README): **215 owner/backend + 160 browser + 42 root tests passing**, plus typecheck, production build, `check:theme`.
- Config: `.env.example` (tracked); `NNETICS_*` policy flags default to **disabled** (transactions, payment execution, provisioning) — the product's own safety posture.

### Root backend reference — `src/`, `tests/`, `fixtures/`
`src/demo.ts`, `src/near-proof.ts`, `src/policy.ts` (reference policy); `tests/near-proof.test.ts`, `tests/policy.test.ts` (42 tests); `fixtures/scenario.ts`. `npm test` = `node --test tests/*.test.ts`.

### Smart contracts — `contracts/`
`factory` (atomic vault initialization), `vault` (independent Rust enforcement: permissions, recipient, exact amount, limits, expiry, pause, single-payment orders), `sandbox` (WASM/receipt exercise). Rust pinned via `rust-toolchain.toml`; near-sdk 5.29.1, near-workspaces 0.23.0, near-sandbox 0.3.12. Verification scripts: `scripts/check-core.sh`, `scripts/check-provisioning.sh` (local sandbox accounts only; no deployment).

### Deployment & CI
- `deploy/`: start/hosting/measure/preflight/snapshot/verify-migration/check-build scripts + `paid-evidence.json`; `render.yaml` (optional single-instance Render; hosted service "prepared, not deployed" per README).
- CI (4 workflows, all secretless/read-only): `owner-integration` (typecheck+test+build+Playwright), `payment-core` (Rust sandbox, matrix 2.13.0/2.14.0-rc.5), `vault-provisioning` (sandbox matrix), `hosted-readiness` (build + Docker 512 MiB / 2 GiB measurement, no deployment).

### Documentation
`docs/` holds **77 entries**: delivery/acceptance records (NNETICS_V3*, V31, V32, MULTICURRENCY, DEMO_INTENTS, UNIFIED_PAYABLES), security/policy records (METEOR_REFERENCE_POLICY_V3, SESSION_SECURITY, PAYMENT_CHECKPOINT_REVIEW, ORGANIZATION_ACCESS, VALIDATION), plans (many `*_PLAN.md`/`.json` pairs), guides (DEMO_GUIDE, HOSTED_DEPLOYMENT, SUBMISSION_DRAFT/READINESS), historical design audits (UX_AUDIT, POLISH_REPORT, THEME_REPORT, dated interface-audit dirs), `screenshots/`, `superpowers/` specs. Sprawl is a Phase 8 consolidation target.

### Local-only artifacts (gitignored by design)
Repo-root `artifacts/` (93 entries: historical verification logs, harness scripts, WASM fault fixtures, `vault.wasm`) and `apps/owner/artifacts/`. README rule: never publish the full artifacts directory. Note: committed docs reference specific JSONs inside it (Finding F-08).

### Tracked root-level extras
`FINAL_DELIVERABLE.md`, `IMPLEMENTATION_SUMMARY.md`, `TEST_AGENT_IMPLEMENTATION.md`, `pd_append.py` — tracked at repo root; cleanup candidates pending reference checks (Phase 5).

### Working-tree hygiene (untracked, not in git)
`apps/owner` carries ~70 `*.log` files, `tsconfig.tsbuildinfo`, stray `src/.next`, `src/next-env.d.ts`, `src/tsconfig.json` duplicates, `server/contractor-records.ts.backup2/.backup3`. Outside the repo, the `PayScope_Foundation` folder holds `temp*.ts`, server logs, `preview-temp/`. None of this is submission content; documented for Phase 5.

## 5. Findings register

| ID | Issue | Location | Evidence | Severity | Confidence | Risk if unaddressed | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-01 | GitHub default branch is a stale Oct-29 revision; the latest application exists only on unpushed local branches | origin | `git ls-remote`; `origin/HEAD` symref; README §submission admits "still require an approved commit/push" | **High** (submission blocker) | Certain | Judges review a two-week-old app | After verification: create `main` from consolidated branch; approval-gated push + default-branch switch (user-approved plan) |
| F-02 | Six parallel worktrees with divergent, partly uncommitted state caused the "different app experiences" confusion | repo root | `git worktree list`; per-worktree status | High | Certain | Ongoing drift, accidental work loss | Consolidate onto v3 baseline (this plan); keep worktrees only until feature matrix confirms supersession |
| F-03 | `feature/nnetics-demo-intents` contains zero unique content | branch | `git cherry` output (both `-`); merge 891d009 | Medium | Certain | None (archive only) | Keep recoverable until final approval; no porting work |
| F-04 | Cult UI migration: 7 unique commits + uncommitted background work, based on pre-Payables code, diverged 229 files from v3 which later adopted Magic UI/theme system | `codex/nnetics-cult-ui` | `git cherry` (7 `+`); `git diff --stat` 229 files +1702/−2695 | Medium-High | High | Lost UI work or wrong design direction | Merit evaluation through Phase 2 matrix (user decision: evaluate on merit); port survivors, archive rest with reference |
| F-05 | Uncommitted lifecycle-verify edits include a security-relevant retention-guard enhancement (`assertNoDemoPaymentRecords(..., historicalNames)`) and payables-tool removal that v3's 5cebb10 later re-added in extended form | `keep/lifecycle-verify-uncommitted` 251fa22 | worktree diff (−40/+66 lines) | Medium | Medium-High | Hardening lost; duplicate tool implementations | Phase 2: check whether v3's `agent-deletion.ts` supports historical-name matching; port the guard if missing |
| F-06 | TaskDashboard demo preserved with component in **two locations** (`src/app/demo/` and `src/components/`); branch predates the six-destination dashboard consolidation | `keep/task-dashboard-uncommitted` 2dd24d1 | preserved file list; commit 7657c9f | Medium | Medium | Duplicate demo entry point | Phase 2: verify against the consolidated dashboard; likely superseded |
| F-07 | Working-tree + tracked-junk clutter (~70 logs, backups, 4 tracked root docs/scripts) | `apps/owner`, repo root | directory listings; `git ls-files` | Low-Medium | Certain | Judge-facing noise | Phase 5 evidence-gated cleanup; tracked docs consolidated into `docs/` or removed after reference checks |
| F-08 | Gitignored `artifacts/` holds evidence JSONs that committed docs cite (e.g. `v31-real-model-2026-11-12.json`) | `.gitignore:13`, `docs/NNETICS_V31_REAL_MODEL_ACCEPTANCE.md` | `git check-ignore -v` | Low | Certain | Judge cannot verify cited evidence | Phase 8: publish selected evidence JSONs under `docs/` (existing tracked precedent) — never the whole directory |
| F-09 | `next-env.d.ts` regenerated by `next dev` (path change `.next/` → `.next/dev/`) | `apps/owner/next-env.d.ts` | diff in c6eb904; AGENTS.md instruction | Info | Certain | Recurring dirty tree | Commit generated churn with each work batch (AGENTS.md guidance) |
| F-10 | Next.js 16.4.3 postdates assistant training data | `apps/owner/package.json` | AGENTS.md agent-rules block | Info | Certain | Incorrect API usage during integration | Read bundled `node_modules/next/dist/docs/` guides before Phase 4 code changes |
| F-11 | Out-of-repo workspace junk (`temp*.ts`, server logs, `preview-temp/`) in the enclosing folder | `PayScope_Foundation` root | directory listing | Info | Certain | None (not submission content) | Optional manual cleanup; outside repo scope |
| F-12 | No unreachable work at risk; no stashes | — | `git fsck --dangling` + pins; `git stash list` ×6 | Info | Certain | — | Recovery refs recorded in §8; may be pruned only with approval |

## 6. Consolidation implications (inputs to Phases 2–7)

1. **Canonical baseline:** `chore/nnetics-repository-consolidation` @ **c6eb904** (= `feature/nnetics-v3` 2587a29 + V3.1 acceptance preservation). No further merge of `feature/nnetics-demo-intents` — it is fully contained.
2. **Feature-matrix candidates (Phase 2):** cult-ui's 7 commits (+1 preserved) evaluated on merit; lifecycle-verify retention-guard; TaskDashboard demo files; confirmation that every checkpoint A–E capability exists in v3 (tests exist for contractor-lifecycle, agent-lifecycle, checkpoint-lifecycle/validity).
3. **Verification commands** (from CI + README, to be executed in Phase 6): root `npm test`; `apps/owner`: `npm test`, `npm run typecheck`, `npm run check:theme`, `npm run build`, `npm run test:browser`; `bash scripts/check-core.sh`, `bash scripts/check-provisioning.sh`.
4. **Branch disposition proposal (Phase 7, approval-gated):** `main` ← consolidated result; archive after approval: `feature/nnetics-demo-intents`, merged `codex/*` + checkpoint branches, `feature/task-dashboard-demo`; decide: `codex/nnetics-cult-ui` (post-matrix); remote: push `main` + default-branch switch only on explicit approval.
5. **Deadline:** 2026-11-15 00:59 WAT — consolidation, verification and documentation are the critical path; cleanup breadth should stay proportional.

## 7. Recovery ledger (all hashes preserved)

- Branch tips at audit start: `feature/nnetics-v3` 2587a29 · `feature/nnetics-demo-intents` 6cb9314 · `codex/nnetics-cult-ui` aced8ee · `codex/nnetics-final-design` 976562f · `feature/task-dashboard-demo` cab265c · detached lifecycle-verify 0bac7d1
- Checkpoint refs (pre-existing): `refs/checkpoints/nnetics-v31/{baseline 775075d, A f5c4abc, B 8d2ef64, C c118a86, D 07f1e79, E 4effc2c, verification 0bac7d1}`, `refs/checkpoints/nnetics-v32/baseline 31d5f21`
- Dangling WIP pins (created): `refs/keep/dangling-wip/{96c5b62, 1468e16, c0281e7, ef48186, 1e0c2ab, 85d0c06, cff0aea, 3ff6944, ebf7b55, 97fec04}`
- Preservation commits (created): c6eb904 (consolidation branch) · 34cd12a (cult-ui) · f15ec4f (demo-intents) · 251fa22 (lifecycle-verify) · 2dd24d1 (task-dashboard)
- Tag: `nnetics-v3-milestone` 21d30e0 · Merge: 891d009 · Remote heads: 2d4daf5, 7d194e4, 091aca0

## 8. Audit integrity statement

All audit steps were read-only. The only repository mutations were the sanctioned Phase-0 preservation actions (5 commits + 10 recovery refs), verified clean with `git status --short` in all six worktrees afterwards. No file was deleted or modified outside those commits; no branch was deleted, rewritten or pushed; no contract, network or transaction state was touched.
