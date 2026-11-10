# Validation record — through 5 November 2026

## V4 checkpoint handoff and blocking plan review — 5 November 2026

**Not live-ready.** Original V4 SHA-256 still **`d6ee7587ed059a22e76ce05cf254d4de33d3066730d5abda7672424add9599f5`**; all seven exact inputs are unchanged. [Detailed evidence, hashes, Linux commands and failure-cleanup table](V4_CHECKPOINT_VERIFICATION.md). This later review supersedes any earlier implication that only Linux execution/approval remains.

Available execution checks found no usable WSL, Cargo, Docker or configured SSH host. No Linux execution was attempted through an alternate/unapproved service. No infrastructure purchase, upload, signatures, transactions, live deployment, commit or push occurred. Existing uncommitted work was preserved; application/contract code was not changed for this verification task.

**Actually executed:** read-only dual-source testnet capture at finalized height **276384748**, expected deployed code/owner/paused/revoked/no-key checks, exact deployed WASM download/hash validation, seven real-input cryptographic/order/continuity checks through the existing local verifier, original trusted root/validator-set argument digest comparison, transaction byte-size/gas/deposit and allowance arithmetic checks, vendor recipient corroboration, Node bundle integrity audit and syntax checks. Windows Git Bash performed shell parsing only. No synthetic checkpoint input was substituted. No unchanged application/browser/root suite was rerun or represented as fresh evidence.

The current complete root argument SHA-256 matches the previously approved bootstrap exactly: **`e38bed03aadd216a2472fb92064cf77ee54aecc86f405f22259c6f6607731027`**. Exact deployed WASM SHA-256: **`dc4cf64736110a33cce94531e2e00ba4510bcebbbb240bee6ecdacacf778560f`**, NEAR code hash **`Fpxm2eovD9cdo5ik6yZURyQEWTbruj6GKJi2XA6UBArJ`**. Public captured state is supplied to the offline harness; no private database, wallet key, session or invitation is included.

**Prepared, NOT executed:** Linux integration target for official near-vm-runner **0.37.4**, Rust **1.93.0**, Node **24.22.1**, captured protocol-88 **Wasmtime** configuration and all seven exact **250-Tgas / zero-deposit** calls. Source signatures/commitments/quorum/ancestry checks passed locally with Node **24.18.0** and installed SDK **7.4.0**; WASM resource/contract execution remains unverified. The new Rust harness itself has not compiled here. Its memory-trie adapter is not full nearcore receipt/trie simulation, and cannot establish live transaction overhead or independent security review.

Bundle: ignored `artifacts/v4-checkpoint-verification/nnetics-v4-checkpoint-bundle.zip`, **1,706,342 bytes**, SHA-256 **`7c0031f84d4a7b0d6d4b68c64eb59aab9b3ada80b5dd5ab164ae40249389d813`**. Manifest SHA-256 **`594de08499fa8b219625aa9d8f908d2b61740f6656b9c513144ebd3445528829`**. It contains unchanged inputs/plan, real deployed WASM and public state, checksummed official VM crate/lockfile, sources/provenance and exact commands. Run `bash run-linux.sh` on an authorized Linux x86_64 host with the specified toolchain; return the fresh `work-*` results. Compilation/configuration/gas failures must be reported without changing gas, proofs, versions or lockfiles to force a pass.

**Plan checks:** single 0.001-NEAR Babygoat payment, cumulative 0.002 vs additional 0.001 authority, unchanged per-payment cap, zero additional worker funding, and the combined **0.595000000000000000000006-NEAR** allowance all pass. The transfer uses the already-counted payout deposit, not another funding amount. The active vendor's recipient is exactly `babygoat.testnet` at the captured block.

**Two additional blockers:** (1) read-only private-store checks found no actual INV-0003 bill or job, only the existing single Paid INV-0002 job. V4 predicts a label instead of binding an actual bill/agreement UUID and immutable durable import/job payload; normal authorized record creation/review and an enforced amended binding are required. No records were fabricated or created. (2) V3's success-only result collector (`reference-block-policy.ts:83,118`) retains a finalized failure as a held owner attempt (`owner-attempt.ts:184`), which blocks later owner steps. V4's generic cleanup text cannot safely resolve failed pause/revocation. Reviewed failure adjudication plus explicit partial-cleanup handling are required; no hold was cleared or consumed step rearmed to evade this blocker.

The plan was unexpired and its final head fresh at **20:56:18 WAT**. Deadline remains **6 November, 05:14:10.901 WAT**, with checkpoint expiry **07:35:20.133 WAT**. No silent refresh/extension occurred. After expiry, the bundle permits only clearly labeled historical verification; an executable refreshed plan needs new version/hash review and any explicitly collected replacement evidence. Do not execute expired V4. Even a seven-input VM pass will not clear the two plan/runtime blockers or authorize a live run.

Both runtime gates remain disabled. Final containment evidence is recorded separately under `artifacts/v4-checkpoint-verification/`; the vault stays paused, worker revoked/stopped, and the original Paid/V2 history is preserved. No independent security review has occurred. Exact remaining environment access: a runnable authorized Linux x86_64 host/SSH alias, or operator execution of the supplied public-data bundle; no wallet credentials are needed.

## Operational integration — 5 November 2026, local only

Submission preparation paused; the prior recording guide/publication proposal and all unrelated uncommitted work are preserved. Branch `codex/nnetics-live-integration`, HEAD `70e4f5b43db9d037e4b1fd70269dca92b3c3b86f` remains unchanged. No staging, commits, pushes, deployment, wallet prompts, real signatures or transactions occurred.

### Implemented

- Integrated the pinned V3 verifier into normal new owner-attempt reconciliation. V3 file SHA-256 remains `1ff5abb96c4633d8d6f510ec4a2ab44c1fbf0bfe45d959edc05dc7bbd6543709`; V2 remains `d1a23de53593766aa412fbc4614807e769f2a376e7231e9fd806bf39c6f9e00a`. Exact intent, nonce/key, ordered actions/argument bytes, signature/hash, bounded canonical reference refresh, FINAL outcome, executed code and complete supported receipt graph are verified. Only the reference may differ. Missing evidence remains blocked/consumed and can recover by read-only reconciliation after restart. Definitive mismatches remain manual review.
- Added bounded V4 owner scopes for existing actions, with a pinned owner key, exact per-step action/deposit/gas/fees, expiry, prerequisite confirmations and atomic one-use consumption. The accepted historical V2 hold stays in its original scope; known historical evidence is not reused as authorization. Cross-scope unresolved attempts block preparation/dispatch. Concurrent/late conflicting IDs remain durable, including a report arriving while the next operation is prepared.
- Added authenticated checkpoint preparation/staging and exact-state installation reconciliation. Same/next epoch only; validator commitments, signatures, >2/3 stake, ancestry, time/height and input bounds mirror the pinned Rust verifier. No new root or transaction is installed by the collector. Recovery UI can review an exact scoped 250-Tgas/zero-deposit update. Funding/limit reviews show their actual limits, not a one-yocto deposit substituted as the amount.
- Bound worker operation to one existing job, exact hash-pinned payment plan, order, generated invoice reference, recipient/amount, restricted key, fees and balances. `--once --job` is mandatory; other queued jobs do not run. Freshness is checked before claim, preparation and broadcast. Expiry before claim keeps the job queued/unsigned. Unknown signed jobs retain their claim/bytes. Permission changes during preflight stop key loading/signing/broadcast. Paid still requires authoritative contract and transaction linkage.

### Actual execution and failures

| Check | Actual result |
| --- | --- |
| Final owner/backend `npm test` | **241 passed, 0 failed/skipped** |
| Root `npm test` | **42 passed, 0 failed/skipped** |
| Complete browser-fixture replay, desktop/mobile | **166 passed, 0 failed/skipped** |
| Typecheck and `.next-rpc` production build | **Passed**, build ID `TrVHhZCye9N0v8cRtqwgm` |
| New real Meteor/financial acceptance | **Not performed** |
| New Rust/sandbox execution | **Not performed**: no Cargo/usable WSL here |
| Existing unchanged contract sandbox evidence | [Run 41809747952](https://github.com/Technique-S/Nnetics/actions/runs/41809747952): protocols 86/88 (`2.13.0`, `2.14.0-rc.5`) both passed; no diff in contracts/normalizer/core script against that tested revision |
| Exact seven newly collected checkpoint inputs in VM | **Not executed; required before live execution** |

The browser run replayed final prebuilt HTML/static assets on the existing permitted 3100 origin, preserving the source test assertions and API fixtures. It did not restart the server, repeat a policy-blocked fixture startup, access a real wallet or prove the final Next backend served a live transaction. Initial replay: **152 passed / 8 failed**, because extra tabs/persistent browser contexts and a 404 received old-server assets. The ignored replay harness was corrected at context/browser level and supplied final 404 assets; the final complete run passed 166 (including six new viewport cases for compatible reference results, scoped limits and checkpoint review). No assertions were removed, sleeps/timeouts added, or failures skipped. The old server remains running; a future live run must start the final build after approval/preflight.

Focused diagnosis caught and fixed: (1) importing prior payload hash evidence before counting candidate hashes; (2) re-reading the correct operation scope for late reports; (3) checking unresolved operations again atomically at dispatch; and (4) preserving resumable evidence-unavailable state without losing consumed authorization. Deterministic barriers, isolated SQLite files and simulated provider responses cover both race orderings and restart recovery. Fixture signing uses ephemeral test keys only.

Artifacts (ignored/private, not publication files): `artifacts/operational-owner-final.log`, `operational-reference-final.log`, `operational-browser.log` (initial), `operational-browser-final.log`, `operational-build-final.log`, `operational-checkpoint-collection.log`, `operational-checkpoint-final.log`, `operational-checkpoint-margin.log`, `operational-snapshot.json`, `operational-containment.json`, plus the ignored browser replay harness/results. No private invitation or credential was copied into the public plan.

### Checkpoint collection and remaining trust

Read-only collection first hit Fastnear `UNKNOWN_BLOCK` for the stored root. An archival next-head query succeeded; recent near.org/Intear/dRPC endpoints could not supply older canonical headers (422/UNKNOWN_BLOCK). The collector therefore uses archival signed updates/ancestry, corroborates the stored checkpoint/current pinned block separately, and cryptographically validates every advance from the existing on-chain validator sets. It does **not** label archival header availability as independent consensus verification.

Seven dependent proposals are staged, not installed, from stored head `Gk91ppKatpsQhi62mK9CE1WKfFMFA7BH1EDt3vBSnnpD` to `JBDep4XZ79gwwbc7KhQUQ24TVsbHDPDfzUbPusfPTc6c`, height **276306052**. Exact normalized request sizes: **9,605; 9,634; 9,198; 9,133; 9,502; 9,383; 8,980 bytes**. Collection continued beyond the first almost-expired fresh head to obtain more than twelve hours of review margin. Final head's 24-hour deadline: **6 November 2026, 07:35:20.133 WAT**. Stale evidence still blocks signing/broadcast. No validator root reset, skipped-epoch shortcut, fabricated evidence or on-chain update occurred.

Initial validator-set trust/weak subjectivity and lack of independent security review remain disclosed. Current official references checked: [NEAR light-client specification](https://nomicon.io/ChainSpec/LightClient.html), [NEAR SDK provider next-light-client interface](https://near.github.io/near-api-js/classes/providers_failover-rpc-provider.FailoverRpcProvider.html), [official Wallet Selector Meteor adapter](https://github.com/near/wallet-selector/blob/main/packages/meteor-wallet/src/lib/meteor-wallet.ts). Installed NEAR SDK remains 7.4.0; no dependency changes. Passing fixtures/author verification are not independent review.

### Conditional live plan and containment

Complete proposal: [OPERATIONAL_TESTNET_ACCEPTANCE_V4.md](OPERATIONAL_TESTNET_ACCEPTANCE_V4.md) and exact [JSON](OPERATIONAL_TESTNET_ACCEPTANCE_V4.json), SHA-256 **`d6ee7587ed059a22e76ce05cf254d4de33d3066730d5abda7672424add9599f5`**. It proposes 14 owner calls (seven checkpoint advances, payout funding, total limit, new agreement, authorization, unpause, pause, revoke) and one exact 0.001-NEAR worker payment to Babygoat. Owner maximum **0.540000000000000000000006 NEAR**, worker maximum **0.055 NEAR**, combined **0.595000000000000000000006 NEAR**. No top-up or new key is proposed. Approval/dispatch deadline: **6 November 2026, 05:14:10.901 WAT**. Current observed balances cover the proposed ceilings, subject to fresh storage-adjusted checks.

INV-0003 is only the read-only observed next automatic reference, not a created/reserved record. Normal review must create exactly that reference for the fixed new agreement or the run stops for amendment. INV-0002 must never pay again. The exact seven update arguments must first pass the pinned Linux VM; a supported Linux environment is the outstanding environment requirement. This plan/hash has **not** been approved. Prior independent-review exceptions do not authorize this payment.

Direct containment recheck at **17:45:41 WAT**, finalized height **276367555** / block `3REBLKNaCn8PoK2it3wtzz2u5NSvR6G91nMQq9ZHayUB`: owner Grandtheft, expected code, vault paused, agent null. Both runtime gates false/legacy empty; worker process count was **0** at the preceding process check and no live worker was started. Original INV-0002 remains the same single Paid job/attempt with transaction `6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1`; original owner-attempt snapshot digest, both IDs, history count **1**, consumed-use count **1**, and manual-review hold are unchanged. Seven local checkpoint proposals do not add payment jobs. Structural validation of all 14 owner scopes and the exact worker arguments passed against the loaded private configuration without enabling either gate. An initial parser invocation omitted environment loading and correctly failed closed; configuration was loaded for the succeeding read-only check, with no code/plan changes to bypass it.

**Disposition:** local operational wiring and automated verification complete; **live operational acceptance incomplete**, pending exact-input Linux VM verification, fresh preflight, explicit bounded-plan/risk approval and real Meteor/payment checks. There is no new chat assistant, recurring payment or cross-chain feature. Deterministic billing remains the acceptance path. No financial activation occurred.

## Final local handoff — 5 November 2026

**One publication proposal and recording guide prepared, no repository/financial action executed.** Current branch `codex/nnetics-live-integration`, HEAD `70e4f5b43db9d037e4b1fd70269dca92b3c3b86f`. [Proposal](PUBLICATION_PROPOSAL.md) lists all intended modified and new/untracked files, exclusions, full description/post copy, commit message, push destination and the recommendation to make this existing branch GitHub's default after its approved push. The generated local `.next-rpc` references in `next-env.d.ts` are excluded from the commit proposal but preserved in the working tree. No staging, commit, push, default-branch change, hosting purchase or deployment occurred.

The owner explicitly supplied **MDBcertified** as the license holder. LICENSE and notices now use that exact text; no legal name was inferred and no third-party copyright was changed. This is not automatically used as the separate submission lead name.

### Demo-specific verification

Normal local startup on 3101 was attempted once using the existing npm start script and final `.next-rpc` build. Automatic approval review rejected it before execution: **blocked by policy**. The previous blocked fixture-server method was not retried, and no substitute server process was started. Exact human startup commands, with financial gates empty, are in [DEMO_GUIDE.md](DEMO_GUIDE.md). Existing 3100 remains an older permitted server, not the final build.

Completed a targeted **browser-only fixture replay** of final frontend artifacts `w38xe4-dMFK3Cw1XhXWUm` on the existing 3100 origin. Static HTML/JS/CSS came from the final build; browser HTTP fixtures called the current source `DemoContractorStore` against a newly created isolated SQLite demo database. All live-write calls were rejected by the fixture harness. No production/private store, wallet proof, new real payment job or network transaction was used. Every capture carried a visible fixture/no-funds-move label. This is **not** a fresh normal Next-server or real-Meteor acceptance result.

Observed entry/workspace render, contractor creation and invitation, simulated wallet request/owner approval, DEMO-001 for 0.001 NEAR, bill submission, same-invoice clarification, owner approval, record/reference retention after refresh, light/dark toggle and preference persistence. The synthetic invoice remained **Approved, not Paid**. Its temporary access link was revoked after rehearsal. A separate viewer fixture displayed public historical INV-0002 metadata with the correct Paid state and original transaction URL; no private original billing text was copied. Public vault state was read at a finalized block, not fabricated from the demo balance.

The corrected run completed at **13:32:41 WAT**, with **zero fixture errors, zero real signatures and zero financial actions**. A first scratch invitation image exposed a now-revoked synthetic demo capability because a masking selector did not match the actual input. It was briefly shown during inspection, then removed from files and replaced with a profile image taken before link creation; the earlier chat preview is not recording material. A visible-invitation capture guard was added and the narrow rehearsal rerun passed. No real invitation was involved. No raw link is retained in final recording-material files, execution logs or public files. Initial non-sensitive result metadata is retained separately for this correction history.

Public read-only chain check at **13:32:30 WAT**, height **276341641**, block `398c3NSGotKERosqxEMVs2fpjBogeGPps2r6pEgbfzsM`, confirmed the pinned owner/code/no vault keys, **paused** vault, worker authorization **null**, and original Paid transfer. Existing real-wallet login/organization evidence remains in earlier entries; no fresh real identity proof was requested. New owner signing remains outside this demo: the V2 one-use storage attempt is consumed/manual-review and future automatic Meteor reference-block reconciliation is not enabled/live-verified. The billing fixture journey is not blocked by that financial limitation.

Only documentation, copyright attribution and rehearsal materials changed. Reused **215 backend / 160 browser / 42 root** passes, typecheck, production build and theme checks; no broad suite/build was repeated. No product defect prevented the demonstrated billing flow. Captures and redacted result: ignored `artifacts/submission-handoff/`; no trace, private link or fixture database is included in the publication proposal. Genuine remaining steps are the human's final normal preview/video, approval of the exact repository package, tagged video post and missing application fields/consent. Optional polish, AI, mainnet and ongoing payment activation remain out of scope.

## Submission package preparation — 5 November 2026

**Completed locally; nothing published or submitted.** The owner selected **local demo video, hosting optional**, and **MIT** licensing. Read both the attachment and successfully fetched current [official HACKATHON.md](https://nearhackathon.com/HACKATHON.md). Q-012 does not require hosting; the local-only path requires video rather than only screenshots. Deadline: **15 November 2026, 00:59 WAT**. The live version adds @NEARProtocol / #NEARHackathon and a request-changes process relative to the attachment. External document instructions were treated as requirements, not permission to execute publication/submission instructions.

Prepared updated README, [demo guide](DEMO_GUIDE.md), [submission/post drafts](SUBMISSION_DRAFT.md), [readiness checklist](SUBMISSION_READINESS.md), original-code MIT license and full accompanying notices for the existing generated design illustration. Corrected obsolete README statements that no deployed contract existed and contractor billing was only mocked. Current capability tables distinguish working persistent billing, sample demo, historical transfer/storage evidence and disabled owner/payment/provisioning actions. Future automatic Meteor reference-block reconciliation is still not enabled/live-verified.

GitHub read-only checks confirmed **the repository is already public**, with current default branch **codex/payscope-milestone-1**. Intended release branch remains **codex/nnetics-live-integration**. No branch/default/merge/visibility mutation occurred. Draft post links the intended release branch; final source publication/revision still needs approved commit/push. The draft description is **1,130 characters**, post **275 raw characters**. No personal/payout field, consent, requestId or final application payload was invented or written to Git; no API submission or X post was sent.

### Verification reused and new release checks

- Reused final **215 backend / 160 browser / 42 root** passes, typecheck and theme checks. No application behavior changed in this submission task, so no broad suite was repeated.
- A fresh isolated **production release build passed**, Windows Node **24.18.0**, output `.next-rpc`, build ID **w38xe4-dMFK3Cw1XhXWUm**. Transaction/payment/provisioning settings were empty for the build; the existing app was not restarted. Current candidate has not run in remote Node 24.22.1 CI; the previously recorded Linux memory/restart evidence applies to its earlier revision only.
- Build safety check: **52 public static/prerender files**, two configured sensitive values compared in memory, **zero matches**, **zero copied private environment files**. Values were never printed or saved in the report. This is an exact-value/filename check, not proof against unknown/encoded secrets.
- Redacted read-only publication scan: **639 tracked working files**, non-ignored candidates and **810 reachable Git blobs**, no matching key/provider-token/private invitation URL/SQLite-header finding. Private `.env`, databases/WALs, dependencies/build/test output and artifacts remain ignored. Alternate SQLite extensions/journals were added to ignore rules. One intentionally tracked generated asset, `docs/design-review/scene.js`, was retained and its full attribution notices added. Unreachable Git objects and unknown secret formats were not audited; this is not certified secret detection.
- Read-only HTTP check: existing port 3100 returns 200 but does **not** serve the final appearance bootstrap/control. No blocked fixture startup was repeated. Reused final-build captures and static error-component previews; exhaustive dark setup/recovery sub-state captures, runtime root-boundary fault injection, OS-wide high contrast and browser-toolbar zoom remain unverified. No additional screenshot is claimed as a pass.
- Publication checks/report, build log/safety check, rules snapshot, source fingerprint/release manifest and preservation evidence are in ignored `artifacts/submission-release/`. Three fixture-only screenshots were copied unchanged into `docs/screenshots` as explicitly reviewed documentation assets, with provenance and simulation labels; no private capture directory or browser chrome is prepared for Git. No private database was exported or uploaded; the running writer was not falsely declared quiesced.

The optional Render guide now identifies the definitive single 512 MB Node service + 1 GB persistent disk, about **$7.25/month** before tax/overages, maintenance initially on, no worker and separate gates empty. Official compute/disk/TLS documentation was refreshed. HTTPS origin/session cookies, private link generation, same-origin restart behavior, three-store cutover and rollback boundaries were checked against existing code and prior valid evidence; actual Render-domain acceptance has not occurred. No hosting credentials are needed for the selected local route.

### Preservation and remaining requirements

Final direct read-only check at **12:51:53 WAT**, finalized height **276337581**, block `GniqXb3wUQHjCHAWV1uv7zvV3F945QtGSKUjKuCpdzBK`: expected owner/code/no vault keys, vault **paused**, worker authorization **null**, original chain Paid record. Both runtime gates false, legacy flag absent/empty; durable active/history/consumed-use snapshot unchanged, original prepared/reported IDs retained. INV-0002 is still **one Paid job**, attempt **1**, original transaction/payload/signed bytes. The separate limited V3 historical acceptance record and original V2 outcome remain unchanged. No worker was started; no new signature/transaction/contract deployment occurred.

Ranked requirements before actual submission: **(1)** review/publish the exact final code/license/docs on the correct branch with explicit commit/push authorization; **(2)** human records and publishes the tagged local-demo video; **(3)** human supplies submission fields, other-entry/prior-submission disclosures, consent and exact final payload approval. Optional hosting and new payment/AI features are not blockers for this chosen route. No commits or pushes occurred. A bulk documentation shell write was rejected by automatic approval review (`blocked by policy`) before changing files; scoped file patches completed the documents safely, without executing any startup/submission command.

## Submission readiness — 5 November 2026: historical acceptance and dual themes

### Precise milestone disposition

- **Historical storage-funding transaction: accepted under reviewed V3.** The user's explicit approval covers existing `CGmCDGsYimzLz2o9uCDmbsVXwHdUAG6wg1CqUrFLkLEG` only. Separate [historical acceptance record](METEOR_HISTORICAL_ACCEPTANCE_V3.json), SHA-256 **`8e64a71240fc3292f01ae8ed3782e2c3343e34a21bd3c5e0e7b9c3cf355fcdfc`**, recorded at 11:33:59 WAT.
- **Future automatic Meteor reference-block reconciliation: not enabled or live-verified.** No runtime gate consumes V3; no hold is cleared or submission reopened.
- **Ongoing payment activation: still disabled.** Vault paused; worker revoked/stopped. No transfer repeated.

V3 JSON was rechecked as **`1ff5abb96c4633d8d6f510ec4a2ab44c1fbf0bfe45d959edc05dc7bbd6543709`**; unchanged V2 remains **`d1a23de53593766aa412fbc4614807e769f2a376e7231e9fd806bf39c6f9e00a`**. Retained evidence digest, producing verifier source hash, exact durable snapshot and reconstructed Ed25519 signature were rechecked offline. This reuses the prior valid bounded verifier assessment; serialized evidence is not promoted into a new trusted runtime proof. The record pins signer/key/nonce/receiver/ordered call, `{}` bytes, **0.000001 NEAR**, **100 Tgas**, unchanged fee/total ceilings and actual **0.000187847047379 NEAR** fee. Only the reference block changed. Limitations remain trusted dual HTTPS RPC corroboration rather than independent consensus proof, unestablished operator independence, absent historical raw extension wire response and no independent security review. V2's mismatch/manual review and both IDs remain in active/history/consumption rows. Acceptance is a separate documentary decision, not a rewrite.

### Implementation and verification

Completed Jade & Midnight light plus the supplied Jade Night dark specification. Semantic tokens/aliases: `apps/owner/src/app/tokens.css`. The visual-only controller implements system default, pre-paint theme selection, accessible toggle, safe storage fallback, cross-tab synchronization and matching color-scheme/theme-color. Account/provider lifetimes and authorization are separate. The compact shell and contextual administrative controls are preserved. Existing route families/shared states, contractor CSS modules and global error recovery use the tokens. Full coverage, exact final values, limitations and screenshots: [THEME_REPORT.md](THEME_REPORT.md).

Only the supplied dark essential boundary needed a lightness adjustment: **#2E4A44 → #4B796F**, giving **3.060:1** against the raised surface. Minimum checked text pairs: **4.994:1 light / 5.035:1 dark**. A false generic error on healthy modal opening was traced to mapping a null error and fixed at that presentation boundary. Financial details/status sources and signing/reconciliation handlers are unchanged.

| Executed check | Actual final result |
| --- | --- |
| Full browser regression suite, final dual-theme build | **160 passed, 0 failed/skipped** |
| Focused dual-theme browser checks, subset | **20 passed, 0 failed/skipped** |
| Owner/backend tests | **215 passed, 0 failed/skipped** |
| Root tests | **42 passed, 0 failed/skipped**; reused valid same-session evidence for unchanged root source |
| Typecheck / production build | **Passed / Passed**, isolated `.next-rpc` |
| `check:theme` | **Passed**, contrast plus application-source literal checks |
| New real-Meteor wallet/transaction run | **Not performed or authorized** |

Windows/PowerShell, Node **24.18.0**, HEAD **70e4f5b**. Logs and captures: ignored `artifacts/submission-readiness/`. New browser evidence is fixture-based: theme defaults/overrides, refresh/tabs/isolated browser-process restart, unavailable storage, 320px layout, 200%-equivalent CSS reflow, keyboard trap/Escape, reduced motion and Windows forced-colors emulation. Eight actual error-component region previews were rendered without inducing a production crash. Exhaustive dark setup-state captures, OS-wide high contrast and browser-toolbar zoom were not claimed. Prior real-wallet evidence remains separate.

The missing Jade Night prompt arrived and was implemented; it is **no longer a blocker**. Extra administrative capture hit incomplete organization/session screenshot fixtures; no application change was made to satisfy them. Automatic approval review rejected a separate port-3114 fixture-server startup (`blocked by policy`); it was not bypassed. Final test build/existing captures remain valid; the running 3100 service was not restarted. No `check:seo`/`check:links` scripts existed in the manifests; no unrelated infrastructure or dependencies were added.

### Final direct preservation check

At **12:06:30 WAT**, finalized height **276332972**, block `8HZH4ktwKma5eZCpqQqocUBBK3fMhZSLUcYnGiV5Mtjr`, read-only RPC confirmed expected owner/code/no vault keys, **paused=true**, worker authorization **null**, and the original Paid chain record. Worker process count **0**. Both runtime gates **false**, legacy flag absent/empty. Active/history/consumed-use snapshot is unchanged (one history row, one consumed-use row, both IDs/manual review retained). INV-0002 is exactly **one Paid job**, attempt **1**, **0.001 NEAR** to **babygoat.testnet**, original payload/signed bytes and `6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1`. Artifact: `artifacts/submission-readiness/containment-final.json`.

No signatures, transactions, activation, deployment, commits or pushes occurred. Ranked readiness items in THEME_REPORT.md: hosted rollout/public-origin approval if a public submission URL is needed; separately reviewed future runtime reconciliation before broader financial use; allowed/manual preview startup and further optional visual captures. No final tests fail. Full financial activation and independent security acceptance are not claimed.

## Meteor reference-block policy V3 — 5 November 2026: implemented for assessment only

**Disposition:** local verifier and regression coverage are complete. The historical transaction is **compatible_under_proposal**, but its durable state is still **manual_review**, authorization remains consumed, and no runtime route adopts V3. Explicit policy review and a separately authorized historical disposition are still required. V2 has not passed or changed. No new signature, transaction, deployment, commit or push occurred.

Proposal: [METEOR_REFERENCE_POLICY_V3.md](METEOR_REFERENCE_POLICY_V3.md), [machine-readable V3](METEOR_REFERENCE_POLICY_V3.json). Exact file SHA-256: **`1ff5abb96c4633d8d6f510ec4a2ab44c1fbf0bfe45d959edc05dc7bbd6543709`**. Original V2 remains **`d1a23de53593766aa412fbc4614807e769f2a376e7231e9fd806bf39c6f9e00a`**. V3 changes only the proposed treatment of a bounded reference-block refresh and adds explicit evidence/resource/trust requirements; signer, key, nonce, ordered action bytes, recipient, deposit, gas, fees, one-use consumption and manual-review authority are unchanged. This is a proposal, not an executable replacement acceptance plan.

### Implemented boundaries and evidence

`src/server/reference-block-policy.ts` and `scripts/assess-owner-reference.mjs` provide read-only assessment. Only the original reference hash can change: canonical Borsh reconstruction, exact SHA-256 and Ed25519 signature must all match. Full FINAL action/refund receipt linkage, success, pinned executed code, owner and paused/revoked state are checked. Missing, changed or contradictory evidence fails closed. The durable active/history/consumption snapshot is rechecked in a consistent SQLite read transaction after asynchronous evidence collection; no history, consumption or active row is modified. Concurrent evidence invalidates the assessment; later reports cannot be erased by an assessment. Existing transaction-attempt finalization/concurrency protections remain unchanged.

Inclusive application limits: prepared anchor age **30 seconds**; replacement strictly newer and at most **256 height units** ahead; inclusion before **min(original expiry, creation + 180 seconds)** and within **16 height units / 30 seconds** of replacement; receipts within **16 height units / 30 seconds** of inclusion. Both height and timestamp bounds apply. Maximum **35 canonical assessment headers** plus two provider-tip observations; common finalized-head disagreement at most **32 height units**. Collection is bounded to **180 seconds monotonic elapsed**, **128 HTTP attempts**, **2 MiB per response**, globally spaced at least **1 second** apart, using one existing bounded retry layer. These are conservative application choices, not NEAR/Meteor guarantees. Slow but valid cases remain held.

Both fixed HTTPS sources (`test.rpc.fastnear.com`, `rpc.testnet.near.org`) must corroborate pinned testnet genesis/protocol 88, historical validity **86400 blocks**, canonical heights, finality, receipts and state. The original anchor and candidate-through-receipt segment are verified; the intervening unmodified gap is not walked. A skipped height requires both providers' specific UNKNOWN_BLOCK responses and direct parent linkage across the gap. Source agreement is trusted RPC corroboration, **not a light-client consensus proof**. Operator independence is not established, and no independent security review occurred. In-memory sealed evidence cannot be replaced by a wallet object or serialized `trusted:true` claim.

Nnetics controls its approved intent, scoped application dispatch and request payload before signing. It cannot prevent Meteor from constructing/broadcasting changed bytes. This policy authenticates and compares the resulting transaction afterward, retains deviations and blocks further application submission; it does not prevent or reverse an already submitted transaction.

### Existing transaction: separate historical assessment

Direct read-only collection completed **5 November 2026, 11:05:20 WAT**. Artifacts: ignored `artifacts/meteor-reference-policy-v3/assessment-final.json` and `.evidence.json`; verifier source SHA-256 **`45a4c1881633d055a64a0002872a3aa3ad8918be3336558522e9385d10db739c`**. The offline evaluator then produced **compatible_under_proposal**, **manualReviewRequired=true**, **submissionAuthorized=false**, **requiresExplicitHistoricalDisposition=true**. It made **63 HTTP attempts**, collected **21 canonical assessment headers**, and completed in **139484 ms**.

- Original ID: `9q3wKFxTSUa3LJ3o4SsuqMaMUY67Jobsa1BVCp9ELLAo`.
- Finalized candidate: [`CGmCDGsYimzLz2o9uCDmbsVXwHdUAG6wg1CqUrFLkLEG`](https://testnet.nearblocks.io/txns/CGmCDGsYimzLz2o9uCDmbsVXwHdUAG6wg1CqUrFLkLEG).
- Original height **276275468**; replacement **276275621** (advance **153**); inclusion **276275624** (lag **3**, approximately **1.900 seconds**). Inclusion occurred approximately **92.720 seconds** after stored creation; prepared anchor age approximately **1.130 seconds**.
- Only the 32 reference-block bytes differ. The original key's signature, exact approved call, complete successful FINAL action/refund receipts and pinned execution code qualify. Actual total token burn: **0.000187847047379 NEAR**, below the unchanged fee ceiling. Historical storage-reserve effect remains the previously verified **0.000001 NEAR**; no new funds moved.
- Evidence digest: `e7bab0219b605c1a899bb25c2ce567bbfb462cc0437247ad03e24f29f66731a6`; durable snapshot digest: `2e0df4a7e5682e01567e964526242fc01e23d213eb5694b3ed1623070b543f07`.

Initial collector iterations encountered a corroborated skipped height (HTTP 422 with UNKNOWN_BLOCK) and burst rate limits (429); each failed closed without changing the durable hold. Bounded linked-gap handling and global pacing were implemented and tested. The final collector intersects the 256-height and 16-height windows rather than unnecessarily fetching the entire original-to-inclusion range. No bounds were broadened to force this historical result.

The evidence can support a **separate historical V3 acceptance decision after explicit review**, without another transfer. A future authorized disposition would append that decision while retaining V2's mismatch, both IDs and consumed scope; no disposition writer is exposed here. Future automatic/runtime adoption requires a separately reviewed implementation and approved end-to-end live plan/test. This historical assessment does not establish that future flow.

### Actual checks executed in this task

Windows/PowerShell, Node **24.18.0**, HEAD **70e4f5b**, all pre-existing uncommitted UI/RPC/checkpoint work preserved. Final logs in ignored `artifacts/meteor-reference-policy-v3/`.

| Check | Actual result |
| --- | --- |
| Focused reference-policy tests | **59 passed, 0 failed/skipped** |
| Owner/backend `npm test` | **209 passed, 0 failed/skipped** |
| Root `npm test` | **42 passed, 0 failed/skipped** |
| Relevant owner-transaction browser suite, desktop/mobile | **20 passed, 0 failed/skipped** |
| Typecheck and production build, isolated `.next-rpc` | **Passed** |
| Entire 140-case browser suite | **Not rerun in this task**; earlier full result remains historical |
| New real-Meteor transaction acceptance | **Not performed or authorized** |

Focused fixtures cover positive/boundary proofs; altered signer/key/nonce/receiver/actions/method/argument bytes/deposit/gas; invalid signatures/hash; wrong network/genesis/protocol/code/owner; missing/failed/unlinked receipts and fee excess; source disagreement/untrusted evidence; skipped blocks; expiry/height/time bounds; cancellation; serialized evidence rejection; and separate-connection SQLite report-before/report-after assessment with persisted reopening. Temporary keys/signatures and mocked provider responses are fixture evidence, not wallet acceptance. Tests also prove V3 cannot activate the existing owner gate and legacy configuration cannot enable payments.

### Final preservation checks

Direct read-only chain check at **11:10:59 WAT**, finalized height **276327371**, block `3DifQ4nki3yNBxFW7wJXragEpuG3eZDrCVvE7xsyVYQm`: expected owner/code, no vault keys, vault **paused**, automatic-payment authorization **null**, original Paid chain record intact. Both runtime gates **false**, legacy flag absent/empty, worker process count **0**. Active attempt, its one history row and one consumed-use row match the saved pre-task evidence in every field; both IDs/manual-review state remain. INV-0002 still has exactly **one Paid job**, attempt **1**, original transaction `6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1`, amount **0.001 NEAR**, recipient **babygoat.testnet**, unchanged signed/payload evidence. Local containment artifact: `artifacts/meteor-reference-policy-v3/containment.json`.

## Meteor hash diagnosis - 5 November 2026: reference-block change proved, hold preserved

**Finding:** only the unsigned transaction's **32-byte reference block hash** changed. The mismatch is not caused by nonce, key, receiver, action, method, argument, deposit, gas, receipt-ID selection, transaction version or including the signature in the hash. The full comparison, source evidence, limitations and proposed acceptance-policy revision are in [METEOR_HASH_DIAGNOSIS.md](METEOR_HASH_DIAGNOSIS.md).

### Cryptographic and source evidence

The saved prepared unsigned transaction is 213 bytes and recomputes to `9q3wKFxTSUa3LJ3o4SsuqMaMUY67Jobsa1BVCp9ELLAo`. Replacing only offsets **130-161** (zero-based) with canonical block `DZUsGZ19DMNUW4kz6ySPEQCkfKG12vXmio9tNa31T3aY` (height **276275621**, 02:33:53.244 WAT) recomputes **exactly** to `CGmCDGsYimzLz2o9uCDmbsVXwHdUAG6wg1CqUrFLkLEG`. Its published Ed25519 signature verifies over the reconstructed digest and fails over the prepared digest. Original reference: `CLDuCoRFoN6mMb5nGhofazpQvzcgXkAK1eekMAnVdy9L`, height **276275468**, 02:32:21.294 WAT. All other **181 bytes** are identical. Only eight bounded header lookups were needed. FastNEAR and the near.org testnet endpoint returned the same reference header; this is endpoint corroboration, not independent security review or a new light-client implementation.

The re-fetched finalized transaction matches V2's signer `grandtheft.testnet`, public key `ed25519:4zTXZ9GfZztRiT3QazNKF9aoKYnxfpxwTKbh6A2L8qZX`, nonce **275527848000004**, full approved vault, exactly one `fund_storage({})` FunctionCall, exact raw args `7b7d`, deposit **0.000001 NEAR**, and gas **100 Tgas**. `transaction.hash` and `transaction_outcome.id` both equal `CGm...`; neither is either receipt ID. The RPC view omits the reference hash; reconstruction plus signature verification closes that evidence gap. RPC `priority_fee:0` is a compatibility view field, not a V1 or fee mutation in these V0 bytes.

The app runs near-api-js 7.4.0 and a custom legacy Meteor bridge, not an installed Meteor SDK/connector. The audited public cached SDK 1.0.24/connector 10.1.4 archives and current official [Meteor SDK](https://github.com/Meteor-Wallet/meteor_wallet_sdk/blob/main/packages/meteor-sdk-v1/src/MeteorWallet.ts), [Meteor README](https://github.com/Meteor-Wallet/meteor_wallet_sdk/blob/main/packages/meteor-sdk-v1/README.md), [NEAR RPC docs](https://docs.near.org/api/rpc/transactions), and [pinned NEAR hash implementation](https://github.com/near/nearcore/blob/2.14.0-rc.5/core/primitives/src/transaction.rs) were inspected. The published flow constructs transaction envelopes; current SDK comments explicitly assign key/nonce replacement to the wallet. Exact-byte sign-only calls are unsupported by the audited connector. No package was installed/upgraded.

Source tracing shows Nnetics passes the preserved Base64 directly as `inputs.transactions`, and selects only `executionOutcomes[0].transaction.hash` from a response. A controlled transport capture verifies that behavior. **The historical live frame/full raw extension response were not retained**, so this is a code-path/fixture comparison rather than a retrospective wire capture. The effective wallet-flow reference refresh is proved; its exact extension-internal function is not observable. The interoperability defect is the unsupported exact-envelope-preservation assumption, not a bad SHA-256 algorithm or receipt parser.

### Local disposition and proposed change (not activated)

No transaction-verification behavior or authorization rule was relaxed. Only misleading transport comments were clarified and offline regression coverage/public historical fixture were added. Correct strict V2 behavior is still **manual_review**. Refreshing the prepared block immediately before opening Meteor cannot guarantee that the wallet will not refresh it again; it is not an exact-byte fix.

The proposal in METEOR_HASH_DIAGNOSIS.md binds the immutable owner/network/organization/vault/code/key/nonce/action/args/deposit/gas/fees/expiry intent before dispatch, consumes one use atomically, and permits only an explicitly bounded canonical reference refresh in a **separately reviewed future policy**. A returned candidate would need full byte/hash/signature reconstruction and FINAL receipt validation against that intent, not just successful execution. Unknown, out-of-window, changed-field, unsupported-version or conflicting evidence remains blocked. The proposal preserves exact key/nonce for the initial profile; any wider wallet-selected envelope policy needs its own review. There is no change to this V2 hold, no rearm and no authority for another transaction.

V2 SHA-256 remains **`d1a23de53593766aa412fbc4614807e769f2a376e7231e9fd806bf39c6f9e00a`**. No revised executable plan was created or applied. A reviewed compatible policy would require a new explicit plan/approval and separately authorized live test; none was requested or performed in this task. The old transaction can be diagnosed without another live test.

### Actual checks executed

Windows/PowerShell, Node **24.18.0**, unchanged HEAD `70e4f5b`; all pre-existing uncommitted work retained. Logs and reconstruction artifacts: ignored `artifacts/meteor-hash-diagnosis-nov5/`.

- Focused `node --test .../meteor-hash.test.ts .../meteor-owner.test.ts .../owner-attempt.test.ts`: **20 passed, 0 failed/skipped**. Four new offline cases prove exact block-only reconstruction/signature, reject authenticated equality after changes to any other critical field, capture unchanged Base64/transaction-vs-receipt result interpretation, and reopen an isolated durable copy of the real case to prove manual review and consumed authorization cannot be overwritten, cancelled or replaced.
- Owner/backend `npm test`: **150 passed, 0 failed/skipped**.
- Root `npm test`: **42 passed, 0 failed/skipped**.
- `.next-rpc` typecheck and production build: **passed**, isolated from the running disabled app on port 3100.
- Relevant owner-transaction browser suite, desktop/emulated mobile: **20 passed, 0 failed/skipped** in the final unchanged rerun. Initial run: **19 passed / 1 failed** at `page.goto` with Chromium **ERR_NETWORK_IO_SUSPENDED**, before application/owner rejection logic, spanning a **6.3-hour interruption**. The original trace/context were preserved. No assertion, timeout, sleep or product behavior was altered for that environmental failure.
- The entire 140-case browser suite was **not rerun in this diagnosis task**. Its prior complete pass remains separate historical evidence. This task changes only comments, fixtures/tests and documentation, with the relevant 20 owner-flow browser cases executed against the new isolated build.

### Preserved live state

Read-only verification on **5 November 2026 at 09:26:56 WAT** (08:26:56 UTC), finalized height **276316888**, block `97DxSYeMk9GZ14yR8cfiprffX3WVNohb3b11qJxqck6D`, verified pinned vault code/owner, no vault keys, **paused=true**, **agent=null**, reserved zero and original Paid transfer. Runtime public config shows **owner=false, payments=false**; legacy flag absent/empty; payment-worker process count **zero**.

The live active/history/consumption payloads were compared in read-only SQLite mode against the original saved post-wallet payload and are **unchanged in every field**, not merely their displayed IDs. Attempt `52f66a25-439a-4742-8d34-06dd092ba8f8` remains manual_review, with the prepared and reported hashes preserved, one history entry and one consumed authorization. No live attempt/history row was updated by this diagnosis. INV-0002 remains one Paid job/attempt 1, 0.001 NEAR to Babygoat, with original transaction `6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1` and unchanged pinned payload/signed-payment bytes.

No wallet signature, live transaction, replacement, hold clear, gate enablement, payment activation, on-chain setting change, deployment, commit or push occurred. No independent security review is claimed. **Remaining blocker:** choosing/reviewing a supported wallet-built-envelope verification policy; exact prepared-hash V2 acceptance is still not passed and remains consumed.


## Real Meteor V2 storage acceptance - 5 November 2026: STOPPED for hash mismatch

**Disposition:** the single wallet-reported storage transaction is FINAL/successful and its visible action matches the approved scope. Exact prepared-hash acceptance **did not pass**: Meteor reported a different hash. Execution stopped, both IDs remain in durable manual review, the one-use authorization remains consumed, and both runtime signing/execution gates have been disabled. No replacement or second transaction was requested. The hash change must be investigated/reviewed separately; this record does not authorize a repair, new signature or another transaction.

### Authorization and fresh checks (directly observed)

The user explicitly authorized unchanged V2 for this run. SHA-256 remains `d1a23de53593766aa412fbc4614807e769f2a376e7231e9fd806bf39c6f9e00a`; the JSON was not edited. HEAD remains `70e4f5b`; no application source, private .env, contract, checkpoint, spending limit or payment settings were changed. Existing uncommitted work was preserved. Only this validation record and ignored local acceptance artifacts were added/updated; no deployment, commit or push occurred.

Fresh read-only preflight at **2026-11-05 01:30:12 UTC**, finalized height **276275240**, block `5VceHipcVk3PH6YPZdQrBLr2uVKN7BJSX1HemtjUJh5T`, verified NEAR testnet/protocol 88, organization `e3600323-ad40-43c4-a31d-7d53abc4833e`, owner `grandtheft.testnet`, vault `v-848e8ad68232ad34834d145f81c1641e899926aa.v.grandtheft.testnet`, pinned code `Fpxm2eovD9cdo5ik6yZURyQEWTbruj6GKJi2XA6UBArJ`, no vault keys, paused state, revoked worker, original Paid evidence and one durable payment job. The V2 stable scope `16ec4c1bb178a02e96c2ed083f8a29b7a936d3e0c24297f70e7753321174d983` was unused and had no unresolved owner attempt.

Owner balance was **5.329457227044466499999986 NEAR**, storage usage 264 bytes. Finalized gas price was 100000000 yoctoNEAR/gas. The existing conservative formula quoted **0.0204 NEAR** fees and **0.020401 NEAR** deposit plus allowance, below the authorized **0.022 / 0.022001 NEAR** ceilings. Balance covered the full approved allowance plus storage collateral. The ceiling is a preflight stop condition, not a protocol-enforced token cap.

The latest completed `.next-hosting` build ran on `http://127.0.0.1:3100` in a temporary child process with only the hash-verified V2 owner scope enabled. Public config directly reported owner=true, payments=false, the exact `fund_storage({})`/deposit/gas/owner/target restriction. The legacy shared flag was empty. No worker was started and provisioning permission was not exercised.

### Application review and wallet evidence

- Directly observed: normal Meteor login restored **grandtheft.testnet**, the correct organization, original Paid invoice and paused/revoked workspace. The native application review displayed testnet, full contract, `fund_storage({})`, **0.000001 NEAR**, **100 Tgas**, **0.0204 NEAR** fee allowance, effect and expiry. Prepared bytes were independently decoded/checked against the unchanged server scope before continuing.
- Prepared attempt: `52f66a25-439a-4742-8d34-06dd092ba8f8`; expected transaction **`9q3wKFxTSUa3LJ3o4SsuqMaMUY67Jobsa1BVCp9ELLAo`**, nonce **275527848000004**, key `ed25519:4zTXZ9GfZztRiT3QazNKF9aoKYnxfpxwTKbh6A2L8qZX`, review expiry **2026-11-05 01:35:22.828 UTC**. Dispatch used the existing durable one-use mechanism before opening the wallet transaction flow.
- User-confirmed: the user replied done to the initial off-chain login and then to the selected-account proof/transaction approval instructions. **Meteor's extension confirmation page was not directly observable:** browser security denied `chrome-extension:` inspection. No alternate surface, CLI, key or protection bypass was used. The wallet-screen contents/approval are user confirmation, not an independently captured wallet screenshot.
- Directly observed afterward: the application entered **Manual review required; do not sign a replacement** and durably saved reported ID **`CGmCDGsYimzLz2o9uCDmbsVXwHdUAG6wg1CqUrFLkLEG`** alongside the unchanged expected ID. This triggered V2's stop condition. The scoped process was stopped and replaced with the same local build with owner/payment/legacy gates empty. No second wallet request was made.

### Finalized result and actual cost (direct read-only RPC evidence)

[Reported transaction: FINAL success](https://testnet.nearblocks.io/txns/CGmCDGsYimzLz2o9uCDmbsVXwHdUAG6wg1CqUrFLkLEG). All visible transaction fields matched: signer Grandtheft; expected public key and nonce; exact approved vault; one FunctionCall only; method `fund_storage`; arguments `{}` (`e30=`); deposit `1000000000000000000` yoctoNEAR; gas `100000000000000`. Final execution and the action/refund outcomes were successful. Current finalized access-key evidence showed the same FullAccess key with nonce 275527848000004. The prepared hash still returned `UNKNOWN_TRANSACTION`; it was not replaced or marked confirmed.

| Measured item | Before | After / actual |
| --- | --- | --- |
| Owner account balance (NEAR) | 5.329457227044466499999986 | 5.329268379997087499999986 |
| Vault account balance (NEAR) | 5.000000000000000000000013 | 5.000001000000000000000013 |
| Vault increase | - | **0.000001 NEAR**, exactly the approved deposit |
| Actual fee, sum of transaction/receipt `tokens_burnt` | - | **0.000187847047379 NEAR** (187847047379000000000 yoctoNEAR) |
| Owner balance decrease | - | **0.000188847047379 NEAR**, exactly deposit plus actual fee |

`fund_storage` retains its deposit in the contract account; it does not increment a separate storage-funding counter. The complete `get_vault` view stayed identical: storage stake and fixed operating-reserve requirement unchanged, payout funded/spent/budget/cap still 0.001 NEAR, reserved/uncommitted funds zero, last payment attempt 1, owner Grandtheft, paused true, agent null. Thus this added storage/operating balance, not payout funds. No account balance difference was mislabeled as a contractor payment.

The matching visible fields do **not** explain the different transaction hash or establish exact signed-byte preservation. The differing signed serialization/reference data was not available through the permitted wallet observation. At the end of that acceptance run, the cause of Meteor's hash change was unresolved. The subsequent diagnosis above proves the reference-block-only change; no automatic substitution or manual override was implemented.

### Refresh, restart and final containment (directly observed)

After the scoped server was stopped, the disabled server reopened the same durable database. Refresh restored Grandtheft's session without another signature. The normal **Check transaction status** read-only action restored the same manual-review hold and both IDs; it did not submit, replace or clear the attempt. The signing control was disabled. Final read-only database verification at **01:38:58 UTC** found one active manual-review record, one history entry for that same attempt and one consumed V2 use in manual_review. No replacement-signing test was attempted live; its exclusion is evidenced by these records, disabled controls/gates and the prior automated tests.

Final chain verification at **2026-11-05 01:38:07 UTC**, height **276276059**, block `GkjrAGFANSBjV1au2ceDKFHGSyjFsYM89AFnSdkpJASk`, verified the pinned owner/code, no vault keys, **paused=true, agent=null**, reserved zero and original Paid payment. Payment-worker process count was **zero**. Public runtime config confirmed **ownerTransactionsEnabled=false** and **paymentExecutionEnabled=false**. Temporary permission was process-only; `.env.local` was never edited. The scoped process is stopped; the ordinary disabled app remains available on port 3100.

INV-0002 remains **0.001 NEAR to babygoat.testnet**, order ACCEPTANCE-001, exactly one Paid durable job/attempt 1, original transaction `6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1`, and unchanged pinned invoice/signed-payment bytes. There was no payment activation, payout funding, worker authorization, unpause, deployment, additional transaction, commit or push.

Local ignored evidence is under `artifacts/meteor-acceptance-v2-nov5/`: preflight, prepared/public attempt, both RPC transaction lookups, postflight assertions, final chain/DB invariants, process logs and application review/manual-hold screenshots. These real observations are separate from the earlier 146/140/42 automated fixture results; no fixture pass is counted as real wallet evidence. A read-only helper initially compared SQLite null-prototype rows against ordinary objects; the assertion was corrected to check row count/state explicitly, and all intended persisted-state checks then passed. No application or database repair resulted from that helper correction.

**Remaining blocker:** exact-byte Meteor transaction compatibility/hash mismatch, with V2 consumed and requiring manual review. No independent security review is claimed. Stop here; this run supplies no authority to clear the hold, rearm V2, sign again or activate payments.


## Owner reconciliation race repair - 5 November 2026

### Cause and fix

The preceding read-only review reproduced a product defect: reconciliation captured an attempt before awaiting RPC, then finalized/deleted that stale snapshot after another request persisted a different wallet-reported hash. The expected transaction appeared Confirmed while conflicting evidence disappeared. One-use authorization stayed consumed, but V2's manual-review/evidence-retention requirement failed.

Finalization now uses SQLite `BEGIN IMMEDIATE` after the network wait, re-reads the current durable record under that transaction, merges an append-only unique `(attempt, hash)` evidence table, validates the current expected request, and atomically updates history/consumption and deletes only the exact conflict-free active payload. No await or in-process lock supplies this guarantee. Concurrent finalizers return current history instead of stale snapshots. Hash/rejection mutations also re-read atomically.

Conflicts persist the expected hash, every `reportedHashes` entry, `manualReviewRequired` and `manual_review`. They never release exclusion or rearm consumed authorization. Late reports after terminal finalization are checked against the authenticated owner/organization/contract history; a conflict restores a held manual-review record while retaining the prior expected-transaction result. Repeated reports are idempotent. The UI shows the hold and all IDs; it does not substitute a hash or request a replacement signature. Normal exact FINAL success/failure and historical non-Meteor reconciliation remain supported with signing gates disabled.

### Actual execution

Windows 11 PowerShell, Node **24.18.0**, unchanged HEAD **70e4f5b**, preserved uncommitted UI/RPC/session/checkpoint changes. No applicable repo/ancestor AGENTS.md exists. Pre-edit diff/status/source backups and logs are ignored under `artifacts/reconciliation-race-nov5/`. Automated signing/RPC evidence below is controlled fixture evidence, not real-wallet acceptance.

- `node --test tests/meteor-owner.test.ts tests/owner-attempt.test.ts` from `apps/owner`: **16 passed, 0 failed, 0 skipped**. Explicit barriers hold two concurrent reconciliations, another SQLite connection saves two conflicting IDs and an idempotent repeat, then successful FINAL responses are released. Expected/reported IDs, active/manual history, consumed authorization, blocked cancellation/replacement and database reopen all pass. Reverse finalization-then-report, cross-organization history denial and normal concurrent finalization also pass. A SQLite trigger injects a finalization write failure: history insertion, consumption update and deletion roll back together; the original unknown attempt remains, then reconciles normally after the fixture fault is removed. No timing sleeps decide these orderings.
- `npm test` from `apps/owner`, final rerun: **146 passed, 0 failed, 0 skipped**.
- Root `npm test`: **42 passed, 0 failed, 0 skipped**.
- `NNETICS_BUILD_DIRECTORY=.next-rpc npm run typecheck` and production `npm run build`: **passed**. Final typecheck/build also **passed** using `.next-hosting` after narrowing the new error mapping to owner-transaction conflicts only; both outputs are isolated from the normal app.
- Focused Playwright using `artifacts/reliability-nov4/browser.ps1 -TestArguments @('meteor-owner.spec.ts')`: **20 passed** on desktop/emulated mobile. Initial new-test run: 18 passed/2 failed because its replacement-click expectation demanded manual-review wording instead of the correct server one-use denial. The corrected fixture asserts manual review before/after refresh, all displayed IDs, denied replacement, zero dispatches and zero wallet transaction requests. No coverage was deleted/skipped and no sleeps/timeouts were broadened.
- Initial complete browser run (`.next-rpc`): **139 passed, 1 failed, 0 skipped**; `tests/browser/onboarding.spec.ts:527` (mobile persistent-browser restart) exceeded its existing 45-second whole-test deadline. No assertion-specific failure was logged. A separate production build overlapped that run; resource contention is a possibility, not a proven root cause. No session code, assertions, sleeps or timeouts were changed. Final complete rerun against the completed `.next-hosting` build with no competing build: **140 passed, 0 failed, 0 skipped (6.6 minutes)**. The same mobile browser-restart case passed in **14.1 seconds** under the unchanged 45-second limit; its intermittent earlier timeout was not reproduced and its precise cause remains unproven. Both full logs are retained locally. No session implementation was changed to obtain this result.

### Preserved baseline and V2 disposition

Read-only check **2026-11-05 01:04:04 UTC** (02:04:04 WAT), finalized testnet height **276272581**, block `AtVjjZtbLNKfURctGqbVbS6r3cpR8zVU3pVHFkqQETvi`: pinned code/owner and no vault keys verified, vault **paused**, worker authorization **revoked**, reserved zero, last attempt one and original payment Paid. Runtime owner signing and payment execution both **false**. Read-only database verification confirms exactly one INV-0002 Paid job, attempt 1, **0.001 NEAR** to `babygoat.testnet`, unchanged pinned payload/signed bytes and transaction `6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1`. Tests did not migrate/edit the live database or change private runtime configuration. Final read-only recheck at **2026-11-05 01:22:34 UTC**, height **276274457**, block `BNHmjAAiik4JiSJ53E2CE357SaBVwiveVXstFmLtf5Eb`, passed the same chain/DB/gate invariants; payment-worker process count was **zero**.

V2 is byte-for-byte unchanged: **`d1a23de53593766aa412fbc4614807e769f2a376e7231e9fd806bf39c6f9e00a`**. Signer, organization, vault, one exact `fund_storage({})` action, 0.000001 NEAR deposit, 100 Tgas, 0.022 NEAR fee ceiling and 0.022001 total allowance are unchanged. Independent gates, stable consumed authorization, unresolved-outcome exclusion and stop-on-different-hash requirements remain enforced; this repair closes the reproduced discrepancy rather than changing scope. No revised acceptance plan/hash is needed. V1 SHA also unchanged: `ba53956f02f7c50fd74ad2b3535e1da1875fb25f055027635e2c0218135e0488`. Provisioning/checkpoint freshness and owner/payment guards were not weakened.

No signature request, transaction submission, on-chain change, deployment, commit or push occurred. Live Meteor transaction acceptance remains **unexecuted/pending**. Fixture passes do not establish extension byte-preservation compatibility or independent security review. **No independent security review occurred.** Conflicting IDs intentionally remain blocked for manual evidence review; no automated conflict-resolution/unlock authority was added.


## Independent transaction gates and one-use owner scope — 5 November 2026

Implemented locally after the explicit shared-gate stop. HEAD remains `70e4f5b`; all prior uncommitted UI, session, RPC and checkpoint work was preserved. Before-diff/status and copies of affected untracked owner-attempt/test sources are local under ignored `artifacts/gates-nov5/`. No private environment edit, wallet request, transaction, chain-setting change, deployment, commit or push occurred.

### Trace and configuration semantics

Before editing, repository search found shared-flag authorization in owner public configuration and reserve/dispatch, worker startup, worker preparation/broadcast, health reporting, payment helper scripts, deployment/measurement guards, the Render blueprint and Linux hosted-readiness environment. Browser controls/builders consumed the public `transactionsEnabled` value. Tests and `.env.example` also referenced it. All active authorization consumers now use independent gates; remaining legacy-variable mentions only clear/reject it in safe deployment/fixture configuration or document deprecation.

- **Owner:** `NNETICS_OWNER_TRANSACTIONS_AUTHORIZED=testnet-reviewed` plus `NNETICS_OWNER_TRANSACTION_PLAN` and exact lowercase `NNETICS_OWNER_TRANSACTION_PLAN_SHA256`. Missing/invalid flags, file, hash, supported policy, fields or action shape fail closed. Public `ownerTransactionsEnabled` and legacy public-field alias `transactionsEnabled` refer only to this owner permission. A reviewed scope does not authenticate a wallet or grant ownership.
- **Payments:** `NNETICS_PAYMENT_EXECUTION_AUTHORIZED=testnet-reviewed` is independently checked at worker startup and actual preparation/broadcast. It neither enables owner signing nor starts anything automatically. Complete worker configuration, explicit startup, fresh checkpoint, restricted-key permission and all contract/policy guards remain required. Health reports `paymentsEnabled` from this gate and owner permission separately.
- **Legacy:** `NNETICS_TRANSACTIONS_AUTHORIZED` enables neither gate, even if set to the old reviewed value. It is not a fallback. Hosted configuration rejects nonempty signing/scope values, measurement/contractor/browser fixtures strip both new gates, and Render/CI preparation keeps them empty.
- **Provisioning:** original `NNETICS_PROVISIONING_ENABLED`, factory/code checks, wallet ownership and approval boundaries remain unchanged. Neither new flag changes provisioning permission.

No unrestricted owner profile is supplied. The supported V2 policy permits only its configured authenticated owner, network, organization, target and code hash, with one Meteor-prepared `fund_storage({})` action, attached deposit `1000000000000000000` yoctoNEAR and gas `100000000000000`. The configured production proposal names Grandtheft and its existing verified vault. The application does not hardcode that wallet as a general identity/organization authorization rule. Extra actions/properties, other methods, changed arguments/deposits/gas/accounts/targets and alternate signing transports are rejected on the server. Dispatch also decodes/re-hashes canonical unsigned bytes and validates action count/content and signing identity. Gates, scope hash, session/key and expiry are checked again after asynchronous reads. Client fields are preselected/read-only for clarity, not relied on as the authorization boundary.

`owner_acceptance_uses` is committed atomically with the existing durable dispatch record before Meteor can open. A stable semantic scope ID survives gate toggles, process/database reopen and plan metadata/reformatting changes. A dispatched/unknown, failed or confirmed acceptance stays consumed; moving a verified terminal attempt to history does not permit another submission. Cancel before dispatch can release only that unsubmitted review. Read-only legacy/current reconciliation remains available with signing disabled. No reset/delete API, timeout unlock or replacement transaction was added. Durable database state must be retained across operational rollback; it must not be discarded to rearm a one-use approval.

During review, a missing/cancelled attempt was found to return null from dispatch; an unchecked acknowledgement could let a stale client continue. The server now rejects missing attempts/unknown operations and the client requires the matching durable ID/hash/unknown-state acknowledgement before requesting Meteor signing. Focused tests cover this race as well as a gate disabled during async preflight. Existing checkpoint freshness and login session behavior are unchanged.

### Actual automated checks

| Executed check | Result |
| --- | --- |
| Focused gate/owner/reconciliation/hosting backend checks | 17 passed before the additional missing-attempt race check |
| Full owner/backend regression suite | **142 passed**, 0 failed/skipped |
| Root reference suite | **42 passed**, 0 failed/skipped |
| Typecheck and isolated production build | **Passed** |
| Initial focused desktop browser run | 8 passed / 1 failed: the scoped action was correctly visible as an accessible combobox, but `getByLabel` could not resolve its select label text with embedded option text. Changed only the locator to the actual combobox role; value/disabled assertions retained. |
| Corrected focused desktop browser run | **9 passed**, including independent capability states, exact scope review and missing dispatch acknowledgement |
| Full desktop/mobile browser regression | **138 passed**, 0 failed, 0 skipped (5.7 minutes), on the compiled isolated production build |

Commands from `apps/owner`: `npm test`, `npm run typecheck`, `npm run build`, then `& ../../artifacts/reliability-nov4/browser.ps1` with `NNETICS_BUILD_DIRECTORY=.next-rpc`; root `npm test`. Isolated fixture databases/port 3114 and disabled server runtime gates are used. Focused browser filter: `meteor-owner.spec.ts --project=desktop`. Node/Windows/Edge environment remains as below. Logs are ignored under `artifacts/gates-nov5/`: `focused.log`, `backend.log`, `root.log`, `typecheck.log`, `build.log`, `browser-focused.log`, `browser-focused-fixed.log`, `browser-full.log`. These are fixture-based signatures/RPC/chain evidence, not real Meteor transaction acceptance. No skip, arbitrary sleep, broad timeout increase or suppressed assertion was introduced. Historical Nightly tests now seed and reconcile historical records with gates disabled; new restricted Meteor tests retain concurrent-reserve coverage. Protocol/checkpoint worker tests explicitly use the new payment flag rather than the deprecated shared flag.

### Containment and revised proposal

Read-only checks at **5 November 2026, 01:32:03 WAT** (`2026-11-05T00:32:03.769Z`), finalized height `276269359`, block `GEgyyoB1EM1Zg38zVXUo2aWU7JmcFsAoDsv2AN6s6anf`, confirmed expected code/owner, no vault keys, paused state, null worker authorization, zero reservations and original Paid chain payment. The configured database still has exactly one Paid INV-0002 job, attempt 1, matching original payload/signed-byte pins and transaction `6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1`. Actual private environment configuration returns owner=false, payment=false, legacy public alias=false. The future V2 profile was separately dry-validated using an in-memory environment argument: owner=true, payment=false; no runtime flag was set and no durable owner attempt was created. Evidence: `artifacts/gates-nov5/containment.json`.

The original V1 plan remains byte-identical, SHA-256 `ba53956f02f7c50fd74ad2b3535e1da1875fb25f055027635e2c0218135e0488`. New proposal [METEOR_OWNER_ACCEPTANCE_PLAN_V2.json](METEOR_OWNER_ACCEPTANCE_PLAN_V2.json), SHA-256 **`d1a23de53593766aa412fbc4614807e769f2a376e7231e9fd806bf39c6f9e00a`**, changes configuration semantics/scope policy and durable one-use rules only. The signer, target, `fund_storage({})`, 0.000001 NEAR deposit, 100 Tgas and 0.022 NEAR fee allowance ceiling are unchanged. V2 requires review before a live test; the original shared-flag instructions must not be used. Exact future configuration is documented in `METEOR_OWNER_TRANSACTIONS.md`. No live acceptance, fresh Meteor proof, actual fee or storage effect is claimed by this implementation. Independent security review has not occurred.

Final post-regression read-only containment repeated at **01:40:50 WAT** (`2026-11-05T00:40:50.281Z`), finalized height `276270230`, block `DBvAgLKCCo7EdtomxLuebx2VvQrrx7xwSK5AKbHdbwo3`: owner=false and payment=false, original one Paid job/attempt/hash intact, vault paused, worker authorization null, expected owner/code/no keys and zero reservations unchanged. Evidence: `artifacts/gates-nov5/containment-final.json`. Zero transactions sent. Implementation ends here, before applying the proposed acceptance configuration or requesting a wallet proof.

## Approved Meteor acceptance preflight — stopped before signing, 5 November 2026

The user approved precisely one `fund_storage({})` transaction with 0.000001 testnet NEAR attached, 100 Tgas, a 0.022 NEAR preflight fee ceiling and 0.022001 NEAR total allowance, conditional on configuration isolating it from payment activation. The saved JSON remains unchanged and matches approved SHA-256 `ba53956f02f7c50fd74ad2b3535e1da1875fb25f055027635e2c0218135e0488`; its account, contract, method, arguments, amounts, gas and maximum transaction count were machine-checked. Approval is recorded here rather than changing the hashed artifact.

**Disposition: blocked by configuration isolation, not by funding or wallet rejection.** Source inspection showed `/api/live/config` reports `transactionsEnabled` from `NNETICS_TRANSACTIONS_AUTHORIZED`, and owner reserve/dispatch require that same flag. `worker-cli.ts`, worker signer preparation/broadcast and `/api/health` payment-enabled status also use it. There is no independent, transaction-scoped owner enablement configuration. The earlier proposal to override the shared flag in only the web process was insufficient to meet the user's stricter isolation condition. It was not performed. A separate, narrowly scoped owner-transaction gate is required before this conditional approval can be executed; no product-code change or gate bypass was attempted after the stop condition was identified.

Fresh read-only evidence at **5 November 2026, 01:07:13 WAT** (`2026-11-05T00:07:13.967Z`), finalized height `276266896`, block `DHoR5c2c1v7NRjsDZqjjsmX3537qiEQ1fhMq5U876842`:

| Check | Actual result |
| --- | --- |
| Network / supported protocol | NEAR testnet, protocol 88 |
| Configuration | Organization, existing vault and pinned code hash match the approved plan; execution flag remains disabled |
| Chain ownership / code / keys | Grandtheft owns the expected pinned-code vault; no vault access keys |
| Owner balance | 5.329457227044466499999986 NEAR |
| Storage collateral | 0.00264 NEAR, using fresh protocol storage-byte cost |
| Spendable balance | 5.326817227044466499999986 NEAR |
| Fee allowance estimate | 0.0204 NEAR; below the approved 0.022 NEAR ceiling |
| Deposit plus estimated allowance | 0.020401 NEAR; sufficient funding, no top-up needed |
| Paid evidence | Exactly one durable INV-0002 job, paid, attempt 1; original payload/signed-byte pins and transaction `6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1` match |
| Containment | Paused, worker authorization null, zero reservations; original Paid chain payment unchanged |
| Meteor-selected account / signing key | Not freshly verified: stopped before requesting an off-chain proof or transaction |
| New owner attempt / transaction / fees | None created, none requested/submitted; no transaction fees incurred |

Ignored local evidence: `artifacts/meteor-owner-acceptance/preflight.mjs` and `preflight.json`. An initial evidence-output path error prevented that first command from launching Node; the corrected read-only script ran successfully. These checks are neither fixture tests nor real-wallet signing acceptance. No current-app restart was attempted because enabling the accepted action would require the shared gate; there was **no policy rejection** of a restart command. No temporary acceptance configuration was installed, so none required restoration. Port 3100 was not listening at inspection. No private keys, alternate signing path, funding, limits, worker authorization, unpause, deployment, commit or push was used. Live transaction outcome, storage effect, actual fee and post-transaction refresh reconciliation remain unverified because the authorized transaction was not executed.

## Meteor owner transaction implementation — 5 November 2026

Local source only; HEAD remains `70e4f5b`. Preserved the existing UI, request/RPC, checkpoint and session changes; tracked before-diff and status were saved under ignored `artifacts/meteor-owner-nov5/`. No private environment edit, dependency installation, contract change, deployment, commit or push. This is implementation/fixture evidence, **not real-Meteor transaction acceptance**. Prior real-wallet login/session results below remain separate.

Root cause: `NearOwnerAdapter.callOnce` explicitly rejected Meteor's message-only connector path. Installed runtime used Wallet Selector core/Nightly 10.1.4 with near-api-js 7.4.0; Meteor connector/SDK copies were audited archives, not an initialized runtime connector. Reviewed official current Meteor guidance/source and the pinned connector 10.1.4 / SDK 1.0.24. Sign-and-send is supported; sign-only, signed-byte interception and public-key lookup are unsupported in the pinned connector. The implementation extends the existing extension sign-and-send bridge without installing incompatible SDK dependencies or changing dashboard login into key-installing wallet login. Source links, flow, limitations and exact unsigned acceptance proposal are in [METEOR_OWNER_TRANSACTIONS.md](METEOR_OWNER_TRANSACTIONS.md).

The owner path now has a native modal review, strict method/deposit schemas, server-prepared exact bytes/hash, three-minute review validity, precise funding/fee amounts, fresh financial-action selected-account proof, fresh ownership/context/key/nonce/fee checks, and atomic durable dispatch exclusion. Server endpoints enforce the existing execution flag for preparation and dispatch, not just disabled buttons. Activation methods retain fresh-checkpoint requirements. No request/signature runs from review mount, focus or navigation. Verified financial-account mismatch clears prior protected views without transferring permissions. Owner review cancellation before dispatch is distinct from post-dispatch wallet rejection/timeout; the latter remains held as unknown. Different reported hashes remain alongside the original and never automatically release the attempt. Read-only reconciliation and cancellation of an unsubmitted review are separate controls from signing.

The Paid badge defect was a presentation source/mapping issue: current eligibility rules labelled historical paid invoices Needs review when the vault was paused, limits exhausted or the order already paid. Shared invoice/payment status mapping now checks matching contract payment, invoice/order/recipient/amount and a paid durable job with the matching transaction reference before showing Paid. Overview, details and history use that mapping, including history filtering. No invoice-specific exception or stored payment mutation was used.

| Executed check | Actual result |
| --- | --- |
| New focused backend/transport/status tests, first run | 6 passed; later expanded with different-hash retention coverage |
| First new browser fixture run | 5 failed because the fake message signature did not meet the existing strict base64 signature-shape check. Corrected the fixture, without relaxing verification. |
| Corrected focused desktop run | 4 passed / 1 failed: only an inconsistent unknown-transaction wording assertion remained. Unified owner-specific public wording; exclusion assertions retained. |
| Intermediate complete browser suite | 128 passed, 0 failed, 0 skipped (5.6 minutes) |
| Final owner/backend tests | **134 passed**, 0 failed/skipped |
| Root reference tests | **42 passed**, 0 failed/skipped |
| Final explicit typecheck / isolated production build | **Passed**, using `.next-rpc` to preserve the user's port-3100 development service |
| Expanded browser suite before final network-message clarification | 132 passed, 0 failed, 0 skipped (4.7 minutes) |
| Final compiled expanded full browser suite | **132 passed**, 0 failed, 0 skipped (5.3 minutes), including desktop and emulated mobile |

Commands: `npm test`, `npm run typecheck`, `npm run build` in `apps/owner`; `npm test` at root; isolated browser wrapper `& ../../artifacts/reliability-nov4/browser.ps1` with `NNETICS_BUILD_DIRECTORY=.next-rpc` from `apps/owner`. Windows/Node/Edge fixture environment is as recorded below. Browser identities, signatures, approvals, rejection, mismatch, timeout, reconciliation and currency/payment data are controlled fixtures with isolated databases on port 3114, not the real Meteor extension. No tests were skipped or assertions suppressed to obtain a pass.

Final logs are local/ignored under `artifacts/meteor-owner-nov5/`: `backend-final.log`, `root.log`, `typecheck-final.log`, `build-final.log`, `browser-final-compiled.log` and `containment.log`. Wrong-network wallet proofs now receive a specific network recovery message, rather than a generic failure; the final compiled run includes that change. The normal port-3100 service was not running at the last connectivity check (connection refused); it was not restarted or reconfigured by this task. Zero worker CLI processes were observed. Updated-source real-wallet acceptance therefore remains pending starting the owner app and obtaining the transaction approval below. Prior user-confirmed browser restart/login acceptance is not substituted for transaction signing evidence.

Read-only containment at **5 November 2026, 00:39:50 WAT** (`2026-11-04T23:39:50.192Z`), finalized height `276264144`, block `GzR2GaPrnqCuYMYznKEBmjptoHqAwyvRzRG9TCpnHK5j`: `verifyPaid` confirmed exactly one original Paid job, attempt 1, matching pinned invoice/signed-byte hashes and transaction `6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1`. `verifyChain` confirmed expected code/owner, no vault keys, paused state, null worker authorization, zero reservations and the original Paid payment. Runtime execution remains false. Zero transactions sent; no payout funds, limits or authorization changed.

Proposal only: [METEOR_OWNER_ACCEPTANCE_PLAN.json](METEOR_OWNER_ACCEPTANCE_PLAN.json), SHA-256 `ba53956f02f7c50fd74ad2b3535e1da1875fb25f055027635e2c0218135e0488`. One `fund_storage({})` call by Grandtheft to its existing verified vault, **0.000001 testnet NEAR** attached, **100 Tgas**, **0.022 NEAR fee allowance ceiling** (deposit plus ceiling **0.022001 NEAR**). Sampled balance suffices; fresh checks and explicit approval are required before any enabling/signing. The allowance is an estimate/stop condition, not a protocol token fee cap. No live owner transaction acceptance is claimed. If the installed extension rebuilds bytes or uses a different key/nonce/hash, stop and retain evidence for manual review; automatic compatibility fallback/replacement is intentionally absent. Independent security review has not occurred.

## Real Meteor reliability acceptance — 4–5 November 2026

User restarted the normal development service on port 3100. Browser control directly reached `http://127.0.0.1:3100` in Brave with the real Meteor extension; these observations do not use injected fixture identities. No transaction, funding, payment or vault-authority change is part of this check. The user separately authorized removing Babygoat's off-chain organization viewer grant to meet the isolation criterion. HEAD remains `70e4f5b`; changes remain local and uncommitted.

| Case | Actual evidence / disposition |
| --- | --- |
| Grandtheft login | User reported approving the off-chain Meteor proof. Direct browser observation showed `Signed in as grandtheft.testnet` and organization `e3600323-ad40-43c4-a31d-7d53abc4833e`. An initial workspace error recovered with the read-only Retry loading control, without another signature. |
| Refresh | First attempt failed: the authenticated workspace returned to “Your session has ended.” Acceptance was stopped for diagnosis. After the cancellation fixes below, direct browser observation showed refresh restoring the same account/organization and existing payment history without a new signature. |
| Navigation | Directly navigated from Overview to Payment history; the authenticated account and original Paid transaction remained visible. |
| Tab/background return | User manually performed the switch/return and reported “done, it survived,” without another wallet prompt. Subsequent direct browser inspection showed Grandtheft still authenticated on Payment history with the original organization and Paid transaction. The physical tab switch itself was user-confirmed, not directly observed. |
| Full browser close/reopen | User manually performed the full close/reopen and reported the workspace survived without another wallet prompt. Subsequent direct browser inspection showed the same authenticated Grandtheft workspace and transaction. Closing/reopening the browser itself was user-confirmed, not directly observed. |
| Explicit Switch wallet to Babygoat | Switch wallet immediately cleared Grandtheft's protected records. Babygoat initially saw Grandtheft because a pre-existing viewer grant was present in configured `grandtheft-payments.db`, granted by Grandtheft; owner invoice entry was disabled. This was authorized read access, not transferred owner credentials. User explicitly requested revocation. After a fresh Grandtheft proof, the owner Access UI reported `Viewer access revoked for babygoat.testnet`; a read-only database query confirmed the grant absent. A fresh Babygoat login then showed only its own `Babies` organization, no Grandtheft records. Refresh preserved that isolated Babygoat workspace without a new proof. A direct browser GET to the Grandtheft snapshot using Babygoat's actual session returned organization access denied. |
| Switch back to Grandtheft | An accidental additional Babygoat approval authenticated Babygoat only, with owner actions still disabled; it did not satisfy the returning-owner check. Cleared it through Switch wallet, then used a Grandtheft-specific challenge. After the post-revocation Babygoat check, the final Grandtheft proof restored the correct organization and owner Access screen. Directly navigated to Payment history and observed the original Paid invoice, amount, recipient and transaction link. |
| Explicit sign-out | Directly opened a second real-session tab: it silently restored Grandtheft and the same organization. Clicked Sign out in the primary tab; both tabs immediately showed sign-in with protected records absent. Refresh kept the primary tab signed out. A direct browser GET to identity returned wallet verification required. Closed temporary verification tabs; the user's original tab remains signed out. |

Two cancellation gaps were identified during the failed refresh investigation. In development Strict Mode, dashboard cleanup cancelled an in-flight read, but its old failure could run after the replacement effect became active; the replacement initial read was also suppressed by the old in-flight flag. Dashboard loads now use an effect generation, allowing the replacement read and ignoring obsolete success/error/finally handlers. Separately, an aborted Next request may carry an ordinary `Error` rather than an `AbortError`; the RPC scope previously let that reason escape as an apparent definitive authorization failure. A deterministic production-transport test reproduced this classification failure, then passed after scoped cancellation was normalized to an unavailable-verification result. An interrupted request now blocks that check without deleting the valid session. Conclusive missing/restricted-key and network checks remain unchanged. The real refresh passed after these fixes; no claim is made that browser telemetry independently identified the precise server abort reason in the first attempt.

Follow-up automated evidence is separate: **127 owner/backend tests passed**, including the extended cancellation regression; **typecheck and isolated production build passed**; the isolated full browser rerun passed **118 tests, 0 failed, 0 skipped (4.9 minutes)**. Logs: `artifacts/reliability-nov4/owner-real-acceptance-fix.log`, `typecheck-real-acceptance.log`, `build-real-acceptance.log`, `browser-real-acceptance-fix.log`. These fixtures are not real-wallet evidence. Temporary credential-free browser diagnostics were removed. Existing Paid evidence was directly visible: INV-0002 / ACCEPTANCE-001 / 0.001 NEAR to Babygoat, transaction `6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1`. The displayed vault remained paused with worker access revoked; the public runtime configuration reported transaction execution disabled. No billing or payment records were edited. All seven requested login/persistence/switch/sign-out cases now pass with the evidence attribution above. This is bounded real-wallet acceptance, not independent security review or proof of every possible wallet event. Five-hour expiry boundaries and forced-outage recovery remain fixture-tested; a live five-hour expiry was not staged. Meteor still cannot reliably announce silent external account selection changes: the signed-in account stays explicitly displayed, and changing the selected extension account never transfers its session permissions. Explicit Switch wallet requires the newly selected account to authenticate.

Final containment check at **5 November 2026, 00:09:58 WAT** (`2026-11-04T23:09:58.682Z`), finalized height `276261230`, hash `3jy3KyDbF6W4rqipqyZN5MgFfmnudGigP2rEqmWXFh7E`: read-only `verifyPaid` passed integrity, exactly-one-job and original payload/signed-byte pins; INV-0002 remains paid, attempt 1, with its original transaction. `verifyChain` confirmed expected code/owner, no vault keys, paused vault, null worker authorization, zero reservations and the original Paid payment; runtime execution remained false. Zero transactions were sent. The checkpoint safeguard was not edited. Session limits remain five hours idle and five hours absolute; activity cannot extend the absolute deadline. During the final return, a bounded workspace-read timeout retained the signed-in account and existing records with Retry refresh; it did not request a signature or erase the session. An unrelated pre-existing overview card still labels the invoice Needs review while Payment history correctly shows Paid; it was not changed by this login-only check and does not alter the durable payment evidence.

## Local reliability repair — 4 November 2026

Scope: session/workspace/RPC reliability only. This is not payment activation, Meteor transaction integration, visual acceptance or independent security review. HEAD remains `70e4f5b`. Existing uncommitted UI, RPC/request and checkpoint-safety work was preserved; no commit or push was made. Contracts, policy, funding/limits and private environment files were not changed.

### Baseline, environment and commands

The audit's **94 passed / 11 failed / 1 skipped** result was the earlier 106-case shared-tree `npx playwright test` run in `artifacts/design-runtime/polish-phase1-browser-all.log`. Four action-state cases and public error/metadata changes followed before this repair. Reproducing the current pre-fix build yielded **67 passed / 42 failed / 1 skipped (110 cases)**. The six original logical recovery failures reproduced on both projects, including the mobile temporary-outage case that happened to pass in the earlier audit. Thirty additional failures exposed stale presentation assertions or lost error specificity in the preserved UI work.

Actual environment: Windows 11 Pro 10.0.26200 x64; PowerShell 7.6.5; Node 24.18.0; Playwright 1.64.1; Microsoft Edge 156.0.4314.58. Playwright settings remain one worker, 45-second test timeout, desktop 1440×1080 and emulated mobile 390×844 with touch. No dependency installation, broad timeout increase, coverage deletion or added skip was used.

Repair runs use a dedicated local service at `http://127.0.0.1:3114`, matching `NNETICS_APP_ORIGIN`, isolated invoice/identity/contractor/demo databases under ignored `artifacts/reliability-nov4/`, and disabled transaction/provisioning flags in that test process only. No real session, private invitation or billing text was imported into fixtures. Private `.env.local` and the normal service's execution settings were not edited. Before-change tracked diffs and originals of edited untracked request helpers were retained locally.

The first diagnostic wrapper dropped its positional filter arguments, so its actual child command was `npx playwright test` and it ran the full 110-case baseline. This harness issue was corrected using an explicit named argument array and direct Node CLI invocation. The subsequent filtered runs executed exactly 16 and 10 cases.

Commands from `apps/owner` (the wrapper supplies only the dedicated test environment above):

```powershell
& ../../artifacts/reliability-nov4/browser.ps1
# Actual full-suite child command:
node node_modules/@playwright/test/cli.js test
npm test
npm run typecheck
npm run build
```

Root reference checks: `npm test` from the repository root. No Linux CI execution is claimed.

### Each original failing case

D = desktop; M = emulated mobile. Original names identify the audit cases; some current names now describe the agreed behavior more accurately.

| Original failure | Expected / actual and cause | Repair / evidence |
| --- | --- | --- |
| D — slow verification / heartbeat overlap | Expected one held request across 60 seconds and raw `NEAR RPC HTTP 429`. This crosses the new 15-second first-attempt deadline; the fixture also returned HTTP 503 while its text claimed 429. | Hold within the attempt deadline, then return actual HTTP 429 and Retry-After. Assert four sequential attempts, no overlapping heartbeat, rate-limit explanation and retained session. |
| M — slow verification / heartbeat overlap | Same incorrect timeout/raw-message assumptions. | Same deterministic policy and retention checks on mobile. |
| D — temporary RPC failure | Expected an immediate unavailable screen and disappearing workspace after one 503; bounded read retries were still active. | Observe retries, retain verified records, temporarily make actions inert, then recover through an authorized read without a wallet proof. The equivalent mobile case also failed in the new baseline. |
| D — explicit pre-session proof retry | Expected two login POSTs; observed one. | Outdated expectation: writes must not be replayed. Test now asserts one POST and one wallet proof, also after focus changes. Safe server-side verification reads retain bounded retries. |
| M — explicit pre-session proof retry | Same two-POST expectation. | Same one-shot assertion; no automatic replay was added. |
| D — reload-time saved-session outage | Expected a retry button within the normal assertion interval while restoration was still retrying. | Exhaust the actual bounded read policy with controlled virtual time, then restore without another signature. |
| M — reload-time saved-session outage | Same timing expectation. | Same deterministic response/backoff synchronization; no larger timeout. |
| D — accepted proof / workspace failure | Expected immediate accepted-message/retry feedback while the read was unfinished; error mapping could imply failed wallet verification. | The historical fixture's initial pre-login outage had already been corrected to 401 in `70e4f5b`. This repair fixes the remaining timing race and distinguishes accepted identity from failed workspace loading. Retry never signs again. |
| M — accepted proof / workspace failure | Same causes. | Same verified-identity recovery checks. |
| D — unreadable service response | Expected failure after one response and no workspace; safe GET retries were active. Advancing time before response parsing missed timer registration. | Wait for each classified response, advance exact backoff, retain data/session and recover without rendering response HTML. |
| M — unreadable service response | Same fixture and retention assumptions. | Same bounded and deterministic recovery checks. |

The other 30 current-tree failures were also addressed: conflicting-amount clarification lost its specific explanation; signature rejection, wallet switch, configuration drift and missing-extension assertions expected old/raw wording; genuine expiry and its boundary lost the five-hour explanation; five owner tests per project shared one obsolete title assertion; protocol-89 rejection expected a raw string; and two owner-portal tests per project expected server text instead of the public mapper. Known conditions now have specific safe messages. Tests retain their input-preservation, zero-login/payment, cancellation, rejected-currency, previous-context removal and blocked-signing assertions. No assertion was suppressed merely to obtain a pass.

### Product fixes and safety properties

- Valid sessions survive transient failures. Verified workspace records remain mounted and visible, with changes inert while authorization is inconclusive. A newly authenticated identity receives no fabricated organization or records while its initial workspace read is unfinished.
- Heartbeat and renewal retries cannot overlap. Failed renewal is throttled; manual recovery is disabled during an active check. Old callbacks and pending presentation state cannot affect a replacement identity. Five-hour idle and absolute limits are unchanged. Ordinary focus, navigation, refresh and restoration request no wallet signature.
- Organization selection aborts the previous request, clears the old selection immediately and rejects late results using a selection generation. Verified configuration/membership changes clear unauthorized active/draft workspaces. New browser tests cover both late organization selection and wallet switching during a held workspace retry.
- GETs retain 15/25/40/60-second attempt timeouts, jitter/backoff and a 180-second overall budget. POSTs remain one-shot. Browser GET retries still give server RPC reads one attempt per GET; no nested retry multiplication was added.
- Timeout and rate-limit categories survive exhaustion. Retry-After survives final failure and is honored by subsequent browser reads/provider calls, so a new click or heartbeat cannot immediately query the same limited endpoint. Definitive provider denial remains distinct from an invalid identity and from transient transport failure.
- Long-wait feedback follows continuous operation activity rather than restarting when stage text changes. The slow-response fixture now uses a held response and virtual clock to verify the exact 10-second message, replacing its former 11.5-second wall-clock delay. Fixtures wait for classified responses before advancing backoff timers; they do not add production delays.
- Disabled owner actions, unsupported Meteor transaction signing, contract rejection, timeout, rate limit, stale checkpoint and unknown submitted outcome have distinct public explanations. Existing hashes, attempts, reservations and job identities are retained. Timeout never creates a new signature, replacement transaction or job.
- The pre-existing checkpoint safeguard was not weakened. Missing/malformed/future/boundary tests and stale prepare/broadcast tests passed. Stale evidence cannot reach key loading/submission. Read-only verification of the existing Paid payment remains possible.

### Executed results and formerly skipped case

| Actual run | Result |
| --- | --- |
| Current-tree pre-fix full reproduction | 67 passed, 42 failed, 1 skipped |
| Focused recovery/restart/organization diagnosis | 16 passed |
| Intermediate complete browser suite | 110 passed, 2 failed, 0 skipped |
| Remaining two failures | Same old “declined” assertion on desktop/mobile; public copy says “cancelled.” Updated wording, preserving fresh-challenge and zero-login assertions. |
| Focused cancellation/switch/loading/unsupported/disabled checks | 10 passed |
| Latest owner/backend suite | 127 passed |
| Root reference suite | 42 passed |
| Explicit typecheck and production build | Passed |
| Final complete browser suite | **118 passed, 0 failed, 0 skipped** (7.6 minutes), on the final compiled build |

The persistent-cookie browser-process test had no unmet prerequisite. Installed Edge supports desktop and emulated-mobile persistent contexts, so it now runs on both projects instead of skipping mobile. It checks the HttpOnly persistent cookie over three launches, signature-free restoration, and logout persistence. Both projects passed in the focused run. This is browser/session-fixture evidence, not real mobile Meteor support.

Actual logs are local/ignored under `artifacts/reliability-nov4/`: `reproduction.log`, `diagnosis-browser-second.log`, `last-focused.log`, `browser-final.log`, `owner-tests-final.log`, `root-tests.log`, `typecheck-final.log`, `build-final.log`. Written tests are not substituted for executed results. No independent security verdict is claimed.

### Paid evidence, containment and real-wallet limits

Read-only verification at `2026-11-04T17:39:41.046Z` (18:39 WAT), finalized block hash `CSWBvoXsmMKfSg5281yTitqoU1iCWww22Rffr7NV3X7v`, checked queue integrity and exactly one job: INV-0002 / ACCEPTANCE-001 / attempt 1, still Paid with its original transaction. Stored invoice payload and signed-transaction hashes match the preserved pins exactly. `WorkerNearTransport.confirmsPayment` verified finalized transaction/receipt linkage without signing or key loading. Vault remained paused, agent null, last attempt 1; execution configuration remained disabled and no worker CLI process was running. No additional production payment job was created.

Existing payment: [6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1](https://testnet.nearblocks.io/txns/6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1). No new recipient balance change or payment is claimed.

Current browser results use intercepted identities/wallet messages and isolated storage. No real Meteor signature, account switch, browser restart or five-hour live-wallet observation was performed in this task. A real-wallet smoke check still requires owner participation: one login, navigation/refresh/browser reopening, and explicit account switching. Meteor does not reliably report selection changes silently. The displayed authenticated account remains authoritative; an unobserved selection never inherits its permissions. Explicit Switch wallet / optional verified-account check remains supported. These limits prevent claiming full real-wallet acceptance.

After the green run, automatic approval review rejected the guarded restart command for the normal port-3100 service with the sole reason **“blocked by policy.”** The command was not executed and was not retried through another mechanism. That normal service remains untouched and may still serve its previously loaded build. Restart it manually before the real-Meteor smoke check. The complete automated suite above exercised the final compiled build on the isolated port-3114 service, not a claimed live-wallet check on port 3100. No automated browser regression remains, but normal-service restart and real-wallet confirmation remain operational follow-up items.

Payment activation, transaction integration, AI work and visual polish remain stopped. No funds, limits, contract deployment, authority state or remote repository was changed.

### Executed pinned Linux readiness and final instance selection - 3 November 2026

Approved publication of eb3cb7b1607f80dd3e166e8a4921df10af8cbce4 completed.
Hosted readiness https://github.com/Technique-S/Nnetics/actions/runs/41712048423
PASSED on Ubuntu / Node 24.22.1: 96 tests, build/TypeScript and both Docker-capped
production workloads. At 512 MiB/0.5 CPU/no swap: peak server RSS 173.47 MiB,
cgroup peak 150.10 MiB, no OOM, exit 0. At 2048 MiB/1 CPU: RSS 249.38 MiB,
cgroup peak 284.11 MiB, no OOM, exit 0. Three-contractor/invoice fixture workload,
1 MiB uploads, four readers, about one minute each; 4,388/4,428 requests, 5 ms p95.
Synthetic service restarts retained sessions, links, invoices and retry guards.
These are production-server fixture measurements, not real Render/live RPC load
or a long-term capacity claim. The final proposed tier is 0.5c-512mb with 1 GB disk,
$7.25/month before extras, compared with $25.25/month for the prior proposal.

Payment core and vault provisioning Linux CI also passed on this source. Owner CI
https://github.com/Technique-S/Nnetics/actions/runs/41712048351 failed two browser
cancellation cases (87 passed/1 skipped): busy UI preceded actual first Meteor
request registration on Linux. Waiting for that real fixture request fixes the
test assumption; 20 repeated local desktop/mobile cases passed. App auth guards
are unchanged. A follow-up publication/CI is needed before calling the release
accepted. The approved push/CI did not authorize hosting creation or deployment.

Expanded rollback preparation prevents old snapshots reviving revoked links,
viewer grants or wallet approvals. Rollback copies explicitly reset those access
capabilities while preserving immutable order recipients, billing history and the
Paid claim/hash. Normal migration and restarts keep valid links. The real backup
was restored in a second private rollback rehearsal; all original source records
remain untouched. Final 96 local tests and build passed. User-confirmed real
Grandtheft refresh after actual service restart required no wallet signature.
Actual hosted-domain and Render disk restart acceptance still await rollout.

Metrics: artifacts/hosting-preparation/linux-memory/; logs and private-copy checks
remain ignored. No database contents, tokens or keys were pushed. Worker stopped,
vault paused and authorization revoked; no additional transaction or payment.
Passing author checks remain distinct from independent security review.

### Pre-rollout memory, private backup and restart checks - 3 November 2026

Executed Windows Node 24.18.0 production-server synthetic measurement:
197.86 MiB peak working set, 1,288 requests, p95 29 ms; one owner/three contractors,
three invoices, 1 MiB uploads and four concurrent readers. Same-service restart
preserved fixture sessions, links and invoices; duplicate retries returned existing
invoices and revocation invalidated access. This is not Linux/Render or real Meteor
load. Linux CI is prepared to measure Node 24.22.1 under actual 512 MiB/0.5 CPU and
2 GiB/1 CPU cgroup limits, no swap, with >=20% headroom required to qualify a tier.
Only metrics artifacts are uploaded. It awaits publication approval for the exact
local commit; no matching Linux run has been claimed.

Current official Render prices checked: smallest paid disk-compatible instance $7
plus 1 GB disk $0.25 = $7.25/month; proposed 2 GB $25 plus disk = $25.25/month,
before tax/overages. Minimum-capacity compatibility remains pending Linux evidence.
The assigned Render HTTPS address is selected for initial rollout; no custom DNS
is needed. HOSTED_DEPLOYMENT.md records workload limits and the exact rollout and
rollback procedure. No hosting resource has been created.

Actual private backup captured while verified SQLite write-exclusion locks held
all three source stores; locks were rolled back with no source row changes.
Restored to a separate ACL-protected private directory; all persistent tables,
original billing text, uploads, authority bindings and exact single Paid job matched
by digest. Copies clear sessions for the new origin; originals remain intact.
Manifest SHA256 16cd29fa4e14fe3700e7637265dc48e41b36620fca8a53cb7aecc80e3b4a5947.
Bundles, tokens and database contents remain under ignored artifacts/private-hosting
and were not staged/uploaded. A fresh coordinated cutover snapshot is still needed
if local records change. No public backup URLs or credentials were created.

The actual localhost:3101 production service was restarted. Its existing valid
Grandtheft identity session/deadline and Paid job were unchanged; the user confirmed
refresh returned without another wallet signature. This real Meteor confirmation
is separate from fixture tests; hosted-origin and Render disk restarts remain open.
Local regression results: 96 backend tests passed; full browser suite 89 passed,
1 intentionally skipped. Initial alternate-port failures came from a hardcoded
3100 base URL in contractor tests, corrected before the full rerun. The benchmark's
initial invalid PDF fixture was correctly rejected and then corrected; guards were
not relaxed. Logs and private digest results: artifacts/hosting-preparation/.

Fresh read-only chain check at 2026-11-03T20:04:02.192Z, height 276095135, verified
pinned code/owner, no vault keys, paused=true, agent=null and existing payment Paid.
Worker remains stopped; no signing, new payment or hosting deployment occurred.
Passing author tests do not constitute independent security review.

### Hosted MVP preparation - 3 November 2026

Prepared render.yaml for one Render native Node 24.22.1 / 1 CPU / 2 GB instance,
1 GB persistent disk, no worker, disabled transactions/provisioning and initial
maintenance mode. Estimated base cost is $25.25/month before extras, requiring
owner billing/deployment approval. Full costs, required environment, exact public
pins, HTTPS/cookie/Meteor origin behavior, private migration/backup commands,
cutover/restore requirements, account access and hosted acceptance checklist are
in HOSTED_DEPLOYMENT.md. This is local preparation, not deployment authorization.

Executed locally on Windows Node 24.18.0: **95/95 backend tests passed**, including
hosting guard checks, maintenance HTTP access and SQLite fixture export/restore
with unchanged Paid evidence, session clearing, tamper/traversal and overwrite
rejection. Isolated production build/TypeScript passed. render.yaml passed the
current official Render JSON Schema. Production npm audit completed with **10 low,
0 moderate/high/critical** findings in the legacy wallet dependency tree; no forced
major downgrade was applied. CSP hardening, application rate limiting and off-site
backup scheduling remain limitations rather than implied managed-host features.

Initial failed iterations: optional evidenceRoot TypeScript inference fixed; inline
node -e build worker argument leakage fixed by a file-based child-process launcher;
YAML off string/boolean ambiguity fixed by quoting. Official Node 24.22.1 binary
download timed out before verification; no execution on that runtime is claimed.
Linux CI for it is prepared in hosted-readiness.yml but has not run/pushed. Render
account/SSH access, actual disk mount/startup/import, TLS/wallet flows, live memory
capacity and hosted restart/restore acceptance remain unverified. This is author
verification, not independent security review.

Fresh read-only Fastnear check at **2026-11-03T17:05:13.038Z**, finalized height
**276076842**, verified pinned code/owner/no vault keys, paused=true, agent=null,
spent=0.001 NEAR, reserved=0 and payment attempt 1 Paid. Original single durable
INV-0002 job, payload and signed-byte hashes and seven payment receipt/report files
were verified read-only. Evidence: artifacts/hosting-preparation/chain-preflight.json
and preserved-evidence.json. No real cross-store export was performed while local
apps were active; originals remain untouched and cutover requires all writers
stopped. No worker ran, transaction was signed/broadcast, source pushed, private
records uploaded, paid resource created or hosted deployment performed.

### Persistent dashboard sessions; mandatory focus proofs removed - 3 November 2026

This entry supersedes the mandatory foreground-proof behavior in older entries below. The authenticated session stays bound to the account that signed in for **five hours from its original server-recorded creation**, across refreshes, navigation, tabs and browser restarts. There is no earlier inactivity logout and renewal cannot extend that original deadline. Explicit sign-out/disconnect, genuine expiry and conclusively invalid authorization end access. Navigation/focus changes never request wallet signatures. Silent, non-overlapping checks and bounded active renewal retain sessions through temporary RPC failures while blocking private views/actions until verification succeeds. Incomplete or inconsistent RPC evidence is now retryable rather than deleting a valid session.

Meteor limitation: the pinned injected connector provides no reliable passive selected-account notification. Selecting another wallet without an observable verified event leaves the existing session bound to its original account, which is clearly displayed. It never transfers permissions. Switch wallet explicitly revokes the old session. The optional selected-wallet check can verify a different account, atomically revoke the old browser generation, clear records in other tabs and require a **separate new login**. It cannot silently create a new account's session. Failed/cancelled/inconclusive checks do not change identity. Current membership, signing-key and on-chain owner checks remain required for protected requests and financial actions; no contract guards changed.

Refresh follow-up: the user reported that leaving/returning worked but refresh still appeared disconnected. A valid Grandtheft server session was observed at the time; no token/key/cookie was printed. The initial render could display Connect to Meteor before asynchronous saved-session/workspace discovery completed. Added an explicit restoring-session screen so this delay no longer looks like a logout, and retained actionable restore failures. This gap was reproduced with delayed mocked identity responses. It is **not yet established as the sole cause of the user's real refresh report**. Native Brave inspection timed out and a recovery attempt found no matching Nnetics window; the user subsequently confirmed the final refresh fix on the separate port.

The app is running separately at **http://localhost:3101**, with runtime origin configuration for that address and transaction execution disabled. Port 3100 was occupied and was left alone when starting this instance. The separate localhost host isolates its cookies from 127.0.0.1; a fresh origin-bound login is needed once. Existing organizations, contractor records and the Paid job use the same durable databases. No credentials were moved or printed. Playwright now accepts NNETICS_BROWSER_BASE_URL for an alternate local verification instance.

Executed checks on the final revision:

- Owner Node tests: **92 passed, 0 failed**. Includes cryptographically signed account-change proofs which revoke A without creating B's session, removed-key/isolation/replay guards, exact five-hour boundaries, and incomplete RPC response recovery.
- Production build and TypeScript: **passed**. Final standalone TypeScript check also passed.
- Onboarding browser suite on localhost:3101: **55 passed, 0 failed, 1 skipped**. Desktop/mobile cover tab/focus/navigation/refresh, silent outage recovery, the former 15-minute interval, genuine expiry and clock skew, explicit logout, cross-tab revocation, an unreported selection remaining bound to A, a verified change requiring separate authentication, cancelled optional checks, and delayed refresh restoration. The single desktop-only persistence case closes/relaunches an actual isolated test-browser process twice, verifies a persistent HttpOnly cookie restores login without a wallet prompt, then verifies logout survives restart. Its duplicate mobile case is intentionally skipped.
- Those browser cases use **mocked Meteor and backend/RPC responses**. The process restart is real; it is not a real Meteor browser-restart acceptance pass. No five-hour real-wallet wall-clock run is claimed.
- Earlier local iteration: 46 browser cases passed, 7 failed and 1 skipped because newly added test strings contained a non-UTF-8 middle-dot byte. Corrected test encoding; the intermediate suite then passed 53 cases/1 skipped, before adding two delayed-restoration cases. One build initially encountered another Next build's lock; a subsequent build passed. An initial test server startup raced the separately started server (EADDRINUSE); final new-port execution had no such startup failure.

Real-wallet evidence: earlier Grandtheft sign-in and user-confirmed return behavior and Babygoat's Paid screen remain historical results, preserved separately from fixture tests. The user initially reported this revision ran fine except refresh. After the restoring-screen fix and starting localhost:3101, the user explicitly confirmed the Grandtheft sign-in, completed workspace load and refresh sequence: "it works fine now." This is a **user-confirmed real Meteor refresh pass**, not independent browser observation. A final real Meteor browser-process restart and actual two-account switching check still await separate confirmation; passive wallet-selection detection is not claimed.

Fresh read-only Fastnear evidence at **2026-11-03T16:34:04.245Z**, finalized block **276073606**, confirms owner grandtheft.testnet, paused=true, agent=null, spent=0.001 NEAR, reserved=0 and last_attempt=1. Exactly one durable Paid INV-0002 job remains, same ACCEPTANCE-001 order, 0.001 NEAR Babygoat recipient, transaction 6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1 and unchanged payload/signed-byte hashes. Evidence: artifacts/session-stability/persistent-session-chain-preserved.json. No new signing, transactions, worker execution, AI calls or GitHub push occurred for this work. Passing tests and author review do not constitute independent security review.

Logs: artifacts/session-stability/persistence-unit-final.log, persistence-build-final.log, persistence-typecheck.log and persistence-browser-3101.log. Current policy and connector limitations: docs/SESSION_SECURITY.md.

### Session stability, selected-wallet isolation and five-hour policy — 3 November 2026

User requested investigation of premature Grandtheft logout and later explicitly chose five hours before automatic logout. The final policy is **five hours from server-recorded sign-in, with no earlier inactivity logout**. This supersedes the earlier 30-minute idle/eight-hour proposal and prior fixed 15/60-minute sessions. Foreground activity and same-account re-verification cannot reset the original five-hour cap. Explicit logout, a verified account change or conclusive key invalidation can still end access earlier. Limits, cookie settings and implementation details are documented in SESSION_SECURITY.md.

Confirmed code/previous real-screen cause: blur/hidden events called logout, cleared records and advanced the server browser generation. Previously every RPC verification failure also deleted a session. The new implementation masks/unmounts private views without logging out on focus loss, fences stale responses, keeps bounded sessions through transient errors, and requires an off-chain proof of Meteor's selected account before restoring records. It omits the previous account from the optional SDK accountId field. Same-account proof retains the token/creation deadline; a different valid account atomically revokes old browser sessions and clears other tabs through BroadcastChannel. Protected backend actions still recheck key validity, membership and on-chain ownership. No owner authority is inferred from a connected wallet.

A focused reload regression was reproduced in browser tests: visibilitychange after pagehide was wrongly treated as leaving the app. Corrected navigation/BFCache handling preserves a verified focused reload while requiring proof for a new navigation document. Initial identity heartbeat was reduced from repeated organization discovery every ten seconds to a lightweight, non-overlapping session check every thirty seconds. Active refresh requests are limited to trusted foreground pointer/key activity, at most once a minute; background checks cannot extend lifetime. Client expiry uses remaining server lifetime to tolerate browser wall-clock skew.

The user confirmed that the new Grandtheft login/navigation/refresh/return flow “works fine.” Its real session row recorded an exact five-hour original deadline. Evidence: artifacts/session-stability/grandtheft-user-confirmed.json. This is user-confirmed real Meteor behavior, separate from fixture tests; no five-hour wall-clock observation was claimed. The simplified Connect to Meteor path then produced a real server-accepted Grandtheft proof/session, but the user reported the UI still said Awaiting Meteor approval. This is recorded as a real UI failure, not a pass. The old label covered post-signature RPC/workspace loading, and a focus/epoch change could leave busy state stuck. Fixed phase-specific progress, cancellation/busy cleanup and saved-session recovery for accepted proofs whose workspace load fails. The final corrected one-button flow and real Babygoat/multiple-tab switch retests are still pending user feedback. Native Brave state capture timed out twice; browser automation could not independently observe the final live screen. The accepted Grandtheft server session was observed at 14:38:56 UTC with created=1793716714048 and expires=absolute_expires=1793734714048: exactly five hours. No private cookie/token/key was logged. After the post-login UI fix the user was asked to retry; final real feedback remains pending.

Connect now requests a single off-chain identity message for the wallet selected in Meteor, without an account-name field in the main flow. Named account entry remains optional. Discovery challenges are one-use, browser/origin/network/generation/purpose-bound and validate the returned account's current on-chain FullAccess key. No transaction or key installation is requested. This preserves the existing NEP-413 signature encoding. A direct official-NEP refresh attempt timed out; the official pinned Meteor SignMessage input types and previously verified implementation remain the basis, with no SDK upgrade or cryptographic relaxation.

Executed automated results so far: **91/91 owner Node tests**, **17/17 focused identity/Meteor tests** at the discovery stage, production build/TypeScript passed; the expanded final pre-HTML-handling browser run passed **48/48 desktop/mobile cases**, including 16 simulated minutes of navigation/refresh without another signature, exact five-hour expiry, browser-clock skew, same/different selected wallet proof, cross-tab clearing, explicit logout, transient outages, cancellation and accepted-message workspace recovery. These use mocked RPC/Meteor or generated test keys and do not establish real-wallet acceptance. The additional malformed-service-response cases also executed and passed **2/2**, for 50 distinct browser cases covered across the 48-case full run and the targeted two-case follow-up. The final production build/TypeScript passed; client HTML/non-JSON outage responses retain a session and block views instead of being misclassified as logout. Earlier failing iterations: 28/34 browser cases passed; one genuine reload bug plus outdated/ambiguous alert selectors were corrected. Virtual-clock fixtures initially reported timeOrigin=-1 and no navigation entries; explicit fixture setup fixed those failures. The first new five-hour-boundary test advanced a running clock from after page setup and crossed the deadline early; freezing the clock/using actual remaining lifetime corrected the test without weakening expiry.

Preservation: fresh FINAL testnet read in artifacts/session-stability/chain-and-job-preserved.json verified Grandtheft owner, paused=true, agent=null, Paid attempt 1, spent=0.001 NEAR and reserved=0. The sole INV-0002 job, transaction hash, original payload hash and signed-byte hash are unchanged. Global payment execution remains false. No contract code change, chain signature/transaction, AI call or GitHub push occurred in this session work. Full real-wallet switching/multi-tab acceptance remains incomplete pending the final user-assisted checks.

### Post-payment persistence, contractor confirmation and session repair — 3 November 2026

After the payment, the user confirmed Paid in Babygoat's real contractor portal. Grandtheft's billing-screen confirmation is still pending: the app was being rebuilt when the user attempted to return. Full matching-screen acceptance is therefore not yet claimed. Payment, exact transfer/balance evidence and final pause/revoke already passed independently of this remaining visual check.

Actual production app restart and a second fresh production worker --once process completed against the same persistent database. Finalized worker nonce remained 276036473000001; vault last_attempt remained 1, paused=true, agent=null, spent=0.001 and reserved=0. Same one Paid job, transaction hash, attempt and original invoice/order/recipient remained. Global transaction flag remains false. Evidence: artifacts/payment-acceptance/v3-app-and-worker-restart.json. Together with three same-intent local linkage repetitions, these establish actual local persistence/restart behavior; no intentional duplicate transaction was broadcast. Repeated authenticated HTTP queue requests after payment were not exercised; local linkage retries and worker/app restarts were.

User reported sign-in timeout/frequent logout. Actual code causes: every window blur/hidden event revokes the session; any identity verification RPC failure also deleted a valid server session. Fixed transient verification handling with a typed retryable response: outages deny access and hide private records/actions without deleting or extending a valid session; recovery rechecks the key on chain. New sessions have a fixed 60-minute maximum (previously 15), explicitly disclosed in the signed challenge and cookie. Existing sessions keep their original expiry; no silent renewal. Meteor approval allowance is four minutes, within the unchanged five-minute challenge validity. A declared pre-session RPC-503 response permits one retry of the same signed challenge without another wallet prompt; lost/ambiguous responses are never automatically replayed. Saved-session retry handles a reload-time outage without requesting another signature.

Preserved guards: expired/replayed challenges, removed/restricted keys, wrong network, switched browser generations, organization isolation and current on-chain owner checks remain enforced. Focus-loss logout remains intentionally present because the pinned Meteor injected interface supplies no reliable selected-account change notification. Removing it would weaken the previously required account-switch isolation; this limitation is unresolved. The fix reduces actual-expiry/RPC-driven reauthentication, not every focus-driven wallet prompt. A separately reviewed connector with observable account switching would be needed to safely remove that remaining behavior. Official source inspection: https://github.com/Meteor-Wallet/meteor_wallet_sdk (implementation-author investigation, not independent review).

Executed verification: full owner Node suite **86/86 passed**; focused identity suite **6/6 passed** after the final response-parsing change; production build and TypeScript **passed**; onboarding Playwright **24/24 desktop/mobile cases passed** (41.6 seconds), including outage conceal/recovery, saved-session restore, bounded same-proof retry and preserved switch/configuration/expiry/failure cases. These are mocked/fixture regressions, separate from the actual chain payment and user-confirmed contractor screen. Real Meteor approval timing and a new 60-minute session have not been observed for their full duration. App restarted at http://127.0.0.1:3100 on the completed build; owner screen can now be checked. No new on-chain transactions beyond the five approved V3 records, no AI calls or GitHub push.

### V3 authorized single payment and closure — 3 November 2026

User explicitly approved V3 digest 9ea7cb9e479d5df6c6cd79793aeb1ea53fb34e6b76a8fc139895afa4b06a27d8. The approved JSON was not changed. Fresh Fastnear/Intear canonical checkpoint and ordered-set checks, signatures/quorum, next-set commitment, supported next-epoch recovery update and ancestry passed at 13:14:59 UTC. No checkpoint update or repeated setup was sent. Corrected real Grandtheft owner UI, organization/backend/worker/queue/code/owner/key/funds/fee/expiry checks passed before owner calls.

All five V3 transactions completed FINAL with successful receipts, inside the exact approved limits:

| Step | Actual transaction | Actual fees (yoctoNEAR) |
| --- | --- | --- |
| authorize_agent | [9ihdk17ReJLduPDsfQrgjaHoCajEUfh39T3d8g1kA65T](https://testnet.nearblocks.io/txns/9ihdk17ReJLduPDsfQrgjaHoCajEUfh39T3d8g1kA65T) | 194798633610200000000 |
| set_paused | [9NXCAw4d42LEyv21FVsgW8nRGKCSLSaZKBQWtJRpM1Px](https://testnet.nearblocks.io/txns/9NXCAw4d42LEyv21FVsgW8nRGKCSLSaZKBQWtJRpM1Px) | 190434453879800000000 |
| execute_payment | [6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1](https://testnet.nearblocks.io/txns/6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1) | 793580687791100000000 |
| pause-after-payment | [J2LoXhsGuSZ9GwL9TUhcDbkeVWhbwxaR23eFqDM4EdgV](https://testnet.nearblocks.io/txns/J2LoXhsGuSZ9GwL9TUhcDbkeVWhbwxaR23eFqDM4EdgV) | 190423667216300000000 |
| revoke_agent | [HR9bqQFyre8XgUhwYQpX3cNf4wefmui8CM9g4ZjkHDfD](https://testnet.nearblocks.io/txns/HR9bqQFyre8XgUhwYQpX3cNf4wefmui8CM9g4ZjkHDfD) | 188925877318400000000 |

The authorized owner released the SAME existing job through the live UI. The scoped production PaymentWorker made one execute_payment call for INV-0002 / ACCEPTANCE-001, 1000000000000000000000 yoctoNEAR to babygoat.testnet. FINAL full receipt evidence verifies exactly one native Transfer action with that deposit, predecessor the approved vault, recipient Babygoat, successful outcome and linkage to the initiating marker receipt. Native receipt ID: E98CVrQiUQq9v1otEi6ebEY37DhTNZYfBiSNwxMZnUam. Actual balance before 9878461305613026399999998, after 9879461305613026399999998; exact delta 1000000000000000000000 yoctoNEAR = 0.001 NEAR.

Finalized vault/order/payment checks: last_attempt=1, Paid, spent=0.001, reserved=0, paused=true, agent=null. Exactly one persistent job and linked intent remain; same invoice/order/immutable recipient/original-text hash. No second job/attempt/payment, mainnet transaction or AI call. Actual V3 fees: owner 0.0007645826320247 NEAR, worker 0.0007935806877911 NEAR; total 0.0015581633198158 NEAR, plus four owner-action yocto deposits. Payment principal 0.001 came from existing ledger funds. Remaining worker balance 0.2992064193122089 NEAR; its single key remains function-call-only and contract authorization is revoked.

Three local repeated same-intent linkage calls and a new production worker --once process passed against the actual paid database: same job/hash/attempt/signed bytes, no new broadcast. Artifacts: v3-outbox/ (exact outboxes, full receipts, balances), v3-preflight-1793711690303-* (fresh proof), v3-contained-final-state.json, v3-results-summary.json and v3-retry-worker-restart.json. Global execution remains disabled. Real matching owner/contractor screen refresh and app-restart verification are still pending; do not count full screen acceptance as passed yet. No independent security review occurred; the explicitly accepted testnet exception remains limited to this single completed payment.

### V3 resumption amendment prepared; real owner UI aligned — 3 November 2026

Read-only finalized verification at 2026-11-03T13:09:09.965Z passed against the same verified Grandtheft vault in backend config, public API, organization binding, scoped queue metadata and WorkerNearTransport. Actual Grandtheft Meteor login plus Brave main owner dashboard inspection passed at 2026-11-03T13:12:39.932Z; controls show the exact Grandtheft vault, held INV-0002, paused payments and revoked worker authority. The previous stale Babygoat target is absent. UI evidence is retained in resumption-owner-ui-verification.json. No new transaction was requested during this verification.

Exactly one unchanged linked intent and one existing held review job remain; hash/signature/attempt are null. INV-0002 remains Approved at 0.001 NEAR to babygoat.testnet with unchanged original-text hash and billing/chain order. On chain: owner Grandtheft, pinned code, no vault keys, exact installed checkpoint, Approved enabled unexpired order and active vendor; funded/budget/cap each 0.001, last_attempt/spent/reserved zero, paused=true, agent=null. Worker retains one execute_payment-only key to this vault, 0.27 allowance, no FullAccess; balance 0.3 NEAR. Owner balance 0.330221809676491199999990 NEAR, fresh CLI nonce and storage reserve checked. Vault physical balance covers measured storage stake, operating reserve and payout.

Fresh protocol-88 fee computations passed all five caps: owner calls approximately 0.010919 NEAR upfront each (caps 0.011), worker approximately 0.250919860061381 (cap 0.251). Additional owner caps 0.044 plus 4 yocto deposits; zero additional funding. V2 actual owner fees plus new caps 0.0533113190956912 remain below original 0.210 ceiling. Checkpoint age at preparation approximately 7.96 hours; exact 24h deadline 4 November 06:11:26.057 WAT (1793769086057769230 ns), earlier than order expiry 5 November 09:54:14.014 WAT. Fresh source/signature/commitment and current recovery-path checks must be repeated before execution; previous V2 proof checks are historical evidence.

Prepared PAYMENT_ACCEPTANCE_RESUMPTION_V3.md/.json, digest 9ea7cb9e479d5df6c6cd79793aeb1ea53fb34e6b76a8fc139895afa4b06a27d8. Deep equality and digest verification passed: five selected transaction records are unchanged from V2, with no repeated setup or funding. This amendment is NOT approved; no V3 signing, broadcast, transfer, recipient acceptance delta, matching Paid screens or post-payment restart result exists. Global transaction execution remains disabled. Existing 84 backend/four browser/build results are preserved, not rerun or relabeled as independent review. No independent security review occurred; explicit testnet-only exception and initial trusted-root assumptions still require the user's resumption decision. No GitHub push.

### V2 authorized execution stopped before payment; contained — 3 November, 11:20–11:44 WAT

User explicitly approved V2 digest
`978219497f70b4c76cf87b367eb032192c12566d074488566c40eece43301edf`, including
the testnet independent-review exception and exact initial trust. Fresh protocol,
balances, source/ordered-set agreement and <=24h age checks passed. Bootstrap
signatures/commitments were reverified. An off-chain signed next-epoch update and
Merkle ancestry to current canonical head were obtained and verified; no head
update transaction was sent. Evidence under `artifacts/payment-acceptance/` includes
`v2-approved-fresh-preflight.json` and `v2-recovery-path-verification.json`.

The first local preparation failed before any outbox/signature because SDK 7.4.0
exports addFunctionCallAccessKey rather than addKey. Corrected the action mapping
and verified serialized/decode-round-trip key bytes, nonce 0, exact receiver/method,
0.27 allowance and absence of FullAccess before resuming preparation. A first
round-trip assertion incorrectly called toString on decoded plain key data; it
was corrected to compare raw public-key bytes. Neither local failure sent anything.

All 11 owner transactions below finalized successfully, within the approved caps:

| Step | Transaction hash |
| --- | --- |
| Worker create/fund/restricted key | 21oM66rGF3WHCbsAfPsg89cZ7C4fk8wq8f5eweg6EeGi |
| Checkpoint initialize | 8ArbUK2vdqpfpydaoSWzCCnnBPps2JPUb1G7skKDrZMu |
| Register vendor | Evotip2UVvZj39bp112FgcCTDMFJJY41wZ5KbQ99w2kw |
| Approve chain order | 4CVZtR43E1ny4e9JdLLyjkKUHLX5kN7C9f8ziLeJjr91 |
| Fund ledger | HKjVP9HWPpgbGVhJzb3YZZTq3NKpAgjhBTtuotnwdHKp |
| Budget | HYRm1GWbxMQV2wez56yZKbrXbEQbS8QMgwK1SSEBUDtp |
| Cap | 2Xk7LWHzc6DA7PNyueJNSU7jaqrASeGHex9EpeZLMF3p |
| Agent authorization | CPMkKAeTE3Z9Yo5tXEVJ9CxujmuzsnPND11mNS9eyd4n |
| Unpause | 96RqW5518sAVjnU7VAg6Bgij5yytmLUfG1jnwKRXiuzG |
| Early containment pause | 5o21Hpos7gKYKczx1qFoqhLfj25ba47JvFSG1A7pL89o |
| Early containment revoke | 3KE95qoWUPVZdi8nf7zSUD3hwhWwqmwc8Eduv2rNaJHM |

Exact signed outboxes, broadcast markers and full results retained separately per
step in `artifacts/payment-acceptance/v2-outbox/`. Total actual owner fees:
**0.0093113190956912 NEAR**; deposits **0.301 NEAR + 9 yoctoNEAR**. Unused fee
allowances are not counted as spent. Worker has exactly one restricted key, no
FullAccess; stored checkpoint matched the exact approved payload. Fresh activated
order/vendor/funding/key checks passed. All setup signatures used the existing CLI
keychain; no owner key export. No mainnet or alternate-vault transaction was sent.

Real Grandtheft Meteor login and authorized owner UI linked INV-0002 twice.
Actual SQLite verified **one** durable intent and **one held review job**, same
order/reference, hash null/attempt null. Before release/payment, the main owner UI
displayed stale `vault.babygoat.testnet` in its controls while its authenticated
server snapshot and all actual transaction targets were Grandtheft. **Stopped on
this mismatch as explicitly required.** No enqueue/release, payment signature,
worker payment process or execute_payment transaction occurred. Acceptance has
not passed; no confirmed recipient transfer/balance delta/Paid status is claimed.

The planned early containment pause completed FINAL. Revocation's initial read-only
preflight received HTTP 429 before any outbox/signature. Stopped dashboard polling,
waited briefly, reran fresh preflight for the same still-unattempted revocation,
and its single transaction completed FINAL. This was not an unknown-broadcast retry.
Final on-chain read verifies **paused=true, agent=null, last_attempt=0, spent=0,
reserved=0**, ledger/budget/cap each 0.001. Ledger funds remain unspent in the vault;
worker gas funding remains on its restricted account. Summary:
`v2-contained-state.json`, `v2-stopped-summary.json`.

Actual cause: Onboarding loaded config once on mount and reused that client object
after the server restarted with Grandtheft config. Fresh login selected current
server organization but created its adapter from stale target data. Fix: fetch
fresh config before workspace creation, require matching configured organization,
and compare bound context before AND after every authenticated snapshot. Context
drift clears protected records/actions and fences late responses; wallet actions
reuse this guard before requesting signatures. No auth/contract guard was removed.
Executed after fix: **84/84 backend tests passed**, **4/4 desktop/mobile browser
cases passed** (config drift and account switching), production build/TypeScript
passed. These are regression results, not a completed payment acceptance or audit.

V2's unpause and both closure transactions have now been consumed. **No automatic
resume is authorized.** Any further agent authorization/unpause/payment/closure
requires a concrete amended plan and approval, with fresh checkpoint validity and
all checks. The original V2 JSON/digest and invoice amount/text/order/recipient
remain unchanged; payment execution flag is still false. No GitHub push occurred.

### Testnet-only exception revision prepared — 3 November 2026

User requested preparation of a revision explicitly accepting no independent
security review for a single bounded testnet run. No execution approval was given.
Created PAYMENT_ACCEPTANCE_TESTNET_V2.md and .json with digest
`978219497f70b4c76cf87b367eb032192c12566d074488566c40eece43301edf`.
The original `b4b70ad2...` plan remains intact. Programmatic deep equality verifies
all 12 transaction records, exact args/base64, funding/fees/gas/keys/permissions/
expiry/checkpoint payload and invoice/worker/storage/scope snapshots are unchanged.
Only review policy, corroboration annotations, validity/stop conditions and closure
requirements changed. PAYMENT_ACCEPTANCE_V2_COMPARISON.json records the comparison.

The exception is explicit: no independent reviewer exists, no production security
claim, and owner trust of the exact initial root remains mandatory. Before signing,
fresh canonical source/validator/quorum/next-commitment/network checks and a
nonfuture <=24h checkpoint age must pass. Fixed head's age window ends
4 November at 06:11:26.057 WAT; stale/changed evidence requires a new approved plan.
No on-chain head-advance or recovery transaction was added. Exactly one held job
and one confirmed 0.001 native transfer/balance change/linkage are required; then
immediate pause/revoke, followed by local retries/restarts with the same terminal
job and no duplicate broadcast. Existing unknown-reservation guards remain.

Artifact verification executed: both original/revised canonical digests checked;
unchanged transaction/scope comparisons and every FunctionCall args/base64 pair
passed; exactly one INV-0002/Babygoat/0.001 call verified; new revision generator
passed syntax checking. This is document/plan verification, not chain execution,
VM execution or independent review. Execution flag remains false. No transaction
was prepared for signature, signed or sent in this revision pass. Awaiting explicit
user decision naming the revised digest, not relying on earlier deployment approval.

### Concrete checkpoint disposition — 3 November, 10:04–10:12 WAT

Read PAYMENT_CHECKPOINT_REVIEW.md and historical author-review boundaries. Corrected
the source-independence overstatement: NEAR's May 2025 deprecation notice says
Fastnear maintains the legacy near.org endpoints. Original dual-host corroboration
was correlated, not two independent operators. Additional read-only checks at
09:03:58–09:04:00 UTC found dRPC testnet agrees on the same pinned canonical hash;
its ordered-validator method is unavailable. Intear testnet agrees on both that
hash and the complete ordered 20-validator set. Public NEAR provider documentation
identifies these separately operated services; physical/upstream independence is
not attested. Evidence: `artifacts/payment-acceptance/independent-source-checks.json`.
This corroborates responses, not genesis trust or independent code review.

Fixed actionable off-chain collector gaps: duplicate/invalid accounts, empty/oversize
sets, zero/malformed stakes, u128 total overflow and malformed/oversize signature
slots now reject before evidence is presented. Collector now checks both chain IDs
and supported protocol, uses Intear instead of a correlated archival hostname,
and rejects future timestamps/aliased epochs. Acceptance collector/preparation
also enforce a 24-hour age bound; future execution must recheck it before signing.
No contract, deployed WASM, checkpoint payload, transaction amount, permission,
gas cap or plan digest was changed. Saved exact evidence passes the new guards.

Executed **21/21 relevant tests passed** (bootstrap sets/age, provisioning, durable
linkage and worker); TypeScript passed. Verified exact normalized checkpoint equals
the unchanged plan's initialization args; canonical digest remains
`b4b70ad2cfee6722a0fe74e02f549b6cb124b54ab3ab282575d14c17f0f2b63b`.
No exact-input VM execution or independent review is inferred.

Disposition matrix in PAYMENT_CHECKPOINT_REVIEW.md separates bootstrap/PoS trust
from fixed preparation defects, missing independent assurance, VM/resource and
callback/replay/transport limitations. **Independent reviewer: none.** Codex is
the implementation author, not independent. Recommendation: do not execute the
unchanged plan while its explicit independent-review requirement remains unmet.
Owner can obtain a named review verdict, or explicitly request a revised testnet
policy/plan accepting that absence; no silent waiver or false review completion.
Execution remains disabled; no setup, checkpoint, unpause or payment sent in this
pass. The unchanged transaction plan is presented for a policy decision, not
represented as already approved or executable.

### Dedicated worker key and exact payment review packet — 3 November, 09:49–09:54 WAT

User explicitly authorized dedicated local key generation and preparation only.
Generated an exclusive fsynced Ed25519 private-key file outside the repository at
`C:/Users/Kazi/.nnetics/keys/grandtheft-worker/restricted-worker.key`; Windows ACL
inspection confirms access only for Kazi and SYSTEM. No private key was logged,
exported or committed. Public key:
`ed25519:J9yFAtkpdgsJ2E3N3MANFFHQf3k9DNkXsBhsJUotHfFA`.
Worker account `worker.grandtheft.testnet` remains absent; no on-chain key installed.
The existing local worker signer can read that private external file, so CLI
import or credential export is unnecessary. Owner setup signing stays in CLI.

Read-only bootstrap evidence collection actually executed. Both Fastnear testnet
and NEAR archival RPC agree on canonical head
`Gk91ppKatpsQhi62mK9CE1WKfFMFA7BH1EDt3vBSnnpD`, height 276003652, and 20 ordered
current validators. Next set also 20. Reconstructed canonical header and next-set
commitment matched; supplied current-prefix approvals verified, with approved
stake > two thirds of total. Normalized arguments are 7234 bytes, SHA-256
`e38bed03aadd216a2472fb92064cf77ee54aecc86f405f22259c6f6607731027`.
Raw evidence and checkpoint args retained under ignored `artifacts/payment-acceptance/`.
This is author verification against supplied bootstrap inputs, not independent
authentication of the initial current set or an independent security verdict.

Exact plan: `PAYMENT_ACCEPTANCE_TRANSACTIONS.json`, digest
`b4b70ad2cfee6722a0fe74e02f549b6cb124b54ab3ab282575d14c17f0f2b63b`.
Includes zero FullAccess keys, execute_payment-only receiver restriction, 0.27
NEAR finite key allowance, 0.3 worker funding, 0.001 payout funding, exact checkpoint,
vendor/order/expiry, budget/cap, agent activation, one payment, pause and revocation.
Owner maximum fees 0.210 NEAR, deposits 0.301 NEAR + 9 yocto, retained owner storage
0.00264: 0.51364 + 9 yocto total, below observed 0.640533128772182399999999 balance.
Worker maximum 0.251 fee is paid from its 0.3 allocation, not double-counted.
Fee caps are conservatively rounded upward, not actual expenditure claims.

Review disposition and operational details: `PAYMENT_CHECKPOINT_REVIEW.md`.
Initial validator trust/age and independent verifier findings remain unresolved;
exact current inputs have not been VM-executed. **No bypass, checkpoint install,
funding, authorization, unpause or payment occurred. No transaction approval has
been requested for this blocked plan.** INV-0002 amount/order/recipient remain
unchanged and the ledger is unfunded. Root reference tests ran **42/42 passed**;
both new preparation scripts passed Node syntax checks. The real evidence checks
above are separate from tests and from missing independent review.

### Live owner reconciliation succeeded — 3 November, morning WAT

Post-reconciliation production app stop/restart completed. A new read-only SQLite
connection confirms the same verified actual hash, archived original evidence and
no dispatchable original bytes. Post-restart owner UI requested fresh authentication;
no extra wallet signature was requested merely to repeat this persistence check.
The user selected **new local-CLI worker** for `worker.grandtheft.testnet`. This is
preparation scope only: no worker key/account/funding transaction was executed or
approved. CLI 0.30.1 help was inspected for offline generation and sign-later
support; a key-generation/signing command has not yet been handed off or counted
as successful. Exact worker key custody and reviewed checkpoint remain blockers
to a signable payment transaction plan. No private-key export will be used.

After fresh real Grandtheft Meteor authentication, the normal owner UI submitted
the recovered actual transaction hash to the guarded read-only reconciliation
operation. Backend verified FINAL receipts, identical signer/key/nonce/full call,
factory configuration, pinned vault code/no keys/owner and paused zero-payment
state before atomically linking the organization. The owner screen visibly showed
**Verified vault** and transaction
`Hmp8i6AfQC4UtHwWDYxPuntpsd93UCEarQhijb3rStBe`, finalized verification block
`6B4Kbp5vHeNZxGg3UGShNxyNtVXZj682P9WtC6LWMyqe`.

Read-only actual SQLite inspection confirms `organization_vaults` binding and
verified intent, with `preparedHash` retaining the original hash. Original
dispatchable bytes are archived in `vault_provisioning_history` and removed from
the verified intent; no retry or second creation was broadcast. This is real
owner acceptance, distinct from fixture tests. Full backend suite **81/81 passed**;
production build/TypeScript passed after the nullable-variable correction.

INV-0002 remains Approved for 0.001 NEAR with its original text/order/Babygoat
recipient unchanged. No matching on-chain work order has been authorized/created,
so no live payment job or payment exists. Worker custody/account/key selection,
reviewed checkpoint/bootstrap and independent-verifier review remain unresolved;
payment authorization remains absent and execution disabled. A worker-selection
question was presented; it is not authorization to create/fund accounts or keys.

### Actual customer transaction recovered — 3 November, 09:07 WAT (08:07 UTC)

The prepared hash BZewVJxNXVBXCyDpcH3iJV7of7g6giYnTGcejLtYvXU2 remains
UNKNOWN_TRANSACTION on Fastnear and the NEAR archival endpoint, but its nonce was
consumed and the deterministic vault exists. Read-only historical account queries
located first existence at height **275967125**. Canonical chunks at height
**275967123** identify the actual transaction:
https://testnet.nearblocks.io/txns/Hmp8i6AfQC4UtHwWDYxPuntpsd93UCEarQhijb3rStBe.

The actual transaction is FINAL success, callback true, with no failed receipts.
Signer, public key, nonce **275527848000003**, factory receiver, sole create_vault
action, exact request args, **5 NEAR** and **250 Tgas** all match approval. The hash
differs from the prepared unsigned hash; the exact wallet serialization/reference
change has not been established. No creation retry was sent. The old prepared
outbox and actual transaction are retained separately. Account existence alone
was not accepted as complete transaction evidence.

At finalized height **276021975**, the vault has pinned code, no access keys,
owner **grandtheft.testnet**, paused true, agent null, budget/funded/spent/reserved/
last_attempt zero, and balance 5 NEAR. Actual owner fee excluding the 5-NEAR deposit:
**0.012741483268328 NEAR**, matching tokens burnt; owner balance
**0.640533128772182399999999 NEAR**. Evidence:
`artifacts/live/customer-vault-actual-transaction.json`,
`artifacts/live/customer-vault-actual-verification.json`, and ignored historical
discovery records in `artifacts/local-checks/`.

Live organization binding is still absent because the app correctly requires its
recorded hash. Implemented an explicit owner-authenticated reconciliation hash
input: only an unknown original/pending intent can present a candidate, and only
FINAL success with the same key/nonce/full approved call and all existing finalized
factory/vault/receipt guards can bind it. Original bytes are archived in durable
history; candidate adoption clears dispatchable original bytes. Transport failure,
wrong fields, pending/failing transactions and existing known originals cannot
silently replace a request. No signing/broadcast is performed by this operation.
Provisioning tests executed **8/8 passed**, including mismatched key/nonce/actions/
receipt rejection and preserved original evidence. An initial TypeScript build
found a nullable concurrency-check variable; it was corrected before restart.
Live reconciliation/refresh acceptance remains pending authenticated owner use.

No payment authority was added. INV-0002 and deterministic extraction remain
unchanged; exactly-one live payment job/transfer/balance/status acceptance has not
passed. Historical-verifier review, checkpoint trust and worker key custody remain
outstanding before any payment authorization.

### Customer vault dispatched to Meteor — 3 November, 00:21 WAT (2 November, 23:21 UTC)

After the earlier off-chain proof timed out without signing, a fresh Grandtheft
Meteor login succeeded. The normal Create vault UI prepared the deterministic
Grandtheft organization request. Fresh finalized preflight at height **275966954**
confirmed protocol 88, balance **5.653274612040510399999999 NEAR**, unchanged
storage/fee schedule and the approved customer fee allowance
**0.2509192927126355 NEAR**. Evidence:
`artifacts/live/approved-customer-vault.preflight.json`.

The reviewed UI dispatched exactly one durable transaction:
**BZewVJxNXVBXCyDpcH3iJV7of7g6giYnTGcejLtYvXU2**, Meteor key nonce
**275527848000003**, signer Grandtheft, receiver `v.grandtheft.testnet`,
`create_vault`, request `0657dc10a1c5acb5e4e930476ce98df8`, deposit **5 NEAR**,
gas **250 Tgas**. Exact unsigned bytes were decoded and independently compared
against the original plan before requesting the user complete Meteor signing.
Evidence: durable `vault_provisioning` row and exclusive copy
`artifacts/live/approved-customer-vault.dispatch.json`.

This customer nonce equals the old expired Meteor infrastructure nonce, using a
new hash/reference and a different action. The old infrastructure attempt was
conclusively expired before the CLI deployment; its preserved outbox is not
replaced. This is the originally approved customer call, not a retry of deployment.
Current state is **awaiting_chain**, not verified. No success, ownership binding,
payment or Paid state is inferred from preparing or requesting a wallet signature.
Unknown outcome must reconcile this same hash before any other attempt.

### Factory deployed and verified — 3 November, 00:08 WAT (2 November, 23:08 UTC)

The user ran the exact owner-only offline CLI command and saved the signed file
locally. `factory-cli-verify.mjs` reconstructed the approved actions and verified
canonical exact bytes plus the Ed25519 signature for the approved CLI key. No
credential was exported, read by the agent or printed. Fresh submit preflight
rechecked canonical reference/validity, expired original, both key nonces,
FullAccess permission, protocol/storage/fee schedule, full-plan balance and absent
targets. An exclusive fsynced broadcast marker was written before submitting
exactly once to testnet under the existing approval.

**FINAL success:**
https://testnet.nearblocks.io/txns/3KHBKLzkE9sUvUXUWPWTxWEdwaGjndCEcTttxSASz6Rq

Signer Grandtheft; receiver `v.grandtheft.testnet`; CreateAccount + 6.3324 NEAR +
pinned DeployContract; no keys/initializer. Two receipt outcomes, no failure.
Actual owner debit **6.3465941500094896 NEAR**, consisting of deposit **6.3324**
and fee **0.0141941500094896** (matches total tokens burnt). Owner after:
**5.653274612040510399999999 NEAR**. Factory balance **6.3324 NEAR**,
storage **629244 bytes**, no access keys.

At finalized height **275965600**, full downloaded factory code matches SHA-256
`8475786608c34a68317d2ada08cd3dd2e65ff23dc176e2377ac54db5b4f52bbb`, 629144 bytes.
`get_config` confirms version 1, funding 5 NEAR, zero initial budget, 0.01 cap and
embedded 427238-byte vault hash
`dc4cf64736110a33cce94531e2e00ba4510bcebbbb240bee6ecdacacf778560f`.
The factory is stateless/default-initialized; no unapproved initialization call
was added. Evidence: `artifacts/live/approved-factory-cli-infrastructure` files
`.json`, `.verified.json`, `.broadcast.json`, `.result.json`, `.finalized.json`.
The original expired Meteor outbox remains preserved.

Local ignored configuration now pins this verified factory and enables only the
approved provisioning flow. Payment execution remains disabled. App restarted;
fresh owner login requested because the earlier browser session was cleared on
CLI/page switching. The 5-NEAR customer call has not yet been dispatched and the
organization has not been linked. Vault ownership/provisioning acceptance remains
incomplete until the customer transaction and finalized checks pass. No payment
or Paid status is claimed. Deterministic parsing remains the acceptance path.

### Approved CLI handoff prepared — 3 November, 00:01 WAT (2 November, 23:01 UTC)

Fresh real Grandtheft Meteor proof passed. `scripts/factory-cli-handoff.mjs` ran
finalized read-only testnet checks: protocol 88, validity 86400, canonical original
reference, old hash unknown/expired, unchanged old nonce, factory/customer absent,
CLI key FullAccess, both pinned artifacts and original plan/amendment digests.
Infrastructure and customer gas/fee totals still match approval. Balance
11.999868762049999999999999 NEAR covers 11.6372837084553175 NEAR including the
retained 0.00264 owner-storage reserve. No extra transfer is proposed.

Prepared nonce **275527013000002**, finalized height **275964882**, reference
`2L7eDef5ZqRuRVcoMFw8n8GoNaGUAWTJAkf4XppSyoyw`, transaction hash
`3KHBKLzkE9sUvUXUWPWTxWEdwaGjndCEcTttxSASz6Rq`.
Separate exclusive fsynced outbox:
`artifacts/live/approved-factory-cli-infrastructure.json`; original Meteor outbox
preserved. Generated owner-run offline PowerShell command:
`artifacts/live/sign-approved-factory.ps1`. It uses the existing secure-keychain
key and saves to a local signed file, without broadcast or secret export.
No agent signing, deployment or payment occurred. Awaiting the user's local CLI
execution, then exact-byte signature verification and fresh broadcast preflight.

Installed CLI 0.30.1 help confirmed exact construct/create/transfer/deploy and
save-to-file syntax. Signature regression executed: **1/1 passed**. This is not a
live signature/deployment result. Factory is stateless/default-initialized by design;
there is no extra initializer transaction in the approved factory actions. Verify
its finalized code/no keys/get_config before the separately approved customer call.
Contractor parsing remains explicitly deterministic for payment acceptance; no AI
provider credential, call or dependency is required for that run. INV-0002's
0.001 NEAR/linked order/Babygoat recipient are preserved. Payment authorization
and the review/checkpoint/key-custody prerequisites remain separate and outstanding.

### Superseded bill rejected; live queue gate verified — 2 November, 23:51 WAT (22:51 UTC)

Browser control was available for this run. A fresh **grandtheft.testnet** Meteor
off-chain proof succeeded. In its authorized Grandtheft workspace, the agent used
the normal owner UI to reject **CTR-0001-INV-0001** with exactly
**"Superseded acceptance record"**. Read-only storage verification confirms the
Rejected status, reason and two preserved history entries (including the prior
Under review version). No direct database edits or authorization bypass occurred.
INV-0002 remains Approved, 0.001 NEAR, same ID/order/recipient/current and original
texts. Owner and contractor screens visibly agreed on both statuses, with no
Paid label or transaction link.

Two real owner UI linkage requests for INV-0002 and intended chain order
`ACCEPTANCE-001` both returned: "Payment linkage gated: provision and verify this
organization's vault, then configure its reviewed payment adapter." This ID is
only an intended future chain order; the existing billing order is off-chain.
Live storage confirms **zero intents and zero payment jobs** for INV-0002.
Exactly-one live job acceptance therefore **has not passed**. The gate was not
weakened to create a job against an absent vault/order.

The actual production app was stopped/restarted. At **22:51:01.788 UTC**, fresh
read-only SQLite connections confirmed Rejected/Approved records persisted and
the counts remained zero. Refreshed contractor My payments visibly displayed the
same statuses/reference/recipient and no Paid label. Two separate real worker CLI
startup attempts (`--once`) exited at the authorization gate with
"Worker disabled pending specific transaction authorization." Neither loaded a
signer or broadcast a transaction. Both execution and provisioning enable flags
remain false. Evidence is appended to
`artifacts/local-checks/real-contractor-acceptance.jsonl`.

Executed separately: `node --test tests/contractor-payments.test.ts tests/worker.test.ts`
passed **11/11**. The held-job fixture now explicitly repeats the identical import
25 times, reopens both databases, and verifies one intent/one held job with null
hash/signature/attempt. Existing tests preserve submitted/paid claims across
restart, reject another invoice/order claim, and keep unknown transactions blocked.
These are controlled fixtures, not a live transfer or independent security review.

Read-only deployment refresh at **22:46:42.673 UTC**: finalized height
**275963379**, protocol 88, validity 86400, original hash UNKNOWN_TRANSACTION,
unchanged old nonce **275527848000002**, unchanged balance
**11999868762049999999999999 yoctoNEAR**, factory and customer absent. Evidence:
`artifacts/local-checks/transaction-watch-1793659602675.json`.
The original attempt remains conclusively expired without inclusion. Current
blocker is completing the already-approved owner-run offline CLI factory handoff,
then approved customer initialization and finalized verification; no replacement
has been prepared/signed/broadcast. Existing approvals remain valid only within
their exact conditions. The monitor remains paused after resolving expiry.

`CONTRACTOR_PAYMENT_ACCEPTANCE_PLAN.md` now binds the future run to INV-0002 and
excludes rejected INV-0001. A signable payment plan remains conditional on verified
provisioning, current chain order, reviewed worker/key/checkpoint, security-review
prerequisites and fresh gas/storage/expiry calculations. Payment authorization is
separate from provisioning approval. Confirmed transfer, recipient balance delta,
transaction link, accounting and matching Paid statuses remain **unexecuted**.

### Real two-account contractor review completed — 2 November, 23:36 WAT (22:36 UTC)

The user completed clarification on **CTR-0001-INV-0002** and approved it in
Grandtheft's owner workspace. Read-only inspection at 22:36:07 UTC confirms
invoice `498f003c-7a11-458f-b3c6-f9d230c245b9` is **Approved**, reasons empty.
Current text correctly names `ACCEPTANCE-001`; original underscored text remains
unchanged. The same invoice reference, order `3742ad13-9edd-41b7-b51c-e0d6f4c480e1`,
amount **0.001 NEAR**, and fixed recipient **babygoat.testnet** are preserved.
History retains the earlier conflicting clarifications and corrected Submitted
version. The extraction used for this correction is explicitly **deterministic:
no AI request made**. No model success is inferred.

The actual production app process was stopped and restarted using the same live
databases. A fresh read-only connection at **22:36:50.935 UTC** verified the same
Approved record and invariants, with two total invoices and no duplicate created
by clarification/restart. Evidence is appended to
`artifacts/local-checks/real-contractor-acceptance.jsonl`.

This establishes the user-operated real Meteor invitation/wallet proof → owner
approval → invoice submission → clarification → owner review journey, with
Grandtheft as owner and Babygoat as contractor. Browser control remained unavailable;
UI actions/results were user-operated and confirmed against actual backend storage.
Post-restart UI rendering is not independently observed. Real cross-organization
denial/revocation for this contractor journey remain unexecuted; controlled fixture
coverage is recorded separately. Earlier real two-wallet owner checks are preserved.

INV-0001 remains Under review with its source/order conflict; it was not moved,
approved or deleted. It should be rejected as the superseded acceptance record
through owner review. **Approved is off-chain billing review, not Paid.** No queue
link, transfer or transaction URL exists for INV-0002. Live provisioning/payment
acceptance and successful real AI extraction remain incomplete; gates stay disabled.

### Clarification feedback repair — 2 November, 22:34 UTC

User reported clarification would not submit and owner approval was disabled.
Read-only live storage showed **two** invoices with inverse reference conflicts:
INV-0001 is linked to `ACCEPTANCE_001` but names `ACCEPTANCE-001`; INV-0002
is linked to `ACCEPTANCE-001` but names `ACCEPTANCE_001`. Clarification attempts
on INV-0002 were saved, but retained the conflict. Approval remained blocked.
Creating a similar order cannot reassign an existing invoice claim.

Actual UX defects: invoice cards omitted the linked order reference and a generic
submission notice implied owner review even when clarification was still needed.
Cards now display the server-derived linked reference, including historical rows.
Submission feedback reports the returned status and remaining reasons. An
unresolved clarification retains the editor and same invoice so it can be corrected;
each subsequent edited submission receives its own idempotency key. Original text,
invoice reference, claimed order, fixed recipient and approval checks are preserved.
No direct live record edits were made.

Executed: **80/80 backend tests passed**, **12/12 desktop/mobile contractor browser
tests passed**, and production build including TypeScript passed. Production
HTTP/browser/process-restart fixture acceptance passed at
**22:32:57.040 UTC**, including unresolved clarification feedback/editor retention,
subsequent successful correction, original text/reference/order preservation,
organization denial and revocation. Evidence:
`artifacts/contractor-acceptance/1793658761392/result.json`.
This uses controlled wallet/RPC fixtures, not real Meteor acceptance or independent
security review. The live production app was restarted; a 22:34 read-only snapshot
confirmed both real invoices and their original states persist. The user was asked
to correct **INV-0002** using the hyphenated reference on its existing order.
Real final correction/approval is still pending. Successful real-model extraction
is also unverified (OpenRouter rate limits); deterministic extraction is labeled.

### Original deployment attempt conclusively expired — 2 November, 22:28 UTC

Read-only RPC at **22:28:18.927 UTC** observed finalized height **275961459**,
block `4DqfVhNu1Z3AdqQQM2d7nZ9MTifSUwweADm5o9biT8Ky`. This is strictly
greater than reference height 275874998 + validity 86400 = **275961398**.
Protocol remains 88; canonical reference hash is unchanged. Original hash
`HafBR1uMZJFfN3U1v7x72s1LQiFCDkPoE6KqS5dhBSyk` is UNKNOWN_TRANSACTION,
old key nonce remains **275527848000002**, owner balance remains
**11999868762049999999999999 yoctoNEAR**, and factory/customer are absent.
Thus the old attempt can no longer become valid; this is expiry without inclusion,
not a successful deployment or a chain failure receipt. No fee or transfer from
that attempt was observed. Evidence:
`artifacts/local-checks/transaction-watch-1793658498929.json`.

The original outbox is retained. Reconciliation moved to the already approved
owner-run CLI handoff; the recurring expiry monitor was **paused** after resolution.
No replacement has been prepared, signed or broadcast. Fresh owner proof and full
CLI-key/protocol/fee/artifact/balance/target preflight remain required before the
exclusive offline-signing handoff. Existing approval digests are unchanged.
Provisioning, initialized ownership, live recovery and payment acceptance remain
incomplete; execution gates stay disabled.

### Two-account manual Meteor journey and discovered reference conflict — 2 November, 22:10 UTC

The user chose to retain Grandtheft workspace, with **grandtheft.testnet as owner**
and **babygoat.testnet as contractor**. The first self-account wallet request was
rejected. Live storage subsequently recorded a fresh, non-simulated Babygoat
proof (request `66a7cf27-96cc-49d6-ba93-ff6d5c21474d`, key
`ed25519:7k3VsFcQyPR1w3TouKRirQgKfjgeypkAMXQtQjPE5e91`, verified at
`2026-11-02T21:57:21.564Z`, link generation 2). Grandtheft's owner approval
persisted wallet `babygoat.testnet`, version 1, with no pending request. These
steps were user-operated real Meteor/app actions, verified through read-only
inspection of actual live storage; they are distinct from automated fixtures.

Two off-chain acceptance orders were created, both 0.001 NEAR to Babygoat:
`ACCEPTANCE-001` (`3742ad13-9edd-41b7-b51c-e0d6f4c480e1`) and
`ACCEPTANCE_001` (`b185e3f4-681a-4d93-b77d-9f2427afcd18`). One invoice was
submitted at **22:04:21.997 UTC**, ID `fed34484-a85f-42b1-9e96-5890e682f4ae`,
reference **CTR-0001-INV-0001**. Amount 0.001, asset NEAR, fixed recipient
Babygoat, transaction URL null. The original text was saved exactly. This is an
explicit acceptance-only billing record, not a claim of real work or payment.

**Actual defect found:** the text named the hyphenated reference, but the invoice
was bound to the separate underscored order. Earlier validation compared amount,
currency and recipient without checking mentions of other known approved order
references. It accepted the submission as Submitted with no reasons. No transfer
or queue linkage occurred; both orders are off-chain and provisioning is gated.

**Fix:** bounded-reference matching now distinguishes hyphens/underscores and
avoids prefix matches. New mismatched/multiple-reference submissions require
clarification. Existing records expose current source issues on read, and owner
approval independently rechecks source/order agreement; old Submitted records
cannot bypass the new guard. Resuming an intent also requires a currently reviewed
invoice without clarification issues. Existing claims are never reassigned.
A regression test covers this exact case, historical records, blocked approval,
clarification, original-text/reference/order preservation and restart.

Executed after the reference fix: **80/80 owner/backend tests passed**, TypeScript
and production build passed. The updated production restart fixture acceptance
also passed, completed **22:09:23.222 UTC**; evidence
`artifacts/contractor-acceptance/1793657342157/result.json`. The earlier full
50-case desktop/mobile browser run preceded this backend-only reference fix.

The actual live app was stopped/rebuilt/restarted using the same databases.
Read-only verification at **22:10:22 UTC** confirmed the same Babygoat wallet
version, both orders, invoice ID/reference/status, exact original text and fixed
recipient persisted. The new checker identified the source-reference conflict.
The user was asked to request clarification, correct current text to
`ACCEPTANCE_001` on the **same invoice**, then approve it as Grandtheft. That final
real review/correction and refreshed UI confirmation remain pending at this
checkpoint. No original text was overwritten or private record moved.

Concise real evidence is retained in ignored
`artifacts/local-checks/real-contractor-acceptance.jsonl`. No raw invitation tokens,
private keys or seed phrases are recorded. Real cross-organization denial,
receipt-backed payment acceptance and successful real-model extraction are not
inferred from these steps. Deployment/payment gates remain disabled; no payment
transaction link or fee exists for this test.

### Real contractor wallet submission — 2 November, 21:53 UTC

The user manually completed invitation entry and Meteor wallet verification.
Read-only inspection of the actual live databases confirms profile
`071473ed-ec53-4b38-9aee-8929f48f6999` (Grandtheft acceptance), active link
generation 1, no approved wallet yet, and pending request
`bbaf8541-eb66-407a-a960-5181a2b4ac76` for `grandtheft.testnet`.
The stored request has `simulatedProof: false`, finalized-key-verified public key
`ed25519:4zTXZ9GfZztRiT3QazNKF9aoKYnxfpxwTKbh6A2L8qZX`, and verification
timestamp **2026-11-02T21:52:38.376Z**. This is actual live application storage,
separate from controlled wallet/RPC fixtures. The proof remains pending owner
approval; it is not a payment or vault authorization.

The organization is `e3600323-ad40-43c4-a31d-7d53abc4833e` (Grandtheft
workspace), whose recorded creator is **grandtheft.testnet**. Thus the current
profile/request uses the same account for organization owner and contractor;
it does **not** establish the intended two-account journey with Babygoat as owner.
No records were moved or ownership granted. The user was asked whether to retain
this workspace and verify Babygoat as contractor, or recreate the invitation in
Babygoat's authorized workspace with the original roles. Approval, invoice
submission, real record isolation and restart acceptance remain pending.

### Read-only reconciliation checkpoint — 2 November, 21:49 UTC

Finalized testnet height **275957339**; original hash still UNKNOWN_TRANSACTION,
old key nonce **275527848000002**, balance **11999868762049999999999999 yoctoNEAR**,
factory/customer absent. Validity remains **86400 blocks** and the canonical
reference hash is unchanged. **4,060 blocks** remain to first conservative
expired height **275961399**. Evidence:
`artifacts/local-checks/transaction-watch-1793656143163.json`.
Original outbox retained; no replacement prepared, signed or broadcast. Monitor
remains active. This local evidence does not constitute a provisioning pass.

### Contractor extraction and held payment linkage — 2 November, 21:38 UTC

Implemented locally without contract changes or a push. Existing contractor
storage, original-text preservation, wallet proofs, owner isolation, revocation
and submission claims remain in place. Added a server-only OpenRouter adapter,
strict schema/grounding checks, explicitly labeled deterministic fallback,
saved contractor/session/source-bound previews and required confirmation. The
preview displays the stated currency, amount, wallet/reference claims and quoted
evidence; fixed recipients are labeled as supplied from the approved work order.
Range/multiple/source-conflicting amounts require clarification independently of
model output. AI has no tools, approval path or payment authority.

Owner-controlled invoice linkage now verifies provisioned organization scope,
finalized approved on-chain order, active vendor, immutable recipient and exact
amount. Durable intent/import guards survive either side of the two-database
handoff; imported jobs remain held in review. A retry does not reset a pending or
terminal claim. Paid/a transaction link requires fresh matching finalized payment
state and the existing transaction-marker verification, not a local queue label.
Cross-source invoice-reference collisions block rather than overwrite; the
adapter still supports one explicitly configured organization/vault per app.

**Executed automated checks (controlled fixtures, not real Meteor acceptance):**

- Root `npm test`: **42/42 passed**.
- `apps/owner` `npm test`: **79/79 passed**, including ten new extraction,
  confirmation/isolation, source-ambiguity, multiple-work-order clarification and payment-intent restart cases.
- Type generation / TypeScript and production `npm run build`: **passed**.
- Browser suite: **50/50 desktop/mobile cases passed** on the stable build.
  This includes the separately present interface regression cases; these results
  are automated checks, not an independent security review.
- `npm run test:contractor-acceptance`: **passed** on the final build. Actual
  Next.js process shutdown/restart, real SQLite files, actual HTTP routes and
  cryptographic signature checks used controlled HTTPS RPC and wallet fixtures.
  Extraction was visibly deterministic and submission required confirmation.
  Original text/reference, approved wallet/order and Under review persisted;
  retries, duplicate claims, currency clarification, unrelated-owner denial and
  link revocation passed. Latest evidence:
  `artifacts/contractor-acceptance/1793655333115/result.json`, completed
  **2026-11-02T21:35:57.097Z**. Invoice reference `CTR-0001-INV-0001`, status
  Under review, transaction URL null. No public-chain payment was made.

**Actual provider and wallet results (separate from fixtures):**

- The user's private `OPENROUTER_API_KEY` loads correctly, with expected prefix
  and no whitespace. No key value was printed or committed. `.env.local` and the
  original transaction outbox remain Git-ignored.
- Real requests to OpenRouter for synthetic text using
  `nvidia/nemotron-3.5-super-vl:free` returned **HTTP 429**, including the fresh
  **21:10:52 UTC** check. The adapter reported the status and used deterministic
  fallback. Successful real-model output/accuracy remains **unverified**; schema,
  injection, invalid output and provider-failure handling passed with fixtures.
- Real Babygoat Meteor login and return to its on-chain-owner workspace were
  observed. The full real invitation → Grandtheft wallet proof → owner approval
  → invoice submission journey is **not passed**. Brave control disconnected and
  old signing windows expired; the user reported signing failure. Browser access recovered and another fresh Babygoat proof succeeded; its
  owner workspace was observed. Browser control then detached again on opening
  contractor records. The user has been given the manual invitation/wallet-proof
  steps; these are pending, not counted as executed acceptance. No signature result or contractor acceptance is inferred from the
  earlier login. Previous completed two-wallet owner checks remain unchanged.

**Failures / limits:** early UI patch anchors differed because interface changes
were present; edits were adapted without reverting those changes. Type checking
caught and fixed one test fetch-call signature and an owner-response union type.
An initial browser run used a production server from before a rebuild and stalled
on stale assets; it was stopped, the server restarted on the completed build and
all 50 cases passed. No authorization guard was weakened to address these errors.
Public-testnet queue linkage, receipt-backed Paid display and payment/worker
restart acceptance remain unexecuted because provisioning/review/transaction
authorization prerequisites are still outstanding. Rust was unchanged and its
protocol matrix was not rerun for these TypeScript changes.

`CONTRACTOR_EXTRACTION_AND_QUEUE.md` documents current behavior and limitations.
`CONTRACTOR_PAYMENT_ACCEPTANCE_PLAN.md` prepares the one-payment runbook but is
not an exact signable authorization: worker/key/checkpoint/expiry/storage/gas
details must be finalized and independently reviewed before requesting separate
approval. Transaction links and payment fees for this run: **none**. Provisioning,
worker activation, payments, unpause and checkpoint installation remain disabled;
no new transaction has been signed/broadcast and no code pushed for this work.

### Scheduled read-only checkpoint — 2 November, 21:06 UTC

Finalized testnet height **275952843**, block
`59ZbxrF2LRjcUBhPRDXSe9YjNhyJQXYf5bsZFjQiEE6b`: original transaction remains UNKNOWN_TRANSACTION.
Old key nonce **275527848000002**, balance **11999868762049999999999999
yoctoNEAR**, absent factory/customer, validity **86400 blocks** and canonical
reference hash remain unchanged. **8,556 blocks** remain to first conservative
expired height **275961399**. Original outbox preserved; no replacement prepared,
signed or broadcast. Evidence: `artifacts/local-checks/transaction-watch-1793653586482.json`.
Monitor remains active; this checkpoint is local and unpushed.

### Scheduled read-only checkpoint — 2 November, 18:06 UTC

Finalized testnet height **275933944**, block
`F9PcfDp4WMHUx3Y1yvdfA2zZG5vTJqoUesVawij1nz3y`: original transaction remains
UNKNOWN_TRANSACTION; old key nonce **275527848000002**, balance
**11999868762049999999999999 yoctoNEAR**, factory/customer absence, 86400-block
validity and canonical reference hash are unchanged. **27,455 blocks** remain
to first conservative expired height 275961399. Original outbox retained; no
replacement prepared, signed or broadcast. Monitor stays active. Full ignored
evidence: `artifacts/local-checks/transaction-watch-1793642817973.json`.
This checkpoint is local; no additional push was made by the monitor.

### Scheduled read-only checkpoint — 2 November, 17:17 UTC

Finalized testnet height **275928774**, block
`6KsCPngYoujeKVTd8RiXxQXZEiLuLxJzJY1kTcqjq6yf`: original transaction remains
UNKNOWN_TRANSACTION; old key nonce **275527848000002**, balance
**11999868762049999999999999 yoctoNEAR**, factory/customer absence, 86400-block
validity and canonical reference hash are unchanged. **32,625 blocks** remain
to first conservative expired height 275961399. Original outbox retained; no
replacement prepared, signed or broadcast. Monitor stays active. Full ignored
evidence: `artifacts/local-checks/transaction-watch-1793639853029.json`.
This checkpoint is local; no additional push was made by the monitor.

### Scheduled read-only checkpoint — 2 November, 16:47 UTC

Finalized testnet height **275925698**, block
`G6dQEd1zkw3F3BtEQsN6dPnvgBpnU5QgE4tJFfhXNhZ3`: original transaction remains
UNKNOWN_TRANSACTION; old key nonce **275527848000002**, balance
**11999868762049999999999999 yoctoNEAR**, factory/customer absence, 86400-block
validity and canonical reference hash are unchanged. **35,701 blocks** remain
to first conservative expired height 275961399. Original outbox retained; no
replacement prepared, signed or broadcast. Monitor stays active. Full ignored
evidence: `artifacts/local-checks/transaction-watch-1793638062839.json`.
This checkpoint is local; no additional push was made by the monitor.

### Scheduled read-only checkpoint — 2 November, 16:19 UTC

Finalized testnet height **275922866**, block
`4BycSyMFFRhSHwm3XmifW3ptrjhrp5V3UfUrmX9CvcNT`: original transaction remains
UNKNOWN_TRANSACTION; old key nonce **275527848000002**, balance
**11999868762049999999999999 yoctoNEAR**, factory/customer absence, 86400-block
validity and canonical reference hash are unchanged. **38,533 blocks** remain
to first conservative expired height 275961399. Original outbox retained; no
replacement prepared, signed or broadcast. Monitor stays active. Full ignored
evidence: `artifacts/local-checks/transaction-watch-1793636397521.json`.
This checkpoint is local; no additional push was made by the monitor.

### Scheduled read-only checkpoint — 2 November, 15:48 UTC

Finalized testnet height **275919691**, block
`HWE4mCAbGN1PszBJL422TGwGr98bR9XqRYvaULp5w974`: original transaction remains
UNKNOWN_TRANSACTION; old key nonce **275527848000002**, balance
**11999868762049999999999999 yoctoNEAR**, factory/customer absence, 86400-block
validity and canonical reference hash are unchanged. **41,708 blocks** remain
to first conservative expired height 275961399. Original outbox retained; no
replacement prepared, signed or broadcast. Monitor stays active. Full ignored
evidence: `artifacts/local-checks/transaction-watch-1793634506170.json`.
This checkpoint is local; no additional push was made by the monitor.

### Push preparation and read-only checkpoint — 2 November, 15:39 UTC

The user explicitly authorized pushing all recent changes. Publication covers
the persistent/demo contractor source, tests, documentation, setup plans and
the separately prepared synthetic interface audit; it grants no deployment or
payment authority. Prior "local/unpushed" notes below describe their original
execution checkpoints. Local databases, credentials, outboxes, disposable test
keys and generated acceptance artifacts remain ignored and excluded.

Read-only FastNEAR finalized height **275918730**, block
`7i1hawnVpd2kQ5QKd83FHDh5FvR9VQbH414Zrm9zpftt`: original transaction remains
UNKNOWN_TRANSACTION, old key nonce **275527848000002**, balance
**11999868762049999999999999 yoctoNEAR**, factory and customer targets absent.
Validity remains **86400 blocks** and canonical reference hash remains
`GNSR9Np2gfHsUuajUJTk4h7EWJ9xxYbfiVGvCpS47B1y`. **42,669 blocks** remain to
first conservative expired height 275961399. No replacement preparation,
signing or broadcast. Monitor remains active. Full ignored evidence:
`artifacts/local-checks/transaction-watch-1793633962574.json`.

### Scheduled read-only checkpoint — 2 November, 11:58 UTC

Finalized testnet height **275895545**, block
`7LnC1F45gza29TswrmNjikHaoowuGn9o2kPH4ZDtVkFv`: original hash remains
UNKNOWN_TRANSACTION; old FullAccess nonce **275527848000002**, balance
**11999868762049999999999999 yoctoNEAR** and absent factory/customer targets
are unchanged. Protocol 88, validity **86400 blocks** and canonical reference
275874998 hash `GNSR9Np2gfHsUuajUJTk4h7EWJ9xxYbfiVGvCpS47B1y` are unchanged.
**65,854 blocks** remain to first conservative expired height 275961399.
Original outbox preserved; no replacement preparation/signing/broadcast.
Monitor retained with no actionable change. Full ignored local evidence:
`artifacts/local-checks/transaction-watch-1793620698154.json`.

## 2 November — persistent private contractor backend

Implemented actual HTTP/SQLite storage behind existing verified owner identity
and organization authorization. Default `/contractor` uses the persistent adapter;
demo now requires `?mode=demo`. No demo data migration, contract change, transaction
signing, deployment, worker activation, payment or GitHub push occurred. See
[PERSISTENT_CONTRACTOR_PORTAL.md](PERSISTENT_CONTRACTOR_PORTAL.md) for exact use,
authorization, storage, states, parsing and limitations.

### Actually executed locally

| Check | Result |
| --- | --- |
| Node regression suite | **69/69 passed**, including six new backend cases: real Ed25519/NEP-413 verification, replay/expiry/key removal, organization/contractor isolation, immediate revocation, restart, source preservation, wallet changes, linked-owner changes and demo/database separation |
| Production build and TypeScript | Passed, including the nested persistent contractor API route |
| Desktop/mobile regression suite | **42/42 passed** after persistent adapter integration; demo URLs were made explicit |
| Actual app-process restart acceptance | **Passed** via `npm run test:contractor-acceptance`; production Next.js stopped and restarted with the same database files |

The restart run created an authorized contractor profile/link, verified a signed
wallet request, approved its wallet/work order, submitted through its private link
using only work text and requested amount, and rendered the same invoice in the
owner panel. Before/after restart, the profile, approved wallet, immutable order,
original whitespace-preserving text, invoice ID/reference and **Under review**
state persisted in actual HTTP reads and owner/contractor browser views. Retry
returned the same invoice; a different claim on its order failed. A foreign-currency
source remained **Needs clarification**, could not be approved, and subsequent
clarification preserved the original source/reference. Unrelated organization
reads and revoked capabilities were denied. No Paid state or transaction link
was fabricated.

Final restart artifact directory:
`artifacts/contractor-acceptance/1793619889823/` — `result.json` reports passed,
with `owner-before-restart.png`, `owner-after-restart.png`,
`contractor-after-restart.png` and process logs. Its first invoice reference is
`CTR-0001-INV-0001`, status Under review, transaction URL null.
The harness uses disposable wallet keys and a controlled HTTPS RPC upstream;
actual SQLite, HTTP, application process, browser views and cryptographic checks
are exercised. **Real Meteor extension/public-testnet contractor acceptance was
not executed**, and no real user message signature was requested. Earlier real
two-wallet owner acceptance is preserved separately.

Initial failures, corrected: Node strip-only execution rejected new TypeScript
parameter properties (replaced with explicit fields); one test accidentally reused
an idempotency key for a different order (the guard correctly rejected it; fixed
fixture key); the first two restart harness attempts reused an owner browser with
stale verification state after focus/restart. The harness now closes that owner
context and establishes a fresh signed owner session after restart, preserving the
existing logout/session guards. These attempts are not counted as passing runs.

**Extraction: deterministic labeled parsing only. No AI provider, AI extraction,
OCR or mocked AI output.** Live billing work orders remain off-chain records;
contract work-order linkage, live payment evidence reconciliation and production
deployment/security acceptance remain incomplete. No persistent API can mark an
invoice Paid or initiate a transfer. Payment execution and provisioning gates
remain unchanged; local passing tests do not complete Milestone 1.

### Separate deployment reconciliation

Read-only FastNEAR checkpoint at approximately 11:38 UTC: finalized height
**275893381**, block `79eb2r7bnhd7PMkKLRXZjoepdErLcMr76XHzmkRGVrxJ`.
Original infrastructure hash remains UNKNOWN_TRANSACTION; old key nonce
275527848000002 and balance 11999868762049999999999999 yoctoNEAR are unchanged.
Factory/customer targets remain absent; validity is still 86400 blocks. First
conservative expired height remains **275961399** (68,018 blocks away). Original
outbox/conditional approvals and recurring read-only monitor remain intact.
No replacement was prepared, signed or broadcast. Full ignored evidence:
`artifacts/local-checks/transaction-watch-1793619501028.json`.

### Scheduled read-only checkpoint — 2 November, 11:14 UTC

Finalized testnet height **275890945**, block
`51pR6SCmEZaG6r5aMbjGRLcxTFcYH2QK4UCJj2tibbQG`: original hash still
UNKNOWN_TRANSACTION; old FullAccess key nonce **275527848000002** and balance
**11999868762049999999999999 yoctoNEAR** unchanged. Factory and customer target
remain absent. Protocol 88, validity **86400 blocks** and canonical reference
hash `GNSR9Np2gfHsUuajUJTk4h7EWJ9xxYbfiVGvCpS47B1y` at 275874998 are unchanged.
**70,454 blocks** remain to first conservative expired height 275961399.
Original outbox preserved; no replacement preparation, signing or broadcast.
Monitor retained with no actionable change. Full ignored local evidence:
`artifacts/local-checks/transaction-watch-1793618092851.json`.

## 2 November — automatic invoice references and fixed testnet currency

Contractor and owner-entered invoice forms no longer request an invoice number.
Successful server submission allocates a durable contractor-specific sequence
and stores the invoice/reference/idempotency claim atomically. Exact retries
return the saved record; changed payloads under an existing submission key fail,
and different submissions cannot claim the same approved work order. Clarification
preserves the invoice ID/reference. Owner entry applies the same allocator in its
authorized organization queue (live) or isolated persistent demo queue (mock).
Saved references appear through existing invoice/detail/history rendering.

Both forms display **Currency: NEAR · Testnet**. Server submission enforces NEAR
and rejects recognized conflicting source currencies before persisting an invoice;
the contractor preview flags the conflict instead of presenting the amount as
converted NEAR. No conversion, contract change, deployment, signing, payment or
GitHub push occurred. The original deployment outbox and reconciliation gate are
unchanged; earlier real-wallet acceptance evidence is preserved.

Actually executed locally: **63/63 Node tests passed**, including four new cases
for permanent/idempotent sequences, source-currency rejection, restart behavior
and independent concurrent SQLite writers. The first expanded Node run exposed
a constructor WAL lock race; installing `busy_timeout` before WAL setup fixed it.
The final production build and its TypeScript check passed. An earlier build
failed on unbranded account/amount values in the new test fixture; fixture values
now use the existing validated constructors.

A subsequent expansion of recognized currency codes initially matched ordinary
lowercase words such as “all” as ISO codes (**55/63 Node tests passed**). ISO codes
now require uppercase outside explicit currency/amount labels, while common
unambiguous codes and currency names remain case-insensitive. Ordinary invoice
prose is retained in the regression fixture; the corrected Node run passed **63/63**.

Initial browser run: **38/42 passed**. New currency tests needed to bring the
contractor tab to the foreground/wait for the approved work order and locate the
owner error inside the active dialog. Those test synchronization/locator fixes
are in place; the final full rerun passed **42/42 desktop/mobile browser tests**.
After broadening currency-code coverage and correcting the persistence banner,
the follow-up full run passed **41/42**: the desktop isolation test read the first
contractor's still-displayed link before the second link response completed.
The test now waits for a different link and asserts “Hello, Designer.” before
checking that contractor's empty records. No authorization guard was changed.
The corrected full invite/review/isolation journey then passed **2/2 targeted
desktop/mobile executions**. Thus all 42 browser scenarios have executed
successfully; the last full invocation was 41/42 followed by that 2/2 rerun,
not a claimed fresh 42/42 invocation. The final build/typecheck and Node 63/63
results above are for the final application source. Manual browser inspection
confirmed the removed reference input, automatic-reference explanation and fixed
currency label; screenshot: `artifacts/contractor-auto-reference-preview.png`.
These are mock/local integration results, not real-wallet or payment acceptance.

### Scheduled read-only checkpoint — 2 November, 10:38 UTC

Finalized testnet height **275887114**, block
`HKdE8CF4xnR6R2qPXXma8vksSwQthKjEqtEUJf55g7AM`: original hash remains
UNKNOWN_TRANSACTION; old FullAccess nonce **275527848000002**, owner balance
**11999868762049999999999999 yoctoNEAR**, and absent factory/customer targets
are unchanged. Protocol 88 still reports validity **86400 blocks**, and reference
275874998 retains canonical hash `GNSR9Np2gfHsUuajUJTk4h7EWJ9xxYbfiVGvCpS47B1y`.
**74,285 blocks** remain to first conservative expired height 275961399.
Original outbox preserved; no replacement prepared, signed or broadcast.
Monitor retained; no actionable change. Full ignored local evidence:
`artifacts/local-checks/transaction-watch-1793615899116.json`.

### User-requested read-only checkpoint — 2 November, 10:27 UTC

Finalized testnet height **275885969**, block
`EkaCen8fmZjanahbQVo4GqscxB6JaaXPqZtc9kjykEYN`: original transaction
still UNKNOWN_TRANSACTION; old key nonce **275527848000002** and owner balance
**11999868762049999999999999 yoctoNEAR** unchanged. Factory and customer target
both remain absent. Protocol 88, validity 86400 and canonical reference hash
remain unchanged. **75,430 blocks** remain to first conservative expired height
275961399. No replacement preparation/signing/broadcast; original outbox retained.
Full ignored local evidence:
`artifacts/local-checks/transaction-watch-1793615232595.json`.

### Scheduled read-only checkpoint — 2 November, 10:07 UTC

FastNEAR testnet finalized height **275884057**, block
`GGJun5Tz6ywkTtGpCFLwWVU8m7j8aWEBCiNXqgHUY2Fq`, still precedes
the first conservative expired height **275961399** (77,342 blocks remain).
Protocol 88 still reports transaction validity **86400 blocks**; canonical
reference height 275874998 still hashes to
`GNSR9Np2gfHsUuajUJTk4h7EWJ9xxYbfiVGvCpS47B1y`.
Original transaction remains UNKNOWN_TRANSACTION. At that same finalized block,
the old FullAccess key nonce remains **275527848000002**, Grandtheft's balance
remains **11999868762049999999999999 yoctoNEAR**, and both factory and customer
vault remain absent. No replacement preparation, signing or broadcast occurred;
the original outbox is preserved. Monitor remains active with no actionable
change. Full local RPC evidence:
`artifacts/local-checks/transaction-watch-1793614035755.json` (ignored).

## 2 November — contractor mock portal, separate from live acceptance

The user explicitly authorized this mock implementation while the original
infrastructure transaction stays under read-only monitoring. The new portal is
available at `/demo/contractors` for demo owners and private `/contractor#…`
capabilities for contractors, with typed HTTP mock adapters and a separate
durable SQLite store. All screens label simulated data and simulated wallet
proof. No real wallet receives synthetic records. No chain client/signer or
payment/deployment method exists in this adapter/API. Contract code/interface,
live owner/organization guards and approved transaction plans are unchanged.

Implemented and exercised: owner-created profiles/private links; initial
simulated wallet request and owner approval; immutable approved work orders;
text-first bills, bounded TXT/PDF/PNG/JPEG attachments, formatted preview and
missing-detail clarification; mismatch review without rule overrides; contractor
invoice/status views; owner-requested clarification and corrected resubmission;
owner-approved wallet changes affecting only future orders; link replacement /
revocation invalidating sessions and pending wallet approvals. Binary uploads
are attachment-only; no OCR/AI or live contractor proof was added. See
[CONTRACTOR_PORTAL.md](CONTRACTOR_PORTAL.md) for limits and reproduction.

### Actually executed locally on Windows

| Check | Final result |
| --- | --- |
| Owner application `npm test` | **59 passed, zero failures**: prior 49 plus 10 contractor domain/security cases |
| Type checking / production build | Passed; final build emitted no tracing warning |
| Full desktop/mobile `npm run test:browser` | **38 passed, zero failures**, including 10 new contractor executions and prior 28 owner/onboarding cases |
| Domain restart/duplicate/isolation tests | Executed: durable invoice claims and revocation survive SQLite restart; unrelated owners/contractors denied |
| Browser race / access tests | Executed: concurrent submissions yield exactly one accepted invoice; invalid fragment changes and delayed old responses cannot revive access |
| Live flags | `NNETICS_PROVISIONING_ENABLED` and `NNETICS_TRANSACTIONS_AUTHORIZED` remain disabled |

Initial targeted browser run: **4/8 passed**. Two failures per viewport exposed
an unhandled same-page URL-fragment invitation switch and a test locator collision
with Next's route announcer. The switch now clears/fences private state before
exchange, and failed exchanges invalidate prior server sessions; the locator was
scoped to the actual error. The next full run passed **36/38**, exposing a loading
state that never completed when revoked access incremented the response
generation during initial refresh. The error path now explicitly exits loading
and remains denied. A delayed-snapshot regression was added. The final full
**38/38** run passed after that fix. These failures were not suppressed or counted
as passing attempts. The initial build's broad filesystem-tracing warning was
resolved by the same explicit dynamic-path tracing annotation used elsewhere.

The paid-history link case is a controlled display fixture with an allowlisted
testnet explorer URL, clearly labeled simulated; it is **not** a real transaction
or payout result. New submitted demo invoices have no transaction. All real
contractor signatures, live payment reconciliation and production invitation
deployment remain **unimplemented/unverified**. Prior real two-wallet owner
checks are preserved, not rerun or replaced by mock results. No Rust changes or
new Rust/Linux executions were needed for this portal; `c655800` CI results below
remain historical evidence for those exact contract artifacts only. Passing these
tests is not independent security review and does not complete Milestone 1 or
live onboarding.

The existing `nnetics-transaction-expiry` heartbeat was inspected and retained.
An additional read-only checkpoint while the browser suite ran returned finalized
height **275883550**, block `DQzqwPEbYxHFo2DtT3RnNYDMbsHVqdXgMtkJQEnkJqLH`,
and UNKNOWN_TRANSACTION for the original recorded hash. It is below the expiry
gate. No signing, deployment, top-up, payment, authority change or GitHub push
occurred. Portal source, tests and documentation remain local/unpushed.

## 2 November — funded, Meteor verified, factory wallet policy blocked

**Read-only watch requested and scheduled:** the user instructed continued
checks until confirmation or conclusive expiry, then continuation under existing
conditional approvals. A thread heartbeat `nnetics-transaction-expiry` is ACTIVE,
every 30 minutes, quiet while the state is unchanged; it surfaces confirmation,
expiry, failure or required user action and pauses after conclusive resolution
and resumed reconciliation. It does not authorize extra transactions or bypass
the owner-run signing handoff.

Latest read-only checkpoint: finalized height **275880026**, block
`Dkpdkn7L4DmLzSmZsCLR4J6JYjxuowkh3QU6Rk6wgqdp`, timestamp
`1793611699405285506` ns. Original hash remains UNKNOWN_TRANSACTION; old key nonce
275527848000002, owner balance 11.999868762049999999999999 NEAR and absent factory
are unchanged. Canonical block 275874998 returned hash
`GNSR9Np2gfHsUuajUJTk4h7EWJ9xxYbfiVGvCpS47B1y`, timestamp
`1793608767828873875` ns. Across 5028 blocks the observed mean is
**0.5830502012 seconds/block**. There are **81373 blocks** to the first conservative
expired height **275961399**. Estimated remaining wait: **13h 10m 45s**, suggesting
**2 November around 23:39 WAT (Africa/Lagos)**. This is an observed-rate estimate,
not a clock-time expiry guarantee. Finalized height strictly greater than
275961398 and the subsequent hash/nonce/balance/target/reference/validity checks
remain authoritative. No signature or submission occurred in this checkpoint.

**CLI follow-up:** user confirmed Grandtheft is available in the local CLI.
The user subsequently **approved the conditional CLI amendment** digest below.
Post-approval finalized height **275876528**, block
`6tVfCF8EUkbb7aqWC9E2g2M6y3hHmhxtubBC7D3Hyq6i`, still precedes the expiry gate;
old key nonce 275527848000002 and balance 11.999868762049999999999999 NEAR are
unchanged, factory absent. Both approved JSON digests were recomputed successfully.
No replacement was signed or submitted. Approval is retained, but does not waive
conclusive-resolution/expiry conditions. No further approval is needed for the
same exact amendment once those conditions are satisfied.

Read-only official CLI help and secure-keychain public-key lookup returned
`ed25519:6vkGFeDZ2Z8M6mfubE4mYQpdr2d3M7eULrHWuonseBhZ`; no secret export or
signing occurred. This differs from the Meteor proof key. A separate
[owner-run handoff amendment](CLI_FACTORY_HANDOFF_PLAN.md), digest
`bca85c64ac11e4a0a14808d290980c47db89353fa2450930f34022291cc91ae8`, preserves
the exact original action list but changes infrastructure key-control proof to
verified CLI signing. It requires explicit approval and conclusive resolution
before replacement signing. Protocol config reports validity period **86400
blocks**; original reference 275874998 gives a conservative finalized expiry gate
**above 275961398**. Latest observed finalized height 275876027 was below it.
No replacement transaction was prepared/signed. The CLI template has help-checked
action syntax only; full signing/broadcast remains unexecuted.

Finalized preflight height **275873788**, block
`8rDvxVmMwnofRKseBpvybzNV4GrH5qbsEK2y1QoX724Y`, confirmed:
Babygoat **9.878461305613026399999998 NEAR**, Grandtheft
**11.999868762049999999999999 NEAR**. Grandtheft alone covers the unchanged
approved plan's **11.6346437084553175 NEAR** combined upfront requirement.
The separate Babygoat-to-Grandtheft transfer proposal is unnecessary and was
**not executed**. Both targets remain absent; testnet protocol 88 / nearcore
2.14.0-rc.5 and all relevant observed fee/storage parameters match the plan.
The older official RPC returned a deprecation/-429 error, so reads used the
already configured FastNEAR endpoint. No application RPC code was changed.

The local app was restarted. The first fresh Meteor message was not verified
because the server's restricted process could not reach RPC. A read-only Node
probe with network access passed, and the server was restarted with that access.
No signature check or authentication rule was weakened. A new user-approved
NEP-413 message **successfully authenticated Grandtheft** with FullAccess key
`ed25519:4zTXZ9GfZztRiT3QazNKF9aoKYnxfpxwTKbh6A2L8qZX`.
The real UI returned only Grandtheft workspace with zero invoices, contractors
and payments and no linked vault. Previous two-wallet isolation results remain
preserved; no new reverse-switch test is claimed in this continuation.

The existing application bridge handles only the bounded small customer call.
A separate local, exact-plan factory review tool was added at
`apps/owner/scripts/factory-wallet-review.mjs`. It is not a generic payment or
organization authorization path: pinned digest/artifact/signer/three actions,
fresh verified public identity metadata, finalized key/network/funding/fee/target
preflight, localhost-only review, exact origin/body checks and an exclusive fsynced
outbox before the wallet request; no server signing/broadcasting or key export.
Syntax check and actual **read-only live preflight** passed at height 275874557.
These do not establish independent security review or successful wallet support.
No contract source changed; no new Linux CI was run for this local tool.

The tool prepared exactly the approved CreateAccount / 6.3324 NEAR Transfer /
pinned DeployContract transaction, receiver `v.grandtheft.testnet`:

- Original transaction hash: `HafBR1uMZJFfN3U1v7x72s1LQiFCDkPoE6KqS5dhBSyk`.
- Nonce: `275527848000003`; prepared against finalized height **275874998**.
- Exact bytes/hash/public key are retained in ignored local artifact
  `artifacts/live/approved-factory-infrastructure.json`; never replace/delete it
  merely to obtain a fresh nonce.
- The user reported Meteor's **Contract deployment blocked** protection: apps
  cannot submit this DeployContract action. This is a real wallet-policy failure,
  not a contract rejection or gas/storage failure. The review UI timed out without
  an authoritative success response. Its server was stopped; do not retry this
  unsupported deployment through the app or disable the wallet protection.

The first FINAL lookup timed out. A subsequent `tx` lookup with `wait_until:NONE`
returned **UNKNOWN_TRANSACTION**. At finalized height **275875473**, block
`3bc5MnKeS64uTyW1qJtVZewnq7F1SzeRknsELZvZp5ou`, Grandtheft's balance is still
`11999868762049999999999999` yoctoNEAR, key nonce still `275527848000002`, and
factory is absent. **Observed on-chain cost: zero** at that checkpoint. This is
not a finalized failed transaction/refund, nor proof that a not-yet-expired signed
transaction could never arrive later. Unknown outcome remains blocked; no fresh
transaction was generated or submitted. An owner-run CLI path must reconcile or
reuse the original exact transaction, or conclusively establish expiry before
preparing any replacement. No CLI signing was attempted. Installed official CLI
version was read-only confirmed as **near-cli-rs 0.30.1**; the user's available
Grandtheft CLI public key still needs confirmation. Never request private keys
or seed phrases. A changed signing-key/proof condition requires explicit review.

| Area | Actual status |
| --- | --- |
| CI | `c655800` core/provisioning protocols 86/88 and owner passes preserved |
| Funding / approved action scope | Passed; no consolidation transfer needed |
| Current real Meteor identity | Grandtheft login passed; its saved empty workspace returned |
| Factory deployment | Wallet-policy blocked; unknown hash, absent target, no observed cost |
| Customer provisioning / owner verification / linking | Not executed; factory absent |
| Live refresh/resume / interruption recovery | Not passed; infrastructure outbox preserved, no fresh retry; customer recovery still unexecuted |

There is **no confirmed deployment transaction link**. The
[attempted hash lookup](https://testnet.nearblocks.io/txns/HafBR1uMZJFfN3U1v7x72s1LQiFCDkPoE6KqS5dhBSyk)
is an unknown attempt, not execution evidence. No worker activation, checkpoint,
payment, unpause or GitHub push occurred. All documentation and the local review
tool remain unpushed. Milestone 1 and full onboarding remain incomplete.

## 1 November 2026 — funded continuation preflight, no execution

**Existing-balance alternative:** after the user reported an unresponsive faucet,
the two owner wallets were queried together at finalized height 275771829, block
`2ruRBWBX33LPpjuVzLeKqFPEcR9M4rtjbb9Uzod8A1CU`. Babygoat has
`5878461305613026399999998` yoctoNEAR; Grandtheft remains at
`6999868762049999999999999`. Combined liquid funds suffice. A separate
[unsigned 4.64-NEAR transfer proposal](EXISTING_BALANCE_TOPUP_PLAN.md) would move
funds only from Babygoat's owner wallet to Grandtheft, with at most 0.00025 NEAR
upfront fee allowance. It would leave Babygoat about 1.2382 NEAR and fund the
unchanged provisioning plan. Digest:
`00cf57533b4c52f4401c664881e4107594d579c827ea55f359ef257f0f7aea9e`.
It requires **separate approval** because the original approval excluded top-ups.
No transfer has executed. This does not resolve the current browser debugger /
fresh Meteor proof blocker. No working application/contract code changes.

The user reported funding and instructed execution within approved plan digest
`0f569790060daca8ffb0f51a8aebd9c5ae80b94e1cde253ec1db32f99cabfa6a`.
The digest and both local artifact SHA-256 hashes were rechecked and are unchanged.
No working application or contract code was changed.

FastNEAR finalized height **275771283**, block
`7doapANajxEB95Rrhcx74E5rngcyy1axJhJVzmnbghXP`, reported testnet protocol 88,
nearcore `2.14.0-rc.5`, commit
`b7b4737cab46f17a6daa2ed694d7aebbd204363a`. The storage price, block gas price,
minimum receipt purchase price and relevant action fee parameters match the
approved plan. Both proposed factory and vault accounts are absent. Both listed
Grandtheft FullAccess keys remain present (the first key nonce advanced to
`275527848000002`; no inference is made about the purpose of that transaction).

Grandtheft balance is now **6999868762049999999999999** yoctoNEAR
(**6.999868762049999999999999 NEAR**), locked zero, storage 264 bytes. The official
`https://rpc.testnet.near.org` independently confirmed the same amount at finalized
height **275771459**, block
`CHtpjzKqqESeTEdgMhNtwMYGYqMWtiZPQW21yVrQRwQt`.
Required deposits and both upfront fee allowances remain
**11.6346437084553175 NEAR**. The current shortfall is
**4.634774946405317500000001 NEAR** (rounded incoming amount 4.64 NEAR at the
same parameters). No funding transaction was supplied/verified in this continuation.
The user has been asked for its public hash/link or recipient to resolve the
mismatch. Do not assume the reported top-up reached this account.

The local production server was not running; it was restarted on localhost:3100
without a code/build change. Brave inventory was reachable, but opening/binding
the acceptance tab timed out and then returned **Debugger unattached**. Therefore
the current Meteor account/network and fresh wallet-control proof are **not
verified**. No login or transaction-signing request was sent to Meteor.

| Area | Result in this continuation |
| --- | --- |
| CI | Previously confirmed `c655800` owner/core/provisioning passes remain valid; no code change or new rerun |
| Two real-wallet checks | Earlier passes preserved; not represented as fresh execution |
| Plan/artifacts/network/target preflight | Passed; exact approved actions remain unchanged |
| Funding and current Meteor identity | Blocked: insufficient finalized funds and browser debugger unavailable |
| Live provisioning / initialized owner / organization link | Not executed; no new transaction links or deployment costs |
| Live refresh/resume / interruption recovery | Not executed; controlled-test passes remain distinct |

Conditional transaction approval is retained, but its funding and fresh-wallet
conditions must pass before either transaction is signed. No faucet/top-up,
deployment, payment, authority activation or GitHub push occurred. The approved
JSON remains immutable. Live onboarding acceptance and Milestone 1 stay incomplete.

**The integration build passed automated Linux checks on protocols 86 and 88. Milestone 1 and live-payment acceptance remain incomplete.** Independent security review remains open; no audited or production-ready verifier claim is made.

## 31 October — fresh-user provisioning continuation

### Approved receipt-test rerun — `c655800`

Commit `c6558002ee848e909b74ad499560292e4045999f` was pushed with explicit
publication/CI approval. It changes provisioning tests and documentation only;
contract source is unchanged from `07181a0`. Initial status checks failed with
TLS/DNS errors. Connectivity subsequently recovered: all three workflows
completed successfully. No working code was changed to address network failures.

| Executed Linux workflow | Actual result |
| --- | --- |
| [Core](https://github.com/Technique-S/Nnetics/actions/runs/41239039000) | Protocols 86/88 passed; production build and strict Clippy |
| [Provisioning](https://github.com/Technique-S/Nnetics/actions/runs/41239039050) | Per protocol: 39 vault unit, 15 core sandbox, 6 factory unit, **4 provisioning sandbox**, zero failures; production build/Clippy |
| [Owner](https://github.com/Technique-S/Nnetics/actions/runs/41239039001) | Typecheck, **49 Node tests**, production build and **28 browser cases passed** |

Provisioning jobs `124648850647` (88) and `124648850799` (86) explicitly log
39/15/6/4 passing counts and identical production hashes. The corrected exact
funding/refund receipt checks and unchanged duplicate balances **executed and
passed on both protocols**. These are local sandbox and controlled browser/RPC
tests, not real-network provisioning or independent security review.

Retained provisioning artifact IDs: `13057545176` (protocol 88, archive digest
`36fb81e20affdc25a30c4dc1c63b9fc83b2e719371f3a69096ca567aa53c0330`) and
`13057275680` (protocol 86, archive digest
`0da38f643d9a6d12b75cbf2251250b9fc2789d054fa92594b2535f17c7ae5712`).

The earlier successful protocol-88 run's artifacts were downloaded and hashed
locally. Factory: 629144 bytes, SHA-256
`8475786608c34a68317d2ada08cd3dd2e65ff23dc176e2377ac54db5b4f52bbb`;
vault: 427238 bytes, SHA-256
`dc4cf64736110a33cce94531e2e00ba4510bcebbbb240bee6ecdacacf778560f`.
The earlier proposed factory deposit was 6.8324 NEAR, including a discretionary
0.5 NEAR reserve. The [itemized, reduced unsigned plan](FRESH_USER_TESTNET_PLAN.md)
removes that reserve while retaining the 4096-byte storage allowance and fixed
5-NEAR customer deposit. Deposits become **11.3324 NEAR**, with payment funds zero.
The exact-storage boundary has not been newly measured in the VM; further
reductions are not proposed. Contract code and application behavior are unchanged.

### Refreshed funding preflight and separate live acceptance status

Finalized height **275659894**, block
`AHXCpUGBqkpHLJ4gbXyB2ETqCg9oMPTMTFsdAgaNQXEG`: protocol 88;
Grandtheft **9999913398562499999999999** yoctoNEAR, locked zero,
storage 264 bytes; two existing FullAccess keys; `v.grandtheft.testnet` absent.
Storage byte price `10000000000000000000`, block gas price `100000000`, minimum
receipt gas purchase price `1000000000`. Pinned official nearcore commit
`b7b4737cab46f17a6daa2ed694d7aebbd204363a`,
[cost formula](https://github.com/near/nearcore/blob/b7b4737cab46f17a6daa2ed694d7aebbd204363a/runtime/runtime/src/config.rs#L483),
was inspected before calculating upfront allowances. The signer buys receipt gas
at the minimum price even when the block price is lower; do not use 250 Tgas times
block price alone. The account-creation charge is covered within that purchase,
not an extra 0.014 NEAR on top. The pinned verifier's <=770-byte storage exemption
applies to Grandtheft's unchanged 264-byte account.

Combined upfront fee allowance: **0.3022437084553175 NEAR**. Reduced deposits plus
both allowances: **11.6346437084553175 NEAR**. No execution refund credit assumed.
Refreshed shortfall: **1.634730309892817500000001 NEAR**; a rounded incoming
**1.64 testnet NEAR** covers it at these parameters. This is not an actual final
fee claim; final burned/refunded values require execution evidence. The app's
generic 5.1 NEAR minimum does not fully estimate protocol-88 prepaid fees; the
transaction plan uses the larger computed requirement. No application edit was
made; pricing/balance checks must pass immediately before execution.

Machine-readable plan: [FRESH_USER_TESTNET_PLAN.json](FRESH_USER_TESTNET_PLAN.json),
digest `0f569790060daca8ffb0f51a8aebd9c5ae80b94e1cde253ec1db32f99cabfa6a`.
It proposes exactly two testnet transactions, excludes top-up/faucet actions and
requires fresh Meteor proof of one listed on-chain key, funding and explicit
approval before execution. No new signing, deployment or provisioning transaction
has occurred; **no new transaction links exist**.

**Conditional approval received:** the user approved the above digest and its
two transactions, subject to funding, fresh Meteor proof and unchanged preflight.
Top-up/faucet actions remain excluded. A post-approval finalized balance check at
height **275662458**, block `4p1rYsThzY1FDJUnKuR39opKW2oLiGzSGWxx5e28qXmP`,
returned the same `9999913398562499999999999` yoctoNEAR. The account remains
unfunded for the complete plan, so no signing/deployment was attempted. Approval
is retained; no repeat deployment approval is needed if its conditions and exact
plan remain satisfied. A changed price/action/hash/scope requires review.

| Acceptance area | Actual live result |
| --- | --- |
| Two-wallet login / organization isolation / reverse switching | Earlier real Meteor passes preserved; neither identity, organization nor session rules changed |
| Provisioning / finalized owner / link | **Not executed live**; blocked on funding, explicit transaction approval and confirmed signing transport |
| Refresh / interruption recovery of dispatched provisioning | **Not executed live**; controlled tests and sandbox lost-response/duplicate tests passed |
| Cancellation | Controlled browser cases passed; live cancellation during provisioning remains unverified |

After authorization, cancel before signing, then dispatch only one customer create
transaction, interrupt its return and reconcile its recorded hash after fresh
login/refresh. Unknown outcomes stay blocked; do not send an extra duplicate or
fault transaction. Confirm finalized pinned code, no keys, expected owner/state
before the unique organization link. Callback/refund failure recovery, independent
verifier review and bootstrap trust remain unresolved. Payment controls stay
disabled. Full onboarding and Milestone 1 remain incomplete.

### Earlier review and repair — 31 October, approximately 21:00 WAT

Approved fix commit `07181a0174fedf5e16a011723ffa8586a70f3dfc` was pushed.
Replacement runs: [owner](https://github.com/Technique-S/Nnetics/actions/runs/41237147471),
[core](https://github.com/Technique-S/Nnetics/actions/runs/41237147470),
[provisioning](https://github.com/Technique-S/Nnetics/actions/runs/41237147482).
Owner and core workflows passed. The provisioning workflow compiled production
factory WASM, passed strict production Clippy and **six factory unit tests per
runtime**, then executed all four new sandbox cases. **Protocol 88 passed all
four; protocol 86 failed all four** at native-balance equality assertions. The
overall matrix failed; this is not full provisioning acceptance. No signing/deployment approval is implied by
publication approval.

On protocol 86 the initialized vault balance was
`5000022042370816800000000` yoctoNEAR (callback-fault build:
`5000022044197335200000000`) after the 5-NEAR transfer. The failed-init case's
factory changed from `9995409801278984000000000` to
`9996190423024709300000000` yoctoNEAR. NEAR credits contract execution rewards;
the protocol-86 tests incorrectly required balances to exclude them. Protocol 88
passed those original equality assertions; no identical reward behavior is
assumed across runtimes. See the official
[nearcore gas guide](https://near.github.io/nearcore/architecture/how/gas.html).
The local test correction checks successful receipt-linked Transfer actions for
exactly 5 NEAR to the vault/refunded owner, excludes system gas-refund receipts,
checks native balances within a separate sub-0.01-NEAR reward/fee envelope, and
requires a duplicate create request to leave the existing vault balance exactly
unchanged. Failed initialization must still remove the account/code, return a
successful exact 5-NEAR refund receipt, and preserve zero payout accounting.
Rust formatting passed. This correction has **not** run in Linux yet and requires
another approved push. Factory contract source is unchanged from `07181a0`.
Protocol-88 production artifact SHA-256 hashes from the passed job:
factory `8475786608c34a68317d2ada08cd3dd2e65ff23dc176e2377ac54db5b4f52bbb`;
vault `dc4cf64736110a33cce94531e2e00ba4510bcebbbb240bee6ecdacacf778560f`.
These are not deployment authorization or independent security review.

The completed [payment-core matrix](https://github.com/Technique-S/Nnetics/actions/runs/41216056809)
for `9d557ad` passed on both nearcore 2.13.0 / protocol 86 and 2.14.0-rc.5 /
protocol 88: **39 Rust unit tests and 15 sandbox tests per runtime**, production
WASM build and strict Clippy. This includes the three added initializer unit
tests. It does not validate the factory.

The [provisioning matrix](https://github.com/Technique-S/Nnetics/actions/runs/41216056725)
failed on both runtimes during factory host compilation with E0283: redundant
`.into()` on the two generic `Promise::function_call` method-name arguments.
Factory unit tests and the four new provisioning sandbox tests **did not execute**.
The local fix passes string literals directly. The same logs exposed deprecated
unbounded `promise_result`, which would fail production Clippy; it is replaced
with `promise_result_checked(0, 0)`, matching the pinned initializer's empty result.
Unexpected response bytes panic and leave the outcome blocked rather than
confirming creation or sending an incorrect refund. Three additional callback
unit tests were written (six factory tests total). Rust formatting passed; a
local factory test attempt failed in `getrandom` before contract compilation
because Windows `dlltool.exe` was unavailable. No factory pass is claimed.
The compile/callback fix subsequently passed as described above. Only the new
balance/receipt test correction is pending rerun.

**Current real browser observations:** babygoat authenticated, loaded only
`nnetics-studio`, and showed the initialized paused legacy vault owned by
`babygoat.testnet` at finalized block
`6cveB4tXWwVMT9NYUfD7AJwDpDzenMB5CaNBRoNGAkNw`, with no worker/payment funds.
Switch wallet immediately removed private records and required a fresh proof.
After the user approved Meteor, grandtheft returned only to Grandtheft workspace,
with zero invoices/contractors/payments and no fabricated vault balance. Its
request for `/api/live/snapshot?organization=nnetics-studio` was denied.
Navigating away cleared access; fresh user-approved verification restored its
saved organization. The original fresh-empty account and organization creation
remain the earlier real-wallet checkpoint, not newly
executed cases in this review. No new fresh identity was manufactured.
The reverse switch was then re-executed: user-approved babygoat login recovered
only nnetics-studio, and its request for Grandtheft organization
`e3600323-ad40-43c4-a31d-7d53abc4833e` was denied. Its finalized legacy-vault read
used block `EeXq7is4iSvgA6Byn7QRXnRApbo2hcs2pLzRm3XM26J4`.
Selecting Grandtheft workspace exposed the real Create vault review screen.
Clicking Create vault returned: "Create vault is not configured: deploy and
review the factory and vault artifacts first. No transaction was requested."
The organization stayed unprovisioned and payment controls remained unavailable.

Read-only finalized preflight at height **275646175**, block
`HaQgYN4Jx5DtCUPGxZfDkagduLm7M8ALsrZYzuVmKSBN`: testnet protocol 88,
storage byte price `10000000000000000000` yoctoNEAR;
grandtheft balance `9999913398562499999999999` yoctoNEAR and two FullAccess
keys; proposed infrastructure candidate `v.grandtheft.testnet` absent.
This is a candidate, not an approved funder/key/deployment plan. An exact
funding amount and approval digest require the successfully tested factory WASM.
No signing, deployment or provisioning transaction was executed; there are no
new transaction links. Factory callback/refund failure recovery remains blocked.
Real cancellation/interruption/no-duplicate vault acceptance is still unverified;
the passing Node/browser cases use controlled RPC/wallet responses.

**Follow-up Linux owner result:** approved commit
`9d557adef4dcbbba5bbdc77a1e544b79c804e675` was pushed. Its
[owner workflow](https://github.com/Technique-S/Nnetics/actions/runs/41216056691)
passed type checking, 49 Node tests, the production build and all 28 desktop/mobile
browser cases, including both previously failing cancellation cases.
The preceding Rust runs were cancelled by workflow concurrency after the push;
they are not passing results. Replacement
[payment-core](https://github.com/Technique-S/Nnetics/actions/runs/41216056809) and
[provisioning](https://github.com/Technique-S/Nnetics/actions/runs/41216056725)
protocol-86/88 matrices were still in progress at that checkpoint; the completed
results and factory failure are recorded above. This result update
is local until a subsequent approved publication. No deployment was performed.

**Approved publication checkpoint:** commit `100fa5fa246f83d8bbe2641a97b03685b3c83c14`
was pushed to `codex/nnetics-live-integration` on 31 October. Linux runs started:
[owner integration](https://github.com/Technique-S/Nnetics/actions/runs/41215648701),
[payment core](https://github.com/Technique-S/Nnetics/actions/runs/41215648664), and
[vault provisioning](https://github.com/Technique-S/Nnetics/actions/runs/41215648629).
Owner integration completed with a browser-test failure: type checking, all 49
Node tests and the production build passed; 26 of 28 Playwright cases passed.
Both failures were the same cancellation-test race on desktop/mobile: the test
rejected the cancelled first wallet request before the asynchronous second
challenge had registered its replacement request. The local test now waits for
the second wallet request before rejecting it. Six repeated targeted executions
and the full 28-case browser suite passed locally after this test-only fix.
Linux verification of this correction requires a separately approved follow-up
push. Payment-core and provisioning matrix results are still pending at this
checkpoint. Publication approval excludes signing, deployment, activation and
payments; provisioning remains disabled.

**Real Meteor identity checkpoint passed:** `babygoat.testnet` and
`grandtheft.testnet` authenticated. Grandtheft started with zero records and no
organizations, created its private organization, and recovered it on a fresh
login. Its verified session was denied the original owner's private snapshot.
The returning babygoat wallet recovered only its nnetics-studio workspace/list
and was denied Grandtheft's organization API. Refresh/lost focus cleared private
records and required verification. Real viewer/key-removal/ownership-rotation
transactions were not executed. This is not independent security review.

**Executed after the local provisioning changes:** 42 root tests, 49 application
Node tests, 28 desktop/mobile Playwright tests, and the production Next.js /
TypeScript build passed. Rust formatting and the new shell script syntax passed.
Node provisioning tests use real SQLite persistence and Borsh hashes with
controlled RPC results. Browser provisioning tests mock wallet/API responses;
they confirm transaction details and signing gates, not real deployment.

**Initial pre-CI checkpoint (superseded above):** three additional vault unit tests,
three factory unit tests and four provisioning sandbox tests were written.
Native Windows WASM build attempts
failed in the host linker before producing a new artifact. New Rust unit/sandbox
execution and the protocol-86/88 Linux provisioning workflow are now pending CI
results. Earlier Linux results do not validate the added constructor or factory.

Local source now includes Create vault, deterministic requests, durable pre-wallet
hashes, fixed-byte retry/reconciliation, guarded initialization and unique vault
links only after conclusive finalized owner/code/receipt verification. New vaults
start paused, without keys, worker or payment funds. Payment controls stay gated.
Callback/refund failure and unavailable historical outcomes remain blocked; no
administrator claim/override was added. See [VAULT_PROVISIONING.md](VAULT_PROVISIONING.md).

No new public-network transaction, deployment, activation or payment occurred.
The unsigned factory-plan generator is written/tested, but a concrete
deployment digest cannot be approved until Linux supplies reviewed artifacts and
a fresh funder/key/balance/protocol/storage-price preflight. Full vault onboarding,
Milestone 1 review and live-payment acceptance remain incomplete.

## Earlier 31 October authentication checkpoint — historical

**Real-wallet update:** `babygoat.testnet` and `grandtheft.testnet` both authenticated
through Meteor. The latter received empty onboarding and created its own durable
unprovisioned organization. Real return/switch testing remains incomplete because
RPC connectivity failed during background verification and a return login. The
local timeout/overlapping-heartbeat fixes pass 41 Node tests and the production
build. The browser run passed 24 existing cases; two new cases initially failed
on an ambiguous test locator, then both passed after fixing the locator. No full
26-case rerun, provisioning deployment or acceptance pass is claimed. See the
checkpoint and network evidence in [ONBOARDING_FIX.md](ONBOARDING_FIX.md).

Local execution: **42 root tests, 41 application Node tests, 24 Playwright tests
(desktop/mobile), and the production Next.js/TypeScript build passed.** Browser
tests mock Meteor and the API. Identity tests use generated real Ed25519 signatures
and SQLite with controlled RPC responses. They cover empty onboarding, private
organization creation/isolation, replay/expiry, key invalidation, switching and
preserved deployed owner/viewer guards. These are automated regression results,
not real-wallet acceptance or independent security review.

The login/configuration coupling and switch-session gaps were fixed locally.
Self-service vault provisioning remains missing. Neither two-account real Meteor
login nor a new Rust/sandbox/Linux run was executed. No new transaction/deployment
or push occurred. [ONBOARDING_FIX.md](ONBOARDING_FIX.md) records the actual diagnosis,
initial test/build failures corrected, authoritative account-read evidence and
remaining limitations. Earlier dated results below remain historical.

## Owner onboarding acceptance check — blocked

**30 October approved paused setup — executed:** all four transactions in plan
`2c2bfe94fbfac359b08a8b2880b4433384c055d6852e52ac70f8aee92de20a43` are FINAL/success.
The fresh vault, worker and vendor were funded with 6 / 1 / 0.1 testnet NEAR and
the exact keys; the pinned WASM was deployed and initialized. At finalized height
275379556, vault owner is `babygoat.testnet`, paused true, agent null, payment
funded/spent/reserved/uncommitted balances zero and last attempt zero. Deployed
code hash matches the tested artifact. No payment, unpause, worker activation or
checkpoint was performed. The four-transaction approval is consumed; transaction
and setup switches remain blank. [Setup evidence and transaction links](BABYGOAT_TESTNET_PLAN.md)
record the exact results and remaining independent-review/bootstrap limitations.

The npm CLI 0.30.1 secure keychain was found outside the agent session's PATH.
No owner key was exported: each exact approved owner transaction was signed offline
and cryptographically verified before broadcast, proving CLI signer control. This
is not a real Meteor login or organization-role acceptance. Public organization/vault
configuration is now active locally and the real Brave page enables message login;
no real NEP-413 challenge was signed. Self-service organization creation/provisioning,
viewer/outsider journeys and contractor implementation remain incomplete.

For the setup signer change, **36 application Node tests** and strict TypeScript
passed. The first new verifier test run had 35 pass / 1 fail due to SDK decoded
signature data having a plain variant shape; this was corrected before any setup
signing, then all 36 passed. A focused exact-byte/signature regression also passed
after formatting. No Rust/sandbox/Linux/production build or new browser-suite run
was performed for this script change. Browser configuration/initialization was
checked directly in the user's real Brave tab. No new GitHub push occurred.

**Configuration-blocker refresh, 30 October 01:54:30 WAT:** finalized testnet
height 275377603 / protocol 88 confirms the planned vault, worker and vendor still
do not exist. `babygoat.testnet` has about 9.99983 testnet NEAR; its originally
supplied FullAccess key remains registered alongside two additional FullAccess
keys. No key origin/control is inferred. The unsigned four-step plan digest and
tested WASM hash still match. Application configuration was not activated, and no
key, signature, account, deployment or payment was created by this read-only check.
See [BABYGOAT_TESTNET_PLAN.md](BABYGOAT_TESTNET_PLAN.md). No test rerun is claimed.

**30 October Meteor connection-button repair:** reproduced in the running dev
app: the old button was natively disabled by missing configuration/empty account,
not covered by another element. No browser console warnings/errors were captured.
Connection initialization is now a separate enabled action; message login keeps
its configuration/account checks and wallet-approval step. The page reports exact
missing configuration names plus retry instructions, or a missing-extension
recovery action. The actual Brave app tab successfully initialized the real Meteor
extension dispatcher; the in-app browser correctly reported Meteor unavailable.
Neither check requested a signature or transaction. Successful initialization is
not real-wallet login or owner acceptance. Current missing settings are organization,
vault, worker and worker public key. No configuration guard was bypassed.

The additional controlled browser case checks an ordinary unobstructed click,
initialization with incomplete configuration, configuration recovery, a pending
testnet `sign_message` request without any login call, and rejection/decline recovery.
**Executed for this repair:** all **35 application Node tests**, strict TypeScript
and **18 Edge desktop/mobile browser cases** passed, none skipped. The browser
suite ran against the existing dev server. Its first run had **4 failed / 14 passed**:
two new assertions failed on each viewport because Next dev adds its own alert
element and Strict Mode repeats the initial configuration read. The alert query
was scoped to the Meteor panel and retry verification now checks a new read
rather than assuming exactly one initial read. The complete rerun passed 18/18.
No production build was run over the user's active dev output; root/Rust/sandbox/CI
and public-network message login were not rerun for this UI repair. Final real
Brave initialization evidence is saved in ignored
`artifacts/live/meteor-connection-fix.png`. The dev server remains running.

**30 October Meteor continuation:** the user confirms the Meteor **browser
extension** shows `babygoat.testnet` and 10 testnet NEAR. This is user-reported
wallet UI evidence, not a verified application session. A local extension-only
NEP-413 message-login bridge is implemented without adding the stock Meteor SDK
or requesting an on-chain access key. Meteor transaction signing remains
unimplemented and explicitly blocked. Current configuration still prevents login
before a reviewed deployed vault exists; self-service onboarding is absent.
See [METEOR_WALLET_COMPATIBILITY.md](METEOR_WALLET_COMPATIBILITY.md) for protocol
provenance, dependency findings and remaining steps. No real-wallet signature,
public-network transaction, contract change or push occurred in this continuation.

**Executed for this continuation:** 42 root Node tests, **35 application Node
tests**, strict TypeScript, production build and **16 Edge desktop/mobile browser
cases** passed, with zero failed or skipped tests. Four new transport tests cover
testnet-only messages, request correlation, wrong/malformed identities, conflicting
metadata, cancellation, timeout, extension errors and concurrent requests. One new
browser case executes on both viewports and verifies controlled extension/API
wiring plus the Meteor transaction block after reload. The browser login response
is a fixture with a dummy signature; real cryptographic authentication is covered
by the existing server tests using generated local keys. These tests do not prove
interoperability with the installed Meteor extension or independent security review.
No Rust, sandbox or new Linux CI run was performed for these TypeScript changes.

**Latest owner selection:** the user supplied CLI-created `babygoat.testnet` and
public key `ed25519:EcXpsAWQyN6hCN6BmPKiYPWWRNZWHZMVBtvGZDwAdzwo`.
Finalized testnet height 275367689 confirms the exact sole FullAccess key and
10 testnet NEAR balance. Proposed vault/worker/vendor names are absent at height 275367808. [BABYGOAT_TESTNET_PLAN.md](BABYGOAT_TESTNET_PLAN.md) records the updated
unsigned plan; it is not authorized. Prior-owner plans are superseded, and the
previously created account is untouched. No signatures/public mutations or test
reruns were made for this selection. Wallet control and owner acceptance remain open.

[OWNER_ONBOARDING_ACCEPTANCE.md](OWNER_ONBOARDING_ACCEPTANCE.md) records the actual
acceptance matrix and finalized testnet preflight. Self-service organization
creation, wallet-to-workspace discovery and onboarding vault provisioning are not
implemented; the app still requires developer configuration and a deployed vault.
The earlier `tobylou.testnet` account and implicit-address mismatch are historical;
the selected `babygoat.testnet` public key now matches finalized account state.
No real-wallet signature/session/role journey was executed or accepted.

Re-executed locally for this check: **31 application tests, 14 Edge browser cases
and production build with TypeScript**, all passed. Controlled fixtures are not
real-wallet acceptance. The gateway now explicitly labels developer setup as
required. The two unsigned setup candidates in [OWNER_TESTNET_PLAN.md](OWNER_TESTNET_PLAN.md)
are blocked by wallet mismatch, not approved for execution. No signing, funding,
key removal, deployment or push was performed. Contract sources remain unchanged.
The contractor portal is explicitly deferred until owner acceptance passes; its
requirements, including immutable existing order recipients, are documented.

On 30 October (Africa/Lagos), the user chose the current wallet for a new testnet
owner. A name-availability read and pinned official CLI source check prepared a
public-key-only faucet request for `nnetics-tobylou.testnet`; it is not submitted.
The old-owner candidates are retired. [NEW_OWNER_ACCOUNT_PLAN.md](NEW_OWNER_ACCOUNT_PLAN.md)
contains the exact request and distinct future deployment plan; neither is
authorized. Wallet control, real acceptance and the contractor gate remain open.

**Subsequent explicitly approved execution, 30 October WAT:** the exact sponsor
request was submitted once. Transaction
[`GhDXFy8C9wBUaSVjXSM6GK6vN3L4VbUjAiK8bLA4Fg5b`](https://testnet.nearblocks.io/txns/GhDXFy8C9wBUaSVjXSM6GK6vN3L4VbUjAiK8bLA4Fg5b)
was confirmed FINAL/successful. Finalized height 275366543 showed
`nnetics-tobylou.testnet` with 10 testnet NEAR, no code and exactly the approved
FullAccess key. The sponsor signer was `testnet`; no user-wallet signature or funds
were used. Raw response, durable attempt marker and finalized account/key/transaction
confirmation are retained under ignored `artifacts/live/`. This consumes only the
one sponsor-request approval. Vault deployment, key changes, further funding,
wallet proof and payments remain unauthorized. Owner acceptance remains blocked
by unverified wallet control and missing self-service organization/provisioning.
No new tests were run for this read-only reconciliation/documentation step.

## Local wallet and organization authorization continuation

The application owner-ID allowlist is removed. Verified NEP-413 identity sessions
are distinct from organization membership and on-chain vault ownership. All
protected requests recheck the finalized wallet key and vault owner; explicit
organization viewers cannot mutate data or initiate owner transactions. Full
configuration, upgrade behavior and contract impact are in
[ORGANIZATION_ACCESS.md](ORGANIZATION_ACCESS.md). No Rust/ABI changes were needed.

Executed locally on Windows/Node 24: **42 root tests, 31 application tests, strict
TypeScript, production dashboard build and 14 desktop/mobile Edge browser
executions**, all passed. The six wallet/organization tests cover actual local
Ed25519 signatures and SQLite, nonce replay/concurrency/expiry, account/origin/org
binding, current key permission/removal, uninvited wallets, read-only grants,
revocation, owner changes, legacy-session invalidation without payment-claim loss,
all application mutation routes and block-pinned snapshots. Browser live-mode
cases use controlled HTTP responses; they do not establish real wallet acceptance.
The first typecheck/build failed on unbranded test fixture amount/account strings;
the fixture now uses the existing structured-invoice validator and subsequent
typecheck/build passed.

These changes are local and not pushed. No new Linux run, Rust unit/sandbox rerun,
real-user wallet signature, public transaction or deployment is claimed here.
The prior Linux evidence below applies to its exact source commits. Production
Rust source is unchanged. Independent review, trusted bootstrap and real-payment
acceptance remain incomplete. No on-chain member spending or owner-rotation
permission was added.

## Approved integration push and Linux execution

Commit `80d253d41d63bdd782abf7d66a2036dc07793e0b` was pushed to
`codex/nnetics-live-integration` with explicit user approval. Completed execution:

| Run                                                                                            | Executed result                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Contract matrix 40947353192](https://github.com/Technique-S/Nnetics/actions/runs/40947353192) | Both nearcore 2.13.0 / protocol 86 and 2.14.0-rc.5 / protocol 88 passed. Each: 41 root TypeScript, 36 Rust unit, 15 sandbox tests, five WASM builds, Clippy and formatting. Runtime protocol asserted. Finished 20:24:06 UTC / 20:22:50 UTC. |
| [Owner 40947353242](https://github.com/Technique-S/Nnetics/actions/runs/40947353242)           | Ubuntu 24.04, Node 24.22.1: 26 Node tests, strict TypeScript, production build and 12 Chromium browser executions passed.                                                                                                                    |

Both production WASMs retain the SHA-256 below. Downloaded manifests, logs, actual
receipt proofs and VM measurements are in ignored `artifacts/github/40947353192/`.
See [PROTOCOL_88_REVIEW.md](PROTOCOL_88_REVIEW.md) for pinned official-source
comparison, measured gas/storage and unresolved trust assumptions. Maximum tested
88 update used 62.567 Tgas; repair at most 31.124 Tgas. Late gas/storage failures
preserved the full compared payment/claim/ledger/audit state. This synthetic bounded
workload and passing tests do not replace independent security review.

The follow-up parser guard rejects non-null future Spice commitments, and a shared
signing gate accepts only tested protocols 86/88. Locally executed: 42 root tests,
26 application tests, strict TypeScript, production build and 12 desktop/mobile
browser executions passed. The follow-up is commit
`30bafa3c4432bc27fa10418b8b73446dbb45c65b`. Its completed Linux execution:

| Run                                                                                            | Executed result                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Contract matrix 40949948285](https://github.com/Technique-S/Nnetics/actions/runs/40949948285) | Protocols 86 and 88 both passed: 42 root tests, 36 Rust unit tests, 15 sandbox tests per runtime, five WASM builds, Clippy and formatting. Jobs completed 20:41:20 UTC / 20:40:14 UTC. |
| [Owner 40949948396](https://github.com/Technique-S/Nnetics/actions/runs/40949948396)           | 26 application tests, strict TypeScript, production build and 12 Chromium browser executions passed.                                                                                   |

No tests are skipped in these suites. Logs/manifests/proofs are retained under
ignored `artifacts/github/40949948285/`; owner log is
`artifacts/owner-linux-40949948396.log`. Transaction flags remain disabled; no
public-network signing occurred. Passing controlled tests does not complete the
real testnet workflow or independent security review.

## Integration baseline and local evidence

Inspected renamed source and retrieved [Linux run 40901797197](https://github.com/Technique-S/Nnetics/actions/runs/40901797197),
commit `7d194e49c53c80884097a49ac113a1a509c4d654`, completed at 15:36:26 UTC:
41 root TypeScript, 36 Rust unit and 15 sandbox tests passed, with no skipped/ignored
tests. Production/four fault WASMs, Clippy and formatting passed. The downloaded
production artifact is 420,841 bytes, SHA-256
`1dd4f6971b13303661b29c6757a353c873368848490bdce2cd86a9cc360459f8`;
it is retained as `artifacts/vault.wasm`. This supersedes older artifact hashes for
deployment preparation; it is not a deployment authorization. Windows and Linux
build hashes differ, so cross-platform bit-for-bit reproducibility is not claimed.

Executed locally for the integration: **41 root tests, 26 application Node tests,
strict TypeScript (including setup scripts), production dashboard build and 12
desktop/mobile browser executions**, all passed. Application tests exercise actual
SQLite persistence, duplicate/order constraints, exclusive worker locking,
lost acknowledgements, identical-byte unknown recovery, prepare-gap interruption,
callback-unknown/final statuses, transaction linkage and NEP-413 expiry/replay/key
ownership rejection. A marker vector comes from actual renamed Rust sandbox
output. Controlled transports/browser HTTP fixtures are used; these are not
public-network acceptance tests or an independent audit.

Read-only RPC preflight reported **testnet protocol 88**; the deprecated NEAR endpoint
also returned a deprecation/429 error, and the app default was switched to the
documented FASTNEAR testnet endpoint. The locally written contract CI matrix adds
nearcore `2.14.0-rc.5` / protocol 88 alongside the preserved `2.13.0` / protocol 86
baseline. Both runtime paths assert the reported protocol; the completed executions
are recorded above. Production Rust sources are unchanged.

Browser failures during development: a demo-title hydration mismatch and an overly
exact error-text locator. A stable title/named error assertion fixed these; all 12
subsequent executions passed with a clean runner exit using a separately managed
local server. Earlier runner-cleanup limitations remain historical below.

Unmet acceptance: activated owner testnet account and named setup/sponsor plan,
reviewed pre-payment checkpoint, independent verifier review, real wallet challenge
and owner transactions, recipient balance delta/transaction-link proof, real restart
journey, and transaction authorization. Local configuration based on a withdrawn
account hint was cleared; the supplied implicit account remains inactive and no account was created. Dedicated generated role keys
are outside Git and unused. Dependency audit reports 10 low-severity transitive
elliptic/secp256k1 advisories; no unsupported forced downgrade was applied.

See [LIVE_INTEGRATION.md](LIVE_INTEGRATION.md). No public-network transaction was
signed or sent. AI extraction remains deliberately unimplemented until the manual
invoice workflow passes acceptance. No current integration changes have been pushed.

## Historical local rename result — superseded by Linux run above

The product rename updates package identifiers, verification environment variables,
the `NNETICS_TRANSFER_V1` receipt marker and the `nnetics:repair:v1:` storage-key
namespace. Use a fresh vault for this build: upgrading an existing vault would
require an explicitly reviewed migration, and earlier markers cannot be used as
repair evidence by this build. No public deployment exists. The Linux results and
WASM checksums below describe the earlier source commits, not the renamed build.
Rust unit and sandbox execution was pending at this local rename stage; the later
Linux run recorded above executed both successfully on protocol 86.

Executed locally after the rename: 41 reference-policy tests and 11 owner-adapter
tests passed; all eight desktop/mobile browser scenarios passed with explicit
Nnetics title/branding assertions. The browser runner hung during local server
cleanup after reporting all eight scenarios successful and was interrupted; a clean
runner exit is not claimed. The owner production build and strict TypeScript
checks, both Rust format checks, locked sandbox manifest resolution and the locked
offline production WASM build passed. Renamed WASM SHA-256:
`fc53f50fa7f684bee78b788a47a50f12a29b5955f870ac1b2797a7de846ed3fd`.
Native Rust unit/sandbox tests were not executed on this Windows host. The user
authorized pushing the renamed dashboard branch; deployment remains disabled.

## Bounded review continuation — latest result

[Run 40877809725](https://github.com/Technique-S/Nnetics/actions/runs/40877809725), commit
629a7c17d9e471a4e90024e3477204182beba26c, completed successfully at 13:07:50 UTC.
**Executed: 41 TypeScript tests, 36 Rust unit tests and 15 sandbox tests**, all passed,
with no ignored/filtered tests. Five WASM builds, production Clippy and both Rust
format checks also passed. The following older results remain historical evidence;
this continuation supersedes their test counts and artifact checksum.

[M1_REVIEW.md](M1_REVIEW.md) records the pinned official comparison, epoch commitment
hardening, six additional unit regressions, maximum VM workload, failed/superseded
runs and unresolved assumptions. It is an implementation-author review, not an
independent audit. The public contract signatures and serialized state layouts remain
unchanged; new fault behavior is restricted to existing test-only artifacts.

The VM exercised 128 validators, 256 approval slots, six 64-sibling repair paths and
exactly 128,000 request bytes together at explicit 300 Tgas prepaid function-call gas.
Measured total gas: bootstrap 40.864 Tgas, head transition at most 62.568 Tgas,
repair at most 31.125 Tgas. Added storage: bootstrap 31,327 bytes, repair 287 bytes
for success / 231 for failure. Existing numerical bounds were retained for this
measured workload; this is not a formal upper bound for every possible input shape.

Late gas exhaustion after terminal collection writes and the late storage-funding
guard after a 1 MB write left reservations, claims, payment/order state and audit
records unchanged in both success/failure cases. Retrying the identical proof on
production code then finalized safely and replay rejected. The repair storage test
hits the contract guard, not protocol LackBalanceForState; the existing callback
matrix separately exercises protocol storage failures.

Latest production WASM: **421,118 bytes**, SHA-256
2fc8ed792bf63a27db049a8c90e222bccd1e208fa9a7535ff3c997139b4e5540.
Evidence is retained in artifacts/github/40877809725/payment-core-40877809725-1/20261029T125923Z-40877809725-1-3925/,
including verifier-bounds.json and run.json. The tested WASM is copied to
artifacts/vault.wasm. No deployment or public-network signing occurred.

The bounded review and requested VM benchmarks are complete. Independent security
review, trustworthy bootstrap/network selection, PoS weak-subjectivity assumptions,
upgrade credentials and legacy attempts without pre-payment anchors remain outside
what passing tests establish. Overall acceptance remains explicitly false. No extra
environment access is needed. Milestone 2 work is a separate, local mock UI and does
not alter or authorize this core.

## Actual successful execution

[GitHub Actions run 40867146834](https://github.com/Technique-S/Nnetics/actions/runs/40867146834) tested commit d515974d64656caa62666b97b4d5fce494340166. It finished successfully at 11:48:20 UTC on 29 October 2026. Environment: Ubuntu 24.04 x86_64, Node 24.22.1, Rust/Cargo 1.93.0, near-sdk 5.29.1, near-workspaces 0.23.0, near-sandbox 0.3.12 / nearcore 2.13.0 (protocol 86).

| Check                       | Written                                            | Executed in this run    | Result                                                |
| --------------------------- | -------------------------------------------------- | ----------------------- | ----------------------------------------------------- |
| TypeScript reference policy | 34 tests                                           | 34                      | Passed                                                |
| RPC proof normalization     | 7 tests                                            | 7                       | Passed                                                |
| Rust SDK unit tests         | 30: 13 original + 17 proof/finality cases          | 30                      | Passed; 0 failed, ignored or filtered; 1.43 seconds   |
| Rust sandbox tests          | 14 top-level tests with additional case matrices   | 14                      | Passed; 0 failed, ignored or filtered; 195.80 seconds |
| Production WASM             | Default features                                   | Built                   | Passed                                                |
| Callback fault WASMs        | Record/finalize × gas/storage                      | All four built          | Passed                                                |
| Production Clippy           | WASM release library, -D warnings                  | Executed                | Passed                                                |
| Rust formatting             | Both crates                                        | Executed                | Passed                                                |
| Evidence retention          | Stage logs, manifest, WASM, receipt proofs/results | Uploaded and downloaded | Passed                                                |

There are no written-but-unexecuted Rust test cases in the current suite. This does not establish coverage of every possible consensus/resource condition.

The tested production WASM is 421,025 bytes, SHA-256:
e97f89494906baf07a818102aa58c343c1f8279ca6be72d4bfbc9f8af5f0b78f

This checksum matches both final Linux runs. The successful run's manifest records source/configuration/lockfile hashes, all stage exit codes and nonzero Rust test counts. A subsequent documentation-only commit does not change the verified source.

## Recipient balances and repair evidence

The normal successful payment increased the recipient from 100000000000000000000000000 to 102000000000000000000000000 yoctoNEAR: exactly **2 NEAR**. The final payment is Paid, spent is 2 NEAR, reserved is zero and last_attempt is 1. The full PAYMENT_EVIDENCE record is in logs/sandbox-tests.log.

The historical-proof matrix executed all four cases:

| Lost result callback     | Native transfer | Exact recipient delta | Repaired status | Final reserved / spent | Repair gas burned |
| ------------------------ | --------------- | --------------------- | --------------- | ---------------------- | ----------------- |
| Gas exhaustion           | Success         | 1 NEAR                | Paid            | 0 / 1 NEAR             | 5,072,292,929,148 |
| Gas exhaustion           | Failure         | 0                     | Failed          | 0 / 0                  | 5,190,522,132,805 |
| Protocol storage failure | Success         | 1 NEAR                | Paid            | 0 / 1 NEAR             | 5,072,341,471,752 |
| Protocol storage failure | Failure         | 0                     | Failed          | 0 / 0                  | 5,186,041,151,479 |

Each case kept the reservation while the outcome was unknown, verified actual node-generated inclusion proofs under signed head updates, rejected tampering, repaired through an unprivileged account while paused/revoked, and rejected replay. Balance deltas were captured before recipient-signed calls consumed gas. Raw proof bundles and final payment/vault/audit records are retained in evidence/. These gas measurements are for the exercised sandbox proofs, not maximum-size proofs or validator sets.

All 12 core sandbox tests also passed: exact payment and duplicate guards; concurrent same-order, shared-invoice and budget competition; amount/recipient/cap/budget/funding checks; pause, vendor/order/agent revocation and expiry; account/key/deposit/private-callback restrictions; real failed transfers and safe retry; bounded retries and immutable order IDs; storage/liquidity rejection with state rollback; callback gas/storage fault matrix and durable-evidence reconciliation; unknown client outcomes resolved by views without resubmission.

The two additional sandbox tests passed the four historical-proof cases above and frozen checkpoint authority. Unit tests passed expiry boundaries, signer/predecessor and stale callback checks, in-flight revocation, immutable recipients, hashes compared with official near-primitives types, signed quorum/epoch transitions, invalid signatures/truncated approvals, stale heads, unknown/tampered/unrelated/stale/replayed evidence, consumed receipt rejection, ambiguous initiating receipts and immutable bootstrap.

## Execution failures and corrections

| Run / commit                                                                             | Actual result and correction                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [40862869517](https://github.com/Technique-S/Nnetics/actions/runs/40862869517) / 9206f07 | TypeScript 41 passed; Rust unit compilation failed on eight test hash conversions and one mock context field. Zero Rust tests executed. Fixed in 7125f38.                                                                                              |
| [40863230050](https://github.com/Technique-S/Nnetics/actions/runs/40863230050) / 7125f38 | Rust unit 29 passed, 1 failed. Official-type comparison detected a real validator public-key length-prefix mismatch. Corrected consensus encoding in 919be5b; preserved the comparison assertion.                                                      |
| [40863676284](https://github.com/Technique-S/Nnetics/actions/runs/40863676284) / 919be5b | Rust unit 30 passed; sandbox 0 passed, 14 failed during setup: finite worker-key allowance was below the sandbox upfront gas check. Raised only the ephemeral test key allowance to 100 NEAR in 47e059f; method restriction unchanged.                 |
| [40864788315](https://github.com/Technique-S/Nnetics/actions/runs/40864788315) / 47e059f | Rust unit 30 passed; sandbox 0 passed, 14 failed at the setup rejection probe with an opaque WASM trap. Missing --cfg near selected off-chain SDK fallbacks. Corrected target flags and added a compile-time guard in d2ec5a7.                         |
| [40865934492](https://github.com/Technique-S/Nnetics/actions/runs/40865934492) / d2ec5a7 | Rust unit 30 passed; sandbox 13 passed, 1 failed. Real proof/callback matrices passed. Storage-shortfall fixture accidentally reset the deployed code hash. Fixed in d515974 by preserving current account fields and checking unchanged code/storage. |
| [40867146834](https://github.com/Technique-S/Nnetics/actions/runs/40867146834) / d515974 | All checks passed: TypeScript 41, Rust unit 30, sandbox 14, five WASM builds, Clippy and formatting.                                                                                                                                                   |

**Artifacts built before d2ec5a7 must not be deployed.** Compilation and structural WASM validation did not detect the missing SDK on-chain configuration; sandbox execution did. The corrected .cargo/config.toml applies --cfg near to WASM builds, matching [official cargo-near behavior](https://github.com/near/cargo-near).

Earlier Windows native unit compilation failed before executing tests because dlltool.exe was unavailable. That environment failure is superseded by the Linux execution above. Additional local checks executed: Bash/report syntax; synthetic report failures for zero tests/missing stages (exit 80); configured WASM build with panic_utf8, sha256 and ed25519_verify host imports; a deliberately misconfigured WASM check rejected by the explicit --cfg near compile guard (exit 101, artifacts/local-checks/missing-near-cfg.log). These checks are separate from the Linux test counts.

## Reproduction and retained evidence

Run bash scripts/check-core.sh from the repository root on Linux x86_64 with Node 24 and rustup. Ubuntu prerequisites: build-essential, pkg-config, libssl-dev, clang and cmake. rust-toolchain.toml pins Rust 1.93.0, formatter, Clippy and the WASM target. Both Cargo lockfiles are committed; preserve near-sdk-env 0.1.6 and near-sys 0.2.14 compatibility pins.

The workflow .github/workflows/payment-core.yml uses Ubuntu 24.04 and pinned official action commits. It runs the script, which rejects sandbox binary overrides, builds fault variants in separate target directories and uses only fresh local nodes with synthetic accounts. No wallet, faucet, deployment credentials or public RPC is needed. Ambient Rust flag overrides cannot silently omit --cfg near: the contract compilation guard rejects them.

Every run gets a fresh artifacts/runs/ directory. Missing stages, zero-test Rust summaries or failed report generation fail verification. Actions uploads logs, checksums, the production WASM and available public sandbox proof/result bundles even on failure. The manifest deliberately leaves milestone_1_accepted false for review; a green workflow is not an automatic security approval.

All completed-run artifacts were downloaded to ignored artifacts/github/<run-id>/. The successful evidence is in artifacts/github/40867146834/payment-core-40867146834-1/20261029T114033Z-40867146834-1-2953/. The tested production WASM is also copied to ignored artifacts/vault.wasm. GitHub artifacts expire after 14 days; the local downloaded copies remain available.

## Preserved contract and repair authority

The pre-continuation source, tests, validation report and WASM are preserved under ignored .tools/m1-baseline/. Original contract source SHA-256: b0321c1c2f7b80479ed0119f9cdccacd20ba5bfe3862e4b04609aa0b0d202c40. The original WASM was 290,318 bytes, SHA-256 917e6b59fa879582421593e8d9d4c849048ae87ae11faa53a9fe6273ab172654; it predates the corrected build configuration.

Vault, WorkOrder, Payment, status variants and collection prefixes retain their serialized layouts. Proof state uses separate versioned prefixes. Source layouts were compared; sandbox fault-code replacement also exercised shared serialized state, but no generic legacy migration was implemented or claimed.

[HISTORICAL_REPAIR.md](HISTORICAL_REPAIR.md) defines authoritative evidence: a one-time pre-payment trust anchor; subsequently verified signed finality/ancestry; finalized initiating and exact native-transfer receipt proofs; exact attempt/marker/recipient/child linkage; permanent receipt consumption. Anyone may relay heads or submit valid repair proofs. Unknown, invalid, unfinalized, stale, replayed or ambiguous evidence cannot release reservations. No owner outcome flag, timeout release or balance heuristic is accepted.

## Remaining limitations and access

No additional environment access is needed. The user supplied [Technique-S/Nnetics](https://github.com/Technique-S/Nnetics), explicitly authorized pushing, and completed GitHub authentication. Branch pushes, Ubuntu execution and artifact retrieval succeeded. No public-network transaction was signed or deployment performed.

Independent review remains necessary for the trusted bootstrap, consensus encoding/protocol assumptions and resource guarantees. The initial run exercised a small real validator set; the latest bounded-review runs additionally benchmarked synthetic 128-validator/256-approval/64-sibling/128,000-byte inputs in the VM. That finite workload is not a formal worst-case guarantee for every JSON shape or future gas schedule. The verifier supports bounded Ed25519/legacy header encodings, tested on protocols 86 and 88, and requires timely authenticated synchronization under normal PoS/light-client assumptions, including weak subjectivity. Unsupported evidence fails closed and can leave an attempt blocked.

Old attempts lacking an initiation marker or pre-payment checkpoint remain blocked; the owner cannot install a post-incident trust root or use a migration escape hatch. Resolving such legacy history requires a separately reviewed design. Public-network provisioning, transactions and deployment still require separate approval.

Automated payment-core acceptance checks are now satisfied, including retained exact balances and real proof repair/rejection. Overall Milestone 1 acceptance remains incomplete while the stated consensus/resource review is outstanding. UI, worker, AI extraction and testnet demonstration remain outside this milestone.

## 4 November 2026 — approved UI implementation

- Implemented the shared owner navigation, compact account disclosure, contextual Vault/Access/Recovery/import tools, integrated contractor billing surface, empty states, actual-loading skeletons, reduced-motion-aware transitions and corrected zero-budget rendering. No server/worker/contract interfaces or payment payloads changed.
- Local production build / TypeScript: passed. Existing backend tests: 96 passed, zero failed.
- Browser execution: 71 passed + one intentional mobile duplicate skip in the intercepted session/role/layout suite; 22 passed in the owner/contractor demo workflow suite. Combined 93 passed, one skipped. These are fixtures and demo execution, not fresh Meteor acceptance. Initial stale selectors/copy and a paused-clock animation wait were fixed without relaxing financial/security assertions.
- Thirty synthetic current-UI captures: no JavaScript errors or page overflow. Overview heading moved from y=1647 desktop / 2296 mobile to y=130 / 146. No covered identity. Native zoom, screen-reader and fresh real-wallet visual acceptance remain manual follow-ups.
- Read-only chain check 2026-11-04T00:21:31.901Z, height 276121164: Grandtheft owner, vault paused, worker authorization null, existing INV-0002 Paid transaction unchanged; zero transactions sent. Existing amount 0.001 NEAR, order and Babygoat recipient preserved.
- Local origin mismatch initially prevented the full demo workflow. Automatic approval review blocked a process-local origin override. At the user's explicit instruction, stopped the process occupying port 3100 and started the updated app at its existing configured origin http://127.0.0.1:3100. No private configuration change or origin-check bypass. The workflow suite then passed.
- No Git push, deployment, live payment, worker activation, AI provider change or production record migration. Demo test records/logs remain in ignored artifacts. Independent security review status is unchanged.
- Detailed implementation evidence and limits: [design-review/UI_IMPLEMENTATION.md](design-review/UI_IMPLEMENTATION.md).

## 4 November 2026 — full-height shell and task-surface completion

- Implemented the approved second design audit: full-height rail with wallet help in account menu, interruptible desktop width spring, accurate mobile ARIA, task-specific Vault/Access/Recovery, records-first vendor/order lists with contextual import, entry/provisioning polish, container-aware embedded contractor layout, truthful portal metadata, destructive/contrast fixes and preview-before-submit billing flow.
- Backend/worker/contract interfaces and transaction payloads unchanged; financial requests now visibly respect the existing disabled configuration. Read-only refresh is explicitly separate from wallet-based reconciliation. Unknown outcomes remain blocked/reserved.
- Actual local checks: production build/TypeScript passed; 96 backend tests passed; full browser suite 93 passed plus one intentional skip; final focused checks 8 passed after last copy/disabled-state adjustments. Fixture/demo results are not new real-wallet acceptance.
- Captured 68 route/state cases across four widths: no page exceptions or document overflow. Normal-motion reversal and full-height/help invariance verified. Physical-device profiling, native zoom and screen-reader/real-Meteor visual acceptance remain manual.
- Read-only chain preflight 2026-11-04T08:53:54.397Z, height 276172619: Grandtheft owner, vault paused, worker authorization null, existing 0.001-NEAR Babygoat Paid transaction unchanged; zero transactions sent. No worker start, payment/job creation, push, deployment or migration.
- Detailed evidence: [design-review/completion/IMPLEMENTED.md](design-review/completion/IMPLEMENTED.md). Local app remains at http://127.0.0.1:3100.

## Operational acceptance staging and cleanup recovery

5 November 2026. The reviewed V4 file is unchanged at SHA-256 `d6ee7587ed059a22e76ce05cf254d4de33d3066730d5abda7672424add9599f5`. Its execution window ends on 6 November at 05:14:10.901 WAT. There is no executable successor plan.

- **Billing.** The operator submitted the actual bill through Contractor billing. The database showed it as Submitted, then the staging command verified its approval and exact details. Running `node --env-file-if-exists=.env.local scripts/stage-operational-acceptance.mjs` twice from `apps/owner` with both flags unset returned the same binding. SQLite shows one held job for this agreement, with no release, signature, transaction hash or payment attempt. Release requires the exact successor plan hash and binding, a fresh matching finalized chain agreement, owner authorization and the separate payment gate.

| Binding | Value |
| --- | --- |
| Organization | `e3600323-ad40-43c4-a31d-7d53abc4833e` |
| Billing invoice ID | `6278f3d3-87dc-4b48-95b6-e757097c7033` |
| Billing agreement ID | `cd10a7be-31ce-4af2-a461-2f6be8d896f6` |
| Durable job and contract invoice ID | `acceptance-6278f3d3-87dc-4b48-95b6-e757097c7033` |
| Contract agreement ID | `OPERATIONS-ACCEPTANCE-001` |
| Display reference | `CTR-0001-INV-0003` |
| Approved recipient and amount | `babygoat.testnet`, `1000000000000000000000` yoctoNEAR |
| SHA-256 of exact payment argument bytes | `f0c927b113761ab082be2a12b7dbd2c84f510f2a7f9ba1ddb985bb14bd742d6e` |

Exact UTF-8 `execute_payment` arguments retained with the durable binding

```json
{"order_id":"OPERATIONS-ACCEPTANCE-001","invoice_id":"acceptance-6278f3d3-87dc-4b48-95b6-e757097c7033","recipient":"babygoat.testnet","amount":"1000000000000000000000"}
```
- **Cleanup.** The successor-only recovery mode verifies a finalized failure using matching evidence from both configured RPC sources, the reconstructed signed envelope, linked receipts and finalized vault owner/code/state. It retains the original attempt, IDs, receipt evidence and consumed authorization. Unknown, conflicting or unsupported evidence remains held. An independently scoped remaining pause or revocation can proceed after a verified failure if still needed. A replacement requires a distinct, explicitly listed `replaces` step, the original verified failure, a fresh state check showing the effect is still needed, its own fee allowance and an unexpired cleanup window. Cleanup closes payout dispatch for that plan durably at dispatch, including after process restart. Cleanup dispatch also takes the worker lock to exclude a concurrently running signer. The future plan may include a separate cleanup deadline up to 30 minutes after its payment deadline. [NEAR transaction finality and receipts](https://docs.near.org/api/rpc/transactions#the-wait_until-field)
- **Executed verification.** Focused Windows Node 24.18.0 regression run passed 91 tests with zero failures or skips across reference verification, owner attempts, operation/worker scope, worker recovery, contractor payments and staging. `npx tsc --noEmit` passed. Cleanup results use deterministic RPC fixtures, including failed pause, failed revocation, unavailable evidence, restart and late conflicting evidence. No live failure or cleanup transaction was performed.
- **Containment.** At finalized height 276390487, Grandtheft remained the vault owner, the vault was paused and worker authorization was absent. Both local runtime gates were disabled and no worker process was running. After staging, the read-only integrity check found exactly two jobs: one unsigned held job for INV-0003 and the original Paid job with its pinned payload, signed bytes and [confirmed INV-0002 payment](https://testnet.nearblocks.io/txns/6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1).
- **Linux prerequisite.** The existing bundle hash is `7c0031f84d4a7b0d6d4b68c64eb59aab9b3ada80b5dd5ab164ae40249389d813`. At 21:35:59 WAT the bundle's Node audit again passed all seven input integrity checks, and its final checkpoint timestamp was inside the freshness window. This audit does not run the VM. No authorized Linux x86_64 host was available from this Windows environment. Run `bash run-linux.sh` on the authorized host with Rust 1.93.0 and Node 24.22.1 and retain the `work-*` results. The actual billing bindings are ready. A successor still requires fresh checkpoint inputs that pass the pinned VM on their exact bytes. See [V4_CHECKPOINT_VERIFICATION.md](V4_CHECKPOINT_VERIFICATION.md).

The operator reported that approval still displayed “Working.” The Approved billing record and staged job were independently verified in SQLite. The cause of the delayed browser response was not verified.
