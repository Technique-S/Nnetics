# Interface implementation — 2 November 2026

Implemented the approved Stageshow/Unslop audit direction: retain Nnetics' green identity and serif headings, improve the working interface's readability and consistency, and repair loading/recovery presentation.

## Changes

| Audit findings | Implementation |
| --- | --- |
| F01–F02: small text and contrast | Raised supporting text to at least 12px in the owner stylesheet; working table text and controls use 14px. Darkened the identified low-contrast labels and amber status text. Preserved exact amount formatting. |
| F03: misleading owner states | Explicit loading, first-session, unavailable and identity-locked states. Retry feedback and start-in-progress feedback. Failed profile creation preserves the entered name. Request generations prevent late success or failure from restoring/replacing state after identity revocation. |
| F04: checkbox geometry | Text-input sizing excludes checkboxes. Vault acknowledgment uses a 20px control beside its label, retaining the original approval gate. |
| F05: tablet clipping | Shrinkable vendor-grid tracks and explicit placements; cards stack at narrow tablet widths. |
| F06, F12: mobile validation | Required-detail guidance immediately precedes submission and is associated with fields and the submit button. Decimal keyboard hints on amount fields. Demo and persistent currency handling remain distinct. |
| F07–F08: setup/admin grouping | Readable vault fact grid, improved form spacing, and labeled funding, reconciliation, viewer and import subsections. Existing action order and permissions retained. |
| F09, F14–F15: consistency and hierarchy | Shared control/panel radii, normalized selected spacing, quieter supporting surfaces, normalized navigation icons, removed redundant stat ornaments and decorative portal arrow. Retained the established dashboard mark. |
| F10: mobile discovery | Visible navigation/table scroll instructions; keyboard-focusable table regions; mobile navigation items retain intrinsic width. |
| F11: repetitive actions | Short visible contractor actions retain record-specific accessible names, including the full invoice/contractor context. |
| F13, F16: copy | Consistent saved-invoice persistence wording, sentence-case context labels, and task-oriented billing/wallet headings. Demo/testnet disclosures retained. |

No generated images, Stageshow kit components, replacement branding or new animation were introduced. The existing native dialogs, focus-visible treatment, reduced-motion support and section sequence are retained. This is targeted interface work, not a claim that every legacy CSS value was converted to a new design system.

## Measured results

- Overview has no visible main-content leaf text below 12px at 320, 390, 768, 820, 1080 or 1440px.
- No page-wide horizontal overflow in the measured overview widths.
- Vendor-card scroll width equals client width at all six widths. At 768px the prior 522px content inside a 511px card is now 511px inside 511px.
- Vault checkbox layout width is 20px on desktop and phone, previously 420px and 342px.
- Identified color pairs now measure: amber 6.01:1, table headings 4.86:1, invoice footnote 5.05:1, preview labels 4.96:1. Primary action remains 6.86:1.
- 37 page/state screenshots plus two final targeted screenshots are saved here. Use `390-overview-final.png` and `768-vendors-final.png` for the final navigation/tablet treatment; earlier captures predate those last refinements.

`final-measurements.json` contains computed browser sizes/colors. `extra-measurements.json` includes checkbox and targeted contrast calculations. Captures use synthetic fixtures and include the Next development indicator; they do not show live account records.

## Regression boundaries

The frontend changes preserve handlers and disabled conditions for funding, signing, payment review, immutable recipients, order IDs and currency validation. Separate actor changes to adapters, server/payment/extraction code and existing validation documentation appeared during this work and were preserved. They are not part of this interface change description.

Browser regression coverage includes owner navigation/dialogs, invoice conflict blocking, pending outcomes, contractor invitation and clarification, access revocation, onboarding and viewer restrictions. New interface tests exercise load failure/retry, failed start/retry, failed profile-name retention, identity revocation during an outstanding request, and tablet card clipping.

Tests run against an isolated local demo database and a separate app port. Persistent acceptance uses disposable SQLite stores, a local controlled RPC and wallet fixtures; it does not broadcast public transactions. The initial isolated-browser attempt had a configured-origin mismatch and was restarted with matching `NNETICS_APP_ORIGIN`. Test selectors were narrowed to distinguish the app's error from Next's route announcer and the adjacent validation summary from the detailed checklist.

Not certified: all accessibility criteria, real extension UI, Safari/Firefox, every possible long value, or a full 200% zoom sweep. The screenshot and test results describe the working tree inspected during this session; other development was active concurrently.

## Verification

- Initial type checking passed. The final recheck failed in a concurrently added, unrelated file: `apps/owner/tests/billing-extraction.test.ts:12:440`, TS2554 (expected 1–2 arguments, received 0). This interface pass did not edit that test. The current whole-tree typecheck is therefore not green.
- Production build passed before that concurrent test was added. It is not a guarantee for subsequent unrelated changes.
- Unit tests: 69 passed.
- Persistent-contractor production acceptance passed, including application restart, signature fixtures, persistence, currency clarification and revoked-session denial. Evidence: `artifacts/contractor-acceptance/1793643470724`.
- Desktop/mobile browser checks: all 50 verified passing (44 in the main run; the six checks affected by selector ambiguity passed on targeted rerun after correcting the selectors). Four new interface scenarios run in both viewport projects. Temporary test copies/configuration and the isolated development server were removed/stopped after verification; permanent tests remain in `apps/owner/tests/browser`.

Method: Stageshow composition/legibility principles and Unslop's targeted polish passes. Unslop credit: Damir Sokolovsky (@heydamir), CC BY 4.0.
