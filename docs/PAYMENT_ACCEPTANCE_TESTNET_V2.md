# Revised testnet-only acceptance — explicit approval required

**Not authorized. No transactions were signed or sent while preparing this revision.**
Complete machine-readable payloads: [PAYMENT_ACCEPTANCE_TESTNET_V2.json](PAYMENT_ACCEPTANCE_TESTNET_V2.json).
Revised SHA-256 of compact `JSON.stringify(plan)`:
`978219497f70b4c76cf87b367eb032192c12566d074488566c40eece43301edf`.

## Change from the original plan

Original digest:
`b4b70ad2cfee6722a0fe74e02f549b6cb124b54ab3ab282575d14c17f0f2b63b`.
All **12 transaction records are exactly unchanged**, including args, encoded
checkpoint, funding, accounts, keys, permissions, gas, fee caps and order expiry.
Invoice identity/text hash, worker description, balance ceilings and storage
allowances are also unchanged. Exact comparison is in
`PAYMENT_ACCEPTANCE_V2_COMPARISON.json`; the original JSON remains intact.

Policy changes only:

- **No independent security review has occurred.** Codex is the implementation
  author. The owner may explicitly accept that absence for this one testnet run.
  This does not mean an independent review passed or production safety is proven.
- Exact initial checkpoint/ordered sets remain an explicitly **owner-trusted root**.
  Source provenance is corrected: near.org legacy archival is Fastnear-maintained.
  Separately listed Intear agrees on head + ordered set; dRPC agrees on head only.
- Fresh validation/age, fixed scope, stop conditions and immediate pause/revoke
  are mandatory. No unknown transaction may be replaced automatically.
- The listed pause/revoke operations may be used early for fault containment,
  within their same caps and at most once each. This adds no transaction record.

## Scope and exact identities

Network: **NEAR testnet, protocol 88 only**. Owner/signer: `grandtheft.testnet`.
Organization: `e3600323-ad40-43c4-a31d-7d53abc4833e`.
Existing verified vault (the only vault allowed):
`v-848e8ad68232ad34834d145f81c1641e899926aa.v.grandtheft.testnet`.
Pinned vault SHA-256:
`dc4cf64736110a33cce94531e2e00ba4510bcebbbb240bee6ecdacacf778560f`.

Bill: **CTR-0001-INV-0002**, ID `498f003c-7a11-458f-b3c6-f9d230c245b9`.
Existing immutable billing order: `3742ad13-9edd-41b7-b51c-e0d6f4c480e1` /
`ACCEPTANCE-001`. Original text hash is frozen in the JSON. No text, recipient,
order reassignment, extraction or new invoice is authorized. INV-0001 is excluded.
The only native payment is **0.001 NEAR** (`1000000000000000000000` yoctoNEAR)
to **babygoat.testnet**. On-chain order ID: `ACCEPTANCE-001`; vendor:
`babygoat-acceptance`. The billing order is not itself an on-chain approval.

Worker: `worker.grandtheft.testnet`.
Public key: `ed25519:J9yFAtkpdgsJ2E3N3MANFFHQf3k9DNkXsBhsJUotHfFA`.
CreateAccount + 0.3 NEAR + AddKey (nonce 0) installs **one FunctionCall key**,
receiver this vault only, methods `["execute_payment"]`, allowance **0.27 NEAR**.
No FullAccess key, owner role, additional method or rescue authority is included.
Private key remains in the ACL-protected external local file; never exported.
Worker gas allowance does not authorize payouts; contract budget/cap/order guards
independently constrain the transfer. Unused worker funds may remain locked.

## Checkpoint trust and fresh validity gate

Exact trusted head: `Gk91ppKatpsQhi62mK9CE1WKfFMFA7BH1EDt3vBSnnpD`, height
**276003652**, 20 current and 20 next validators, exact 7234-byte canonical args
SHA-256 `e38bed03aadd216a2472fb92064cf77ee54aecc86f405f22259c6f6607731027`.
The full head and ordered validator arrays are in transaction 2 of the JSON.
Installing another checkpoint is not approved by this digest.

Bootstrap is one-time, owner-only, 1 yoctoNEAR, while paused and before ANY attempt.
The contract checks bounds/keys/stakes, next-set commitment, epochs and nonfuture
time/height. **It does not authenticate the initial current validator set from
genesis.** Verified >2/3 signatures are conditional on that supplied set. The owner
explicitly trusts these exact inputs; corroboration reduces single-provider error
but does not solve PoS weak subjectivity, long-range attacks or verifier defects.

Before initial signatures, freshly requery this exact hash/height/ordered set from
Fastnear and Intear, verify testnet/protocol, canonical header, next-set commitment
and >2/3 signatures. Before checkpoint signing, compare timestamp against fresh
finalized chain time: nonfuture and **at most 24 hours old**. Under this policy the
pinned head expires **4 November 2026, 06:11:26.057 WAT** (24 hours after its header
timestamp; nanoseconds in JSON are authoritative). If stale, unavailable, changed
or inconsistent: **stop and prepare a new digest for approval**. Do not silently
refresh the checkpoint. Approval does not override this deadline.

Before unpause, confirm the stored checkpoint equals the approved head and remains
within this window. Obtain/check off-chain a supported current/next-epoch signed
update/ancestry path for recovery. If payment needs an on-chain head advance first,
stop for an amendment: no `advance_repair_head`, repair, root reset or extra
recovery transaction is included. Unknown outcomes stay blocked/reserved.

## Complete transaction sequence and ceilings

Rows 2–9 and 11–12: signer Grandtheft, receiver the exact vault above.
Row 1: Grandtheft → worker. Row 10: worker → vault, with zero attached deposit.
Amounts below are NEAR except the explicitly stated 1-yocto owner-action deposits.

| # | Actions / exact arguments | Deposit/funding | Gas | Max upfront fee |
| --- | --- | --- | --- | --- |
| 1 | Create worker; transfer; install restricted key described above | 0.3 | Native actions | 0.010 |
| 2 | `initialize_repair_checkpoint` with exact pinned payload | 1 yocto | 100 Tgas | 0.101 |
| 3 | `register_vendor` `{vendor_id:"babygoat-acceptance",recipient:"babygoat.testnet"}` | 1 yocto | 10 Tgas | 0.011 |
| 4 | `approve_work_order`: order ACCEPTANCE-001, vendor babygoat-acceptance, amount 1000000000000000000000, `expires_at_ns:"1793868854014909735"` | 1 yocto | 10 Tgas | 0.011 |
| 5 | `deposit` `{}` | 0.001 | 10 Tgas | 0.011 |
| 6 | `set_budget` `{budget:"1000000000000000000000"}` | 1 yocto | 10 Tgas | 0.011 |
| 7 | `set_payment_cap` `{payment_cap:"1000000000000000000000"}` | 1 yocto | 10 Tgas | 0.011 |
| 8 | `authorize_agent`: exact worker account and public key above | 1 yocto | 10 Tgas | 0.011 |
| 9 | `set_paused` `{paused:false}` | 1 yocto | 10 Tgas | 0.011 |
| 10 | `execute_payment`: order ACCEPTANCE-001, invoice CTR-0001-INV-0002, recipient babygoat.testnet, amount 1000000000000000000000 | 0 | 250 Tgas | 0.251, from worker funding |
| 11 | `set_paused` `{paused:true}` immediately after verification | 1 yocto | 10 Tgas | 0.011 |
| 12 | `revoke_agent` `{}` | 1 yocto | 10 Tgas | 0.011 |

Order expiry: **5 November 2026, 09:54:14.014 WAT**, exact nanoseconds as above;
the earlier bootstrap window governs starting this run. All byte-exact args and
base64 encodings are in the JSON. Values in this table do not replace that payload.

Ceilings remain: **0.301 NEAR + 9 yocto** owner deposits, **0.210 NEAR** owner
fee caps, **0.00264 NEAR** retained owner storage = **0.51364 NEAR + 9 yocto**.
Worker maximum payment-call fee **0.251** is inside its **0.3** allocation, not an
extra owner charge; worker key allowance **0.27** is unchanged. Additional vault
storage funding: **zero** under the existing reserve assumptions. Fresh balance,
storage, fee and code checks must pass before every step. No ceiling increase is
authorized. Fees are upper allowances, not promises of actual cost/refund.

## Execution and acceptance guards

1. Explicit revised-digest approval must accept the testnet exception AND exact
   initial trust anchor. Verify fresh network/code/no-key/owner/organization state,
   worker absence/key custody, nonce and each exact prepared action. Persist each
   exclusive outbox before signature; verify exact CLI signature before broadcast.
2. Complete/check initialization while paused before funding/agent/unpause. Final
   checkpoint must match exactly. A completed step is reconciled/skipped, not
   resubmitted. Failure stops; fresh failure retry needs separate approval.
3. Require unchanged Approved bill and exactly one matching FINAL on-chain order,
   active vendor, fixed recipient/amount, budget/cap/funding, unexpired order and
   exact restricted worker permission. Link **one held durable job** before activation.
4. Immediately before the single payment record finalized recipient pre-balance.
   Run only that scoped job under its durable process lock and outbox. No AI is
   required or permitted for this run; use the confirmed deterministic fields.
5. Success requires **one confirmed native 0.001-NEAR receipt**, expected isolated
   recipient balance increase, matching FINAL Paid contract record/order/invoice,
   spent 0.001/reserved zero and corroborated transaction linkage on both screens.
   Queueing, owner approval or a successful top-level transaction alone is not Paid.
6. After verification **immediately pause, then revoke**, and verify paused true,
   agent null. Repeat link/queue requests and app/worker restarts locally: retain
   the same terminal job/hash/attempt; no new signature or transfer. Do not broadcast
   an intentional duplicate to test rejection. This is not additional payment scope.

Stop on any drift, expired/unverified evidence, insufficient balances/reserves,
fee excess, duplicate claims, changed CLI bytes/hash, failed/unknown receipts or
ambiguous balance/link evidence. Halt worker/signing and preserve reservations.
The listed pause/revoke may be used early for containment, at most once each;
unknown cleanup outcomes reconcile that same hash. No extra recovery or retry
transactions are authorized. Pause/revoke does not cancel an in-flight transfer.

## Remaining limitations explicitly accepted only if approved

No independent security review; trust in the initial root/ordered validators;
unproven weak-subjectivity protection; exact payload VM execution not performed;
finite benchmark is not universal gas proof; parser limit is after deserialization;
receipt linkage relies on pinned initiation code/first transfer child; unknown
callback outcomes require supported proof-based recovery; protocol/Ed25519/input
bounds can halt future synchronization. Existing source reviews/CI/corroboration
are evidence, not an audit. Bounded fees may be spent even if acceptance fails.
See PAYMENT_CHECKPOINT_REVIEW.md for severity/disposition and operator provenance.

Nothing here changes the deployed contract or grants worker owner permissions.
No mainnet, production, other invoice/vault/recipient or second payment is covered.
Preparing or displaying this plan does not authorize execution.
