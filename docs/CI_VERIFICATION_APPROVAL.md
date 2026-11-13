# CI verification approval package — candidate `ab7e513`

Prepared 2026-11-13 for the operator decision gate. **Nothing has been pushed, dispatched, or published.** This document contains the exact commands, expected outcomes, and disclosures so each step can be approved separately.

Candidate under review: local branch `chore/nnetics-repository-consolidation`. The reviewed revision is `ab7e5130ad1907eef37dc49c7b45a0bb589c6513` — exactly the tree reviewed in [final-release-verification.md](final-release-verification.md). The branch tip sits ahead of it by documentation-only commits only (this approval package and the deletion-manifest regeneration). Before executing any command below, confirm the delta is still documentation-only:

```bash
git diff --name-only ab7e5130ad1907eef37dc49c7b45a0bb589c6513..chore/nnetics-repository-consolidation
```

The output must list only files under `docs/`. If anything else appears, stop and re-review before publishing.

## Scope and standing constraints

Approval of items below authorizes **only** what is explicitly approved. It does not authorize:

- branch or file deletion (the deletion manifest remains `deletionsExecuted: false`)
- default-branch change, visibility change, or publication of the candidate as `main`
- changes to deployed contracts or any blockchain transaction (nothing has ever been deployed from this candidate)
- real-model provider changes (no key or model substitution)

The four release tracks are tracked independently and are never conflated — see the tracker table below.

## Safety inspection of `release-verification.yml` (verification-only: confirmed)

| Audit point | Verdict | Evidence |
| --- | --- | --- |
| Deployment steps | None | Steps are npm/cargo/Playwright/Docker-measurement only. Grep across all five workflows for `deploy`, `vercel`, `render deploy`, `gh release`: zero matches. The contract chain self-declares: "Local sandbox only. No public deployment, wallet request or payment was executed." |
| Credential access | None | No `secrets.*` reference in any workflow (grep: zero matches). Every `checkout` sets `persist-credentials: false`. The browser job runs with `OPENROUTER_API_KEY: ''` (empty). |
| Transaction execution | None | Transaction-authorization flags are blank in the job env: `NNETICS_OWNER_TRANSACTIONS_AUTHORIZED: ''`, `NNETICS_PAYMENT_EXECUTION_AUTHORIZED: ''`, `NNETICS_PROVISIONING_ENABLED: ''`. NEAR usage is the **local** sandbox (pinned near-sandbox 0.3.12 / nearcore 2.13.0 or 2.14.0-rc.5); `NEAR_SANDBOX_BIN_PATH` guard rejects network substitutes; sandbox version allowlist rejects anything else. The testnet-RPC scripts under `checkpoint-verification/` are not invoked anywhere on the CI path. |
| Write permissions | Read-only token | `permissions: contents: read`. Writes are confined to the runner workspace and `/tmp` (`NNETICS_DATABASE`, identity/contractor/portal/workspace DBs all under `/tmp/nnetics-release/`, `CI: 'true'`). |
| Unintended publication triggers | Dispatch-only | `on: workflow_dispatch` — the only trigger. No push, pull_request, schedule, release, or repository_dispatch; the workflow cannot fire by accident. |

Inspected this session: the full workflow, its complete script chain (`scripts/check-release-contracts.sh` → `check-provisioning.sh` → `check-core.sh` → `release-contract-report.mjs`), all five workflow files, and global greps for secret/deploy/network surface. Actions are pinned to 40-hex SHAs (`checkout@11d5960a…`, `setup-node@49933ea5…`, `upload-artifact@ea165f8d…`).

## Repository state (verified 2026-11-13)

- `origin` = `https://github.com/Technique-S/Nnetics.git`
- Remote heads: `codex/nnetics-live-integration` @ `2d4daf5e`, `codex/owner-dashboard-local` @ `7d194e49`, `codex/payscope-milestone-1` @ `091aca09` (default branch)
- The candidate branch is **not** on the remote; the local tip sits documentation-only ahead of the reviewed revision `ab7e513` (diff limited to `docs/`, verified 2026-11-13).
- The remote default branch contains **only** `payment-core.yml` under `.github/workflows/` (`git ls-tree 091aca09`); the candidate tip carries all five workflow files, including `release-verification.yml` (blob `ce31cf3f…`).
- `gh` 2.96.0 is installed but **not authenticated**; repo privacy is unconfirmed until login.

## Prerequisite (operator, interactive)

```text
gh auth login
```

Default scopes (repo + workflow) are sufficient for both the ref-creation API and workflow dispatch. Option A additionally requires the operator's normal Git push credentials (Git Credential Manager).

## Step 1 — publish the branch: Option A or Option B

### Option A — plain push (discloses 4 standing read-only workflows)

```bash
git push origin chore/nnetics-repository-consolidation
```

Disclosed side effects: because three standing workflows have unfiltered `push:` triggers and one is path-filtered, pushing the new branch fires:

| Workflow | Jobs fired | Content |
| --- | --- | --- |
| `owner-integration.yml` | 1 (`owner`) | typecheck, tests, build, browser suite |
| `payment-core.yml` | 2 (sandbox matrix `2.13.0`, `2.14.0-rc.5`) | local-sandbox core suite |
| `vault-provisioning.yml` | 2 (sandbox matrix) | `check-provisioning.sh` |
| `hosted-readiness.yml` | 0–1 (`hosted`) | app tests/build under maintenance flags + 512 MiB / 2 GiB Docker measurement; path-filtered (`apps/owner/**` etc.), expected to match because the whole tree is new on the remote |

Total: up to ~7 extra runner jobs beyond the verification run. All four are read-only (`contents: read`, pinned actions, `persist-credentials: false`, no secrets, no deployment) — they consume Actions minutes and upload artifacts only. The push itself publishes the reviewed source as a **feature branch**; the default branch is untouched.

### Option B — create the ref via API (no push event expected)

```bash
gh api repos/Technique-S/Nnetics/git/refs \
  -f ref=refs/heads/chore/nnetics-repository-consolidation \
  -f sha="$(git rev-parse chore/nnetics-repository-consolidation)"

# verify the created branch points at the local tip:
gh api repos/Technique-S/Nnetics/branches/chore/nnetics-repository-consolidation --jq .commit.sha
```

Pin the **current tip** (`git rev-parse chore/nnetics-repository-consolidation`), so the remote branch matches local and needs no follow-up push — a later push to the existing branch would fire the standing workflows anyway. Creating the ref at the older reviewed revision `ab7e513` would diverge local and remote and is not recommended. The docs-only diff check above is the safety gate for whatever tip exists at execution time.

Expected: the branch is created server-side without a push event, so the four standing workflows do not fire. This expectation is **unverified until executed**; if runs fire anyway, they are exactly the read-only jobs disclosed under Option A. Option B avoids spending those minutes if the no-event behavior holds.

## Step 2 — dispatch the verification workflow

```bash
gh workflow run release-verification.yml --ref chore/nnetics-repository-consolidation
```

- Success (HTTP 200/204, "Created workflow_dispatch event") → monitor as below.
- Failure ("workflow does not exist" / 404) → GitHub resolved dispatch against the default branch, where this file is absent. Community evidence on the exact rule conflicts (`cli/cli#9781` vs. `gh workflow run --ref` docs; discussion `#169535` unanswered), so this is an attempt with a prepared fallback, not a guarantee. An attempt costs nothing if rejected.

### Fallback — requires a separate approval (F)

If the dispatch is rejected:

1. Add the **identical** workflow file (blob `ce31cf3f5512030817f910830a51dd137d7452bf`) to the existing default branch `codex/payscope-milestone-1` @ `091aca09`, either:
   - preferred: via the Git data API (blob → tree → commit → update ref); no push event fires and no standing workflow is expected to run (unverified until executed), or
   - via a normal one-file push, which fires `payment-core.yml` — the only workflow on that branch — as 2 read-only sandbox jobs.
2. Dispatch against the **candidate ref**, so the run checks out the candidate tip:

   ```bash
   gh workflow run release-verification.yml --ref chore/nnetics-repository-consolidation
   ```

   The file content is identical on both branches, so the executed definition is the same either way; the checked-out code is `ab7e513`, which is what must be verified.

## Expected CI jobs (the verification dispatch run: 3 jobs)

| Job | Matrix | Timeout | Does | Uploads |
| --- | --- | --- | --- | --- |
| `application` | — | 60 min | `npm ci` (root + `apps/owner`); lint; tests; owner typecheck / test / check:theme / build; Playwright chromium + browser suite with isolated `/tmp` databases, blank transaction-authorization flags, empty `OPENROUTER_API_KEY` | `release-browser-<sha>` (14 days) |
| `contracts` | sandbox `2.13.0` | 120 min | apt build deps; `rustup show`; `bash scripts/check-release-contracts.sh` — local cargo fmt/test/clippy/build plus the local NEAR-sandbox provisioning suite; no network | `release-contracts-<sha>-2.13.0` (14 days) |
| `contracts` | sandbox `2.14.0-rc.5` | 120 min | same against the protocol-88 candidate runtime | `release-contracts-<sha>-2.14.0-rc.5` (14 days) |

Monitoring:

```bash
gh run list --workflow=release-verification.yml --limit 5
gh run watch <run-id> --exit-status
```

## Post-run evidence to retain (per [LINUX_RELEASE_VERIFICATION.md](LINUX_RELEASE_VERIFICATION.md))

For **each exact candidate SHA and each runtime**: the Actions run URL, job results and exact checked-out commit; `artifacts/release-contracts/<run>/acceptance.json`, the complete `verification.log`, Node/Rust/Cargo/platform versions and the OS package inventory; `artifacts/runs/<run>/logs/run.json`, `stages.jsonl`, stage logs and the public local-sandbox receipt proofs; factory unit and provisioning sandbox logs with **nonzero** test counts; the production vault/factory WASM plus `SHA256SUMS`, verified from the repository root with `sha256sum -c artifacts/provisioning/SHA256SUMS`. Fault artifacts stay separately identified. Nothing is deployed from the run. Uploaded artifacts expire after 14 days — download the full set before expiry.

## Independent track status (2026-11-13)

| # | Track | State | Next action / owner |
| --- | --- | --- | --- |
| 1 | Source publication (feature branch only) | Not published — candidate exists only locally at `ab7e513` | Operator approves Option A or Option B |
| 2 | CI verification (Linux Rust + NEAR sandbox) | Not run — workflow is dispatch-only and exists only on the candidate branch | Operator approves the dispatch attempt; fallback needs separate approval (F) |
| 3 | Real-model acceptance | 30/34 tools live-verified; 4 quota-blocked (HTTP 429), provider reset `2026-11-14T00:00:00Z` | Rerun the exact continuation command in [REAL_MODEL_ACCEPTANCE.md](REAL_MODEL_ACCEPTANCE.md) after reset (`get_invoice_payment_readiness`, `preview_simulated_intent`, `prepare_delete_contractor`, `delete_contractor`) |
| 4 | Final hackathon submission | Human tasks open | Operator: demo video ([DEMO_GUIDE.md](DEMO_GUIDE.md)), submission post, [SUBMISSION_DRAFT.md](SUBMISSION_DRAFT.md) fields |

## Decision checklist (approve each item separately)

- [ ] **D1** — publish mechanism: Option A (push; 4 standing read-only workflows fire) or Option B (API ref creation; no push event expected) — or defer.
- [ ] **D2** — pre-approve the dispatch attempt on the candidate ref (no cost if GitHub rejects it).
- [ ] **D3** — pre-approve the fallback (F: one-file workflow commit to `codex/payscope-milestone-1`) or require a separate approval at that point.
