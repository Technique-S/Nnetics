# Nnetics

An invoice payment desk for small Web3 content teams. An owner approves a vendor and a fixed work order. An agent extracts an invoice, matches it to the work order, and requests payment. A NEAR vault enforces the owner's limits and records the result.

**3 November hosting preparation:** a maintenance-first Render configuration,
private SQLite migration/backup tools and hosted acceptance checklist are prepared
locally in [HOSTED_DEPLOYMENT.md](docs/HOSTED_DEPLOYMENT.md). No hosted service or
push is authorized by that preparation. The existing INV-0002 testnet payment is
confirmed; the vault remains paused, worker authorization revoked, and execution
disabled. Later entries in [VALIDATION.md](docs/VALIDATION.md) supersede historical
status statements below. Hosted rollout and pinned-runtime Linux checks remain open.

## Current status: fresh-user onboarding under review, 31 October 2026

**2 November persistent contractor backend:** the default private contractor
portal now uses organization-authorized HTTP APIs and persistent SQLite storage,
with signed wallet verification, owner approval/review and durable invoice/status
history. A local production-app restart acceptance run passes with controlled
wallet/RPC fixtures; real Meteor contractor acceptance remains unverified.
Extraction is deterministic parsing, with no AI provider. Payment execution stays
gated. See [PERSISTENT_CONTRACTOR_PORTAL.md](docs/PERSISTENT_CONTRACTOR_PORTAL.md).

**2 November contractor mock:** an isolated owner/invitation/contractor workflow
is available at `/demo/contractors`, also linked from the simulated owner dashboard.
It includes text-first billing/uploads/clarification, invoice statuses, revocable
private links and owner-approved simulated wallet requests. It performs no live
wallet proof, deployment or payment. See [CONTRACTOR_PORTAL.md](docs/CONTRACTOR_PORTAL.md)
for the journey, access boundaries and validation. The existing transaction expiry
monitor continues separately; live provisioning remains incomplete.
Contractor and owner-entered invoices now receive durable server-generated
references with idempotent retries. Entry is fixed to **NEAR · Testnet**;
conflicting source currencies require clarification without conversion.

Real Meteor login, empty onboarding, organization persistence and private access
denial in both directions passed with `babygoat.testnet` and `grandtheft.testnet`.
Local self-service provisioning source includes **Create vault**, durable progress,
a guarded factory initializer and a locked factory. These new contracts are **not
deployed yet**. The vault/initializer passed Linux protocol-86/88 checks; factory
CI for `c655800` passes compilation, Clippy, six factory unit tests and four
provisioning sandbox tests **per protocol (86 and 88)**. The receipt-based
correction passed both runtimes. Real provisioning and recovery remain unverified.
The reduced unsigned plan requires 11.3324 testnet NEAR in deposits plus fees;
see [the funding breakdown and transaction plan](docs/FRESH_USER_TESTNET_PLAN.md).
Deployment
signing and new-workspace payment
controls stay disabled. See [VAULT_PROVISIONING.md](docs/VAULT_PROVISIONING.md).
Existing deployed vaults are not upgraded. Older deployment/CI results below are
historical and do not validate this new source. No new push is authorized.

Implemented in source: the Rust native-NEAR vault, account/key authorization, immutable work orders, invoice/order guards, spending reservations, asynchronous settlement and evidence-based reconciliation. Added a bounded historical receipt-proof repair path with a frozen pre-payment trust anchor. SDK unit tests, a local sandbox suite and a Linux CI workflow retain execution logs/proofs. The TypeScript reference policy, synthetic fixtures and MVP specification remain available.

Milestone 1 acceptance is pending the validation gates in [docs/VALIDATION.md](docs/VALIDATION.md). Read [docs/PAYMENT_CORE.md](docs/PAYMENT_CORE.md) for APIs, version decisions, sandbox reproduction and callback repair limits. Passing the TypeScript tests alone does not establish contract security or chain integration.

[Linux verification run 40877809725](https://github.com/Technique-S/Nnetics/actions/runs/40877809725) passed 41 TypeScript, 36 Rust unit and 15 sandbox tests, including real receipt-proof repair and maximum-input/late-failure VM benchmarks. The [bounded author review](docs/M1_REVIEW.md) records measured limits and epoch hardening. Overall acceptance remains open for independent security review. An explicitly approved paused testnet deployment has now finalized; this does not establish security or payment acceptance.

Milestone 3 integration is pushed on `codex/nnetics-live-integration`: a testnet wallet adapter, finalized contract reads, owner actions, structured invoice intake, a durable SQLite queue and a restricted-key payment worker. Demo mode remains explicitly simulated. The [live integration guide](docs/LIVE_INTEGRATION.md) describes setup, restart behavior, transaction approval and remaining gates. It is not accepted as a real testnet workflow.

Linux [contract CI](https://github.com/Technique-S/Nnetics/actions/runs/40949948285) for `30bafa3` passed on protocols 86 and 88 (42 root tests, 36 Rust unit and 15 sandbox tests per runtime); [owner CI](https://github.com/Technique-S/Nnetics/actions/runs/40949948396) passed 26 Node tests, strict TypeScript, the dashboard build and 12 browser executions. The [bounded compatibility comparison](docs/PROTOCOL_88_REVIEW.md) is not independent security approval. The user approved four testnet setup transactions, all FINAL: three subaccounts and pinned vault deployment. CLI signatures verified the selected owner key; browser message login and real payment acceptance remain open. The vault is paused, no agent, zero payout funds. This setup approval is consumed and conveys no payment authorization. AI extraction, legacy migration and production deployment remain absent. See [current setup evidence](docs/BABYGOAT_TESTNET_PLAN.md); [earlier faucet history](docs/NEW_OWNER_ACCOUNT_PLAN.md) is preserved separately.

## Try the local owner dashboard

Verified wallets can create private organizations without a configured vault.
Vault provisioning is implemented and passed Linux contract verification; it
awaits funding, factory deployment/review and explicit transaction approval.
The selected testnet owner is now the user's CLI-created `babygoat.testnet`;
its paused testnet vault is deployed and local configuration active. CLI setup
control and real Meteor message login are verified; live provisioning is pending.
See the [executed setup record](docs/BABYGOAT_TESTNET_PLAN.md).
The [owner acceptance record](docs/OWNER_ONBOARDING_ACCEPTANCE.md) distinguishes
local checks from blocked real-wallet verification and records the wallet/setup
gaps. The live contractor portal remains gated on owner acceptance; its explicitly
simulated adapter is now available for local review.

```sh
cd apps/owner
npm ci
npm run dev
```

Open http://127.0.0.1:3100 for testnet wallet login and empty onboarding; an existing organization or vault is not required to authenticate. Deployed-workspace access comes from current on-chain vault ownership or an explicit viewer grant; connecting a wallet grants neither. See [ORGANIZATION_ACCESS.md](docs/ORGANIZATION_ACCESS.md). Open http://127.0.0.1:3100/?mode=demo for synthetic session-only data. Deployment remains disabled. Browser fixtures do not establish real deployment or payment acceptance. See [VAULT_PROVISIONING.md](docs/VAULT_PROVISIONING.md) before configuring a factory or enabling signing.

## Try the foundation

Install Node.js 24 or later. No external packages are needed for the reference policy. Node runs the erasable TypeScript directly; this is not a TypeScript type check.

```sh
npm test
npm run demo
```

Expected: policy tests pass. The demo marks an approved invoice eligible, a changed recipient for review, and a previously paid work order for review. It performs no transfers.

## Repository map

- `docs/BUILD_BRIEF.md`: product decisions, architecture, milestones and acceptance criteria.
- `src/policy.ts`: pure decision function; no persistence or payment authorization.
- `fixtures/scenario.ts`: three illustrative vendors and a baseline invoice/order.
- `tests/policy.test.ts`: executable rules and boundary cases.
- `src/demo.ts`: three local decision examples.
- `contracts/vault`: Rust contract and SDK unit tests.
- `contracts/sandbox`: real WASM/receipt integration tests using ephemeral local accounts.
- `scripts/check-core.sh`: builds production/fault artifacts and runs all checks on Linux.
- `docs/PAYMENT_CORE.md`: authorization, accounting, API and recovery procedure.
- `docs/VALIDATION.md`: observed results, missing evidence and blockers.
- `docs/HISTORICAL_REPAIR.md`: authoritative evidence, bootstrap trust, permissions and replay protection.
- `scripts/prepare-repair.ts`: offline RPC-proof normalization; no signing or submissions.
- `apps/owner`: Next.js dashboard, separate demo/testnet adapters, durable queue and worker.
- `docs/OWNER_DASHBOARD.md`: local frontend setup, tested behavior and integration boundaries.
- `docs/M1_REVIEW.md`: pinned official verifier comparison and measured VM limits.
- `docs/LIVE_INTEGRATION.md`: wallet, persistence, worker recovery, deployment preparation and live acceptance gates.

## Guarded NEAR core

The Rust vault targets native NEAR on testnet after local sandbox validation and deployment approval. It independently enforces amounts, recipients, authorization, budget, expiry, pause and single-payment work orders. A worker may call only the payment method through a restricted function-call key on its caller account. That key's allowance limits gas spending, not vault payouts. The contract validates its authorized account and signer key and pays from its own deposited balance.

On Linux with Node 24 and rustup, run `bash scripts/check-core.sh`. See the payment core guide for system dependencies. Tests use local Sandbox only; the command does not deploy to testnet or mainnet. Fault artifacts are test fixtures and must never be deployed to a public network.

The starter policy intentionally uses named `.testnet` accounts. The Rust contract uses validated SDK account IDs and bounded inputs.

## Hackathon provenance

New Nnetics foundation and guarded core written on 29 October 2026. No StableSplit code or other pre-existing product code has been imported. AI assistance: OpenAI Codex. Runtimes: Node.js and Rust. Added libraries: NEAR Rust SDK 5.29.1, NEAR Workspaces 0.23.0, NEAR Sandbox 0.3.12, Tokio, anyhow and serde_json; proof tests additionally use near-primitives 0.37.4, ed25519-dalek 2.2.0 and reqwest 0.13.5. Exact dependencies are recorded in Cargo manifests and lockfiles. No contract deployment exists. License selection remains open; add the selected license before publishing.

Official rules checked on 29 October 2026: https://nearhackathon.com/HACKATHON.md

The rules allow code from the 19 October announcement. Development ends 14 November 2026 at 23:59 UTC, which is 15 November at 00:59 in Lagos. Testnet-only entries are eligible; own NEAR contracts are sufficient. Proposed track fit: Autonomous Business, AI Security & Defense, Real-World Money; the human selects submission tracks.

Keep work local until the relevant repository action is authorized. The official instructions require explicit confirmation before pushing, making a repository public, signing transactions, spending tokens, mainnet deployment, and final submission. Submission requires review of the exact payload; the human publishes the demo post and supplies prize/contact information. Read the live rules again before submitting.
