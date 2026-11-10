# Operational payment integration — local result

**Later blocking V4 review:** [V4 checkpoint verification](V4_CHECKPOINT_VERIFICATION.md) confirms the exact-input local proof checks and prepared Linux bundle, but no VM execution yet. It also identifies missing actual bill/job approval bindings and success-only finalized-failure handling that blocks failed cleanup. The earlier implementation description below is not full operational acceptance; these must be resolved before a live run.

5 November 2026. Submission preparation is paused. The recording guide and publication proposal remain preserved as earlier snapshots; this work does not publish or update their release manifest.

## Runtime reference verification

`runtime-reference.ts` verifies the reviewed V3 file SHA-256 `1ff5abb96c4633d8d6f510ec4a2ab44c1fbf0bfe45d959edc05dc7bbd6543709`. The unchanged historical JSON remains assessment-only and is not an owner authorization file. For new attempts, a trusted in-memory binding instantiates its bounds/sources against the exact server-prepared, separately approved intent. Serialized wallet fields cannot enable that binding or seal evidence.

The normal owner-attempt path can reconcile an unchanged reference or a bounded refresh. It binds signer, Ed25519 key, exact nonce, receiver, full action list, argument bytes, deposit and gas; reconstructs canonical V0 bytes/hash; verifies the transaction signature; and requires dual-source finalized successful execution, code/owner checks and the complete supported action/refund receipt graph. Unsupported shapes and definitive mismatches remain manual review. A verified refresh records both the prepared and actual transaction IDs; it never replaces the prepared ID.

Bounds remain: three-minute review, prepared head at most 30 seconds old, reference advance at most 256 heights, inclusion and receipts each at most 16 blocks/30 seconds, at most 35 headers/128 HTTP attempts/180 seconds, fixed genesis and protocol 88. Evidence relies on the configured HTTPS sources, not a locally verified consensus proof. Post-submission validation **does not prevent Meteor from submitting altered bytes**. Nnetics controls the reviewed intent, gate, selected account proof and durable dispatch before wallet handoff; afterward it authenticates what actually executed. Incompatible results stay held.

V4 extends intent binding to the application's existing owner methods and the existing zero-deposit checkpoint advance method. Ordinary calls retain 100 Tgas/0.022-NEAR ceilings; checkpoint relays require 250 Tgas/0.055-NEAR ceilings. This is not a mutation of V2 or a grant to execute those actions. A separate exact, hash-pinned plan and selected step are required.

SQLite `BEGIN IMMEDIATE` protects reservation, per-step consumption, evidence merges and finalization. Finalization compares the current durable snapshot after RPC, verifies consumed authorization, and atomically saves history/removes the active row. Concurrent or late conflicting reports restore/retain a hold in the correct operation scope; they also block a later prepared operation at dispatch. Editorial plan changes do not rearm step identities. Temporary evidence failures retain the claim across restart and permit read-only reconciliation; definitive mismatches cannot use that recovery path.

The historical V2 record remains in its original scope, unchanged/manual-review/consumed. Only its exact separately accepted historical evidence is recognized when allowing a *different explicitly reviewed* operational scope. Additional reports against that historical record would block new operations. No history/hold was cleared or reused.

## Owner → invoice → worker → status

Existing normal flows remain: verified wallet identity → owner authorization against the configured vault → reviewed owner transaction → approved chain agreement → reviewed billing invoice with matching immutable recipient/NEAR amount → unique durable import/held job → explicit owner release → selected worker job → authoritative contract payment plus exact transaction marker linkage → Paid on both screens.

The new V4 owner gate selects one exact operation from a bounded plan; it cannot enable the worker, install keys or unpause implicitly. Missing/malformed/hash-mismatched/expired plans fail closed. Earlier non-cleanup steps must be durably confirmed; unresolved operations block a new reserve or dispatch. Authorizing automatic payments additionally checks the actual restricted key against the configured vault/method and finite allowance.

The worker now requires `--once --job`, a separately hash-pinned single-payment plan and the exact generated invoice reference/order/recipient/amount. Its key remains external. Gas/allowance/storage-adjusted balance checks precede key loading. Permission/plan changes during preflight/broadcast stop signing/submission. Restricted permissions must target `execute_payment` only. Persisted bytes must also have the exact scoped arguments, zero deposit and 250 Tgas. Existing signed bytes/hash, claims, restart reconciliation and reservations remain intact; another queued job is not executed.

Readiness is checked before claiming a queued job: expired checkpoints leave it queued/unsigned, so a later authenticated refresh can resume safely. Unknown signed outcomes keep their existing claim/bytes and are reconciled first. Chain Paid plus verified transaction linkage remains required; queueing or a successful outer transaction alone is insufficient.

## Checkpoint lifecycle

`scripts/prepare-checkpoint.ts` performs read-only network collection and stages local proposals. It never reads a signing key or submits a transaction. It pins genesis/protocol, corroborates the stored checkpoint/current block, collects bounded archival updates/ancestry, and mirrors Rust's same/next-epoch, validator commitment, >2/3 stake signatures, ancestry, height/time and input bounds. The contract independently verifies the update.

Recent sources returned `UNKNOWN_BLOCK` for the old root/header. An archival endpoint supplied a valid signed path. Seven staged updates reach head `JBDep4XZ79gwwbc7KhQUQ24TVsbHDPDfzUbPusfPTc6c`, height **276306052**, without resetting the existing root. Their normalized arguments are **8,980–9,634 bytes** each. They are **awaiting approval, not installed**. The first fresh head had inadequate remaining review time; collection continued to a head with more than twelve hours of remaining freshness.

Stage identities and prior/next heads persist in SQLite. Duplicate collection returns the same proposal; competing proposals remain blocked. Installed status requires an exact complete finalized checkpoint read, not merely a newer timestamp/height. Proposal freshness is recomputed when read. During operation, prepare a reviewed advancement before the remaining freshness drops below twelve hours. If it cannot be obtained/approved/installed before 24 hours, signing and broadcast stop. There is no automatic relayer or permissionless root reset. Epoch gaps must be bridged sequentially.

No independent security review occurred. Validator quorum is conditional on the initially owner-trusted root; author verification cannot resolve weak subjectivity or substitute for third-party review. Archival header availability is not independent corroboration. The exact seven inputs still need pinned Linux VM execution before a live run.

## Verification and remaining boundary

See the latest section of [VALIDATION.md](VALIDATION.md) for actual totals, artifacts and the browser replay limitation. [V4 acceptance](OPERATIONAL_TESTNET_ACCEPTANCE_V4.md) is a complete conditional transaction package, not execution approval. No new real-wallet transaction or uninterrupted final-server acceptance has occurred. The running server was not restarted.

Implemented billing, deterministic parsing, bounded owner preparation, queue/worker and authoritative status paths are distinct from activated operation. Both gates are off, the vault is paused and the worker is revoked/stopped. No chat assistant, recurring payments or cross-chain operation is implemented by this task. Optional extraction code from earlier work is not used or enabled for this acceptance.
