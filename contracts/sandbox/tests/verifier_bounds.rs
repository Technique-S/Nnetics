//! Synthetic authenticated workload, NOT real consensus evidence. The owner
//! bootstraps controlled validators before payment; no production bypass exists.
//! Real RPC/finality tests remain in historical_repair.
use super::*;
use ed25519_dalek::{Signer, SigningKey};
use near_primitives::{borsh, hash::CryptoHash};
use near_sdk::json_types::{Base64VecU8, U128, U64};
use payscope_vault::repair::{
    Checkpoint, Direction, Hash, Header, InnerLite, OutcomeProof, PartialOutcome, PathItem, Status,
    Update, Validator,
};

const LIMIT: usize = 128_000;
fn h(bytes: &[u8]) -> Hash {
    near_primitives::hash::hash(bytes).0
}
fn hb<T: borsh::BorshSerialize>(value: &T) -> Hash {
    CryptoHash::hash_borsh(value).0
}
fn pair(a: Hash, b: Hash) -> Hash {
    h(&[a.as_slice(), b.as_slice()].concat())
}
fn hh(header: &Header) -> Hash {
    pair(
        pair(hb(&header.inner_lite), header.inner_rest_hash),
        header.prev_block_hash,
    )
}
fn key(index: usize) -> SigningKey {
    SigningKey::from_bytes(&h(&index.to_le_bytes()))
}
fn validators(offset: usize) -> Vec<Validator> {
    (0..128)
        .map(|i| Validator {
            account_id: format!("v{:03}{}.testnet", i + offset, "x".repeat(52))
                .parse()
                .unwrap(),
            public_key: near_sdk::PublicKey::from_parts(
                near_sdk::CurveType::ED25519,
                key(i + offset).verifying_key().to_bytes().to_vec(),
            )
            .unwrap(),
            stake: U128(u128::MAX / 128),
        })
        .collect()
}
fn bps_hash(bps: &[Validator]) -> Hash {
    // Compute via official consensus type rather than the contract implementation.
    let official: Vec<_> = bps
        .iter()
        .map(|v| {
            near_primitives::views::validator_stake_view::ValidatorStakeView::V1(
                near_primitives::views::ValidatorStakeViewV1 {
                    account_id: v.account_id.clone(),
                    public_key: v.public_key.to_string().parse().unwrap(),
                    stake: near_primitives::types::Balance::from_yoctonear(v.stake.0),
                },
            )
        })
        .collect();
    hb(&official)
}
fn header() -> Header {
    Header {
        prev_block_hash: [1; 32],
        inner_rest_hash: [2; 32],
        inner_lite: InnerLite {
            height: U64(0),
            epoch_id: [3; 32],
            next_epoch_id: [4; 32],
            prev_state_root: [5; 32],
            outcome_root: [6; 32],
            timestamp: U64(0),
            next_bp_hash: [7; 32],
            block_merkle_root: [8; 32],
        },
    }
}
fn path(count: usize) -> Vec<PathItem> {
    (0..count)
        .map(|i| PathItem {
            hash: h(&i.to_le_bytes()),
            direction: Direction::Right,
        })
        .collect()
}
fn root(mut hash: Hash, path: &[PathItem]) -> Hash {
    for p in path {
        hash = match p.direction {
            Direction::Left => pair(p.hash, hash),
            Direction::Right => pair(hash, p.hash),
        };
    }
    hash
}
fn proof(
    id: Hash,
    executor: near_sdk::AccountId,
    status: Status,
    marker: Option<String>,
    child: Hash,
    height: u64,
    timestamp: u64,
) -> OutcomeProof {
    let mut logs = vec!["x".repeat(512); 8];
    if let Some(marker) = marker {
        logs[0] = marker;
    }
    let outcome = PartialOutcome {
        receipt_ids: vec![child; 16],
        gas_burnt: u64::MAX,
        tokens_burnt: U128(u128::MAX),
        executor_id: executor,
        status,
    };
    let mut hashes = vec![id, hb(&outcome)];
    hashes.extend(logs.iter().map(|s| h(s.as_bytes())));
    let proof = path(64);
    let outcome_root_proof = path(64);
    let mut block_header_lite = header();
    block_header_lite.inner_lite.height = U64(height);
    block_header_lite.inner_lite.timestamp = U64(timestamp);
    block_header_lite.inner_lite.outcome_root =
        root(h(&root(hb(&hashes), &proof)), &outcome_root_proof);
    let block_hash = hh(&block_header_lite);
    OutcomeProof {
        id,
        block_hash,
        outcome,
        logs,
        proof,
        outcome_root_proof,
        block_header_lite,
        block_proof: vec![],
    }
}
fn padded(mut args: Value, size: usize) -> Vec<u8> {
    args["benchmark_padding"] = json!("");
    let length = serde_json::to_vec(&args).unwrap().len();
    assert!(
        length <= size,
        "structured arguments already exceed limit: {length}"
    );
    args["benchmark_padding"] = json!("x".repeat(size - length));
    let bytes = serde_json::to_vec(&args).unwrap();
    assert_eq!(bytes.len(), size);
    bytes
}
async fn call(d: &Desk, method: &str, bytes: Vec<u8>, owner: bool) -> Result<ExecutionFinalResult> {
    let account = if owner { &d.owner } else { &d.worker_full };
    let mut tx = account
        .call(d.vault.id(), method)
        .args(bytes)
        .gas(Gas::from_tgas(300));
    if owner {
        tx = tx.deposit(NearToken::from_yoctonear(1));
    }
    Ok(tx.transact().await?)
}
fn succeeded(result: &ExecutionFinalResult) -> Result<()> {
    ensure!(result.is_success(), "{result:?}");
    Ok(())
}
fn rejected(result: &ExecutionFinalResult, reason: &str) -> Result<()> {
    ensure!(
        result.is_failure() && format!("{result:?}").contains(reason),
        "expected {reason}: {result:?}"
    );
    Ok(())
}
async fn snapshot(d: &Desk) -> Result<Value> {
    Ok(
        json!({"vault":d.state().await?,"payment":d.payment(1).await?,"order":d.order("article").await?,
        "claim":d.view("get_invoice_attempt",json!({"invoice_id":"inv"})).await?,
        "record":d.view("get_repair_record",json!({"attempt_id":"1"})).await?}),
    )
}
fn retain(name: &str, value: &Value) -> Result<()> {
    let dir =
        PathBuf::from(std::env::var_os("PAYSCOPE_EVIDENCE_DIR").context("evidence directory")?);
    std::fs::create_dir_all(&dir)?;
    std::fs::write(dir.join(name), serde_json::to_vec_pretty(value)?)?;
    Ok(())
}

#[tokio::test]
async fn maximum_verifier_inputs_and_atomic_vm_failures() -> Result<()> {
    let mut measurements = vec![];
    for success in [true, false] {
        let d = Desk::new("fault-record-gas", NEAR).await?;
        d.owner
            .call(d.vault.id(), "fund_storage")
            .deposit(NearToken::from_near(3))
            .transact()
            .await?
            .into_result()?;
        d.admin("set_paused", json!({"paused":true})).await?;
        let mut bootstrap = header();
        let next_bps = validators(128);
        bootstrap.inner_lite.next_bp_hash = bps_hash(&next_bps);
        let checkpoint = Checkpoint {
            head: bootstrap.clone(),
            current_bps: validators(0),
            next_bps,
        };
        let args = json!({"checkpoint":checkpoint});
        let mut too_many = args.clone();
        let extra = too_many["checkpoint"]["current_bps"][0].clone();
        too_many["checkpoint"]["current_bps"]
            .as_array_mut()
            .unwrap()
            .push(extra);
        rejected(
            &call(
                &d,
                "initialize_repair_checkpoint",
                serde_json::to_vec(&too_many)?,
                true,
            )
            .await?,
            "VALIDATOR_LIMIT",
        )?;
        let before = d.vault.as_account().view_account().await?.storage_usage;
        let bootstrap_result = call(
            &d,
            "initialize_repair_checkpoint",
            padded(args, LIMIT),
            true,
        )
        .await?;
        succeeded(&bootstrap_result)?;
        let checkpoint_bytes = d.vault.as_account().view_account().await?.storage_usage - before;
        if !success {
            d.admin(
                "register_vendor",
                json!({"vendor_id":"writer","recipient":format!("missing.{}",d.owner.id())}),
            )
            .await?;
        }
        d.admin("set_paused", json!({"paused":false})).await?;
        d.approve("article", NEAR).await?;
        let mut execute_args = d.args("article", "inv", NEAR);
        execute_args["recipient"] = d.order("article").await?["recipient"].clone();
        let recipient_before = d.recipient.view_account().await?.balance.as_yoctonear();
        let transfer_result = d.execute(execute_args).await?;
        ensure!(d.payment(1).await?["status"] == "Pending");
        let recipient_after = d.recipient.view_account().await?.balance.as_yoctonear();
        ensure!(recipient_after - recipient_before == if success { NEAR } else { 0 });
        let initiation = transfer_result
            .receipt_outcomes()
            .iter()
            .find(|o| {
                o.logs
                    .iter()
                    .any(|s| s.starts_with("PAYSCOPE_TRANSFER_V1:"))
            })
            .context("marker")?;
        let marker = initiation
            .logs
            .iter()
            .find(|s| s.starts_with("PAYSCOPE_TRANSFER_V1:"))
            .unwrap()
            .clone();
        d.admin("set_paused", json!({"paused":true})).await?;
        d.admin("revoke_agent", json!({})).await?;
        let now = d.chain.view_block().await?;
        let timestamp: u64 = d.payment(1).await?["initiated_at_ns"]
            .as_str()
            .unwrap()
            .parse()?;
        let start_id = h(b"synthetic-initiation");
        let transfer_id = h(b"synthetic-transfer");
        let mut start = proof(
            start_id,
            d.vault.id().clone(),
            Status::SuccessReceiptId([9; 32]),
            Some(marker),
            transfer_id,
            now.height() - 3,
            timestamp,
        );
        let mut transfer = proof(
            transfer_id,
            d.order("article").await?["recipient"]
                .as_str()
                .unwrap()
                .parse()?,
            if success {
                Status::SuccessValue(vec![])
            } else {
                Status::Failure
            },
            None,
            [10; 32],
            now.height() - 2,
            timestamp,
        );
        let old = hh(&bootstrap);
        let a = start.block_hash;
        let b = transfer.block_hash;
        let dummy = [255; 32];
        let left = pair(old, a);
        let right = pair(b, dummy);
        let tail = path(62);
        let mut ancestry = vec![
            PathItem {
                hash: a,
                direction: Direction::Right,
            },
            PathItem {
                hash: right,
                direction: Direction::Right,
            },
        ];
        ancestry.extend(tail.clone());
        start.block_proof = vec![
            PathItem {
                hash: old,
                direction: Direction::Left,
            },
            PathItem {
                hash: right,
                direction: Direction::Right,
            },
        ];
        start.block_proof.extend(tail.clone());
        transfer.block_proof = vec![
            PathItem {
                hash: dummy,
                direction: Direction::Right,
            },
            PathItem {
                hash: left,
                direction: Direction::Left,
            },
        ];
        transfer.block_proof.extend(tail.clone());
        let following = validators(256);
        let mut head = header();
        head.inner_lite.height = U64(now.height() - 1);
        head.inner_lite.timestamp = U64(now.timestamp() - 1);
        head.inner_lite.epoch_id = [4; 32];
        head.inner_lite.next_epoch_id = [11; 32];
        head.inner_lite.next_bp_hash = bps_hash(&following);
        head.inner_lite.block_merkle_root = root(pair(left, right), &tail);
        let mut message = vec![0];
        message.extend(pair([12; 32], hh(&head)));
        message.extend((head.inner_lite.height.0 + 2).to_le_bytes());
        let update = Update {
            header: head,
            next_block_inner_hash: [12; 32],
            next_bps: Some(following),
            approvals_after_next: (128..384)
                .map(|i| Some(Base64VecU8(key(i).sign(&message).to_bytes().to_vec())))
                .collect(),
            ancestry,
        };
        let update_args = json!({"update":update});
        let mut oversized_path = update_args.clone();
        oversized_path["update"]["ancestry"]
            .as_array_mut()
            .unwrap()
            .push(json!({"hash":vec![0u8;32],"direction":"Right"}));
        rejected(
            &call(
                &d,
                "advance_repair_head",
                serde_json::to_vec(&oversized_path)?,
                false,
            )
            .await?,
            "PROOF_PATH_LIMIT",
        )?;
        let mut extra_approval = update_args.clone();
        extra_approval["update"]["approvals_after_next"]
            .as_array_mut()
            .unwrap()
            .push(Value::Null);
        rejected(
            &call(
                &d,
                "advance_repair_head",
                serde_json::to_vec(&extra_approval)?,
                false,
            )
            .await?,
            "SIGNATURE_LIMIT",
        )?;
        let anchor_before = d.view("get_repair_checkpoint", json!({})).await?;
        rejected(
            &call(
                &d,
                "advance_repair_head",
                padded(update_args.clone(), LIMIT + 1),
                false,
            )
            .await?,
            "PROOF_INPUT_LIMIT",
        )?;
        ensure!(anchor_before == d.view("get_repair_checkpoint", json!({})).await?);
        let update_result = call(
            &d,
            "advance_repair_head",
            padded(update_args.clone(), LIMIT),
            false,
        )
        .await?;
        succeeded(&update_result)?;
        rejected(
            &call(
                &d,
                "advance_repair_head",
                serde_json::to_vec(&update_args)?,
                false,
            )
            .await?,
            "STALE_HEAD",
        )?;
        let repair = json!({"attempt_id":"1","initiation":start,"transfer":transfer});
        let state = snapshot(&d).await?;
        rejected(
            &call(
                &d,
                "repair_payment",
                padded(repair.clone(), LIMIT + 1),
                false,
            )
            .await?,
            "PROOF_INPUT_LIMIT",
        )?;
        let mut long_path = repair.clone();
        long_path["transfer"]["proof"]
            .as_array_mut()
            .unwrap()
            .push(json!({"hash":vec![0u8;32],"direction":"Right"}));
        rejected(
            &call(&d, "repair_payment", serde_json::to_vec(&long_path)?, false).await?,
            "PROOF_PATH_LIMIT",
        )?;
        ensure!(snapshot(&d).await? == state);
        let mut failures = vec![];
        for fault in ["fault-finalize-gas", "fault-finalize-storage"] {
            d.vault
                .as_account()
                .deploy(&artifact(fault)?)
                .await?
                .into_result()?;
            let before = snapshot(&d).await?;
            let failed = call(&d, "repair_payment", padded(repair.clone(), LIMIT), false).await?;
            let reason = if fault.ends_with("storage") {
                "LackBalanceForState"
            } else {
                "GasExceeded"
            };
            let debug = format!("{failed:?}");
            ensure!(
                failed.is_failure()
                    && (debug.contains(reason)
                    || (fault.ends_with("gas") && (debug.contains("GasLimitExceeded")
                        || debug.to_ascii_lowercase().contains("exceeded the prepaid gas")
                        || debug.contains("Exceeded the maximum amount of gas allowed to burn per contract")))),
                "{fault}: {failed:?}"
            );
            ensure!(
                snapshot(&d).await? == before,
                "{fault}: partial finalization"
            );
            ensure!(
                number(&d.state().await?, "reserved") == NEAR
                    && number(&d.state().await?, "spent") == 0
            );
            failures.push(json!({"fault":fault,"gas":failed.total_gas_burnt.as_gas(),"all_payment_claim_ledger_audit_state_unchanged":true,"outcome":debug}));
        }
        d.vault
            .as_account()
            .deploy(&artifact("vault")?)
            .await?
            .into_result()?;
        let before = d.vault.as_account().view_account().await?.storage_usage;
        let repaired = call(&d, "repair_payment", padded(repair.clone(), LIMIT), false).await?;
        succeeded(&repaired)?;
        let repair_bytes = d.vault.as_account().view_account().await?.storage_usage - before;
        ensure!(d.payment(1).await?["status"] == if success { "Paid" } else { "Failed" });
        ensure!(
            number(&d.state().await?, "reserved") == 0
                && number(&d.state().await?, "spent") == if success { NEAR } else { 0 }
        );
        rejected(
            &call(&d, "repair_payment", serde_json::to_vec(&repair)?, false).await?,
            "REPAIR_NOT_PENDING",
        )?;
        measurements.push(json!({"synthetic_authenticated_vm_workload":true,"real_chain_consensus_evidence":false,
            "transfer_success":success,"validators_per_set":128,"verified_signatures":128,"approval_slots":256,"path_siblings":64,"paths_in_repair":6,
            "request_bytes":LIMIT,"structured_update_bytes":serde_json::to_vec(&update_args)?.len(),"structured_repair_bytes":serde_json::to_vec(&repair)?.len(),
            "checkpoint_gas":bootstrap_result.total_gas_burnt.as_gas(),"checkpoint_storage_bytes":checkpoint_bytes,
            "update_gas":update_result.total_gas_burnt.as_gas(),"repair_gas":repaired.total_gas_burnt.as_gas(),"repair_storage_bytes":repair_bytes,
            "recipient_delta":(recipient_after-recipient_before).to_string(),"failures":failures}));
        retain(
            "verifier-bounds.json",
            &json!({"measurements":measurements}),
        )?;
    }
    Ok(())
}
