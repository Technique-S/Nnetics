# Nnetics pre-submission audit

Date: 2026-11-13 (Africa/Lagos). Candidate: `chore/nnetics-repository-consolidation`, canonical application `apps/owner`. This continues OpenCode's interrupted nine-phase consolidation; it does not restart the project or merge entire historical worktrees.

> 2026-11-13 update: the final pre-submission verification pass is recorded in [final-release-verification.md](final-release-verification.md). It supersedes the counts and scope limits in section D below (lint is now established, test totals expanded, and the real-model status is precisely quota-blocked for four tools). Section D is retained as the consolidation-phase record.

## Release decision

**Local consolidation verified within the scope below; publication is pending.** Backend/reference tests, type checking, theme checks and production build pass. Across the full browser run and targeted reruns, **262 distinct browser cases passed**, with **four external-provider cases intentionally opt-in**. The initial full run and its resolved failures are recorded separately, not presented as one clean invocation. A complete real-provider acceptance run and fresh Linux Rust/sandbox verification are not established by this run. Do not describe this as production financial readiness. [Machine-readable verification summary and log hashes](evidence/consolidation-verification.json).

## A. Consolidation and reconciliation

| Source | Original revision | Decision |
| --- | --- | --- |
| `feature/nnetics-v3` / `payscope` | `2587a29c17896d402514f10d398534d73163ff74` | Canonical baseline: newest coherent superset; retain dashboard, Payables, V3.2 agent tools, Magic UI and theme system |
| `feature/nnetics-demo-intents` | `6cb931420147148b9b009e5995297d85e9bd081c` | Earlier intents already merged through `891d009`; both remaining tip patches are equivalent (`git cherry` reports `-`). No second app needed |
| `codex/nnetics-cult-ui` | `aced8ee518fa191ace2e654304c09445ccc9cce6` | Selectively port original-billing-text Side Panel from `c8aa80e`, with corrected motion helper from `aced8ee`. Preserve v3's surrounding UI and data flow |
| `codex/nnetics-final-design` | `976562fc1cd54902f954cc52a9955c8219fc91ab` | Ancestor of canonical baseline; no duplicate port |
| lifecycle verification detached checkpoint | `0bac7d1d5356dc88c5e9af754618abd92fec1b7a` | Historical-name deletion retention guard already identical in v3; do not port the older removal of Payables tools |
| `feature/task-dashboard-demo` | `cab265c0ad53e17ee568161f9315ec806bafc620` | Ancestor; uncommitted synthetic dashboard experiment intentionally excluded, preserved separately |

No blind branch merge or broad refactor was needed. The Side Panel now replaces only the original-text disclosure in the shared BillCard used by owner and contractor views. It retains original/clarified text, uses a named region, wires `aria-expanded`/`aria-controls`, supports Escape and focus return, and respects reduced motion/mobile settings. CSS uses existing tokens. `react-use-measure@2.1.7` is pinned in both manifest and lockfile; upstream license and provenance are included. No contract, persistence, authentication, payment or deployment interfaces changed.

Recovery commits remain intact: `c6eb904` (canonical pre-consolidation work), `f15ec4f` (`keep/demo-intents-uncommitted`), `34cd12a` (`keep/cult-ui-uncommitted`), `251fa22` (`keep/lifecycle-verify-uncommitted`), `2dd24d1` (`keep/task-dashboard-uncommitted`). Original branch tips and `refs/checkpoints/*` / `refs/keep/dangling-wip/*` are preserved. Full topology: [Phase 1 audit](repository-consolidation-audit.md). Feature-level comparisons and earlier manual walkthrough: [matrix](feature-reconciliation-matrix.md).

## B. Feature status and verification scope

| Capability | Current status | Evidence/limits |
| --- | --- | --- |
| Meteor/NEP-413 identity, sessions, ownership, owner/viewer boundaries, organization isolation | Implemented; automated regression coverage | Auth/identity/organization backend suites. No fresh real-wallet login or signature in this run |
| Organization creation and vault binding | Implemented, policy-gated | Backend fixtures cover ownership and finalized provisioning evidence; no live provisioning |
| Contractor profiles, invitations, revocation, wallet requests/approval, archive/restore/delete retention | Implemented | Backend and controlled-provider coverage; private credentials not published |
| Invoice text, original/clarified source, attachment handling, references, review, work orders and persistence | Implemented | Backend suites include file/extraction, immutable recipients and restart persistence. Side Panel browser checks exercise accessible source disclosure |
| Overview, Contractors, Payables, Activity, Vault & Controls, Settings, themes and responsive navigation | Implemented | Canonical v3 UI retained; desktop/mobile browser checks listed below |
| Invoice approval vs payment | Separate enforced lifecycles | Approval alone cannot establish Paid; matching durable job/chain evidence required live |
| Demo quotes, authorization, reservations, execution, failures, expiry, settlement and receipts | Simulated only | Uses synthetic local records. Does not constitute solver integration or onchain settlement |
| Demo multicurrency invoice and payout selection | Implemented simulation | Live settlement supports native NEAR/testnet only; do not claim real conversion or cross-chain payouts |
| Vault/factory limits, exact recipient/amount, permission, expiry, pause and single-payment rules | Existing Rust implementation unchanged | Prior Linux evidence is historical; no fresh Rust/sandbox result on this Windows host |
| Queue reconciliation, duplicate guards and crash recovery | Implemented | Backend worker tests pass, including restart and unknown outcomes; no live worker started |
| Ask Nnetics tools, context, confirmations, failure handling | Implemented with mocked-provider regressions | Real provider is optional and quota-dependent. Never equate a failed response with proof no action occurred |
| Full real-model lifecycle acceptance | **Unverified for release** | Prior report claims GO; available raw artifact has eight passing requests and a final HTTP 429, `completed: false`. [Reconciliation](NNETICS_V31_REAL_MODEL_ACCEPTANCE.md), [sanitized evidence summary](evidence/v31-real-model-summary.json) |
| Future automatic Meteor reference-block reconciliation | Not enabled/live-verified | Historical one-transaction acceptance does not authorize future envelopes |
| New real owner transactions, payment execution, provisioning | Disabled by release posture | No chain state changed, payments sent or transaction flags enabled |
| Hosting | Prepared, not deployed in this run | Single-instance SQLite/persistent disk architecture retained; web launcher does not start the worker |

## C. Cleanup and documentation

- Moved `FINAL_DELIVERABLE.md`, `IMPLEMENTATION_SUMMARY.md`, and `TEST_AGENT_IMPLEMENTATION.md` intact to `docs/history/ask-nnetics/`. Repository-wide reference search found only mutual references; none were runtime/build/deployment inputs. Their original content remains available with a historical-status index.
- Updated root README to name one canonical application/branch and startup path, current navigation, demo multicurrency limits, assistant configuration and the documentation map.
- Replaced outdated demo instructions with the current complete workflow and an isolated browser recipe covering **both** demo databases. Earlier policy-blocked preview notes were historical context, not an enduring inability to run an authorized isolated verification server.
- Added the Cult UI license/provenance and dependency notice. Adopted only the justified disclosure port; optional tabs/popover/onboarding variants remain on recovery branches.
- Added a public, sanitized model-evidence summary containing scenario outcomes and the source hash, excluding private invitation links, conversation replies and operation IDs. The raw ignored artifacts directory remains private.
- No source/service directories, migrations, tests, essential deployment artifacts or contract inputs were deleted. No dependencies removed or broadly upgraded: direct application dependencies have runtime imports; tooling dependencies remain required by build/typecheck/browser scripts. The added dependency is the disclosure's measurement hook.
- Existing ignored logs, local databases, backups, generated build outputs and sibling worktrees were retained. They are not clean-checkout submission content. No mass filesystem cleanup occurred.

Pending cleanup proposals (not executed; removal requires owner approval under the original brief): `pd_append.py` (one-shot completed progress-note appender, no consumers found), `apps/owner/src/tsconfig.json` and `apps/owner/src/next-env.d.ts` (secondary generated app configuration; canonical commands run from `apps/owner`). Keep them recoverable until an approved cleanup batch; do not remove database or contract evidence files with them.

## D. Executed verification

Host: Windows, Node `v24.18.0`, installed Microsoft Edge. Local logs: ignored `artifacts/consolidation-*.log`. Commands ran against this candidate; docs-only edits after the build do not alter application output.

| Command | Result | Scope |
| --- | --- | --- |
| Root `npm test` | **42 passed**, 0 failed/skipped | Reference policy/proof tests |
| `apps/owner`: `npm test` | **363 passed**, 0 failed/skipped | API/auth/isolation/contractor/agent/payment/worker backend suites, safe fixtures |
| `NNETICS_BUILD_DIRECTORY=.next-hosting npm run typecheck` | **Pass** | Next route generation + TypeScript; not lint |
| `npm run check:theme` | **Pass** | Token/contrast checks across light and dark |
| `NNETICS_BUILD_DIRECTORY=.next-hosting npm run build` | **Pass** | Next 16.4.3 optimized production build, all routes generated |
| `npm run test:browser` with isolated settings below | **261 passed, 2 failed, 3 skipped**, plus 1 worker teardown error; 30.3 minutes | Initial full desktop/mobile run; findings and their resolution below |
| `npx playwright test --last-failed` on fresh isolated server | **1 passed, 1 opt-in skip**, exit 0; 30.5 seconds | Both initial failed cases rechecked after fixes; no worker error |
| Configured-provider gate check across both specs/projects | **4 opt-in skips**, exit 0 | No provider requests; confirms explicit acceptance boundary |
| `git diff --check` | **Pass** | No whitespace errors; Windows LF/CRLF notices are informational |
| Standalone lint | **Unavailable** | Repository has no configured lint command; no new lint stack introduced |
| Rust unit/sandbox/provisioning scripts | **Not run — environment unavailable** | No Cargo or installed WSL. Pinned Sandbox scripts support Linux x86_64/aarch64 or macOS arm64, not this Windows host |
| Fresh real-wallet and real-model acceptance | **Not run** | No live signature, model quota consumption, testnet payment or deployment |

Browser isolation: production `.next-hosting` build at `http://127.0.0.1:3120`, `CI=true` (no reuse of an existing server), temporary invoices/identities/contractors/demo-portal/demo-workspace databases, empty authorization/provisioning flags, empty OpenRouter key. The original development preview on 3100 was left running. Playwright owns and stops the temporary server. UI tests include HTTP fixtures and synthetic local API mutations; neither is live onchain settlement.

Initial browser finding: `ask-nnetics.spec.ts` unconditionally required successful external model calls and failed with HTTP 503 when the intentionally empty key reached the provider configuration guard. Added explicit `NNETICS_RUN_REAL_MODEL_ACCEPTANCE=1` opt-in to both external-provider acceptance cases, retaining all success assertions. This separates network/quota-dependent acceptance from the default secretless regression suite, even on machines with a private configured server key; controlled-provider model/confirmation tests remain enabled. Both specs across both projects now correctly skip unless opted in (`consolidation-provider-final.log`, four skips, exit 0). The initial failure log is retained; no real-model success is inferred from a skip.

Initial restart-test finding: the three-process persistent-session test exhausted the suite's 45-second total budget during its second browser launch; the trace showed the first login/HttpOnly-cookie assertions succeeding. Added a 120-second total budget for this process-restart test only, keeping each expectation's normal timeout and all three persistence/logout checks intact. The isolated desktop rerun **passed in 50.8 seconds** (`consolidation-restart-rerun.log`), confirming the full cookie-persistence/logout journey with the longer process budget. Final typecheck after these test edits also passed (`consolidation-typecheck-final.log`).

Final failed-case rerun (`consolidation-last-failed.log`): fresh production server and temporary databases, **1 pass + 1 opt-in skip, exit 0**; restart case passed again in 19.3 seconds with successful cleanup. Mobile restart coverage passed in the full run. The initial teardown error accompanied the timed-out desktop restart; neither isolated rerun reproduced it. No unresolved browser failure remains in the exercised default regression scope. This is combined evidence, not a claim that the initial full run exited zero.

The four new Side Panel cases passed (owner and contractor × desktop and mobile). The full run also covered simulated settlement/failure recovery, original text, clarification/review, authorization, forged authority/CSRF/isolation, wallet cancellation, unsupported protocol, responsive layouts, theme/reduced-motion/focus and persistence. Visually inspected fresh desktop light Overview, desktop dark contractor billing and mobile light Overview captures; no unrelated restyle was introduced. These are fixture/synthetic-data checks, not real wallet or chain acceptance.

Contracts/factory/sandbox, root reference modules, deployment scripts and CI workflows compare unchanged against `feature/nnetics-v3`. Existing secretless Linux workflows remain the route for fresh contract verification. No current CI or independent security-review result is invented.

## E. Git and branch plan

Working branch: **`chore/nnetics-repository-consolidation`**. Prior consolidation commits: `c6eb904` (preservation), `9d882dc` (discovery), `f49ee7b` (feature matrix). This resumption created `cf71c11` (integration/documentation) and `dfdb921` (provider acceptance boundary and browser restart budget), followed by the final audit/evidence documentation commit. Resolve that final revision with `git log -1`; this file is part of it. All authorized changes are committed; final `git status --short` is checked after the documentation commit. All five sibling recovery worktrees were rechecked clean.

Resumption implementation commit: **`cf71c11`**, billing disclosure integration, evidence reconciliation, canonical documentation and byte-identical historical-report moves. Remote read-only verification (`git ls-remote --symref origin HEAD 'refs/heads/*'`) confirmed the default still points to `codex/payscope-milestone-1` at `091aca09a265a8d6f7674fda4fa6682b278f9d6c`; only the three previously audited remote heads exist. No push was performed.

No branch was deleted, merged into a shared branch, reset, force-pushed or published. No `main` was created before acceptance. Recommended owner-reviewed next step: publish the verified consolidation candidate as `main`, run Linux CI, then switch the GitHub default branch. Keep the dedicated consolidation branch until accepted.

| Branch/ref group | Proposed disposition |
| --- | --- |
| `chore/nnetics-repository-consolidation` | Keep active candidate |
| `feature/nnetics-v3`, `feature/nnetics-demo-intents`, `codex/nnetics-cult-ui` | Protect source branches until explicit consolidation acceptance |
| `keep/*`, `refs/keep/*`, `refs/checkpoints/*`, `checkpoint/*` | Protect recovery content; no deletion proposed now |
| `codex/nnetics-before-design-integration`, `codex/nnetics-final-design`, `feature/task-dashboard-demo` | Local deletion candidates after acceptance: ancestor branches, no uniquely needed product work; keep preserved task-dashboard WIP |
| `codex/nnetics-live-integration`, `codex/owner-dashboard-local`, `codex/payscope-milestone-1` | Retain until public `main` and default-branch transition are verified; then request a separate remote cleanup decision |
| Remote source branches | **No remote deletion proposed in this run** |

The three local deletion candidates are recommendations, not permission to remove worktrees or branches. Exact source hashes and preservation refs above provide recovery options. The remote default branch and public availability were not changed.

## F. Submission readiness and remaining actions

One canonical local startup path, current product identity, feature decisions, source attribution and safe demo instructions are documented. Manual demo workflows need no wallet or AI key; full real-model acceptance remains optional/unverified and must not be advertised as passed. Historical payment links remain dated evidence only.

Before public submission: complete fresh Linux Rust/sandbox and remote CI checks; review the exact candidate and approve publication/default-branch changes; recover complete real-model evidence or keep the limitation explicit; record and publish the demo video/post; complete human-provided submission fields. Review [SUBMISSION_DRAFT.md](SUBMISSION_DRAFT.md) and the actual current event requirements before submission. No public post, remote deployment or transaction was performed here.
