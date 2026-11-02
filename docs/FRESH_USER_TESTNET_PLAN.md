# Fresh-user testnet provisioning — conditionally approved, not executed

31 October 2026. No transaction in this document has been signed or sent.
The user explicitly approved the two-transaction reduced plan with digest
`0f569790060daca8ffb0f51a8aebd9c5ae80b94e1cde253ec1db32f99cabfa6a`.
Approval is conditional on funding, fresh Meteor proof and unchanged preflight
parameters. It excludes any top-up/faucet request, payments, authority activation,
unpause, checkpoints and GitHub push. No transaction has been executed.
Provisioning stays disabled until the approved factory is deployed and verified.

**2 November current gate:** funding is now sufficient: Grandtheft has
11.999868762049999999999999 NEAR. Fresh real Meteor login passed with the approved
`4zTX...L8qZX` key and the empty saved workspace returned. Exact-plan preflight
passed and infrastructure hash `HafBR1uMZJFfN3U1v7x72s1LQiFCDkPoE6KqS5dhBSyk`
was recorded before the wallet request. **Meteor blocked DeployContract from
apps.** The local review server is stopped; do not disable the protection or
retry through the app. RPC reports UNKNOWN_TRANSACTION; finalized balance/nonce
are unchanged and the target is absent (height 275875473). No observed fee or
confirmed transaction link. The outbox is preserved and unknown outcomes stay
blocked. An owner-run official CLI deployment path needs the user's available
Grandtheft public key confirmed and reconciliation/reuse of the recorded exact
transaction, or conclusive expiry before a replacement. No CLI signing occurred.
No consolidation transfer is needed. See [VALIDATION.md](VALIDATION.md).

**1 November execution gate:** refreshed finalized testnet preflight still matches
the approved protocol/fees/targets and the JSON/artifact hashes are unchanged.
However, Grandtheft has **6.999868762049999999999999 NEAR**, confirmed by FastNEAR
at height 275771283 and official RPC at height 275771459. Current shortfall is
**4.634774946405317500000001 NEAR** (round 4.64 at the same parameters), not the
earlier 1.64 estimate based on its then-larger balance. The user was asked for the
funding transaction/recipient. Browser automation also reports `Debugger
unattached`, so current Meteor control is unverified. No transaction has been
signed or sent; approval remains conditional. See [VALIDATION.md](VALIDATION.md).

Post-approval funding check: finalized height **275662458**, block
`4p1rYsThzY1FDJUnKuR39opKW2oLiGzSGWxx5e28qXmP`; Grandtheft still has
`9999913398562499999999999` yoctoNEAR. The funding condition is unmet. No wallet
transaction approval was requested while unfunded. The next user action is an
incoming **1.64 testnet NEAR** top-up, followed by a new preflight and fresh proof.
This does not authorize an agent to source or send that top-up.

## Current reduced acceptance plan

CI for `c655800` passed: [provisioning protocols 86/88](https://github.com/Technique-S/Nnetics/actions/runs/41239039050),
[core](https://github.com/Technique-S/Nnetics/actions/runs/41239039000),
[owner](https://github.com/Technique-S/Nnetics/actions/runs/41239039001).
Both protocols emitted the exact hashes below. Downloaded artifacts were hashed
locally and match. Passing automation is not independent security review.

The [machine-readable unsigned plan](FRESH_USER_TESTNET_PLAN.json) is authoritative
for this proposal. SHA-256 of compact `JSON.stringify(plan)`:
`0f569790060daca8ffb0f51a8aebd9c5ae80b94e1cde253ec1db32f99cabfa6a`.
It permits either of Grandtheft's two existing on-chain FullAccess keys, **only
after fresh Meteor proof identifies the actual key**. Listing a key is not a
claim that Meteor controls it. No key is installed or exported.

### Itemization of the previous 11.8324 NEAR

| Component | NEAR | Required / reducible |
| --- | ---: | --- |
| Factory code storage: 629144 bytes | 6.29144 | Required by the pinned artifact at the recorded storage price |
| Factory account/state/overhead allowance: 4096 bytes | 0.04096 | Includes the account record and state; the remainder is a conservative allowance, not a measured minimum |
| Factory discretionary operating reserve | 0.50000 | **Removed for this acceptance plan**: caller buys gas; each creation supplies its own transfer |
| Vault code storage: 427238 bytes | 4.27238 | Included inside the fixed 5 NEAR customer deposit |
| Remaining vault account/state and operating balance | 0.72762 | Included inside that same deposit; includes the contract's 0.1 NEAR operating reserve; exact storage stake is measured after initialization |
| Payment funds | **0.00000** | No `deposit`, worker, vendor or payment transaction |
| **Previous deposits** | **11.83240** | Excludes transaction fees |
| **Reduced deposits** | **11.33240** | Same tested contracts, fixed 5 NEAR customer deposit and 4096-byte factory allowance |

Account creation is not an additional transfer to a registrar: these are direct
subaccounts created in the two transactions. Protocol 88 config reports a
0.007 NEAR account-creation charge per new account, covered through the execution
fee purchase. Do **not** add 0.014 NEAR again to the fee allowance below.
See the official [account documentation](https://github.com/near/docs/blob/master/integrations/accounts.mdx)
and pinned [runtime cost calculation](https://github.com/near/nearcore/blob/b7b4737cab46f17a6daa2ed694d7aebbd204363a/runtime/runtime/src/config.rs#L483).

The factory is stateless with no keys. The pinned runtime bills 100 account bytes;
the SDK's first empty `STATE` record adds approximately 45 bytes. This is a source
calculation, not a new VM measurement. A theoretical 6.29289 NEAR factory balance
would leave no margin after that write; it is **not** the proposed deployment.
The reduced 6.3324 NEAR plan retains the existing 4096-byte allowance rather than
testing the exact storage-failure boundary on a public network. Further reductions
need a separate sandbox measurement. The 5 NEAR customer deposit cannot be
reduced without changing the factory constant and application pins, so it stays
unchanged. The existing plan-builder script still defaults to the original
0.5 NEAR reserve; this JSON explicitly removes it for the one-vault test.

### Fresh balance, fees and shortfall

Read-only finalized height **275659894**, block
`AHXCpUGBqkpHLJ4gbXyB2ETqCg9oMPTMTFsdAgaNQXEG`: protocol 88;
Grandtheft amount **9.999913398562499999999999 NEAR**, locked zero, storage 264
bytes; proposed factory absent. The pinned runtime exempts accounts using at
most 770 bytes from storage-stake minimums; no extra owner storage hold is needed
for this unchanged account. Recheck if its storage/keys change.

| Fee / requirement | NEAR |
| --- | ---: |
| Infrastructure upfront fee purchase | 0.051324415742682 |
| Customer upfront fee purchase (250 Tgas + fixed fees) | 0.2509192927126355 |
| Combined upfront fee allowance | **0.3022437084553175** |
| Reduced deposits + both allowances, no refund credit assumed | **11.6346437084553175** |
| Shortfall against refreshed balance | **1.634730309892817500000001** |
| Rounded incoming top-up sufficient at these parameters | **1.64** |

These are exact **upfront allowances at the observed parameters**, not final fees.
The calculation uses block gas price `100000000`, minimum receipt purchase price
`1000000000`, and storage byte price `10000000000000000000` (all yocto units).
For each transaction: `send_gas * block_price + receipt_gas * max(block_price,
minimum_purchase_price)`. JSON records action byte counts and all gas totals.
Ed25519 signature surcharge is zero. Refunds after the first transaction may
reduce the ultimate shortfall; none are assumed before funding. The actual
combined expense cannot be known before FINAL receipt outcomes. Source-account
fees for any incoming top-up are separate and not part of this plan.

### Exact proposed transactions, in order

1. **Infrastructure:** `grandtheft.testnet` → `v.grandtheft.testnet`, one atomic
   action list: CreateAccount; Transfer **6332400000000000000000000** yoctoNEAR
   (6.3324 NEAR); DeployContract, **629144 bytes**, factory SHA-256 below.
   No AddKey and no initializer. Factory funding is locked without an admin
   withdrawal/upgrade method. Record transaction bytes/hash/nonce before signing;
   use those exact bytes to reconcile an interrupted submission.
2. **Customer:** only after transaction 1 is FINAL and factory/code/no-key/config
   verification passes: `grandtheft.testnet` → `v.grandtheft.testnet`,
   `create_vault`, exact UTF-8 args
   `{"request_id":"0657dc10a1c5acb5e4e930476ce98df8"}`, deposit
   **5000000000000000000000000** yoctoNEAR, gas **250000000000000**.
   Exact target/state are listed below and in JSON. Link only after FINAL
   receipt checks and finalized code, owner and no-key verification.

No incoming funding source is selected. Do not send a faucet request or transfer
under this plan. Before any execution: obtain explicit approval of the digest,
receive sufficient funds, obtain fresh wallet proof, and recheck protocol, fees,
keys, balance and both target absences. Reprice/reapprove if the fee schedule or
storage price changes or gas prices exceed JSON limits. Nonces/block references
are assigned only at execution, durably recorded, and never silently replaced
after an unknown result. The live app's generic 5.1 NEAR minimum is not a complete
protocol-88 upfront fee estimate; use this larger calculated requirement.

The scope is one initialized paused vault. Cancel a wallet request **before
signing**, then resume safely; test interruption after the customer transaction
has been dispatched and recover its same recorded hash after fresh login/refresh.
Do not broadcast an additional duplicate or deliberately faulted transaction.
Confirm there is exactly one target and organization link. If cancellation leaves
an uncertain signed outcome, reconcile it; do not allocate a new target or nonce.
Factory callback/refund failures have no automatic recovery and remain blocked.

Independent verifier review and bootstrap trust remain unresolved. No payment
funding, authority activation, checkpoint installation, unpause or payment is
included. Deployment transport still needs confirmation with the actual Meteor
key before signing. Real provisioning/recovery acceptance has not run.

## Earlier full-reserve proposal — superseded by the reduced plan above

Proposed signer: `grandtheft.testnet`. Proposed receiver:
`v.grandtheft.testnet` (direct child, 20 characters, absent at finalized height
275646175, block `HaQgYN4Jx5DtCUPGxZfDkagduLm7M8ALsrZYzuVmKSBN`).
Network: NEAR testnet, protocol 88 at that read.

One transaction with CreateAccount, Transfer, DeployContract, and **no AddKey**.
The contract is stateless; there is no separate claimable initializer. Its
storage/operating funding is locked without an admin withdrawal or upgrade path.

Funding formula: `(tested factory WASM bytes + 4096) * 10000000000000000000
yoctoNEAR + 0.5 NEAR`, with transaction fees additional. Downloaded protocol-88
artifacts from run 41237147482 were independently hashed locally:

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| Factory | 629144 | `8475786608c34a68317d2ada08cd3dd2e65ff23dc176e2377ac54db5b4f52bbb` |
| Vault | 427238 | `dc4cf64736110a33cce94531e2e00ba4510bcebbbb240bee6ecdacacf778560f` |

In the original full-reserve proposal, the factory deposit was **6.8324 NEAR**
(`6832400000000000000000000` yoctoNEAR). Together with the separate 5-NEAR
customer call, this proposal needs **11.8324 NEAR plus fees**. Grandtheft's last
checked balance is insufficient for both transactions; funding or another
explicitly selected infrastructure sponsor is needed before execution. No
top-up, faucet request or alternate sponsor transaction is authorized.

The original public signing key and approval digest were pending. The
corrected tests have now passed Linux CI on protocols 86 and 88. Generate the
exact unsigned plan with `npm run factory:plan`; recheck current protocol/storage
price, FullAccess key, balance and target absence before requesting approval.

The 31 October preflight showed about 9.9999134 NEAR in Grandtheft. Recheck
the balance, selected key and storage price at a fresh finalized block before
preparing an approval-ready plan.

## Subsequent customer transaction — separate approval

After the factory is deployed and finalized code/no-key/config checks pass,
prepare this organization's review through **Create vault**:

| Field | Proposed value |
| --- | --- |
| Network | testnet |
| Signer / initialized owner | `grandtheft.testnet` |
| Organization | `e3600323-ad40-43c4-a31d-7d53abc4833e` — Grandtheft workspace |
| Receiver | `v.grandtheft.testnet` |
| Method | `create_vault` |
| Args | `{"request_id":"0657dc10a1c5acb5e4e930476ce98df8"}` |
| Attached funding | `5000000000000000000000000` yoctoNEAR (5 NEAR) |
| Prepaid gas | `250000000000000` (250 Tgas); fees additional |
| Deterministic vault | `v-848e8ad68232ad34834d145f81c1641e899926aa.v.grandtheft.testnet` |
| Initial authority | Paused, original wallet signer as owner, no access keys or worker |
| Initial payment ledger | Zero; budget zero; per-payment cap 0.01 NEAR |

This request ID is SHA-256(organization ID), first 32 hex characters. The child
label uses SHA-256(owner + ':' + request ID), first 40 hex characters. A changed
factory proposal changes the target and requires a new reviewed plan. The app
must pin both artifact hashes and emit its final plan digest before any approval.

The transaction nonce/hash is recorded before Meteor opens. Resume queries that
hash to FINAL and checks exact actions, callback/receipt outcome, pinned code,
absence of keys and expected initialized owner at a finalized block before linking
the organization. Unknown outcomes stay blocked; no fresh nonce/target is created
automatically. A conclusively failed/refunded attempt may offer an explicit retry
of the same child only. Callback failure is an unresolved recovery limitation.

## Live acceptance still required

1. Review and approve the exact infrastructure plan after Linux passes.
2. Verify deployed factory code, embedded vault hash, absence of keys and config.
3. Review and approve the customer's exact create call separately.
4. Confirm FINAL receipt success and owner before linking; retain transaction links.
5. Exercise real cancellation and interrupted return/reconciliation, refresh, and
   duplicate submission; demonstrate one initialized vault and a single link.

Current Node/browser checks use controlled RPC/wallet responses for these cases.
The two real Meteor accounts have passed identity/isolation checks; that does not
constitute real provisioning acceptance or independent security review. Payment
funding, worker activation, unpause, checkpoints and payments remain unauthorized.
