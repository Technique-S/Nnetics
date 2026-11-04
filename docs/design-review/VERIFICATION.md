# Execution and evidence — design audit

**4 November 2026.** This is a review packet, not an implemented product redesign. The baseline is commit `992ca22717c3f851a6969387f223f07830584c4e`, branch `codex/nnetics-live-integration`. Local runtime: Windows, Node 24.18.0, Edge/Playwright. This is not a new Linux CI or Rust protocol execution.

## Actual executions

| Check | Result | Scope / limits |
|---|---|---|
| Existing owner Node suite, `npm test` | **96 passed, 0 failed** | Existing backend regression cases; temporary fixture stores and mocked chain/provider responses. Not fresh wallet acceptance. |
| Existing `onboarding.spec.ts`, `testnet.spec.ts`, `interface.spec.ts` | **67 passed, 1 skipped**, 1.9 minutes | Desktop/mobile against the current server with test interception. The browser-process persistence case runs once on desktop and explicitly skips its mobile duplicate. |
| Current application capture | 29 fixture render cases plus one actual public-server check | 20 desktop/mobile route captures and nine edge-state captures. All authenticated data is intercepted and watermarked. Actual public check confirms testnet, configured state and `transactionsEnabled: false`. |
| Newly reproduced zero-budget state | **Failure: `Division by zero`** | A ready vault with zero budget/spend/reservation crashes the current Overview renderer. This is a real frontend defect exposed by a fixture, not an observed failure of the user's paid vault. No production fix applied during the proposal-only task. |
| Isolated proposal route/width matrix | **55 cases passed** | Eleven screens at 320, 390, 768, 1280 and 1440 CSS px; no page overflow or JavaScript errors, no API/wallet requests. |
| Proposal interaction checks | Passed | Collapsed navigation persists across reload; back navigation; drawer background inert, focus wrapping, Escape, focus return, destination close; bill preview dialog; reduced-motion setting. |
| Sampled text contrast | **5.01:1–12.69:1** | Eight token pairs; not exhaustive WCAG certification. |
| Stageshow gold/study renders | Captured and visually inspected; **automatic checker flags issues** | Static scene only; motion unjudged. Details and outstanding checker warnings are in [REHEARSAL.md](REHEARSAL.md). No clean film-gate pass claimed. |
| Existing payment / containment | Read-only check passed | Finalized on-chain code, owner, Paid linkage, paused state and null worker authorization checked. Zero transactions sent. |

The first capture-harness run used an ambiguous accessible-name selector and was corrected in the **audit harness only**. An initial Stageshow build had an import-case/path error and was corrected in the isolated illustration. Neither required a production-code change. Existing browser regressions passed unchanged. The zero-budget failure remains an actionable finding for implementation approval.

## Route and state coverage

The owner currently uses client view state inside `/`; these are not separate deployed page routes. Proposed hash destinations exist only in the isolated prototype.

| Existing surface | What was actually inspected | Evidence level |
|---|---|---|
| `/` anonymous sign-in / help | Public server response, rendered anonymous state, missing extension/wrong-account handling | Actual public GET + source + executed browser fixtures; no wallet connected |
| Wallet approval, cancellation, timeout, retry | Existing tests for pending proof, cancellation race, same-proof recovery and errors | Executed intercepted browser tests; not real Meteor approval |
| Saved-session restoration / expiry / navigation | Loading, RPC outage/recovery, ordinary tab/focus navigation, renewal, five-hour deadline, browser-process restart, cross-tab logout/account change | Executed existing browser fixtures + restoration/error screenshots. This does not replace earlier real-user acceptance |
| Organization list / fresh empty workspace / draft vault | Ready, no organizations, no vault, permission restriction | Current UI fixture screenshots; source review of provisioning guards |
| Vault provisioning pending/failure/resume | Outbox preparation, explicit dispatch/reconcile and status rendering | Source + existing Node fixtures; no new deployment or real interrupted transaction |
| Overview, Vendors, Work orders, Invoice review, Payment history | Populated desktop/mobile views, zero pending, viewer, zero budget | Actual UI with intercepted fixture responses; zero-budget exception recorded |
| Contractor management under owner | Profiles, private-link creation/revocation, wallet request review, off-chain order/bill review | Source/control inventory + owner fixture screenshot. No real invitation generated |
| `/contractor` | Submit a bill, My payments, Wallet details, pending wallet approval, revoked link | Desktop/mobile current UI fixture captures, source and Node tests |
| Clarification / wallet-change / duplicate submission / queue evidence | Existing immutable fields, original text, status mapping and server checks | Source + existing backend tests; not a newly executed real owner/contractor journey |
| Funding / limits / access / imports / repair / queue | All five TestnetControls sections, role gates, disabled controls, callbacks | Rendered current panel + source inventory; no sensitive action submitted |
| `/?mode=demo` / `/demo/contractors` | Separate adapter/storage boundary and explicit simulation labels | Source review; existing demo-start failure/retry browser case executed. Demo contractor mutations not run against the user's local store |
| Layout loading / error / empty / pending / paused / restricted / paid | Current capture for relevant states; proposal state selector for illustrated review variants | Fixtures and isolated visual scenes. Selecting a prototype Paid example cannot affect a record |

Authenticated screenshots use obviously synthetic IDs and a watermark; none establishes the current contents of Grandtheft's workspace. The new proposal uses only synthetic `owner-demo.testnet` / `writer-demo.testnet` examples. The actual confirmed transaction is linked in the review document as prior preserved evidence, never used as a fabricated prototype transaction.

## Measurements

- Current 1440×900 owner views: heading top **1,647 px**, administrative panel height about **1,369 px**; identity bar covered by the fixed sidebar.
- Current 390×844 owner views: heading top **2,296 px**, administrative panel about **1,672 px** tall.
- Proposed Overview: heading top **128 px desktop / 132 px mobile**, including the prototype-only annotation strip. Desktop state, metrics and review content are in the initial viewport.
- Additional **1280×720** check: heading at 128 px, first review row ends at 622.7 px, zero overflow. [Capture](proposals/overview-1280x720.png). The static server rejected a test mutation request with HTTP 405. All relative Markdown artifact links resolve.
- At tested widths the prototype had zero page-level horizontal overflow. The 320 px viewport is a reflow check, **not a claim of native browser zoom testing**.
- Current raw measurements: [measurements.json](evidence/measurements.json). Proposal geometry, contrast and assertions: [verification.json](proposals/verification.json).

## Preserved real payment

Read-only `deploy/preflight.mjs` result at `2026-11-03T23:37:00.734Z` (**4 November 00:37 WAT**):

```json
{
  "height": 276116702,
  "blockHash": "ESm7e6m5U7kkCDQVNymjUo3ebokLRq3NUzSUVVtuLURi",
  "owner": "grandtheft.testnet",
  "paused": true,
  "workerAuthorization": null,
  "payment": "6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1",
  "transactionsSent": 0
}
```

The verifier additionally enforces pinned deployed code, no vault keys, zero reservation, one attempt, and the exact `Paid` invoice/order/recipient/amount linkage. Existing INV-0002 remains **0.001 NEAR to babygoat.testnet**. [Existing transaction](https://testnet.nearblocks.io/txns/6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1).

No worker was started. No signature, transaction, deployment, queue operation, database migration, live invitation, session-policy change or Git push was performed. Production source and dependency files remain unchanged; only the isolated review packet and ignored rendering artifacts were authored.

## Reproduce the review

From the repository root:

```powershell
node docs/design-review/serve.mjs
```

Open `http://127.0.0.1:3210/#overview`. The server serves only this review directory, binds to loopback, rejects mutation methods and uses `connect-src 'none'` / `form-action 'none'`. The preview works without production dependencies or environment credentials. It never reads the live database. Do not run another copy if port 3210 is already serving this proposal.

With the repository's existing Playwright dependencies and Edge available, separate terminal:

```powershell
node docs/design-review/verify-proposal.mjs
```

To reproduce the current-interface audit against the already running app at localhost:3101:

```powershell
node docs/design-review/capture-current.mjs
```

This harness intercepts authenticated API responses and refuses unhandled mutations. Its actual-server check uses public GETs only. Test logs/runtime dependencies are under ignored `artifacts/design-runtime`; review JSON/PNGs contain no cookies, credentials or invitation tokens. The full-size prototype is plain HTML/CSS/JS; rebuilding the optional Stageshow illustration needs its locally installed skill kit/runtime, documented separately.

## Still unverified / not claimed

- Production redesign is **not implemented**. Visual proposals and their checks do not prove the future production migration.
- No fresh real Meteor login or complete real invitation/payment acceptance in this audit. Preserve the already documented user acceptance; do not relabel fixture executions as real-wallet results.
- No screen-reader session, touch-device session, native 200%/400% browser zoom, cross-browser matrix or long-account-ID acceptance yet. These are explicit production acceptance gates in [IMPLEMENTATION.md](IMPLEMENTATION.md).
- No new app production build, Linux Node 24.22.1 CI, Rust protocol-86/88 run, memory benchmark or hosted rollout here; no production source changed. Previous results remain historical evidence, not new executions.
- No independent security review occurred. Author design review and passing tests do not establish independent review, mainnet readiness or readiness to enable payments.
