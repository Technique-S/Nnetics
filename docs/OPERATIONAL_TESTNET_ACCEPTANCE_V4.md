# Bounded operational testnet acceptance — V4

Prepared locally on 5 November 2026. **Not approved or executed.** This is separate from the consumed V2 storage acceptance and previous payment approvals. No independent security review has occurred; a new, explicit bounded-testnet exception is required.

Authoritative complete transaction arguments: [V4 JSON](OPERATIONAL_TESTNET_ACCEPTANCE_V4.json).

**File SHA-256:** `d6ee7587ed059a22e76ce05cf254d4de33d3066730d5abda7672424add9599f5`.

**Approval/dispatch deadline:** 6 November 2026, **05:14:10.901 WAT**. The proposed final checkpoint expires at **07:35:20.133 WAT** that day. Every wallet review expires after three minutes. If these times pass, prepare and review a new plan; do not silently change this file under an approval.

## Exact identities and limits

- Network: NEAR testnet, pinned genesis `FWJ9kR6KFWoyMoNjpLXXGHeuiy7tEY6GmoFeCA5yuc6b`, protocol 88.
- Organization: `e3600323-ad40-43c4-a31d-7d53abc4833e`.
- Owner/signer: `grandtheft.testnet`, FullAccess key `ed25519:4zTXZ9GfZztRiT3QazNKF9aoKYnxfpxwTKbh6A2L8qZX`. Fresh Meteor financial-action proof and next-nonce binding are required for each owner transaction.
- Receiver/vault: `v-848e8ad68232ad34834d145f81c1641e899926aa.v.grandtheft.testnet`.
- Code hash: `Fpxm2eovD9cdo5ik6yZURyQEWTbruj6GKJi2XA6UBArJ`.
- Worker: `worker.grandtheft.testnet`, existing key `ed25519:J9yFAtkpdgsJ2E3N3MANFFHQf3k9DNkXsBhsJUotHfFA`. Its existing FunctionCall permission permits only `execute_payment` on this vault. No key creation, AddKey, owner permission or worker top-up is proposed.
- Exactly one new payment: **0.001 NEAR to `babygoat.testnet`**, order `OPERATIONS-ACCEPTANCE-001`, invoice **`CTR-0001-INV-0003`**.
- INV-0003 is the next automatic reference observed read-only, **not a created/reserved invoice**. Create and review it through normal application flows. Stop for an amendment if its actual generated reference differs. Never alter a counter or existing reference to fit this plan.
- Per-payment cap stays **0.001 NEAR**. Cumulative spending limit becomes **0.002 NEAR**, including the original 0.001-NEAR spend. Add **0.001 NEAR** of payout funding only.

## Transactions and maximum allowances

All owner transactions use Meteor's normal application review/sign-and-send interface. Each row permits one FunctionCall only; complete ordered arguments and checkpoint proofs are in the JSON. Checkpoint steps must execute sequentially from the stored root, with the installed state verified after each FINAL result.

| Step | Method/effect | Deposit NEAR | Gas | Fee allowance NEAR |
| --- | --- | --- | --- | --- |
| 1–7 | `advance_repair_head`, seven exact authenticated updates | 0 each | 250 Tgas each | 0.055 each; 0.385 total |
| 8 | `deposit({})`, add payout funds | 0.001 | 100 Tgas | 0.022 |
| 9 | `set_budget`, cumulative limit 0.002 NEAR | 1 yoctoNEAR | 100 Tgas | 0.022 |
| 10 | `approve_work_order`, new fixed order, existing `babygoat-acceptance` vendor, 0.001 NEAR, exact expiry in JSON | 1 yoctoNEAR | 100 Tgas | 0.022 |
| 11 | `authorize_agent`, exact existing restricted worker/key | 1 yoctoNEAR | 100 Tgas | 0.022 |
| 12 | `set_paused({paused:false})` | 1 yoctoNEAR | 100 Tgas | 0.022 |
| Worker | One `execute_payment` for the exact order/invoice/recipient/amount | 0 | 250 Tgas | 0.055 |
| 13 | `set_paused({paused:true})` | 1 yoctoNEAR | 100 Tgas | 0.022 |
| 14 | `revoke_agent({})` | 1 yoctoNEAR | 100 Tgas | 0.022 |

**Owner maximum deposit plus fees: 0.540000000000000000000006 NEAR. Worker fee allowance: 0.055 NEAR. Combined allowance: 0.595000000000000000000006 NEAR.** The 0.001 transfer spends the vault funding already counted in the owner's deposit; it is not another external funding requirement.

Read-only snapshot at 16:44:25 WAT showed owner gross balance **5.329268379997087499999986 NEAR**, worker gross balance **0.2992064193122089 NEAR**, and restricted allowance **0.2692064193122089 NEAR**. No external funding is currently indicated. Recheck storage-adjusted balances and gas immediately before execution. At the observed gas price, conservative estimates are 0.0204 NEAR per 100-Tgas call and 0.0504 per 250-Tgas call. These fee ceilings are application preflight conditions, not protocol-enforced currency caps.

## Preconditions still outstanding

1. **Pinned Linux VM execution of the seven exact update inputs.** Existing protocol-86/88 sandbox coverage passed, but these seven arguments have not been executed in a VM. This Windows environment has neither usable WSL nor Cargo. A supported Linux host/environment is needed; no push or deployment is authorized to obtain it.
2. Explicit approval of this exact file/hash, its bounded new payment and its disclosed absence of independent review/initial-validator trust assumption. Local implementation authorization is not transaction authorization.
3. Fresh checks of network/genesis/protocol, owner/key/nonce, code/no vault keys, balances, permissions, fees, original Paid evidence, and no unrelated unresolved submissions.
4. Normal owner/contractor creation and review of the exact new invoice, immutable agreement/recipient/amount matching, one held durable job, and explicit queue release. No new acceptance record/job was created during preparation.
5. Immediately before authorization, unpause and execution: verify the installed approved checkpoint is current, authenticated and younger than 24 hours, and matches the reviewed progression. Unknown or changed evidence stops the run.

The initial current validator set remains owner-trusted. Advances authenticate signatures, stake quorum, commitments and ancestry **from that existing root**; they do not solve initial-set trust or weak subjectivity. No root reset/reinitialization is allowed. Archived old headers were unavailable on recent nodes. The archival source supplied updates/proofs; both sources corroborated the stored checkpoint/current pinned block. Cryptographic checks, not provider agreement, authenticate the advances. Operator independence is not established.

## Configuration after approval only

Both gates remain empty/disabled now. For owner steps, use the absolute V4 file path and its exact SHA-256 in `NNETICS_OWNER_TRANSACTION_PLAN` / `NNETICS_OWNER_TRANSACTION_PLAN_SHA256`, set `NNETICS_OWNER_TRANSACTION_STEP` to one exact operation ID, and enable only `NNETICS_OWNER_TRANSACTIONS_AUTHORIZED=testnet-reviewed`. Changing the selected step does not run it. Normal owner authorization and Meteor review still apply. Non-cleanup steps require earlier owner steps to be durably confirmed.

For the one worker invocation, disable the owner gate, point `NNETICS_PAYMENT_PLAN` / `NNETICS_PAYMENT_PLAN_SHA256` at this same approved file/hash, and enable only the independent payment gate. The existing external key file stays private. Run from `apps/owner`:

```powershell
npm run worker -- --once --job CTR-0001-INV-0003
```

The CLI binds that job ID into the worker scope. The plan also binds its exact order, recipient and amount. Other queued jobs are not executed. An unrelated unresolved transaction prevents startup. This is not ongoing activation.

## Evidence, stop and containment

Never repeat INV-0002 or the historical storage funding. Preserve their IDs, history and consumed authorization. Existing public evidence remains [original payment](https://testnet.nearblocks.io/txns/6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1) and [historical storage call](https://testnet.nearblocks.io/txns/CGmCDGsYimzLz2o9uCDmbsVXwHdUAG6wg1CqUrFLkLEG).

Record Babygoat's finalized starting balance immediately before the worker call, its final balance, the exact 0.001-NEAR transfer receipt, fees/accounting, and the transaction URL. Account for unrelated account activity explicitly; a raw balance difference alone is insufficient. Owner and contractor screens must both show the same confirmed transaction. Approval/queue labels must not become Paid before chain evidence.

Stop on scope/nonce/key/code/network/fee/expiry discrepancies, wallet rejection, unsupported receipt shape, source disagreement or unknown outcomes. Preserve the attempt, all IDs, signed bytes, job claim and reservations. Only the reviewed bounded reference-block-only difference can be reconciled automatically; every other transaction mismatch stays held. Missing evidence keeps the attempt blocked and allows read-only evidence recovery, never another signature.

Pause and revoke using the approved cleanup steps after the payment or a conclusively diagnosed failure. Unknown owner outcomes must be reconciled before another owner signature. A worker-unknown outcome does not permit a replacement; contain it without clearing its reservation. Confirm pause and absent authorization, stop the worker, disable both gates, then retry/refresh/restart checks must show the same one terminal job and no second signature/transfer. Never promise on-chain timed revocation: the current authorization has no automatic expiry.

This proposal excludes mainnet, extra payments, recurring/cross-chain flows, AI features, a chat assistant, additional key permissions, deployment, publication, commits and pushes.
