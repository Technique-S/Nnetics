# Nnetics

Your work agreements deserve more than a DM. Manage contractors, document agreements, and pay with verifiable records.

Nnetics is a **NEAR testnet MVP** for contractor billing: private invitations, wallet approval, text-first invoices, clarification and owner review, with payment rules independently enforced by a Rust vault. The submission demo uses clearly labeled sample records. **New owner transactions, automated payments and provisioning are disabled.** This is not a mainnet payment service or an independently reviewed contract.

The canonical local application is **`apps/owner` on `chore/nnetics-repository-consolidation`**. The sibling `payscope-*` folders are recovery worktrees of this same repository, not additional services. Start development with `cd apps/owner && npm ci && npm run dev`. [Repository audit](docs/repository-consolidation-audit.md) and [feature reconciliation](docs/feature-reconciliation-matrix.md) explain the source decisions. The remote default branch was last observed as the older `codex/payscope-milestone-1`; publication and a default-branch change remain pending owner review. See the [current release audit](docs/pre-submission-audit.md).

## Try it locally — no wallet or secrets required

Use Node.js **24** and npm (hosting is pinned to 24.22.1; the latest local checks used 24.18.0). From a clean checkout:

```sh
cd apps/owner
npm ci
npm run build
npm run start
```

Open **http://127.0.0.1:3100/?mode=demo** directly, or select **Try demo** on the sign-in screen. Enter a profile and vault name to reach **Overview**. The workspace offers Overview, Contractors, Payables, Activity, Vault & Controls, plus Settings. Fund the Demo Wallet in **Vault & Controls**, create a contractor and private portal in **Contractors**, then review and simulate settlement in **Payables**. Open the private link in a separate browser context for the contractor wallet/invoice journey. No real wallet signature or funds are involved. **Ask Nnetics** uses the optional server model for tool-assisted requests; its availability depends on configuration and provider quota. Manual workflows need no API key. [Detailed demo instructions](docs/DEMO_GUIDE.md) include clarification, approval, settlement and expected results.

Use one origin consistently; `localhost` and `127.0.0.1` do not share sessions. If this port is occupied, stop your own old preview first. For an already-built isolated final candidate, from `apps/owner` set `NNETICS_BUILD_DIRECTORY=.next-rpc` before `npm run start`. A clean checkout uses the default `.next` build. Local instructions are not approval for signing or public deployment.

No `.env.local` is needed for the sample demo. Keep demo records synthetic; their local SQLite files are ignored by Git. To develop the real login flow, copy `.env.example` privately and set the exact application origin; **leave transaction, payment and provisioning flags empty**. A supported, activated Meteor testnet account can authenticate without an existing organization/vault, and can create an off-chain organization. Organization creation does not create or fund a vault. Private live records are never distributed with the repository.

## What works, what is historical, what is simulated

| Capability | Actual status |
| --- | --- |
| Meteor identity, persisted sessions and organization isolation | Implemented. Prior real two-wallet checks are recorded separately from fixtures; sessions have a five-hour absolute limit. Explicit Switch wallet authenticates a different account; passive Meteor account reporting is limited |
| Private contractor billing | Persistent backend: owner profiles, revocable invitations, wallet proof/approval/change requests, original text, upload/preview, clarification, review and status tracking. Contract recipients stay fixed on existing approved orders |
| Invoice references/currency | Server-generated durable references, original text and duplicate-submission identities. Demo billing supports multiple invoice denominations and payout selections; live settlement remains native NEAR/testnet with currency conflicts blocked rather than silently converted |
| Parsing | Labeled deterministic parsing is used for the MVP/demo. An optional server-only AI adapter exists but is not enabled or required for submission |
| Rust vault/queue | Contract independently enforces owner/worker permissions, recipient, exact amount, limits, expiry, pause and single-payment orders. Durable jobs reconcile before retry; browser/TypeScript policy is not the security boundary |
| Historical contractor transfer | INV-0002: one confirmed **0.001 NEAR** payment to `babygoat.testnet`, transaction below. The existing Paid job/evidence are preserved, not recreated for the demo |
| Historical Meteor storage call | Accepted separately under reviewed V3 for that one transaction only. V2's original mismatch/manual-review hold, both IDs and consumed authorization remain |
| Future automatic Meteor reference-block reconciliation | **Not enabled or live-verified**. Historical V3 acceptance does not authorize future envelopes or clear the hold |
| New owner transactions / automated payouts / new provisioning | **Disabled**. Vault remains paused; worker authorization revoked and process stopped |
| Demo routes | Explicitly simulated/sample data and wallet proof. Simulated Paid/Pending/Failed examples are not evidence of real transfers |
| Hosted service | Prepared, **not deployed**. Local video is the selected submission route; hosting is optional |

Billing approval, linking or queueing alone never establishes Paid. Live Paid display requires the durable job and matching finalized transaction/receipt evidence. Unknown outcomes stay blocked; no timeout automatically creates a replacement signature, job or transfer.

Reviewed **fixture-only** previews: [light owner workspace](docs/screenshots/owner-light.png), [dark owner workspace](docs/screenshots/owner-dark.png), [contractor bill preview](docs/screenshots/contractor-dark.png). These are intentional documentation assets, not evidence of new payments. The submission still needs a video.

The [recording guide](docs/DEMO_GUIDE.md) describes the consolidated workflow. Historical rehearsal and publication records describe their own dated revisions; the [current release audit](docs/pre-submission-audit.md) records fresh checks and remaining limits. The owner-confirmed MIT holder is **MDBcertified**.

## Public historical evidence

- [Existing contractor payment](https://testnet.nearblocks.io/txns/6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1): **0.001 NEAR**, recipient `babygoat.testnet`, INV-0002 / `ACCEPTANCE-001`.
- [Existing storage-funding transaction](https://testnet.nearblocks.io/txns/CGmCDGsYimzLz2o9uCDmbsVXwHdUAG6wg1CqUrFLkLEG): **0.000001 NEAR**, `fund_storage({})`, historical acceptance only. [Scope and limitations](docs/METEOR_HISTORICAL_ACCEPTANCE_V3.json).
- [Validation record](docs/VALIDATION.md): real observations, human confirmations, fixture tests and unverified states are distinguished. Do not repeat either transaction during a demonstration.

The verifier relies on disclosed initial checkpoint trust and, for the storage assessment, corroborated HTTPS RPC evidence rather than an independent consensus proof. **No independent security review has occurred.** See [checkpoint review](docs/PAYMENT_CHECKPOINT_REVIEW.md) and [Meteor policy](docs/METEOR_REFERENCE_POLICY_V3.md).

## Architecture and storage

```text
Owner / contractor browser
  -> Next.js Node route handlers
  -> signed-message identity + organization/owner authorization
  -> SQLite identities / contractor records / durable payment queue
  -> read-only NEAR RPC -> existing Rust vault

Separate payment worker (stopped)
  -> exclusive durable-queue lock + reconciliation
  -> restricted key and independently gated payment method
```

`apps/owner/src/server` contains identity, organization, contractor, queue, transaction-attempt and chain services. `src/policy.ts` is a reference policy; `contracts/vault` is the independent Rust enforcement layer; `contracts/factory` handles atomic vault initialization; `contracts/sandbox` exercises WASM/receipts. The web launcher never starts the worker. Uploads and original invoice text live in the contractor database, not public static assets.

SQLite stores and WAL files require persistent local storage and a single coordinated instance. Never publish live database files, private links, credentials, logs or the full artifacts directory. [Hosting/cutover guide](docs/HOSTED_DEPLOYMENT.md) explains three-store snapshots, session handling, rollback and the optional single-instance Render deployment.

## Verification

See the [current release audit](docs/pre-submission-audit.md) for commands, counts and environments from the consolidation run. Browser cases use synthetic records and fixtures, not new real-wallet acceptance. [Theme report and screenshots](docs/THEME_REPORT.md) and earlier Linux memory/restart results are historical evidence for their recorded revisions; no fresh remote CI result is claimed.

```sh
# Repository root: policy regressions, no network transactions
npm test
# Owner app: backend, types, theme and production build
cd apps/owner
npm test
npm run typecheck
npm run check:theme
npm run build
```

Use [the isolated fixture recipe](docs/DEMO_GUIDE.md#regressions) or the existing CI workflows for browser tests; do not point mutation tests at a real/private database. Linux Rust checks: `bash scripts/check-core.sh` (rustup and system prerequisites in [PAYMENT_CORE.md](docs/PAYMENT_CORE.md)); these use local Sandbox accounts and do not deploy to public networks. Passing tests are not independent security review.

## Hackathon provenance and submission

Built for NEAR HACKATHON. The repository's first implementation commit is **29 October 2026**, within the permitted post-announcement window beginning 19 October. Dedicated development branch: [codex/nnetics-live-integration](https://github.com/Technique-S/Nnetics/tree/codex/nnetics-live-integration). [Full branch history](https://github.com/Technique-S/Nnetics/commits/codex/nnetics-live-integration/) includes the initial core; subsequent changes are visible in its [development comparison](https://github.com/Technique-S/Nnetics/compare/9206f079ca69b0c8893f5d777f7d3b474b6fda21...codex/nnetics-live-integration). The first commit is part of the entry, not an excluded baseline. Final submission revision remains to be reviewed/committed/pushed; no new tag or release is claimed.

AI assistance: OpenAI Codex and OpenCode. Direct libraries include Next/React, near-api-js 7.4.0, Wallet Selector 10.1.4, near-sdk 5.29.1, near-workspaces 0.23.0, near-sandbox 0.3.12, Tokio, anyhow and serde_json; proof tests also use near-primitives 0.37.4, ed25519-dalek 2.2.0 and reqwest 0.13.5. Exact dependencies are in the manifests/lockfiles. [Third-party notices](THIRD_PARTY_NOTICES.md) disclose adapted UI and the isolated Stageshow design illustration. Original code: [MIT](LICENSE), selected by the project owner.

## Documentation map

| Need | Guide |
| --- | --- |
| Run and record the demo | [Demo guide](docs/DEMO_GUIDE.md) |
| Current candidate, verification and publication blockers | [Pre-submission audit](docs/pre-submission-audit.md) |
| Repository topology and recovery references | [Consolidation audit](docs/repository-consolidation-audit.md) |
| Feature decisions and earlier walkthrough | [Reconciliation matrix](docs/feature-reconciliation-matrix.md) |
| Contractor invitations, invoices and storage | [Persistent portal](docs/PERSISTENT_CONTRACTOR_PORTAL.md) |
| Permission and identity boundaries | [Organization access](docs/ORGANIZATION_ACCESS.md), [session security](docs/SESSION_SECURITY.md) |
| NEAR rules, queue and vault lifecycle | [Payment core](docs/PAYMENT_CORE.md), [vault provisioning](docs/VAULT_PROVISIONING.md) |
| Assistant capabilities and model acceptance | [V3.2 audit](docs/NNETICS_V32_AUDIT.md), [V3.1 acceptance](docs/NNETICS_V31_REAL_MODEL_ACCEPTANCE.md) |
| Optional hosting and persistence | [Hosting guide](docs/HOSTED_DEPLOYMENT.md) |

Other delivery notes are historical records for the revisions they name. The excluded task-dashboard experiment and superseded UI variants remain recoverable on preservation branches; they are not additional startup paths.

[Current official rules](https://nearhackathon.com/HACKATHON.md), checked 5 November 2026, permit a local-only video demo (Q-012). Deadline: **15 November 2026, 00:59 WAT**. The repository must remain public through judging; the human must publish the demo post and approve the exact final submission payload. [Submission draft/checklist](docs/SUBMISSION_DRAFT.md) lists missing human-provided fields and the required post tags. If the team submits another independent project, its disclosure must be added before submission; that fact is not yet confirmed. Testnet-only eligibility does not imply production financial readiness.
