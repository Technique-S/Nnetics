use super::*;
use near_primitives::views::LightClientBlockLiteView;
use std::{
    io::Write,
    process::{Command, Stdio},
};

fn normalize(mode: &str, bundle: &Value) -> Result<Value> {
    let script = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../scripts/prepare-repair.ts");
    let mut child = Command::new("node")
        .arg(script)
        .arg(mode)
        .arg("-")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;
    child
        .stdin
        .take()
        .context("node stdin")?
        .write_all(&serde_json::to_vec(bundle)?)?;
    let output = child.wait_with_output()?;
    ensure!(
        output.status.success(),
        "proof normalizer: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    Ok(serde_json::from_slice(&output.stdout)?)
}
fn header_hash(raw: &Value) -> Result<String> {
    let header: LightClientBlockLiteView = serde_json::from_value(raw.clone())?;
    Ok(header.hash().to_string())
}
async fn rpc(d: &Desk, method: &str, params: Value) -> Result<Value> {
    let response: Value = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()?
        .post(d.chain.rpc_addr())
        .json(&json!({"jsonrpc":"2.0","id":"proof-test","method":method,"params":params}))
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;
    ensure!(response["error"].is_null(), "{method}: {response}");
    response
        .get("result")
        .cloned()
        .context("missing RPC result")
}

async fn enable(d: &Desk) -> Result<String> {
    d.admin("set_paused", json!({"paused":true})).await?;
    // Leave special genesis epochs and exercise real validator-set transitions. This
    // advances only the local sandbox; no public network time or accounts are changed.
    let config = rpc(d, "EXPERIMENTAL_genesis_config", json!({})).await?;
    let epoch = config["epoch_length"]
        .as_u64()
        .context("sandbox epoch length")?;
    ensure!(
        epoch > 0 && epoch <= 1_000_000,
        "unexpected sandbox epoch length"
    );
    d.chain.fast_forward(2 * epoch + 10).await?;
    let genesis_height = config["genesis_height"].as_u64().unwrap_or(0);
    let genesis = rpc(d, "block", json!({"block_id":genesis_height})).await?;
    let block = rpc(
        d,
        "next_light_client_block",
        json!([genesis["header"]["hash"]]),
    )
    .await?;
    ensure!(
        !block.is_null(),
        "sandbox has no newer finalized light-client block"
    );
    let current = rpc(
        d,
        "EXPERIMENTAL_validators_ordered",
        json!({"block_id":header_hash(&block)?}),
    )
    .await?;
    ensure!(
        !block["next_bps"].is_null(),
        "bootstrap must provide authenticated next validators"
    );
    let args = normalize("checkpoint", &json!({"block":block,"current_bps":current}))?;
    d.admin("initialize_repair_checkpoint", args).await?;
    d.admin("set_paused", json!({"paused":false})).await?;
    header_hash(&block)
}

async fn advance(d: &Desk, old: &str, minimum_height: u64) -> Result<String> {
    let mut cursor = old.to_string();
    for _ in 0..100 {
        let block = rpc(d, "next_light_client_block", json!([cursor])).await?;
        if !block.is_null() {
            let head = header_hash(&block)?;
            let ancestry = rpc(
                d,
                "EXPERIMENTAL_light_client_block_proof",
                json!({"block_hash":cursor,"light_client_head":head}),
            )
            .await?;
            let args = normalize(
                "update",
                &json!({"block":block,"ancestry":ancestry["block_proof"]}),
            )?;
            d.owner
                .call(d.vault.id(), "advance_repair_head")
                .args_json(args)
                .max_gas()
                .transact()
                .await?
                .into_result()?;
            cursor = head;
            if block["inner_lite"]["height"]
                .as_u64()
                .context("head height")?
                > minimum_height + 2
            {
                return Ok(cursor);
            }
        }
        tokio::time::sleep(Duration::from_millis(200)).await;
    }
    anyhow::bail!("no finalized light-client head beyond payment receipts")
}

async fn evidence(d: &Desk, result: &ExecutionFinalResult, old_head: &str) -> Result<Value> {
    let initiation = result
        .receipt_outcomes()
        .iter()
        .find(|r| {
            r.executor_id == *d.vault.id()
                && r.logs
                    .iter()
                    .any(|s| s.starts_with("PAYSCOPE_TRANSFER_V1:"))
        })
        .context("initiating receipt log")?;
    let transfer_id = initiation
        .receipt_ids
        .first()
        .context("first child transfer receipt")?;
    let mut max_height = 0;
    for outcome in result.receipt_outcomes() {
        let block = rpc(
            d,
            "block",
            json!({"block_id":outcome.block_hash.to_string()}),
        )
        .await?;
        max_height = max_height.max(block["header"]["height"].as_u64().context("block height")?);
    }
    let head = advance(d, old_head, max_height).await?;
    let start = rpc(
        d,
        "EXPERIMENTAL_light_client_proof",
        json!({"type":"receipt","receipt_id":initiation.transaction_hash.to_string(),
        "receiver_id":d.vault.id(),"light_client_head":head}),
    )
    .await?;
    let recipient = d.order("article").await?["recipient"].clone();
    let transfer = rpc(
        d,
        "EXPERIMENTAL_light_client_proof",
        json!({"type":"receipt","receipt_id":transfer_id.to_string(),
        "receiver_id":recipient,"light_client_head":head}),
    )
    .await?;
    Ok(json!({"attempt_id":"1","initiation":start,"transfer":transfer}))
}

fn retain(name: &str, value: &Value) -> Result<()> {
    let dir = std::env::var_os("PAYSCOPE_EVIDENCE_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../artifacts/evidence")
        });
    std::fs::create_dir_all(&dir)?;
    std::fs::write(dir.join(name), serde_json::to_vec_pretty(value)?)?;
    Ok(())
}
async fn repair_call(d: &Desk, args: Value) -> Result<ExecutionFinalResult> {
    // Unprivileged account demonstrates that proof authority is independent of owner/key.
    Ok(d.worker_full
        .call(d.vault.id(), "repair_payment")
        .args_json(args)
        .max_gas()
        .transact()
        .await?)
}
async fn rejected_repair(d: &Desk, args: Value, reason: &str) -> Result<()> {
    let before = d.state().await?;
    let result = repair_call(d, args).await?;
    ensure!(
        result.is_failure() && format!("{result:?}").contains(reason),
        "{reason}: {result:?}"
    );
    ensure!(d.state().await? == before, "invalid proof changed ledger");
    ensure!(d
        .view("get_repair_record", json!({"attempt_id":"1"}))
        .await?
        .is_null());
    Ok(())
}

#[tokio::test]
async fn actual_finalized_receipt_proofs_repair_lost_success_and_failure() -> Result<()> {
    for fault in ["fault-record-gas", "fault-record-storage"] {
        for success in [true, false] {
            let d = Desk::new(fault, NEAR).await?;
            let anchor = enable(&d).await?;
            if !success {
                d.admin(
                    "register_vendor",
                    json!({"vendor_id":"writer","recipient":format!("missing.{}",d.owner.id())}),
                )
                .await?;
            }
            d.approve("article", NEAR).await?;
            let mut args = d.args("article", "inv", NEAR);
            args["recipient"] = d.order("article").await?["recipient"].clone();
            let before = d.recipient.view_account().await?.balance.as_yoctonear();
            let result = d.execute(args.clone()).await?;
            ensure!(!result.receipt_failures().is_empty());
            ensure!(
                d.payment(1).await?["status"] == "Pending"
                    && number(&d.state().await?, "reserved") == NEAR
            );
            let after = d.recipient.view_account().await?.balance.as_yoctonear();
            ensure!(
                after - before == if success { NEAR } else { 0 },
                "exact recipient balance delta"
            );
            // Capture the balance delta before this unprivileged account pays reconciliation gas.
            ensure!(d.reconcile(1).await? == "Pending");
            // The proof verifier increases code/storage stake; pending reservations are
            // conservatively protected even after the transfer debit. Add operating funds,
            // without crediting or altering the payment ledger, before syncing the head.
            d.owner
                .call(d.vault.id(), "fund_storage")
                .deposit(NearToken::from_near(1))
                .transact()
                .await?
                .into_result()?;
            ensure!(number(&d.state().await?, "funded") == NEAR);
            let bundle = evidence(&d, &result, &anchor).await?;
            retain(
                &format!(
                    "{fault}-historical-{}-proof.json",
                    if success { "success" } else { "failure" }
                ),
                &bundle,
            )?;
            let proof_args = normalize("repair", &bundle)?;
            // Restore the production implementation; the serialized vault layout is unchanged.
            d.vault
                .as_account()
                .deploy(&artifact("vault")?)
                .await?
                .into_result()?;
            d.admin("set_paused", json!({"paused":true})).await?;
            d.admin("revoke_agent", json!({})).await?;
            let mut tampered = proof_args.clone();
            let altered = number(&tampered["transfer"]["outcome"], "tokens_burnt") + 1;
            tampered["transfer"]["outcome"]["tokens_burnt"] = json!(altered.to_string());
            rejected_repair(&d, tampered, "OUTCOME_PROOF").await?;
            let repaired = repair_call(&d, proof_args.clone()).await?;
            ensure!(repaired.is_success(), "{repaired:?}");
            ensure!(d.payment(1).await?["status"] == if success { "Paid" } else { "Failed" });
            ensure!(number(&d.state().await?, "reserved") == 0);
            ensure!(number(&d.state().await?, "spent") == if success { NEAR } else { 0 });
            let record = d
                .view("get_repair_record", json!({"attempt_id":"1"}))
                .await?;
            let replay = repair_call(&d, proof_args).await?;
            ensure!(replay.is_failure() && format!("{replay:?}").contains("REPAIR_NOT_PENDING"));
            retain(
                &format!(
                    "{fault}-historical-{}-result.json",
                    if success { "success" } else { "failure" }
                ),
                &json!({"payment":d.payment(1).await?,"vault":d.state().await?,"repair_record":record,
                "recipient_before":before.to_string(),"recipient_after":after.to_string(),
                "exact_delta":(after-before).to_string(),"repair_outcome":format!("{repaired:?}"),"replay_rejected":true}),
            )?;
            d.invariants().await?;
        }
    }
    Ok(())
}

#[tokio::test]
async fn checkpoint_cannot_be_reset_after_payment_or_by_worker() -> Result<()> {
    let d = Desk::new("fault-record-gas", NEAR).await?;
    enable(&d).await?;
    let checkpoint = d.view("get_repair_checkpoint", json!({})).await?;
    let unauthorized = d
        .worker_full
        .call(d.vault.id(), "initialize_repair_checkpoint")
        .args_json(json!({"checkpoint":checkpoint}))
        .deposit(NearToken::from_yoctonear(1))
        .max_gas()
        .transact()
        .await?;
    ensure!(unauthorized.is_failure() && format!("{unauthorized:?}").contains("OWNER_ONLY"));
    d.approve("article", NEAR).await?;
    d.execute(d.args("article", "inv", NEAR)).await?;
    d.admin("set_paused", json!({"paused":true})).await?;
    let reset = d
        .owner
        .call(d.vault.id(), "initialize_repair_checkpoint")
        .args_json(json!({"checkpoint":checkpoint}))
        .deposit(NearToken::from_yoctonear(1))
        .max_gas()
        .transact()
        .await?;
    ensure!(reset.is_failure() && format!("{reset:?}").contains("CHECKPOINT_BEFORE_PAYMENTS_ONLY"));
    ensure!(number(&d.state().await?, "reserved") == NEAR);
    Ok(())
}
