# Selected owner: babygoat.testnet — paused vault deployed

## Executed result — 30 October, recorded 02:16 WAT

**All four explicitly approved transactions finalized successfully.** The exact
plan digest and tested WASM were preserved; no extra transaction was sent.

| Approved step | FINAL transaction | State verification height |
| --- | --- | --- |
| Create vault, fund 6 testnet NEAR | [2F8HX3qTipBqLmBuyaXnpcoFQCJ6YaTDJKsxjsXVyuyu](https://testnet.nearblocks.io/txns/2F8HX3qTipBqLmBuyaXnpcoFQCJ6YaTDJKsxjsXVyuyu) | 275379361 |
| Create worker, fund 1 testnet NEAR | [2Gy2HtUEgEyDnc437PgRFcuwN3h2NY5yELi8vTyYDU8L](https://testnet.nearblocks.io/txns/2Gy2HtUEgEyDnc437PgRFcuwN3h2NY5yELi8vTyYDU8L) | 275379401 |
| Create vendor, fund 0.1 testnet NEAR | [AJGzDiNmkxAfwit6zqZemNDZPEY3zMKk4NTmRRUvWvRu](https://testnet.nearblocks.io/txns/AJGzDiNmkxAfwit6zqZemNDZPEY3zMKk4NTmRRUvWvRu) | 275379469 |
| Deploy pinned WASM and initialize | [F1qdFtHiimWuUu1bgF9VwS75eVoeXhkoEEqEyQkK7etc](https://testnet.nearblocks.io/txns/F1qdFtHiimWuUu1bgF9VwS75eVoeXhkoEEqEyQkK7etc) | 275379556 |

Finalized `get_vault` at height **275379556** confirms owner `babygoat.testnet`,
`paused=true`, `agent=null`, `funded=spent=reserved=uncommitted_funds=0`,
`last_attempt=0`, budget 0.1 NEAR and cap 0.01 NEAR. Code hash is exactly
`31TAoYHRkExf3bokVz7MFQCyNfncBZ4ca8bpWzJmE1u9`. The worker account has the
approved owner FullAccess key and separate `execute_payment`-only key restricted
to this vault with allowance 0.25 NEAR. Vault/vendor keys match the approved plan.

Account funding totaled **7.1 testnet NEAR plus transaction fees**. This did not
fund the contract's payout ledger. No vendor registration, work-order approval,
worker activation, unpause, checkpoint or invoice payment occurred. No mainnet
transaction or GitHub push occurred. Independent review and bootstrap remain open.

The existing secure Windows keychain signed the first three approved transactions;
the existing protected vault key signed deployment. Signatures and exact unsigned
payloads were verified before broadcast. No owner secret was exported or printed.
The approval is now **consumed**, outboxes retained, and setup approval hashes
cleared from setup environment files. No new signing is authorized by this result.

Verified public settings are now active in local `.env.local`: organization label
`nnetics-studio`, the approved vault/worker IDs, worker public key and deployed code
hash. No existing queue was replaced. The dev server reloaded the environment;
Brave's configuration retry removed the missing-settings blocker. The real Meteor
extension initialized and **Sign message to sign in** is enabled for the entered
`babygoat.testnet` account. It has not been clicked/approved in this setup run;
real NEP-413 login and owner acceptance remain pending. Organization creation was
developer configuration, not the missing self-service onboarding journey.

Raw transaction results, signed outboxes, preparing markers and pinned account/key
checks are retained under ignored `artifacts/live/setup-*`; the completion/approval
records are `babygoat-setup-completed.json` and `babygoat-setup-approval.json`.

Executed for the signer change: **36 application Node tests** and strict TypeScript
passed. The new exact-byte/signature regression initially failed (35 pass / 1 fail):
SDK 7.4.0's decoded signature is a plain variant object rather than its constructor
getters. The verifier was corrected to inspect and verify the Ed25519 data; all
36 tests passed, and the focused signature regression passed again after formatting.
No new Rust/sandbox/Linux or production build is claimed. Actual setup transactions
are execution evidence, not an independent verifier security review.

## Approval and pre-execution history

**30 October approval received:** the user approved only the four transactions
below, exact digest `2c2bfe94fbfac359b08a8b2880b4433384c055d6852e52ac70f8aee92de20a43`.
This supersedes the historical “not authorized” status below. Approval is retained;
it excludes payments, worker activation, unpause, checkpoint installation and pushes.
The durable approval record is ignored `artifacts/live/babygoat-setup-approval.json`.

Fresh preflight at **02:09:12 WAT**, finalized height **275379087**, block
`5rZZUYyNqUYAVRtGHmgpTQzTFMYWtSs9Jnk7rPFhFEpV`, confirms protocol 88, sufficient
owner funds, the approved FullAccess key and absence of all three target accounts.
Protected vault/worker/vendor key files derive the exact approved public keys.
The npm-installed official **near-cli-rs 0.30.1** secure keychain also identifies
the approved owner public key; no owner private key is exported or copied.

The user approved setup signing, not an extra NEP-413 message. The control-proof
prerequisite is therefore satisfied by signing the **first approved transaction
offline**, checking its exact unsigned bytes and Ed25519 signature against the
finalized FullAccess key, and only then broadcasting. No additional message or
transaction is introduced. This proves CLI signer control before execution; it
does not prove Meteor message login or grant application ownership. The earlier
suggestion of a separate wallet challenge is superseded for setup control proof.

The executor now supports that pinned secure-keychain CLI, checks signer output,
and claims a durable preparing record **before signing**. A failed/unknown setup
remains blocked for reconciliation and cannot silently create a fresh retry.
The deployment step uses the existing protected vault key. Application `.env.local`
and payment switches remain unactivated until deployed owner/code/state verification.
Setup-only public inputs reside in ignored `.env.setup-approved.local`, which Next
does not load automatically. Setup signing is not browser-login acceptance.

30 October 2026, Africa/Lagos. The user created a new account through the CLI and
explicitly selected it instead of `nnetics-tobylou.testnet`. The prior faucet-created
account remains untouched. All prior-owner deployment plans are superseded; their
historical creation evidence is preserved. No new public-network mutation was made
to select or check this owner.

## Finalized read-only verification

At **00:20:31 WAT** (23:20:31 UTC on 29 October), NEAR testnet protocol 88,
finalized height **275367689**, block
`Hqyq13XDZviPa7pUJqzmX6s9eZV1B1CvbofT8PyMMdUT`:

- Account: `babygoat.testnet`, no deployed code.
- Balance: `10000000000000000000000000` yoctoNEAR (**10 testnet NEAR**).
- Exactly one **FullAccess** key, matching the user's supplied public key:
  `ed25519:EcXpsAWQyN6hCN6BmPKiYPWWRNZWHZMVBtvGZDwAdzwo`.
- This checks account/key state; it does **not** prove possession of the private key
  or grant application/vault ownership. A verified wallet challenge remains needed.

The user later reported Nightly displaying implicit address
`ca421cd2a55bf8c0774b1a971c02716d41d426b977b5fd44e9d7f6370ff1d45e`.
Its bytes encode the exact same `EcXps...Adzwo` public key registered on
`babygoat.testnet`. At finalized testnet height 275370238, that separate implicit
account returned `UNKNOWN_ACCOUNT`, while the named account retained 10 NEAR.
The reported public identity therefore matches the CLI key, but wallet network
selection/named-account discovery remain unresolved. No signature was requested
or verified, and no funds were moved to the implicit address.

The user subsequently confirmed Nightly only exposes mainnet in their installed
interface. Browser-wallet testnet compatibility is therefore **blocked**, not
accepted. Configuring Wallet Selector with `network: "testnet"` is insufficient
evidence that the installed extension supports network/account discovery for the
test. The bundled Nightly connector does not request a network switch in `signIn`.
No documented Nightly NEAR testnet switch was found in the official material
checked; this does not establish that every Nightly version lacks one. Attempts
to inspect a browser testnet-wallet interface through the available browser tool
timed out. Do not ask for another seed import or move funds to make a mainnet
display show testnet funds. CLI/testnet remains usable; real browser onboarding
must await a verified compatible wallet/connector. No further signatures or
public-network mutations were performed.

At finalized height **275367808**, `vault.babygoat.testnet`,
`worker.babygoat.testnet` and `vendor.babygoat.testnet` all returned
`UNKNOWN_ACCOUNT`. Refresh availability and balances before any approved execution.
Evidence: ignored `artifacts/live/babygoat-owner-preflight.json` and
`artifacts/live/babygoat-subaccount-preflight.json`.

## Updated unsigned setup plan

### Configuration-blocker refresh — 30 October, 01:54:30 WAT

Read-only queries pinned to finalized height **275377603**, block
`9FVUEUME3RtDbjd1MTUA5xsZLXHVTgyrmSarzfU1vhYM`, confirm testnet protocol **88**.
`babygoat.testnet` holds `9999826797124999999999998` yoctoNEAR (about 9.99983
testnet NEAR). Its supplied `EcXps...Adzwo` key remains FullAccess; the current
key list also contains FullAccess keys `ed25519:6FgF6MAZLhMWehiS6W7Bzg2Z7PdEw4LtiRdPfi6fp25R`
and `ed25519:7k3VsFcQyPR1w3TouKRirQgKfjgeypkAMXQtQjPE5e91`.
The earlier sole-key observation is historical. No origin or control of the
additional keys is inferred, and none was added or removed by this check.

All three proposed subaccounts still return `UNKNOWN_ACCOUNT`. Thus the gateway's
configuration message reflects **missing provisioning**, not a Meteor failure.
No local placeholder can establish an actual vault owner or deployed code hash.
The plan digest and 420,841-byte tested WASM hash below were recomputed and match;
the setup remains unsigned and unauthorized. Raw reads are retained in ignored
`artifacts/live/babygoat-setup-refresh.json`. No tests were rerun for these reads.

After approved provisioning and finalized verification, the application mapping
would be a local organization label such as `nnetics-studio`, vault
`vault.babygoat.testnet`, worker `worker.babygoat.testnet`, and the dedicated
worker public key below. The label conveys no owner authority; ownership must
come from the deployed vault and the verified wallet. These values have **not**
been activated in `.env.local`. Transaction switches remain disabled.

Approval of this setup must not imply approval of payments, worker activation,
unpause, a repair checkpoint or a verifier security sign-off. Independent review,
bootstrap trust and key custody remain open. The separate key-control proof and
fresh execution-time preflight remain prerequisites before setup signing.

Exact JSON: ignored `artifacts/live/babygoat-vault-plan.json`.
SHA-256 approval digest:
`2c2bfe94fbfac359b08a8b2880b4433384c055d6852e52ac70f8aee92de20a43`.
This plan is **not approved for execution**. The one faucet-request authorization
is already consumed and conveys no signing/deployment authority for this plan.

| Step | Signer → receiver | Ordered actions |
| --- | --- | --- |
| `create-vault` | `babygoat.testnet` → `vault.babygoat.testnet` | CreateAccount; Transfer 6 testnet NEAR; AddFullAccessKey dedicated vault key below. |
| `create-worker` | `babygoat.testnet` → `worker.babygoat.testnet` | CreateAccount; Transfer 1 testnet NEAR; AddFullAccessKey selected owner key; AddFunctionCallKey dedicated worker key below, only `execute_payment` at `vault.babygoat.testnet`, finite 0.25 NEAR gas allowance. |
| `create-vendor` | `babygoat.testnet` → `vendor.babygoat.testnet` | CreateAccount; Transfer 0.1 testnet NEAR; AddFullAccessKey dedicated vendor key below. |
| `deploy-initialize` | `vault.babygoat.testnet` → itself | Deploy unchanged tested WASM; call `new` with owner `babygoat.testnet`, budget `100000000000000000000000`, cap `10000000000000000000000` yoctoNEAR; 100 Tgas, zero attached deposit. |

Total initial funding: **7.1 testnet NEAR plus network fees**. This is account and
storage funding, not invoice payouts. Initialized vault remains paused, no agent,
zero funded/spent/reserved payment ledger; no recovery checkpoint is installed.

Public role keys, already generated and still unused on chain:

- Vault: `ed25519:LRNo78EQkSJ1AFXYuNzGLkRZUDxUj3d35Fm1FHZ9K13`
- Worker: `ed25519:9FF1t3GSFHTz6tqCUMbhVK51VaQ8o4DndunprjnDpS2u`
- Vendor: `ed25519:J8rTC6mFG6Qd1FaAR6e6WsFkvUgQunt7EncZznY8uR9f`

WASM: 420,841 bytes, SHA-256
`1dd4f6971b13303661b29c6757a353c873368848490bdce2cd86a9cc360459f8`,
code hash `31TAoYHRkExf3bokVz7MFQCyNfncBZ4ca8bpWzJmE1u9`.
Changing a key, action or binary requires a new digest and approval. Reviewed
checkpoints, authority/funding/order/unpause calls and payments are separate plans.

## Local configuration and remaining acceptance

Ignored setup-only `NNETICS_OWNER_ID` / `NNETICS_OWNER_PUBLIC_KEY` now reference the
selected account/key. Application authorization still has no owner allowlist;
the selected-owner record and plan do not create an organization or grant a role.
Application vault configuration remains unactivated, and signing/deployment switches
remain disabled. No owner key was read, copied, exported or generated by the agent.

The user has now imported the account into **Meteor's browser extension** and
confirmed it displays `babygoat.testnet` with 10 testnet NEAR. No further seed
import is needed. A local extension-only message-login bridge is implemented;
real interoperability and verified wallet control remain unexecuted. The app's
organization/vault configuration is still unactivated. Meteor transaction signing
remains unimplemented and blocked; no approval for this setup plan is implied.
See [METEOR_WALLET_COMPATIBILITY.md](METEOR_WALLET_COMPATIBILITY.md).

Self-service organization creation/discovery and onboarding vault provisioning
remain absent. Independent verifier review, bootstrap trust, key custody, separate
viewer/unrelated-wallet identities and real owner/payment acceptance remain open.
See [OWNER_ONBOARDING_ACCEPTANCE.md](OWNER_ONBOARDING_ACCEPTANCE.md). Contractor
portal implementation remains gated; existing approved recipients remain immutable.

No tests were rerun for this read-only preflight, unsigned-plan and local
configuration/documentation change. Previous test results remain tied to their
recorded sources and controlled fixtures.
