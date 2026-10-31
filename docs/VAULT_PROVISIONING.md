# Fresh-user vault provisioning — local implementation, 31 October 2026

**Not deployed or accepted.** Real Meteor login/isolation checks passed for
`babygoat.testnet` and `grandtheft.testnet`; the new factory, initializer and wallet
transaction path still require Linux execution, review and explicit testnet
deployment approval. No existing deployed vault is upgraded by this work.

**Latest CI review:** the existing core plus additive vault initializer passed
39 unit / 15 sandbox tests per runtime on protocols 86 and 88 in
[run 41216056809](https://github.com/Technique-S/Nnetics/actions/runs/41216056809).
The factory did not compile in
[run 41216056725](https://github.com/Technique-S/Nnetics/actions/runs/41216056725):
ambiguous method-name `.into()` calls. These are fixed locally, and the deprecated
callback result read is now bounded to the initializer's empty response. Six
factory unit tests are written; none executed successfully yet. Factory production
build, Clippy and all four provisioning sandbox cases remain unverified pending
an approved push/rerun. There is no tested factory artifact for deployment approval.

## Contract change identified before implementation

The original `new` constructor requires both predecessor and signer to equal the
vault account. An owner-wallet/factory transaction cannot use it. It remains
unchanged in authorization behavior. The additive `new_from_factory` constructor
requires the original signer to equal the owner, the predecessor to be the new
account's direct parent, and the account ID to match the owner/request-derived
child. Both constructors use the same initial state and SDK initialization guard.
Existing serialized state, public payment methods and spending/recovery guards are
preserved. The additive entry point changes the WASM hash and needs new verification.

The new stateless factory accepts only direct wallet calls; it derives the owner
from the signer, never a browser-supplied owner parameter. It embeds one reviewed
vault WASM and creates `v-<first 40 hex SHA256(owner:request)>.<factory>` with a
single action receipt containing CreateAccount, 5 NEAR transfer, deploy and init.
No keys are installed. Initialization starts paused, budget zero, cap 0.01 NEAR,
no agent and a zero payment ledger. The funding covers storage/operating balance;
it is not invoice-payment funding.

This works for supported named and activated Ed25519 implicit owner accounts:
the vault is a child of the factory rather than the wallet's own account. The
factory ID is limited to 21 characters so the derived account stays within 64.
The infrastructure factory is itself deployed without keys and has no administrator,
initializer, upgrade or withdrawal method. Its storage/reserve funding is locked.

The factory returns its creation/callback promise. Failed child initialization
rolls back the entire child receipt and returns a refund promise to the original
owner. A callback/refund failure is not treated as successful provisioning.
Fault-injection features build separate sandbox artifacts and must never deploy.

Official documentation checked on 31 October:

- [Transaction lifecycle](https://docs.near.org/protocol/transactions/transaction-execution): receipt rollback and the distinction between included/executed/FINAL.
- [Account IDs](https://docs.near.org/protocol/accounts-contracts/account-id): parent creation permissions and the 64-character bound.
- [Account creation](https://docs.near.org/protocol/tutorials/creating-implicit-and-named-accounts): implicit activation and direct subaccounts.
- [Factories](https://docs.near.org/smart-contracts/tutorials/factories/factory): factory-created child accounts. This implementation embeds pinned WASM rather than adopting the tutorial's mutable global-contract reference or separate public initialization.
- [Refunds](https://docs.near.org/smart-contracts/security/cross-contract-calls/refunds) and [callback failures](https://docs.near.org/smart-contracts/security/cross-contract-calls/callback-failures): failed attached deposits return to the calling contract, which must return them to the user; a failed callback is not automatically retried.

## Durable application flow

1. A verified identity creates its private organization and selects **Create vault**.
2. The server checks the configured testnet factory's finalized code, absence of
   keys, embedded vault hash and exact funding. It persists a deterministic request
   and displays network, owner, target, factory, method/args, funding, prepaid gas,
   artifact hashes, plan digest and unresolved review findings.
3. Wallet requests remain disabled unless `NNETICS_PROVISIONING_ENABLED` is exactly
   `testnet-reviewed`. This switch is separate from payment/worker authorization.
4. After review, dispatch rechecks identity, protocol 86/88, factory, FullAccess
   key and balance. It stores unsigned Borsh bytes, nonce and computed hash in
   SQLite **before** opening Meteor. Concurrent tabs receive the same transaction.
5. The browser independently checks the hash, signer, factory and sole factory
   FunctionCall before requesting Meteor's `sign` action. No AddKey, owner
   credential export or payment request is made. Extension outcomes are untrusted
   hints; the server never signs or broadcasts.
6. Reconciliation queries that recorded hash with `wait_until: FINAL`, matches
   its signer/key/nonce/receiver/exact action, requires complete successful receipt
   evidence and the factory callback's `true` result, then checks the vault's
   initialized owner, pinned code, absence of keys and initial authority at a
   finalized block. Only then is a unique organization/vault link committed.

The identity database stores `vault_provisioning`, `organization_vaults` and
`vault_provisioning_history`. They survive process/browser restarts. Every API
reauthenticates the wallet and checks organization ownership; IDs alone confer no
access. The vault link is immutable and unique. The existing payment queue and
configured legacy workspace are not repurposed for a newly provisioned organization.

Wallet switching or loss of page focus clears private UI and revokes identity
access. Provisioning's outbox survives that logout. After wallet approval the user
may need a fresh off-chain login, select the organization and click **Resume /
reconcile provisioning**. Its hash was recorded before the approval window opened.

## Cancellation, failure and recovery

- Cancellation, timeout, lost response, unknown RPC or incomplete receipt evidence
  keeps the recorded attempt blocked and unlinked. Reconciliation cannot invent
  a successful outcome. Reopening Meteor may repeat **identical bytes/hash only**,
  after reconciliation; it never silently allocates a fresh nonce or target.
- A conclusively failed creation whose returned refund completed, plus finalized
  target absence, can offer an explicit reviewed retry of the **same vault ID**.
  The previous attempt is archived before another transaction is prepared.
- Callback failure after successful initialization remains blocked/unlinked even
  though the account may exist. There is no administrator claim/override or
  automatic refund/repair for this case. Conclusive repair evidence and a reviewed
  recovery path remain a limitation; owner/key/code checks cannot substitute for
  the required transaction outcome.
- Expired prepared transactions, removed signing keys, unresolved callbacks or
  lost archival transaction evidence may require manual review. The application
  does not erase these outboxes to make retry possible.
- If an unexpected preexisting target exists without this organization's recorded
  attempt, preparation refuses to claim it. Replayed or mismatched evidence fails.

Linked organizations show their provisioning status and finalized evidence. Their
payment dashboard/worker configuration is **not** automatically activated. Payment
controls stay unavailable pending separate review/authority setup; connecting a
wallet or deploying a vault cannot authorize invoice execution.

## Reproducible Linux path and unsigned deployment preparation

`bash scripts/check-provisioning.sh` runs the existing full core regressions, the
factory unit tests, production builds/Clippy and four new sandbox tests. The
`Vault provisioning review` workflow runs protocols 86 and 88 on Ubuntu 24.04,
retains logs/artifacts/hashes, uses read-only repository permissions and contains
no public-network deployment or signing step. Pushing it requires approval.

Written Rust tests cover guarded initialization, owner/parent substitution,
named/implicit creation, concurrent duplicate creation, lost responses, failed
initialization with rollback/refund, callback failure and reinitialization denial.
They are not executed merely because the TypeScript tests pass.

After Linux artifacts pass review, supply the following public/artifact inputs to
`npm run factory:plan` in `apps/owner`:

- `NNETICS_FACTORY_FUNDER_ID`, its existing `NNETICS_FACTORY_FUNDER_PUBLIC_KEY`,
  and a direct child `NNETICS_FACTORY_ID` of at most 21 characters;
- `NNETICS_REVIEWED_FACTORY_WASM` and `NNETICS_REVIEWED_PROVISIONING_VAULT_WASM`,
  with their exact `NNETICS_REVIEWED_FACTORY_SHA256` and
  `NNETICS_REVIEWED_PROVISIONING_VAULT_SHA256` from retained CI artifacts;
- `NNETICS_FINALIZED_STORAGE_BYTE_COST` from a fresh testnet protocol-config read.

The script emits one **unsigned** infrastructure plan: CreateAccount, storage /
reserve funding, and DeployContract in one transaction, with no access keys and
no claimable initializer. Funding is `(factory WASM bytes + 4096) × finalized
storage price + 0.5 NEAR`; gas is additional. The plan pins both hashes and emits
a SHA-256 digest. It provides no execution command. A fresh network/protocol,
FullAccess key, target-absence and balance check must precede approval/execution.
Factory deployment and each customer's 5-NEAR create call are separate approvals.

Application settings are `NNETICS_FACTORY_ID`, `NNETICS_FACTORY_CODE_HASH` and
`NNETICS_PROVISIONING_VAULT_CODE_HASH`. Leave the enable switch blank until the
reviewed factory is deployed and verified. No new account, artifact digest,
funding approval or deployment is inferred from the older consumed setup approval.

## Current execution limits

Local Node tests exercise SQLite restart/concurrency, real Borsh hash checking,
owner/organization isolation, reviewed plan gating, finality, wrong keys/code/owner,
callback failures, refund resolution, exact-byte retries and rejected stale proof.
Browser tests use mocked API/extension responses to test the funding/authority
review and disabled signing; they are not a real deployment pass.

Rust formatting and shell syntax checks passed. Local Windows WASM build attempts
failed while linking host build scripts: the available GNU linker wrapper received
GCC-style arguments and the generic LLD driver rejected them. No new WASM or Rust
factory unit/sandbox execution is claimed. The existing core and added vault
initializer have since passed Linux CI as recorded above. Corrected factory Linux
CI, factory artifact hashes, independent review and specific deployment
transactions remain pending.
See [VALIDATION.md](VALIDATION.md) for final executed counts.
