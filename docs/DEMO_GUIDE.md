# Nnetics local demonstration guide

Use the canonical `apps/owner` application on `chore/nnetics-repository-consolidation`. Sibling worktrees preserve older versions; they are not services to run together. This guide describes synthetic demo records. Historical testnet evidence is separate.

## Setup

Use Node 24 and npm. From a clean checkout:

```sh
cd apps/owner
npm ci
npm run build
npm run start
```

For development, use `npm run dev` instead of build/start. Open `http://127.0.0.1:3100/?mode=demo`, or choose **Try demo** on the sign-in screen. No wallet, tokens or private environment file is required for the manual demo. Ask Nnetics requires an optional server-side OpenRouter key; absence or provider rate limits produce an explicit failure, not a successful answer.

Use one origin consistently. Open contractor links in a separate browser context. Private invitation fragments must not appear in recordings; wait for the portal to consume them or crop the address bar. Never publish a private portal link, real billing text, local database or private environment file.

## Primary demo journey

1. Enter an **Owner name**, continue, enter a **Vault name**, and create the demo workspace. It opens on **Overview**.
2. Open **Vault & Controls** and fund the **Demo Wallet** with a positive exact NEAR amount. Funding is simulated and stacks; no funds move onchain.
3. Open **Contractors**, create a synthetic contractor, and issue its private invitation. Open that link in a separate browser context. The standalone `/demo/contractors` page remains a supported billing entry point into the same contractor service.
4. In the contractor portal, request a wallet such as `writer-demo.testnet`, prepare the simulated ownership proof, and submit it for approval. Back in the owner workspace, approve that exact request.
5. Create work order **DEMO-001**, title **Sample article**, amount **0.001 NEAR**. Its recipient is fixed; a subsequent wallet change cannot rewrite the existing order.
6. In the portal, select the work order and submit the synthetic bill below. Review the extraction preview before submission. The server assigns a durable invoice reference.
7. In owner **Payables**, inspect the invoice, open **View details**, and expand **Original billing text**. Keyboard Enter toggles the disclosure; Escape collapses it and returns focus. Request clarification, answer from the portal on the same invoice, then approve as owner. Approval makes it **Ready to Pay**; it does not establish Paid.
8. Within Payables, obtain the simulated quote, review recipient/amount/fee, explicitly approve and authorize it, then execute and settle. This is a modeled NEAR Intents lifecycle, not a real solver or blockchain transfer. Expired quotes or failed outcomes must remain visible and must not claim settlement.
9. In **Activity**, inspect the simulated receipt and audit events. Refresh both owner and contractor views to check retained records. Try a second payment attempt: existing paid/reserved records must prevent duplicate payment.
10. Toggle light/dark and inspect mobile navigation. Settings contains the visitor-scoped demo reset; resetting requires confirmation.
11. Optionally ask **Ask Nnetics** to list contractors, inspect wallet status or find a payable. Mutating lifecycle tools use separate server-issued confirmation cards. Provider failure does not prove that an interrupted action did nothing: review records before retrying.

```text
Work order: DEMO-001
Amount: 0.001 NEAR
I delivered the sample article for the approved brief.
```

The navigation is **Overview, Contractors, Payables, Activity, Vault & Controls**, with **Settings** as an additional destination. Earlier delivery documents may use Invoices, Payments, Vault or History for superseded navigation. The reconciliation matrix records a prior complete simulated walkthrough; the current release audit records fresh automated verification.

## Recording

Aim for 2–3 minutes: Overview → contractor invitation → simulated wallet approval → invoice and clarification → owner approval → simulated settlement/receipt → limits and historical evidence. Preserve the Demo/Simulated labels. Capture a profile before issuing the private link, or hide the link area. Manual workflows remain available if the optional model is unconfigured or rate-limited.

Bill approval, authorization and settlement are separate steps. Cross-currency selections in the demo do not prove live conversion or cross-chain settlement. Live settlement remains native NEAR/testnet and is disabled for this release candidate.

## Historical evidence — view only

- [Contractor payment](https://testnet.nearblocks.io/txns/6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1): recorded 0.001 NEAR to `babygoat.testnet`, INV-0002 / ACCEPTANCE-001.
- [Storage call](https://testnet.nearblocks.io/txns/CGmCDGsYimzLz2o9uCDmbsVXwHdUAG6wg1CqUrFLkLEG): recorded 0.000001 NEAR; [limited historical acceptance](METEOR_HISTORICAL_ACCEPTANCE_V3.json).

These links are preserved historical references, not freshly reverified chain observations. Never recreate the transfers or use SIM receipts as their evidence. Earlier handoff captures and Linux verification apply only to their recorded revisions; see [VALIDATION.md](VALIDATION.md). The earlier full real-model GO report has an [unresolved evidence discrepancy](NNETICS_V31_REAL_MODEL_ACCEPTANCE.md#evidence-reconciliation--2026-11-13).

## Verification with isolated data

At repository root, run `npm test`. In `apps/owner`, run `npm test`, `npm run typecheck`, `npm run check:theme`, and `npm run build`. There is no configured standalone lint command; do not represent type checking as a lint run.

For browser checks, use a clean checkout with no private environment file, a free port, and a fresh directory. From `apps/owner` on PowerShell:

```powershell
$fixtureRoot = Join-Path ([IO.Path]::GetTempPath()) ('nnetics-browser-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fixtureRoot | Out-Null
$env:NNETICS_BROWSER_BASE_URL = 'http://127.0.0.1:3120'
$env:NNETICS_APP_ORIGIN = $env:NNETICS_BROWSER_BASE_URL
$env:NNETICS_DATABASE = Join-Path $fixtureRoot 'invoices.db'
$env:NNETICS_IDENTITY_DATABASE = Join-Path $fixtureRoot 'identities.db'
$env:NNETICS_CONTRACTOR_DATABASE = Join-Path $fixtureRoot 'contractors.db'
$env:NNETICS_DEMO_PORTAL_DB = Join-Path $fixtureRoot 'portal.db'
$env:NNETICS_DEMO_WORKSPACE_DB = Join-Path $fixtureRoot 'workspace.db'
$env:NNETICS_TRANSACTIONS_AUTHORIZED = ''
$env:NNETICS_OWNER_TRANSACTIONS_AUTHORIZED = ''
$env:NNETICS_PAYMENT_EXECUTION_AUTHORIZED = ''
$env:NNETICS_PROVISIONING_ENABLED = ''
$env:OPENROUTER_API_KEY = ''
$env:CI = 'true'
npm run test:browser
```

Playwright starts and stops the production server. Windows uses installed Edge; Linux uses Chromium (`npx playwright install --with-deps chromium`). The clean-checkout [CI workflow](../.github/workflows/owner-integration.yml) provides the Linux equivalent. If you intentionally built into `.next-hosting`, set `NNETICS_BUILD_DIRECTORY=.next-hosting` for typecheck, build and browser run consistently. Never reuse private databases. Both demo database overrides are required for isolation.

`ask-nnetics.spec.ts` is a separate real-provider acceptance test. The default suite skips it unless `NNETICS_RUN_REAL_MODEL_ACCEPTANCE=1` is explicitly set. A separately approved run also needs a configured server-side provider key and available quota; its assertions still require real successful responses. Controlled-provider agent/lifecycle tests run without this opt-in. No complete real-provider pass is claimed by the default suite.

Rust/sandbox checks require the supported Linux/macOS runtime: `bash scripts/check-core.sh` and `bash scripts/check-provisioning.sh`. They use local sandbox accounts. Do not substitute a public-network sandbox binary or initiate new testnet transfers.

## Publication

The [current release audit](pre-submission-audit.md) lists outstanding checks and the proposed branch cleanup. The human reviews the exact candidate, approves publication and default-branch changes, records the video, and publishes the submission post. See [SUBMISSION_DRAFT.md](SUBMISSION_DRAFT.md) for the previously prepared fields and tags. No public submission, remote push or financial operation is implied by this guide.
