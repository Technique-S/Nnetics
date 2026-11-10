# Nnetics

Pay approved contractor work within limits you set.

Nnetics is a **NEAR testnet MVP** for contractor billing: private invitations, wallet approval, text-first invoices, clarification and owner review, with payment rules independently enforced by a Rust vault. The submission demo uses clearly labeled sample records. **New owner transactions, automated payments and provisioning are disabled.** This is not a mainnet payment service or an independently reviewed contract.

Release source is the [live-integration branch](https://github.com/Technique-S/Nnetics/tree/codex/nnetics-live-integration). GitHub's current default branch is the older `codex/payscope-milestone-1`; no default-branch change was made. The latest local candidate and this updated README still require an approved commit/push before judges can review them publicly.

## Try it locally — no wallet or secrets required

Use Node.js **24** and npm (hosting is pinned to 24.22.1; the latest local checks used 24.18.0). From a clean checkout:

```sh
cd apps/owner
npm ci
npm run build
npm run start
```

Open **http://127.0.0.1:3100/?mode=demo** → click **Try demo** on the sign-in screen (top-left) or open the link directly. The walkthrough starts from a blank demo workspace: enter a profile and vault name, then land on the Vault tab, fund the Demo Wallet with any positive exact NEAR amount, run quotes/approvals/settlement with simulated funds, and use the **Ask Nnetics** panel (outside the five tabs) for scripted or optional server-model answers. Open **http://127.0.0.1:3100/demo/contractors** → choose **Start contractor demo** → create a sample contractor and private link → open the link in a separate browser context → complete the simulated wallet/invoice journey. No real wallet signature or funds are involved. [Detailed judge/demo instructions](docs/DEMO_GUIDE.md) include the review/clarification sequence and expected results.

Use one origin consistently; `localhost` and `127.0.0.1` do not share sessions. If this port is occupied, stop your own old preview first. For an already-built isolated final candidate, from `apps/owner` set `NNETICS_BUILD_DIRECTORY=.next-rpc` before `npm run start`. A clean checkout uses the default `.next` build. Local instructions are not approval for signing or public deployment.

No `.env.local` is needed for the sample demo. Keep demo records synthetic; their local SQLite files are ignored by Git. To develop the real login flow, copy `.env.example` privately and set the exact application origin; **leave transaction, payment and provisioning flags empty**. A supported, activated Meteor testnet account can authenticate without an existing organization/vault, and can create an off-chain organization. Organization creation does not create or fund a vault. Private live records are never distributed with the repository.

## What works, what is historical, what is simulated

| Capability | Actual status |
| --- | --- |
| Meteor identity, persisted sessions and organization isolation | Implemented. Prior real two-wallet checks are recorded separately from fixtures; sessions have a five-hour absolute limit. Explicit Switch wallet authenticates a different account; passive Meteor account reporting is limited |
| Private contractor billing | Persistent backend: owner profiles, revocable invitations, wallet proof/approval/change requests, original text, upload/preview, clarification, review and status tracking. Contract recipients stay fixed on existing approved orders |
| Invoice references/currency | Server-generated, durable references and duplicate-submission identities; fixed NEAR/testnet, with conflicting source currencies flagged rather than converted |
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

The [recording guide](docs/DEMO_GUIDE.md) now records a completed final-frontend/source-backed fixture rehearsal. Normal final-server startup was policy-blocked; this is not a new real-Meteor sign-in or complete production-server acceptance. [Publication proposal](docs/PUBLICATION_PROPOSAL.md) gives the exact local package for review, including the owner-confirmed MIT holder **MDBcertified**.

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

Latest executed local evidence: **215 owner/backend tests, 160 browser tests and 42 root tests passed**, plus typecheck, production build and `check:theme`. Browser cases use fixtures, not new real-wallet acceptance. [Theme report and screenshots](docs/THEME_REPORT.md). Node 24.22.1 Linux memory/restart results apply to the earlier recorded CI revision; the current uncommitted candidate has not run in remote CI.

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

AI assistance: OpenAI Codex. Direct libraries include Next/React, near-api-js 7.4.0, Wallet Selector 10.1.4, near-sdk 5.29.1, near-workspaces 0.23.0, near-sandbox 0.3.12, Tokio, anyhow and serde_json; proof tests also use near-primitives 0.37.4, ed25519-dalek 2.2.0 and reqwest 0.13.5. Exact dependencies are in the manifests/lockfiles. [Third-party notices](THIRD_PARTY_NOTICES.md) disclose the isolated Stageshow design illustration. Original code: [MIT](LICENSE), selected by the project owner.

[Current official rules](https://nearhackathon.com/HACKATHON.md), checked 5 November 2026, permit a local-only video demo (Q-012). Deadline: **15 November 2026, 00:59 WAT**. The repository must remain public through judging; the human must publish the demo post and approve the exact final submission payload. [Submission draft/checklist](docs/SUBMISSION_DRAFT.md) lists missing human-provided fields and the required post tags. If the team submits another independent project, its disclosure must be added before submission; that fact is not yet confirmed. Testnet-only eligibility does not imply production financial readiness.
