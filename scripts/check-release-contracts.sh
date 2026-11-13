#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Fresh, local-only provisioning verification includes the complete core suite.
case "$(uname -s):$(uname -m)" in
  Linux:x86_64|Linux:aarch64|Darwin:arm64) ;;
  *) echo 'Use the documented Linux release verification environment.' >&2; exit 1 ;;
esac
release_dir="artifacts/release-contracts/$(date -u +%Y%m%dT%H%M%SZ)-${NNETICS_SANDBOX_VERSION:-2.13.0}-$$"
mkdir -p "$release_dir"
node --version > "$release_dir/node.txt"
rustc --version --verbose > "$release_dir/rust.txt"
cargo --version > "$release_dir/cargo.txt"
uname -a > "$release_dir/platform.txt"
if command -v dpkg-query >/dev/null; then dpkg-query -W > "$release_dir/os-packages.txt"; fi
set +e
bash scripts/check-provisioning.sh 2>&1 | tee "$release_dir/verification.log"
statuses=("${PIPESTATUS[@]}")
set -e
result="${statuses[0]}"
if [[ "${statuses[1]}" != 0 ]]; then result=74; fi
node scripts/release-contract-report.mjs "$release_dir" "$result"
