# Meteor reference-block compatibility V3 - policy proposal, not execution approval

**Subsequent limited approval, 5 November:** the user approved assessment/acceptance of existing `CGmCDGsYimzLz2o9uCDmbsVXwHdUAG6wg1CqUrFLkLEG` only. See [the separate historical acceptance record](METEOR_HISTORICAL_ACCEPTANCE_V3.json). The JSON/hash, V2 finding, consumed authorization and active hold are unchanged. The proposal below is not runtime authorization or future-transaction approval.

Status: local assessment verifier implemented; **awaiting explicit policy review**. The machine-readable proposal is `METEOR_REFERENCE_POLICY_V3.json`. Its exact file SHA-256 is `1ff5abb96c4633d8d6f510ec4a2ab44c1fbf0bfe45d959edc05dc7bbd6543709`. No runtime gate consumes this proposal, and no transaction is authorized by it. V2 remains unchanged, consumed and in manual review.

## Exact policy

This profile is limited to the existing one-action storage-funding intent. It binds the owner/account, organization, vault/code hash, network/genesis, authenticated public key, exact next nonce, complete ordered action bytes, `fund_storage`, raw `{}` arguments, 0.000001 NEAR deposit, 100 Tgas and original fee allowance. Original canonical V0 bytes/hash and immutable intent digest must match the stored approved intent and hash-verified V2. The proposal also pins the historical attempt and candidate IDs; it is not an arbitrary successful-hash acceptance rule.

Only the 32-byte reference block hash may differ. The verifier must reconstruct a unique candidate by replacing that field in the original bytes, reproduce the reported Base58 SHA-256 transaction ID and verify the Ed25519 signature with the original key. V1/delegate transactions, nonce modes/indexes, a new key/nonce, altered args or action ordering, added actions and changed amounts/gas remain blocked. Duplicated human-readable intent fields must agree with the original serialized action.

| Bound | Inclusive acceptance limit | Reason |
| --- | --- | --- |
| Prepared anchor age | 30 seconds before recorded creation; never a future anchor | Reject stale initial preflight evidence |
| Reference refresh | strictly newer than original, at most 256 height units ahead | Bounded change and reconstruction surface; independent of wall-clock limits |
| Review/inclusion deadline | `min(original expires, created + 180000 ms)` | Retain V2's 3-minute review ceiling without extending it |
| Inclusion age from replacement reference | at most 16 height units **and** 30000 ms | Match the SDK's fresh-block construction while rejecting an old/replayed envelope |
| Receipt completion after inclusion | at most 16 height units **and** 30000 ms | Bound action/refund resolution; slow valid execution is held, not retried or relaxed |
| Header evidence / work | at most 35 canonical assessment headers, plus two provider-tip observations | At most 33 linked headers from the earliest eligible candidate through receipts, plus original anchor and common finalized head |
| Provider finalized-head disagreement | at most 32 height units; use their common lower finalized height | Fail closed on stale/disagreeing nodes |
| Read resources | 180000 ms of monotonic elapsed time overall, at most 128 HTTP attempts, 2 MiB response bodies | Existing application read budget with explicit work/memory caps |
| Read concurrency / pacing | one height pair at a time; at least 1000 ms globally between HTTP starts | Avoid the observed public-provider burst limit; maximum 1 request/second overall |
| Individual read retries | 5, 10, 15 second increasing timeouts, shared overall budget, shared backoff/jitter/Retry-After handling | Exactly one retry layer; definitive errors are not retried |

Both height and timestamp limits apply; no fixed conversion from blocks to seconds is assumed. These narrow numbers are **application policy choices**, not limits promised by NEAR or Meteor. The observed call refreshed by 153 heights, used a reference three heights before inclusion, and finished its receipts promptly. Longer legitimate wallet/chain delays may fail these stricter bounds and must stay in manual review. There is no automatic replacement or broader fallback.

The [current Meteor implementation](https://github.com/Meteor-Wallet/meteor_wallet_sdk/blob/main/packages/meteor-sdk-v1/src/MeteorWallet.ts) constructs an optimistic reference and delegates key/nonce selection to wallet-side handling; the archived 1.0.24 SDK builds fresh envelopes before Base64 sign-and-send. Neither guarantees those application bounds or exact-byte preservation. This profile still pins key/nonce; a connector that changes them does not qualify.

NEAR's [protocol configuration RPC](https://docs.near.org/api/rpc/protocol) exposes transaction validity. Both configured sources must report testnet/protocol 88 and the reviewed **86400-block** validity at the original anchor. Our 16-block inclusion-age rule is deliberately much stricter. The [transaction RPC docs](https://docs.near.org/api/rpc/transactions) define FINAL to include refunds and explain that receipt lists can be unavailable/incomplete; missing required receipts do not qualify. No SDK/dependency version was changed.

## Network authentication and trust boundary

The only sources are `https://test.rpc.fastnear.com` and `https://rpc.testnet.near.org`. Redirects and other origins are rejected. Both must identify testnet/protocol 88 and genesis hash `FWJ9kR6KFWoyMoNjpLXXGHeuiy7tEY6GmoFeCA5yuc6b`. The common finalized height/hash, transaction-critical fields, receipt data, protocol validity, code and vault ownership reads must agree. Each execution header must appear at its canonical height below that finalized anchor. The candidate-through-receipt segment must retain direct parent linkage and increasing timestamps. The original prepared anchor is checked separately by hash and canonical height against both sources; the unmodified interval from that anchor to the candidate segment is not walked. The common finalized canonical-height attestations are trusted RPC evidence, not an independent proof of that gap. This limits reconstruction to the intersection of the 256-height advance and 16-height inclusion-age bounds without weakening either bound.

A skipped height may be omitted only when both sources return `UNKNOWN_BLOCK` and the surrounding observed headers link directly. One-source disagreement, missing original/execution headers or a hole without that parent link is missing evidence and remains blocked. HTTP 422 alone is never treated as proof of a skipped height; its bounded JSON body must carry that specific RPC error.

The collector seals and recursively freezes its evidence in memory. A caller-supplied object, `trusted:true`, serialized copy or wallet-provided header cannot self-attest. Evidence is bound to the exact intent and policy digest. Saved evidence is an audit artifact, not an automatically trusted import format.

**Trust limitation:** this authenticates responses through two configured HTTPS endpoints, their pinned network identity/canonical agreement and a cryptographic transaction signature. It is **not an independently verified consensus/light-client proof**. Endpoint/operator independence is not established; both sources may share infrastructure or fail together. Compromise of the trusted server transport or both trusted endpoints remains an explicit assumption for review. No independent security review has occurred.

## Required execution/receipt evidence

The candidate must be FINAL with an empty successful return and match every signed intent field. Its transaction outcome must link to exactly one action receipt for the approved vault, owner/key and exact FunctionCall. That receipt must succeed and its execution metadata must name the pinned local contract code. A block-pinned account/vault read must corroborate that code, owner, paused state and revoked automatic-payment permission.

Exactly one additional system gas-refund receipt to the original signer is allowed; its receipt and outcome must match, succeed and have no children. The action/refund outcomes must be correctly linked, unique, in causal order and within the bounds above. No other actions, receipts, outcomes, promises/data dependencies or logs qualify. Actual transaction/receipt token burn must fit the original intent's fee allowance and unchanged 0.022/0.022001 NEAR ceilings. Gas-refund amounts are not themselves treated as extra approved transfers or incorrectly capped at the final fee: they can represent unused prepaid gas.

## Durable state and authority boundaries

`assessDurableReferenceRefresh` reads the existing active, history and consumed-use payloads, requires one matching manual-review attempt/candidate, and verifies their equality. After asynchronous reads it takes a consistent SQLite read transaction and compares the complete durable snapshot. A new report/context change invalidates the assessment. The result carries its snapshot digest. No active record, history entry, consumption row or reported ID is changed; a report after a compatible assessment still remains authoritative manual-review evidence. A future disposition must revalidate the current snapshot atomically and must never rearm the consumed scope.

A compatible result is named **compatible_under_proposal**, never Confirmed or accepted. `manualReviewRequired=true` and `submissionAuthorized=false` remain true. A later failure, timeout, missing field, invalid signature, untrusted input or exceeded bound yields manual review. Runtime V2 owner-gate validation rejects this V3 document, and the independent payment gate is untouched.

Before signing Nnetics controls its stored/reviewed intent, source/network/owner checks, gate/scope checks, one-use dispatch and which request it passes to Meteor. **It cannot prevent a wallet from constructing or broadcasting altered bytes.** After submission it can authenticate/compare the signed transaction and outcomes, detect deviation, hold evidence and prevent another application request. Post-submission detection is not prevention or a reversal of a transaction already sent. The local CLI exposes assessment only and requests no wallet operation.

## Historical assessment and review decision

The existing transaction is evaluated separately in `artifacts/meteor-reference-policy-v3/assessment-final.json`; actual fetch/verification results are in VALIDATION.md. Any eligible verdict is retrospective under this proposal, not a V2 pass and not an automatic historical disposition. No hold is cleared and the consumed authorization is never reset.

After explicit review of the policy/trust assumptions and complete compatible evidence, the existing transaction can support a **separate historical V3 acceptance decision**, with its original V2 mismatch retained in the audit. A new live transaction is not needed to prove an existing signed storage call's contents/effect. A separate non-signing disposition step would still be needed to append that decision; this task provides no such approval or writer path. If required evidence is unavailable, obtain the missing canonical/receipt evidence read-only; repeating the transaction does not repair that gap.

Future automatic adoption/pre-sign request handling under a V3 profile is not accepted by this retrospective assessment. It needs separate implementation review, an explicitly approved live plan/one-use identity and an authorized end-to-end test. Do not reuse or rearm this consumed V2 or infer authority from a changed policy file/version.

## Reproducible local assessment

With both gates and the legacy flag empty, from `apps/owner`:

```powershell
node --env-file-if-exists=.env.local scripts/assess-owner-reference.mjs --policy ../../docs/METEOR_REFERENCE_POLICY_V3.json --sha256 <reviewed-file-SHA256> --output ../../artifacts/meteor-reference-policy-v3/assessment.json
```

The helper verifies both file hashes/configuration, opens the existing queue with SQLite readOnly, performs bounded read-only RPCs and writes only local assessment/evidence JSON under ignored artifacts. It has no signing or broadcast method. The full regression results, exact final proposal hash and remaining limitations are recorded in [VALIDATION.md](VALIDATION.md).
