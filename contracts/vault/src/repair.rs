//! Bounded NEAR protocol-86 light-client and execution-outcome verification.
//! The initial finalized checkpoint + ordered current validator set are a trusted bootstrap.
//! They are frozen before the first attempt; no owner-supplied post-incident root is accepted.
use near_sdk::{
    borsh, env,
    json_types::{Base64VecU8, U128, U64},
    near, require, AccountId, PublicKey,
};

pub type Hash = [u8; 32];
pub const STATE_KEY: &[u8] = b"payscope:repair:v1:light-client";
pub const MAX_VALIDATORS: usize = 128;

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct InnerLite {
    pub height: U64,
    pub epoch_id: Hash,
    pub next_epoch_id: Hash,
    pub prev_state_root: Hash,
    pub outcome_root: Hash,
    pub timestamp: U64,
    pub next_bp_hash: Hash,
    pub block_merkle_root: Hash,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Header {
    pub prev_block_hash: Hash,
    pub inner_rest_hash: Hash,
    pub inner_lite: InnerLite,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Validator {
    pub account_id: AccountId,
    pub public_key: PublicKey,
    pub stake: U128,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub enum Direction {
    Left,
    Right,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct PathItem {
    pub hash: Hash,
    pub direction: Direction,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Checkpoint {
    pub head: Header,
    pub current_bps: Vec<Validator>,
    pub next_bps: Vec<Validator>,
}

#[near(serializers = [json])]
pub struct Update {
    pub header: Header,
    pub next_block_inner_hash: Hash,
    pub next_bps: Option<Vec<Validator>>,
    // Ed25519 signature bytes, without the scheme byte, encoded as base64.
    pub approvals_after_next: Vec<Option<Base64VecU8>>,
    pub ancestry: Vec<PathItem>,
}

// Exact PartialExecutionStatus Borsh discriminants from near-primitives 0.37.4.
#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub enum Status {
    Unknown,
    Failure,
    SuccessValue(Vec<u8>),
    SuccessReceiptId(Hash),
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct PartialOutcome {
    pub receipt_ids: Vec<Hash>,
    pub gas_burnt: u64,
    pub tokens_burnt: U128,
    pub executor_id: AccountId,
    pub status: Status,
}

#[near(serializers = [json])]
#[derive(Clone)]
pub struct OutcomeProof {
    pub id: Hash,
    pub block_hash: Hash,
    pub outcome: PartialOutcome,
    pub logs: Vec<String>,
    pub proof: Vec<PathItem>,
    pub outcome_root_proof: Vec<PathItem>,
    pub block_header_lite: Header,
    pub block_proof: Vec<PathItem>,
}

#[near(serializers = [borsh, json])]
pub struct RepairRecord {
    pub attempt_id: U64,
    pub checkpoint_hash: Hash,
    pub initiation_receipt: Hash,
    pub transfer_receipt: Hash,
    pub succeeded: bool,
}

pub fn hash(bytes: &[u8]) -> Hash {
    env::sha256_array(bytes)
}
pub fn hash_borsh<T: borsh::BorshSerialize>(value: &T) -> Hash {
    hash(&borsh::to_vec(value).expect("PROOF_ENCODING"))
}
pub fn combine(a: &Hash, b: &Hash) -> Hash {
    let mut pair = [0; 64];
    pair[..32].copy_from_slice(a);
    pair[32..].copy_from_slice(b);
    hash(&pair)
}
impl Header {
    pub fn hash(&self) -> Hash {
        combine(
            &combine(&hash_borsh(&self.inner_lite), &self.inner_rest_hash),
            &self.prev_block_hash,
        )
    }
}

pub fn root(mut leaf: Hash, path: &[PathItem]) -> Hash {
    require!(path.len() <= 64, "PROOF_PATH_LIMIT");
    for item in path {
        leaf = match item.direction {
            Direction::Left => combine(&item.hash, &leaf),
            Direction::Right => combine(&leaf, &item.hash),
        };
    }
    leaf
}

pub fn validate_validators(bps: &[Validator]) {
    require!(
        !bps.is_empty() && bps.len() <= MAX_VALIDATORS,
        "VALIDATOR_LIMIT"
    );
    for (i, bp) in bps.iter().enumerate() {
        require!(bp.stake.0 > 0, "ZERO_STAKE");
        require!(
            bp.public_key.as_bytes().len() == 33 && bp.public_key.as_bytes()[0] == 0,
            "UNSUPPORTED_VALIDATOR_KEY"
        );
        require!(
            !bps[..i]
                .iter()
                .any(|other| other.account_id == bp.account_id),
            "DUPLICATE_VALIDATOR"
        );
    }
    total_stake(bps);
}
fn total_stake(bps: &[Validator]) -> u128 {
    bps.iter().fold(0u128, |total, bp| {
        total.checked_add(bp.stake.0).expect("STAKE_OVERFLOW")
    })
}

pub fn validators_hash(bps: &[Validator]) -> Hash {
    // ValidatorStakeView::V1 is Borsh enum tag 0 followed by its V1 fields.
    let mut bytes = (u32::try_from(bps.len()).expect("VALIDATOR_LIMIT"))
        .to_le_bytes()
        .to_vec();
    for bp in bps {
        bytes.push(0);
        bytes.extend(borsh::to_vec(&bp.account_id).expect("VALIDATOR_ENCODING"));
        // near-crypto PublicKey is scheme + fixed key bytes. SDK PublicKey's
        // storage serialization wraps a Vec and would add an incorrect length.
        bytes.extend(bp.public_key.as_bytes());
        bytes.extend(bp.stake.0.to_le_bytes());
    }
    hash(&bytes)
}

impl Checkpoint {
    pub fn validate_bootstrap(&self) {
        validate_validators(&self.current_bps);
        validate_validators(&self.next_bps);
        require!(
            validators_hash(&self.next_bps) == self.head.inner_lite.next_bp_hash,
            "NEXT_BPS_HASH"
        );
        require!(
            self.head.inner_lite.height.0 <= env::block_height()
                && self.head.inner_lite.timestamp.0 <= env::block_timestamp(),
            "FUTURE_CHECKPOINT"
        );
        require!(
            self.head.inner_lite.epoch_id != self.head.inner_lite.next_epoch_id,
            "INVALID_EPOCHS"
        );
    }

    pub fn advance(&mut self, update: Update) {
        let next = &update.header.inner_lite;
        let old = &self.head.inner_lite;
        require!(
            next.height.0 > old.height.0 && next.timestamp.0 > old.timestamp.0,
            "STALE_HEAD"
        );
        require!(
            next.height.0 <= env::block_height() && next.timestamp.0 <= env::block_timestamp(),
            "FUTURE_HEAD"
        );
        require!(
            root(self.head.hash(), &update.ancestry) == next.block_merkle_root,
            "HEAD_ANCESTRY"
        );
        let transition = next.epoch_id == old.next_epoch_id;
        require!(next.epoch_id == old.epoch_id || transition, "UNKNOWN_EPOCH");
        require!(
            !transition || update.next_bps.is_some(),
            "NEXT_EPOCH_BPS_REQUIRED"
        );
        let signers = if transition {
            &self.next_bps
        } else {
            &self.current_bps
        };
        require!(
            update.approvals_after_next.len() <= 2 * MAX_VALIDATORS,
            "SIGNATURE_LIMIT"
        );
        let mut message = vec![0u8]; // ApprovalInner::Endorsement
        message.extend(combine(
            &update.next_block_inner_hash,
            &update.header.hash(),
        ));
        message.extend(
            next.height
                .0
                .checked_add(2)
                .expect("HEIGHT_OVERFLOW")
                .to_le_bytes(),
        );
        let mut approved = 0u128;
        // Missing entries contribute zero; total ALWAYS includes every validator's stake.
        for (i, bp) in signers.iter().enumerate() {
            if let Some(Some(signature)) = update.approvals_after_next.get(i) {
                let signature: &[u8; 64] =
                    signature.0.as_slice().try_into().expect("SIGNATURE_LENGTH");
                let public_key: &[u8; 32] = bp.public_key.as_bytes()[1..]
                    .try_into()
                    .expect("KEY_LENGTH");
                require!(
                    env::ed25519_verify(signature, &message, public_key),
                    "INVALID_APPROVAL"
                );
                approved = approved.checked_add(bp.stake.0).expect("STAKE_OVERFLOW");
            }
        }
        let total = total_stake(signers);
        // floor(2*total/3), without multiplying total and overflowing u128.
        let threshold = (total / 3) * 2 + ((total % 3) * 2) / 3;
        require!(approved > threshold, "INSUFFICIENT_APPROVAL_STAKE");
        let following = if let Some(bps) = update.next_bps {
            validate_validators(&bps);
            require!(validators_hash(&bps) == next.next_bp_hash, "NEXT_BPS_HASH");
            bps
        } else {
            require!(
                next.next_epoch_id == old.next_epoch_id && next.next_bp_hash == old.next_bp_hash,
                "NEXT_BPS_CHANGED"
            );
            self.next_bps.clone()
        };
        if transition {
            self.current_bps = self.next_bps.clone();
        }
        self.next_bps = following;
        self.head = update.header;
    }
}

impl OutcomeProof {
    pub fn verify(&self, checkpoint: &Checkpoint) {
        require!(
            self.outcome.receipt_ids.len() <= 16 && self.logs.len() <= 8,
            "OUTCOME_LIMIT"
        );
        require!(self.logs.iter().all(|s| s.len() <= 512), "LOG_LIMIT");
        if let Status::SuccessValue(value) = &self.outcome.status {
            require!(value.len() <= 128, "RESULT_LIMIT");
        }
        let mut hashes = vec![self.id, hash_borsh(&self.outcome)];
        hashes.extend(self.logs.iter().map(|s| hash(s.as_bytes())));
        let shard_root = root(hash_borsh(&hashes), &self.proof);
        let outcome_root = root(hash(&shard_root), &self.outcome_root_proof);
        require!(
            outcome_root == self.block_header_lite.inner_lite.outcome_root,
            "OUTCOME_PROOF"
        );
        let block_hash = self.block_header_lite.hash();
        require!(block_hash == self.block_hash, "OUTCOME_BLOCK_HASH");
        let head = &checkpoint.head;
        require!(
            self.block_header_lite.inner_lite.height.0 <= head.inner_lite.height.0,
            "UNFINALIZED_OUTCOME"
        );
        if block_hash == head.hash() {
            require!(self.block_proof.is_empty(), "HEAD_PROOF_NOT_EMPTY");
        } else {
            require!(
                root(block_hash, &self.block_proof) == head.inner_lite.block_merkle_root,
                "BLOCK_INCLUSION"
            );
        }
    }
}

pub fn load() -> Checkpoint {
    borsh::from_slice(&env::storage_read(STATE_KEY).expect("REPAIR_NOT_CONFIGURED"))
        .expect("REPAIR_STATE")
}
pub fn save(checkpoint: &Checkpoint) {
    env::storage_write(
        STATE_KEY,
        &borsh::to_vec(checkpoint).expect("REPAIR_ENCODING"),
    );
}
pub fn record_key(attempt: U64) -> Vec<u8> {
    [
        b"payscope:repair:v1:attempt:".as_slice(),
        &attempt.0.to_le_bytes(),
    ]
    .concat()
}
pub fn used_receipt_key(receipt: &Hash) -> Vec<u8> {
    [b"payscope:repair:v1:receipt:".as_slice(), receipt].concat()
}
