# PayScope: build brief and milestone 1

Status: implementation baseline, 29 October 2026. Product decisions below are lead-developer defaults within the agreed MVP.

Milestone 1 implementation update: Rust vault and local sandbox test sources are now under `contracts/`. The finalized API, dependency choices and repair procedure are in `docs/PAYMENT_CORE.md`; actual execution evidence and remaining gates are in `docs/VALIDATION.md`. This specification's milestones are acceptance criteria, not claims that the sandbox tests have passed.

Historical repair continuation: `docs/HISTORICAL_REPAIR.md` specifies a frozen pre-payment trusted checkpoint, verified validator finality and exact native receipt proofs. It adds no owner outcome override or timeout release. This repair path and all Rust runtime acceptance tests remain unverified until the supported Linux run; the existing payout rules and serialized state layouts are preserved.

## Problem and first user

A small Web3 content team pays a writer, designer and video editor. Its owner repeatedly checks invoice amounts, approved work, recipients and previous payments. PayScope lets the owner approve those facts once, then delegates eligible invoice payments within that authority.

Product promise: every payment is tied to one owner-approved work order and an inspectable decision/receipt.

## First complete user journey

1. Owner connects a NEAR testnet wallet and creates a vault.
2. Owner registers three vendors and approves fixed, single-payment work orders, including recipient, amount and expiry.
3. Owner deposits testnet NEAR, sets a cumulative spending budget and payment cap, and authorizes the worker identity.
4. User pastes invoice text. The application saves it as untrusted input.
5. The extractor returns structured fields with source evidence. Matching resolves exactly one approved work order. Missing fields or ambiguous matches enter review.
6. Deterministic policy checks compare the proposal with the current approved state. The owner can inspect the result before enabling execution.
7. Once enabled, the worker submits eligible invoices within existing authority. The contract rechecks all payment rules, reserves funds and starts the transfer.
8. The application shows pending, confirmed success or confirmed failure, with a transaction link. Pause and revocation stop future payment initiation.

Owner approval of a work order represents acceptance of that work for payment. PayScope does not verify whether a writer actually completed an article. An invoice cannot create approval.

## MVP boundary

One owner, one vault, three vendors, native NEAR on testnet, one exact payment per work order, pasted invoice text, owner dashboard, review queue, pause/revoke controls and payment history.

Deferred: stablecoins, cross-chain routing/Intents, fiat conversion, partial payments, recurring billing, email ingestion, PDFs/OCR, multi-owner approvals, disputes, multi-tenant production hosting and live funds. Stablecoins are a later product requirement for practical invoice pricing; native testnet NEAR keeps the first payment path small and verifiable. No USD equivalence is implied by demo amounts.

## Demo fixture

All names/accounts are synthetic examples and require provisioning before any chain demo.

| Vendor | Example account | Fixed work | Illustrative amount |
| --- | --- | --- | --- |
| Writer | writer-demo.testnet | One approved article | 2 testnet NEAR |
| Designer | designer-demo.testnet | One approved graphic | 1 testnet NEAR |
| Video editor | editor-demo.testnet | One approved edit | 3 testnet NEAR |

Example vault: 10 testnet NEAR spendable balance, 6 NEAR cumulative budget, 3 NEAR per-payment cap. Storage and operational reserves are additional and must be calculated during contract implementation.

Demo proves: valid writer invoice pays once; the same work with a new invoice ID cannot pay again; changed recipient and excess amount enter review; a paused vault rejects new requests. Failed transfer handling is demonstrated in integration tests.

## Authority and policy

- Owner creates/revokes orders, changes budget/cap, manages vendors, authorizes/revokes the agent and pauses the vault. The agent cannot invoke owner methods.
- Approved orders are immutable. To change an unused order, revoke it and create a new ID. Order IDs are never recycled. Vendor recipient updates do not rewrite approved orders.
- Each order stores the exact account and amount in yoctoNEAR decimal strings. No floating point arithmetic or inferred currency conversion.
- A positive amount must exactly match the order and be within the cap, remaining cumulative budget and spendable vault balance. The initial budget is cumulative, with no automatic daily reset.
- Expiry uses chain time; at `now >= expiresAt`, execution is forbidden.
- Vendor must be active; order approved; agent authorized; vault unpaused.
- Worker cannot pick a different recipient from invoice instructions. Payment arguments are derived from the approved order; extracted recipient fields serve only as cross-checks. Missing/conflicting fields enter review.
- Every single-payment order has a durable pending/paid guard. Invoice IDs provide an additional duplicate check; the order ID is the authoritative guard against reworded invoices or new invoice IDs.
- Review never overrides a failed contract rule. The owner must change the relevant authority explicitly or correct the invoice with an audit trail.
- AI reads invoice text as data, returns schema-validated proposals, has no payment signing key and cannot change approved records. Prompts such as “ignore previous rules” remain invoice text.

## Planned architecture

Frontend: Next.js + TypeScript + Tailwind. Owner screens: vault overview, vendors, work orders, invoice intake/review and history. A NEAR-compatible wallet integration will be selected against current official documentation.

Backend: Node/TypeScript API and single worker process with SQLite on a persistent filesystem for the first runnable demo. Zod validates extraction and API input. Separate domain policy, chain adapter, extractor adapter and persistence code. Pin dependency versions and lockfile when adding the framework. Hosting must support the worker and persistent SQLite; do not place SQLite in an ephemeral serverless filesystem. A static demo can display clearly labelled fixtures but is not a live payment service.

Contract: Rust with NEAR SDK/cargo-near, unit tests plus a sandbox integration suite. Verify current SDK APIs, account/key semantics, storage costs and asynchronous transfer behavior in official NEAR documentation before implementation.

AI: provider adapter; NEAR AI Cloud is the first candidate to assess for availability, model capability and costs. No private-compute or TEE claim until implemented and verified. No provider is required for the guarded payment core.

Secrets: environment variables or runtime secret storage. No secrets, wallet recovery phrases, real invoice data or private keys in fixtures or the repository. Generate worker credentials only when the integration is ready.

## Data model

On chain: owner, agent authorization, paused flag, payment cap, total budget, cumulative spent and reserved amounts, vendor statuses, immutable orders, invoice markers, execution attempts and transfer status.

Off chain: original invoice text, extracted proposal/schema version, extraction evidence, match result, policy reasons, chain submission reference, reconciliation cursor and audit events. Off-chain state is a cache/workflow record; it cannot authorize a payment forbidden on chain. Invoice text remains off chain; use an invoice digest/reference for on-chain auditability where appropriate.

Contract method sketch, to finalize during implementation:

| Method | Caller | Effect |
| --- | --- | --- |
| deposit | Owner | Add vault funds |
| set_budget / set_payment_cap | Owner | Set authority without reducing budget below spent + reserved |
| register_vendor / disable_vendor | Owner | Manage approved vendors |
| approve_work_order / revoke_work_order | Owner | Manage one-time payment authority |
| authorize_agent / revoke_agent | Owner | Manage worker identity |
| set_paused | Owner | Gate new execution |
| execute_payment | Authorized agent | Recheck policy, reserve amount, initiate transfer |
| on_transfer_result | Private callback | Commit success or release confirmed failed reservation |
| get_vault / get_order / get_payment | Public read | Expose authoritative state |

Use a dedicated worker caller account with a restricted function-call key targeting the vault's execution method. The function-call key covers gas from its caller account and attaches zero deposit. The vault transfers previously deposited funds. Decide and test whether authorization binds the caller account alone or the signer public key too before contract implementation; reject delegated/indirect paths outside that design.

## Execution state and recovery

Order states: approved → pending → paid. An owner can revoke an approved order. A confirmed failed transfer may return pending → approved for a new attempt if the order is still enabled and unexpired. Store each attempt separately and bind callbacks to the exact attempt.

Before transfer creation, the same contract execution must check authorization/policy, mark the order pending, claim the invoice ID and reserve budget/balance. Success converts reservation to spent and records paid. Confirmed failure releases the reservation and the claim associated with that attempt. A private callback must be idempotent and cannot finalize a different attempt.

Unknown RPC outcome is pending until chain reconciliation proves otherwise. Never retry an unknown result as a fresh payment. A callback failure must leave the order blocked pending repair; do not release funds on timeout alone. Sandbox tests must cover callback gas/storage failures and define the repair/reconciliation procedure before enabling the worker.

Pause and revocation cannot cancel a transfer already initiated. The UI must show in-flight payments when the owner uses these controls.

## Build sequence and completion criteria

### Milestone 0: foundation (this delivery)

Build brief, runnable reference policy, synthetic fixtures, adversarial tests and a local demo. No credentials needed. Existing tests cover amount/recipient/order mismatches, caps, duplicate/pending guards, expiry, pause, authorization and malformed inputs.

### Milestone 1: guarded payment core

Implement the vault and sandbox tests first. Completion: approve and fund a sample order, initiate one payment, verify the exact recipient balance delta and paid receipt; duplicate calls and concurrent requests cannot pay twice; revoked/paused/expired requests fail; confirmed failure restores reservations; unknown outcomes do not trigger new transfers. State invariants: spent + reserved <= budget, reservations cannot underflow and paid orders cannot re-enter execution. A local TypeScript policy pass is not sufficient evidence.

### Milestone 2: owner application

Wallet connection, vendor/order creation, funding/authorization flows, invoice intake, review reasons and history backed by durable state. Completion: the owner can operate the guarded core through the UI, with loading/error/pending states and refresh reconciliation.

### Milestone 3: bounded invoice agent

Schema-validated extraction, evidence and exact order matching behind a provider adapter. Completion: representative clean invoices produce the expected proposal; missing fields, ambiguity, changed bank/wallet instructions, fabricated work order references and prompt injection all enter review. No model output can alter recipient or spending authority.

### Milestone 4: testnet demo and submission preparation

Deploy after transaction authorization, run the full three-vendor journey, record testnet transaction evidence and a demo video, finish README/setup/license and re-read event rules. Publish repository and submit only after the required specific confirmations. Keep a reproducible local path if hosted infrastructure is unavailable.

## Next partner handoff

No action or credentials are required from Lou for this foundation. Before external repository work, identify the GitHub repository and obtain authorization for the intended push/publication. Before testnet deployment, provision owner/vendor accounts and obtain transaction authorization. Keep recovery phrases and owner keys in the wallet; the build does not need them pasted into chat. Decide the license before repository publication. Submission identities, prize account, tracks and exact payload are collected near submission.
