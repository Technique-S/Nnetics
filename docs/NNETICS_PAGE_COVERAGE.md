# Nnetics page coverage

The [baseline audit](NNETICS_FINAL_DESIGN_AUDIT.md) inventories the routes, roles, states and protected behavior. The [design system](NNETICS_DESIGN_SYSTEM.md) defines the tokens, components and motion.

## Browser evidence

- [Before screenshots](design-review/final-design/before/) and [capture results](design-review/final-design/before/results.json)
- [After screenshots](design-review/final-design/after/) and [capture results](design-review/final-design/after/results.json)
- [Playwright capture script](../apps/owner/scripts/capture-final-design.mjs)

The 115 after captures use 375, 768 and 1440px Edge Chromium viewports. The 69 before captures use 375 and 1440px. Both capture runs reported zero document overflow at their measured widths. Reflow and focus were also exercised at 320px and a 720px simulated zoom width in the appearance suite. The capture script uses separate owner and contractor browser contexts. A provider error and workspace retry are injected fixtures. Payment, invoice, funding and portal records in the end-to-end workflow come from the isolated local demo stores. Invite field values are masked.

## Visual review

Scores are 1–5, where 5 means the inspected state consistently met the criterion. H = hierarchy, T = typography, S = spacing, C = color, I = interaction, R = responsive layout, A = accessibility, O = organization, M = motion, B = brand. Motion and accessibility scores reflect the sampled behavior.

| Surface | Audited and changed | H | T | S | C | I | R | A | O | M | B | Review notes |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | --- |
| Entry and wallet sign-in | Demo-first entry, workflow preview, sign-in states | 5 | 5 | 4 | 5 | 4 | 4 | 4 | 5 | 4 | 5 | Signed-out session copy can still appear for a new browser. |
| Demo onboarding and recovery | Workspace and vault steps, setup completion, optional first steps, loading and retry | 5 | 4 | 4 | 5 | 4 | 5 | 4 | 5 | 4 | 5 | The first-action guide is inline on Overview. The existing create call still creates the workspace and vault together. |
| Owner shell and Settings | Six destinations, desktop rail, mobile More, workspace name and appearance | 5 | 4 | 4 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | The same route hashes and utility menu are retained. |
| Overview | Available/reserved balance, attention, metrics, recent activity, payout chart, shortcuts | 5 | 5 | 4 | 5 | 4 | 4 | 4 | 5 | 4 | 5 | The mobile view is intentionally stacked. A fresh workspace shows zero counts and explains how to populate them. |
| Contractors and work orders | Directory, creation, search, wallet/status filters, archive, links, agreements and details | 4 | 4 | 4 | 5 | 4 | 4 | 4 | 4 | 4 | 5 | In-row actions and confirmations preserve the existing guards. |
| Invoices | Unified demo review, search/status/contractor filters, sorting and source record | 5 | 4 | 4 | 5 | 4 | 4 | 4 | 5 | 4 | 5 | Long invoices expand into inline detail. Approval stays separate from payment preparation. |
| Payments | Ready contractors, queue search and status, exact review totals and settlement feedback | 4 | 4 | 4 | 5 | 4 | 4 | 4 | 4 | 4 | 5 | Pending settlement and failure have separate text. Long mobile confirmations remain inline and scrollable. |
| Activity and receipts | Search, event categories, funding history, legacy receipt deep links, text export | 4 | 4 | 4 | 5 | 4 | 4 | 4 | 4 | 4 | 5 | Receipts use confirmed records. Copy and export are available in the same row. |
| Vault & Controls | Balance, paused/active state, funding, reservations, limit and reset actions | 4 | 4 | 4 | 5 | 4 | 4 | 4 | 5 | 4 | 5 | The demo scenario and limit controls remain in Settings. |
| Ask Nnetics | Suggestions, visible history, model pending/error, action chips, desktop expansion and mobile modal | 4 | 4 | 4 | 5 | 4 | 4 | 4 | 4 | 4 | 5 | The provider returns whole responses. The UI presents pending state while waiting. |
| Private contractor portal | Entry and revocation, wallet proof/approval, submission, status and clarification | 5 | 4 | 4 | 5 | 4 | 4 | 4 | 5 | 4 | 5 | One-column forms put the preview after fields on phones. |
| Standalone contractor demo and fallbacks | Separate demo entry, not-found, shared loading and error surfaces | 4 | 4 | 4 | 5 | 4 | 4 | 4 | 4 | 4 | 5 | Runtime error boundaries share the recovery styling. |

## Accessibility findings

- The baseline masked real Overview data under overlapping cards. The redesigned balance, reserve, metrics and actions have distinct layout areas.
- The theme script verifies 42 semantic contrast combinations. Forced colors, reduced motion, keyboard drawer containment and ordinary tab navigation were exercised in Chromium.
- More is a native modal. The assistant uses a desktop dock and opens as a modal on phones. Closing returns focus to its launcher. The mobile drawer makes background content inert.
- Labels, explicit status text, persistent validation, full account/reference values and scrollable long forms remain available.
- Full assistive-technology testing and a complete WCAG conformance evaluation remain outside the verified browser coverage.

## Functional evidence

- Repository tests passed 42 of 42. Owner tests passed 323 of 323. A final focused repeat passed 43 of 43 presentation, contractor isolation, payment and assistant tests. Type checking, the production build, the theme check and the design detector passed.
- The corrected contractor, navigation and Overview browser run passed 30 of 30 across desktop and mobile. This includes attachment upload, clarification, wallet changes, immutable work-order recipients, portal revocation, cross-owner isolation, forged authority, CSRF and duplicate submission races.
- The final payment browser suite passed 6 of 6 on desktop and mobile, including pause/resume, confirmation, receipt access and verification that simulated payments did not reach a wallet, signer or chain.
- The configured OpenRouter browser test passed contractor creation, its navigation chip, available vault balance, a contextual follow-up and record/history persistence after reload.
- The screenshot acceptance verifies entry, workspace creation, funding, pause/resume, contractor creation, link issuance, wallet request and owner approval, work order, invoice submission and approval, payment preparation and settlement, Activity, receipt download and revoked access.
- The acceptance evidence uses demo records and mocked live-wallet fixtures. Live wallet signatures, network transfers and transaction provisioning were not executed.
- Two legacy action-state tests still expect the pre-V3 sample invoice button and seeded invoice rows. The V3 browser workspace opens without sample records. A persistent-browser theme test timed out during one parallel run and passed in another run.
- The portal has an expired/revoked recovery state. The captured portal failure used revocation. Time-based expiration and browser-specific screen-reader behavior were not captured.
