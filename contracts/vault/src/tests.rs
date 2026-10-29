use super::*;
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::{testing_env, PromiseResult, RuntimeFeesConfig};

const NEAR: u128 = 10u128.pow(24);
const EXPIRY: u64 = 1_000;

fn account(id: &str) -> AccountId {
    id.parse().unwrap()
}
fn key() -> PublicKey {
    "ed25519:11111111111111111111111111111111".parse().unwrap()
}
fn context(caller: &str, deposit: u128, now: u64) -> near_sdk::VMContext {
    VMContextBuilder::new()
        .current_account_id(account("vault.testnet"))
        .predecessor_account_id(account(caller))
        .signer_account_id(account(caller))
        .signer_account_pk(key())
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .account_balance(NearToken::from_near(100))
        .prepaid_gas(Gas::from_tgas(300))
        .block_timestamp(now)
        .build()
}
fn owner() {
    testing_env!(context("owner.testnet", 1, 10));
}
fn agent() {
    testing_env!(context("worker.testnet", 0, 20));
}
fn fixture() -> Vault {
    testing_env!(context("vault.testnet", 0, 0));
    let mut vault = Vault::new(account("owner.testnet"), U128(6 * NEAR), U128(3 * NEAR));
    testing_env!(context("owner.testnet", 10 * NEAR, 10));
    vault.deposit();
    owner();
    vault.register_vendor("writer".into(), account("writer.testnet"));
    vault.approve_work_order("order".into(), "writer".into(), U128(2 * NEAR), U64(EXPIRY));
    vault.authorize_agent(account("worker.testnet"), key());
    vault.set_paused(false);
    vault
}
fn execute(v: &mut Vault, invoice: &str) {
    agent();
    drop(v.execute_payment(
        "order".into(),
        invoice.into(),
        account("writer.testnet"),
        U128(2 * NEAR),
    ));
}
fn result(v: &mut Vault, attempt: u64, success: bool) -> PaymentStatus {
    testing_env!(
        context("vault.testnet", 0, 30),
        near_sdk::test_vm_config(),
        RuntimeFeesConfig::test(),
        Default::default(),
        vec![if success {
            PromiseResult::Successful(vec![])
        } else {
            PromiseResult::Failed
        }]
    );
    v.on_transfer_result(U64(attempt))
}
fn invariants(v: &Vault) {
    assert!(v.committed() <= v.budget);
    assert!(v.committed() <= v.funded);
}

#[test]
fn success_is_two_phase_and_idempotent() {
    let mut v = fixture();
    execute(&mut v, "invoice");
    assert_eq!(v.reserved, 2 * NEAR);
    assert_eq!(v.spent, 0);
    assert_eq!(v.reconcile_payment(U64(1)), PaymentStatus::Pending);
    assert_eq!(result(&mut v, 1, true), PaymentStatus::TransferSucceeded);
    // Durable result does not release the pending guard until finalization.
    assert_eq!(
        v.orders.get(&"order".into()).unwrap().status,
        OrderStatus::Pending
    );
    assert_eq!(v.reconcile_payment(U64(1)), PaymentStatus::Paid);
    assert_eq!(v.reconcile_payment(U64(1)), PaymentStatus::Paid);
    assert_eq!(result(&mut v, 1, false), PaymentStatus::Paid);
    assert_eq!(v.reserved, 0);
    assert_eq!(v.spent, 2 * NEAR);
    assert_eq!(v.invoices.get(&"invoice".into()), Some(U64(1)));
    invariants(&v);
}

#[test]
fn failure_releases_only_confirmed_attempt_and_old_callback_cannot_finalize_retry() {
    let mut v = fixture();
    execute(&mut v, "invoice");
    assert_eq!(result(&mut v, 1, false), PaymentStatus::TransferFailed);
    assert_eq!(v.reconcile_payment(U64(1)), PaymentStatus::Failed);
    assert_eq!(v.invoices.get(&"invoice".into()), None);
    assert_eq!(v.reserved, 0);
    assert_eq!(v.spent, 0);
    execute(&mut v, "invoice");
    assert_eq!(result(&mut v, 1, true), PaymentStatus::Failed);
    assert_eq!(v.reconcile_payment(U64(1)), PaymentStatus::Failed);
    assert_eq!(
        v.orders.get(&"order".into()).unwrap().current_attempt,
        U64(2)
    );
    assert_eq!(v.reserved, 2 * NEAR);
    result(&mut v, 2, true);
    v.reconcile_payment(U64(2));
    invariants(&v);
}

#[test]
fn revocation_and_pause_do_not_cancel_in_flight_success() {
    let mut v = fixture();
    execute(&mut v, "invoice");
    owner();
    v.set_paused(true);
    v.revoke_agent();
    v.revoke_work_order("order".into());
    result(&mut v, 1, true);
    assert_eq!(v.reconcile_payment(U64(1)), PaymentStatus::Paid);
    assert!(!v.orders.get(&"order".into()).unwrap().enabled);
    invariants(&v);
}

#[test]
fn failed_revoked_order_remains_disabled() {
    let mut v = fixture();
    execute(&mut v, "invoice");
    owner();
    v.revoke_work_order("order".into());
    result(&mut v, 1, false);
    v.reconcile_payment(U64(1));
    let order = v.orders.get(&"order".into()).unwrap();
    assert!(!order.enabled);
    assert_eq!(order.status, OrderStatus::Approved);
}

#[test]
#[should_panic(expected = "ORDER_NOT_APPROVED")]
fn pending_order_rejects_another_invoice() {
    let mut v = fixture();
    execute(&mut v, "one");
    execute(&mut v, "two");
}

#[test]
#[should_panic(expected = "ORDER_NOT_APPROVED")]
fn paid_order_cannot_execute_again() {
    let mut v = fixture();
    execute(&mut v, "one");
    result(&mut v, 1, true);
    v.reconcile_payment(U64(1));
    execute(&mut v, "two");
}

#[test]
#[should_panic(expected = "EXPIRED")]
fn expiry_is_exclusive_at_chain_nanosecond_boundary() {
    let mut v = fixture();
    testing_env!(context("worker.testnet", 0, EXPIRY));
    drop(v.execute_payment(
        "order".into(),
        "invoice".into(),
        account("writer.testnet"),
        U128(2 * NEAR),
    ));
}

#[test]
#[should_panic(expected = "BUDGET_COMMITTED")]
fn cannot_reduce_budget_below_pending_amount() {
    let mut v = fixture();
    execute(&mut v, "invoice");
    owner();
    v.set_budget(U128(2 * NEAR - 1));
}

#[test]
#[should_panic(expected = "DIRECT_AGENT_ONLY")]
fn indirect_worker_path_is_rejected() {
    let mut v = fixture();
    let mut ctx = context("worker.testnet", 0, 20);
    ctx.signer_account_id = account("other.testnet");
    testing_env!(ctx);
    drop(v.execute_payment(
        "order".into(),
        "invoice".into(),
        account("writer.testnet"),
        U128(2 * NEAR),
    ));
}

#[test]
#[should_panic(expected = "AGENT_KEY")]
fn different_key_on_authorized_account_is_rejected() {
    let mut v = fixture();
    let mut ctx = context("worker.testnet", 0, 20);
    ctx.signer_account_pk =
        near_sdk::PublicKey::from_parts(near_sdk::CurveType::ED25519, vec![2; 32]).unwrap();
    testing_env!(ctx);
    drop(v.execute_payment(
        "order".into(),
        "invoice".into(),
        account("writer.testnet"),
        U128(2 * NEAR),
    ));
}

#[test]
#[should_panic(expected = "PRIVATE_CALLBACK")]
fn forged_transfer_result_is_rejected() {
    let mut v = fixture();
    execute(&mut v, "invoice");
    agent();
    v.on_transfer_result(U64(1));
}

#[test]
fn recipient_updates_do_not_rewrite_approved_orders() {
    let mut v = fixture();
    owner();
    v.register_vendor("writer".into(), account("changed.testnet"));
    assert_eq!(
        v.orders.get(&"order".into()).unwrap().recipient,
        account("writer.testnet")
    );
    execute(&mut v, "invoice");
}

#[test]
fn unknown_result_never_releases_reservations_even_after_expiry() {
    let mut v = fixture();
    execute(&mut v, "invoice");
    testing_env!(context("anyone.testnet", 0, EXPIRY + 1));
    assert_eq!(v.reconcile_payment(U64(1)), PaymentStatus::Pending);
    assert_eq!(v.reserved, 2 * NEAR);
    assert_eq!(v.invoices.get(&"invoice".into()), Some(U64(1)));
    invariants(&v);
}

mod historical_repair;
