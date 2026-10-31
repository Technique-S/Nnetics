use anyhow::{ensure, Context, Result};
use near_workspaces::{
    network::Sandbox,
    result::ExecutionFinalResult,
    types::{AccessKey, Gas, KeyType, NearToken, SecretKey},
    Account, Contract, Worker,
};
use serde_json::{json, Value};
use std::path::PathBuf;

const NEAR: u128 = 10u128.pow(24);
fn artifact(name: &str) -> Result<Vec<u8>> {
    std::fs::read(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../artifacts")
            .join(format!("{name}.wasm")),
    )
    .with_context(|| format!("Build {name} first"))
}
async fn setup(code: &str) -> Result<(Worker<Sandbox>, Contract, Account)> {
    let version = std::env::var("NNETICS_SANDBOX_VERSION").unwrap_or_else(|_| "2.13.0".into());
    ensure!(version == "2.13.0" || version == "2.14.0-rc.5");
    let chain = near_workspaces::sandbox_with_version(&version).await?;
    let status: Value = reqwest::Client::new()
        .post(chain.rpc_addr())
        .json(&json!({"jsonrpc":"2.0","id":1,"method":"status","params":[]}))
        .send()
        .await?
        .json()
        .await?;
    ensure!(status["result"]["protocol_version"] == if version == "2.13.0" { 86 } else { 88 });
    let account = chain
        .root_account()?
        .create_subaccount("v")
        .initial_balance(NearToken::from_near(10))
        .transact()
        .await?
        .into_result()?;
    let factory = account.deploy(&artifact(code)?).await?.into_result()?;
    factory
        .batch()
        .delete_key(factory.as_account().secret_key().public_key())
        .transact()
        .await?
        .into_result()?;
    ensure!(chain.view_access_keys(factory.id()).await?.is_empty());
    let owner = chain.dev_create_account().await?;
    Ok((chain, factory, owner))
}
fn target(owner: &Account, request: &str, factory: &Contract) -> near_workspaces::AccountId {
    let hash = near_sdk::env::sha256(format!("{}:{}", owner.id(), request).as_bytes());
    let label = hash[..20]
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect::<String>();
    format!("v-{label}.{}", factory.id()).parse().unwrap()
}
// Do not use host env::sha256 outside a VM. The test harness initializes one only
// for deterministic local hashing; actual creation/ownership is tested in Sandbox.
fn hash_context() {
    near_sdk::testing_env!(near_sdk::test_utils::VMContextBuilder::new().build());
}
async fn create(
    owner: &Account,
    factory: &Contract,
    request: &str,
) -> Result<ExecutionFinalResult> {
    Ok(owner
        .call(factory.id(), "create_vault")
        .args_json(json!({"request_id":request}))
        .deposit(NearToken::from_near(5))
        .gas(Gas::from_tgas(250))
        .transact()
        .await?)
}
async fn check(
    chain: &Worker<Sandbox>,
    owner: &Account,
    factory: &Contract,
    request: &str,
) -> Result<()> {
    hash_context();
    let id = target(owner, request, factory);
    let vault: Value = chain
        .view(&id, "get_vault")
        .args_json(json!({}))
        .await?
        .json()?;
    ensure!(
        vault["owner"] == owner.id().as_str()
            && vault["paused"] == true
            && vault["agent"].is_null()
    );
    ensure!(vault["funded"] == "0" && vault["spent"] == "0" && vault["reserved"] == "0");
    ensure!(chain.view_access_keys(&id).await?.is_empty());
    ensure!(chain.view_account(&id).await?.balance.as_yoctonear() == 5 * NEAR);
    Ok(())
}
#[tokio::test]
async fn named_and_implicit_wallets_create_separate_initialized_locked_vaults() -> Result<()> {
    let (chain, factory, owner) = setup("factory").await?;
    let request = "a".repeat(32);
    ensure!(create(&owner, &factory, &request)
        .await?
        .receipt_failures()
        .is_empty());
    check(&chain, &owner, &factory, &request).await?;
    let sk = SecretKey::from_random(KeyType::ED25519);
    let pk: near_sdk::PublicKey = sk.public_key().to_string().parse()?;
    let implicit_id = pk.as_bytes()[1..]
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect::<String>()
        .parse()?;
    chain
        .root_account()?
        .transfer_near(&implicit_id, NearToken::from_near(10))
        .await?
        .into_result()?;
    let implicit = Account::from_secret_key(implicit_id, sk, &chain);
    ensure!(create(&implicit, &factory, &request)
        .await?
        .receipt_failures()
        .is_empty());
    check(&chain, &implicit, &factory, &request).await?;
    hash_context();
    ensure!(target(&owner, &request, &factory) != target(&implicit, &request, &factory));
    Ok(())
}
#[tokio::test]
async fn concurrent_requests_and_lost_responses_cannot_create_or_fund_another_vault() -> Result<()>
{
    let (chain, factory, owner) = setup("factory").await?;
    let request = "b".repeat(32);
    let sk = SecretKey::from_random(KeyType::ED25519);
    owner
        .batch(owner.id())
        .add_key(sk.public_key(), AccessKey::full_access())
        .transact()
        .await?
        .into_result()?;
    let mut parallel = owner.clone();
    parallel.set_secret_key(sk);
    let (a, b) = tokio::join!(
        create(&owner, &factory, &request),
        create(&parallel, &factory, &request)
    );
    let (a, b) = (a?, b?);
    ensure!(
        [&a, &b]
            .iter()
            .filter(|r| r.receipt_failures().is_empty())
            .count()
            == 1
    );
    check(&chain, &owner, &factory, &request).await?;
    // A restarted client that lost the result repeats the same request identifier.
    ensure!(!create(&owner, &factory, &request)
        .await?
        .receipt_failures()
        .is_empty());
    check(&chain, &owner, &factory, &request).await?;
    Ok(())
}
#[tokio::test]
async fn failed_initialization_rolls_back_account_code_and_funding_and_returns_refund() -> Result<()>
{
    let (chain, factory, owner) = setup("factory-fault-init-args").await?;
    let request = "c".repeat(32);
    let before = factory
        .as_account()
        .view_account()
        .await?
        .balance
        .as_yoctonear();
    let owner_before = owner.view_account().await?.balance.as_yoctonear();
    let outcome = create(&owner, &factory, &request).await?;
    ensure!(!outcome.receipt_failures().is_empty());
    hash_context();
    ensure!(chain
        .view_account(&target(&owner, &request, &factory))
        .await
        .is_err());
    ensure!(
        factory
            .as_account()
            .view_account()
            .await?
            .balance
            .as_yoctonear()
            == before
    );
    ensure!(
        owner.view_account().await?.balance.as_yoctonear() > owner_before - NEAR,
        "Five-NEAR creation funding was not refunded"
    );
    Ok(())
}
#[tokio::test]
async fn callback_failure_does_not_remove_initialized_vault_or_allow_reinitialization() -> Result<()>
{
    let (chain, factory, owner) = setup("factory-fault-created-callback").await?;
    let request = "d".repeat(32);
    ensure!(!create(&owner, &factory, &request)
        .await?
        .receipt_failures()
        .is_empty());
    check(&chain, &owner, &factory, &request).await?;
    hash_context();
    let id = target(&owner, &request, &factory);
    let attacker = chain.dev_create_account().await?;
    let stolen = attacker
        .call(&id, "new_from_factory")
        .args_json(
            json!({"owner":attacker.id(),"request_id":request,"budget":"0","payment_cap":"1"}),
        )
        .gas(Gas::from_tgas(60))
        .transact()
        .await?;
    ensure!(stolen.is_failure());
    ensure!(!create(&owner, &factory, &request)
        .await?
        .receipt_failures()
        .is_empty());
    check(&chain, &owner, &factory, &request).await?;
    Ok(())
}
