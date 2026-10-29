# Bounded Milestone 1 verifier review

29 October 2026. Core feature freeze: no new payment methods, assets, authorities,
state layouts or recovery overrides. This is a bounded implementation-author review,
not an independent security audit. Passing tests are execution evidence, not security
approval. Public-network signing and deployment remain disabled pending review.

## Pinned comparison sources

- [nearcore 2.13.0](https://github.com/near/nearcore/tree/499283a5e3a6f8ea52bc068c28e3a7bebb1e38c0), protocol 86;
  [light-client view construction](https://github.com/near/nearcore/blob/499283a5e3a6f8ea52bc068c28e3a7bebb1e38c0/chain/chain/src/lightclient.rs)
  [test verifier](https://github.com/near/nearcore/blob/499283a5e3a6f8ea52bc068c28e3a7bebb1e38c0/pytest/lib/lightclient.py),
  and [epoch approver ordering](https://github.com/near/nearcore/blob/499283a5e3a6f8ea52bc068c28e3a7bebb1e38c0/chain/epoch-manager/src/lib.rs#L1109).
- [Official standalone light-client protocol implementation](https://github.com/near/near-light-client/blob/522f94003fbbedfdc1e7a7de6284f5a1d25d8134/crates/protocol/src/lib.rs),
  pinned at 522f94003fbbedfdc1e7a7de6284f5a1d25d8134; its Merkle helper at the same commit.
- [Protocol specification](https://nomicon.io/ChainSpec/LightClient.html), checked on the review date.
- near-primitives 0.37.4, as checksummed in both Cargo lockfiles: views.rs,
  transaction.rs, block_header.rs and merkle.rs. These supply the independent
  protocol types in encoding comparison tests and benchmark fixture construction.

The standalone helper and nearcore's Python test verifier differ in edge handling;
neither is copied as an unquestioned oracle. The latter also constructs small-height
endorsements manually; the Rust regression compares the official ApprovalInner Borsh
type at a height spanning all eight bytes.

## Findings and disposition

| Area | Comparison / finding | Disposition |
| --- | --- | --- |
| Finality | Reconstruct header and next-block hashes, endorsement tag 0, little-endian height + 2, verify ordered epoch signers and strictly more than two thirds of stake. nearcore constructs this view from sequential finalized blocks and their after-next approvals. | Matches the supported protocol; signatures authenticate the header, not an RPC assertion of finality. Timestamp/local-height and old-head ancestry checks are additional restrictions. |
| Quorum | Pinned standalone Rust helper zips signatures and validators when summing stake, and uses total / 3 * 2. Truncation and rounding can differ from the protocol rule. | Preserve the full validator denominator and floor(2 * total / 3), with checked arithmetic; add a three-fifths rejection regression. Do not reproduce the reference helper's weaknesses. |
| Epoch transition | Only current/next epoch is allowed; transitioning requires the following validator set and commitment verification. Current validators become the previously committed next set. | Preserved and tested. No epoch skipping or owner reset after payment. |
| Epoch commitments | Previous code checked unchanged next-epoch commitment only when next_bps was absent. A redundant supplied set bypassed this structural invariant (although a quorum signature was still required). | Harden same-epoch updates to keep next epoch ID/hash unchanged regardless of supplied set. Reject aliased current/next epoch IDs. This narrows acceptance. |
| Approval bounds | The node's epoch manager can append next-epoch-only approvers at epoch boundaries, preserving the current set as a prefix. With disjoint sets of 128, the union has 256 entries. | Retain the 256-slot cap for compatibility and benchmark full signatures in all slots. Only the authenticated current signer prefix contributes stake; a regression rejects using tail signatures to supply quorum. Missing entries count zero. The Python test helper's exact-length condition is not used to narrow production acceptance. |
| Validator hash | V1 variant tag, ordered account IDs, fixed scheme/key bytes and u128 stake match official consensus types. SDK PublicKey storage bytes are not consensus encoding. | Existing official-type comparison remains; no sorting or key re-encoding. Ed25519 only. |
| Outcome inclusion | Partial outcome hash excludes failure details and metadata, includes receipt IDs, gas, tokens, executor and partial status; logs are separately hashed. Two levels of outcome roots and block ancestry match the official helper. | Existing comparison and real RPC proofs retained. Unknown and continuation statuses cannot finalize a native transfer. |
| Receipt linkage | Exactly one attempt commitment in a successful initiating receipt; first child ID must be the transfer proof, distinct IDs, exact recipient and timestamp/height constraints. | No change. Depends on this contract's first outgoing promise remaining the native transfer and trusted deployed code. Multi-payment initiating receipts remain unsupported and blocked. |
| Replay | Strict head progression, exact current attempt and invoice claim, permanent receipt consumption, terminal payment rejection and idempotent callback/finalizer. | No change. Proof consumption, audit record and accounting share one receipt and must roll back together. VM failure tests exercise this boundary. |
| Input limits | Raw request-length check occurs after SDK argument deserialization. | Not a pre-parser memory/DoS guard. Malformed/deep/oversized input may fail or exhaust caller gas before method entry; it must not mutate payment state. |

## VM benchmark design and execution status

New test: maximum_verifier_inputs_and_atomic_vm_failures. Execution pending at
initial preparation; actual run IDs and measurements will replace this status.

The workload uses an explicitly synthetic trusted bootstrap with controlled signing
keys, installed by the owner before the first attempt. It is a VM resource/rollback
fixture, **not authentic NEAR chain evidence**. Separate existing tests still collect
real RPC proofs and signed finality updates.

It exercises 128 current/next/following validators, 64-character IDs, large stakes
whose total fits u128, 128 verified signatures and 256 filled approval slots, 64 siblings on each path, all six
repair paths at maximum length, maximum receipt/log fields, and exactly 128,000
request bytes for bootstrap, update and repair. Opaque ignored JSON padding fills
the remaining request bytes; this is a measured shape, not every possible JSON shape.
129 validators, 257 approval slots, 65 siblings and 128,001 bytes must reject.

For both successful and failed transfers, test-only fault artifacts force late gas
exhaustion and protocol storage-stake failure inside repair. No production interface
or bypass is added. After each failed receipt, compare vault/order/payment/invoice/
audit state, retain reservation and zero spent, then restore production code and retry
the same proof. Successful retry also proves the consumed-receipt key rolled back.

## Unresolved assumptions and review boundary

- Initial finalized checkpoint, network identity and ordered current validators are
  trusted bootstrap inputs. On-chain verification cannot correct a malicious bootstrap.
- PoS weak subjectivity, honest supermajority, timely synchronization and signature/
  hash security remain assumptions. No long-range attack mitigation is claimed.
- Account full-access/upgrade credentials and the reviewed initiation code are trusted.
  Outcome proofs do not independently prove the transfer receipt's action bytes.
- Only pinned protocol-86/Ed25519 encodings and the supported bounds are accepted.
  A protocol/validator change can block sync or repair and needs a separately reviewed update.
- Old attempts without a marker or pre-payment checkpoint stay blocked. No timeout,
  owner assertion, unverified RPC outcome or balance delta releases unknown funds.
- Synthetic maximum-workload tests, real sandbox tests and this author review do not
  constitute independent consensus/security review or authorization to deploy.
