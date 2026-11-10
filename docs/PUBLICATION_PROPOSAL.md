# Nnetics publication proposal — pending review

This is one proposed package, not authorization or an executed repository action. The recording script is [DEMO_GUIDE.md](DEMO_GUIDE.md); the complete submission/post text and missing fields are also maintained in [SUBMISSION_DRAFT.md](SUBMISSION_DRAFT.md).

## Exact repository action proposed

- Current branch: `codex/nnetics-live-integration`.
- Current HEAD: `70e4f5b43db9d037e4b1fd70269dca92b3c3b86f`.
- Proposed commit message: **Finish Nnetics guarded testnet MVP and submission handoff**.
- Proposed push destination: `origin`, `https://github.com/Technique-S/Nnetics.git`, target `refs/heads/codex/nnetics-live-integration`. Normal fast-forward push only; stop on divergence, never force-push.
- Recommended GitHub default branch: **codex/nnetics-live-integration**, after its reviewed commit is pushed. This replaces the older `codex/payscope-milestone-1` as the entry point; no branch rename or merge is proposed.
- The proposed package includes preserved session/RPC/guarded-transaction fixes, assessment-only historical compatibility, themes, tests, hosting preparation, documentation and notices. It never authorizes wallet signatures, funding, payments, worker startup, unpause, deployment or hosting purchases.

No commit, staging, push or default-branch setting change occurred. Before an approved commit, verify the file manifest and staged diff; do not sweep in additional files or alter unrelated staged work. Re-run current-candidate Linux CI only after an authorized push. Prior local results and earlier Linux evidence are not a claim of new remote CI.

## Copyright and exclusions

MIT was selected by the owner, who explicitly supplied **MDBcertified** as the holder text. LICENSE now reads `Copyright (c) 2026 MDBcertified`. No legal name was inferred. Third-party holders/notices remain unchanged.

The tracked, generated `apps/owner/next-env.d.ts` local change is **excluded from this commit proposal**: it points at `.next-rpc` generated types. Its working copy remains untouched; a clean default build regenerates the normal references. Source `tsconfig.json` support for optional build directories remains included.

Always exclude `.env.local` and other credentials, all real/private or synthetic scratch databases/WALs, private invitations, personal submission payloads, signing-key files, `.tools`, `node_modules`, `.next*`, traces/test reports and the entire `artifacts/` directory. Three reviewed public fixture screenshots and the existing design-study bundle/notices are intentional documentation assets, not a private artifact export. Rehearsal captures, fixture session data and generated staging manifests remain local/ignored.

## Genuine remaining blockers

1. Human starts the final normal preview with the exact command in DEMO_GUIDE.md and records the selected local-demo video. Automated normal startup was policy-rejected; the completed replay is a clearly labeled fixture, not a fresh final-server or real-Meteor run. Real signing is not needed for the sample billing sequence.
2. Human reviews/approves this exact commit/push/default-branch package, then records the resulting source revision. Repository is already public; the new local changes are not published.
3. Human publishes the tagged video post and supplies lead/contact/team details, final tracks, chosen mainnet prize account, prior-submission/other-entry disclosure and contact consent for the separately reviewed application. No payload/requestId or consent is invented.

No new feature, AI provider, hosted URL or financial activation is needed for this selected submission. Future automatic Meteor reference-block reconciliation remains disabled/not live-verified. Existing historical acceptance does not clear V2's hold or authorize another payment. Vault paused, worker revoked/stopped and both gates disabled are preserved.

<!-- GENERATED PACKAGE APPENDIX: refreshed locally without staging or committing. -->

## Final changed-file summary

120 paths proposed: 55 modified tracked files and 65 new/untracked files. No deletion is proposed. The generated next-env change is preserved locally but excluded. Unchanged tracked files remain part of repository history.

| Area | Changed paths |
| --- | ---: |
| Build / tooling / hosting / configuration | 16 |
| Documentation / license / curated assets | 26 |
| UI / client / shared presentation | 39 |
| Backend / security guards | 11 |
| Tests / public fixtures | 28 |

## Complete submission description

Nnetics keeps contractor bills, owner approvals and payment evidence together. Owners invite contractors privately, approve wallet details, define work and review text-first invoices. Automatic references, clarification and immutable approved recipients reduce payment mistakes. Records persist in a backend with organization isolation.

A Rust NEAR vault independently enforces authorized callers, exact recipients and amounts, spending limits, expiry, pause and duplicate-payment protection. One historical 0.001 NEAR testnet contractor payment is confirmed with a public transaction link and one durable Paid job. A separate historical storage-funding call was accepted under a bounded reviewed policy; this does not establish future automatic Meteor reconciliation.

The current release demonstrates billing with labeled sample records and deterministic parsing. New owner transactions, automated payments and provisioning remain disabled; the vault is paused and worker revoked. No independent security review has occurred. A local video and reproducible public repository demonstrate the MVP without sending another payment.

## Complete post draft

```text
Contractor bills need proof.
Built Nnetics at NEAR HACKATHON: billing + NEAR payment limits.
Sample demo; past testnet payment; payments off.
https://github.com/Technique-S/Nnetics/tree/codex/nnetics-live-integration
@NEARProtocol #NEARHackathon
Would this fit your workflow?
```

Description: 1130 characters; post: 275 raw characters. Attach the human-recorded local-demo video. These are draft text, not an application or posting request.

## Exact intended changed/untracked paths

`M` = modified tracked file; `A` = new untracked file proposed for addition.

| Status | Path |
| --- | --- |
| M | `.github/workflows/hosted-readiness.yml` |
| M | `.gitignore` |
| A | `LICENSE` |
| M | `README.md` |
| A | `THIRD_PARTY_NOTICES.md` |
| M | `apps/owner/.env.example` |
| M | `apps/owner/next.config.ts` |
| M | `apps/owner/package.json` |
| A | `apps/owner/scripts/assess-owner-reference.mjs` |
| A | `apps/owner/scripts/check-theme.mjs` |
| M | `apps/owner/scripts/contractor-acceptance.mjs` |
| M | `apps/owner/scripts/execute-payment-v3-worker.mjs` |
| M | `apps/owner/scripts/prepare-payment-resumption.mjs` |
| A | `apps/owner/scripts/rpc-diagnose.ts` |
| M | `apps/owner/scripts/verify-payment-v3-closure.mjs` |
| M | `apps/owner/src/app/api/health/route.ts` |
| M | `apps/owner/src/app/api/live/[...path]/route.ts` |
| M | `apps/owner/src/app/api/live/contractors/[...path]/route.ts` |
| A | `apps/owner/src/app/appearance-control.tsx` |
| M | `apps/owner/src/app/contractor-owner.tsx` |
| M | `apps/owner/src/app/contractor/layout.tsx` |
| M | `apps/owner/src/app/contractor/page.tsx` |
| A | `apps/owner/src/app/demo/contractors/layout.tsx` |
| M | `apps/owner/src/app/demo/portal-ui.tsx` |
| M | `apps/owner/src/app/demo/portal.module.css` |
| A | `apps/owner/src/app/error.tsx` |
| A | `apps/owner/src/app/global-error.tsx` |
| M | `apps/owner/src/app/globals.css` |
| A | `apps/owner/src/app/icon.svg` |
| M | `apps/owner/src/app/layout.tsx` |
| M | `apps/owner/src/app/not-found.tsx` |
| M | `apps/owner/src/app/onboarding.tsx` |
| A | `apps/owner/src/app/operation-feedback.tsx` |
| A | `apps/owner/src/app/owner-transaction-review.tsx` |
| M | `apps/owner/src/app/page.tsx` |
| A | `apps/owner/src/app/robots.ts` |
| M | `apps/owner/src/app/testnet-controls.tsx` |
| A | `apps/owner/src/app/tokens.css` |
| M | `apps/owner/src/app/vault-onboarding.tsx` |
| A | `apps/owner/src/app/view-metadata.tsx` |
| M | `apps/owner/src/app/workspace.css` |
| A | `apps/owner/src/data/appearance.ts` |
| M | `apps/owner/src/data/config-context.ts` |
| M | `apps/owner/src/data/contractor-adapter.ts` |
| A | `apps/owner/src/data/live-request.ts` |
| M | `apps/owner/src/data/meteor-message.ts` |
| M | `apps/owner/src/data/near-adapter.ts` |
| A | `apps/owner/src/data/owner-transaction.ts` |
| A | `apps/owner/src/data/page-metadata.ts` |
| A | `apps/owner/src/data/payment-status.ts` |
| A | `apps/owner/src/data/request-policy.ts` |
| M | `apps/owner/src/data/user-message.ts` |
| A | `apps/owner/src/data/wallet-result.ts` |
| A | `apps/owner/src/data/wallet-transport.ts` |
| M | `apps/owner/src/server/chain.ts` |
| A | `apps/owner/src/server/checkpoint-validity.ts` |
| M | `apps/owner/src/server/config.ts` |
| M | `apps/owner/src/server/identity.ts` |
| A | `apps/owner/src/server/owner-attempt.ts` |
| M | `apps/owner/src/server/provisioning.ts` |
| A | `apps/owner/src/server/reference-block-policy.ts` |
| A | `apps/owner/src/server/rpc-request.ts` |
| M | `apps/owner/src/server/signer.ts` |
| A | `apps/owner/src/server/transaction-gates.ts` |
| M | `apps/owner/src/server/worker-cli.ts` |
| A | `apps/owner/tests/appearance.test.ts` |
| M | `apps/owner/tests/browser/action-states.spec.ts` |
| A | `apps/owner/tests/browser/appearance.spec.ts` |
| M | `apps/owner/tests/browser/contractor.spec.ts` |
| M | `apps/owner/tests/browser/interface.spec.ts` |
| A | `apps/owner/tests/browser/meteor-owner.spec.ts` |
| M | `apps/owner/tests/browser/navigation-helpers.ts` |
| M | `apps/owner/tests/browser/onboarding.spec.ts` |
| M | `apps/owner/tests/browser/owner.spec.ts` |
| A | `apps/owner/tests/browser/payment-status.spec.ts` |
| A | `apps/owner/tests/browser/rpc-recovery.spec.ts` |
| M | `apps/owner/tests/browser/testnet.spec.ts` |
| M | `apps/owner/tests/chain.test.ts` |
| A | `apps/owner/tests/checkpoint-validity.test.ts` |
| A | `apps/owner/tests/fixtures/meteor-reference-refresh.json` |
| A | `apps/owner/tests/fixtures/owner-scope.ts` |
| M | `apps/owner/tests/hosting.test.ts` |
| M | `apps/owner/tests/identity.test.ts` |
| A | `apps/owner/tests/meteor-hash.test.ts` |
| A | `apps/owner/tests/meteor-owner.test.ts` |
| A | `apps/owner/tests/owner-attempt.test.ts` |
| A | `apps/owner/tests/payment-status.test.ts` |
| M | `apps/owner/tests/provisioning.test.ts` |
| A | `apps/owner/tests/reference-block-policy.test.ts` |
| A | `apps/owner/tests/reliability.test.ts` |
| A | `apps/owner/tests/request-policy.test.ts` |
| A | `apps/owner/tests/transaction-gates.test.ts` |
| A | `apps/owner/tests/wallet-transport.test.ts` |
| M | `apps/owner/tsconfig.json` |
| M | `deploy/hosting.mjs` |
| M | `deploy/measure.mjs` |
| A | `docs/DEMO_GUIDE.md` |
| M | `docs/HOSTED_DEPLOYMENT.md` |
| A | `docs/METEOR_HASH_DIAGNOSIS.md` |
| A | `docs/METEOR_HISTORICAL_ACCEPTANCE_V3.json` |
| A | `docs/METEOR_OWNER_ACCEPTANCE_PLAN.json` |
| A | `docs/METEOR_OWNER_ACCEPTANCE_PLAN_V2.json` |
| A | `docs/METEOR_OWNER_TRANSACTIONS.md` |
| A | `docs/METEOR_REFERENCE_POLICY_V3.json` |
| A | `docs/METEOR_REFERENCE_POLICY_V3.md` |
| M | `docs/POLISH_REPORT.md` |
| A | `docs/PUBLICATION_PROPOSAL.md` |
| A | `docs/SUBMISSION_DRAFT.md` |
| A | `docs/SUBMISSION_READINESS.md` |
| A | `docs/TESTNET_ACTIVATION_READINESS.md` |
| A | `docs/THEME_REPORT.md` |
| M | `docs/VALIDATION.md` |
| A | `docs/design-review/THIRD_PARTY_LICENSES.txt` |
| A | `docs/rpc-diagnosis-2026-11-04.md` |
| A | `docs/rpc-diagnosis-2026-11-04/network.json` |
| A | `docs/screenshots/README.md` |
| A | `docs/screenshots/contractor-dark.png` |
| A | `docs/screenshots/owner-dark.png` |
| A | `docs/screenshots/owner-light.png` |
| M | `render.yaml` |

Excluded tracked working change: `apps/owner/next-env.d.ts`. All ignored/private categories listed above remain excluded. The ignored `artifacts/submission-handoff/publication-paths.nul` is an exact future staging list; no staging was executed. Revalidate it and review the staged diff only after publication approval.
