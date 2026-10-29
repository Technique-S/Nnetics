import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const [mode, directory, name, code] = process.argv.slice(2);
fs.mkdirSync(directory, { recursive: true });
const stagePath = path.join(directory, 'stages.jsonl');
if (mode === 'stage') {
  let result = Number(code), testsPassed = null;
  if (['rust-unit-tests', 'sandbox-tests'].includes(name) && result === 0) {
    const output = fs.readFileSync(path.join(directory, name + '.log'), 'utf8');
    const match = output.match(/test result: ok\. (\d+) passed; 0 failed;/);
    testsPassed = match ? Number(match[1]) : 0;
    if (!testsPassed) result = 80; // Never treat a missing/zero-test run as acceptance evidence.
  }
  fs.appendFileSync(stagePath, JSON.stringify({ stage: name, exit_code: result, tests_passed: testsPassed, finished_at: new Date().toISOString() }) + '\n');
  if (result !== 0) process.exitCode = result;
} else if (mode === 'finish') {
  const run = (...args) => { const p = spawnSync(args[0], args.slice(1), { encoding: 'utf8' }); return p.status === 0 ? p.stdout.trim() : null; };
  const hashes = {};
  for (const file of ['rust-toolchain.toml', '.cargo/config.toml', 'contracts/vault/Cargo.lock', 'contracts/sandbox/Cargo.lock',
    'contracts/vault/src/lib.rs', 'contracts/vault/src/repair.rs', path.join(directory, '../vault.wasm')]) {
    if (fs.existsSync(file)) hashes[file] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }
  const stages = fs.existsSync(stagePath) ? fs.readFileSync(stagePath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
  const unit = stages.find(s => s.stage === 'rust-unit-tests');
  const sandbox = stages.find(s => s.stage === 'sandbox-tests');
  let finalCode = Number(code);
  if (finalCode === 0 && (unit?.exit_code !== 0 || sandbox?.exit_code !== 0)) finalCode = 80;
  const report = { schema_version: 1, finished_at: new Date().toISOString(), status: finalCode === 0 ? 'passed' : 'failed',
    active_stage: name, exit_code: finalCode, commit: run('git', 'rev-parse', 'HEAD'),
    github_run: process.env.GITHUB_RUN_ID ?? null, platform: run('uname', '-a'),
    node: process.version, rust: run('rustc', '--version'), cargo: run('cargo', '--version'),
    sandbox_version: '2.13.0', sandbox_crate: '0.3.12', stages, hashes,
    rust_unit_tests_passed: unit?.exit_code === 0, sandbox_tests_passed: sandbox?.exit_code === 0,
    milestone_1_accepted: false, note: 'Runtime checks are evidence for review, not automatic acceptance or a security audit.' };
  fs.writeFileSync(path.join(directory, 'run.json'), JSON.stringify(report, null, 2) + '\n');
  process.exitCode = finalCode;
} else throw new Error('Unknown report operation');
