import fs from 'node:fs';
import { normalizeCheckpoint, normalizeOutcomeProof, normalizeUpdate } from '../src/near-proof.ts';

// Reads already collected RPC responses. No network access, secrets, signing or submissions.
const [mode, path = '-'] = process.argv.slice(2);
try {
  const bytes = fs.readFileSync(path === '-' ? 0 : path);
  if (bytes.length > 1_000_000) throw new Error('Evidence bundle exceeds 1 MB');
  const raw = JSON.parse(bytes.toString('utf8'));
  let args: unknown;
  if (mode === 'checkpoint') args = { checkpoint: normalizeCheckpoint(raw.block, raw.current_bps) };
  else if (mode === 'update') args = { update: normalizeUpdate(raw.block, raw.ancestry) };
  else if (mode === 'repair') {
    if (typeof raw.attempt_id !== 'string' || !/^[1-9][0-9]*$/.test(raw.attempt_id) || BigInt(raw.attempt_id) > (1n << 64n) - 1n) throw new Error('Invalid attempt ID');
    args = { attempt_id: raw.attempt_id, initiation: normalizeOutcomeProof(raw.initiation), transfer: normalizeOutcomeProof(raw.transfer) };
  } else throw new Error('Usage: node scripts/prepare-repair.ts checkpoint|update|repair bundle.json (or - for stdin)');
  const output = JSON.stringify(args);
  if (Buffer.byteLength(output) > 128_000) throw new Error('Contract proof-input limit exceeded');
  process.stdout.write(output + '\n');
} catch (error) {
  process.stderr.write(String(error) + '\n'); process.exitCode = 1;
}
