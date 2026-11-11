# Nnetics integration and release acceptance

## Integration plan and compatibility

The functional checkout uses `feature/nnetics-v3` at `7657c9f`. The design worktree started at the same commit. The older `feature/task-dashboard-demo` branch at `cab265c` is an ancestor of V3 and has uncommitted experimental route and component files. Those files remain in their original checkout.

The shared baseline includes guarded prepare/confirm demo payments (`ab210c5`), contractor deletion and archiving (`eb776d2`), and six-destination navigation with Activity and receipt aliases (`7657c9f`). The design consumes the existing ledger, contractor APIs and model tool pipeline. Server implementations and contract sources have no design changes. UI changes reconcile assistant navigation with Invoices and Payments, preserve the Activity receipt aliases, and initialize the standalone contractor demo through its existing session endpoint.

Integration proceeds by committing the reviewed design and acceptance changes, confirming the functional checkout is clean and still at the shared baseline, and fast-forwarding `feature/nnetics-v3`. Final acceptance runs against that integrated checkout. A fast-forward preserves all existing functional commits and the design commit, with no conflict resolution or history rewriting.

## Fresh-session issue

A clean Edge Chromium context had zero cookies and still displayed “Your session has ended.” The automatic initial restoration calls `/api/live/identity`. Its normal unauthenticated response is HTTP 400 with a message starting `Wallet verification required.` The client treated that expected initial state as an error.

Initial restoration now treats that specific response and HTTP 401 as signed-out entry. Authentication still denies private records. Retryable verification failures still offer saved-session recovery. Active-session expiry, account switching, logout and signing use their existing verification paths. Browser regressions cover clean entry through the demo CTA, workspace creation, reload persistence, denial of private identity, and unavailable session recovery.

## Legacy test reconciliation

Git history identifies `8d60ea3` as the commit removing `Add sample invoice` and the seeded invoice interface. The two action-state tests referred to that earlier UI. Their replacement fixtures create an isolated workspace, contractor, simulated wallet proof, approved work order and invoice through current demo APIs. They retain checks for exact recipient and amount, a single edit/cancel path, and loading confined to the review action while navigation remains usable.

## Screenshot review

All 115 supplied screenshots were reviewed in ten labelled contact sheets, with larger views used for payment details and compact layouts. The screens cover 39 mobile, 38 tablet and 38 desktop states. Typography, palette and component treatment are coherent across the workspace and portal. The invitation fields are masked in evidence.

Two concrete payment-detail issues were identified. The total label described a debit even for failed outcomes, so it now says “Payment plus demo fee.” Phone confirmations gave long values a narrow second column, so payment review labels and values now stack on phones. Entry screenshots are regenerated after the fresh-session correction. Fixed navigation appearing partway down a full-page screenshot reflects viewport anchoring during capture.

## Verification and readiness

Final integrated results are recorded below after acceptance finishes. Release readiness requires successful workspace creation, vault funding, contractor invitation and wallet approval, invoice submission and owner review, simulated settlement, and receipt access in Activity on the integrated application.

Accessibility verification includes keyboard navigation, drawer focus containment, forced colors, reduced motion, semantic contrast checks and responsive reflow. Full screen-reader validation, physical touch-device testing and a complete WCAG conformance assessment remain outstanding. Financial acceptance uses simulated payments. Live signing and transfers are outside this release acceptance.
