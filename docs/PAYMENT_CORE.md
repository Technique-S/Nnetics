# Milestone 1: guarded NEAR payment core

Implementation date: 29 October 2026. The Rust vault and tests are implementation work; milestone acceptance requires passing the Rust build and sandbox suite. See `docs/VALIDATION.md` for actual results. The TypeScript policy is independent reference material and cannot authorize transfers.

## Dependency and documentation decisions

Checked the official NEAR documentation and published NEAR crate sources before implementation:

- [Access keys](https://docs.near.org/protocol/accounts-contracts/access-keys): a function-call key has one receiver, allowed methods, gas allowance and zero attached deposit. Gas allowance does not limit funds sent by a vault.
- [Execution environment](https://docs.near.org/smart-contracts/anatomy/environment): predecessor, original signer and signer public key differ on indirect calls. Time is nanoseconds, balances are yoctoNEAR.
- [Asynchronous calls](https://docs.near.org/smart-contracts/anatomy/crosscontract): initiating calls, transfers and callbacks execute independently; failures do not roll back the initiating receipt.
- [Storage security](https://docs.near.org/smart-contracts/security/storage): persistent records lock balance; unbounded state growth must be prevented.
- [Integration testing](https://docs.near.org/smart-contracts/testing/integration-test): use a local sandbox to test receipt failures, state and time.
- [SDK releases](https://docs.rs/crate/near-sdk/latest), [SDK 5.29.1 manifest](https://docs.rs/crate/near-sdk/5.29.1/source/Cargo.toml), [workspaces 0.23.0](https://docs.rs/crate/near-workspaces/0.23.0), [sandbox 0.3.12 source](https://docs.rs/crate/near-sandbox/0.3.12/source/src/lib.rs).

Pin `near-sdk = 5.29.1`, Rust `1.93.0`, `near-workspaces = 0.23.0`, and `near-sandbox = 0.3.12`. SDK 5.30.0 is the current release but declares minimum protocol 88 and Rust 1.95. The selected SDK patch declares minimum protocol 84; the pinned sandbox ships nearcore 2.13.0 / protocol 86. This avoids combining a newer SDK protocol requirement with an older stable sandbox. The vault lockfile also pins `near-sdk-env = 0.1.6` and `near-sys = 0.2.14`: the newest transitive patches require Rust 1.95. Preserve these compatibility pins when updating dependencies. Legacy `LookupMap` is deliberate: writes are immediate, so the liquidity check includes newly allocated records. Dependencies and licenses are recorded by Cargo; transitive versions are pinned in both Cargo.lock files.

## Reproduce on Linux

Use Linux x86_64 (the CI target) with Node 24, a Rust compiler/linker toolchain, `pkg-config` and OpenSSL development headers. Ubuntu setup:

```sh
sudo apt-get update
sudo apt-get install -y build-essential pkg-config libssl-dev clang cmake
# Install rustup through the official Rust installation instructions if absent.
rustup show
bash scripts/check-core.sh
```

`rust-toolchain.toml` installs the pinned toolchain, formatter, Clippy and WASM target. Initial Cargo and sandbox runs download dependencies and the local node binary. Tests generate ephemeral local accounts and restricted keys in memory and use only a fresh `near_workspaces::sandbox()` network. They need no wallet, environment secrets, faucet or public RPC. The script has no public-network deployment or transaction commands. Native Windows is unsupported by the sandbox dependency; use WSL2 or a Linux machine. Do not run only `npm test` and infer that the core is validated.

The script builds the production WASM with no fault features, then four distinctly named fault artifacts in separate target directories. It runs SDK unit tests and the sandbox tests sequentially. Each run retains stage logs, a `run.json` report, checksums and available raw sandbox receipt proofs under a fresh `artifacts/runs/` directory. GitHub Actions uploads these even when verification fails. A missing or zero-test Rust result cannot be counted as a pass. No fault artifact is a deployment candidate. Production deployment, account provisioning and any public-network signing require separate human approval.

## Authority and API

Deploy and initialize atomically, signed by the vault account. `new(owner, budget, payment_cap)` requires direct self-call; it starts paused with no agent or funded payment ledger. Use a separate owner account. Initialization is not safely exposed between deployment and initialization.

Owner administration requires direct predecessor **and** signer equality with the owner plus exactly one yoctoNEAR attached, preventing restricted zero-deposit keys from administering the vault. `deposit` takes a positive deposit and credits the payout ledger. `fund_storage` funds storage/operations without crediting payment authority. Neither deposit method grants execution authority. No withdrawals, upgrades through contract methods, stablecoins, partial payments or recurring orders are added.

Authorize a dedicated worker account and one Ed25519 public key. Set that key's protocol permission to receiver = vault, methods = `execute_payment`, finite gas allowance. The vault independently requires predecessor = signer = authorized worker, and signer public key = authorized key. Direct calls using another key on the same worker account fail. Relayers, delegated signing and contract-mediated calls are outside this design. [NEP-366](https://github.com/near/NEPs/blob/master/neps/nep-0366.md) specifies that delegated receipts preserve the relayer as signer, which fails this equality check. The contract cannot inspect the access-key permission type; the owner must install the restriction correctly. Full-access keys on the worker/vault remain trusted administration credentials and must never be given to the agent.

JSON amounts and attempt IDs use decimal strings (`U128` / `U64`). Expiry is an exclusive nanosecond timestamp string. IDs contain 1–64 ASCII letters, digits, hyphens, underscores or colons. Use invoice digests/references, not invoice text. Recipients use SDK `AccountId` validation; recipient existence is established by transfer outcome, not a name suffix check.

| Method | Caller and arguments |
| --- | --- |
| `deposit` / `fund_storage` | Direct owner, attached funds |
| `set_budget` / `set_payment_cap` | Owner + 1 yocto; `budget` / `payment_cap` |
| `set_paused` | Owner + 1 yocto; `paused` |
| `authorize_agent` / `revoke_agent` | Owner + 1 yocto; `account_id`, `public_key` / no arguments |
| `register_vendor` / `disable_vendor` | Owner + 1 yocto; `vendor_id`, `recipient` / `vendor_id` |
| `approve_work_order` | Owner + 1 yocto; `order_id`, `vendor_id`, `amount`, `expires_at_ns` |
| `revoke_work_order` | Owner + 1 yocto; `order_id` |
| `execute_payment` | Authorized worker/key, zero deposit, at least 200 Tgas (use 300); `order_id`, `invoice_id`, `recipient`, `amount` |
| `on_transfer_result` | Private transfer callback; exact `attempt_id` |
| `reconcile_payment` | Anyone, zero deposit; `attempt_id`, no caller-supplied outcome |
| `get_vault` | Read owner/agent, pause, budget/cap, funding/spent/reserved, measured stake, headroom, last attempt |
| `get_order` / `get_vendor` | Read by `order_id` / `vendor_id` |
| `get_payment` / `get_invoice_attempt` | Read by `attempt_id` / `invoice_id` |

Vendor registration is bounded to three distinct IDs; updates affect future orders only. Up to 1,000 permanent order IDs and eight initiated attempts per order bound the storage an authorized worker can consume. Revoked IDs are never recycled. Reaching a bound requires owner intervention/new authority, not silent pruning. These are MVP safety bounds, not archival infrastructure.

## Accounting and asynchronous state

Orders snapshot the owner-approved recipient, vendor, amount and expiry. Execution checks current vendor activity, order enablement/status/expiry, exact recipient/amount, agent/key, pause, cap, cumulative budget and the funded ledger. The worker cannot create an approval or choose transfer destination. Self-payments are forbidden.

The initiation receipt claims the invoice, sets the order pending, allocates a unique attempt and reserves funds before scheduling a native transfer. Every state write reverts if that receipt fails. Invariants: `spent + reserved <= budget`, `spent + reserved <= funded`, no reservation underflow, and a paid order never becomes executable. Pending requests compete atomically for budget and order authority even while callbacks are outstanding.

`funded` tracks owner payment deposits only. Deployment funds, one-yocto administration deposits and storage funding are not payout deposits. Spendability also requires current account balance >= measured storage stake + 0.1 NEAR operational/root-state headroom + reserved funds (including the proposed transfer). This is conservative during overlapping receipts: a request may need additional funding while earlier transfers settle. The headroom is a safety allowance; it is not a claim of exact gas pricing. Storage for records is prepaid on initiation. Normal callback transitions use fixed-size status fields and do not allocate new records.

Transfer callback: `Pending -> TransferSucceeded | TransferFailed`, recording runtime evidence. Finalizer: success makes order/payment paid, moves reserved to spent and retains invoice claim; failure releases reservation and that attempt's invoice claim, records failed and returns the order status to approved. Revocation is a separate permanent enablement flag; failure cannot undo it. Expiry/pause/agent rules are checked again on any subsequent attempt.

Both callbacks bind the exact attempt. Replayed callbacks/finalization return existing status without changing accounting. A separate finalization receipt makes persisted transfer evidence usable if finalization runs out of gas/storage. Pause and revocation never prevent settling an already initiated transfer.

## Reconciliation and repair procedure

1. Persist the submitted transaction hash, invoice reference and order ID in the future worker before considering a retry. A missing RPC response is an unknown outcome. Do not submit a fresh payment.
2. Query order, invoice marker and payment attempt from finalized chain state; inspect the original transaction's complete receipt tree. Top-level success alone does not prove transfer success. Poll pending outcomes; absence in one RPC response does not prove non-execution.
3. `Paid` / `Failed` are terminal attempt records. A new attempt is eligible only after confirmed failure, with all current contract rules still satisfied.
4. For `TransferSucceeded` / `TransferFailed`, anyone may call `reconcile_payment`. The method uses stored evidence only and is idempotent. If finalization failed for storage, the owner may top up via `fund_storage` before retrying; a gas failure can be retried with sufficient gas. Code defects require a reviewed, separately authorized repair deployment.
5. `Pending` with a failed result-recording callback is unresolved, even if expired. Ordinary reconciliation leaves funds, invoice and order locked. For new attempts with a pre-payment frozen checkpoint, the additive `repair_payment` path verifies finalized initiation/transfer receipt proofs and commits accounting atomically. [HISTORICAL_REPAIR.md](HISTORICAL_REPAIR.md) defines its evidence, trust anchor, invocation and replay rules. Unsupported or inconclusive evidence, legacy attempts without markers, and vaults without a pre-payment checkpoint stay locked. No owner assertion, timeout or RPC claim releases them. This repair implementation still requires the full Linux runtime/proof validation before enabling an unattended worker.

The fault suite deliberately exhausts callback gas or writes a 1 MB state record into an account with less than 10 NEAR to trigger real protocol storage-stake failure. Tests require the expected protocol failure, the exact successful recipient balance delta, and preserved pending guards. Restoring the production code in the local sandbox demonstrates that durable outcomes can finalize while missing outcomes stay locked. Unit tests additionally cover stale callback replay, in-flight revocation and the exact expiry boundary.

## Remaining milestone gates

Passing builds, unit tests and sandbox tests on the compatible runtime; reviewing dependency lockfiles; verifying actual gas/storage headroom under the compiled artifact; reviewing the historical-proof bootstrap/finality/encoding assumptions; and independently reviewing the contract. A future worker/reconciliation service, UI and testnet demonstration remain later milestones. No external transaction evidence exists yet. This is not an audited production vault.
