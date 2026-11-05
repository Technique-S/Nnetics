#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
[[ "$(uname -s):$(uname -m)" == "Linux:x86_64" ]] || { echo 'Linux x86_64 is required.' >&2; exit 1; }
[[ "$(node --version)" == 'v24.22.1' ]] || { echo 'Use the pinned Node 24.22.1.' >&2; exit 1; }
rustup toolchain list | grep -q '^1.93.0-' || { echo 'Install/authorize Rust 1.93.0 before running; no automatic install attempted.' >&2; exit 1; }
sha256sum --check SHA256SUMS
node audit.mjs "${@}"
work="work-$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir "$work"
tar -xf near-vm-runner-0.37.4.crate -C "$work"
crate="$PWD/$work/near-vm-runner-0.37.4"
cp vm_test.rs "$crate/exact_checkpoint_v4.rs"
cat >> "$crate/Cargo.toml" <<'TARGET'

[[test]]
name = "exact_checkpoint_v4"
path = "exact_checkpoint_v4.rs"
TARGET
export NNETICS_V4_BUNDLE_DIR="$PWD"
export NNETICS_V4_VM_REPORT="$PWD/$work/vm-results.json"
{ uname -a; node --version; rustc +1.93.0 --version --verbose; cargo +1.93.0 --version; sha256sum "$crate/Cargo.lock"; } | tee "$work/toolchain.txt"
# Only public package downloads; no wallet, local app or RPC credentials are used.
cargo +1.93.0 fetch --locked --manifest-path "$crate/Cargo.toml" 2>&1 | tee "$work/fetch.log"
cargo +1.93.0 tree --locked --offline --manifest-path "$crate/Cargo.toml" > "$work/dependency-tree.txt"
# Actual deployed WASM and public captured state. No near-workspaces network,
# owner account creation, transaction signatures or chain submissions.
cargo +1.93.0 test --locked --offline --manifest-path "$crate/Cargo.toml" --test exact_checkpoint_v4 -- --nocapture 2>&1 | tee "$work/vm.log"
sha256sum "$crate/Cargo.lock" | tee "$work/lock-after.txt"
node -e 'const fs=require("node:fs");const r=JSON.parse(fs.readFileSync(process.env.NNETICS_V4_VM_REPORT));if(!r.complete||!r.sevenInputsPassed||r.rows.length!==7)throw Error("No complete exact-input VM result");console.log("Seven exact inputs passed offline VM. This does not authorize live execution or satisfy missing invoice/cleanup bindings.");'
