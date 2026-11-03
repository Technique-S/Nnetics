# Owner-run CLI factory handoff — conditionally approved, not executed

**Factory deployment complete — 3 November 2026, 00:08 WAT:** the user saved
the offline CLI signature; exact-byte verification passed; the agent submitted
the one approved transaction once after fresh preflight. FINAL success:
https://testnet.nearblocks.io/txns/3KHBKLzkE9sUvUXUWPWTxWEdwaGjndCEcTttxSASz6Rq.
Actual fee 0.0141941500094896 NEAR; transfer 6.3324 NEAR. Downloaded deployed
code, no keys and get_config embedded hash/funding/version passed finalized checks.
Remaining Grandtheft balance 5.653274612040510399999999 NEAR. The command below
is now historical: **do not run it again**. Customer vault creation remains
pending through the original approved UI flow. See VALIDATION.md for evidence.

**Prepared owner handoff — 3 November 2026, 00:01 WAT (2 November, 23:01 UTC):**
The fresh Grandtheft Meteor proof and finalized preflight passed. Both targets are
absent; the expired original hash remains unknown with unchanged old-key nonce.
Testnet protocol 88, validity 86400, storage and both transaction fee calculations
match approval. Grandtheft balance: **11.999868762049999999999999 NEAR**.
CLI-key current nonce: **275527013000001**; prepared nonce **275527013000002**.
Finalized reference: height **275964882**,
`2L7eDef5ZqRuRVcoMFw8n8GoNaGUAWTJAkf4XppSyoyw`.
Prepared transaction hash: **3KHBKLzkE9sUvUXUWPWTxWEdwaGjndCEcTttxSASz6Rq**.
Both artifact byte/hash checks passed. Actions/deposit/code/target are unchanged;
only the already-approved CLI signing key and fresh nonce/reference are used.

Deposits 11.3324 NEAR + both approved upfront fee allowances
0.3022437084553175 NEAR + retained owner storage reserve 0.00264 NEAR =
**11.6372837084553175 NEAR** required. Remaining after these allowances:
**0.362585053594682499999999 NEAR**. The storage reserve is retained in the owner
account, not an additional transfer. No funding increase or new transaction scope.

Exclusive unsigned outbox:
`artifacts/live/approved-factory-cli-infrastructure.json` (fsynced; original outbox
preserved). Owner-run offline command file:
`artifacts/live/sign-approved-factory.ps1`. Expected signed output:
`artifacts/live/approved-factory-cli-infrastructure.cli-signed.json`.
Run that command file once in PowerShell; it saves the signed transaction using
the existing Windows keychain and does **not** broadcast. Do not export/import
keys, replace `save-to-file` with `send`, or rerun after ambiguous failure. Report
only completion/non-secret error; do not paste the signed file into chat.

The agent must next run `apps/owner/scripts/factory-cli-verify.mjs` to reconstruct
the approved actions, compare exact unsigned bytes and verify the Ed25519
signature before broadcasting the same persisted transaction. This verification
tool never broadcasts. The existing signature regression test passed 1/1 after
preparation. Official CLI 0.30.1 version and complete offline/save-to-file syntax
were rechecked using installed command help and the official CLI guide:
https://github.com/near/near-cli-rs/blob/main/docs/GUIDE.en.md.
No signature, broadcast, deployment success or vault creation is claimed yet.

**Latest reconciliation, 2 November 2026 at 22:28:18.927 UTC:** the original
attempt is conclusively expired without inclusion. Finalized height 275961459
exceeds the conservative boundary 275961398; validity remains 86400 and the
canonical reference is unchanged. Original hash remains UNKNOWN_TRANSACTION,
old nonce is unchanged, balance is 11.999868762049999999999999 NEAR and both
targets are absent. Evidence: `artifacts/local-checks/transaction-watch-1793658498929.json`.
The original outbox remains intact. The expiry monitor is paused. The following
earlier checkpoints are historical; the unknown-and-potentially-valid gate has
now resolved. Fresh owner proof and the remaining full preflight are still needed
before preparing the exclusive owner-run offline-signing handoff. No replacement
has been prepared or signed, and no provisioning success is claimed.

The user explicitly approved amendment digest
`bca85c64ac11e4a0a14808d290980c47db89353fa2450930f34022291cc91ae8`.
Approval is retained; do not request it again if the exact scope and conditions
remain satisfied. No signing or broadcast occurred. Post-approval finalized
height **275876528**, block `6tVfCF8EUkbb7aqWC9E2g2M6y3hHmhxtubBC7D3Hyq6i`,
is still below the expiry gate. Old key nonce is unchanged at 275527848000002,
factory absent, Grandtheft balance unchanged at 11.999868762049999999999999 NEAR.
The unknown-attempt gate remains in force. A replacement must not be signed or
sent merely because the CLI route has been approved.

The user subsequently requested ongoing read-only checks. A 30-minute thread
heartbeat `nnetics-transaction-expiry` is ACTIVE. At height 275880026, 81373 blocks
remained to the first conservative expired height 275961399. Measured rate across
5028 blocks: 0.5830502012 seconds/block; estimated wait 13h 10m 45s, around
23:39 WAT on 2 November. Only the finalized block-height/state checks determine
expiry; this estimate does not unlock signing. The monitor will resume
reconciliation upon a meaningful state change, preserving the owner-run handoff.

2 November 2026. Meteor's app deployment protection remains enabled. This plan
uses the owner's official CLI, not another wallet/app deployment request. The
CLI binary was read-only verified as near-cli-rs 0.30.1. Its supported
`account get-public-key from-keychain grandtheft.testnet network-config testnet`
returned only this public key:
`ed25519:6vkGFeDZ2Z8M6mfubE4mYQpdr2d3M7eULrHWuonseBhZ`.
No key was exported, no offline signature requested and no transaction submitted.

## Amendment requiring approval

The original plan allowed two on-chain keys but required the transaction key to
be proven through fresh Meteor login. The CLI key differs from the fresh Meteor
key. This amendment instead uses fresh Meteor proof of the **same owner account**
plus cryptographic verification of the **CLI key's exact transaction signature**.
No organization/contract authorization check changes. This key-control mechanism
must be explicitly approved before signing; do not infer it from CLI availability.

[Machine-readable plan](CLI_FACTORY_HANDOFF_PLAN.json), SHA-256 of compact
`JSON.stringify(plan)`:
`bca85c64ac11e4a0a14808d290980c47db89353fa2450930f34022291cc91ae8`.
Actions compare exactly equal to the original infrastructure action list:
CreateAccount; Transfer **6.3324 testnet NEAR**; DeployContract **629144 bytes**,
SHA-256 `8475786608c34a68317d2ada08cd3dd2e65ff23dc176e2377ac54db5b4f52bbb`.
Signer `grandtheft.testnet`, receiver `v.grandtheft.testnet`, no keys or initializer.
Maximum upfront fee allowance: **0.051324415742682 NEAR**, subject to unchanged
fee parameters. The original 5-NEAR customer call remains separately approved.

## Mandatory reconciliation gate

Original outbox/hash:
`artifacts/live/approved-factory-infrastructure.json` /
`HafBR1uMZJFfN3U1v7x72s1LQiFCDkPoE6KqS5dhBSyk`.
Preserve it. Do not sign a replacement while that attempt is unknown and valid.

Protocol config reports transaction_validity_period **86400 blocks**. Its recorded
reference height is **275874998**. Conservative expiry requires a finalized
height **greater than 275961398**, then inspection of the original hash, nonce,
reference block and target. This is a block-height gate, not a guaranteed clock
time. At the latest observed height **275876027**, expiry had **not** passed.

- FINAL original success: verify the existing factory and skip replacement.
- FINAL original failure: inspect receipts/refunds and ensure target absent.
- Finalized expiry, original hash still unknown, old key nonce unchanged and
  target absent: the old transaction can no longer become valid; a replacement
  may be prepared after the rest of preflight passes.
- A finalized consumed nonce that independently invalidates the old transaction
  may also resolve it after inspection. No nonce-bump/key-change action is
  authorized merely to force this condition.

## Owner-run signing template — not ready to run

Only after the reconciliation gate and amendment approval, prepare a fresh
finalized block/CLI-key nonce, exact expected unsigned bytes and exclusive outbox.
The placeholders below deliberately cannot identify a transaction yet. Keep the
factory artifact at its hashed local path. This is an **offline save-to-file**
command; it does not broadcast and must never export secrets.

```powershell
& 'C:\Users\Kazi\AppData\Roaming\npm\node_modules\near-cli-rs\node_modules\.bin_real\near.exe' `
  --offline transaction construct-transaction grandtheft.testnet `
  receiver-id v.grandtheft.testnet `
  add-action create-account `
  add-action transfer '6.3324 NEAR' `
  add-action deploy-contract use-file `
  'C:\Users\Kazi\Documents\PayScope_Foundation\payscope\artifacts\github\07181a0-provisioning-88\provisioning\factory.wasm' `
  without-init-call skip network-config testnet sign-with-keychain `
  --signer-public-key ed25519:6vkGFeDZ2Z8M6mfubE4mYQpdr2d3M7eULrHWuonseBhZ `
  --nonce '<FRESH_PREPARED_NONCE>' --block-hash '<FRESH_FINALIZED_HASH>' `
  --block-height '<FRESH_FINALIZED_HEIGHT>' `
  save-to-file '<NEW_EXCLUSIVE_SIGNED_OUTPUT_PATH>'
```

Help inspection confirmed CreateAccount / Transfer / use-file /
without-init-call / skip syntax. The complete signing template has **not** been
executed or represented as a successful test. Avoid passing the ~840 KB unsigned
transaction as a Windows CLI argument; constructing from the pinned WASM file
avoids command-line length limits. Before broadcast, compare the CLI-produced
transaction's exact bytes against the prepared expected transaction and verify
its Ed25519 signature with `verifySetupSignature` in
`apps/owner/scripts/setup-signature.ts`. Wrong key, nonce, block, action, artifact,
amount or noncanonical encoding must fail without broadcast.

Persist the verified signed transaction, then submit it exactly once and reconcile
that same hash to FINAL. Never create a fresh retry from an unknown result. Verify
factory code, embedded vault hash, immutable config, funding and no keys before
enabling the original customer Create vault flow. Full live provisioning/recovery
acceptance remains incomplete. No payment, unpause, checkpoint, new key, top-up,
faucet or GitHub push is included.
