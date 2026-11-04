# Payment desk implementation

4 November 2026. Implements the approved direction from [REVIEW.md](REVIEW.md). The earlier review remains a historical audit; its “proposal only” statements describe that audit, before implementation approval.

## Changes

- Replaced the owner navigation with a shared desktop sidebar and mobile drawer. Desktop collapse preference is independent of authentication; navigation uses URL fragments so refresh/back restore the selected authorized view. Malformed route hints cannot grant authority or crash restoration.
- Added keyboard-accessible drawer dismissal, Escape, focus wrapping/restoration, background inertness, resize cleanup and a skip link. Desktop navigation stays available while scrolling.
- Kept the authenticated account visible; moved account actions and organization selection entry into a compact disclosure. Existing organization names now reach the dashboard instead of displaying a UUID as the business name.
- Removed the administrative wall from Overview, invoice review and payment history. Funding/limits are in Vault, viewer grants in Access, attempts/jobs in Recovery, and reference imports in the corresponding vendor/order views. Contractor billing uses the owner shell without merging off-chain profiles with on-chain vendor identities.
- Consolidated paused/revoked feedback. Zero unresolved transfers no longer produce an unresolved-outcome warning. Available payment funds now display `funded - spent - reserved`; authority remains a separate metric.
- Fixed the reproduced zero-budget percentage-rendering crash. No contract arithmetic, accounting or validation changed.
- Added skeletons during actual initial dashboard, session-restoration and contractor loading. Existing records remain in place during action updates, with a scoped busy/status message. Errors retain retry controls rather than displaying skeletons indefinitely.
- Added vendor/work-order empty states; retained invoice/history, fresh-account, contractor and private-link empty/error states. Empty states explain the next prerequisite without inventing records.
- Applied shared green/neutral colors, restrained panel radii, readable controls, exact monetary typography and visible focus styles across owner and contractor screens.
- Added short drawer, notification and color transitions and a subtle loading pulse. Reduced-motion preferences disable animation and transitions. No artificial loading delay was added.

## Boundaries

`Onboarding` still owns identity/session renewal and revocation. Route and sidebar changes do not create an adapter or request another wallet signature. The existing five-hour session policy, organization isolation, asynchronous request fences, snapshot subscriptions and contractor revocation behavior remain in their original modules.

All financial actions call their existing handlers and adapters. No API/server/worker/contract implementation or transaction payload changed. A view or URL is never authority. Worker execution remains stopped; financial controls retain existing backend gates.

Invoice references, original text, approved order binding, immutable recipients, payment job uniqueness and Paid evidence were not migrated or modified. The existing real INV-0002 payment remains 0.001 NEAR to babygoat.testnet.

## Verification and limits

- Production Next build and TypeScript checks passed on local Node 24.18.0.
- Existing backend suite: **96 passed, 0 failed**.
- Added targeted browser checks for zero-budget empty accounting, actual loading skeletons, contextual administrative destinations, drawer focus/inertness, collapse persistence, URL restoration and overflow.
- Existing browser assertions were adapted to navigation links, contextual destinations and the account disclosure. Viewer, protocol, session expiry, account-switch and duplicate/payment assertions remain enforced. Navigation tests that pause the clock use reduced motion so they test authorization state without freezing a drawer mid-transition.
- Current UI render captures use intercepted synthetic records, not authenticated real-user screenshots: [implemented/measurements.json](implemented/measurements.json), [desktop](implemented/owner-overview-desktop.png), [mobile](implemented/owner-overview-mobile.png). The captured Overview heading is at 130 px desktop / 146 px mobile, identity is not occluded, and the zero-budget fixture reports no exception. All 30 captured cases report no JavaScript errors or page overflow.
- Fresh read-only payment check at **2026-11-04T00:21:31.901Z**, finalized height **276121164**, block `4B93zB8o9VQnpoYhGAmhhkUoRSoHKSSWoJoEfx3TLKqM`: Grandtheft remains owner, vault paused, worker authorization null, existing Paid transaction unchanged, **zero transactions sent**.

Existing transaction: [6nV9YHQ…FzQefR1](https://testnet.nearblocks.io/txns/6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1).

### Local origin configuration

The private configuration specifies `http://127.0.0.1:3100`. A separate process initially occupied that port. The temporary preview at 3101/3102 correctly rejected actual demo form submissions because its origin differed. An attempted process-local override was rejected by automatic approval review with **“blocked by policy.”** No origin check was weakened.

The user then explicitly authorized stopping the process occupying 3100. That process was stopped, and the updated Nnetics production build is running at its existing configured origin: **http://127.0.0.1:3100**. The temporary 3101 preview was stopped. No private configuration edit was needed.

The intercepted desktop/mobile suite completed: **71 passed, 1 intentionally skipped (2.0 minutes)**. The skipped mobile duplicate is the desktop-only browser-process persistence case. The separate contractor/owner demo workflow suite completed **22 passed (1.5 minutes)** at the configured origin. Combined: **93 passed, 1 intentionally skipped** across the 72-case and 22-case runs. Earlier interrupted runs are not counted as passing. The first workflow run found two stale assertions for the consolidated worker-revocation copy; those assertions were updated to the new visible message and all 22 cases rerun successfully.

Actual post-redesign Meteor acceptance remains a manual check. Existing real-wallet acceptance is historical evidence, not a new execution.

No new wallet signature, payment, worker start, deployment, Git push, AI provider or production data migration was performed. Browser fixtures and demo-only attempts are distinct from the real paid record. Test logs and runtime data remain under ignored artifacts; secrets and private links are not included in this review packet.

Native zoom, a screen-reader pass and real-wallet visual acceptance remain manual follow-up checks. This frontend work does not establish independent security review or mainnet readiness.
