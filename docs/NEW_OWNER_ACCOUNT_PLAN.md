# New testnet owner created — wallet control still unverified

**Superseded owner selection:** the user subsequently selected their CLI-created
`babygoat.testnet` account. See [BABYGOAT_TESTNET_PLAN.md](BABYGOAT_TESTNET_PLAN.md).
This file preserves the already approved faucet-creation history; its future vault
plan is superseded and must not be executed.

30 October 2026, Africa/Lagos. The user chose a new testnet owner using the current
wallet instead of recovering `tobylou.testnet`. That old named account and both of
its setup candidates are retired for this path. The user subsequently approved
the single faucet request, which executed and finalized as recorded below. This
does not grant application ownership, authorize deployment or pass onboarding.

## Approved request execution

The user explicitly approved request digest
`0467172525c88344d40511100ebf180e77910aef4d2158f63a9b54d872e51987`.
The exact request was submitted **once**, after a fresh finalized absence check.
An exclusive, fsynced attempt record was written before submission to prevent a
fresh retry. The faucet returned an optimistic result; it was not treated as final.

At **00:09:39 WAT on 30 October 2026** (23:09:39 UTC on 29 October), independent
read-only RPC confirmation returned:

- Network `testnet`, protocol 88; transaction status **FINAL**, successful.
- Account `nnetics-tobylou.testnet`, balance
  `10000000000000000000000000` yoctoNEAR (**10 testnet NEAR**), no deployed code.
- Exactly one key, **FullAccess**:
  `ed25519:3hJHBELXrMvGiUPX5YvqJPW8kHThJzPMcLHQ2qkv7oMM`.
- Transaction signer `testnet` (the faucet), receiver `nnetics-tobylou.testnet`.
  Actions: CreateAccount, Transfer 10 NEAR, AddKey with the approved FullAccess key.
- Finalized read height **275366543**, block
  `6iiF622QnVugNFgNgTRZrpqpp9zeggf4eZGmXwwGdPAT`.
- [Creation transaction](https://testnet.nearblocks.io/txns/GhDXFy8C9wBUaSVjXSM6GK6vN3L4VbUjAiK8bLA4Fg5b).

Evidence: ignored `artifacts/live/approved-owner-faucet-attempt.json` and
`artifacts/live/new-owner-finalized-confirmation.json`. The original approved request
object remains unchanged so its digest can be reproduced. The one-request approval
is consumed. No user secret/signature was used, no existing key changed, no vault
deployed and no invoice payment initiated. **Nightly control of the installed key
is still unproven**; account funding must not be mistaken for verified wallet login.

## Original approved request

The approval covered **one faucet-sponsored testnet account creation**:

- New named account: `nnetics-tobylou.testnet`.
- FullAccess public key: `ed25519:3hJHBELXrMvGiUPX5YvqJPW8kHThJzPMcLHQ2qkv7oMM`.
  This is the encoding derived from the user's supplied 64-hex value, not a newly
  generated wallet key. We have not yet verified that the current Nightly import
  controls it. A later wallet challenge must prove control before vault funding.
- Sponsor endpoint: `POST https://helper.nearprotocol.com/account`.
- Exact JSON body:

```json
{
  "newAccountId": "nnetics-tobylou.testnet",
  "newAccountPublicKey": "ed25519:3hJHBELXrMvGiUPX5YvqJPW8kHThJzPMcLHQ2qkv7oMM"
}
```

The faucet chooses its initial testnet balance and pays network fees. This request
does not spend user funds, ask for a wallet signature, alter an existing account,
deploy a contract or authorize invoice payment. Faucet availability/rate limits
and the amount funded are not guaranteed. The new named account uses the supplied
key; the separate implicit address need not be funded to create this named account.

The name returned `UNKNOWN_ACCOUNT` at finalized height **275365815**. Refresh its
availability immediately before any approved request. If a request times out or
returns an unclear result, query finalized account/key state before any retry;
do not automatically request another name or create a new wallet key.

Exact request record: ignored `artifacts/live/new-owner-faucet-request.json`.
SHA-256 approval digest of its request object:
`0467172525c88344d40511100ebf180e77910aef4d2158f63a9b54d872e51987`.
Approval authorized only this one sponsor request, followed by read-only
reconciliation of its transaction/account/key state. It did not authorize any
later wallet signing, transfers, key changes or deployment.

## Source verification

The official [account creation guide](https://docs.near.org/protocol/tutorials/creating-implicit-and-named-accounts)
documents faucet-sponsored named testnet creation. The
[official CLI guide](https://github.com/near/near-cli-rs/blob/7c0b2bf8cec6135fb31d12b9cd68fcc4b61894b1/docs/GUIDE.en.md)
supports an existing public key, avoiding generation/export of a replacement seed.
Pinned CLI commit: `7c0b2bf8cec6135fb31d12b9cd68fcc4b61894b1`.
Its [testnet network configuration](https://github.com/near/near-cli-rs/blob/7c0b2bf8cec6135fb31d12b9cd68fcc4b61894b1/src/config/mod.rs)
selects that sponsor endpoint; its
[request callback](https://github.com/near/near-cli-rs/blob/7c0b2bf8cec6135fb31d12b9cd68fcc4b61894b1/src/commands/account/create_account/sponsor_by_faucet_service/mod.rs)
posts these two JSON fields. Source copies are retained under ignored
`.tools/near-cli-owner-preflight/`. No CLI installation was run; the approved request
was sent directly with the identical URL and JSON fields.

Equivalent official CLI command retained for reference (not run; do not repeat creation):

```sh
near account create-account sponsor-by-faucet-service nnetics-tobylou.testnet use-manually-provided-public-key ed25519:3hJHBELXrMvGiUPX5YvqJPW8kHThJzPMcLHQ2qkv7oMM network-config testnet create
```

## Remaining gates after account creation

1. **Passed:** finalized creation, exact FullAccess key and 10 NEAR balance verified;
   transaction link retained. Wallet control remains a separate check.
2. Select/discover the new account in Nightly on NEAR testnet and prove this key
   through a verified challenge. Browser and wallet control remain unconfirmed.
   Account creation cannot repair an import of a different private key. Keep
   recovery/import steps private; no owner secret enters the app.
3. Review a separate vault setup plan only after funding/custody checks. The future
   unsigned record is `artifacts/live/new-owner-vault-plan.json`, digest
   `ec4e18976ad1be64e83eab8b72d73cf8148e6cb35a254e8cbb8611476eec14d9`.
   It proposes `vault.nnetics-tobylou.testnet`, `worker.nnetics-tobylou.testnet`
   and `vendor.nnetics-tobylou.testnet`, 6/1/0.1 testnet NEAR respectively, and the
   unchanged tested WASM initialized paused. Its total is 7.1 NEAR plus fees; the
   new owner now has 10 testnet NEAR before any later fees/spending. No action in that plan is currently
   authorized. Exact actions are in the JSON; refresh the plan before approval.
4. Resolve the developer-only organization configuration, missing self-service
   organization creation/discovery, separate viewer/unrelated test identities,
   reviewed recovery bootstrap and live-wallet acceptance. No on-chain owner
   transfer exists in the contract. Independent security review remains open.
5. The contractor portal remains gated on owner acceptance. Its requirements and
   immutable approved-order recipient rule remain in
   [OWNER_ONBOARDING_ACCEPTANCE.md](OWNER_ONBOARDING_ACCEPTANCE.md).
