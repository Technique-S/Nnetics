# Owner onboarding acceptance — not passed

**Latest, 31 October:** the two-wallet identity/isolation checkpoint passed real
Meteor testing. Both accounts authenticated. `grandtheft.testnet` started empty,
created its own organization, returned to it after verification, and was denied
the original owner's private snapshot. `babygoat.testnet` returned to its own
workspace/list and was denied Grandtheft's organization API. Refresh/lost focus
clears private data and can require verification again. This does not claim real
viewer/key-removal tests or independent review.

The next ordered step is implemented locally: **Create vault**, durable intent /
hash recording, guarded initialization, finalized ownership checks and unique
organization linking. Linux verification of the new initializer/factory and real
deployment are pending; no self-service vault has been created on testnet.
Payments stay gated. See [VAULT_PROVISIONING.md](VAULT_PROVISIONING.md).
Older incomplete-login statements below are historical.

**31 October onboarding fix:** identity verification is now independent of vault
configuration and membership. New identities get empty onboarding and can create
durable, private **unprovisioned** organizations. Returning deployed workspaces
retain the existing owner/viewer authorization. Switching clears private records
and revokes sessions/pending proofs. Self-service vault provisioning is still
missing; two-account real Meteor acceptance remains unexecuted. The second account
is a test requirement, never an allowlist. See [ONBOARDING_FIX.md](ONBOARDING_FIX.md)
for current behavior and executed checks. The dated table below is historical.

**Current owner selection, 30 October:** `babygoat.testnet`, supplied by the user
after CLI creation. Its matching FullAccess key and 10 testnet NEAR balance are
historically verified at height 275367689. The user subsequently approved the four
paused setup transactions, all of which are now FINAL. CLI signer control was
cryptographically proven using the exact approved transactions before broadcast;
this does not prove Meteor message login. The vault is deployed, paused and has no
agent or payout funds. The local configured workspace is `nnetics-studio`.
[BABYGOAT_TESTNET_PLAN.md](BABYGOAT_TESTNET_PLAN.md) supersedes prior-owner plans.
No acceptance case below is promoted to passed merely by this account/key match.

The user now confirms **Meteor's browser extension** displays `babygoat.testnet`
and 10 testnet NEAR. Nightly's mainnet-only display no longer blocks wallet
selection, but no real Nnetics message login or owner acceptance case has run.
The local Meteor message-only bridge and its limitations are recorded in
[METEOR_WALLET_COMPATIBILITY.md](METEOR_WALLET_COMPATIBILITY.md). Meteor transaction
signing is still unimplemented and explicitly blocked. The local configuration
blocker is resolved; real message login awaits user wallet approval. The missing
self-service onboarding flow remains a blocker to complete owner acceptance.

29 October 2026. Local source is based on `c2ead94` plus the unpushed
wallet/organization authorization continuation. This is an implementation check
and a read-only testnet preflight, not a real-wallet acceptance pass or independent
security review. No public-network message was signed, account created, key changed,
transaction sent or contract deployed during this check.

## Historical acceptance results — 29/30 October

| Requested case                                                       | Implemented behavior / local evidence                                                                                                                                                                                                                                         | Real testnet wallet result                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| New wallet signs in and creates its own organization                 | **Not implemented.** Login service requires a preconfigured organization, vault/code hash and worker. There is no organization creation API, onboarding state machine or self-service provisioning UI.                                                                        | Blocked before this journey can run.                                                                                        |
| Existing owner returns to the correct workspace                      | Existing identity session can survive restart; organization/network/vault/code/origin binding and finalized owner checks constrain the configured workspace. One workspace is configured per deployment; no wallet-based organization discovery or workspace selector exists. | Not executed with a real wallet.                                                                                            |
| Unrelated wallet cannot read private records or invoke owner actions | Local signed-identity/API tests deny unaffiliated wallets and every protected mutation route, without changing invoice/registry state.                                                                                                                                        | Not executed with a separate real wallet.                                                                                   |
| Viewer cannot initiate payments or change authority                  | Owner-issued viewer grants allow reads only. API denies invoice intake/review/enqueue, membership and registry mutations; UI disables owner controls on desktop/mobile. Contract worker/owner guards remain independent.                                                      | Not executed with a real invited wallet.                                                                                    |
| Expired/replayed challenge or expired session                        | Actual local Ed25519 signatures and SQLite exercise expiry, tampering, concurrent nonce consumption, replay and context substitution.                                                                                                                                         | No real-wallet challenge generated or signed.                                                                               |
| Removed/restricted key                                               | Every protected request queries the signing key at a fresh finalized block; controlled tests deny missing/limited/inconsistent keys and RPC failure.                                                                                                                          | No real key added or removed. Do not remove any existing owner key.                                                         |
| Ownership change invalidates owner/member access                     | Controlled `get_vault` owner changes deny the old owner and former-owner viewer grants. The deployed contract interface has **no owner-transfer method**.                                                                                                                     | Same-vault ownership rotation cannot be exercised through the current contract. No upgrade or test backdoor was introduced. |

Public contract views are public chain data. Organization permissions protect the
private invoice queue and application records; they do not make chain data private.
See [ORGANIZATION_ACCESS.md](ORGANIZATION_ACCESS.md) for the actual access model.

## Read-only public-network evidence

The user supplied `tobylou.testnet` as the proposed owner. At **23:51:30 WAT on
29 October 2026** (22:51:30 UTC), FASTNEAR testnet reported protocol 88 / nearcore
2.14.0-rc.5, commit `b7b4737cab46f17a6daa2ed694d7aebbd204363a`.
Account/key reads were pinned to finalized height **275364596**, block
`BxL8JpQzHU3WQxcEaY1UHYUSSgEQd7LyUtvFERqg1A83`.

- `tobylou.testnet` exists with amount `13851551062027917899999998` yoctoNEAR
  (about 13.85155 testnet NEAR), no deployed code, and two FullAccess keys:
  `ed25519:3rTX6quXrYdVS82bPnvRFK3viTiLvELnEdLhgtmj1Sdh` and
  `ed25519:CZ6tm9P1pJTSaGQPPx8pv5TjTsp7hnzyF8cNtCvJHYpu`.
- A third key is limited to an unrelated receiver; it is not usable for NEP-413
  FullAccess authentication. Its presence does not grant Nnetics permissions.
- Proposed fresh `nnetics-vault.tobylou.testnet`, `nnetics-worker.tobylou.testnet`
  and `nnetics-vendor.tobylou.testnet` all returned `UNKNOWN_ACCOUNT`.
- The public-key string provided earlier does not match either current FullAccess
  key. User confirmation of the current wallet key and browser is pending.
  Account existence, balance and listing keys do **not** establish wallet control.

Raw responses are retained in ignored
`artifacts/live/owner-onboarding-preflight.json`. Balances, keys and account
availability must be refreshed before an authorized execution.

### Wallet mismatch reported after preflight

The user then reported a different imported Nightly wallet and supplied
`280a24be9fdffc41e6dd26367c11628ecac4bdfe61b724be8445c8a700fd65b4`
again. Interpreted as an Ed25519 implicit address, this corresponds to public key
`ed25519:3hJHBELXrMvGiUPX5YvqJPW8kHThJzPMcLHQ2qkv7oMM`, which matches
neither FullAccess key of the named account. A second finalized testnet read at
**23:58:43 WAT** (22:58:43 UTC), height **275365418**, block
`7dLjmdFoeJu1Ltn3eN4pykzJ6b6qucjH2KtHGnxB5kuM`, returned `UNKNOWN_ACCOUNT`
and no keys for the implicit address. It is not activated on testnet. This is not
evidence that Nightly lost tokens; the funded named account and this implicit
address are different accounts, and control of the named account is unproven.
Raw evidence: ignored `artifacts/live/implicit-wallet-preflight.json`.

The two named-owner setup candidates are now explicitly marked
`blocked_wallet_mismatch_not_authorized`. They must not be executed. The user must
choose between using the current wallet for a new testnet owner and recovering the
named account locally; browser and separate test identities remain unspecified.
No recovery material is requested or handled by the app. A new plan must follow
the resolved owner identity and refreshed account checks.

**30 October update:** the user chose the current wallet for a new testnet owner.
The old named-account candidates are retired for this path. The proposed
`nnetics-tobylou.testnet` name is currently available; a public-key-only sponsored
creation request and a separate future vault plan are prepared in
[NEW_OWNER_ACCOUNT_PLAN.md](NEW_OWNER_ACCOUNT_PLAN.md). The sponsor request awaits
specific approval. No account creation, wallet-control verification or onboarding
acceptance is claimed by selecting this path.

**Approved creation subsequently passed:** the faucet created
`nnetics-tobylou.testnet` with 10 testnet NEAR and the exact supplied FullAccess
public key; FINAL transaction and finalized account/key state were verified at
height 275366543. See [NEW_OWNER_ACCOUNT_PLAN.md](NEW_OWNER_ACCOUNT_PLAN.md) for
the transaction link and evidence. Nightly control of that key remains unverified;
none of the real-wallet login/role/return cases above is promoted to passed.

## Missing onboarding implementation and operational steps

1. **Identity before organization selection:** the current login service depends
   on a deployed, configured vault. New-owner onboarding needs a separately scoped
   wallet-identity flow before any organization/vault exists; an authenticated wallet
   still must not be declared a vault owner without finalized chain evidence.
2. **Organization creation/discovery:** durable organization records, wallet-to-org
   membership lookup, returning-user routing, workspace selection and authorization
   of org creation are absent. An environment label is not an organization created
   by a new owner.
3. **Provisioning:** unsigned account/deployment scripts exist; user-driven funding,
   pending/finalized deployment recovery, code/owner verification and linking a
   verified vault to the organization are not an onboarding UI. A duplicate/restarted
   onboarding request must not create or fund a second vault.
4. **Wallet access and actors:** verify the selected owner's FullAccess key through
   a real message login, identify its Meteor browser/version, and supply separate activated
   new-owner, unrelated-wallet and viewer accounts. Returning/new owner may be the
   same account across creation and return, but an unrelated wallet/viewer must be
   separate identities. Do not supply private keys or recovery phrases.
5. **Specific approvals:** select/review the exact unsigned setup plan below, review
   unresolved deployment findings and obtain explicit authorization before signing.
   A later login challenge also needs user wallet approval. No broad signing grant
   is inferred from an account ID, code changes or earlier push approval.
6. **Destructive auth probes:** a real removed-key test needs a separate test-only
   key/account and exact AddKey/DeleteKey approval. Retain original wallet keys.
   Do not use an upgrade to manufacture an owner-rotation pass. Ownership-transfer
   support needs a separately reviewed contract/upgrade design if required.
7. **Evidence:** record wallet/account identity, finalized access results, attempted
   denied API calls, restart/return results and hashes of any approved transactions.
   Controlled fixtures and sandbox receipts cannot fill these live-result cells.

Developer-configured owner login can be tested after approved provisioning, but
that partial journey cannot pass the missing self-service organization criterion.

## Transaction preparation

[BABYGOAT_TESTNET_PLAN.md](BABYGOAT_TESTNET_PLAN.md) is the current unsigned plan;
the earlier [OWNER_TESTNET_PLAN.md](OWNER_TESTNET_PLAN.md) candidates are retired.
Only the selected, revalidated plan may later be approved. Runtime
compatibility tests passed on 86/88, but historical bootstrap, independent verifier
review, upgrade-key custody and live-payment acceptance remain unresolved.
The proposed vault starts paused with no authorized worker or spendable payout
ledger. Recovery checkpoint, payment funding, vendor/order approval, worker
authorization and unpause would require separate reviewed transaction payloads.

## Actual local execution for this check

**30 October Meteor continuation:** 42 root tests, 35 application tests, strict
TypeScript, production build and 16 Edge desktop/mobile browser cases passed.
Four new message-transport tests and a controlled browser login case on both
viewports were executed. The browser case uses a dummy signature/HTTP login
fixture; it does not prove a real Meteor/server login. No public signature,
transaction or new Rust/sandbox/Linux execution occurred. See
[METEOR_WALLET_COMPATIBILITY.md](METEOR_WALLET_COMPATIBILITY.md).

Earlier authorization check re-executed **31 application Node tests**, production build (including strict
TypeScript), and **14 Edge desktop/mobile browser cases**: all passed, none skipped.
The browser suite additionally checks that the live gateway states developer setup
is required and that simulation remains explicit. Browser live responses and chain
authorization changes in unit tests are controlled fixtures. Local signature tests
use generated test keys; they do not prove access to any public-network wallet.
Production contract sources are unchanged; no new Rust/sandbox/Linux execution is
claimed for this local continuation. No contractor portal code was implemented.

## Contractor portal gate

**Not started: owner acceptance has not passed.** The current API has no contractor
role and permits invoice mutations only to the owner. Viewer membership must not
be reused as a contractor write credential. Once the owner gate passes, implement:

- Hashed, random, expiring/revocable invitation links bound to organization/vendor;
  possession of a link never grants owner/payment authority.
- Verified initial wallet submission, pending owner approval and an audit trail.
- Text-first billing, explicit clarification messages and durable submission IDs;
  unresolved ambiguity remains clarification/review, not queued payment.
- Contractor-scoped submitted invoices and status views, with no access to other
  contractors' or organizations' private records.
- Owner-approved wallet-change requests with history. Vendor updates affect future
  approvals only. **Existing approved work-order recipients are immutable.** Do not
  rewrite pending/paid orders or silently retarget an invoice; an unused obsolete
  order must be explicitly revoked and a new order ID approved if needed.
- Tests for invitation revocation/replay, cross-tenant access, unapproved wallets,
  clarification flow, wallet changes, immutable recipients and duplicate submission.

These requirements are a gated plan, not claims of implemented portal behavior.
No contract change is necessary for app invitations, private clarification or status
views. On-chain member spending or owner rotation would require separate review.
