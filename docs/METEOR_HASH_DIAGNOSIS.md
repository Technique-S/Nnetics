# Meteor transaction-hash diagnosis - 5 November 2026

**Subsequent local work:** [reference-block policy V3](METEOR_REFERENCE_POLICY_V3.md) now has an assessment-only verifier and historical evaluation. It changes no runtime acceptance rule and clears no hold. The diagnosis below describes the earlier strict-V2 investigation; current execution results are in [VALIDATION.md](VALIDATION.md).

## Decision

The mismatch is proved to be a **reference block hash refresh only**. It is not a nonce change, wrong amount, wrong recipient, action change, receipt-ID confusion or signature-included hash calculation. V2 still requires the prepared transaction hash; it remains unchanged and consumed, and the live attempt remains in manual review. No authorization/reconciliation relaxation is implemented. No new live test, signature, broadcast, replacement, deployment, commit or push is authorized by this investigation.

## Exact byte comparison

Both unsigned transactions use canonical NEAR V0 Borsh and are **213 bytes**. SHA-256 of the saved prepared bytes, Base58 encoded, is `9q3wKFxTSUa3LJ3o4SsuqMaMUY67Jobsa1BVCp9ELLAo`. Replacing **only byte offsets 130 through 161 inclusive (zero-based)** with the reference block below produces `CGmCDGsYimzLz2o9uCDmbsVXwHdUAG6wg1CqUrFLkLEG` exactly. All 32 bytes in that field differ; all other 181 bytes are identical. The public on-chain Ed25519 signature verifies over the latter SHA-256 digest and fails over the prepared digest. This reconstructs/authenticates the complete unsigned transaction rather than merely matching its displayed action.

| Field | Prepared / sent by code path | Finalized transaction |
| --- | --- | --- |
| Signer | grandtheft.testnet | unchanged |
| Public key | ed25519:4zTXZ9GfZztRiT3QazNKF9aoKYnxfpxwTKbh6A2L8qZX | unchanged |
| Nonce | 275527848000004 | unchanged |
| Receiver | v-848e8ad68232ad34834d145f81c1641e899926aa.v.grandtheft.testnet | unchanged |
| Complete action list | exactly one FunctionCall | unchanged; no key, transfer or deployment action |
| Method | fund_storage | unchanged |
| Arguments | raw bytes `7b7d` (`{}`, Base64 `e30=`) | unchanged |
| Deposit | 1000000000000000000 yoctoNEAR (0.000001 NEAR) | unchanged |
| Gas | 100000000000000 (100 Tgas) | unchanged |
| Version | V0 | unchanged |
| Reference block | CLDuCoRFoN6mMb5nGhofazpQvzcgXkAK1eekMAnVdy9L | DZUsGZ19DMNUW4kz6ySPEQCkfKG12vXmio9tNa31T3aY |
| Reference height | 276275468 | 276275621 (153 blocks newer) |
| Reference time, WAT | 5 November 2026 02:32:21.294 | 5 November 2026 02:33:53.244 |
| Transaction hash | 9q3wKFxTSUa3LJ3o4SsuqMaMUY67Jobsa1BVCp9ELLAo | CGmCDGsYimzLz2o9uCDmbsVXwHdUAG6wg1CqUrFLkLEG |

The reported transaction was included at height **276275624**, block `GXrynhwYj4TNEnohMffPtajFsMqgksQY2Yq7fkknzugG`, and is FINAL with successful execution. Its reference block is three blocks before inclusion and precedes the review expiry (02:35:22.828 WAT). The reference block was found in the first bounded batch of eight canonical headers. Read-only FastNEAR and `https://rpc.testnet.near.org` both returned the same height/hash; this is endpoint corroboration, not a claim of independent security review/operator independence. The RPC finality claim is not a newly implemented light-client proof.

NEAR's [pinned implementation](https://github.com/near/nearcore/blob/2.14.0-rc.5/core/primitives/src/transaction.rs) hashes the unsigned Borsh transaction and verifies its signature over that hash. The [RPC transaction view](https://github.com/near/nearcore/blob/2.14.0-rc.5/core/primitives/src/views.rs) omits the reference block hash. Its `priority_fee: 0` is a deprecated compatibility view field, not evidence that a serialized fee or transaction version changed. Hence comparing only status-response fields could not diagnose this difference.

## Request, result and evidence boundaries

`near-adapter.ts` independently hashes/decodes `attempt.unsigned`, then passes that exact immutable string to `requestMeteorOwnerTransaction`. The bridge supplies `network: testnet`, `actionType: sign`, and `inputs: {transactions: unsigned}`. Initialization repeats use one UID under the existing handshake; there is no Nnetics transaction reconstruction or block refresh in that path. A new offline transport regression captures the actual bridge-generated frame and proves the supplied Base64 is not changed.

**Historical capture limitation:** the live request frame and full raw extension response were not logged. We have the persisted prepared payload, audited source/compiled path, its reproduced frame in a fixture, the durable reported ID, and independently re-fetched on-chain data. A fixture replay is not a historical wire capture. Therefore the exact extension-internal function responsible for refreshing the block is not established; the effective field change is cryptographically established. It occurred between the preserved prepared transaction and the signed transaction returned by the wallet flow. No browser protection was bypassed and no extension-private storage was inspected.

The bridge reads only `payload.executionOutcomes[0].transaction.hash`. The durable reported ID equals the RPC `transaction.hash` and `transaction_outcome.id`. Receipt IDs are distinct: `2CCxF5tQA8Ayo5A9YRvdaKvN1ZPdPCBu7sc2taB4a1Wk` and `B4ntAsmwjbGbMoBvPRoJs7jzNEUedcWyTwRwzyDw5Ajz`. A response containing receipt outcomes without `transaction.hash` produces no inferred transaction ID. Receipt success is not accepted as a transaction identity or scope authorization.

## Connector and official-source findings

The application actually has `near-api-js 7.4.0`, Wallet Selector core/Nightly 10.1.4 and its own legacy Meteor extension bridge. **It does not install/import the Meteor connector or SDK as runtime dependencies.** The prior compatibility audit retained published connector **10.1.4** and SDK **1.0.24** archives under ignored `.tools/meteor-compatibility/`; these are examined evidence, not installed runtime code. SHA-256: connector `b07e1eb8df7351bc3ccb27f2afadf7804fc74a6862df14a23a74a5d7e1367502`; SDK `0240b8ba02c85be0eac6c147a3e9e809fca6f0f15a07e44b7cd039ed92a87cac`.

Published connector `index.js:1897-1965` supports action-level sign-and-send, while `signTransaction` and `createSignedTransaction` throw unsupported. SDK 1.0.24 `src/MeteorWallet.ts:381-407,444-475` obtains an access key/current block and builds fresh transaction envelopes before Base64 `sign` transport. It does not promise caller-provided envelope preservation.

Current official sources, checked 5 November 2026: [Meteor integration guide](https://github.com/Meteor-Wallet/meteor-public), [SDK implementation](https://github.com/Meteor-Wallet/meteor_wallet_sdk/blob/main/packages/meteor-sdk-v1/src/MeteorWallet.ts), [SDK README](https://github.com/Meteor-Wallet/meteor_wallet_sdk/blob/main/packages/meteor-sdk-v1/README.md), and [NEAR transaction RPC documentation](https://docs.near.org/api/rpc/transactions). Current SDK `transformTransactions` uses an optimistic block and placeholder key/nonce explicitly intended for wallet-side replacement; `requestSignTransactions` returns execution outcomes. These current sources differ from 1.0.24 and were not installed/upgraded. Together they support an action-level wallet-construction model, **not exact-byte sign-only support**. Nonce/key construction can legitimately occur in that API; neither changed in this observed transaction.

The interoperability defect is Nnetics' unsupported assumption that a sign-and-send Base64 transport preserves the entire server-prepared envelope. Its SHA-256 calculation and result-ID interpretation are correct; its strict V2 hold correctly detects the wallet's block refresh. This does not prove malicious behavior or justify treating every different hash as harmless. The exact-hash precondition genuinely failed.

## Proposed compatible model - requires explicit review, NOT implemented

Keep V2, both IDs, all evidence and consumed authorization untouched. Do not resolve this historical attempt through a newly relaxed rule. Any explicit historical disposition is a separate owner-reviewed decision and must never release/rearm its one-use authorization.

For a separately approved future acceptance, propose a policy that permits **only a bounded canonical reference-block refresh**, not an arbitrary wallet-built successful transaction:

1. Before opening Meteor, persist an immutable authorization intent: network, organization, vault/code, current owner, authenticated selected account/key, complete action list/order, raw argument bytes, exact deposit/gas, fee allowance, expiry, and **exact next nonce**. Snapshot a canonical reference height/time, constrain the permitted refresh interval and bounded lookup budget, and display that envelope construction is wallet-side. Recheck on-chain ownership/fees/permissions immediately before dispatch. If the supported connector cannot honor the pinned key/nonce, stop; widening nonce/key selection needs a separate reviewed policy.
2. Atomically consume the approval before any wallet request, with an exclusive durable attempt and one request identity. Retain consumption across restarts, refusals, timeouts, failures and confirmations. A description edit, changed report, SDK change or policy-file metadata change cannot create a new usable approval. Any separately authorized new transaction must have an explicitly reviewed new approval identity; the old consumed scope is never deleted or reset.
3. Treat returned IDs as untrusted append-only candidates. On the intended network, fetch FINAL transaction plus receipts, verify its signer/key, exact nonce, receiver and every action field against the pre-recorded intent, and bind the response to the candidate ID. Require canonical finality and inclusion/reference times within reviewed bounds. Do not accept merely because the call succeeded or the receiver matches.
4. Recover the full unsigned bytes from an available authenticated transaction representation, or perform a strictly bounded canonical-header reconstruction as done here. For the initial supported profile, require the same V0 serialization and all original bytes except the reference-block field. Require the resulting SHA-256 to equal the candidate transaction ID and verify its Ed25519 signature with the pre-bound key. Missing bytes, budget exhaustion, unsupported versions, unexpected reference/nonce/key/actions, multiple conflicting candidates or unverifiable history remain held for manual review. No automatic fallback to loose field matching.
5. Finalize under the existing SQLite atomic current-record/evidence merge. A later contradictory report must retain the hold and cannot rearm submission. Never broadcast a replacement while evidence is unresolved; read-only retries must not open Meteor. Post-broadcast verification detects wallet deviation but cannot prevent a malicious wallet from broadcasting it; wallet software and user wallet review remain explicit trust boundaries.

| Requirement | Unchanged V2 | Proposed future profile |
| --- | --- | --- |
| Transaction hash | exact prepared hash mandatory | verify authenticated candidate against pre-bound intent and bounded block refresh |
| Reference block | fixed | canonical refresh inside explicit reviewed bounds only |
| Signer/key/nonce/actions/args/deposit/gas | fixed | remain fixed for this minimal proposal |
| Approval use / ambiguity / contradictory evidence | consumed; manual hold | same, no reset or replacement |
| Live authority now | consumed and disabled | none; proposal only |

This is an **acceptance-requirement change**, not a silently applied fix. It needs policy/implementation review, tests, a new explicit plan/approval and a separately authorized minimal live test to validate the chosen supported connector. None is performed/requested in this task. No SDK upgrade, transaction-policy change, retrospective auto-confirmation or manual-review clear is implemented. Local changes are explanatory comments and offline regressions only.

## Verification record

Actual results, preservation checks and test totals are recorded in [VALIDATION.md](VALIDATION.md). Reconstruction artifacts are ignored local files under `artifacts/meteor-hash-diagnosis-nov5/`. The public historical fixture is `apps/owner/tests/fixtures/meteor-reference-refresh.json`; tests use isolated temporary databases/fake extension responses and request no real signature or transaction. They do not imply a new real-wallet pass or independent security review.
