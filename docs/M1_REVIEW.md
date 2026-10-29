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
  [Canonical header validation](https://github.com/near/nearcore/blob/499283a5e3a6f8ea52bc068c28e3a7bebb1e38c0/chain/chain/src/chain.rs#L888)
  checks epoch IDs and rejects a changed next_bp_hash when the epoch is unchanged.
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
| Epoch commitments | Previous code checked unchanged next-epoch commitment only when next_bps was absent. A redundant supplied set bypassed this structural invariant (although a quorum signature was still required). Pinned nearcore canonical header validation rejects within-epoch next_bp_hash changes. | Enforce unchanged next epoch ID/hash regardless of supplied set; reject aliased current/next epoch IDs. This narrows acceptance to the supported canonical invariant. |
| Approval bounds | The node's epoch manager can append next-epoch-only approvers at epoch boundaries, preserving the current set as a prefix. With disjoint sets of 128, the union has 256 entries. | Retain the 256-slot cap for compatibility and benchmark full signatures in all slots. Only the authenticated current signer prefix contributes stake; a regression rejects using tail signatures to supply quorum. Missing entries count zero. The Python test helper's exact-length condition is not used to narrow production acceptance. |
| Validator hash | V1 variant tag, ordered account IDs, fixed scheme/key bytes and u128 stake match official consensus types. SDK PublicKey storage bytes are not consensus encoding. | Existing official-type comparison remains; no sorting or key re-encoding. Ed25519 only. |
| Outcome inclusion | Partial outcome hash excludes failure details and metadata, includes receipt IDs, gas, tokens, executor and partial status; logs are separately hashed. Two levels of outcome roots and block ancestry match the official helper. | Existing comparison and real RPC proofs retained. Unknown and continuation statuses cannot finalize a native transfer. |
| Receipt linkage | Exactly one attempt commitment in a successful initiating receipt; first child ID must be the transfer proof, distinct IDs, exact recipient and timestamp/height constraints. | No change. Depends on this contract's first outgoing promise remaining the native transfer and trusted deployed code. Multi-payment initiating receipts remain unsupported and blocked. |
| Replay | Strict head progression, exact current attempt and invoice claim, permanent receipt consumption, terminal payment rejection and idempotent callback/finalizer. | No change. Proof consumption, audit record and accounting share one receipt and must roll back together. VM failure tests exercise this boundary. |
| Input limits | Raw request-length check occurs after SDK argument deserialization. | Not a pre-parser memory/DoS guard. Malformed/deep/oversized input may fail or exhaust caller gas before method entry; it must not mutate payment state. |

## VM benchmark design and execution status

New test: maximum_verifier_inputs_and_atomic_vm_failures. It executed successfully in
[Linux run 40877809725](https://github.com/Technique-S/Nnetics/actions/runs/40877809725),
commit 629a7c17d9e471a4e90024e3477204182beba26c, completed 29 October 2026 at
13:07:50 UTC. The full run passed **41 reference TypeScript tests, 36 Rust unit tests,
15 sandbox tests, five WASM builds, production Clippy and formatting**. No test in the
current Rust suite is written-only or skipped. This completes the bounded author
review and benchmark task, not independent security review or milestone approval.

Compared against the pre-review commit 3b51853: all 25 public contract method
signatures and the six existing serialized state/key/status layouts are unchanged.
This is a source/interface check, not a generic migration test.

The workload uses an explicitly synthetic trusted bootstrap with controlled signing
keys, installed by the owner before the first attempt. It is a VM resource/rollback
fixture, **not authentic NEAR chain evidence**. Separate existing tests still collect
real RPC proofs and signed finality updates.

It exercises 128 current/next/following validators, 64-character IDs with long shared prefixes, large stakes
whose total fits u128, 128 verified signatures and 256 filled approval slots, 64 siblings on each path, all six
repair paths at maximum length, maximum receipt/log fields, and exactly 128,000
request bytes for bootstrap, update and repair. Opaque ignored JSON padding fills
the remaining request bytes; this is a measured shape, not every possible JSON shape.
129 validators, 257 approval slots, 65 siblings and 128,001 bytes must reject.

For both successful and failed transfers, explicit 300 Tgas calls and test-only fault
artifacts force late gas exhaustion and the late storage-funding guard after a 1 MB
write inside repair. The latter guard runs before the node's end-of-receipt stake
check; it must not be reported as protocol LackBalanceForState. The existing callback
matrix separately exercises that protocol error. No production interface
or bypass is added. After each failed receipt, compare vault/order/payment/invoice/
audit state, retain reservation and zero spent, then restore production code and retry
the same proof. Successful retry also proves the consumed-receipt key rolled back.

### Measured limits

Retained bounds: **128 validators per set, 256 approval slots (128 signatures
verified for the selected epoch), 64 siblings per path, 128,000 raw request bytes**.
All bounds were exercised together at explicit **300 Tgas function-call prepaid gas**.
Each repair used six 64-sibling paths, maximal receipt/log fields and a committed
epoch transition. No numerical bound reduction was necessary for this measured
workload. Same-epoch commitment acceptance was narrowed as described above.

| VM operation | Successful-transfer case | Failed-transfer case | Added storage |
| --- | --- | --- | --- |
| Initialize two 128-validator sets | 40,863,900,617,451 gas | 40,863,900,617,451 gas | 31,327 bytes in each case |
| Verify 128 signatures / transition / 256 approval slots | 62,566,885,128,993 gas | 62,567,847,753,513 gas | Constant-sized two-set replacement; delta not separately logged |
| Repair with all six paths at 64 siblings | 31,033,938,220,832 gas | 31,124,037,904,800 gas | 287 / 231 bytes respectively |
| Inject late gas exhaustion | 307,586,532,947,086 gas | 307,586,532,947,086 gas | None committed |
| Inject 1 MB write / late storage guard | 66,550,575,705,989 gas | 66,640,649,686,659 gas | None committed |

These are total transaction/receipt gas measurements, including overhead outside
the function-call prepaid allowance. The deliberate gas failures can therefore
report totals above 300 Tgas. Normal calls used at most about 62.568 Tgas total.
At the pinned storage price, 31,327 bytes corresponds to 0.31327 NEAR of stake;
287 / 231 bytes correspond to 0.00287 / 0.00231 NEAR. These are fixture deltas,
not deposit quotes or claims about future protocol prices.

Structured updates were 58,980 / 58,986 bytes; structured repair arguments were
69,847 / 69,846 bytes. Each was padded to exactly 128,000 bytes, as was bootstrap.
129 validators, 257 approvals, 65 siblings and 128,001 bytes rejected without
granting authority or changing accounting. Both failure artifacts left the entire
vault/order/payment/invoice/audit snapshot unchanged, retained 1 NEAR reserved and
zero spent. The same proof then finalized successfully on production code, and
replay rejected. Successful/failed native transfers increased the recipient by
exactly 1 / 0 NEAR.

The raw verifier-bounds.json, stage logs, real RPC proof cases and WASM are downloaded
under artifacts/github/40877809725/payment-core-40877809725-1/20261029T125923Z-40877809725-1-3925/.
Production WASM: 421,118 bytes; SHA-256
2fc8ed792bf63a27db049a8c90e222bccd1e208fa9a7535ff3c997139b4e5540.
The main script runs this test with the full sandbox suite; use
bash scripts/check-core.sh on Linux to reproduce.

### Failed and superseded review runs

- Runs 40873244140 and 40873952959 were canceled/superseded during the epoch-approver
  compatibility review. No completed result is claimed for either.
- [40874121534](https://github.com/Technique-S/Nnetics/actions/runs/40874121534), commit
  55311ef: 36 unit tests passed; 14 sandbox tests passed and the new benchmark failed
  because its gas-error assertion did not recognize the node's display wording.
- [40876229052](https://github.com/Technique-S/Nnetics/actions/runs/40876229052), commit
  08d1824: 36 unit tests passed; 14 sandbox tests passed and the benchmark failed
  because it expected protocol LackBalanceForState instead of the earlier, correct
  STORAGE_OR_LIQUIDITY_RESERVE guard. Corrected the test expectation and documentation;
  no production storage protection was removed. The final run passed all 15 tests.

## Unresolved assumptions and review boundary

- Initial finalized checkpoint, network identity and ordered current validators are
  trusted bootstrap inputs. On-chain verification cannot correct a malicious bootstrap.
- PoS weak subjectivity, honest supermajority, timely synchronization and signature/
  hash security remain assumptions. Timely sync is an operational obligation, not
  an enforced maximum checkpoint-age rule. No long-range attack mitigation is claimed.
- Account full-access/upgrade credentials and the reviewed initiation code are trusted.
  Outcome proofs do not independently prove the transfer receipt's action bytes.
- Only pinned protocol-86/Ed25519 encodings and the supported bounds are accepted.
  A protocol/validator change can block sync or repair and needs a separately reviewed update.
- Old attempts without a marker or pre-payment checkpoint stay blocked. No timeout,
  owner assertion, unverified RPC outcome or balance delta releases unknown funds.
- Synthetic maximum-workload tests, real sandbox tests and this author review do not
  constitute independent consensus/security review or authorization to deploy.
- A finite benchmark is not a formal worst-case bound over every JSON shape,
  validator churn configuration or future VM gas schedule. The real sandbox set
  is small; the maximum set and long paths are synthetic authenticated fixtures.
