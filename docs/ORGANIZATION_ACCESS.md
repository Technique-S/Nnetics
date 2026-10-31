# Wallet identity, organization access and vault ownership

The subsequent [provisioning continuation](VAULT_PROVISIONING.md) adds a new
initializer and factory, still awaiting Linux verification/review. New vaults do
not inherit the configured workspace's payment database, worker or membership.
The authentication-only change documented below required no contract modification.

Updated 31 October 2026. See [ONBOARDING_FIX.md](ONBOARDING_FIX.md) for diagnosis,
execution evidence and remaining self-service provisioning limitations. No contract
change, deployment or new Linux execution is implied by this authorization fix.

## Configuration and scope

Application configuration contains an explicit testnet network, organization ID,
vault ID, expected deployed code hash, worker ID/key and RPC/origin. It contains no
owner allowlist. `NNETICS_OWNER_ID` and `NNETICS_OWNER_PUBLIC_KEY` are read only by
unsigned account/deployment preparation scripts; they do not authorize application
login or requests. There is no owner account returned by the public config API.

Identity login and durable unprovisioned organization creation no longer require
this configuration. The separate identity database discovers each account's own
draft organizations. Deployed billing still retains one configured organization
and vault per deployment/database. The server operator
chooses the organization-to-vault mapping; a browser cannot choose another contract,
network or organization. The existing database network/vault/code-hash binding is
preserved, with an additional permanent organization binding. API and worker must
use the same organization and database. Reusing it for another organization fails.
Do not create a fresh invoice database to evade a binding failure or pending claims.

## Authentication

Connecting Meteor grants no application access or ownership. Any supported,
activated testnet account may prove its identity with a
[NEP-413](https://github.com/near/NEPs/blob/master/neps/nep-0413.md) signature.
The server issues a random 32-byte, single-use, five-minute challenge binding account,
network, origin, browser generation and expiry, independently of organization/vault.
It verifies the canonical signature
bytes and that the signing public key is an existing FullAccess key of that exact
account at a finalized block. The RPC network is checked for identity verification;
deployed code hash is checked separately before deployed-organization access.
Inactive implicit accounts and function-call-only keys cannot log in.

The local Meteor extension path requests only that message signature for an
entered testnet account ID; it does not install a contract access key. Its
transaction connector is unimplemented and blocked, and real installed-extension
login remains unverified. See [METEOR_WALLET_COMPATIBILITY.md](METEOR_WALLET_COMPATIBILITY.md).

A successful signature creates only a 15-minute identity session. Session secrets
are random, stored hashed, and sent in HttpOnly/SameSite=Strict cookies. The stored
identity includes the account/key and network/origin context. Organization roles
are checked separately. Changing identity context requires a new login. Old sessions/challenges
are invalidated; invoices, signed outboxes, payment claims and worker state remain.
No private wallet keys enter the application server or browser bundle.

## Authorization

Every protected request verifies session expiry/context and rechecks the wallet key's
FullAccess permission at a fresh finalized block. Deployed-organization requests
also read `get_vault().owner` at that block. Identity and own-draft requests require
no vault. No boundary trusts a cached role or a browser-supplied owner/account.
Snapshots use that same block for their contract reads and report the verified
identity, organization, access role and current vault owner separately.

| Identity                                              | Organization reads                   | Application writes                         | Owner wallet transactions                                       |
| ----------------------------------------------------- | ------------------------------------ | ------------------------------------------ | --------------------------------------------------------------- |
| Connected but no verified session                     | Denied                               | Denied                                     | Denied                                                          |
| Verified wallet without deployed membership/ownership | Own unprovisioned organizations only | Create own unprovisioned organization only | Denied                                                          |
| Explicitly invited viewer                             | Allowed                              | Denied                                     | Denied                                                          |
| Verified current on-chain vault owner                 | Allowed                              | Allowed                                    | Requires separate transaction authorization and wallet approval |

The current on-chain owner may grant/revoke only `viewer` membership using the
organization controls (`POST /api/live/members`, accountId, role=`viewer`, enabled).
The application cannot grant an owner role. Grants are stored for this organization
and the issuing on-chain owner, not globally for an account. A revoked membership
fails on the next request, including an existing session. If an upgrade changes
the vault owner, former-owner grants stop applying; new grants are required.
Removed wallet keys, reduced permissions, expired sessions, inconsistent reads or
RPC failures also deny access. Authorization reflects the latest finalized state,
not a guarantee about unfinalized changes or changes after the check.

All application mutations share one owner-only server boundary, including invoice
intake/review/enqueue, discovery hints and membership management. A viewer cannot
queue a payment by bypassing disabled UI controls. Before opening a transaction,
the adapter fetches fresh authorized state, requires the verified identity to equal
the contract's owner, checks the tested protocol and confirms the signing account
is available in the wallet. The contract remains the ultimate transaction guard.

## Contract impact and review boundary

No contract change is required for verified login, organization-scoped private
data or read-only viewers. The existing owner account is already exposed by
`get_vault`. Owner methods retain direct predecessor/signer checks, attached-deposit
rules and all spending, reservation, invoice/order, worker-key and recovery guards.
Membership is an application data permission; it conveys no on-chain authority.
Permissionless on-chain views and reconciliation retain their existing semantics,
even though this dashboard conservatively limits mutation controls to its owner.

Delegating on-chain owner methods to members, multisignature approvals, owner
rotation or an on-chain organization registry would need a separately designed and
reviewed contract/state/upgrade change before implementation. None is included.

The configured RPC remains trusted for finalized network/key/contract reads; this
is not an independent light client or a security audit. Nightly real-user signing,
live-payment acceptance, independent verifier review and deployment remain open.
This local single-host application has no Internet-scale challenge rate limiting
or multi-tenant identity provider; do not infer production-hosting readiness.
