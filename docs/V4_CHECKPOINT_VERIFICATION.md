# V4 checkpoint verification — not live-ready

## Matched Linux run passed all seven calls

The returned `nnetics-v4-matched-linux-results.zip` has SHA-256 `6594eab1c8bb7dbeace008c270d81669677a55934892d33eca77592605602962`. The final test passed on Linux x86_64 with Rust and Cargo 1.95.0, Node 24.22.1 and Wasmtime at the pinned nearcore revision. The strict protocol 88 WASM, fee and storage price comparisons passed. All seven original inputs ran in order, with each resulting checkpoint matching its expected state. The report and VM log agree, and all seven ordered input hashes and lengths were cross-checked against the original bundle. Peak VM gas was **7.846437378628 Tgas** out of 250 Tgas. Storage fell from **431,495 to 431,334 bytes**. The archive records zero network transactions.

The first matched build exposed a signer-key type error in the locally supplied harness. A subsequent run exposed an incorrect assumption that the vault getter's derived storage stake would stay constant. The final harness uses the captured key bytes and checks that storage usage changes by exactly the checkpoint value's byte delta. It recomputes the storage stake using the matched runtime price, while still comparing all other getter fields and non-checkpoint storage. The local harness now matches the executed file at SHA-256 `d191d5fc763ebb7e2fefe1109bbe72467a3f135b610d746d3ddd7086ef3738b9`.

This is offline VM evidence for the original inputs and captured state. It does not measure full receipt or trie overhead. V4 retains its original expiry and lacks approval for live execution. A successor plan requires a current checkpoint and state review, VM verification of any replacement inputs, and separate approval.

## Returned Linux result and matched-runtime rerun

The operator returned `nnetics-v4-linux-results.zip` at SHA-256 `75be12324696e8ee7600feb834f6e641589b210cfed2252b8749beaef96543a9`. The archive records a Linux x86_64 build with Rust and Cargo 1.93.0, Node 24.22.1 and near-vm-runner 0.37.4. The lockfile digest matched before and after. The Node audit passed at 22:00:51 WAT. The Rust harness reached the strict `wasm_config` comparison after checking the plan and deployed WASM hashes. It failed there with 18 different configuration paths, including SHA-3, ML-DSA and universal-account settings. **Zero checkpoint calls executed and no `vm-results.json` exists.** The returned harness patch only split an invalid Rust declaration.

Both configured testnet RPCs subsequently reported protocol 88 and nearcore `2.14.0-rc.5`, commit `b7b4737cab46f17a6daa2ed694d7aebbd204363a`. The official source pins Rust 1.95.0 and identifies the workspace crates as `0.38.0-rc.5`. This identifies a candidate for exact parity. The candidate must still pass the complete configuration comparison, including fees and storage price, before any checkpoint can run. [Official nearcore revision](https://github.com/near/nearcore/tree/b7b4737cab46f17a6daa2ed694d7aebbd204363a)

On the authorized Linux host, place `run-matched-linux.sh` and the corrected `vm_test.rs` side by side, outside the extracted original bundle. With Node 24.22.1 and Rust 1.95.0 already available, run

```bash
bash run-matched-linux.sh /path/to/extracted-original-bundle
```

After the V4 or checkpoint deadline, append `--historical` for measurement only. The script checks the original bundle checksums, fetches the exact public nearcore commit, checks its workspace lockfile SHA-256 `0da292b89a32e53e4d4cb33e231f0f834ccfe777ea5e69ffddf4f731ff0b4223`, and runs a locked offline test after dependency fetch. Retain the printed evidence directory, including the harness diff, config failure if any, and all seven result rows if successful.

## Original capture and runner preparation

5 November 2026. The original V4 remains byte-for-byte unchanged at SHA-256 **`d6ee7587ed059a22e76ce05cf254d4de33d3066730d5abda7672424add9599f5`**. The sections below record the original capture and pre-run assessment.

## Actual evidence

Read-only public capture: `artifacts/v4-checkpoint-verification/bundle-2026-11-05T19-33-03-966Z/capture.json`. It pins finalized testnet block **276384748**, timestamp **1793907191893343062 ns**, and the same block from both fixed HTTPS sources. Genesis/protocol 88, expected code, owner Grandtheft, paused state, absent agent and zero vault keys passed. Provider agreement is trusted HTTPS corroboration, not independent consensus/state-proof verification.

- Deployed WASM code hash: `Fpxm2eovD9cdo5ik6yZURyQEWTbruj6GKJi2XA6UBArJ`.
- Exact WASM SHA-256: `dc4cf64736110a33cce94531e2e00ba4510bcebbbb240bee6ecdacacf778560f`.
- Existing root: `Gk91ppKatpsQhi62mK9CE1WKfFMFA7BH1EDt3vBSnnpD`.
- Captured complete root/ordered validator-set argument digest: **`e38bed03aadd216a2472fb92064cf77ee54aecc86f405f22259c6f6607731027`**, matching the previously approved bootstrap exactly. Its approval provenance is the preserved payment resumption digest `9ea7cb9e479d5df6c6cd79793aeb1ea53fb34e6b76a8fc139895afa4b06a27d8`. This retains the original owner-trusted validator assumption; it is not a new bootstrap.
- Final proposed head: `JBDep4XZ79gwwbc7KhQUQ24TVsbHDPDfzUbPusfPTc6c`, height **276306052**.
- The existing deployed verifier source and toolchain remain pinned: near-sdk **5.29.1**, NEAR primitives/VM/parameters **0.37.4**, Rust **1.93.0**. Installed local Node used for preparation: **24.18.0** / installed NEAR SDK **7.4.0**. Linux commands require Node **24.22.1**; that version was not executed here.

The local existing verifier checked all seven actual updates from this captured, approved root: Ed25519 approvals, strictly greater than two-thirds stake, current/next-epoch constraints, next-set commitments, ancestry, increasing height/time and finalized bounds. Each `from` equals the prior `to`, and the final head equals V4. Every file matches V4's exact minified JSON argument hash and size, with **zero deposit and 250 Tgas**, without substituting synthetic validators or signatures.

| Input | Exact bytes | SHA-256 |
| --- | --- | --- |
| checkpoint-1 | 9605 | `763c7a18654480800430877d042d1a6fbf1f98dd3be1f4b0d1fe1133e819c3a9` |
| checkpoint-2 | 9634 | `530b4a10c7e360f5d327ad0a36c4633c014da2c9b5c6bfbfff164138248c3673` |
| checkpoint-3 | 9198 | `c75482d85e8165eccfa68ccd1c861a24123cd443e92af93ad6972f4b79e45ca7` |
| checkpoint-4 | 9133 | `ea939c7fc3d5ef12d69f180dfca201a4555fcb34e3a0790380103186ac280720` |
| checkpoint-5 | 9502 | `dcc4ce5bda82d68bd337528795b4b5d978644c69d2e0eebfd938801ebc316e40` |
| checkpoint-6 | 9383 | `28286468dee41d8166d4d2349835835cb87018485e7a1af5b1536f2d8d544334` |
| checkpoint-7 | 8980 | `94027263d17137f32298021472d91a2571b34536fce533c3292ff64015228431` |

Freshness passed at capture and the subsequent **20:56:18 WAT** audit. V4's dispatch deadline remains **6 November, 05:14:10.901 WAT**; the final checkpoint's 24-hour deadline remains **07:35:20.133 WAT**. Intermediate heads need not be fresh; they must authenticate sequentially from the unchanged root. The final installed head must be fresh before activation. No expiry extension or refreshed input set was prepared while this version remains unexpired. Once expired, it cannot be executed: a separately reviewed refreshed version/hash is required, with newly disclosed inputs if necessary. Merely changing a date is not proof refresh.

## Linux handoff — exact commands, not execution results

Available-machine checks: WSL explicitly reports not installed; neither Cargo nor Docker is available; there is no configured SSH host. No infrastructure was purchased, cloud task created, secret uploaded, or unavailable environment bypassed.

Self-contained input/runner bundle: **`artifacts/v4-checkpoint-verification/nnetics-v4-checkpoint-bundle.zip`**, **1,706,342 bytes**.

ZIP SHA-256: **`7c0031f84d4a7b0d6d4b68c64eb59aab9b3ada80b5dd5ab164ae40249389d813`**.

Manifest SHA-256: `594de08499fa8b219625aa9d8f908d2b61740f6656b9c513144ebd3445528829`.

It contains exact deployed WASM, public captured state/config, unchanged plan, seven exact argument files, expected checkpoint results, provenance, per-file hashes, a checksum-pinned official VM crate and the offline runner. It excludes off-chain records, local databases, sessions, invitation links, environment files and private keys. A toolchain/public Cargo dependency cache is still required; this is not an air-gapped toolchain installer.

On an **existing authorized Linux x86_64 host** with Rust **1.93.0**, Node **24.22.1**, C/C++ build tools, clang/cmake/pkg-config/OpenSSL headers:

```bash
unzip nnetics-v4-checkpoint-bundle.zip -d nnetics-v4-checkpoint
cd nnetics-v4-checkpoint
bash run-linux.sh
```

The script's exact compiler execution is `cargo +1.93.0 test --locked --offline --manifest-path "$crate/Cargo.toml" --test exact_checkpoint_v4 -- --nocapture`, after a public `cargo fetch --locked` and dependency-tree capture. It uses the published **near-vm-runner 0.37.4** crate, SHA-256 **`5dc1e62fcd234ddde5c8452081ddb61a9d98a1d00ca85405f7df96e916bbcff3`**, its unchanged published lockfile and default Wasmtime engine. That lockfile is distinct from the application sandbox lockfile; critical NEAR runtime versions are pinned to 0.37.4. The only upstream manifest addition is the new integration-test target. No dependency resolution override, alternate engine or test/free gas model is permitted. Protocol-88 WASM/fee/storage configuration must equal the captured official configuration before execution.

The harness is **written but uncompiled/unexecuted** here. It supplies the real public storage to the actual WASM, verifies its initial root with a getter, executes the seven exact zero-deposit/250-Tgas calls, checks every expected checkpoint and preserves unrelated state/accounting/pause/agent values. It records per-step gas/storage/abort results in a fresh `work-*` directory. Any compiler/configuration/gas/proof error is a failure to return, not permission to modify the inputs for a pass.

This is offline WASM execution with nearcore's memory-trie adapter, not full nearcore trie/receipt execution or new chain evidence. Trie-proof I/O charges and transaction/receipt overhead remain outside that isolated gas measurement. A harness memory-overlay discard is not proof of chain rollback. No synthetic proof is substituted. Fresh live fee/authorization/receipt checks remain necessary even after a VM pass.

Return `work-*/toolchain.txt`, `dependency-tree.txt`, `fetch.log`, `vm.log`, `vm-results.json`, `lock-after.txt` and the latest `results/audit-*.json`. Missing/incomplete rows are not a pass. After expiry, `bash run-linux.sh --historical` may measure the unchanged historical inputs; it must never be treated as renewed live approval.

Actual local commands executed: `node scripts/checkpoint-verification/prepare.mjs`, `node scripts/checkpoint-verification/finalize.mjs`, the bundled `node audit.mjs`, JavaScript syntax checks and **Windows Git Bash `-n` syntax-only**. Node collection/proof/integrity/scope checks passed. **No Linux, Rust, WASM execution or new unchanged application test suites ran.** Existing passing evidence was reused without rerunning it.

## V4 disposition and discrepancies

| Requirement | Result |
| --- | --- |
| Exactly one 0.001-NEAR payment to `babygoat.testnet` | Pass in the planned worker method/arguments and scope; live execution not authorized |
| Approved Babygoat recipient | Existing `babygoat-acceptance` vendor independently read at the captured block from both configured URLs: active, recipient exactly `babygoat.testnet` |
| Cumulative vs additional authority | Pass: total budget 0.002 minus existing spent 0.001/reserved zero gives exactly 0.001 additional authority; per-payment cap remains 0.001 |
| Deposits/fees/funding | Pass: 7 × 0.055 checkpoint fees + 7 × 0.022 ordinary owner fees + 0.001 payout deposit + 6 yocto deposits = **0.540000000000000000000006 NEAR**. Add worker fee ceiling 0.055 = **0.595000000000000000000006 NEAR**. Worker additional funding is zero. The 0.001 payout uses the already-counted deposit; it is not counted again |
| Actual immutable bill/agreement/job binding | **Blocked**: V4 lines 9489–9490 explicitly only predict INV-0003. Read-only database check found zero such bills, zero such jobs, exactly one original Paid job. Worker scope only binds the expected string plus order/recipient/amount (`worker-scope.ts:7–11`); V4 does not pin an actual billing invoice UUID, local agreement UUID, approved source/details hash or durable import/job payload |
| Duplicate/unresolved protection | Existing atomic per-step consumption, queue order claim, restricted job/args and unknown-outcome holds are present; no replacement was signed. This does not remedy the missing actual bill/job approval binding |
| Failed pause/revocation recovery | **Blocked**: V4 lines 9538 onward do not fully specify these cases. `reference-block-policy.ts:83,118` accepts FINAL success only. `owner-attempt.ts:184` retains evidence-collection failures as held/awaiting evidence; unresolved owner attempts block subsequent operational steps (`:37,129,158`). Thus a finalized failed pause/revoke is not automatically adjudicated as failed and cannot simply be retried or bypassed under V4 |
| Expiry | New dispatch fails closed at `operation-scope.ts:17`; worker also checks expiry. Expiry is not an on-chain cancellation of bytes already held/submitted by a wallet. No V4 requests were handed to a wallet |

**V4 is not approval-ready even if the seven VM calls pass.** Preserve V4, its scope/expiry and all historical holds. Before an executable amendment: create/review the new off-chain bill through normal authorized application flows; bind its existing invoice/agreement/contractor UUIDs, approved recipient/amount/original-text hash and immutable queue/import payload; add runtime verification of those bindings; and resolve the success-only finalized-failure/cleanup path without reopening a consumed transaction. Do not fabricate records or use INV-0002 to fill these fields.

## Required partial-execution/cleanup procedure

These are review requirements, not newly authorized transactions or a permission to clear a hold.

| Observed condition | Required action |
| --- | --- |
| Failure before authorization/unpause | Keep worker stopped/gates disabled; verify actual pause/agent state; retain completed checkpoint/funding/limit calls and do not repeat them |
| Worker timeout/unknown | Stop worker/disable payment gate immediately; retain signed bytes, hash, claim and reservation. Reconcile the same job; no replacement, new invoice or new job |
| Pause outcome unknown | Stop worker/disable both gates, preserve owner attempt/nonce/IDs. Read-only reconciliation only. Do not sign a replacement or assume containment; further owner calls require a conclusive outcome and reviewed disposition |
| Pause finalized failure | Treat containment as unverified. The success-only runtime currently holds this case. Obtain authenticated exact failure evidence, implement/review failure adjudication, then prepare a new narrow cleanup amendment with fresh nonce/fees. Never rearm the failed V4 step |
| Pause succeeds, revocation unknown | Paused state is one confirmed guard; authorization is still unverified. Keep gates disabled/worker stopped and reconcile the existing revocation without resubmission |
| Revocation finalized failure | Retain the confirmed pause and failure evidence. Authorization remains active until conclusively revoked. A separately reviewed cleanup amendment is required; no reuse of the consumed step |
| Insufficient fees, unavailable owner, or deadline during cleanup | No automatic top-up/key change/alternate signer. Keep gates off/worker stopped, report exact on-chain pause/agent state and remaining risk; obtain narrowly scoped assistance/approval. Do not report acceptance/containment complete |
| Both cleanup results confirmed | Verify paused plus agent null, gates off and no worker; then verify one terminal job/transfer and retry/restart exclusion. Preserve V2/INV-0002 evidence unchanged |

**Specific remaining access:** an authorized Linux x86_64 execution environment (or an SSH alias configured locally), or the operator can run the supplied bundle and return its result directory. No private key, seed phrase, hosted infrastructure purchase, repository push or live deployment is needed. Actual bill/job binding and reviewed failure-cleanup handling remain separate operational blockers. No independent security review has occurred.

Final read-only containment at **21:02:38 WAT**, block **276387750** / `259ycANoo8iZXZkt3eJRs8UHCeM5jQfYLrNZp7174JWi`: expected code/owner, vault paused, agent null, both gates disabled, worker process count zero. Exactly one original Paid job remains; V2's original snapshot digest, both IDs, one consumed use and manual-review history are unchanged. Archive verification checked all **31 static entries** against the manifest and found no environment/database filenames. HEAD remains `70e4f5b43db9d037e4b1fd70269dca92b3c3b86f`; no commit or push occurred.
