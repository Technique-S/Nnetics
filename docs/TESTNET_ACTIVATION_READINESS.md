# Ongoing testnet activation — not yet executable

The owner requested the application support ongoing testnet transactions. This is a software-readiness request; it supplies no new deposit amount, cumulative spending limit, fee allowance or exact transaction approval. The previous independent-review exception covered only INV-0002 and cannot be reused for ongoing payments. No independent security review has occurred.

## Finalized observations, 4 November 2026

At 16:39:02 UTC, height 276220645, the existing verified vault was still owned by `grandtheft.testnet`, paused and without an authorized agent. Its code/owner/Paid baseline also passed `deploy/preflight.mjs`.

| Item | Observed value |
| --- | --- |
| Vault | `v-848e8ad68232ad34834d145f81c1641e899926aa.v.grandtheft.testnet` |
| Per-payment limit | 0.001 NEAR |
| Cumulative spending limit | 0.001 NEAR |
| Payout funding / confirmed spend | 0.001 NEAR / 0.001 NEAR |
| Available payout funds / pending reservations | 0 NEAR / 0 NEAR |
| Owner account balance, before storage/fees | 5.329457227044466499999986 NEAR |
| Existing worker account balance | 0.2992064193122089 NEAR |
| Queue | One terminal Paid job, INV-0002; no new payable job |
| Checkpoint head | 276003652, timestamp 1793682686057769230 ns |
| Prior reviewed checkpoint deadline | 4 November 2026, 06:11:26 WAT; expired |

Amounts are exact decimal conversions, not floats. The worker balance is gas money, not vault payout funding. The contract's storage stake and operating reserve must not be reclassified as payout funds.

## Actionable defect fixed locally

Worker startup and preparation previously checked only checkpoint existence; broadcast did not repeat the freshness check. Added a shared application freshness guard at startup, before key loading/signing and immediately before broadcast. It compares integer timestamps against the same finalized block used for the contract read, rejects malformed/missing/future evidence and stops at the 24-hour boundary. This enforces the earlier reviewed freshness condition; it does not authenticate a checkpoint or replace proof verification.

Tests cover missing/malformed timestamps, future evidence, the exact boundary and a stale preparation/broadcast attempt that cannot reach key loading or network submission. Owner suite: 123 passed. Type-check passed. Build result is recorded in the execution log; no real-wallet transaction acceptance has run.

## Remaining activation gates

1. **Meteor transaction integration.** Message login works, but `NearOwnerAdapter.callOnce` deliberately rejects the Meteor path. The installed adapter configures Nightly for transaction signing. Simply removing that check would incorrectly fall through to another wallet. Official Meteor Wallet Selector source delegates sign-and-send internally and marks standalone transaction signing unsupported. A reviewed integration must retain exact request validation, durable tracking before broadcast and unknown-result reconciliation. No dependency/version change or wallet-key installation was made in this assessment.
2. **Fresh recovery proof.** The initialized checkpoint must be advanced using authenticated updates from the existing trust root. Initialization cannot be repeated after the Paid attempt. `advance_repair_head` requires at least 250 Tgas per call; a standard 100-Tgas owner request is insufficient. Collect, normalize, corroborate and VM-check the actual updates before forming exact transactions. Do not reset or replace the trust root to avoid this work.
3. **New payout funding and spending permission.** An owner must choose an additional deposit and new cumulative limit; existing funding and spending permission are exhausted. Keeping the current cap of 0.001 NEAR would preserve its per-payment ceiling. Any increase must be explicit. New approved agreements and invoices determine recipients and amounts; INV-0002 remains terminal.
4. **Automatic-payment operation.** Recheck the exact restricted key, remaining allowance and gas funding. Reauthorize only `worker.grandtheft.testnet` with its existing approved public key, then unpause only after every preceding gate passes. No owner permission is granted to that key. Ongoing execution needs durable supervision, checkpoint maintenance and explicit fee/spending limits. Existing authorization has no automatic on-chain expiry; do not promise timed revocation without implementing and testing it.
5. **Review disposition and integration checks.** No third-party security review exists. The single-payment exception does not establish readiness for continuing payments. The previously documented shared-tree request/recovery regression failures also remain unresolved; the readiness assessment is not a passing full-app acceptance.

## Approval package still required

Prepare exact checkpoint update(s), payout deposit, new cumulative limit, any expressly requested cap change, restricted-worker authorization and unpause calls. Itemize deposits, gas, maximum fees, current balances, key allowance and stop/containment actions. Include the ongoing testnet review/trust disposition and any operational limits. There are currently no exact fresh proof arguments or owner-selected funding/limit values, so this document is **not** an executable transaction plan or an approval request.

Until that package is approved, leave configuration authorization disabled, do not start the worker, and keep the vault paused/revoked. No new signing, broadcast, funding, contract deployment or GitHub push occurred.

Official integration references checked: [NEAR Wallet Selector Meteor implementation](https://github.com/near/wallet-selector/blob/main/packages/meteor-wallet/src/lib/meteor-wallet.ts), [wallet transaction interface](https://github.com/near/wallet-selector/blob/main/packages/core/docs/api/wallet.md). These references establish available interfaces, not security approval of this application.
