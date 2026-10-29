use super::*;
use crate::repair::*;
use ed25519_dalek::{Signer, SigningKey};

fn header(outcome_root: Hash) -> Header {
    Header {
        prev_block_hash: [1; 32],
        inner_rest_hash: [2; 32],
        inner_lite: InnerLite {
            height: U64(50),
            epoch_id: [3; 32],
            next_epoch_id: [4; 32],
            prev_state_root: [5; 32],
            outcome_root,
            timestamp: U64(100),
            next_bp_hash: [6; 32],
            block_merkle_root: [7; 32],
        },
    }
}
fn validator(seed: u8, stake: u128) -> Validator {
    let public = SigningKey::from_bytes(&[seed; 32])
        .verifying_key()
        .to_bytes();
    Validator {
        account_id: account(&format!("validator{seed}.testnet")),
        public_key: PublicKey::from_parts(near_sdk::CurveType::ED25519, public.to_vec()).unwrap(),
        stake: U128(stake),
    }
}
fn outcome(
    id: Hash,
    recipient: AccountId,
    status: Status,
    receipts: Vec<Hash>,
    logs: Vec<String>,
) -> OutcomeProof {
    OutcomeProof {
        id,
        block_hash: [0; 32],
        outcome: PartialOutcome {
            receipt_ids: receipts,
            gas_burnt: 1,
            tokens_burnt: U128(2),
            executor_id: recipient,
            status,
        },
        logs,
        proof: vec![],
        outcome_root_proof: vec![],
        block_header_lite: header([0; 32]),
        block_proof: vec![],
    }
}
fn leaf(p: &OutcomeProof) -> Hash {
    let mut hashes = vec![p.id, hash_borsh(&p.outcome)];
    hashes.extend(p.logs.iter().map(|s| hash(s.as_bytes())));
    hash_borsh(&hashes)
}
fn proofs(v: &Vault, attempt: u64, success: bool) -> (OutcomeProof, OutcomeProof) {
    // Synthetic consensus fixture only: isolate Merkle + attempt binding from finality tests.
    // Sandbox tests must separately use actual RPC-generated proofs and signed head updates.
    let payment = v.payments.get(&attempt).unwrap();
    let mut start = outcome(
        [8; 32],
        account("vault.testnet"),
        Status::SuccessReceiptId([10; 32]),
        vec![[9; 32], [10; 32]],
        vec![v.transfer_marker(U64(attempt), &payment)],
    );
    let mut transfer = outcome(
        [9; 32],
        payment.recipient,
        if success {
            Status::SuccessValue(vec![])
        } else {
            Status::Failure
        },
        vec![],
        vec![],
    );
    reanchor(&mut start, &mut transfer);
    (start, transfer)
}
fn reanchor(start: &mut OutcomeProof, transfer: &mut OutcomeProof) {
    let (a, b) = (leaf(start), leaf(transfer));
    let h = header(hash(&combine(&a, &b)));
    start.proof = vec![PathItem {
        hash: b,
        direction: Direction::Right,
    }];
    transfer.proof = vec![PathItem {
        hash: a,
        direction: Direction::Left,
    }];
    start.block_hash = h.hash();
    transfer.block_hash = h.hash();
    start.block_header_lite = h.clone();
    transfer.block_header_lite = h.clone();
    save(&Checkpoint {
        head: h,
        current_bps: vec![validator(1, 1)],
        next_bps: vec![validator(1, 1)],
    });
}

#[test]
fn valid_receipt_proof_repairs_success_and_keeps_invoice_claim() {
    let mut v = fixture();
    execute(&mut v, "invoice");
    let (a, b) = proofs(&v, 1, true);
    testing_env!(context("anyone.testnet", 0, 200));
    assert_eq!(v.repair_payment(U64(1), a, b), PaymentStatus::Paid);
    assert_eq!(v.reserved, 0);
    assert_eq!(v.spent, 2 * NEAR);
    assert_eq!(v.invoices.get(&"invoice".into()), Some(U64(1)));
    assert!(v.get_repair_record(U64(1)).unwrap().succeeded);
    assert_eq!(result(&mut v, 1, false), PaymentStatus::Paid);
    assert_eq!(v.reconcile_payment(U64(1)), PaymentStatus::Paid);
    invariants(&v);
}

#[test]
#[should_panic(expected = "TRANSFER_NOT_TERMINAL")]
fn authenticated_unknown_outcome_cannot_release_reservation() {
    let mut v = fixture();
    execute(&mut v, "invoice");
    let (mut a, mut b) = proofs(&v, 1, true);
    b.outcome.status = Status::Unknown;
    reanchor(&mut a, &mut b);
    v.repair_payment(U64(1), a, b);
}

#[test]
#[should_panic(expected = "ATTEMPT_EVIDENCE_MISMATCH")]
fn finalized_evidence_for_an_old_attempt_cannot_repair_a_retry() {
    let mut v = fixture();
    execute(&mut v, "invoice");
    result(&mut v, 1, false);
    v.reconcile_payment(U64(1));
    execute(&mut v, "new-invoice");
    let (a, b) = proofs(&v, 1, true);
    v.repair_payment(U64(2), a, b);
}

#[test]
#[should_panic(expected = "TRANSFER_RECEIPT_LINK")]
fn authenticated_but_unrelated_transfer_is_rejected() {
    let mut v = fixture();
    execute(&mut v, "invoice");
    let (mut a, mut b) = proofs(&v, 1, true);
    a.outcome.receipt_ids[0] = [99; 32];
    reanchor(&mut a, &mut b);
    v.repair_payment(U64(1), a, b);
}

#[test]
#[should_panic(expected = "AMBIGUOUS_INITIATION")]
fn multi_payment_receipt_cannot_lend_evidence_to_another_attempt() {
    let mut v = fixture();
    execute(&mut v, "invoice");
    let (mut a, mut b) = proofs(&v, 1, true);
    a.logs.push("PAYSCOPE_TRANSFER_V1:another-attempt".into());
    reanchor(&mut a, &mut b);
    v.repair_payment(U64(1), a, b);
}

#[test]
#[should_panic(expected = "CHECKPOINT_ALREADY_SET")]
fn bootstrap_is_frozen_even_before_first_payment() {
    let mut v = fixture();
    owner();
    v.set_paused(true);
    let bps = vec![validator(1, 1)];
    let mut h = header([0; 32]);
    h.inner_lite.height = U64(0);
    h.inner_lite.timestamp = U64(0);
    h.inner_lite.next_bp_hash = validators_hash(&bps);
    let checkpoint = Checkpoint {
        head: h,
        current_bps: bps.clone(),
        next_bps: bps,
    };
    v.initialize_repair_checkpoint(checkpoint.clone());
    v.initialize_repair_checkpoint(checkpoint);
}

#[test]
fn valid_failure_proof_releases_claim_and_preserves_revocation() {
    let mut v = fixture();
    execute(&mut v, "invoice");
    let (a, b) = proofs(&v, 1, false);
    owner();
    v.revoke_work_order("order".into());
    assert_eq!(v.repair_payment(U64(1), a, b), PaymentStatus::Failed);
    assert_eq!(v.reserved, 0);
    assert_eq!(v.spent, 0);
    assert_eq!(v.invoices.get(&"invoice".into()), None);
    assert!(!v.orders.get(&"order".into()).unwrap().enabled);
    invariants(&v);
}

#[test]
#[should_panic(expected = "REPAIR_NOT_PENDING")]
fn repaired_proof_cannot_be_replayed() {
    let mut v = fixture();
    execute(&mut v, "invoice");
    let (a, b) = proofs(&v, 1, true);
    v.repair_payment(U64(1), a.clone(), b.clone());
    v.repair_payment(U64(1), a, b);
}

#[test]
#[should_panic(expected = "OUTCOME_PROOF")]
fn tampered_outcome_cannot_release_reservation() {
    let mut v = fixture();
    execute(&mut v, "invoice");
    let (a, mut b) = proofs(&v, 1, true);
    b.outcome.status = Status::Failure;
    v.repair_payment(U64(1), a, b);
}

#[test]
#[should_panic(expected = "RECEIPT_ALREADY_USED")]
fn same_transfer_receipt_is_consumed_only_once() {
    let mut v = fixture();
    execute(&mut v, "invoice");
    let (a, b) = proofs(&v, 1, true);
    env::storage_write(&used_receipt_key(&b.id), &999u64.to_le_bytes());
    v.repair_payment(U64(1), a, b);
}

#[test]
#[should_panic(expected = "CHECKPOINT_BEFORE_PAYMENTS_ONLY")]
fn owner_cannot_install_a_post_incident_checkpoint() {
    let mut v = fixture();
    execute(&mut v, "invoice");
    let (a, _) = proofs(&v, 1, true);
    owner();
    v.set_paused(true);
    v.initialize_repair_checkpoint(Checkpoint {
        head: a.block_header_lite,
        current_bps: vec![validator(1, 1)],
        next_bps: vec![validator(1, 1)],
    });
}

#[test]
fn hash_encodings_match_near_primitives_protocol_types() {
    use near_primitives::hash::CryptoHash;
    testing_env!(context("vault.testnet", 0, 0));
    let v = validator(1, 17);
    let official = near_primitives::views::validator_stake_view::ValidatorStakeView::V1(
        near_primitives::views::ValidatorStakeViewV1 {
            account_id: v.account_id.clone(),
            public_key: v.public_key.to_string().parse().unwrap(),
            stake: near_primitives::types::Balance::from_yoctonear(17),
        },
    );
    assert_eq!(validators_hash(&[v]), hash_borsh(&vec![official]));
    let zero = "11111111111111111111111111111111";
    let raw = near_sdk::serde_json::json!({"id":zero,"block_hash":zero,"proof":[],"outcome":{
        "receipt_ids":[zero],"gas_burnt":1,"tokens_burnt":"2","executor_id":"writer.testnet",
        "logs":["log"],"status":{"SuccessValue":""},"metadata":{"version":1}}});
    let official: near_primitives::views::ExecutionOutcomeWithIdView =
        near_sdk::serde_json::from_value(raw).unwrap();
    let local = outcome(
        [0; 32],
        account("writer.testnet"),
        Status::SuccessValue(vec![]),
        vec![[0; 32]],
        vec!["log".into()],
    );
    assert_eq!(leaf(&local), hash_borsh(&official.to_hashes()));
    let local_header = header([0; 32]);
    let lite = near_primitives::views::BlockHeaderInnerLiteView {
        height: 50,
        epoch_id: CryptoHash([3; 32]),
        next_epoch_id: CryptoHash([4; 32]),
        prev_state_root: CryptoHash([5; 32]),
        outcome_root: CryptoHash([0; 32]),
        timestamp: 100,
        timestamp_nanosec: 100,
        next_bp_hash: CryptoHash([6; 32]),
        block_merkle_root: CryptoHash([7; 32]),
    };
    let official_header = near_primitives::views::LightClientBlockLiteView {
        prev_block_hash: CryptoHash([1; 32]),
        inner_rest_hash: CryptoHash([2; 32]),
        inner_lite: lite,
    };
    assert_eq!(local_header.hash(), official_header.hash().0);
}

fn signed_update(approved: usize) -> (Checkpoint, Update) {
    testing_env!(context("vault.testnet", 0, 1000));
    let bps: Vec<_> = (1..=4).map(|i| validator(i, 1)).collect();
    let mut h = header([0; 32]);
    h.inner_lite.next_bp_hash = validators_hash(&bps);
    let checkpoint = Checkpoint {
        head: h.clone(),
        current_bps: bps.clone(),
        next_bps: bps,
    };
    let mut next = h;
    next.inner_lite.height = U64(51);
    next.inner_lite.timestamp = U64(101);
    next.inner_lite.block_merkle_root = checkpoint.head.hash();
    let mut update = Update {
        header: next,
        next_block_inner_hash: [22; 32],
        next_bps: None,
        approvals_after_next: vec![],
        ancestry: vec![],
    };
    let mut msg = vec![0];
    msg.extend(combine(
        &update.next_block_inner_hash,
        &update.header.hash(),
    ));
    msg.extend(53u64.to_le_bytes());
    update.approvals_after_next = (1..=approved)
        .map(|i| {
            Some(near_sdk::json_types::Base64VecU8(
                SigningKey::from_bytes(&[i as u8; 32])
                    .sign(&msg)
                    .to_bytes()
                    .to_vec(),
            ))
        })
        .collect();
    let mut ctx = context("vault.testnet", 0, 1000);
    ctx.block_index = 1000;
    testing_env!(ctx);
    (checkpoint, update)
}

#[test]
fn validator_supermajority_can_advance_finalized_head() {
    let (mut checkpoint, update) = signed_update(3);
    checkpoint.advance(update);
    assert_eq!(checkpoint.head.inner_lite.height, U64(51));
}

#[test]
fn next_epoch_requires_and_adopts_authenticated_validator_sets() {
    let (mut checkpoint, mut update) = signed_update(3);
    checkpoint.next_bps = (5..=8).map(|i| validator(i, 1)).collect();
    checkpoint.head.inner_lite.next_bp_hash = validators_hash(&checkpoint.next_bps);
    update.header.inner_lite.epoch_id = checkpoint.head.inner_lite.next_epoch_id;
    update.header.inner_lite.next_epoch_id = [44; 32];
    update.header.inner_lite.block_merkle_root = checkpoint.head.hash();
    let following: Vec<_> = (9..=12).map(|i| validator(i, 1)).collect();
    update.header.inner_lite.next_bp_hash = validators_hash(&following);
    update.next_bps = Some(following);
    let mut message = vec![0];
    message.extend(combine(
        &update.next_block_inner_hash,
        &update.header.hash(),
    ));
    message.extend(53u64.to_le_bytes());
    update.approvals_after_next = (5..=7)
        .map(|i| {
            Some(near_sdk::json_types::Base64VecU8(
                SigningKey::from_bytes(&[i; 32])
                    .sign(&message)
                    .to_bytes()
                    .to_vec(),
            ))
        })
        .collect();
    checkpoint.advance(update);
    assert_eq!(
        checkpoint.current_bps[0].account_id,
        account("validator5.testnet")
    );
    assert_eq!(
        checkpoint.next_bps[0].account_id,
        account("validator9.testnet")
    );
}

#[test]
#[should_panic(expected = "INSUFFICIENT_APPROVAL_STAKE")]
fn truncated_approvals_do_not_reduce_total_stake_denominator() {
    let (mut checkpoint, update) = signed_update(2);
    checkpoint.advance(update);
}

#[test]
#[should_panic(expected = "INVALID_APPROVAL")]
fn invalid_validator_signature_cannot_advance_head() {
    let (mut checkpoint, mut update) = signed_update(3);
    update.approvals_after_next[0].as_mut().unwrap().0[0] ^= 1;
    checkpoint.advance(update);
}

#[test]
#[should_panic(expected = "STALE_HEAD")]
fn previously_accepted_head_cannot_be_replayed() {
    let (mut checkpoint, update) = signed_update(3);
    let again = Update {
        header: update.header.clone(),
        next_block_inner_hash: update.next_block_inner_hash,
        next_bps: update.next_bps.clone(),
        approvals_after_next: update.approvals_after_next.clone(),
        ancestry: update.ancestry.clone(),
    };
    checkpoint.advance(update);
    checkpoint.advance(again);
}

#[test]
#[should_panic(expected = "NEXT_BPS_CHANGED")]
fn same_epoch_cannot_replace_a_committed_validator_set() {
    let (mut checkpoint, mut update) = signed_update(3);
    let changed: Vec<_> = (10..=13).map(|i| validator(i, 1)).collect();
    update.header.inner_lite.next_bp_hash = validators_hash(&changed);
    update.next_bps = Some(changed);
    checkpoint.advance(update);
}

#[test]
#[should_panic(expected = "INVALID_EPOCHS")]
fn next_epoch_cannot_alias_current_epoch() {
    let (mut checkpoint, mut update) = signed_update(3);
    update.header.inner_lite.next_epoch_id = update.header.inner_lite.epoch_id;
    checkpoint.advance(update);
}

#[test]
#[should_panic(expected = "SIGNATURE_LIMIT")]
fn approval_vectors_over_the_union_bound_are_rejected() {
    let (mut checkpoint, mut update) = signed_update(3);
    update.approvals_after_next.resize(257, None);
    checkpoint.advance(update);
}

#[test]
#[should_panic(expected = "INSUFFICIENT_APPROVAL_STAKE")]
fn next_epoch_only_approval_tail_cannot_add_current_stake() {
    let (mut checkpoint, mut update) = signed_update(2);
    let tail = update.approvals_after_next[0].clone();
    update.approvals_after_next.resize(4, None);
    update.approvals_after_next.push(tail);
    checkpoint.advance(update);
}

#[test]
#[should_panic(expected = "INSUFFICIENT_APPROVAL_STAKE")]
fn quorum_rounding_never_accepts_only_three_fifths() {
    let (mut checkpoint, update) = signed_update(3);
    checkpoint.current_bps[3].stake = U128(2);
    checkpoint.advance(update);
}

#[test]
fn endorsement_encoding_matches_official_type_at_large_height() {
    use near_primitives::{block_header::ApprovalInner, hash::CryptoHash};
    let next_hash = [123; 32];
    let height = 0x0102_0304_0506_0708u64;
    let mut local = vec![0];
    local.extend(next_hash);
    local.extend(height.to_le_bytes());
    let mut official =
        near_primitives::borsh::to_vec(&ApprovalInner::Endorsement(CryptoHash(next_hash))).unwrap();
    official.extend(height.to_le_bytes());
    assert_eq!(local, official);
}
