# Milestone 3: testnet integration — acceptance pending

The current request changes the sequence in the original build brief: prove the
manually entered invoice workflow before implementing AI extraction. No public
transaction has been signed, no vault deployed, and no testnet acceptance claimed.
The Rust production contract and its interface are unchanged in this milestone.

## Current blockers

- Read-only testnet status reported protocol **88** on 29 October 2026. Linux CI
  now passes nearcore **2.13.0 / protocol 86** and **2.14.0-rc.5 / protocol 88**.
  [The bounded source/runtime comparison](PROTOCOL_88_REVIEW.md) supports an explicit
  86/88 allowlist. Unknown versions fail closed. This resolves the runtime-test gap,
  but does not resolve the independent review or transaction authorization gates.
- Independent historical-verifier review remains incomplete. Bootstrap trust,
  ordered validator commitments, weak subjectivity, timely synchronization and
  upgrade-key custody remain assumptions in [M1_REVIEW.md](M1_REVIEW.md).
- A fresh vault needs an independently reviewed, finalized pre-payment checkpoint
  before the worker can start. The app does not invent a checkpoint or accept an
  owner assertion about an unknown transfer. An operator must prepare/review the
  exact `initialize_repair_checkpoint` payload separately; a bootstrap UI is absent.
- The supplied 64-hex testnet implicit owner is not activated: finalized read-only
  RPC returned `UNKNOWN_ACCOUNT`. It must receive testnet NEAR before use. A mainnet
  `.near` account cannot substitute. The current setup template also needs a named
  setup account to create direct subaccounts; it cannot create children under a
  64-character implicit address. A sponsor/provisioning plan remains unresolved.
  No accounts were provisioned. Generated role keys remain unused outside Git.
- Each public transaction needs specific human authorization. Environment switches
  are enforcement mechanisms, not evidence that authorization has been given.

The official [testnet release notes](https://github.com/near/nearcore/releases/tag/2.14.0-rc.5)
and [protocol-88 transition notes](https://github.com/near/nearcore/releases/tag/2.14.0-rc.4)
were inputs to the bounded compatibility comparison; they are not independent approval.

## Run without sending transactions

Use Node 24. From `apps/owner`:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

`http://127.0.0.1:3100/` is testnet mode. It never silently substitutes synthetic
balances when configuration, authentication or RPC reads fail. Use
`http://127.0.0.1:3100/?mode=demo` for the explicitly labeled, session-only mock.
Both modes retain the disabled deployment control.

Set the testnet owner, separate vault/worker account IDs, worker public key and
expected deployed code hash in `.env.local`. Do not enable transaction switches.
The default RPC is FASTNEAR testnet. The older rpc.testnet.near.org endpoint returned
a deprecation/429 error during preflight, so it is no longer the default.

The server uses SQLite on a persistent local filesystem. `NNETICS_DATABASE` defaults
to `artifacts/live/invoices.db` relative to the repository root. The API and worker
must use the same absolute database path. WAL, FULL synchronous writes, a permanent
invoice primary key and a unique claimed-order index preserve claims across process
restarts. This is a single-owner, single-host implementation; do not place the DB
on an ephemeral serverless filesystem or a filesystem with unreliable SQLite locks.
Back it up together with its WAL using a SQLite-aware backup. Losing the DB cannot
remove the contract's pending/paid order guard, but loses local invoice provenance,
signed outboxes and transaction links. Restore before enabling the worker again.

## Wallet, reads and owner authority

The Nightly injected-wallet module uses official Wallet Selector **10.1.4**. The server signer
uses **near-api-js 7.4.0**. Versions and transitive dependencies are locked. Selector
is still supported; its upstream now recommends exploring HOT Connect. This build
uses a direct-account wallet path because the frozen contract
requires the direct signer/predecessor, rather than a relayed account abstraction.
Additional wallets/relayers are not claimed compatible.

MyNearWallet was initially selected but its official [sunset notice](https://www.mynearwallet.com/sunset)
schedules deprecation on 31 October 2026 and reduced functionality in October–December.
That notice concerns the wallet service, not retirement of NEAR testnet. The
[network status page](https://status.near.org/) reports testnet operational; no
official November testnet closure was found. Neither is a future uptime guarantee.
The MyNearWallet connector has been removed. Meteor was assessed but its current
SDK introduced high-severity dependency advisories and was also removed. Nightly
avoids those additional advisories; actual extension/network signing is still untested.

Owner IDs can be named `.testnet` accounts or 64-hex Ed25519 implicit accounts.
The latter are account addresses, not the `ed25519:` public-key encoding. The user's
supplied implicit address returned `UNKNOWN_ACCOUNT` on testnet during the read-only
check; it needs activation with testnet funds before wallet ownership can be verified.
No funding request was sent. The current provisioning template creates direct named
subaccounts and therefore requires a named setup account; it cannot create children
under a 64-character implicit ID. Provisioning for an implicit owner needs a separately
reviewed named sponsor/account-creation plan. Do not replace it with mainnet signing.

The owner signs a NEP-413 challenge to access the private invoice queue. The server
checks its exact origin/vault/owner/message/nonce, five-minute expiry,
signature and finalized on-chain FullAccess key ownership. Nonces are consumed
once; a hashed, HttpOnly, SameSite=Strict session expires after 15 minutes. Sessions
are not continuously invalidated when a wallet key is removed. Owner transactions
still require the wallet and contract authorization. Mutation endpoints enforce
same-origin JSON and a streamed 20,000-byte input limit. Source invoice text is
rendered literally, never executed or sent to a model.

Reads verify `chain_id=testnet`, deployed code hash and owner. Every contract call
in one snapshot is pinned to the same finalized block, with exact chain timestamp
strings. This trusts the configured RPC provider; the dashboard is not a second
independent consensus verifier. It reads vendors/orders by known IDs because the
frozen contract has no enumeration API. Commands save discovery hints before wallet
redirects; the UI can import pre-existing references. Hints never grant authority.
Payment attempts are read from the bounded sequential attempt space (at most 8,000).
Large histories are not yet optimized with a durable chain index/cache.

Owner UI actions preserve existing method names and argument shapes: vendor and
immutable order management, pause/revoke, worker account/key authorization,
`deposit`, `fund_storage`, budget/cap changes and permissionless `reconcile_payment`.
Admin calls attach exactly one yoctoNEAR; funding uses the entered exact amount;
reconciliation attaches zero. Worker calls attach zero and 250 Tgas. Wallet return
status is not treated as finalized contract success. Funding storage never inflates
the payment ledger. A restricted worker key must target only `execute_payment`,
with a finite nonzero gas allowance, and match the exact contract-authorized key.

## Invoice queue and worker recovery

1. Owner enters a structured invoice. Strict field validation rejects malformed
   values/extra properties. Valid recipient, amount, asset, vendor or order mismatches
   enter review. There is no AI parser yet.
2. Eligible entries become durable queued jobs. Review acknowledgement cannot
   override a failed rule. An unsubmitted review item can be queued only after a
   fresh finalized check passes. Duplicate invoice IDs are permanent; claimed orders
   are unique. Confirmed failed jobs also keep their local claim in this first
   version; there is no automatic fresh retry or unlock UI.
3. A single worker holds a separate SQLite process-lifetime OS lock. A crash releases
   the lock; no timeout lease can create two active signers. It reconciles existing
   preparing/submitted/pending jobs before signing new work, and serializes unresolved
   submissions to avoid nonce races.
4. Payment arguments come from the approved finalized order, never from invoice
   payment instructions. The contract independently rechecks its own rules.
5. Before signing, the job becomes `preparing`. Signed bytes and their transaction
   hash are durably committed before broadcast. A crash before durable bytes exist
   leaves a blocked claim requiring investigation. After persistence, recovery can
   only query/rebroadcast those identical bytes. It never changes nonce/amount/order
   to retry an unknown outcome, even if the block hash expires or RPC forgets it.
6. Only finalized on-chain `Paid`/`Failed` records determine payment outcomes.
   Transaction success alone does not prove an asynchronous transfer succeeded.
   Transaction links additionally require a finalized transaction from the configured
   worker/key to the vault, and exactly one successful initiating receipt whose
   `NNETICS_TRANSFER_V1` marker commits to that exact attempt/order/invoice/recipient/
   amount/time. A regression uses an actual marker from Linux run 40901797197.
7. Recorded `TransferSucceeded`/`TransferFailed` can be reconciled by the owner wallet.
   Unknown transfer outcomes remain reserved pending conclusive historical proof.
   There is no boolean override, timeout release or payment retry on a missing result.

After the review and transaction-authorization gates are satisfied:

```sh
npm run worker -- --once
# or npm run worker for the continuous process
```

The CLI refuses protocols outside the tested 86/88 allowlist and missing pre-payment recovery checkpoints
before it modifies queue state. It reads only the restricted worker secret from a
protected local file. The API/browser has no worker secret or payment signing API.

## Deployment preparation and approval boundary

`npm run testnet:keys` generates separate vault/worker/vendor Ed25519 keys outside
the source repository. It creates user-only directory permissions (Windows ACL or
POSIX 0700/0600) and prints public keys/paths only. It never replaces existing keys.
Keep those files local and backed up; owner keys remain in the wallet.

`npm run testnet:plan` creates an unsigned, deterministic transaction plan and
SHA-256 approval digest. It requires actual public account/key configuration and
the exact Linux-tested production WASM from run **40901797197**:

- Source `7d194e49c53c80884097a49ac113a1a509c4d654`, 420,841 bytes.
- SHA-256 `1dd4f6971b13303661b29c6757a353c873368848490bdce2cd86a9cc360459f8`.
- NEAR code hash `31TAoYHRkExf3bokVz7MFQCyNfncBZ4ca8bpWzJmE1u9`.

The Windows-built artifact has a different checksum and is not substituted for this
Linux-tested artifact. The script rejects any other binary, including fault builds.

The current unsigned template proposes direct owner subaccounts: vault with **6**
testnet NEAR, worker with **1**, vendor with **0.1**, then atomic self-signed
deploy+initialize on the vault. Owner/worker/vault are distinct. The worker key
targets only the vault payment method with **0.25 NEAR** gas allowance. Initialization
uses a **0.1 NEAR** cumulative budget and **0.01 NEAR** payment cap. These are proposed
test values, not authorization. Gas is additional; storage funds are not spendable
payout-ledger funds. Final names/public keys and balances must be checked before
asking the human to approve the complete digest-bound plan.

`npm run testnet:execute -- <step-name>` signs/broadcasts only one reviewed step,
requires the exact approved digest and proper local signer, and refuses non-testnet
or unreviewed protocols. Owner setup needs a user-controlled signing environment;
do not paste an owner key into chat or give it to the API/worker. Setup outboxes use
exclusive files and fsync before network broadcast. If an outbox already exists,
the command refuses a new signature; inspect its recorded hash first. There is no
automatic fresh setup retry or bootstrap transaction.

After compatibility/recovery review, propose exact follow-up wallet actions and
their deposits separately: storage funding, payout funding, vendor registration,
order approval, trusted checkpoint initialization, worker authorization, unpause,
one small invoice payment and any reconciliation. No broad signing permission is
inferred from permission to edit/push code.

## Executed evidence and remaining acceptance

[Contract Linux CI](https://github.com/Technique-S/Nnetics/actions/runs/40947353192)
on integration commit `80d253d` passed 41 root TypeScript, 36 Rust unit and 15 sandbox
tests per runtime on protocols 86 and 88, plus five WASM builds, Clippy and formatting.
[Owner Linux CI](https://github.com/Technique-S/Nnetics/actions/runs/40947353242)
passed 26 Node application tests, strict TypeScript (including scripts), a production
build and 12 Chromium desktop/mobile browser executions. Browser live-mode tests
use controlled HTTP fixtures; worker tests use SQLite plus a controlled transport.
Neither proves deployment, wallet compatibility with a real owner or real payment.

Initial browser execution found a demo title mismatch caused by client changes
being overwritten by Next metadata, and an overly exact error-text locator.
A stable neutral page title and a named error region fixed these; the subsequent
12-scenario run exited successfully. Follow-up local checks cover explicit rejection
of protocol 89 and future Spice header commitments; see the validation record for
the exact source and execution boundary.

The dependency audit reports **10 low-severity transitive advisories** through
Wallet Selector's elliptic/secp256k1 dependencies (GHSA-848j-6mx2-7j84). This app accepts
Ed25519 owner/worker credentials; that does not erase the dependency finding. An
unsupported forced downgrade was not applied. Dependency review remains open.

Acceptance remains **incomplete** until a real testnet owner approves an order,
submits its structured invoice and sees exactly one confirmed native transfer with
a verified transaction link; duplicate/mismatch/restart scenarios must then be
observed on that same deployment. Record recipient balance deltas, attempts,
transaction hashes, queue states and restart evidence. Only after this gate passes
should schema-validated AI extraction and adversarial extraction tests be added.
