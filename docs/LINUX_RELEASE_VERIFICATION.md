# Pinned Linux release verification

This is a reproducible verification procedure, not a claim that Linux tests ran on the Windows workstation. No Cargo, Docker/Podman runtime or installed WSL distribution was available there. Git Bash can syntax-check the shell wrapper but cannot supply the supported NEAR Sandbox runtime.

Use a **clean checkout of the reviewed candidate commit**, Ubuntu **24.04 x86_64**, Node **24.22.1**, Rust **1.93.0**, `rustfmt`, `clippy`, and target `wasm32-unknown-unknown`. Linux aarch64 and macOS arm64 are supported by the existing sandbox guard, but Ubuntu x86_64 is the release/CI reference environment.

`rust-toolchain.toml` pins the compiler/components/target. `.cargo/config.toml` applies `--cfg near` only to WASM builds. Cargo manifests and all three lockfiles pin near-sdk **5.29.1**, near-workspaces **0.23.0**, near-sandbox **0.3.12**, near-sdk-env **0.1.6**, near-sys **0.2.14**, and their transitive dependencies. Preserve them and use `--locked`; do not upgrade to make a failing build pass. Run both nearcore **2.13.0** (protocol 86) and **2.14.0-rc.5** (protocol 88) in separate fresh jobs.

## Local procedure

Install the official rustup toolchain manager if absent, and install the exact Node version through the operator's normal trusted installation method. Then, from the reviewed repository root:

```sh
sudo apt-get update
sudo apt-get install -y build-essential pkg-config libssl-dev clang cmake
node --version                    # v24.22.1
rustup show                       # repository-selected 1.93.0
rustup target list --installed     # includes wasm32-unknown-unknown
git rev-parse HEAD
git status --porcelain             # empty
unset NEAR_SANDBOX_BIN_PATH RUSTFLAGS
NNETICS_SANDBOX_VERSION=2.13.0 bash scripts/check-release-contracts.sh
NNETICS_SANDBOX_VERSION=2.14.0-rc.5 bash scripts/check-release-contracts.sh
```

Each invocation runs the existing full payment-core suite followed by factory unit/provisioning sandbox checks. That includes contract formatting, production WASM builds, production Clippy with `-D warnings`, fault artifacts, real local receipt failures, limits/reservations, pause/revocation/expiry, initialization and provisioning evidence. No public-network wallet, signing key, faucet or RPC substitution is required. Fault-feature WASM files must never become deployment candidates.

The Node/root dependency lockfile and owner lockfile additionally pin the application/lint dependencies:

```sh
npm ci
npm ci --prefix apps/owner
npm run lint
npm test
cd apps/owner
npm run typecheck
npm test
npm run check:theme
npm run build
npx playwright install --with-deps chromium
npm run test:browser:isolated
```

The isolated browser runner forces fresh temporary databases, no existing server reuse, blank transaction/provisioning flags and no model key. Real-provider acceptance is a separate explicit opt-in; it is not replaced by the secretless browser suite.

## Workflow and required evidence

[release-verification.yml](../.github/workflows/release-verification.yml) implements this as a manually dispatched application job plus the two contract runtime jobs. Action revisions and Node are pinned. Cargo resolves only locked versions. Ubuntu package patch versions are supplied by the distribution and recorded in `os-packages.txt`; the hosted runner image is not asserted to be bit-for-bit immutable. Use fresh jobs, not a reused artifacts directory.

Retain for **each exact candidate SHA and each runtime**:

- The Actions run URL, job result and exact checked-out commit, or equivalent local operator record.
- `artifacts/release-contracts/<run>/acceptance.json`, complete `verification.log`, Node/Rust/Cargo/platform versions and OS package inventory.
- `artifacts/runs/<run>/logs/run.json`, `stages.jsonl`, stage logs and the public local-sandbox receipt proofs under that run's evidence directory.
- Factory unit and provisioning sandbox logs with nonzero test counts; all relevant tests must pass. A missing or zero-test result fails acceptance even if a process exits zero.
- Production vault/factory WASM, `SHA256SUMS`, input lockfile/configuration hashes and a clean source status. Verify checksums from the repository root with `sha256sum -c artifacts/provisioning/SHA256SUMS`.
- Separate identity for fault artifacts. Do not deploy anything from the verification run.

The wrapper's report validator rejects incomplete core evidence, zero factory/provisioning tests, missing artifacts, nonzero command status and dirty/unavailable Git provenance. Its local synthetic validator tests exercise that fail-closed behavior; **they are not Rust or Sandbox test evidence**.

No workflow was dispatched and no candidate was pushed during preparation. The operator must either run the exact reviewed source on a supported Linux machine or approve a verification-only push before GitHub can execute this new workflow. After reviewing both runtime reports and application results, decide separately whether to approve the public canonical release/default-branch transition.
