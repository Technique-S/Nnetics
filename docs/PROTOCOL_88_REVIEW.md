# Protocol 88 compatibility investigation

29 October 2026. This is a bounded implementation-author comparison, not an
independent audit or transaction authorization. Production Rust code, serialized
state, public methods and payout/recovery rules are unchanged.

## Pinned sources

Compare nearcore 2.13.0 (`499283a5e3a6f8ea52bc068c28e3a7bebb1e38c0`)
with the testnet 2.14.0-rc.5 release
(`b7b4737cab46f17a6daa2ed694d7aebbd204363a`). Source files were fetched from the
official repository at these exact commits; reviewed copies are in ignored `.tools`.
Workspaces 0.23.0's published crate was checked against the Cargo.lock SHA-256
`a0bef8f24e12779aafee45b0549e7dbbfa331699d2cd3dece8fa1056797a3111`
before using `sandbox_with_version`. The SDK and lockfile versions were not upgraded.

## Findings

- [Light-client view construction](https://github.com/near/nearcore/blob/b7b4737cab46f17a6daa2ed694d7aebbd204363a/chain/chain/src/lightclient.rs)
  still uses the next block's inner hash and after-next approvals from sequential
  finalized blocks. Its change is the optional `chunk_execution_root` view field.
- [Header serialization](https://github.com/near/nearcore/blob/b7b4737cab46f17a6daa2ed694d7aebbd204363a/core/primitives/src/views.rs#L2754)
  uses the old inner-lite bytes when this field is absent, and V2 bytes when present.
  [Block-header dispatch](https://github.com/near/nearcore/blob/b7b4737cab46f17a6daa2ed694d7aebbd204363a/core/primitives/src/block_header.rs#L1741)
  returns None for V1–V6 and a value for V7. V7 creation is gated on Spice;
  [this pinned feature table](https://github.com/near/nearcore/blob/b7b4737cab46f17a6daa2ed694d7aebbd204363a/core/primitives-core/src/version.rs#L652)
  activates Spice at protocol 180, not stable protocol 88. This comparison does not
  claim support for Spice. The offline normalizer now explicitly rejects a non-null
  root rather than discarding a future hash commitment. A regression covers legacy
  absence/null and unsupported non-null input.
- [Ordered approver selection](https://github.com/near/nearcore/blob/b7b4737cab46f17a6daa2ed694d7aebbd204363a/chain/epoch-manager/src/lib.rs#L1504)
  is unchanged ignoring whitespace: current ordered settlement plus next-epoch-only
  approvers at the boundary, with duplicate accounts merged. The function's normalized
  SHA-256 is `20448e3a1e9dc9bf6260e087f914ac661a24d54f54551cdaa7b1c6844a5439d5`
  in both sources. This supports retaining the current signer-prefix and 256-slot
  assumptions; it does not authenticate an owner-supplied initial set.
- `get_epoch_block_producers_view` is also unchanged ignoring whitespace, normalized
  SHA-256 `f1166c17e233ae1ff7095101ec93ca3c3a96ff8029a3373dfb70e5b23cdc45c0`.
  [Validator commitments](https://github.com/near/nearcore/blob/b7b4737cab46f17a6daa2ed694d7aebbd204363a/core/primitives/src/block_header.rs#L1845)
  retain the versioned validator-stake Borsh hashing path. Existing support remains
  bounded to V1 stake records and Ed25519 validators.
- [Partial execution outcomes](https://github.com/near/nearcore/blob/b7b4737cab46f17a6daa2ed694d7aebbd204363a/core/primitives/src/transaction.rs#L622)
  retain receipt IDs, gas, tokens, executor and partial status. Status discriminants
  remain Unknown=0, Failure=1, SuccessValue=2, SuccessReceiptId=3. Logs remain separately
  hashed. No transfer-result override or receipt-link shortcut was introduced.

## Runtime evidence boundary

The first integration push is `80d253d41d63bdd782abf7d66a2036dc07793e0b`.
[Owner CI 40947353242](https://github.com/Technique-S/Nnetics/actions/runs/40947353242)
passed strict TypeScript, 26 Node tests, production build and 12 Chromium browser
executions on Linux. Browser/worker fixtures are controlled, not real testnet payments.
[Contract matrix 40947353192](https://github.com/Technique-S/Nnetics/actions/runs/40947353192)
passed both nearcore 2.13.0 / protocol 86 and 2.14.0-rc.5 / protocol 88. Each job
executed 41 root TypeScript tests, 36 Rust unit tests and 15 sandbox integration
tests, five WASM builds, Clippy and formatting. Each asserted the runtime-reported
protocol before exercising payment, real receipt-proof and maximum-resource/rollback
suites. Artifacts are retained under ignored `artifacts/github/40947353192/`.

The protocol-88 synthetic maximum workload used 128 validators per set, 128
verified signatures, 256 approval slots, six paths of 64 siblings and 128,000 input
bytes. Measured total gas (success/failure proof respectively): bootstrap
40.863490/40.863490 Tgas, head update 62.566334/62.566428 Tgas and repair
31.032709/31.123741 Tgas. Bootstrap storage grew 31,326 bytes; repair grew 285/229
bytes. Recipient deltas were exactly 1 NEAR/zero. Deliberate late gas exhaustion
(307.586533 Tgas including receipt/transaction overhead) and storage-guard failures
(66.547066/66.638073 Tgas) preserved the full compared state, including reservations
and terminal accounting. These finite synthetic cases do not prove every possible
JSON shape is a worst case. Production WASM SHA-256 remains
`1dd4f6971b13303661b29c6757a353c873368848490bdce2cd86a9cc360459f8`.

The follow-up shares an explicit tested-version allowlist (86 and 88) between
wallet, worker and setup executor. Unknown versions fail before signing/broadcast;
transaction authorization and checkpoint gates remain separate. The parser guard
and allowlist follow-up passed 42 root tests, 26 application tests and strict
TypeScript locally; its CI results must be tied to its own commit.

Independent security review, trusted bootstrap/network selection, weak subjectivity,
timely head synchronization, upgrade credentials, future header/validator formats and
unmeasured workloads remain outside this comparison. Public signing/deployment gates
remain in force. The normalizer hardening is a separate follow-up to the first push;
its execution results must be recorded against its own source commit.
