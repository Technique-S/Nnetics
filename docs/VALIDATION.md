# Payment core validation — 29 October 2026

**Milestone 1 is incomplete.** Historical repair and the Linux verification workflow are implemented locally, but no Rust unit test or sandbox test has executed successfully. Buildability, written assertions and executable test evidence are separate below.

## Actual execution results from this continuation

| Check | Written / available | Actually executed | Result |
| --- | --- | --- | --- |
| Foundation TypeScript policy tests | 34 tests | 34 | Passed, 0 failures |
| RPC proof-normalization tests | 7 tests | 7 | Passed, 0 failures |
| Rust SDK unit tests | 30 tests: 13 original + 17 historical-proof/finality cases | **0** | Fresh build attempt exited 101 before tests: `getrandom` could not find `dlltool.exe` on Windows GNU |
| Rust sandbox integration tests | 14 top-level tests, including callback fault and real receipt-proof matrices | **0** | Not run: no supported Linux/macOS runtime available |
| Production WASM build | Default features, Rust 1.93.0 / SDK 5.29.1 | Executed | Passed |
| Production Clippy | WASM release library, `-D warnings` | Executed | Passed |
| Four callback fault-feature WASM builds | Record/finalize × gas/storage | Executed | All passed |
| WASM binary validation | Production + four fault variants | Executed with Node `WebAssembly.Module` | All five valid; 26 function exports each |
| Rust formatting | Both crates, including all new test sources | Executed | Passed |
| Bash script syntax / report JavaScript syntax | Linux verification harness | Executed with Git Bash `bash -n` / Node `--check` | Passed; this is not a Linux test run |
| Report harness negative checks | Synthetic zero-test / missing-stage fixtures | Executed | Both rejected with exit 80; no Rust tests executed by these checks |
| Existing serialized layouts | Vault, WorkOrder, Payment, collection keys and status enums | Compared against preserved baseline source | Field/variant layout unchanged; not a runtime migration test |
| GitHub Actions | Pinned Ubuntu workflow with logs/proof uploads | **Not executed** | Local only; no run URL or run ID exists |
| Public-network transactions / deployment | None | None | No signing, push, publication or deployment |

The fresh unit build-attempt log is `artifacts/local-checks/rust-unit-attempt.log`. The error is an environment/toolchain setup failure, not a failed Rust assertion. New Rust test sources have been parsed/formatted but have not completed native type checking or execution. No claim is made that any of those tests passes.

The current production artifact is `artifacts/vault.wasm`, **437,608 bytes**. SHA-256:

```text
679c2a0ba88c57eda9113999b22d2ea64ef49c89628ee33463b7a99c2aabb07a
```

Binary validation proves WASM structure only. It does not establish receipt ordering, NEAR runtime compatibility, finality verification, transfer success or callback gas sufficiency.

## Preserved baseline and implementation changes

The pre-continuation contract, tests, validation report and production WASM are preserved under `.tools/m1-baseline/`. That WASM was 290,318 bytes with SHA-256 `917e6b59fa879582421593e8d9d4c849048ae87ae11faa53a9fe6273ab172654`. It had compiled and passed Clippy, but its 13 unit and 12 sandbox tests were also unexecuted. Those prior build results are not evidence for the new repair code.

The existing contract state structs, enum variants and storage collection prefixes are unchanged. All existing core tests remain. The additive `repair` module stores a one-time checkpoint and proof-consumption records under separate versioned prefixes. Payment initiation emits an attempt commitment for later receipt-proof linkage.

[HISTORICAL_REPAIR.md](HISTORICAL_REPAIR.md) defines the repair evidence and authority:

- A trusted finalized checkpoint and ordered validator set are frozen by the owner while paused, before the first lifetime payment attempt. They cannot be reset after an incident.
- Subsequent heads require independently verified ancestry, epoch/validator commitments and more than two-thirds of the entire validator stake's valid approvals. Anyone may relay them.
- Anyone may submit finalized initiation and native-transfer inclusion proofs. The exact attempt, invoice, approved recipient, amount and child receipt must match. No caller-supplied outcome flag is accepted.
- Unknown, unfinalized, mismatched, stale, replayed or ambiguous batched evidence cannot release reservations. Proof consumption and final accounting are atomic; delayed callbacks cannot override a terminal repair.

This addresses the historical-proof gap **in source**, not as a validated security claim. The Linux proof suite, consensus encoding comparison tests, gas measurements and independent security review remain acceptance gates.

## Reproducible Linux verification

The local workflow is `.github/workflows/payment-core.yml`. It pins official checkout/setup-node/upload-artifact actions to commit hashes, uses Ubuntu 24.04, installs compiler/OpenSSL/Clang/CMake prerequisites, installs the Rust toolchain declared in `rust-toolchain.toml`, and invokes:

```sh
bash scripts/check-core.sh
```

The script uses locked Cargo dependencies and a pinned near-sandbox 0.3.12 / nearcore 2.13.0 node. It rejects a sandbox-binary override, runs all reference/unit/sandbox tests, builds production and four fault artifacts, and retains a fresh directory under `artifacts/runs/` containing:

- Per-stage logs, actual Rust test-summary counts and exit codes.
- `run.json` with commit/toolchain/platform/checksum information and explicit unit/sandbox pass fields.
- Production WASM and available raw sandbox receipt proofs/result records.

Missing stages, zero-test Rust runs and missing report generation fail verification. Prior local run files are never counted as a new run. Actions uploads evidence even on failure. The report deliberately leaves `milestone_1_accepted` false for review; a green build alone is not a security audit or automatic acceptance.

All test identities and signatures are synthetic/ephemeral. Sandbox tests call only a fresh local node and require no wallet, faucet, deployment credentials or public RPC. `scripts/prepare-repair.ts` normalizes collected RPC data offline and does not sign or submit anything.

## Written runtime assertions — not executed

The 12 existing sandbox tests cover exact recipient balance deltas; duplicate and concurrent order/invoice protection; concurrent budget reservations; amount/recipient/cap/budget/funding checks; storage/liquidity rollback; pause, vendor/order/agent revocation and expiry; authorization/key restrictions; immutable IDs and retry bounds; real failed native transfers and restored reservations; record/finalize callback gas and protocol storage failures; idempotent reconciliation and unknown client outcomes without resubmission.

Two additional sandbox tests cover frozen checkpoint authority and actual node-generated inclusion proofs with signed finality updates. The proof matrix includes successful and failed native transfers with gas/storage failure of the result-recording callback. It asserts exact recipient deltas before recipient-signed calls consume gas, retained reservations, tamper rejection, proof-based repair, accounting and replay rejection. Raw proof bundles and repair records are retained if the suite reaches those stages.

The 30 SDK unit tests additionally cover exact expiry boundaries, signer/predecessor checks, in-flight revocation, stale callbacks, immutable recipient snapshots, protocol hash compatibility with official near-primitives types, validator quorum/epoch transitions/signature failures/truncated arrays, stale heads, missing/nonterminal/unrelated/stale/replayed transfer evidence, duplicate receipt consumption, ambiguous multi-payment receipts and immutable checkpoint setup. Synthetic unit proof fixtures are not real chain evidence.

## Access needed and remaining limitations

The user selected GitHub Actions. To run it, the remaining access requirements are:

1. GitHub authentication on this machine. A GitHub CLI device login has been started; browser authorization is pending.
2. The authenticated account must have write access to [Technique-S/Nnetics](https://github.com/Technique-S/Nnetics) and permission to run Actions.

The user supplied that repository and explicitly authorized pushing on 29 October 2026. A read-only remote inspection returned no refs (empty repository). The local Git branch is `codex/payscope-milestone-1`, with that repository configured as `origin`. No push or Actions run has completed yet. No supported Linux runner has been accessed. Native Windows lacks the pinned sandbox binary; WSL is not installed and Docker is absent. Consequently there are no actual Rust assertion results or authoritative sandbox balance/receipt proofs to report yet.

Repair limitations remain explicit: the initial checkpoint and ordered current validator set are trusted bootstrap inputs and must be independently verified; the bounded verifier currently supports Ed25519/protocol-86 encodings and requires timely verified synchronization under normal PoS/light-client assumptions. Cross-epoch history, real consensus encodings, resource limits and gas/storage margins still need execution/review. Multi-payment initiating receipts and old attempts without a marker/pre-payment checkpoint stay blocked. No owner override, timeout release, automatic retry or generic state-migration escape hatch is provided.

Milestone 1 remains incomplete until the Linux unit/sandbox suite passes, exact balance and accounting evidence is retained, proof repair and rejection cases execute successfully, and the remaining consensus/resource assumptions are reviewed. UI, worker, AI extraction and testnet demonstration remain outside this milestone. No code has been pushed or deployed.
