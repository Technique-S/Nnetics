# Proposed owner verification setup — blocked by wallet mismatch

29 October 2026. Prepared using the existing `testnet-plan.ts`, exact retained
Linux WASM, currently listed public owner keys and previously generated dedicated
role keys. No private keys appear in this document or the JSON artifacts. No owner
keys were read or generated. No signing/broadcast/deployment was performed.

**Do not execute either candidate.** After preparation, the user reported a
different imported wallet and supplied an implicit address/key that matches neither
candidate owner key. That implicit account is unactivated on testnet. The JSON
artifact status is now `blocked_wallet_mismatch_not_authorized`. Resolve wallet
identity, refresh chain checks and regenerate a selected plan before requesting
transaction approval. These records document preparation, not authority to act.

This is developer-assisted setup of the existing single-workspace application.
It does **not** implement new-wallet organization creation or complete onboarding.
Proposed local organization label: `tobylou-studio`; it has not been created by a
wallet. Application access still derives from verified identity and finalized
ownership, never this owner name in the setup plan.

## Candidate selection

**Update, 30 October 2026:** the user chose the current wallet for a new owner.
These old-owner candidates are retired for that path. See
[NEW_OWNER_ACCOUNT_PLAN.md](NEW_OWNER_ACCOUNT_PLAN.md) for the separate pending
faucet request and future, unapproved setup record.

The user must identify the FullAccess key shown for `tobylou.testnet` in their
wallet. Neither candidate may be treated as proof of control or executed yet.
Public-key selection changes the signer and the worker recovery FullAccess key,
so the candidate digests differ. All action details are retained in ignored
`artifacts/live/owner-setup-candidates.json`.

| Candidate | Owner public key | SHA-256 approval digest |
| --- | --- | --- |
| A | `ed25519:3rTX6quXrYdVS82bPnvRFK3viTiLvELnEdLhgtmj1Sdh` | `9453345f5942707140082d2cd7f3c5d8301929dd839a90d6a9b526d0fbe87e27` |
| B | `ed25519:CZ6tm9P1pJTSaGQPPx8pv5TjTsp7hnzyF8cNtCvJHYpu` | `4c7d6bc0a6983773121f7aedd8086fbf6bb6776777deb1931838931d3178edce` |

## Exact actions per candidate

Network: **NEAR testnet only**. RPC: `https://test.rpc.fastnear.com`.
Funding totals **7.1 testnet NEAR plus network fees**; these transfers include storage
funding, not spendable payout-ledger funding. No vendor invoice payment is included.

| Step | Signer → receiver | Ordered actions |
| --- | --- | --- |
| `create-vault` | `tobylou.testnet` → `nnetics-vault.tobylou.testnet` | CreateAccount; Transfer `6000000000000000000000000` yoctoNEAR (6 NEAR); AddFullAccessKey vault key below. |
| `create-worker` | `tobylou.testnet` → `nnetics-worker.tobylou.testnet` | CreateAccount; Transfer `1000000000000000000000000` (1 NEAR); AddFullAccessKey selected owner key; AddFunctionCallKey worker key below, receiver vault, only `execute_payment`, allowance `250000000000000000000000` (0.25 NEAR gas allowance). |
| `create-vendor` | `tobylou.testnet` → `nnetics-vendor.tobylou.testnet` | CreateAccount; Transfer `100000000000000000000000` (0.1 NEAR); AddFullAccessKey vendor key below. |
| `deploy-initialize` | `nnetics-vault.tobylou.testnet` → itself | DeployContract exact WASM below; FunctionCall `new` with `{"owner":"tobylou.testnet","budget":"100000000000000000000000","payment_cap":"10000000000000000000000"}`, 100 Tgas, zero attached deposit. |

Role public keys derived again from existing protected local files:

- Vault: `ed25519:LRNo78EQkSJ1AFXYuNzGLkRZUDxUj3d35Fm1FHZ9K13`
- Worker: `ed25519:9FF1t3GSFHTz6tqCUMbhVK51VaQ8o4DndunprjnDpS2u`
- Vendor: `ed25519:J8rTC6mFG6Qd1FaAR6e6WsFkvUgQunt7EncZznY8uR9f`

WASM: 420,841 bytes, SHA-256
`1dd4f6971b13303661b29c6757a353c873368848490bdce2cd86a9cc360459f8`,
NEAR code hash `31TAoYHRkExf3bokVz7MFQCyNfncBZ4ca8bpWzJmE1u9`.
Initialization starts **paused**, no agent, zero funded/spent/reserved ledger,
0.1 NEAR cumulative budget and 0.01 NEAR cap. Deployment/initialization is atomic
and self-signed because existing initializer guards require the vault itself.

These are unsigned action plans, not signed transactions. Nonce, recent block hash,
fees, account/key existence, sufficient available balances and exact deployed code
must be rechecked at execution. Any changed action/key/binary requires a new digest
and approval. Owner signatures must remain user-controlled. The protected local
vault key is used only for its separately approved deployment step; custody remains
a review issue. The script executes one digest-approved step per invocation and
refuses to create a fresh setup transaction when an outbox already exists.

## Additional approvals not prepared for execution

- NEP-413 login: off-chain, no gas, five-minute app-issued challenge. Approve only
  the exact displayed account/organization/network/vault/origin and nonce. No stale
  pre-signed message is provided here. See the official
  [NEP-413 specification](https://github.com/near/NEPs/blob/master/neps/nep-0413.md).
- Viewer invitations/revocations: application writes by a verified current owner;
  no NEAR transaction. Separate real viewer and unrelated-wallet IDs are missing.
- Removed-key probe: no key selected, no AddKey/DeleteKey payload authorized. Use a
  dedicated test key and retain every original wallet key; prepare exact actions
  separately after choosing test accounts.
- Owner rotation: unsupported by the current contract. No upgrade/change-owner
  payload is proposed. Do not replace this with an unreviewed test-only deployment.
- Payment demonstration: checkpoint/storage/payout funding, vendor/work-order
  registration, worker authorization and unpause are outside these four steps.
  Prepare them separately only after reviewing recovery assumptions and exact
  proposed order/recipient/amount/expiry. Unknown results must remain blocked.

The official [account-ID documentation](https://docs.near.org/protocol/accounts-contracts/account-id)
and [transaction documentation](https://docs.near.org/protocol/transactions) were
checked while preparing this plan. Current protocol-88 compatibility evidence is
in [PROTOCOL_88_REVIEW.md](PROTOCOL_88_REVIEW.md). Passing automated tests does not
resolve independent verifier review or authorize public-network transactions.
