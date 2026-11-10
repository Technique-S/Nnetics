# Nnetics local demonstration guide

Selected route: **local demo video; hosting optional**. This guide authorizes no signing, payment, provisioning or publication. Record sample data and public historical evidence, keeping private links, real billing text and wallet windows out of frame.

## Handoff rehearsal — actual result

The final frontend artifacts (build `w38xe4-dMFK3Cw1XhXWUm`) were replayed on the existing permitted 3100 origin, with source-backed HTTP fixtures and a fresh isolated SQLite demo workspace. **No server was started by this replay.** Every screen carried a fixture/no-funds-move label. This is not a fresh final Next-server or real-Meteor login acceptance run.

Observed: sign-in entry; fixture viewer organization access; contractor/profile/invitation; simulated wallet request and owner approval; order DEMO-001 for 0.001 NEAR; bill submission, clarification and owner approval; reference/state retention after refresh; light/dark toggle and saved preference. The synthetic bill remained **Approved**, not Paid. Its temporary link was revoked at the end. The historical INV-0002 UI fixture displayed the original Paid/link metadata; separate read-only chain checks at **13:32:30 WAT on 5 November** confirmed the real vault paused and worker authorization revoked. No private billing text was copied into the fixture and no real payment job was created.

Local capture index (not public assets): `artifacts/submission-handoff/01-signin-fixture.png`, `02-owner-profile-before-private-link.png`, `03-bill-preview.png`, `04-approved-not-paid.png`, `05-dark-approved.png`, `06-historical-paid-metadata-fixture.png`, `07-paused-vault-fixture.png`. These are rehearsal aids; preserve their fixture labels if shown. The profile is captured **before** link creation; visible invitation values block capture. An initial scratch capture containing an already-revoked synthetic invitation was discarded and replaced, not retained as recording material.

## Setup

From a clean checkout, use Node 24 and npm:

```sh
cd apps/owner
npm ci
npm run build
npm run start
```

Open `http://127.0.0.1:3100/?mode=demo` for the labeled sample dashboard, and `/demo/contractors` for the persistent sample billing journey. No wallet or private environment file is needed. Keep one host/port throughout: localhost and 127.0.0.1 do not share sessions. Open contractor links in a separate browser context; wait until their fragment is removed from the address bar or crop the bar before recording. Never publish an invitation token.

The existing 3100 server was observed serving an older build without the theme bootstrap. It was not restarted. To preview the already-built candidate, stop your old preview yourself, then from `apps/owner`:

```powershell
$env:NNETICS_BUILD_DIRECTORY = '.next-rpc'
$env:NNETICS_TRANSACTIONS_AUTHORIZED = ''
$env:NNETICS_OWNER_TRANSACTIONS_AUTHORIZED = ''
$env:NNETICS_PAYMENT_EXECUTION_AUTHORIZED = ''
$env:NNETICS_PROVISIONING_ENABLED = ''
npm run start
```

This is a human-operated normal preview command. During handoff, automatic approval review also rejected a normal 3101 startup (`blocked by policy`); it was not retried. To keep the existing 3100 service running, the exact alternative command for **you** to run from `apps/owner` is:

```powershell
$env:NNETICS_BUILD_DIRECTORY='.next-rpc'
$env:NNETICS_APP_ORIGIN='http://127.0.0.1:3101'
$env:NNETICS_TRANSACTIONS_AUTHORIZED=''
$env:NNETICS_OWNER_TRANSACTIONS_AUTHORIZED=''
$env:NNETICS_PAYMENT_EXECUTION_AUTHORIZED=''
$env:NNETICS_PROVISIONING_ENABLED=''
npm run start -- --port 3101
```

Both gates must remain disabled in the private configuration. Use 3101 consistently in this case, in a **fresh browser profile/context with no private 3100 session**: browser cookies do not isolate ports on the same host. Do not sign in to a real wallet for the sample take. No server has been restarted by the agent. A clean checkout uses ordinary build/start instead of the ignored local artifact.

## Primary hackathon demo flow

The `/?mode=demo` route is now the primary experience (no account, no wallet, no tokens, no API key required).

1. Open the sign-in screen. Click **Try demo** (top-left), or go directly to `/?mode=demo`.
2. The demo workspace is blank. Create the **owner profile**, then the **vault** in a two-step wizard. The dashboard lands on the **Vault** tab.
3. In **Vault**, the **Demo Wallet** card funds the vault with any positive exact NEAR amount. Funding repeats and stacks exactly; all records are labeled Demo · simulated funds.
4. Open **Contractors** to create a demo contractor (or via Ask Nnetics). For a contractor, use **Prepare payment**; the resulting **Simulated NEAR Intent** shows quote → approval (recipient/amount/fee/total) → settlement. Final account is one debit for the fee-plus-amount total and one receipt.
5. **History**: pending payments settle automatically to confirmed receipts after ~1s; switching the outcome scenario to “Settlement fails” turns the next pending payments into failed, non-debited dry records. Repeatable without resetting.
6. **Settings**: spending limit (per-payment, clearable), outcome scenario, assistant status (server-side only), and an explicit **Reset demo workspace** button; reset is visitor-scoped.
7. **Ask Nnetics** (compact panel outside the five tabs): chips and actions run through the same UI commands — create contractor, summarize outstanding, prepare a payment draft, find a receipt. Ambiguous asks get a clarifying question. Approval always stays inside the review screen.
8. Reset returns the visitor to the blank profile/vault wizard; refresh preserves the workspace. Never exposes any keys; `OPENROUTER_API_KEY`/`NNETICS_ASSISTANT_MODEL` (optional) live server-side only.

## Short recording sequence

Aim for 2–3 minutes, with actual user action followed by its visible result.

| Moment | Action | Expected result / narration |
| --- | --- | --- |
| Sign-in / workspace (0:00–0:15) | Show sign-in entry, then enter the explicit demo route | “Real mode verifies a Meteor message and organization access. This take uses an isolated sample workspace; it is not a real wallet sign-in. No funds move.” |
| Invitation | Start contractor demo; create **Demo writer**; create/open its link off-camera | New owner-created profile and private contractor portal |
| Wallet approval | Contractor Wallet details: enter `writer-demo.testnet`, prepare simulated proof, request approval; owner refreshes and approves | “Wallet approval is simulated here. Real mode uses a signed wallet proof and separate owner approval.” |
| Work and bill | Owner creates **DEMO-001**, **Sample article**, **0.001 NEAR**; contractor selects the order, enters the text below and confirms its preview | Fixed recipient/currency, automatically assigned reference, submitted/review state |
| Review | Owner requests clarification; contractor answers on the same invoice; owner approves | Same reference, original text/history retained. **Approved is not Paid** |
| Persistence and appearance | Refresh sample billing; toggle light/dark | Submitted sample records and visual preference persist. Ordinary sample-dashboard changes can reset |
| Guarded payment concept | Show the fixed amount/recipient and approval result | “The NEAR contract enforces the approved recipient, amount and spending limits, and prevents paying the same order twice. An uncertain transfer stays blocked; the interface cannot override those rules.” |
| Historical proof | Open the public payment link, or show the explicitly labeled historical metadata fixture | “INV-0002's earlier 0.001 NEAR testnet payment to Babygoat is confirmed. This is historical evidence, not a transfer sent in this video.” |
| Vault / finish | Show dated paused/revoked evidence, repository and limitations | “The real vault is paused, worker permission revoked and both transaction gates off. Future automatic Meteor reference-block reconciliation is not enabled/live-verified. Parsing here is deterministic, not live AI. No mainnet readiness or independent security review is claimed.” |

Synthetic billing text:

```text
Work order: DEMO-001
Amount: 0.001 NEAR
I delivered the sample article for the approved brief.
```

Use **Format labeled details**, select the approved order and confirm description, amount and recipient. Answer any missing/conflicting details rather than bypassing them. Keep clarification on the same invoice. A wallet change must not alter an existing approved order's recipient.

An unsupported-currency example can demonstrate clarification, but never call it automatic conversion to NEAR. Sample dashboard Paid/Pending/Failed badges are simulations. Do not remove the simulation notice or describe those sample statuses as public-chain evidence.

## Historical evidence — view only

- [Contractor payment](https://testnet.nearblocks.io/txns/6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1): 0.001 NEAR to `babygoat.testnet`, existing INV-0002 / ACCEPTANCE-001.
- [Storage call](https://testnet.nearblocks.io/txns/CGmCDGsYimzLz2o9uCDmbsVXwHdUAG6wg1CqUrFLkLEG): 0.000001 NEAR; [limited historical acceptance](METEOR_HISTORICAL_ACCEPTANCE_V3.json). V2's original hold and consumed scope remain.

Explorer views do not sign. If unavailable, use a dated capture of public transaction evidence, labeled historical. Do not invent or repeat a transfer. No independent security review has occurred.

Do not use the ordinary sample dashboard's SIM receipts as INV-0002 evidence. Its sample switch can enable simulated outcomes only; it says nothing about the real vault. Use the public explorer or the explicitly labeled historical-metadata capture for the real receipt and dated public vault state. New owner signing cannot be shown live: V2's one-use storage attempt remains consumed/manual-review, and automatic reference-block compatibility is not enabled. The separate V3 historical decision is not a reusable transaction approval. No fresh real wallet login was attempted because this handoff authorizes no signatures; prior real-wallet acceptance remains separate evidence.

## Financial boundaries

Keep owner, payment and provisioning settings empty. No owner/worker private key or AI key is needed. Deterministic parsing is the supported demo path. Billing approval or a durable job alone never establishes Paid; unknown outcomes stay blocked.

Do not link/queue new live invoices for this recording. The bounded optional hosting launcher pins exactly the original Paid job at startup, so additional live jobs would require a separately reviewed startup policy. Do not reset or recreate INV-0002. Visibility of a control never replaces server authorization.

## Regressions

Reuse [VALIDATION.md](VALIDATION.md) for executed results. Root: `npm test`. Owner app: `npm test`, `npm run typecheck`, `npm run check:theme`, `npm run build`.

The [existing browser CI workflow](../.github/workflows/owner-integration.yml) uses a clean checkout. For an isolated future Linux run, from `apps/owner` with no private environment file and no existing fixture server:

```sh
npx playwright install --with-deps chromium
NNETICS_BROWSER_BASE_URL=http://127.0.0.1:3120 \
NNETICS_APP_ORIGIN=http://127.0.0.1:3120 \
NNETICS_DATABASE=/tmp/nnetics-browser/invoices.db \
NNETICS_IDENTITY_DATABASE=/tmp/nnetics-browser/identities.db \
NNETICS_CONTRACTOR_DATABASE=/tmp/nnetics-browser/contractors.db \
NNETICS_DEMO_PORTAL_DB=/tmp/nnetics-browser/demo.db \
NNETICS_TRANSACTIONS_AUTHORIZED= \
NNETICS_OWNER_TRANSACTIONS_AUTHORIZED= \
NNETICS_PAYMENT_EXECUTION_AUTHORIZED= \
NNETICS_PROVISIONING_ENABLED= npm run test:browser
```

Use a fresh fixture directory; never point mutation tests at real/private records. This is a reproduction recipe, not a command executed during submission preparation or a workaround for the denied startup. Linux system-package installation may require the operator's permissions.

## Before posting

For the chosen local-only route, record a video rather than only screenshots. Preserve sample/historical labels, financial details and recovery text. The human reviews and publishes the post with **@NEARProtocol** and **#NEARHackathon**, attaches the video and provides its public URL. [Draft](SUBMISSION_DRAFT.md). No post, application or new financial action has been executed.
