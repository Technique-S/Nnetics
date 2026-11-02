# Existing owner-wallet funds — separate transfer proposal

**Superseded 2 November:** user funding arrived directly in both wallets.
Grandtheft now independently covers the approved provisioning requirement.
This proposed consolidation transfer was not executed and is unnecessary.

1 November 2026. Not signed or sent. The existing provisioning approval excludes
top-ups; obtain separate approval for this exact additional transaction.

Finalized height 275771829, block
`2ruRBWBX33LPpjuVzLeKqFPEcR9M4rtjbb9Uzod8A1CU`:
Babygoat liquid balance 5.878461305613026399999998 NEAR;
Grandtheft liquid balance 6.999868762049999999999999 NEAR. Both have no contract
code or locked stake. Their storage is 346 / 264 bytes, below the pinned runtime's
770-byte zero-balance-account exemption. Existing vault/worker/vendor accounts
are not funding sources for this plan.

| Transaction field | Exact value |
| --- | --- |
| Network | NEAR testnet |
| Signer | `babygoat.testnet` |
| Receiver | `grandtheft.testnet` |
| Sole action | Transfer |
| Amount | **4.64 NEAR** / `4640000000000000000000000` yoctoNEAR |
| Upfront fee at observed parameters | 0.00024550081875 NEAR |
| Maximum upfront fee allowance | **0.00025 NEAR** |
| Keys | One of the three existing FullAccess keys enumerated in JSON; fresh signer control and on-chain key check required |

The fee is `(108059500000 + 115123062500) * 100000000` for send gas plus
`(108059500000 + 115123062500) * 1000000000` for receipt gas. No new account
is created. Actual fees/refunds require FINAL receipt evidence.

After transfer, Grandtheft would have **11.639868762049999999999999 NEAR**.
This covers the already approved provisioning plan's **11.6346437084553175 NEAR**
deposits/combined upfront allowances, with approximately 0.005225 NEAR headroom.
Babygoat retains at least about **1.2382 NEAR** after the proposed fee allowance.
No reserve is borrowed from either vault, no keys change and no contract changes.

Machine-readable [plan](EXISTING_BALANCE_TOPUP_PLAN.json), SHA-256 of compact
`JSON.stringify(plan)`:
`00cf57533b4c52f4401c664881e4107594d579c827ea55f359ef257f0f7aea9e`.

Before execution: explicit approval, fresh finalized network/balance/key/fee
checks, verified signer control and a durable exact transaction hash/nonce record.
Unknown results must be reconciled before another submission. Wait for FINAL
transfer success, then refresh Grandtheft's funds and all original provisioning
gates. The two original deployment/create transactions keep their approved digest
`0f569790060daca8ffb0f51a8aebd9c5ae80b94e1cde253ec1db32f99cabfa6a`.
Fresh Meteor proof of Grandtheft remains required; browser automation currently
reports `Debugger unattached`. This proposal does not remove that gate or authorize
payments, unpause, worker activation, checkpoints, faucet requests or GitHub pushes.
