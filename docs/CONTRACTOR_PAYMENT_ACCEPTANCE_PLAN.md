# Payment acceptance runbook — prepared, not authorized or executed

Current status (3 November): V3 was explicitly approved and all five transactions finalized. INV-0002 received exactly one 0.001-NEAR payment to Babygoat; exact receipt/balance delta, Paid accounting, one terminal job and app/worker restart protection passed. Vault is paused and worker authorization revoked. User confirmed Paid in the contractor portal; Grandtheft billing-screen confirmation remains pending. See VALIDATION.md and PAYMENT_ACCEPTANCE_RESUMPTION_V3.md for actual evidence. The initial setup proposal below is historical and must not be rerun.

This is a bounded acceptance design, not a signable transaction approval. Existing
factory/provisioning approvals exclude payments, key activation, unpause and
checkpoint installation. Do not widen them. No additional transactions have been
signed or broadcast for this runbook.

## Required before a transaction plan can be finalized

1. The original infrastructure attempt expired without inclusion (finalized height
   275961459, 2 November 2026). Preserve its outbox. Finish only the already
   approved customer provisioning scope. The owner-run CLI factory deployment
   finalized successfully as `3KHBKLzkE9sUvUXUWPWTxWEdwaGjndCEcTttxSASz6Rq`;
   exact deployed code, no keys and immutable configuration were verified.
   The customer transaction finalized as
   `Hmp8i6AfQC4UtHwWDYxPuntpsd93UCEarQhijb3rStBe`. Its actual wallet hash differed
   from the prepared hash; authenticated reconciliation verified the exact same
   key/nonce/full approved call and retained the original request in history.
   The live app now links the initialized, paused vault to Grandtheft. Refresh
   every remaining preflight condition before any payment authorization.
2. Verify the new vault on finalized testnet: code, no access keys, initialized
   owner `grandtheft.testnet`, paused/zero-payment state, organization binding and
   safe refresh/resume. Expected vault:
   `v-848e8ad68232ad34834d145f81c1641e899926aa.v.grandtheft.testnet`.
3. Resolve independent historical-verifier review, checkpoint bootstrap trust and
   key custody; review callback/refund recovery limitations. Passing automated
   tests do not replace this independent review. Worker signing currently also
   requires a reviewed repair checkpoint.
4. Select/fund a separate testnet worker and its exact restricted public key,
   allowance and custody route. Generate a reviewed checkpoint and fresh expiry.
   Refresh storage, gas, protocol and balances; compute exact deposits, storage
   reserves and fee allowances. Never assume the vault's contract-storage deposit
   is payment funding.
5. Produce a separate exact JSON transaction plan/digest for user approval. Include
   every worker-account/key action, checkpoint payload, amount, gas, allowance,
   vendor/order ID, expiration, activation and final pause/revocation. All unknown
   values below must be resolved before requesting approval.

## Proposed smallest payment scenario

One **0.001 testnet NEAR** transfer, `1000000000000000000000` yoctoNEAR, from the
verified Grandtheft vault to an owner-approved contractor wallet, proposed
`babygoat.testnet`. That wallet must not be the vault or worker. The real
Grandtheft-owner/Babygoat-contractor proof and owner approval have completed in
Grandtheft's organization. Use approved invoice **CTR-0001-INV-0002**, internal ID
`498f003c-7a11-458f-b3c6-f9d230c245b9`, and its existing immutable billing order
`3742ad13-9edd-41b7-b51c-e0d6f4c480e1` / **ACCEPTANCE-001**. Do not create or
substitute another bill, alter its original text, or move records. INV-0001 is
Rejected with "Superseded acceptance record" and is excluded from payment.

The intended on-chain order ID is `ACCEPTANCE-001`, subject to finalized confirmation
that it is unused in this specific vault. A same-named off-chain order is not
on-chain approval. No live queue intent/job exists yet: linkage correctly requires
verified provisioning, configured organization/vault/worker and a matching chain
order. Once those checks pass, repeat the **same** invoice/order linkage and verify
one held job before activation. Do not bypass the provisioning gate to manufacture
an acceptance result.

The exact transaction plan will contain these frozen contract methods/actions,
using fresh, unused bounded IDs and explicit owner signatures:

| Step | Method/action | Required arguments/deposit |
| --- | --- | --- |
| Prepare worker | Create/fund account and install restricted key if absent | Exact account, public key, finite allowance, receiver vault, `execute_payment` only; requires separate approval |
| Storage if needed | `fund_storage` | Measured storage/operating shortfall only, separate from payment ledger |
| Recovery bootstrap | `initialize_repair_checkpoint` | Exact independently reviewed checkpoint; 1 yoctoNEAR owner-action deposit |
| Vendor | `register_vendor` | Fresh vendor ID, approved contractor recipient; 1 yoctoNEAR |
| Work | `approve_work_order` | Fresh order ID, that vendor ID, amount `1000000000000000000000`, fresh exact `expires_at_ns`; 1 yoctoNEAR |
| Payment funds | `deposit` | Exactly 0.001 NEAR to payment ledger |
| Budget | `set_budget` | `1000000000000000000000`; 1 yoctoNEAR |
| Cap | `set_payment_cap` | `1000000000000000000000`; 1 yoctoNEAR |
| Worker authority | `authorize_agent` | Exact separate worker account and restricted public key; 1 yoctoNEAR |
| Enable reviewed attempt | `set_paused` | `false`; 1 yoctoNEAR |
| One payment | `execute_payment` | Order/invoice ID, recipient and amount derived from the approved order; 0 deposit, existing 250 Tgas worker call |
| Close acceptance | `set_paused`, `revoke_agent` | `true`, then `{}`; 1 yoctoNEAR each; neither cancels an in-flight transfer |

Gas/fees and worker/storage funding are intentionally not guessed. The existing
vault payment cap initially permits 0.01 NEAR, but the proposed acceptance lowers
it explicitly. The owner approves the matching off-chain billing order, reviews
the submitted original text and confirms exactly one chain-order linkage. Import
stays held until the separate activation/payment approval is in place.

## Evidence and stop conditions

- Record the recipient's finalized pre-balance and an isolated acceptance window;
  account execution rewards/other transfers must be distinguished from the exact
  native transfer receipt. Preserve every transaction hash, FINAL outcome, receipt,
  exact deposit, tokens burnt/refunds and observed final balances.
- Submit informal billing text, inspect/confirm extracted or explicitly deterministic
  fields, approve the invoice and link to exactly one chain-approved order.
- Before any signing, refresh authoritative contract state. Start one scoped worker
  with its durable process lock and outbox. Stop/restart around an acknowledgement
  interruption without inventing an unknown outcome or signing a replacement.
- Repeated submission with the same token and a new token for the same work must
  return the original record or block a second claim. A mismatched amount/currency/
  wallet must remain in clarification/review without payment.
- Acceptance requires exactly one successful native transfer receipt of 0.001 NEAR,
  terminal matching Paid contract record, expected accounting (spent 0.001,
  reserved 0), verified transaction linkage and the same reference/status visible
  to owner and contractor after worker/app restart and refresh.
- Unknown outcomes remain blocked/reserved. Do not deliberately cause another
  payment or failed transaction under a one-payment approval. If an interruption
  cannot be safely induced within that scope, mark that live case unverified and
  retain the separately executed fixture result.
- Pause/revoke and record final state after the single conclusive payment. Any
  chain/configuration drift, expired authority, conflicting claim, fee overrun or
  failed proof stops execution for review. No Paid label is accepted from UI state
  alone.

Actual payment transaction links and costs: **none for this run**. Provisioning,
security-review prerequisites, exact worker/checkpoint configuration and separate
transaction authorization are outstanding.
