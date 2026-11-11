# Nnetics integration and release acceptance

## Integration plan and compatibility

The functional checkout was `feature/nnetics-v3` at `7657c9f`. The design worktree started at the same commit. The older `feature/task-dashboard-demo` branch at `cab265c` is an ancestor of V3 and has uncommitted experimental route and component files. Those files remain in their original checkout.

The shared baseline includes guarded prepare/confirm demo payments (`ab210c5`), contractor deletion and archiving (`eb776d2`), and six-destination navigation with Activity and receipt aliases (`7657c9f`). The design consumes the existing ledger, contractor APIs and model tool pipeline. Server implementations and contract sources have no design changes. UI changes reconcile assistant navigation with Invoices and Payments, preserve the Activity receipt aliases, and initialize the standalone contractor demo through its existing session endpoint.

Compatibility was confirmed before merging. The reviewed design and initial acceptance fixes were committed as `b9036dc`, and the clean functional checkout was fast-forwarded to that commit. Acceptance runs against the integrated functional checkout. The backup branch `codex/nnetics-before-design-integration` preserves `7657c9f`. No history was rewritten.

| Area | Compatibility result |
| --- | --- |
| Demo payments | Existing prepare, single-use confirmation, reservation, settlement, failure and unknown-outcome controls preserved. |
| Contractor lifecycle | Unlinked deletion, linked archiving, retained financial history and revoked portal access preserved. |
| Activity and receipts | Six-destination baseline, receipt aliases, confirmed evidence and text export preserved. |
| Ask Nnetics | Existing model API and tool execution preserved; navigation chips target current destinations. |
| Workspace onboarding | Existing private browser demo stores preserved; fresh-entry messaging corrected. |
| Navigation | Current hashes, legacy aliases, refresh persistence, desktop rail and mobile drawer retained. |

## Fresh-session issue

A clean Edge Chromium context had zero cookies and still displayed “Your session has ended.” The automatic initial restoration calls `/api/live/identity`. Its normal unauthenticated response is HTTP 400 with a message starting `Wallet verification required.` The client treated that expected initial state as an error.

Initial restoration now treats that specific response and HTTP 401 as signed-out entry. Authentication still denies private records. Retryable verification failures still offer saved-session recovery. Active-session expiry, account switching, logout and signing use their existing verification paths. Browser regressions cover clean entry through the demo CTA, workspace creation, reload persistence, denial of private identity, and unavailable session recovery.

## Legacy test reconciliation

Git history identifies `8d60ea3` as the commit removing `Add sample invoice` and the seeded invoice interface. The two action-state tests referred to that earlier UI. Their replacement fixtures create an isolated workspace, contractor, simulated wallet proof, approved work order and invoice through current demo APIs. They retain checks for exact recipient and amount, a single edit/cancel path, and loading confined to the review action while navigation remains usable. No failing case was removed to conceal a regression.

Expanding acceptance to the entire browser directory found more pre-V3 assumptions in the older owner, redesign and interface suites. Those tests now create real isolated demo records and check the current six destinations, immutable work-order recipients, paused payment rejection, conflicted invoice approval blocking, unknown-outcome reservations, literal source text, currency rejection and durable references. Mocked live tests retain owner/viewer authorization and signing-exclusion assertions. The fixture changes reflect V3 product behavior already present at `7657c9f`.

Other test corrections replace stale accessible text, wait for restored setup before changing appearance, and dispatch configuration drift deterministically before a focus refresh can remove the control. The worker-gate subprocess gets 15 seconds to boot under concurrent suites; fail-closed assertions are unchanged. The theme scan excludes generated Next output inside `src`, retaining all source-token and contrast checks.

## Integrated demo journey

The capture acceptance ran against `feature/nnetics-v3` on a production Next server at port 3112 with isolated SQLite demo stores and all live transaction/provisioning authorization flags disabled.

| Journey step | Result |
| --- | --- |
| Clean entry → Try demo | No cookies, normal sign-in screen, private identity still rejected. |
| Create workspace → Set up vault | Named owner and vault created; Overview opens and survives refresh. |
| Fund vault → Create contractor | Simulated 12.5 NEAR funding and contractor creation succeed. |
| Contractor portal → Wallet approval | Separate browser context follows private link, requests simulated proof, owner approves wallet. |
| Work order → Submit invoice → Approve invoice | Fixed recipient and amount retained; submitted bill appears in owner Invoices and becomes Approved. |
| Prepare → Confirm → Simulated settlement | Exact recipient/amount review, reservation, pending state and recorded success verified. |
| Activity → Receipt | Paid record, receipt detail, and correctly named text download verified. |

This sequence passed at 375, 768 and 1440px. Approval and contractor payment remain separate supported operations, as in V3. The acceptance does not claim that approving an invoice automatically executes a payment or attaches the separate contractor payment to that invoice.

Additional browser acceptance covers unlinked contractor deletion, linked contractor archiving, portal revocation, duplicate submissions, cross-owner isolation, forged authority, CSRF, source currency conflict, natural-language model/tool operations, navigation aliases, history and reload. Appearance acceptance covers light/dark, persistence across tabs and process restart, blocked preference storage, keyboard focus, modal containment, forced colors, reduced motion and compact reflow.

## Screenshot review

All 115 supplied screenshots were reviewed in ten labelled contact sheets, with larger views used for payment details and compact layouts. The screens cover 39 mobile, 38 tablet and 38 desktop states. Typography, palette and component treatment are coherent across the workspace and portal. The invitation fields are masked in evidence.

Two concrete payment-detail issues were identified. The total label described a debit even for failed outcomes, so it now says “Payment plus demo fee.” Phone confirmations gave long values a narrow second column, so payment review labels and values now stack on phones. Entry screenshots are regenerated after the fresh-session correction. All 115 final captures were regenerated from the integrated checkout: 39 phone, 38 tablet, 38 desktop; zero capture errors and zero overflow failures. Fixed navigation appearing partway down a full-page screenshot reflects viewport anchoring during capture. Browser expansion also found the dashboard error alert had lost its accessible name; the mode-specific label was restored.

## Verification and readiness

Final browser acceptance is in progress; readiness will be recorded when it completes.

| Check | Integrated result |
| --- | --- |
| Repository unit tests | 42 passed, 0 failed. |
| Owner unit tests | 323 passed, 0 failed. Total: 365. |
| Browser tests | Pending final complete-directory run. |
| Typecheck | `npm run typecheck` passed. |
| Production build | `npm run build` passed. |
| Theme | Source-token check and all 42 semantic contrast combinations passed. |
| Screenshots | 115, zero capture errors, zero page-overflow failures. |

Browser evidence logs, traces and test databases remain local under ignored `artifacts` directories. The reproducible capture script and masked screenshot evidence are committed under `docs/design-review/final-design/after`.

Accessibility verification includes keyboard navigation, drawer focus containment, forced colors, reduced motion, semantic contrast checks and responsive reflow. Full screen-reader validation, physical touch-device testing and a complete WCAG conformance assessment remain outstanding. Financial acceptance uses simulated payments. Live signing and transfers are outside this release acceptance.
