#!/usr/bin/env bash
set -euo pipefail

[[ "$#" == 1 || ( "$#" == 2 && "$2" == --historical ) ]] || {
  echo 'Usage: bash run-matched-linux.sh EXTRACTED_ORIGINAL_BUNDLE [--historical]' >&2
  exit 1
}
[[ "$(uname -s):$(uname -m)" == Linux:x86_64 ]] || { echo 'Linux x86_64 required.' >&2; exit 1; }
[[ "$(node --version)" == v24.22.1 ]] || { echo 'Node 24.22.1 required.' >&2; exit 1; }
rustup toolchain list | grep '^1.95.0-' >/dev/null || { echo 'Rust 1.95.0 must already be available.' >&2; exit 1; }
harness="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/vm_test.rs"
bundle="$(cd "$1" && pwd)"
work="$(mktemp -d "${TMPDIR:-/tmp}/nnetics-v4-matched-XXXXXXXX")"
printf 'Retain evidence in %s\n' "$work"
(
  cd "$bundle"
  sha256sum --check SHA256SUMS
  node audit.mjs "${@:2}"
) | tee "$work/input-audit.log"

revision=b7b4737cab46f17a6daa2ed694d7aebbd204363a
lock=0da292b89a32e53e4d4cb33e231f0f834ccfe777ea5e69ffddf4f731ff0b4223
repo="$work/nearcore"
git init -q "$repo"
git -C "$repo" fetch --depth 1 https://github.com/near/nearcore.git "$revision" 2>&1 | tee "$work/source-fetch.log"
git -C "$repo" checkout -q --detach FETCH_HEAD
[[ "$(git -C "$repo" rev-parse HEAD)" == "$revision" ]]
cd "$repo"
printf '%s  Cargo.lock\n' "$lock" | sha256sum --check
target=runtime/near-vm-runner/tests/nnetics_exact_checkpoint_v4.rs
[[ ! -e "$target" ]]
mkdir -p "$(dirname "$target")"
cp "$harness" "$target"
git diff --no-index -- "$bundle/vm_test.rs" "$target" > "$work/harness.patch" || [[ "$?" == 1 ]]
export NNETICS_V4_BUNDLE_DIR="$bundle"
export NNETICS_V4_VM_REPORT="$work/vm-results.json"
{
  uname -a
  node --version
  rustc +1.95.0 --version --verbose
  cargo +1.95.0 --version
  git rev-parse HEAD
  sha256sum Cargo.lock "$target"
} | tee "$work/toolchain.txt"
cargo +1.95.0 fetch --locked 2>&1 | tee "$work/fetch.log"
cargo +1.95.0 tree --locked --offline -p near-vm-runner > "$work/dependency-tree.txt"
set +e
cargo +1.95.0 test --locked --offline -p near-vm-runner --test nnetics_exact_checkpoint_v4 -- --nocapture 2>&1 | tee "$work/vm.log"
status=${PIPESTATUS[0]}
set -e
sha256sum Cargo.lock | tee "$work/lock-after.txt"
printf '%s  Cargo.lock\n' "$lock" | sha256sum --check
[[ "$status" == 0 ]]
node --input-type=module -e '
  import {readFileSync} from "node:fs";
  import assert from "node:assert/strict";
  const result=JSON.parse(readFileSync(process.env.NNETICS_V4_VM_REPORT));
  const manifest=JSON.parse(readFileSync(process.env.NNETICS_V4_BUNDLE_DIR+"/manifest.json"));
  assert(result.complete && result.sevenInputsPassed && result.protocol===88);
  assert.deepEqual(result.rows.map(row=>row.inputSha256),manifest.inputs.map(input=>input.sha256));
  assert(result.rows.every(row=>row.aborted===null));
'
