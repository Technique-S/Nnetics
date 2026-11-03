# V3 testnet payment resumption amendment — awaiting explicit approval

Digest: **9ea7cb9e479d5df6c6cd79793aeb1ea53fb34e6b76a8fc139895afa4b06a27d8**. Amends approved V2 978219497f70b4c76cf87b367eb032192c12566d074488566c40eece43301edf. Preparation is not authorization. No V3 transaction has been signed or broadcast. The exact action bytes/base64 are in PAYMENT_ACCEPTANCE_RESUMPTION_V3.json. Approval must name this digest and retain the disclosed testnet exception and trusted initial checkpoint.

## Scope and changes from V2

V2 stopped because the owner screen retained an old vault target. Its early pause/revoke completed FINAL; no payment occurred. Client configuration guards were corrected and regression checked. V3 permits five fresh transactions only, with separate exclusive durable outboxes. Each transaction record (signer, receiver, args, base64, gas, deposit and fee cap) is byte-for-byte identical to the corresponding V2 record; programmatic deep comparison passed. Initial setup is complete and must never be repeated. No checkpoint reset/advance, new worker/key, funding, vendor/order creation, budget/cap change, mainnet, AI extraction or additional payment is included.

Network: **NEAR testnet, protocol 88**. Organization: e3600323-ad40-43c4-a31d-7d53abc4833e.
Owner: **grandtheft.testnet**. Every receiver: **v-848e8ad68232ad34834d145f81c1641e899926aa.v.grandtheft.testnet**.
Pinned vault code hash: Fpxm2eovD9cdo5ik6yZURyQEWTbruj6GKJi2XA6UBArJ.
Worker: **worker.grandtheft.testnet**, public key **ed25519:J9yFAtkpdgsJ2E3N3MANFFHQf3k9DNkXsBhsJUotHfFA**.
Exactly one FunctionCall key, receiver this vault, execute_payment only, allowance **0.27 NEAR**, no FullAccess or owner permission. Key remains in its existing private external file; no secret is included here.

Invoice **CTR-0001-INV-0002** / 498f003c-7a11-458f-b3c6-f9d230c245b9, immutable billing order 3742ad13-9edd-41b7-b51c-e0d6f4c480e1, chain order **ACCEPTANCE-001**, recipient **babygoat.testnet**, amount **0.001 NEAR** (1000000000000000000000 yoctoNEAR). Original text SHA-256 3251533cf0fc9b4d6ae282841f760f5d0790cdc5618c535cd490aa867c78e669. INV-0001 remains rejected. The existing single job stays held in review; no replacement job or invoice may be created.

## Actual preparation checks

Read-only finalized verification: 2026-11-03T13:09:09.965Z, block 6qLDbqZwsEmFV8qUZYVKUFE4Q7mn2N3RHebAhURZyDhk. Backend/public config, organization binding, queue metadata and WorkerNearTransport reference the exact vault above. Code hash, no vault keys, owner, checkpoint payload, enabled Approved order/vendor, recipient/amount/expiry, one linked intent and one held unsigned job all passed. Invoice original-text hash and linked order were unchanged.

On chain: paused=true, agent=null, last_attempt=0, spent=0, reserved=0. Funded, budget and cap each **0.001 NEAR**. The order is otherwise eligible but deliberately not executable while paused/revoked. Vault physical balance **5.001 NEAR**, storage stake **4.31292**, operating reserve **0.09999999999999999**; read-only preflight covers these reserves plus payout. Owner CLI FullAccess nonce observed **275527013000013**; refresh before each signature, never reuse this observation as a signing instruction. Worker nonce **276036473000000**, permission unchanged.

Owner balance **0.330221809676491199999990 NEAR**, worker **0.3 NEAR**. Fresh protocol storage/gas-price checks and conservative upfront calculations passed every listed fee ceiling. Evidence: artifacts/payment-acceptance/resumption-fresh-verification-1793711349969.json. Real Grandtheft Meteor login and authenticated Brave owner-screen inspection passed at 2026-11-03T13:12:39.932Z: the main Testnet owner controls display this exact Grandtheft vault, INV-0002 held in review, paused payments and revoked worker authority, with no previous Babygoat vault target. Evidence: artifacts/payment-acceptance/resumption-owner-ui-verification.json. Refresh this alignment again before execution.

## Exact remaining transactions

All receivers are the vault above. Deposit column is yoctoNEAR. One signature/execution maximum per row; reconcile its recorded hash before any retry. Cleanup may be used early for containment and cannot then be reused automatically.

| Step | Signer | Method and exact args | Deposit | Tgas | Maximum upfront fee NEAR |
| --- | --- | --- | --- | --- | --- | --- |
| authorize_agent | grandtheft.testnet | authorize_agent {"account_id":"worker.grandtheft.testnet","public_key":"ed25519:J9yFAtkpdgsJ2E3N3MANFFHQf3k9DNkXsBhsJUotHfFA"} | 1 | 10 | 0.011 |
| set_paused | grandtheft.testnet | set_paused {"paused":false} | 1 | 10 | 0.011 |
| execute_payment | worker.grandtheft.testnet | execute_payment {"order_id":"ACCEPTANCE-001","invoice_id":"CTR-0001-INV-0002","recipient":"babygoat.testnet","amount":"1000000000000000000000"} | 0 | 250 | 0.251 |
| pause-after-payment | grandtheft.testnet | set_paused {"paused":true} | 1 | 10 | 0.011 |
| revoke_agent | grandtheft.testnet | revoke_agent {} | 1 | 10 | 0.011 |

Before row 3, the authorized owner releases the SAME held job through the normal authenticated review/queue flow. This is an off-chain state transition, not permission to import another job. Worker execution uses its scoped durable process lock and persisted outbox; no generic CLI payment or replacement signature.

Additional owner fee ceilings: **0.044 NEAR + 4 yoctoNEAR deposits**. No additional funding. Owner storage retained **0.00264 NEAR**; required current owner reserve **0.04664 NEAR + 4 yoctoNEAR**, below balance. Actual V2 owner fees **0.0093113190956912 NEAR** plus all new owner caps total **0.0533113190956912 NEAR**, below the original **0.210 NEAR** ceiling. Worker fee ceiling **0.251 NEAR** is drawn from its existing 0.3 funding, within its unchanged 0.27 key allowance; it is not another owner deposit. Unused fee allowances are not actual costs. Remaining worker funds may remain locked by its restricted key. The existing funded 0.001 payout is not another transfer from the owner.

## Checkpoint trust, deadlines and fresh gates

No independent security review has occurred. All implementation/evidence checks are by Codex as implementation author. V3 carries forward only the expressly accepted single-testnet V2 exception. The current ordered validator set and initial root are owner-trusted, not authenticated from genesis on chain; quorum checks are conditional on that supplied set. Weak subjectivity and future consensus changes remain assumptions. Exact current bootstrap inputs were not separately VM benchmarked. Gas/storage/callback failures can consume bounded fees or leave reservations unresolved.

Pinned checkpoint **Gk91ppKatpsQhi62mK9CE1WKfFMFA7BH1EDt3vBSnnpD**, height 276003652, 20 current/20 next validators. Payload SHA-256 e38bed03aadd216a2472fb92064cf77ee54aecc86f405f22259c6f6607731027. Fastnear and its legacy near.org archival URL are the same operator. Separately listed Intear corroborated block and ordered current set; dRPC corroborated block only. This establishes agreement of queried responses, not disjoint infrastructure, genesis trust or a security audit.

Checkpoint timestamp 1793682686057769230; maximum age 24 hours relative to fresh finalized chain time, no future timestamp. Deadline **04/11/2026, 06:11:26 WAT**, exact ns **1793769086057769230**. Order expires **05/11/2026, 09:54:14 WAT**, exact ns **1793868854014909735**. Earliest boundary applies; stop before signing if evidence would expire before completion. No substitute/reset checkpoint under this approval.

Before authorization, unpause and payment: refresh testnet/protocol/code/owner/no-key organization binding; inspect the authenticated corrected UI against backend/worker/job; verify invoice and exactly one unchanged job/intent; refresh owner/worker nonce and permissions, order/vendor/amount/funds/storage/fees and cleanup reserve. Requery the pinned canonical checkpoint and ordered sets from Fastnear and Intear; verify exact hash, quorum, epoch encoding and next-set commitment. Refresh and verify a supported current/next-epoch recovery update plus ancestry off chain. Earlier V2 proof verification is historical evidence, not a fresh execution preflight. If an on-chain head advance, epoch skip or other action is needed, stop for another plan. No such transaction is authorized here.

## Stop conditions and closure

Stop on any UI/backend/vault mismatch, lost owner access, changed code/network/protocol/keys, prior attempt/payment or conflicting nonce/claim, altered invoice/order/amount/recipient/text, stale/future/disagreeing checkpoint, unsupported recovery path, expired order, insufficient funds or exceeded cap. Unexpected signed bytes/hash, failed receipts/callback/transfer, ambiguous broadcast or inconsistent recipient evidence also stops execution. Halt the worker, preserve outboxes/reservations, reconcile the same hash; never sign a replacement for an unknown outcome. The listed pause/revoke may be consumed once each for early containment. A failed-step retry or proof-repair transaction requires a separately approved plan. Cleanup remains permitted after the payment deadline to remove authority.

Immediately before payment, record a FINAL Babygoat pre-balance and isolate unrelated transfers/rewards. Acceptance needs one FINAL execute attempt and exact successful native 0.001 transfer receipt, expected recipient balance delta, matching Paid order/payment/accounting (spent=0.001, reserved=0), exactly one terminal durable job and the same transaction link/status on owner and contractor screens. Approval/queueing alone must never show Paid. A prep balance is not acceptance evidence.

After verified payment, promptly pause then revoke and confirm paused=true, agent=null, reserved=0 and spent=0.001. Repeat normal linkage/queue requests and restart app/worker using the same persistent DB and lock; verify the same terminal job and no new signature/attempt/transfer. No deliberate duplicate payment transaction is permitted. Do not defer cleanup if a UI status check fails; use the same once-only cleanup for containment. Unknown outcome remains blocked pending conclusive evidence.

## Current result

User subsequently approved this digest. All five specified transactions finalized successfully. One native 0.001-NEAR payment to Babygoat, exact balance delta, Paid attempt 1, spent=0.001/reserved=0 and final paused=true/agent=null were verified. Same-job local linkage and production worker restart checks passed. See VALIDATION.md for actual transaction links/fees and remaining screen/app-restart verification. The approved JSON and its digest remain unchanged. No independent security review is claimed.
