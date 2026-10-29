import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeBase58, normalizeHeader, normalizeOutcomeProof, normalizeUpdate } from '../src/near-proof.ts';
const z = '1'.repeat(32);
function header() { return { prev_block_hash: z, inner_rest_hash: z, inner_lite: {
  height: 20, epoch_id: z, next_epoch_id: z, prev_state_root: z, outcome_root: z,
  timestamp: 1793232000000000000, timestamp_nanosec: '1793232000000000001', next_bp_hash: z, block_merkle_root: z } }; }
function proof() { return { block_header_lite: header(), block_proof: [], outcome_root_proof: [],
  outcome_proof: { id: z, block_hash: z, proof: [], outcome: { receipt_ids: [z], gas_burnt: 100,
    tokens_burnt: '900719925474099312345', executor_id: 'writer.testnet', logs: [], status: { SuccessValue: '' } } } }; }
test('decodes exactly sized base58 hashes and leading zeros', () => {
  assert.deepEqual(decodeBase58(z, 32), Array(32).fill(0));
  assert.deepEqual(decodeBase58('12', 2), [0, 1]);
  for (const invalid of ['0', 'O', '', z + '1', '1']) assert.throws(() => decodeBase58(invalid, 32));
});
test('uses exact nanosecond string rather than rounded legacy timestamp', () => {
  assert.equal(normalizeHeader(header()).inner_lite.timestamp, '1793232000000000001');
});
test('normalizes native transfer success without changing exact token values', () => {
  const result = normalizeOutcomeProof(proof());
  assert.deepEqual(result.outcome.status, { SuccessValue: [] });
  assert.equal(result.outcome.tokens_burnt, '900719925474099312345');
});
test('normalizes failure to the protocol partial status without treating unknown as failure', () => {
  const p = proof() as any; p.outcome_proof.outcome.status = { Failure: { ActionError: 'detail' } };
  assert.equal(normalizeOutcomeProof(p).outcome.status, 'Failure');
  p.outcome_proof.outcome.status = 'Unknown';
  assert.equal(normalizeOutcomeProof(p).outcome.status, 'Unknown');
});
test('rejects unsafe or malformed numeric fields', () => {
  for (const bad of [1, '01', '-1', '1e24', String(1n << 128n)]) {
    const p = proof() as any; p.outcome_proof.outcome.tokens_burnt = bad;
    assert.throws(() => normalizeOutcomeProof(p));
  }
  const p = proof(); p.outcome_proof.outcome.gas_burnt = 2 ** 60;
  assert.throws(() => normalizeOutcomeProof(p));
});
test('rejects ambiguous statuses, noncanonical base64 and oversized paths', () => {
  const p = proof() as any;
  for (const bad of [{ SuccessValue: '=', Failure: {} }, { SuccessValue: '???' }, { SuccessValue: 'AQ' }]) {
    p.outcome_proof.outcome.status = bad; assert.throws(() => normalizeOutcomeProof(p));
  }
  p.outcome_proof.outcome.status = { SuccessValue: '' };
  p.block_proof = Array(65).fill({ hash: z, direction: 'Left' });
  assert.throws(() => normalizeOutcomeProof(p));
});
test('rejects unsupported signature schemes and malformed Ed25519 signatures', () => {
  const b = { ...header(), next_block_inner_hash: z, next_bps: null, approvals_after_next: [null] } as any;
  assert.deepEqual(normalizeUpdate(b, []).approvals_after_next, [null]);
  for (const sig of ['secp256k1:abc', 'ed25519:111']) {
    b.approvals_after_next = [sig]; assert.throws(() => normalizeUpdate(b, []));
  }
});
