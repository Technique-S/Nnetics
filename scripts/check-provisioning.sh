#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Complete the existing payment-core regression matrix before building the factory.
bash scripts/check-core.sh
mkdir -p artifacts/provisioning
cargo fmt --manifest-path contracts/factory/Cargo.toml -- --check
cargo test --locked --manifest-path contracts/factory/Cargo.toml --lib -- --nocapture 2>&1 | tee artifacts/provisioning/factory-unit.log
cp artifacts/vault.wasm artifacts/vault-provisioning.wasm
cp artifacts/vault-provisioning.wasm artifacts/provisioning/vault-provisioning.wasm
cargo build --locked --manifest-path contracts/factory/Cargo.toml --target wasm32-unknown-unknown --release --lib
cargo clippy --locked --manifest-path contracts/factory/Cargo.toml --target wasm32-unknown-unknown --release --lib -- -D warnings
cp contracts/factory/target/wasm32-unknown-unknown/release/nnetics_vault_factory.wasm artifacts/factory.wasm
cp artifacts/factory.wasm artifacts/provisioning/factory.wasm
for fault in fault-init-args fault-created-callback; do
  cargo build --locked --manifest-path contracts/factory/Cargo.toml --target wasm32-unknown-unknown --release --lib --features "$fault" --target-dir "contracts/factory/target/$fault"
  cp "contracts/factory/target/$fault/wasm32-unknown-unknown/release/nnetics_vault_factory.wasm" "artifacts/factory-$fault.wasm"
done
cargo test --locked --manifest-path contracts/sandbox/Cargo.toml --test provisioning -- --test-threads=1 --nocapture 2>&1 | tee artifacts/provisioning/sandbox.log
sha256sum artifacts/provisioning/*.wasm | tee artifacts/provisioning/SHA256SUMS
echo "Local sandbox only. No public deployment, wallet request or payment was executed."
