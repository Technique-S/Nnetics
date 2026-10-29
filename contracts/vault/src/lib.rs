#[cfg(all(target_arch = "wasm32", not(near)))]
compile_error!("WASM contracts require --cfg near; build from this repository with .cargo/config.toml or cargo-near.");

use near_sdk::collections::LookupMap;
use near_sdk::json_types::{U128, U64};
use near_sdk::{
    assert_one_yocto, env, near, require, AccountId, BorshStorageKey, Gas, NearToken,
    PanicOnDefault, Promise, PromiseError, PublicKey,
};

pub mod repair;

// In addition to measured storage stake: root state growth, receipts and operating headroom.
const OPERATING_RESERVE: u128 = 100_000_000_000_000_000_000_000; // 0.1 NEAR
const MAX_ORDERS: u64 = 1_000;
const MAX_ATTEMPTS: u8 = 8;

#[derive(BorshStorageKey)]
#[near(serializers = [borsh])]
enum StorageKey {
    Vendors,
    Orders,
    Invoices,
    Attempts,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum OrderStatus {
    Approved,
    Pending,
    Paid,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum PaymentStatus {
    Pending,
    TransferSucceeded,
    TransferFailed,
    Paid,
    Failed,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Vendor {
    pub recipient: AccountId,
    pub active: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Agent {
    pub account_id: AccountId,
    pub public_key: PublicKey,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct WorkOrder {
    pub vendor_id: String,
    pub recipient: AccountId,
    pub amount: U128,
    pub expires_at_ns: U64,
    pub enabled: bool,
    pub status: OrderStatus,
    pub current_attempt: U64,
    pub attempts: u8,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Payment {
    pub order_id: String,
    pub invoice_id: String,
    pub recipient: AccountId,
    pub amount: U128,
    pub initiated_at_ns: U64,
    pub status: PaymentStatus,
}

#[near(serializers = [json])]
pub struct VaultView {
    pub owner: AccountId,
    pub agent: Option<Agent>,
    pub paused: bool,
    pub budget: U128,
    pub payment_cap: U128,
    pub funded: U128,
    pub spent: U128,
    pub reserved: U128,
    pub uncommitted_funds: U128,
    pub storage_stake: U128,
    pub operating_reserve: U128,
    pub last_attempt: U64,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Vault {
    owner: AccountId,
    agent: Option<Agent>,
    paused: bool,
    budget: u128,
    payment_cap: u128,
    funded: u128,
    spent: u128,
    reserved: u128,
    vendor_count: u8,
    order_count: u64,
    last_attempt: u64,
    vendors: LookupMap<String, Vendor>,
    orders: LookupMap<String, WorkOrder>,
    invoices: LookupMap<String, U64>,
    payments: LookupMap<u64, Payment>,
}

#[near]
impl Vault {
    // Deploy and initialize atomically from the vault account, then use the separate owner.
    #[init]
    pub fn new(owner: AccountId, budget: U128, payment_cap: U128) -> Self {
        require!(
            env::predecessor_account_id() == env::current_account_id(),
            "INIT_SELF_ONLY"
        );
        require!(
            env::signer_account_id() == env::current_account_id(),
            "INIT_DIRECT_ONLY"
        );
        require!(
            owner != env::current_account_id(),
            "SEPARATE_OWNER_REQUIRED"
        );
        require!(payment_cap.0 > 0, "INVALID_CAP");
        Self {
            owner,
            agent: None,
            paused: true,
            budget: budget.0,
            payment_cap: payment_cap.0,
            funded: 0,
            spent: 0,
            reserved: 0,
            vendor_count: 0,
            order_count: 0,
            last_attempt: 0,
            vendors: LookupMap::new(StorageKey::Vendors),
            orders: LookupMap::new(StorageKey::Orders),
            invoices: LookupMap::new(StorageKey::Invoices),
            payments: LookupMap::new(StorageKey::Attempts),
        }
    }

    #[payable]
    pub fn deposit(&mut self) {
        self.assert_owner();
        let amount = env::attached_deposit().as_yoctonear();
        require!(amount > 0, "EMPTY_DEPOSIT");
        self.funded = self.funded.checked_add(amount).expect("FUNDING_OVERFLOW");
    }

    // Storage/operating funds are deliberately excluded from the payout ledger.
    #[payable]
    pub fn fund_storage(&mut self) {
        self.assert_owner();
    }

    #[payable]
    pub fn set_budget(&mut self, budget: U128) {
        self.owner_action();
        require!(budget.0 >= self.committed(), "BUDGET_COMMITTED");
        self.budget = budget.0;
    }

    #[payable]
    pub fn set_payment_cap(&mut self, payment_cap: U128) {
        self.owner_action();
        require!(payment_cap.0 > 0, "INVALID_CAP");
        self.payment_cap = payment_cap.0;
    }

    #[payable]
    pub fn set_paused(&mut self, paused: bool) {
        self.owner_action();
        self.paused = paused;
    }

    #[payable]
    pub fn authorize_agent(&mut self, account_id: AccountId, public_key: PublicKey) {
        self.owner_action();
        require!(
            account_id != self.owner && account_id != env::current_account_id(),
            "SEPARATE_WORKER_REQUIRED"
        );
        require!(public_key.as_bytes().len() == 33, "ED25519_KEY_REQUIRED");
        self.agent = Some(Agent {
            account_id,
            public_key,
        });
        self.assert_storage_funded();
    }

    #[payable]
    pub fn revoke_agent(&mut self) {
        self.owner_action();
        self.agent = None;
    }

    #[payable]
    pub fn register_vendor(&mut self, vendor_id: String, recipient: AccountId) {
        self.owner_action();
        bounded_id(&vendor_id);
        require!(
            recipient != env::current_account_id(),
            "SELF_PAYMENT_FORBIDDEN"
        );
        if self.vendors.get(&vendor_id).is_none() {
            require!(self.vendor_count < 3, "VENDOR_LIMIT");
            self.vendor_count += 1;
        }
        self.vendors.insert(
            &vendor_id,
            &Vendor {
                recipient,
                active: true,
            },
        );
        self.assert_storage_funded();
    }

    #[payable]
    pub fn disable_vendor(&mut self, vendor_id: String) {
        self.owner_action();
        let mut vendor = self.vendors.get(&vendor_id).expect("VENDOR_MISSING");
        vendor.active = false;
        self.vendors.insert(&vendor_id, &vendor);
    }

    #[payable]
    pub fn approve_work_order(
        &mut self,
        order_id: String,
        vendor_id: String,
        amount: U128,
        expires_at_ns: U64,
    ) {
        self.owner_action();
        bounded_id(&order_id);
        bounded_id(&vendor_id);
        require!(self.orders.get(&order_id).is_none(), "ORDER_ID_USED");
        require!(self.order_count < MAX_ORDERS, "ORDER_LIMIT");
        let vendor = self.vendors.get(&vendor_id).expect("VENDOR_MISSING");
        require!(vendor.active, "VENDOR_INACTIVE");
        require!(amount.0 > 0, "INVALID_AMOUNT");
        require!(expires_at_ns.0 > env::block_timestamp(), "EXPIRED");
        self.orders.insert(
            &order_id,
            &WorkOrder {
                vendor_id,
                recipient: vendor.recipient,
                amount,
                expires_at_ns,
                enabled: true,
                status: OrderStatus::Approved,
                current_attempt: U64(0),
                attempts: 0,
            },
        );
        self.order_count += 1;
        self.assert_storage_funded();
    }

    #[payable]
    pub fn revoke_work_order(&mut self, order_id: String) {
        self.owner_action();
        let mut order = self.orders.get(&order_id).expect("ORDER_MISSING");
        order.enabled = false; // Also allowed while pending: never cancels an in-flight transfer.
        self.orders.insert(&order_id, &order);
    }

    // No attached deposit: compatible with the worker's restricted function-call key.
    pub fn execute_payment(
        &mut self,
        order_id: String,
        invoice_id: String,
        recipient: AccountId,
        amount: U128,
    ) -> Promise {
        self.assert_agent();
        bounded_id(&order_id);
        bounded_id(&invoice_id);
        require!(!self.paused, "PAUSED");
        require!(
            env::prepaid_gas().as_gas() >= Gas::from_tgas(200).as_gas(),
            "INSUFFICIENT_GAS"
        );
        let mut order = self.orders.get(&order_id).expect("ORDER_MISSING");
        require!(order.enabled, "ORDER_REVOKED");
        require!(order.status == OrderStatus::Approved, "ORDER_NOT_APPROVED");
        require!(env::block_timestamp() < order.expires_at_ns.0, "EXPIRED");
        require!(
            self.vendors
                .get(&order.vendor_id)
                .expect("VENDOR_MISSING")
                .active,
            "VENDOR_INACTIVE"
        );
        require!(recipient == order.recipient, "RECIPIENT_MISMATCH");
        require!(amount.0 > 0 && amount == order.amount, "AMOUNT_MISMATCH");
        require!(amount.0 <= self.payment_cap, "PAYMENT_LIMIT");
        require!(
            amount.0
                <= self
                    .budget
                    .checked_sub(self.committed())
                    .expect("BUDGET_INVARIANT"),
            "BUDGET_LIMIT"
        );
        require!(
            amount.0
                <= self
                    .funded
                    .checked_sub(self.committed())
                    .expect("FUNDING_INVARIANT"),
            "INSUFFICIENT_FUNDS"
        );
        require!(self.invoices.get(&invoice_id).is_none(), "INVOICE_USED");
        require!(order.attempts < MAX_ATTEMPTS, "ATTEMPT_LIMIT");

        self.last_attempt = self.last_attempt.checked_add(1).expect("ATTEMPT_OVERFLOW");
        let attempt_id = U64(self.last_attempt);
        order.status = OrderStatus::Pending;
        order.current_attempt = attempt_id;
        order.attempts += 1;
        self.reserved = self
            .reserved
            .checked_add(amount.0)
            .expect("RESERVATION_OVERFLOW");
        self.orders.insert(&order_id, &order);
        self.invoices.insert(&invoice_id, &attempt_id);
        self.payments.insert(
            &attempt_id.0,
            &Payment {
                order_id,
                invoice_id,
                recipient: order.recipient.clone(),
                amount,
                initiated_at_ns: U64(env::block_timestamp()),
                status: PaymentStatus::Pending,
            },
        );
        // Legacy maps write immediately, so this measures the newly allocated records too.
        self.assert_storage_funded();
        // A finalized initiating outcome authenticates the first outgoing receipt as this
        // attempt's native transfer. Do not move another promise before that transfer.
        env::log_str(&self.transfer_marker(
            attempt_id,
            &self.payments.get(&attempt_id.0).expect("ATTEMPT_MISSING"),
        ));

        let record_gas = if cfg!(feature = "fault-record-gas") {
            Gas::from_gas(1)
        } else if cfg!(feature = "fault-record-storage") {
            Gas::from_tgas(100)
        } else {
            Gas::from_tgas(25)
        };
        let finalize_gas = if cfg!(feature = "fault-finalize-gas") {
            Gas::from_gas(1)
        } else if cfg!(feature = "fault-finalize-storage") {
            Gas::from_tgas(100)
        } else {
            Gas::from_tgas(25)
        };
        Promise::new(order.recipient)
            .transfer(NearToken::from_yoctonear(amount.0))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(record_gas)
                    .with_unused_gas_weight(0)
                    .on_transfer_result(attempt_id),
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(finalize_gas)
                    .with_unused_gas_weight(0)
                    .reconcile_payment(attempt_id),
            )
    }

    // Persist evidence before reconciliation, so a failed finalizer can be retried safely.
    #[private]
    pub fn on_transfer_result(&mut self, attempt_id: U64) -> PaymentStatus {
        require!(
            env::predecessor_account_id() == env::current_account_id(),
            "PRIVATE_CALLBACK"
        );
        let mut payment = self.payments.get(&attempt_id.0).expect("ATTEMPT_MISSING");
        if payment.status != PaymentStatus::Pending {
            return payment.status;
        }
        require!(
            env::promise_results_count() == 1,
            "TRANSFER_RESULT_REQUIRED"
        );
        self.assert_current_attempt(attempt_id, &payment);
        // Native transfer returns no payload. Bound the result read rather than allocating
        // arbitrary callback bytes; an unexpected result stays locked for investigation.
        payment.status = match env::promise_result_checked(0, 0) {
            Ok(_) => PaymentStatus::TransferSucceeded,
            Err(PromiseError::Failed) => PaymentStatus::TransferFailed,
            Err(_) => env::panic_str("UNEXPECTED_TRANSFER_RESULT"),
        };
        #[cfg(feature = "fault-record-storage")]
        inject_storage_exhaustion();
        self.payments.insert(&attempt_id.0, &payment);
        payment.status
    }

    // Anyone may retry finalization; callers cannot supply or override the transfer outcome.
    pub fn reconcile_payment(&mut self, attempt_id: U64) -> PaymentStatus {
        let mut payment = self.payments.get(&attempt_id.0).expect("ATTEMPT_MISSING");
        let succeeded = match payment.status {
            PaymentStatus::TransferSucceeded => true,
            PaymentStatus::TransferFailed => false,
            _ => return payment.status, // Unknown is blocked forever unless evidence is repaired.
        };
        let mut order = self.assert_current_attempt(attempt_id, &payment);
        require!(
            self.invoices.get(&payment.invoice_id) == Some(attempt_id),
            "INVOICE_INVARIANT"
        );
        self.reserved = self
            .reserved
            .checked_sub(payment.amount.0)
            .expect("RESERVATION_UNDERFLOW");
        if succeeded {
            self.spent = self
                .spent
                .checked_add(payment.amount.0)
                .expect("SPENDING_OVERFLOW");
            order.status = OrderStatus::Paid;
            payment.status = PaymentStatus::Paid;
        } else {
            // Approval eligibility still depends on enabled, expiry, pause and agent at next execution.
            order.status = OrderStatus::Approved;
            payment.status = PaymentStatus::Failed;
            self.invoices.remove(&payment.invoice_id);
        }
        #[cfg(feature = "fault-finalize-storage")]
        inject_storage_exhaustion();
        self.orders.insert(&payment.order_id, &order);
        self.payments.insert(&attempt_id.0, &payment);
        // Test-only late trap: proof consumption, invoice changes and terminal
        // collection writes have already occurred and must ALL roll back.
        #[cfg(feature = "fault-finalize-gas")]
        loop {
            env::sha256(&[0u8; 32_768]);
        }
        require!(
            self.committed() <= self.budget && self.committed() <= self.funded,
            "LEDGER_INVARIANT"
        );
        payment.status
    }

    pub fn get_vault(&self) -> VaultView {
        VaultView {
            owner: self.owner.clone(),
            agent: self.agent.clone(),
            paused: self.paused,
            budget: U128(self.budget),
            payment_cap: U128(self.payment_cap),
            funded: U128(self.funded),
            spent: U128(self.spent),
            reserved: U128(self.reserved),
            uncommitted_funds: U128(
                self.funded
                    .checked_sub(self.committed())
                    .expect("FUNDING_INVARIANT"),
            ),
            storage_stake: U128(self.storage_stake()),
            operating_reserve: U128(OPERATING_RESERVE),
            last_attempt: U64(self.last_attempt),
        }
    }

    pub fn get_order(&self, order_id: String) -> Option<WorkOrder> {
        self.orders.get(&order_id)
    }
    pub fn get_vendor(&self, vendor_id: String) -> Option<Vendor> {
        self.vendors.get(&vendor_id)
    }
    pub fn get_payment(&self, attempt_id: U64) -> Option<Payment> {
        self.payments.get(&attempt_id.0)
    }
    pub fn get_invoice_attempt(&self, invoice_id: String) -> Option<U64> {
        self.invoices.get(&invoice_id)
    }

    /// One-time trusted bootstrap, frozen before ANY payment attempt. This is not a
    /// post-incident owner assertion. Existing pending attempts cannot install/reset it.
    #[payable]
    pub fn initialize_repair_checkpoint(&mut self, checkpoint: repair::Checkpoint) {
        self.owner_action();
        require!(
            self.paused && self.last_attempt == 0,
            "CHECKPOINT_BEFORE_PAYMENTS_ONLY"
        );
        require!(
            !env::storage_has_key(repair::STATE_KEY),
            "CHECKPOINT_ALREADY_SET"
        );
        bounded_proof_input();
        checkpoint.validate_bootstrap();
        repair::save(&checkpoint);
        self.assert_storage_funded();
    }

    /// Anyone can relay new heads, but validator signatures and ancestry must verify.
    pub fn advance_repair_head(&mut self, update: repair::Update) {
        bounded_proof_input();
        require!(
            env::prepaid_gas().as_gas() >= Gas::from_tgas(250).as_gas(),
            "REPAIR_GAS"
        );
        let mut checkpoint = repair::load();
        checkpoint.advance(update);
        repair::save(&checkpoint);
        self.assert_storage_funded();
    }

    /// Permissionless, zero-deposit repair of an UNKNOWN result, using finalized native
    /// receipt evidence only. No outcome flag, RPC URL or owner override is accepted.
    pub fn repair_payment(
        &mut self,
        attempt_id: U64,
        initiation: repair::OutcomeProof,
        transfer: repair::OutcomeProof,
    ) -> PaymentStatus {
        bounded_proof_input();
        require!(
            env::prepaid_gas().as_gas() >= Gas::from_tgas(200).as_gas(),
            "REPAIR_GAS"
        );
        let mut payment = self.payments.get(&attempt_id.0).expect("ATTEMPT_MISSING");
        require!(
            payment.status == PaymentStatus::Pending,
            "REPAIR_NOT_PENDING"
        );
        self.assert_current_attempt(attempt_id, &payment);
        require!(
            self.invoices.get(&payment.invoice_id) == Some(attempt_id),
            "INVOICE_INVARIANT"
        );
        let checkpoint = repair::load();
        initiation.verify(&checkpoint);
        transfer.verify(&checkpoint);
        require!(
            initiation.outcome.executor_id == env::current_account_id(),
            "INITIATION_EXECUTOR"
        );
        require!(
            matches!(
                initiation.outcome.status,
                repair::Status::SuccessReceiptId(_)
            ),
            "INITIATION_NOT_SUCCESSFUL"
        );
        let markers: Vec<_> = initiation
            .logs
            .iter()
            .filter(|s| s.starts_with("NNETICS_TRANSFER_V1:"))
            .collect();
        // A full-access worker key could batch several execute actions into one receipt.
        // The first child is unambiguous only for exactly one initiation. Such unsupported
        // batches stay locked rather than borrowing another attempt's transfer evidence.
        require!(markers.len() == 1, "AMBIGUOUS_INITIATION");
        require!(
            *markers[0] == self.transfer_marker(attempt_id, &payment),
            "ATTEMPT_EVIDENCE_MISMATCH"
        );
        require!(
            initiation.outcome.receipt_ids.first() == Some(&transfer.id)
                && initiation.id != transfer.id,
            "TRANSFER_RECEIPT_LINK"
        );
        require!(
            transfer.outcome.executor_id == payment.recipient,
            "TRANSFER_EXECUTOR"
        );
        require!(
            initiation.block_header_lite.inner_lite.timestamp.0 >= payment.initiated_at_ns.0
                && transfer.block_header_lite.inner_lite.height.0
                    >= initiation.block_header_lite.inner_lite.height.0,
            "STALE_TRANSFER_EVIDENCE"
        );
        let succeeded = match &transfer.outcome.status {
            repair::Status::SuccessValue(value) if value.is_empty() => true,
            repair::Status::Failure => false,
            _ => env::panic_str("TRANSFER_NOT_TERMINAL"),
        };
        let used_key = repair::used_receipt_key(&transfer.id);
        require!(!env::storage_has_key(&used_key), "RECEIPT_ALREADY_USED");
        let record = repair::RepairRecord {
            attempt_id,
            checkpoint_hash: checkpoint.head.hash(),
            initiation_receipt: initiation.id,
            transfer_receipt: transfer.id,
            succeeded,
        };
        env::storage_write(&used_key, &attempt_id.0.to_le_bytes());
        env::storage_write(
            &repair::record_key(attempt_id),
            &near_sdk::borsh::to_vec(&record).expect("REPAIR_ENCODING"),
        );
        payment.status = if succeeded {
            PaymentStatus::TransferSucceeded
        } else {
            PaymentStatus::TransferFailed
        };
        self.payments.insert(&attempt_id.0, &payment);
        // Proof consumption, result recording and accounting are atomic. Any gas/storage
        // failure rolls ALL of them back, retaining the pending guard for a safe retry.
        let status = self.reconcile_payment(attempt_id);
        self.assert_storage_funded();
        status
    }

    pub fn get_repair_checkpoint(&self) -> Option<repair::Checkpoint> {
        env::storage_read(repair::STATE_KEY)
            .map(|bytes| near_sdk::borsh::from_slice(&bytes).expect("REPAIR_STATE"))
    }
    pub fn get_repair_record(&self, attempt_id: U64) -> Option<repair::RepairRecord> {
        env::storage_read(&repair::record_key(attempt_id))
            .map(|bytes| near_sdk::borsh::from_slice(&bytes).expect("REPAIR_STATE"))
    }
}

impl Vault {
    fn transfer_marker(&self, attempt_id: U64, payment: &Payment) -> String {
        let digest = repair::hash_borsh(&(
            env::current_account_id(),
            attempt_id,
            &payment.order_id,
            &payment.invoice_id,
            &payment.recipient,
            payment.amount,
            payment.initiated_at_ns,
        ));
        let hex: String = digest.iter().map(|byte| format!("{byte:02x}")).collect();
        format!("NNETICS_TRANSFER_V1:{hex}")
    }
    fn assert_owner(&self) {
        require!(env::predecessor_account_id() == self.owner, "OWNER_ONLY");
        require!(env::signer_account_id() == self.owner, "DIRECT_OWNER_ONLY");
    }
    fn owner_action(&self) {
        self.assert_owner();
        assert_one_yocto();
    }
    fn assert_agent(&self) {
        let agent = self.agent.as_ref().expect("AGENT_REVOKED");
        require!(
            env::predecessor_account_id() == agent.account_id,
            "AGENT_ACCOUNT"
        );
        require!(
            env::signer_account_id() == agent.account_id,
            "DIRECT_AGENT_ONLY"
        );
        require!(env::signer_account_pk() == agent.public_key, "AGENT_KEY");
    }
    fn committed(&self) -> u128 {
        self.spent
            .checked_add(self.reserved)
            .expect("LEDGER_OVERFLOW")
    }
    fn storage_stake(&self) -> u128 {
        u128::from(env::storage_usage())
            .checked_mul(env::storage_byte_cost().as_yoctonear())
            .expect("STORAGE_OVERFLOW")
    }
    fn assert_storage_funded(&self) {
        // Conservative while receipts are in flight: protects stake whether an outgoing debit
        // is already reflected in account_balance or has yet to be processed.
        let required = self
            .storage_stake()
            .checked_add(OPERATING_RESERVE)
            .and_then(|v| v.checked_add(self.reserved))
            .expect("BALANCE_OVERFLOW");
        require!(
            env::account_balance().as_yoctonear() >= required,
            "STORAGE_OR_LIQUIDITY_RESERVE"
        );
    }
    fn assert_current_attempt(&self, attempt_id: U64, payment: &Payment) -> WorkOrder {
        let order = self.orders.get(&payment.order_id).expect("ORDER_MISSING");
        require!(
            order.status == OrderStatus::Pending && order.current_attempt == attempt_id,
            "STALE_ATTEMPT"
        );
        order
    }
}

fn bounded_id(value: &str) {
    require!(
        !value.is_empty()
            && value.len() <= 64
            && value
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b"-_:".contains(&b)),
        "INVALID_ID"
    );
}

fn bounded_proof_input() {
    require!(
        env::input().map_or(0, |bytes| bytes.len()) <= 128_000,
        "PROOF_INPUT_LIMIT"
    );
}

#[cfg(any(feature = "fault-record-storage", feature = "fault-finalize-storage"))]
fn inject_storage_exhaustion() {
    // Real protocol storage-stake failure in a sandbox vault with <10 NEAR. Receipt rollback
    // must preserve all pending guards. Kept out of the production WASM by cfg.
    env::storage_write(b"sandbox-only-storage-fault", &vec![0u8; 1_000_000]);
}

#[cfg(test)]
mod tests;
