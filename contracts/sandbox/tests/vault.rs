use anyhow::{ensure, Context, Result};
use near_workspaces::types::{AccessKey, AccountDetailsPatch, Gas, KeyType, NearToken, SecretKey};
use near_workspaces::{network::Sandbox, result::ExecutionFinalResult, Account, Contract, Worker};
use serde_json::{json, Value};
use std::{path::PathBuf, time::Duration};
mod historical_repair;

const NEAR: u128 = 10u128.pow(24);
const ZERO: NearToken = NearToken::from_yoctonear(0);

fn artifact(name: &str) -> Result<Vec<u8>> {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../artifacts")
        .join(format!("{name}.wasm"));
    std::fs::read(&path)
        .with_context(|| format!("Build sandbox artifacts first: {}", path.display()))
}

struct Desk {
    chain: Worker<Sandbox>,
    vault: Contract,
    owner: Account,
    worker_full: Account,
    worker: Account,
    recipient: Account,
}

impl Desk {
    async fn new(code: &str, funded: u128) -> Result<Self> {
        // Always a fresh local Sandbox. No testnet/mainnet configuration or user keys.
        let chain = near_workspaces::sandbox().await?;
        let owner = chain.dev_create_account().await?;
        let worker_full = chain.dev_create_account().await?;
        let recipient = chain.dev_create_account().await?;
        let account = owner
            .create_subaccount("vault")
            .initial_balance(NearToken::from_near(5))
            .transact()
            .await?
            .into_result()?;
        let vault = account.deploy(&artifact(code)?).await?.into_result()?;
        vault.call("new").args_json(json!({"owner": owner.id(), "budget": (6*NEAR).to_string(), "payment_cap": (3*NEAR).to_string()}))
            .transact().await?.into_result()?;
        let sk = SecretKey::from_random(KeyType::ED25519);
        worker_full
            .batch(worker_full.id())
            .add_key(
                sk.public_key(),
                AccessKey::function_call_access(
                    vault.id(),
                    &["execute_payment"],
                    // The pinned sandbox charges >1 NEAR in its maximum upfront
                    // gas-cost check. Keep a finite allowance large enough for the suite.
                    Some(NearToken::from_near(100)),
                ),
            )
            .transact()
            .await?
            .into_result()?;
        let mut worker = worker_full.clone();
        worker.set_secret_key(sk.clone());
        let desk = Self {
            chain,
            vault,
            owner,
            worker_full,
            worker,
            recipient,
        };
        desk.owner
            .call(desk.vault.id(), "deposit")
            .deposit(NearToken::from_yoctonear(funded))
            .transact()
            .await?
            .into_result()?;
        desk.admin(
            "authorize_agent",
            json!({"account_id": desk.worker.id(), "public_key": sk.public_key().to_string()}),
        )
        .await?;
        desk.admin(
            "register_vendor",
            json!({"vendor_id": "writer", "recipient": desk.recipient.id()}),
        )
        .await?;
        desk.admin("set_paused", json!({"paused": false})).await?;
        // Prime Workspaces' nonce cache before tests issue simultaneous calls with this key.
        // The rejected call allocates no payment state.
        desk.rejects(desk.args("nonce-prime", "nonce-prime", 1), "ORDER_MISSING")
            .await?;
        Ok(desk)
    }

    async fn admin(&self, method: &str, args: Value) -> Result<()> {
        self.owner
            .call(self.vault.id(), method)
            .args_json(args)
            .deposit(NearToken::from_yoctonear(1))
            .max_gas()
            .transact()
            .await?
            .into_result()?;
        Ok(())
    }
    async fn approve(&self, order: &str, amount: u128) -> Result<()> {
        let now = self.chain.view_block().await?.timestamp();
        self.admin("approve_work_order", json!({"order_id": order, "vendor_id": "writer", "amount": amount.to_string(), "expires_at_ns": (now + 3_600_000_000_000u64).to_string()})).await
    }
    fn args(&self, order: &str, invoice: &str, amount: u128) -> Value {
        json!({"order_id": order, "invoice_id": invoice, "recipient": self.recipient.id(), "amount": amount.to_string()})
    }
    async fn execute(&self, args: Value) -> Result<ExecutionFinalResult> {
        Ok(self
            .worker
            .call(self.vault.id(), "execute_payment")
            .args_json(args)
            .max_gas()
            .transact()
            .await?)
    }
    async fn view(&self, method: &str, args: Value) -> Result<Value> {
        Ok(self.vault.view(method).args_json(args).await?.json()?)
    }
    async fn state(&self) -> Result<Value> {
        self.view("get_vault", json!({})).await
    }
    async fn order(&self, id: &str) -> Result<Value> {
        self.view("get_order", json!({"order_id": id})).await
    }
    async fn payment(&self, id: u64) -> Result<Value> {
        self.view("get_payment", json!({"attempt_id": id.to_string()}))
            .await
    }
    async fn reconcile(&self, id: u64) -> Result<String> {
        Ok(self
            .recipient
            .call(self.vault.id(), "reconcile_payment")
            .args_json(json!({"attempt_id": id.to_string()}))
            .max_gas()
            .transact()
            .await?
            .into_result()?
            .json()?)
    }
    async fn invariants(&self) -> Result<()> {
        let s = self.state().await?;
        ensure!(number(&s, "spent") + number(&s, "reserved") <= number(&s, "budget"));
        ensure!(number(&s, "spent") + number(&s, "reserved") <= number(&s, "funded"));
        Ok(())
    }
    async fn rejects(&self, args: Value, reason: &str) -> Result<()> {
        let before = self.state().await?;
        let result = self.execute(args).await?;
        ensure!(result.is_failure(), "expected {reason}, got {result:?}");
        ensure!(
            format!("{result:?}").contains(reason),
            "missing {reason}: {result:?}"
        );
        ensure!(
            self.state().await? == before,
            "rejected execution mutated ledger"
        );
        self.invariants().await
    }
}

fn number(value: &Value, field: &str) -> u128 {
    value[field].as_str().unwrap().parse().unwrap()
}

#[tokio::test]
async fn successful_payment_has_exact_balance_delta_and_durable_duplicate_guards() -> Result<()> {
    let d = Desk::new("vault", 10 * NEAR).await?;
    d.approve("article", 2 * NEAR).await?;
    let before = d.recipient.view_account().await?.balance.as_yoctonear();
    let result = d.execute(d.args("article", "INV-001", 2 * NEAR)).await?;
    ensure!(
        result.is_success() && result.receipt_failures().is_empty(),
        "{result:?}"
    );
    ensure!(d.recipient.view_account().await?.balance.as_yoctonear() - before == 2 * NEAR);
    eprintln!(
        "PAYMENT_EVIDENCE {}",
        json!({"scenario":"successful_payment", "recipient":d.recipient.id(),
        "before":before.to_string(), "after":d.recipient.view_account().await?.balance.as_yoctonear().to_string(),
        "expected_delta":(2*NEAR).to_string(), "vault":d.state().await?, "payment":d.payment(1).await?})
    );
    ensure!(d.order("article").await?["status"] == "Paid");
    let receipt = d.payment(1).await?;
    ensure!(receipt["status"] == "Paid" && receipt["recipient"] == d.recipient.id().as_str());
    ensure!(number(&receipt, "amount") == 2 * NEAR);
    d.rejects(
        d.args("article", "NEW-INVOICE", 2 * NEAR),
        "ORDER_NOT_APPROVED",
    )
    .await?;
    d.approve("another", 2 * NEAR).await?;
    d.rejects(d.args("another", "INV-001", 2 * NEAR), "INVOICE_USED")
        .await?;
    ensure!(d.reconcile(1).await? == "Paid");
    let state = d.state().await?;
    ensure!(number(&state, "spent") == 2 * NEAR && number(&state, "reserved") == 0);
    d.invariants().await
}

#[tokio::test]
async fn concurrent_requests_for_one_order_pay_once() -> Result<()> {
    let d = Desk::new("vault", 10 * NEAR).await?;
    d.approve("article", 2 * NEAR).await?;
    let before = d.recipient.view_account().await?.balance.as_yoctonear();
    let (a, b) = tokio::join!(
        d.execute(d.args("article", "one", 2 * NEAR)),
        d.execute(d.args("article", "two", 2 * NEAR))
    );
    let (a, b) = (a?, b?);
    ensure!(a.is_success() ^ b.is_success(), "{a:?} {b:?}");
    ensure!(d.recipient.view_account().await?.balance.as_yoctonear() - before == 2 * NEAR);
    ensure!(d.order("article").await?["attempts"] == 1);
    d.invariants().await
}

#[tokio::test]
async fn concurrent_different_orders_cannot_overspend_budget() -> Result<()> {
    let d = Desk::new("vault", 10 * NEAR).await?;
    d.admin("set_budget", json!({"budget": (3*NEAR).to_string()}))
        .await?;
    d.approve("one", 2 * NEAR).await?;
    d.approve("two", 2 * NEAR).await?;
    let (a, b) = tokio::join!(
        d.execute(d.args("one", "invoice-one", 2 * NEAR)),
        d.execute(d.args("two", "invoice-two", 2 * NEAR))
    );
    let (a, b) = (a?, b?);
    ensure!(a.is_success() ^ b.is_success(), "{a:?} {b:?}");
    ensure!(number(&d.state().await?, "spent") == 2 * NEAR);
    d.invariants().await
}

#[tokio::test]
async fn exact_amount_recipient_cap_budget_and_funding_are_enforced() -> Result<()> {
    let d = Desk::new("vault", 2 * NEAR).await?;
    d.approve("article", 2 * NEAR).await?;
    d.rejects(d.args("article", "inv", 2 * NEAR + 1), "AMOUNT_MISMATCH")
        .await?;
    d.rejects(d.args("article", "inv", 0), "AMOUNT_MISMATCH")
        .await?;
    let mut changed = d.args("article", "inv", 2 * NEAR);
    changed["recipient"] = json!(d.owner.id());
    d.rejects(changed, "RECIPIENT_MISMATCH").await?;
    d.admin(
        "set_payment_cap",
        json!({"payment_cap": (2*NEAR-1).to_string()}),
    )
    .await?;
    d.rejects(d.args("article", "inv", 2 * NEAR), "PAYMENT_LIMIT")
        .await?;
    d.admin(
        "set_payment_cap",
        json!({"payment_cap": (2*NEAR).to_string()}),
    )
    .await?;
    d.admin("set_budget", json!({"budget": (2*NEAR-1).to_string()}))
        .await?;
    d.rejects(d.args("article", "inv", 2 * NEAR), "BUDGET_LIMIT")
        .await?;
    d.admin("set_budget", json!({"budget": (2*NEAR).to_string()}))
        .await?;
    ensure!(d
        .execute(d.args("article", "inv", 2 * NEAR))
        .await?
        .is_success());
    d.admin("set_budget", json!({"budget": (6*NEAR).to_string()}))
        .await?;
    d.approve("unfunded", NEAR).await?;
    d.rejects(d.args("unfunded", "new", NEAR), "INSUFFICIENT_FUNDS")
        .await?;
    // Owner cannot reuse immutable IDs, even after revocation.
    d.admin("revoke_work_order", json!({"order_id": "unfunded"}))
        .await?;
    ensure!(d.approve("unfunded", NEAR).await.is_err());
    d.invariants().await
}

#[tokio::test]
async fn pause_vendor_order_agent_revocation_and_expiry_reject_execution() -> Result<()> {
    let d = Desk::new("vault", 10 * NEAR).await?;
    d.approve("article", 2 * NEAR).await?;
    d.admin("set_paused", json!({"paused": true})).await?;
    d.rejects(d.args("article", "inv", 2 * NEAR), "PAUSED")
        .await?;
    d.admin("set_paused", json!({"paused": false})).await?;
    d.admin("disable_vendor", json!({"vendor_id": "writer"}))
        .await?;
    d.rejects(d.args("article", "inv", 2 * NEAR), "VENDOR_INACTIVE")
        .await?;
    d.admin(
        "register_vendor",
        json!({"vendor_id": "writer", "recipient": d.recipient.id()}),
    )
    .await?;
    d.admin("revoke_work_order", json!({"order_id": "article"}))
        .await?;
    d.rejects(d.args("article", "inv", 2 * NEAR), "ORDER_REVOKED")
        .await?;
    let now = d.chain.view_block().await?.timestamp();
    d.admin("approve_work_order", json!({"order_id": "expired", "vendor_id": "writer", "amount": NEAR.to_string(), "expires_at_ns": (now + 60_000_000_000u64).to_string()})).await?;
    d.chain.fast_forward(200).await?;
    d.rejects(d.args("expired", "expired-invoice", NEAR), "EXPIRED")
        .await?;
    d.admin("revoke_agent", json!({})).await?;
    d.rejects(d.args("article", "inv", 2 * NEAR), "AGENT_REVOKED")
        .await
}

#[tokio::test]
async fn authorization_checks_key_owner_deposit_and_private_callback() -> Result<()> {
    let d = Desk::new("vault", 10 * NEAR).await?;
    d.approve("article", 2 * NEAR).await?;
    let wrong_key = d
        .worker_full
        .call(d.vault.id(), "execute_payment")
        .args_json(d.args("article", "inv", 2 * NEAR))
        .max_gas()
        .transact()
        .await?;
    ensure!(wrong_key.is_failure() && format!("{wrong_key:?}").contains("AGENT_KEY"));
    let unauthorized = d
        .worker_full
        .call(d.vault.id(), "set_budget")
        .args_json(json!({"budget": "0"}))
        .deposit(NearToken::from_yoctonear(1))
        .transact()
        .await?;
    ensure!(unauthorized.is_failure() && format!("{unauthorized:?}").contains("OWNER_ONLY"));
    let forged = d
        .owner
        .call(d.vault.id(), "on_transfer_result")
        .args_json(json!({"attempt_id": "1"}))
        .transact()
        .await?;
    ensure!(forged.is_failure());
    let no_deposit = d
        .owner
        .call(d.vault.id(), "set_paused")
        .args_json(json!({"paused": true}))
        .transact()
        .await?;
    ensure!(no_deposit.is_failure());
    // Runtime rejects methods/deposits outside the key permission before entering the vault.
    let restricted = d
        .worker
        .call(d.vault.id(), "set_paused")
        .args_json(json!({"paused": true}))
        .transact()
        .await;
    ensure!(restricted.is_err());
    let with_deposit = d
        .worker
        .call(d.vault.id(), "execute_payment")
        .args_json(d.args("article", "inv", 2 * NEAR))
        .deposit(NearToken::from_yoctonear(1))
        .max_gas()
        .transact()
        .await;
    ensure!(with_deposit.is_err());
    let low_gas = d
        .worker
        .call(d.vault.id(), "execute_payment")
        .args_json(d.args("article", "inv", 2 * NEAR))
        .gas(Gas::from_tgas(100))
        .transact()
        .await?;
    ensure!(low_gas.is_failure() && format!("{low_gas:?}").contains("INSUFFICIENT_GAS"));
    ensure!(d.state().await?["last_attempt"] == "0");
    d.invariants().await
}

#[tokio::test]
async fn failed_transfer_releases_claim_and_can_retry_after_recipient_exists() -> Result<()> {
    let mut d = Desk::new("vault", 10 * NEAR).await?;
    let missing = format!("missing.{}", d.owner.id());
    d.admin(
        "register_vendor",
        json!({"vendor_id": "writer", "recipient": missing}),
    )
    .await?;
    d.approve("article", NEAR).await?;
    let mut args = d.args("article", "inv", NEAR);
    args["recipient"] = json!(missing);
    let result = d.execute(args.clone()).await?;
    // Top-level success alone is insufficient: native transfer failure is a failed child receipt.
    ensure!(!result.receipt_failures().is_empty());
    ensure!(d.payment(1).await?["status"] == "Failed");
    ensure!(number(&d.state().await?, "reserved") == 0 && number(&d.state().await?, "spent") == 0);
    ensure!(d
        .view("get_invoice_attempt", json!({"invoice_id": "inv"}))
        .await?
        .is_null());
    d.recipient = d
        .owner
        .create_subaccount("missing")
        .initial_balance(NearToken::from_near(1))
        .transact()
        .await?
        .into_result()?;
    let before = d.recipient.view_account().await?.balance.as_yoctonear();
    ensure!(d.execute(args).await?.is_success());
    ensure!(d.recipient.view_account().await?.balance.as_yoctonear() - before == NEAR);
    ensure!(d.payment(2).await?["status"] == "Paid");
    ensure!(d.reconcile(1).await? == "Failed");
    d.invariants().await
}

#[tokio::test]
async fn callback_failures_preserve_guards_and_only_durable_evidence_can_reconcile() -> Result<()> {
    for fault in [
        "fault-record-gas",
        "fault-record-storage",
        "fault-finalize-gas",
        "fault-finalize-storage",
    ] {
        let d = Desk::new(fault, NEAR).await?;
        d.approve("article", NEAR).await?;
        let before = d.recipient.view_account().await?.balance.as_yoctonear();
        let result = d.execute(d.args("article", "inv", NEAR)).await?;
        let failures = format!("{:?}", result.receipt_failures());
        ensure!(
            !result.receipt_failures().is_empty(),
            "{fault}: injection did not fail"
        );
        if fault.ends_with("storage") {
            ensure!(
                failures.contains("LackBalanceForState"),
                "{fault}: expected protocol storage-stake failure, got {failures}"
            );
        } else {
            ensure!(
                failures.contains("GasExceeded")
                    || failures.contains("GasLimitExceeded")
                    || failures
                        .to_ascii_lowercase()
                        .contains("exceeded the prepaid gas"),
                "{fault}: {failures}"
            );
        }
        ensure!(
            d.recipient.view_account().await?.balance.as_yoctonear() - before == NEAR,
            "{fault}: transfer did not succeed"
        );
        ensure!(d.order("article").await?["status"] == "Pending");
        ensure!(number(&d.state().await?, "reserved") == NEAR);
        d.rejects(
            d.args("article", "another-invoice", NEAR),
            "ORDER_NOT_APPROVED",
        )
        .await?;
        // Pause/revocation must not prevent accounting for an already-sent transfer.
        d.admin("set_paused", json!({"paused": true})).await?;
        d.admin("revoke_agent", json!({})).await?;
        d.admin("revoke_work_order", json!({"order_id": "article"}))
            .await?;
        // Local-only test repair: identical state schema, replace faulty code with production.
        d.vault
            .as_account()
            .deploy(&artifact("vault")?)
            .await?
            .into_result()?;
        if fault.starts_with("fault-record") {
            ensure!(d.payment(1).await?["status"] == "Pending");
            ensure!(d.reconcile(1).await? == "Pending");
            ensure!(number(&d.state().await?, "reserved") == NEAR);
        } else {
            ensure!(d.payment(1).await?["status"] == "TransferSucceeded");
            ensure!(d.reconcile(1).await? == "Paid");
            ensure!(d.reconcile(1).await? == "Paid");
            ensure!(number(&d.state().await?, "reserved") == 0);
            ensure!(number(&d.state().await?, "spent") == NEAR);
        }
        ensure!(!d.order("article").await?["enabled"].as_bool().unwrap());
        d.invariants().await?;
    }
    Ok(())
}

#[tokio::test]
async fn unknown_client_outcome_is_resolved_by_views_without_resubmission() -> Result<()> {
    let d = Desk::new("vault", NEAR).await?;
    d.approve("article", NEAR).await?;
    let before = d.recipient.view_account().await?.balance.as_yoctonear();
    // Model a worker losing the RPC response after broadcast: discard handle, never resubmit.
    let _submission = d
        .worker
        .call(d.vault.id(), "execute_payment")
        .args_json(d.args("article", "inv", NEAR))
        .deposit(ZERO)
        .max_gas()
        .transact_async()
        .await?;
    let mut paid = false;
    for _ in 0..100 {
        if d.order("article").await?["status"] == "Paid" {
            paid = true;
            break;
        }
        tokio::time::sleep(Duration::from_millis(200)).await;
    }
    ensure!(paid, "payment did not settle before polling deadline");
    ensure!(d.recipient.view_account().await?.balance.as_yoctonear() - before == NEAR);
    ensure!(d.state().await?["last_attempt"] == "1");
    d.invariants().await
}

#[tokio::test]
async fn concurrent_invoice_claims_on_different_orders_pay_once() -> Result<()> {
    let d = Desk::new("vault", 10 * NEAR).await?;
    d.approve("one", NEAR).await?;
    d.approve("two", NEAR).await?;
    let (a, b) = tokio::join!(
        d.execute(d.args("one", "shared-invoice", NEAR)),
        d.execute(d.args("two", "shared-invoice", NEAR))
    );
    let (a, b) = (a?, b?);
    ensure!(a.is_success() ^ b.is_success(), "{a:?} {b:?}");
    ensure!(number(&d.state().await?, "spent") == NEAR);
    d.invariants().await
}

#[tokio::test]
async fn storage_headroom_failure_rolls_back_attempt_invoice_and_reservation() -> Result<()> {
    let d = Desk::new("vault", 10 * NEAR).await?;
    d.approve("article", NEAR).await?;
    let s = d.state().await?;
    let balance = number(&s, "storage_stake") + number(&s, "operating_reserve") + NEAR - 1;
    let original = d.vault.as_account().view_account().await?;
    // Emulate insufficient physical balance despite a funded payment ledger.
    d.chain
        .patch(d.vault.id())
        // Workspaces serializes omitted fields to defaults; preserve code and storage.
        .account_from_current(move |account| {
            AccountDetailsPatch::from(account).balance(NearToken::from_yoctonear(balance))
        })
        .transact()
        .await?;
    let patched = d.vault.as_account().view_account().await?;
    ensure!(patched.contract_state == original.contract_state);
    ensure!(patched.storage_usage == original.storage_usage);
    d.rejects(
        d.args("article", "inv", NEAR),
        "STORAGE_OR_LIQUIDITY_RESERVE",
    )
    .await?;
    ensure!(d.order("article").await?["status"] == "Approved");
    ensure!(d.payment(1).await?.is_null());
    ensure!(d
        .view("get_invoice_attempt", json!({"invoice_id": "inv"}))
        .await?
        .is_null());
    Ok(())
}

#[tokio::test]
async fn repeated_confirmed_failures_are_bounded_and_never_recycle_order_ids() -> Result<()> {
    let d = Desk::new("vault", NEAR).await?;
    let missing = format!("missing.{}", d.owner.id());
    d.admin(
        "register_vendor",
        json!({"vendor_id": "writer", "recipient": missing}),
    )
    .await?;
    d.approve("article", NEAR).await?;
    let mut args = d.args("article", "inv", NEAR);
    args["recipient"] = json!(missing);
    for id in 1..=8 {
        let result = d.execute(args.clone()).await?;
        ensure!(!result.receipt_failures().is_empty());
        ensure!(d.payment(id).await?["status"] == "Failed");
        d.invariants().await?;
    }
    d.rejects(args, "ATTEMPT_LIMIT").await?;
    ensure!(d.order("article").await?["attempts"] == 8);
    ensure!(number(&d.state().await?, "spent") == 0);
    Ok(())
}
