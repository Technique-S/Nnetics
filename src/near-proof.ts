/** RPC data normalization only. The vault verifies finality and Merkle proofs independently.
 * This module never signs, submits transactions, selects a checkpoint or treats RPC as truth.
 */
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function decodeBase58(value: unknown, size: number): number[] {
  if (typeof value !== 'string' || !value || value.length > 128) throw new Error('Invalid base58');
  let n = 0n;
  for (const c of value) {
    const digit = alphabet.indexOf(c);
    if (digit < 0) throw new Error('Invalid base58');
    n = n * 58n + BigInt(digit);
  }
  const bytes: number[] = [];
  while (n) { bytes.unshift(Number(n & 255n)); n >>= 8n; }
  for (const c of value) { if (c !== '1') break; bytes.unshift(0); }
  if (bytes.length !== size) throw new Error('Incorrect decoded length');
  return bytes;
}
function uint(value: unknown): string {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return String(value);
  if (typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value)) return value;
  throw new Error('Invalid exact unsigned integer');
}
function u64(value: unknown): string {
  const n = uint(value); if (BigInt(n) > (1n << 64n) - 1n) throw new Error('u64 overflow'); return n;
}
function u128(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Amounts must be decimal strings');
  const n = uint(value); if (BigInt(n) > (1n << 128n) - 1n) throw new Error('u128 overflow'); return n;
}
const hash = (v: unknown) => decodeBase58(v, 32);
function list<T>(value: unknown, maximum: number, convert: (v: any) => T): T[] {
  if (!Array.isArray(value) || value.length > maximum) throw new Error('Array limit');
  return value.map(convert);
}
export function normalizeHeader(raw: any) {
  const h = raw.inner_lite;
  // Protocol-88 adds this optional RPC field for future Spice/V7 headers.
  // A non-null value changes the serialized inner-lite hash. Never silently
  // discard it into this verifier's legacy header format.
  if (h.chunk_execution_root !== undefined && h.chunk_execution_root !== null) throw new Error('Unsupported Spice header');
  return { prev_block_hash: hash(raw.prev_block_hash), inner_rest_hash: hash(raw.inner_rest_hash),
    inner_lite: { height: u64(h.height), epoch_id: hash(h.epoch_id), next_epoch_id: hash(h.next_epoch_id),
      prev_state_root: hash(h.prev_state_root), outcome_root: hash(h.outcome_root),
      timestamp: u64(h.timestamp_nanosec), next_bp_hash: hash(h.next_bp_hash), block_merkle_root: hash(h.block_merkle_root) } };
}
function validator(raw: any) {
  if (raw.validator_stake_struct_version !== 'V1' || typeof raw.account_id !== 'string' || raw.account_id.length > 64) throw new Error('Unsupported validator');
  if (typeof raw.public_key !== 'string' || !raw.public_key.startsWith('ed25519:')) throw new Error('Unsupported validator key');
  decodeBase58(raw.public_key.slice(8), 32);
  return { account_id: raw.account_id, public_key: raw.public_key, stake: u128(raw.stake) };
}
function path(raw: unknown) {
  return list(raw, 64, p => {
    if (p.direction !== 'Left' && p.direction !== 'Right') throw new Error('Invalid direction');
    return { hash: hash(p.hash), direction: p.direction as 'Left' | 'Right' };
  });
}
function status(raw: any): any {
  if (raw === 'Unknown') return 'Unknown';
  if (!raw || typeof raw !== 'object' || Object.keys(raw).length !== 1) throw new Error('Invalid status');
  if ('Failure' in raw) return 'Failure'; // Failure details are excluded by NEAR PartialExecutionStatus.
  if ('SuccessReceiptId' in raw) return { SuccessReceiptId: hash(raw.SuccessReceiptId) };
  if ('SuccessValue' in raw) {
    if (typeof raw.SuccessValue !== 'string' || raw.SuccessValue.length > 172) throw new Error('Result limit');
    const bytes = Buffer.from(raw.SuccessValue, 'base64');
    if (bytes.toString('base64') !== raw.SuccessValue || bytes.length > 128) throw new Error('Invalid base64 result');
    return { SuccessValue: Array.from(bytes) };
  }
  throw new Error('Unsupported status');
}
export function normalizeOutcomeProof(raw: any) {
  const p = raw.outcome_proof, o = p.outcome;
  const gas = Number(u64(o.gas_burnt));
  if (!Number.isSafeInteger(gas)) throw new Error('Unsafe gas integer');
  if (typeof o.executor_id !== 'string' || o.executor_id.length > 64) throw new Error('Invalid executor');
  return { id: hash(p.id), block_hash: hash(p.block_hash),
    outcome: { receipt_ids: list(o.receipt_ids, 16, hash), gas_burnt: gas, tokens_burnt: u128(o.tokens_burnt),
      executor_id: o.executor_id, status: status(o.status) },
    logs: list(o.logs, 8, s => { if (typeof s !== 'string' || Buffer.byteLength(s) > 512) throw new Error('Log limit'); return s; }),
    proof: path(p.proof), outcome_root_proof: path(raw.outcome_root_proof),
    block_header_lite: normalizeHeader(raw.block_header_lite), block_proof: path(raw.block_proof) };
}
export function normalizeCheckpoint(block: any, orderedCurrentValidators: unknown) {
  return { head: normalizeHeader(block), current_bps: list(orderedCurrentValidators, 128, validator),
    next_bps: list(block.next_bps, 128, validator) };
}
export function normalizeUpdate(block: any, ancestry: any) {
  return { header: normalizeHeader(block), next_block_inner_hash: hash(block.next_block_inner_hash),
    next_bps: block.next_bps === null ? null : list(block.next_bps, 128, validator),
    approvals_after_next: list(block.approvals_after_next, 256, signature => {
      if (signature === null) return null;
      if (typeof signature !== 'string' || !signature.startsWith('ed25519:')) throw new Error('Unsupported signature');
      return Buffer.from(decodeBase58(signature.slice(8), 64)).toString('base64');
    }), ancestry: path(ancestry) };
}
