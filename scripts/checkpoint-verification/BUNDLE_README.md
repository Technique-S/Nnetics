# V4 exact-checkpoint verification bundle

**Prepared, not Linux-executed. No live authorization.** This bundle contains the unchanged V4 JSON, its seven exact minified argument byte files, exact deployed WASM, public captured account/storage/checkpoint/protocol data, expected post-step checkpoint JSON, and a pinned offline WASM runner. It contains no environment file, database, private invitation, wallet key, login session or signing utility.

V4 SHA-256: `d6ee7587ed059a22e76ce05cf254d4de33d3066730d5abda7672424add9599f5`.

## Required execution environment

Use an existing authorized **Linux x86_64** host with **Node 24.22.1**, **Rust 1.93.0**, Cargo/rustup and native build prerequisites (C/C++ compiler, clang, cmake, pkg-config, OpenSSL headers). No infrastructure purchase is required. Toolchain/dependency installation is an operator action, not performed by this bundle. Public crates.io downloads are needed unless already cached. No NEAR/RPC/wallet credentials are needed, and the VM execution performs no network requests.

```bash
unzip nnetics-v4-checkpoint-bundle.zip -d nnetics-v4-checkpoint
cd nnetics-v4-checkpoint
bash run-linux.sh
```

The script verifies `SHA256SUMS`, runs the byte/scope/freshness audit, extracts the checksum-pinned published `near-vm-runner 0.37.4` crate, adds only the supplied integration-test target, and runs:

```bash
cargo +1.93.0 fetch --locked --manifest-path "$crate/Cargo.toml"
cargo +1.93.0 tree --locked --offline --manifest-path "$crate/Cargo.toml"
cargo +1.93.0 test --locked --offline --manifest-path "$crate/Cargo.toml" \
  --test exact_checkpoint_v4 -- --nocapture
```

No dependency version, feature, VM engine, argument, gas, deposit or lockfile should be changed to obtain a pass. The published crate's lockfile is retained; it is distinct from the repository sandbox lockfile. Its critical NEAR VM/parameters/primitives versions are 0.37.4. The capture reports **Wasmtime**; the runner compares the official protocol-88 runtime WASM/fees/storage configuration with the capture and stops on a difference. It does not substitute free/test gas settings. A missing toolchain, compile error, lock mismatch or configuration mismatch is an actual failure/blocker to report.

All execution gets a fresh `work-*` directory. Return that directory's `toolchain.txt`, `dependency-tree.txt`, `fetch.log`, `vm.log`, `vm-results.json`, and `lock-after.txt`, plus the latest `results/audit-*.json`. A valid result needs **seven rows**, no abort, exact post-step checkpoint equality and `complete=true`. Partial logs are retained on failure. Do not rerun unrelated application or sandbox suites.

## What is and is not verified

The Node preparation already verified all seven actual signed updates from the exact originally approved root/ordered validator sets, including the original bootstrap argument digest. It checked quorum, signatures, commitments, ancestry, increasing height/time, transaction sizes/gas/deposits, ordering and final freshness. This is author verification, not independent security review or WASM execution.

The Rust test executes the **actual deployed WASM** with the **actual captured public state** at the captured height/time. Each exact `advance_repair_head` input gets **250 Tgas and zero deposit**. Initial checkpoint and each expected next checkpoint are checked through the WASM getters; other storage, vault accounting, pause and agent state must remain unchanged. The contract independently verifies its real proofs. No fixture validator, substituted proof, regenerated signature or reinitialized root is used.

The runner uses nearcore's memory-trie `MockedExternal` adapter to supply the real captured state. This is an **offline WASM/host-function check**, not full nearcore receipt execution, network consensus/state-proof verification or a real transaction. Trie-I/O proof charges, transaction/receipt overhead and current fees are not a complete live-gas benchmark. Unused context values (random seed, epoch-height) are fixed; checkpoint verification uses the real captured block height/time and the epochs inside the signed headers. Memory-overlay discard on failure is a harness behavior, not independent proof of chain rollback. Existing sandbox atomicity evidence remains separate.

## Freshness and readiness

V4 expires **6 November 2026, 05:14:10.901 WAT**. Its final checkpoint expires **07:35:20.133 WAT**. Default execution refuses expired/future evidence. If the deadline passes, these exact inputs can still be checked for **historical verification only**:

```bash
bash run-linux.sh --historical
```

That flag does not extend a deadline or authorize a transaction. A refreshed plan requires explicit new version/hash review and, where necessary, explicitly collected new authenticated inputs. Never silently regenerate or replace these seven files.

**A VM pass will not by itself make V4 live-ready.** V4 still predicts INV-0003 instead of binding an actual reviewed bill UUID, local agreement UUID and immutable durable job payload. Those records currently do not exist. They must be created/reviewed through the normal application, then bound in an amended plan. Its fixed Babygoat recipient/0.001-NEAR amount are not permission to select a different bill.

V4 also lacks sufficient failed-cleanup recovery: the V3 success-only collector retains finalized failures as held attempts, and an unresolved/failed cleanup step cannot simply be retried or bypassed. Stop the worker, disable both gates, retain all evidence/reservations, obtain a conclusive read-only outcome, and prepare a separately reviewed failure-adjudication/cleanup amendment. Never clear a hold/rearm a step or sign a replacement. The readiness report details the required pause/revocation decision table.

The original Paid invoice/job and V2 hold remain untouched. This bundle signs nothing, submits nothing and does not enable either runtime gate.
