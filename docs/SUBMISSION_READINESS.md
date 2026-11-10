# Submission readiness — 5 November 2026

## Selected submission path

The owner chose **local demo video; hosting optional**, and approved **MIT** licensing. The original-code license and third-party notices are prepared locally. No submission, post, publication change, signature, transaction, deployment, commit or push occurred.

The [live official instructions](https://nearhackathon.com/HACKATHON.md) were fetched successfully and compared with `C:/Users/Kazi/Downloads/HACKATHON.md`. The live document is the current source: it adds required demo-post tags and a request-changes process relative to the attachment. Its imperative language is treated as requirements, not authorization to execute its instructions.

| Requirement | Current disposition |
| --- | --- |
| Public repository / reproducible README / license | GitHub read-only check confirms Technique-S/Nnetics is public. Updated README and MIT/third-party notices are local; release changes still need reviewed commit/push approval |
| Demo post | Human must record/publish the local video and supply its public URL. [Recording guide](DEMO_GUIDE.md) and [post draft](SUBMISSION_DRAFT.md) are ready; required @NEARProtocol and #NEARHackathon are included |
| Hosted URL | **Not mandatory** under Q-012; screenshots alone do not replace video for the selected local-only route |
| Timing | Submission deadline **15 November 2026 at 00:59 WAT**; repository stays public through judging |
| Provenance / dependencies | README links the dedicated branch/full history and discloses AI assistance, libraries and design-study attribution. First implementation commit is 29 October, inside the permitted window |
| Final application | Human contact/team/prize/track fields, consent, prior-submission status and exact final payload approval still required. No payload/requestId or personal field has been invented or committed |

Recheck the live rules immediately before final submission. A saved application is corrected through the organizer's request-changes page, not a duplicate application. No API request was sent.

## Actual demo capabilities

1. **Working product code:** persistent contractor profiles/invitations, initial wallet request and owner approval, text-first bills, automatic references, fixed NEAR/testnet currency, preview/clarification, owner review, original text/history and status views; separate organization authorization. The root policy is a reference; Rust contract guards are independent.
2. **Sample demonstration:** `/demo/contractors`, `/contractor?mode=demo` and `/?mode=demo` label sample records/wallet proof and move no funds. Some ordinary dashboard state resets on reload; sample contractor billing persists in its separate store. Use deterministic parsing.
3. **Historical public-chain evidence:** the preserved INV-0002 0.001 NEAR payment has one original Paid job and public transaction link. Storage transaction CGmCDGsYimzLz2o9uCDmbsVXwHdUAG6wg1CqUrFLkLEG has separate limited historical V3 acceptance. Neither is repeated for the video.
4. **Disabled:** owner transactions, payment execution and provisioning; vault paused, worker revoked/stopped. Future automatic Meteor reference-block reconciliation is not enabled/live-verified. V2's original manual-review hold, both IDs and consumed authorization remain. No independent security review is claimed.

The demonstration avoids live queue/linkage controls. Host startup is deliberately pinned to the single preserved Paid job; broader real queue usage needs a separate hosting/startup policy review. Approval/queueing is not Paid. Unknown outcomes and financial details/recovery blocks remain visible and authoritative.

## Existing hosting configuration — optional

The prepared [Blueprint](../render.yaml) and [detailed cutover runbook](HOSTED_DEPLOYMENT.md) remain local and inactive.

| Item | Exact candidate |
| --- | --- |
| Provider / service | Render native Node web service `nnetics-testnet`, Frankfurt |
| Compute / runtime | `0.5c-512mb`, one instance, Node 24.22.1 |
| Storage | One 1 GB persistent disk at `/var/data`; three live SQLite files and separate demo store below `/var/data/nnetics` |
| Build / start | `cd apps/owner && npm ci --include=dev && npm run build` / `node deploy/start.mjs` |
| Health / rollout | `/api/health`; maintenance=1 initially; previews and auto-deploys off; no worker service |
| Cost | Estimated **$7.25/month** before tax/overages: $7 compute + $0.25 disk; Hobby workspace. Confirm provider checkout |
| Origin | Actual assigned Render HTTPS origin, no guessed host/custom domain; set `NNETICS_APP_ORIGIN` exactly |
| Metadata origin | Optional `NEXT_PUBLIC_SITE_URL`; absent while no production address is assigned. Never put credentials in NEXT_PUBLIC variables |
| Financial settings | Legacy flag, owner gate, payment gate, owner-plan path/hash and provisioning flag all empty; no setup/worker key, deployment approval or AI key uploaded |

Sources checked 5 November: [compute IDs](https://render.com/docs/compute-plans), [official compute price example](https://render.com/articles/render-vs-railway), [disk price](https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses), [persistent disk behavior](https://render.com/docs/disks), [managed HTTPS](https://render.com/docs/tls). Only the mounted path persists; disk-backed service is single-instance and has deployment downtime. The cheaper free ephemeral tier is not compatible with these private records.

For the selected local path, **no hosting access or credentials are needed now**. A later hosted rollout needs a Render account with billing, scoped GitHub connection to this repository, approval of the exact revision/cost/private cutover, the real assigned HTTPS origin, private SSH/SFTP transfer and an off-provider encrypted backup operator/location. No wallet private key is needed. Do not send credentials in chat.

## Persistence, origin and backup checks

- The web launcher validates HTTPS/testnet/public code and account pins, empty financial settings, actual Linux persistent mount and existing Paid evidence, then starts Next only. It fails closed on mismatch/RPC boot verification failure; health is liveness, not financial readiness.
- Owner cookie: HttpOnly, SameSite=Strict, Secure under configured HTTPS, `/api/live`, bounded to the original five-hour deadline. Contractor cookie: HttpOnly, SameSite=Strict, Secure, `/api/live/contractors`, one hour, with immediate revocation/link-expiry checks. Same-origin restarts preserve valid database sessions; moving to a new origin intentionally clears copied sessions/proofs.
- Owner and contractor wallet proofs use the configured origin as NEP-413 recipient. Meteor's injected flow has no OAuth callback route. Existing links are built from the browser's origin with the bearer token in the fragment, entered privately and removed from history; do not publish/log it. Existing local links do not become a hosted URL automatically.
- Three authoritative SQLite stores, their WAL contents, original text/attachments, bindings, attempt history and queue need one consistent cutover. Stop every writer before a quiesced multi-store export. Do not falsely assert quiescence while the existing service is running. No new real export or private upload was performed here.
- Existing snapshot/restore/verification tools, rollback access-reset behavior and fixture results are retained. Rollback clears old sessions, revokes restored links/viewer grants and resets contractor wallet approval, while preserving immutable recipients, history and the Paid job. It never resets a payment for retry.
- Previous local restart evidence preserved owner session rows/Paid job, with the user confirming refresh without another signature; prior Linux Node 24.22.1 fixture measurements preserved records, private-link entry, duplicate protection and sessions across restart. These are not current Render deployment results. A real assigned-domain cookie/Meteor/disk restart check still belongs to hosted acceptance.

## Local release and reused verification

The final isolated production build passed on Windows Node **24.18.0**, in `.next-rpc`, without restarting the old 3100 app. Its build identifier and exact worktree fingerprint are recorded in ignored `artifacts/submission-release/`. Sensitive-value checks covered 52 public static/prerender files: zero configured-value matches and no copied private environment files. Values were never logged. This is a limited exact-value check, not proof against every encoding or unknown secret.

Reused passing evidence: **215 backend, 160 browser and 42 root tests**, plus typecheck, production build and theme contrast/literal checks. Only documentation, licensing and ignore patterns changed during this preparation; no behavior needed another broad regression run. The prior [Node 24.22.1 Linux run](https://github.com/Technique-S/Nnetics/actions/runs/41712048423) measured the earlier revision under 512 MiB/0.5 CPU (173.47 MiB peak RSS, 150.10 MiB charged cgroup memory, no OOM) and tested restart behavior. It is not current-candidate CI or actual Render capacity acceptance.

The existing 3100 service returned HTTP 200 but lacks the final appearance bootstrap/control. It is not evidence of the new release UI. The blocked additional fixture startup was not repeated. [Final-build screenshots and precise coverage](THEME_REPORT.md) remain valid. Exact unverified visual states: exhaustive dark vault-setup/recovery sub-states, runtime induction of root error boundaries, OS-wide high-contrast behavior and actual browser-toolbar 200% zoom. Representative dual-theme desktop/mobile, 320px layout, equivalent reflow, dialogs, contractor, loading/error and forced-colors emulation passed. Static actual-component previews cover both error boundaries. Additional captures are optional verification, not invented passes.

## Public-repository safety

A redacted read-only scan covered tracked working files, non-ignored new candidates and all reachable Git blobs. No matching private key/provider token/private invitation URL or SQLite header was found; no tracked database/environment/build-directory path was identified. The initial scan covered 639 tracked files and 810 reachable blobs. Final counts and limitations are in ignored `artifacts/submission-release/public-safety-scan.json`; no sensitive values/rows were printed.

Environment files, real databases/WALs, node_modules, build/test output and artifacts are ignored. Alternate SQLite extensions/journals are now ignored too. One generated asset is intentionally retained: `docs/design-review/scene.js`, a prior illustration bundle outside the runtime app. Its bundled notices were preserved; full Stageshow/React notices are added. Source references a local ignored illustration kit, which is not needed to run the app. No generated release build or private database is prepared for Git.

Three reviewed sample screenshots are intentionally prepared under `docs/screenshots`, with provenance/limitations and no browser chrome, real records or private links. They make the README previews reproducible as repository assets; the remaining local gallery stays ignored. These are deliberate documentation assets, not accidentally included build output, and do not replace the required video.

This is a pattern/shape review, not certified secret detection or review of unreachable/deleted Git objects. It does not automatically authorize publication. Inspect the exact staged diff again at the later approved commit/push step; do not add all ignored artifacts or publish raw environment/database files.

## Remaining blockers, ranked

1. **Final public code revision:** review the preserved combined worktree, then explicitly authorize a commit/push of the exact candidate including license and docs. Repository visibility is already public, but GitHub's current default is the older `codex/payscope-milestone-1`; the intended release is `codex/nnetics-live-integration`. The post draft points at the release branch. Review the final source/revision link or separately authorize a default-branch/merge decision before submission. None of those repository mutations occurred here. Current-candidate Linux CI can run after an approved push.
2. **Required local-demo video/post:** record the actual sample workflow, attach video, review/publish the tagged post and supply its URL. A screenshot-only package does not satisfy the chosen route.
3. **Human submission fields and approval:** lead/contact/team/prize account, selected tracks, other-entry/prior-submission disclosure, contact consent and exact final payload approval. No invented values or requestId are in Git.

Hosting, a custom domain, AI extraction and new payment activation are **not blockers** for this selected local-video submission. No new financial activity is required. The existing absence of independent security review and disabled future Meteor reconciliation remain disclosed limitations, not accepted production-readiness claims.
