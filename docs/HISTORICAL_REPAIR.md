# Historical native-transfer repair

Status: exercised by real sandbox proofs and the maximum-input/atomic-failure VM benchmark in [run 40877809725](https://github.com/Technique-S/Nnetics/actions/runs/40877809725): 36 unit and 15 sandbox tests passed. The [bounded author review](M1_REVIEW.md) is complete; independent security review remains outstanding. No audited or production-ready claim is made. See [VALIDATION.md](VALIDATION.md) for measured results and limitations.

## What counts as authoritative evidence

A transaction hash, explorer page, RPC JSON response, recipient balance, owner statement, elapsed timeout or callback failure does not establish whether the native transfer succeeded. `repair_payment` accepts two NEAR execution-outcome inclusion proofs authenticated against a finalized head:

1. The successful **initiating receipt**, executed by this vault, containing exactly one `PAYSCOPE_TRANSFER_V1` marker. The marker commits to the vault account, attempt ID, order ID, invoice reference, recipient, amount and initiation time. The first generated child receipt is the native transfer. Multiple initiation markers are rejected as ambiguous, including full-access-key batches.
2. The **exact native transfer receipt** identified by that first child ID, executed at the approved recipient. Only an empty `SuccessValue` or a protocol `Failure` is terminal evidence. `Unknown`, continuation receipt IDs and unexpected response payloads cannot release a reservation.

Both proofs must independently establish outcome-to-shard-root, shard-root-to-block-outcome-root and block-to-finalized-head inclusion. Receipt IDs, executor accounts, timestamps and the attempt commitment are checked in addition to the Merkle paths. The contract reconstructs protocol Borsh hashes; it does not accept caller-computed roots or a caller-supplied success flag.

The hashing and finality design follows the [NEAR light-client specification](https://nomicon.io/ChainSpec/LightClient), the [official light-client implementation](https://github.com/near/near-light-client/blob/master/crates/protocol/src/lib.rs), and `near-primitives` 0.37.4's partial execution status/outcome encodings. RPC proof shapes are documented by NEAR for [execution proofs](https://docs.near.org/api-reference/light-client-proof) and [block proofs](https://docs.near.org/api-reference/light-client-block-proof). Rust comparison tests against the official types executed and passed in Linux run `40863676284`, after detecting and correcting a validator public-key serialization mismatch.

## Trust anchor and finality

`initialize_repair_checkpoint(checkpoint)` requires the direct owner, exactly one yoctoNEAR, a paused vault and **zero lifetime payment attempts**. It can be called once. The initial finalized header and ordered current validator set are trusted bootstrap inputs. The next validator set must match the header's committed hash. Deployment operators must verify the network, finalized checkpoint hash/height and ordered validator sets independently before authorizing this initialization. Merely downloading them from one RPC does not remove this bootstrap trust assumption.

The owner cannot reset the checkpoint, change its validators after initialization, or install a convenient new root after a payment fails. No root or outcome override exists. A pre-existing vault that has already initiated payments without a checkpoint cannot enable this recovery path afterward.

Anyone may relay `advance_repair_head(update)` with 300 Tgas. The contract checks increasing height/time, local chain height/time bounds, ancestry from the existing head, the allowed current/next epoch, validator-set commitments, Ed25519 approval signatures and strictly more than two-thirds of the **entire** current epoch's stake. Missing/truncated approval arrays do not shrink the stake denominator. Epoch transitions must supply and verify the following validator set. At most the current and next sets are retained, so intermediate epochs must be relayed in order.

This is a bounded light client for the pinned protocol-86 sandbox: up to 128 validators per set, Ed25519 approvals, up to 64 Merkle siblings per path and 128 KB normalized request arguments. Unsupported keys, encodings, oversized proofs and missing epoch history fail closed. Production use requires independent review of consensus encodings, gas bounds, epoch transitions and the standard PoS/light-client assumptions, including a trustworthy bootstrap and protection against long-range attacks through timely verified synchronization. No production-ready or audited light-client claim is made.

## Invocation, accounting and replay protection

`repair_payment(attempt_id, initiation, transfer)` is permissionless, accepts zero deposit and should receive 300 Tgas. An unprivileged account may pay verification gas. The owner can add storage/operational funds through `fund_storage`; this grants no new payout authority.

Before mutation, the payment must still be `Pending`, the order must still be pending on this exact current attempt, and the invoice claim must belong to it. A final receipt for another vault, order, invoice, recipient, amount or attempt cannot satisfy the commitment and child-receipt checks. A consumed transfer receipt is also permanently marked with its attempt ID. Repair rejects a previously repaired or callback-finalized attempt. Ordinary reconciliation remains idempotent.

Successful evidence moves reservation to spent and makes the order/payment paid. Failed-transfer evidence releases the reservation and the attempt's invoice claim, records failure and restores only the order's status to approved. An existing revocation flag stays disabled. The next initiation still checks pause, agent/key, vendor, expiry, amount, budget, cap and funding.

Proof consumption, the repair audit record, transfer result and final accounting commit in one receipt. A gas/storage failure rolls all of them back. Retrying the same valid evidence after funding/fixing the failure is safe. A delayed original callback cannot override a repaired terminal record. Pause, revocation or expiry cannot undo a transfer already conclusively proved to have occurred.

The added light-client and replay records use separate versioned storage prefixes. The existing `Vault`, `WorkOrder`, `Payment` and their collection prefixes/serialized layouts are unchanged. The existing authorization and payout rules remain in force. The pre-change source, tests and validation record were preserved under `.tools/m1-baseline/`; the original contract source SHA-256 is `b0321c1c2f7b80479ed0119f9cdccacd20ba5bfe3862e4b04609aa0b0d202c40`.

## Collect and prepare evidence

No helper signs or submits transactions. Collect full RPC **result objects**, preserving exact decimal strings and original logs:

- For bootstrap: the selected finalized light-client block and its independently verified ordered current validator list. `next_bps` must be present; a missing list is not permission to invent one.
- For head updates: `next_light_client_block` output and the old-head-to-new-head block inclusion path from `EXPERIMENTAL_light_client_block_proof`.
- For repair: `EXPERIMENTAL_light_client_proof` for the initiating receipt at the vault and its first child transfer at the recipient, with the same verified light-client head.

The initiating receipt is identified by its attempt marker in the complete transaction receipt tree. Preserve the original transaction hash and full receipt outcomes to inspect that linkage. Top-level transaction success is not transfer evidence. Use final chain data and retain raw proof bundles before attempting repair.

Normalize without network access or signing:

```sh
node scripts/prepare-repair.ts checkpoint checkpoint-bundle.json > checkpoint-args.json
node scripts/prepare-repair.ts update update-bundle.json > update-args.json
node scripts/prepare-repair.ts repair repair-bundle.json > repair-args.json
```

Bundle shapes:

```text
checkpoint: { "block": <light-client block>, "current_bps": <ordered validator array> }
update:     { "block": <new light-client block>, "ancestry": <old-to-new block proof path> }
repair:     { "attempt_id": "1", "initiation": <execution proof>, "transfer": <execution proof> }
```

The helper maps base58 hashes/signatures and RPC outcomes into the contract's bounded representation. It prefers `timestamp_nanosec` over the rounded legacy JSON number, preserves amount strings, strips only failure debug details excluded by the protocol hash, and rejects malformed encodings. It does not establish finality or choose a trustworthy checkpoint; the contract and bootstrap procedure provide those guarantees.

If evidence is absent, unknown, unfinalized, ambiguous, unsupported or invalid, **leave the order, invoice claim and funds reserved**. No timeout, balance heuristic, owner assertion or automatic retry substitutes for proof. Requests initiated by the previous code without a marker, or without a pre-payment trust anchor, remain blocked and need a separately reviewed migration/proof design. No generic migration escape hatch is included.

## Verification gates

Written tests cover protocol hash compatibility, signed validator quorum/invalid signatures/truncated approvals, stale heads, correct proof repair, unknown/tampered/unrelated/stale/replayed evidence, duplicate transfer consumption, ambiguous batched receipts and frozen bootstrap authority. Existing core tests continue to cover successful payments, duplicates/concurrency, limits, expiry, revocation, failed transfers and callback gas/storage failures.

Additional sandbox tests collected actual node-generated receipt proofs and verified signed finality updates for transfers whose result-recording callback failed. All four success/failure × callback gas/storage cases executed and passed, including exact recipient deltas before recipient-signed reconciliation, persisted reservations, tamper rejection, repair, terminal accounting and replay rejection. Raw proofs and outcomes are retained as CI artifacts and downloaded locally. The small real-proof repairs burned about 5.1–5.2 Tgas. The separate synthetic VM benchmark exercised 128 validators / 256 approval slots / 64-sibling paths / 128,000 request bytes at 300 Tgas prepaid gas, with repairs at most 31.125 Tgas total. Late gas and storage-guard failures rolled back all staged accounting. See the review for exact figures, failure distinctions and limitations; these tests are not an independent security audit.
