# PayScope

An invoice payment desk for small Web3 content teams. An owner approves a vendor and a fixed work order. An agent extracts an invoice, matches it to the work order, and requests payment. A NEAR vault enforces the owner's limits and records the result.

## Current status: guarded core implementation, 29 October 2026

Implemented in source: the Rust native-NEAR vault, account/key authorization, immutable work orders, invoice/order guards, spending reservations, asynchronous settlement and evidence-based reconciliation. Added a bounded historical receipt-proof repair path with a frozen pre-payment trust anchor. SDK unit tests, a local sandbox suite and a Linux CI workflow retain execution logs/proofs. The TypeScript reference policy, synthetic fixtures and MVP specification remain available.

Milestone 1 acceptance is pending the validation gates in [docs/VALIDATION.md](docs/VALIDATION.md). Read [docs/PAYMENT_CORE.md](docs/PAYMENT_CORE.md) for APIs, version decisions, sandbox reproduction and callback repair limits. Passing the TypeScript tests alone does not establish contract security or chain integration.

Not implemented: web application, AI extraction, database, wallet connection, worker, legacy-attempt state migration or a public-network deployment. Historical proof repair is not runtime-verified; its bootstrap assumptions and limits are in [docs/HISTORICAL_REPAIR.md](docs/HISTORICAL_REPAIR.md). No user funds or public-network transactions have been used.

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

## Guarded NEAR core

The Rust vault targets native NEAR on testnet after local sandbox validation and deployment approval. It independently enforces amounts, recipients, authorization, budget, expiry, pause and single-payment work orders. A worker may call only the payment method through a restricted function-call key on its caller account. That key's allowance limits gas spending, not vault payouts. The contract validates its authorized account and signer key and pays from its own deposited balance.

On Linux with Node 24 and rustup, run `bash scripts/check-core.sh`. See the payment core guide for system dependencies. Tests use local Sandbox only; the command does not deploy to testnet or mainnet. Fault artifacts are test fixtures and must never be deployed to a public network.

The starter policy intentionally uses named `.testnet` accounts. Contract implementation will use validated SDK account IDs and bounded inputs.

## Hackathon provenance

New PayScope foundation and guarded core written on 29 October 2026. No StableSplit code or other pre-existing product code has been imported. AI assistance: OpenAI Codex. Runtimes: Node.js and Rust. Added libraries: NEAR Rust SDK 5.29.1, NEAR Workspaces 0.23.0, NEAR Sandbox 0.3.12, Tokio, anyhow and serde_json; proof tests additionally use near-primitives 0.37.4, ed25519-dalek 2.2.0 and reqwest 0.13.5. Exact dependencies are recorded in Cargo manifests and lockfiles. No contract deployment exists. License selection remains open; add the selected license before publishing.

Official rules checked on 29 October 2026: https://nearhackathon.com/HACKATHON.md

The rules allow code from the 19 October announcement. Development ends 14 November 2026 at 23:59 UTC, which is 15 November at 00:59 in Lagos. Testnet-only entries are eligible; own NEAR contracts are sufficient. Proposed track fit: Autonomous Business, AI Security & Defense, Real-World Money; the human selects submission tracks.

Keep work local until the relevant repository action is authorized. The official instructions require explicit confirmation before pushing, making a repository public, signing transactions, spending tokens, mainnet deployment, and final submission. Submission requires review of the exact payload; the human publishes the demo post and supplies prize/contact information. Read the live rules again before submitting.
