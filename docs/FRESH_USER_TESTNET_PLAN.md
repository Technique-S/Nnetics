# Fresh-user testnet provisioning — draft, not authorized

31 October 2026. No transaction in this document has been signed or sent.
The factory candidate/funder is a proposal; the user has not selected its signing
key or approved its deployment. Do not enable provisioning from this draft.

## Required infrastructure transaction

Proposed signer: `grandtheft.testnet`. Proposed receiver:
`v.grandtheft.testnet` (direct child, 20 characters, absent at finalized height
275646175, block `HaQgYN4Jx5DtCUPGxZfDkagduLm7M8ALsrZYzuVmKSBN`).
Network: NEAR testnet, protocol 88 at that read.

One transaction with CreateAccount, Transfer, DeployContract, and **no AddKey**.
The contract is stateless; there is no separate claimable initializer. Its
storage/operating funding is locked without an admin withdrawal or upgrade path.

Funding formula: `(tested factory WASM bytes + 4096) * 10000000000000000000
yoctoNEAR + 0.5 NEAR`, with transaction fees additional. Exact amount, factory/vault
SHA-256 hashes, public signing key and approval digest are **pending**. The
corrected factory must first pass Linux CI on protocols 86 and 88. Generate the
exact unsigned plan with `npm run factory:plan`; recheck current protocol/storage
price, FullAccess key, balance and target absence before requesting approval.

The 31 October preflight showed about 9.9999134 NEAR in Grandtheft. This does not
establish sufficient funding for both infrastructure and a customer vault; check
the exact total after the factory artifact exists. No faucet/transfer is authorized.

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
