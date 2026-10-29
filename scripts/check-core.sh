#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

case "$(uname -s):$(uname -m)" in
  Linux:x86_64|Linux:aarch64|Darwin:arm64) ;;
  *) echo "The pinned sandbox supports Linux x86_64/aarch64 and macOS arm64. Use Linux x86_64 for CI parity." >&2; exit 1 ;;
esac
command -v cargo >/dev/null || { echo "Install Rust with rustup first (see docs/PAYMENT_CORE.md)." >&2; exit 1; }
command -v node >/dev/null || { echo "Node 24 is required." >&2; exit 1; }
node -e 'if (Number(process.versions.node.split(".")[0]) < 24) process.exit(1)'
# Never substitute a user's network node or an unpinned sandbox binary.
if [[ -n "${NEAR_SANDBOX_BIN_PATH:-}" ]]; then
  echo "Unset NEAR_SANDBOX_BIN_PATH to use pinned near-sandbox 0.3.12 / nearcore 2.13.0." >&2
  exit 1
fi
export CARGO_TERM_COLOR=never
export RUST_BACKTRACE=1
export NNETICS_SANDBOX_VERSION="${NNETICS_SANDBOX_VERSION:-2.13.0}"
case "$NNETICS_SANDBOX_VERSION" in
  2.13.0|2.14.0-rc.5) ;;
  *) echo "Only the pinned baseline or protocol-88 candidate runtime is allowed." >&2; exit 1 ;;
esac
export NNETICS_RUN_DIR="$PWD/artifacts/runs/$(date -u +%Y%m%dT%H%M%SZ)-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}-$$"
export NNETICS_LOG_DIR="$NNETICS_RUN_DIR/logs"
export NNETICS_EVIDENCE_DIR="$NNETICS_RUN_DIR/evidence"
mkdir -p "$NNETICS_LOG_DIR" "$NNETICS_EVIDENCE_DIR"
echo "Verification evidence: $NNETICS_RUN_DIR"
stage=preflight
finish() {
  local result=$?
  trap - EXIT
  set +e
  node scripts/verification-report.mjs finish "$NNETICS_LOG_DIR" "$stage" "$result"
  local report_result=$?
  if [[ "$result" == 0 && "$report_result" != 0 ]]; then result="$report_result"; fi
  exit "$result"
}
trap finish EXIT
run_stage() {
  stage="$1"; shift
  set +e
  "$@" 2>&1 | tee "$NNETICS_LOG_DIR/$stage.log"
  local -a statuses=("${PIPESTATUS[@]}")
  set -e
  local result="${statuses[0]}"
  if [[ "${statuses[1]}" != 0 ]]; then result=74; fi
  node scripts/verification-report.mjs stage "$NNETICS_LOG_DIR" "$stage" "$result"
  return "$result"
}
# Each run has a new evidence directory; prior logs/proofs are never counted as this run.
: > "$NNETICS_LOG_DIR/stages.jsonl"
run_stage toolchain rustup show
run_stage reference-tests npm test
run_stage rust-format cargo fmt --manifest-path contracts/vault/Cargo.toml -- --check
run_stage sandbox-format cargo fmt --manifest-path contracts/sandbox/Cargo.toml -- --check
run_stage rust-unit-tests cargo test --locked --manifest-path contracts/vault/Cargo.toml --lib -- --nocapture

run_stage production-build cargo build --locked --manifest-path contracts/vault/Cargo.toml --target wasm32-unknown-unknown --release --lib
cp contracts/vault/target/wasm32-unknown-unknown/release/nnetics_vault.wasm artifacts/vault.wasm
cp artifacts/vault.wasm "$NNETICS_RUN_DIR/vault.wasm"
run_stage production-clippy cargo clippy --locked --manifest-path contracts/vault/Cargo.toml --target wasm32-unknown-unknown --release --lib -- -D warnings
# Separate output directories prevent feature leakage into the production artifact.
for fault in fault-record-gas fault-record-storage fault-finalize-gas fault-finalize-storage; do
  run_stage "$fault-build" cargo build --locked --manifest-path contracts/vault/Cargo.toml --target wasm32-unknown-unknown \
    --release --lib --features "$fault" --target-dir "contracts/vault/target/$fault"
  cp "contracts/vault/target/$fault/wasm32-unknown-unknown/release/nnetics_vault.wasm" "artifacts/$fault.wasm"
done
run_stage sandbox-tests cargo test --locked --manifest-path contracts/sandbox/Cargo.toml --test vault -- --test-threads=1 --nocapture
stage=complete
echo "Payment core checks passed. No public-network transactions were submitted."
