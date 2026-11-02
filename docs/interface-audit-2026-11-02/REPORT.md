# Nnetics webpage interface audit

Date: 2 November 2026 · Status: audit complete; implementation awaits approval

## Assessment

The app needs targeted interface repair and polish, not a visual replacement. Its green palette, serif headings, explicit payment authority, real work-order vocabulary and restrained motion already give it character. The biggest weaknesses are legibility, uneven maturity between interface families, and a few concrete responsive and form defects.

Recommended scope: preserve the product identity, routes, section order, data, permissions and payment behavior. Fix shared typography and contrast, responsive sizing, form grouping, and presentation consistency. Treat error-state behavior changes as a separately reviewed part of implementation.

No application source changes were made by this audit. Existing edits were preserved. Deliverables are this report, screenshot evidence, measurement JSON, and reproducible read-only capture scripts. A temporary development server was stopped after inspection.

## Scope and evidence

The application-owned frontend is `apps/owner`. Route discovery found `/`, `/demo/contractors`, and `/contractor`; `/?mode=demo` selects the owner simulation. API routes are not webpages. Dependency documentation, generated Next output and Rust tooling are excluded.

37 screenshots were captured in Edge at 1440×900 and 390×900, with additional vendor checks at 320, 768 and 820 pixels. These cover 15 initial page/dialog states at two widths, organization selection and prepared vault review at two widths, and three additional vendor breakpoints. Source inspection includes every app TSX file and both stylesheets.

| Interface | Coverage | Main assessment |
| --- | --- | --- |
| Login `/` | Desktop/mobile render; source review of connection, pending and failure branches | Clear purpose but prose-heavy, weak grouping and inconsistent button alignment |
| Organizations `/` | Desktop/mobile synthetic authenticated fixture | Counts and workspace selection need grouping; preserve zero-state honesty |
| Vault onboarding `/` | Desktop/mobile synthetic prepared, disabled-signing fixture; all branches read | Checkbox layout defect; review facts too small and tightly packed |
| Owner overview `/?mode=demo` | Desktop/mobile render | Strong overall composition, but pervasive tiny text and secondary green surfaces compete |
| Vendors | Desktop/mobile plus 320/768/820 | Cards readable structurally; tablet grid exceeds available width |
| Work orders | Desktop/mobile render | Table is coherent; metadata and actions are small; mobile needs scroll guidance |
| Invoice review | Desktop/mobile render; eligibility/action branches read | Amount hierarchy works; critical comparison facts and supporting copy need larger type |
| Payment history | Desktop/mobile render; filter source review | Correctly distinguishes pending/paid/failed; tiny explanatory text and mobile horizontal travel |
| Vendor, order, invoice dialogs | All three captured at desktop/mobile; opened and closed with Escape | Native dialog and labeled fields are strengths; sizes and spacing need normalization |
| Live owner controls | Source review only | A long general-purpose control block precedes the actual page heading on every dashboard view |
| Demo contractor administration `/demo/contractors` | Empty and populated desktop/mobile fixtures | Larger, more readable typography; nested cards and repeated long actions create density |
| Contractor submit/preview `/contractor` | Desktop/mobile fixture; validation/upload/clarification branches read | Good product-specific preview; mobile errors appear far below the disabled submit action |
| Contractor payments | Desktop/mobile populated clarification fixture; other status branches read | Clear record contents; status appearance and action labels need refinement |
| Contractor wallet details | Desktop/mobile fixture; initial/pending/challenge branches read | Good authority explanation; repetitive framing and no visible numeric progress needed |
| Private-access unavailable | Desktop/mobile denied-session fixture | Appropriate recovery instruction; no fabricated private data |
| Shared loading/error/notices | Source inspection; representative unavailable/empty renders | Owner portal conflates missing session, loading and refresh failure |

Private and authenticated screens used synthetic browser response fixtures, not real wallet access. API writes were blocked by capture routing while inspecting. No sign-in, signing, funding, deployment, payment or record-creation action was deliberately exercised. A logout request appeared in the development-server log during teardown of the isolated fixture browser; it was not a real user session. This is an interface audit, not a certification of backend or financial correctness.

Limitations: no actual extension popup, live funded vault, screen-reader run, full keyboard traversal, 200% zoom sweep, Safari/Firefox run, exhaustive long-content matrix, automated accessibility certification, or transaction regression suite. Live dashboard controls and some error/loading/payment variants were reviewed in source rather than rendered. No production build or existing mutation-oriented browser suite was run for this audit.

The working tree changed concurrently during inspection. The demo persistence banner changed from “Changes last until you reload” to “Saved invoices persist; other demo changes reset on reload.” Earlier screenshots preserve the older wording; it is not reported as an unresolved banner defect. The footer still uses “Session-only synthetic data.” Source locations below describe the files observed at report preparation, not a frozen commit.

Screenshots include Next's development indicator. Some immediate post-click screenshots catch a 150ms navigation color transition. Neither is treated as a production interface defect. Full-page modal screenshots show document content below the viewport-sized backdrop; that is a capture artifact, not evidence that the backdrop fails.

## Priority findings

Priorities: **P1** = address first because users must read or understand consequential information; **P2** = meaningful usability or consistency issue; **P3** = refinement. “Rendered” means supported by inspected screenshots and source; “source” identifies an unexercised code path. No P0 or confirmed payment-execution defect was established.

### F01 · P1 · Critical supporting text is consistently too small

**Where:** `globals.css` `.badge` (line 675), table headings/metadata (733–768), `.budget-legend` (822–847), `.footnote` (1190), and mobile overrides (1583–1785). All five owner views are affected. Rendered.

Owner badges use 9px text, falling to 8px in mobile queues. The budget legend reaches 7px. Table headings are 9px, account identifiers around 10px, and disclaimers often 8–9px. The overview measurement recorded at least 50 visible leaf text nodes below 11px at each primary width (the measurement caps its list at 50). This is especially poor for amounts' units, recipients, pending-state explanations and authority notices.

**Proposal:** use 14px for normal working text, 12px minimum for secondary facts/statuses, 13px for identifiers, and 14px for form controls. Keep the large amount and serif heading hierarchy. Adjust layout to accommodate real text instead of shrinking it at mobile breakpoints. Do not round or truncate payment amounts to make them fit.

### F02 · P1 · Several small-text color pairs lack sufficient contrast

**Where:** `globals.css` `.amber`, `th`, `.footnote`; `demo/portal.module.css` `.preview dt`. Rendered/source color measurement.

| Use | Foreground / background | Calculated ratio |
| --- | --- | --- |
| Amber status | `#94702b` / `#fcf5e3` | 4.19:1 |
| Table headings | `#7b8573` / `#fafbf7` | 3.71:1 |
| Invoice footnote on white panel | `#828b7b` / `#ffffff` | 3.54:1 |
| Preview fact labels | `#7e8172` / `#fffdf8` | 3.92:1 |
| Primary button, retained | white / `#1b6650` | 6.86:1 |

The audit target for normal text is 4.5:1. These calculations use declared opaque colors and the sRGB luminance formula; they are targeted measurements, not a complete accessibility conformance claim. Disabled controls are not included in these failures.

**Proposal:** consolidate primary/secondary/muted text roles and darken the failing text colors against their actual surfaces. Preserve semantic red/amber/green distinctions and visible status words.

### F03 · P1 · Contractor-owner loading and refresh failures masquerade as an empty workspace

**Where:** `demo/contractors/page.tsx:14` and `:37`. Source-confirmed; failure transitions were not injected.

`snapshot` starts null and any refresh exception sets it back to null. The same branch renders “Start an empty demo workspace.” The start button directly awaits `adapter.start()` without the shared error/busy handling. A request failure can therefore look like missing records, and start failure lacks a deliberate recovery state. Profile creation also clears the name immediately, before success.

**Proposal:** distinguish loading, no-session, loaded-empty and load-failed states; show retry feedback and preserve entered names on failure. This is a behavior correction, not a CSS change, and should be reviewed separately. Do not weaken access revocation or expose stale private records when authority is unavailable.

### F04 · P2 · Vault acknowledgment checkbox inherits text-input geometry

**Where:** `globals.css:44` `.loading-screen input`; `vault-onboarding.tsx:170`. Rendered and measured.

The shared rule gives all inputs `display:block`, `width:100%`, `max-width:420px`, padding and a top margin. The prepared vault checkbox consequently has a 420px layout box on desktop and 342px on mobile, with the native checkbox centered above its label. This disconnects the acknowledgment from its text.

**Proposal:** scope text-input rules to relevant input types; give the checkbox an intrinsic box in a flex label aligned to the first text line. Preserve `checked`, `reviewed`, and all dispatch disabling conditions exactly.

### F05 · P2 · Vendor tablet grid consumes the right inset and clips overflow

**Where:** `globals.css` vendor-card rules inside `@media(max-width:1080px)`; `.panel` overflow rule. Rendered at 768px.

The grid minimum tracks total 430px, plus 48px gaps and 44px horizontal padding: 522px. The card's measured client width is 511px at a 768px viewport. Its scroll width is 522px, but `.panel` hides overflow. The right-hand control reaches too close to the edge; short fixture words happen to fit, while longer content has less room. At 820px, the card has 563px and fits.

**Proposal:** switch this card layout earlier, use shrinkable tracks where safe, or stack the recipient/action region. Test 760–820px continuously and with long supported account IDs. Page-level overflow checks alone will miss this internal clipping.

### F06 · P2 · Mobile contractor validation is separated from the submit action

**Where:** `contractor/page.tsx` Submit a bill section and following preview/checklist aside; `portal.module.css` mobile `.grid`. Rendered.

On mobile, the entire form comes first, then the formatted preview, then the missing-details checklist. The disabled submit button appears before both. A user must scroll substantially beyond the button to discover why it is disabled. Errors are red before the user has started entering a bill.

**Proposal:** keep the existing section order, but attach concise required-field guidance to the relevant fields and associate it programmatically; provide an adjacent reason summary at the submit action. Retain the detailed preview/checklist. Preserve exact currency-conflict and work-order checks.

### F07 · P2 · Vault review facts and organization setup lack usable grouping

**Where:** `onboarding.tsx:250`; `vault-onboarding.tsx:108`; global `dt`/`dd` styles. Rendered fixture.

The onboarding shell presents counts as separate paragraphs. The vault definition list inherits 10–11px text and has almost no spacing between successive fact pairs. Long hashes dominate a dense list while funding and receiver details get the same weak treatment. The create-organization form follows immediately after the long vault review.

**Proposal:** visually group account/workspace information, transaction facts, artifact identifiers and acknowledgment using shared spacing and readable labels. Keep all facts and existing section order. Do not hide required review facts behind decorative simplification.

### F08 · P2 · Live controls overwhelm the page hierarchy

**Where:** `page.tsx:559`; `testnet-controls.tsx`. Source only.

The same large funding, limits, reconciliation, membership, reference-import and queue block is rendered before the page heading on every live dashboard view. Several workflows have equal button weight. The actual selected view is visually subordinate to setup/administration.

**Proposal:** retain order and capabilities, but add clear subsections, compact descriptions, consistent form rows and a distinct heading hierarchy. Review a populated live fixture before deciding whether any later navigation restructuring is justified. Preserve owner/viewer restrictions and wallet review requirements.

### F09 · P2 · Desktop, onboarding and portal components form three inconsistent systems

**Where:** `globals.css`, `portal.module.css`, `portal-ui.tsx:10`, `page.tsx:463`. Rendered.

The dashboard uses a monogram-plus-wordmark, 10px panels and mostly tiny labels. The portals use a different wordmark with a northeast arrow, 12px cards, 26px padding and larger type. Onboarding is an unframed narrow form. Their related colors and Georgia headings help, but the transitions feel like separate implementation stages.

**Proposal:** share neutral/text/accent/spacing/radius tokens and aligned button/field primitives while retaining each page's appropriate layout. Keep the existing product name and established mark; do not invent a new identity. A narrow login form is appropriate and does not need dashboard proportions.

### F10 · P2 · Mobile navigation and tables rely on undisclosed horizontal scrolling

**Where:** `globals.css` mobile `.sidebar nav`, `table {min-width:540px}`, `.table-scroll`. Rendered.

At 390px, later owner sections and the contractor-demo link are offscreen in the navigation strip. Table columns such as reference and authority require horizontal travel. This is contained scrolling, not page overflow, and the underlying data remains present.

**Proposal:** make overflow discoverable with an explicit scroll cue or accessible section chooser. Preserve access to every destination and table column. Keep readable text rather than reducing table font size. Test keyboard focus and horizontal scrolling alongside touch use.

### F11 · P2 · Repeated full identifiers make action labels unnecessarily tall

**Where:** `demo/contractors/page.tsx` profile/review actions; `contractor/page.tsx` clarification action. Rendered.

Buttons repeat the contractor name or complete invoice reference already shown directly above. On mobile, “Request clarification · CTR-0001-INV-0001” and “Answer clarification…” wrap across lines, making stacked actions uneven and the card longer.

**Proposal:** use concise visible action labels within clearly named records, retaining full accessible context through an accessible label or labeled group. Keep durable references visible and copyable elsewhere in the record. Update role/name-based browser tests intentionally if labels change.

### F12 · P2 · Form guidance is mostly visual and numeric entry is inconsistent

**Where:** `contractor/page.tsx` bill amount and missing fields; `demo/contractors/page.tsx` order amount. Source and rendered form review.

Contractor and demo-owner amount inputs lack the `inputMode="decimal"` used in owner dialogs and live funding controls. Missing-field guidance is not linked to fields through `aria-describedby`/`aria-invalid`. Visible labels generally exist, which should be retained.

**Proposal:** add appropriate mobile input hints and associate validation/help with fields without changing amount parsing or introducing JavaScript-number precision loss. Announce consequential validation/status changes; verify the complete keyboard and assistive-technology flow separately.

### F13 · P2 · Demo persistence wording remains inconsistent in the footer

**Where:** `page.tsx:1212`; contrast with corrected banner at `:526` and invoice reload in `data/mock-adapter.ts:176`. Source confirmed.

The banner was corrected concurrently, but the simulation tools still say “Session-only synthetic data.” Manually entered demo invoices reload from the demo API. The old blanket reload claim in early screenshots is resolved; the footer ambiguity remains.

**Proposal:** distinguish persisted demo invoices from in-memory simulation changes consistently. Do not change retention or reset behavior to fit the wording.

### F14 · P3 · Spacing, corner sizes and decorative labels lack a shared rhythm

**Where:** `globals.css` `.main-content`, `.section-head`, `.vendor-card`, `.invoice-detail-body`, `.form-fields`; `portal.module.css`. Rendered/source.

Examples include 23px/24px/20px section padding, 26px vendor cards, 27px invoice-body inset, 17px field gaps and 11px mobile stat gaps. Eyebrows and portal tags repeat uppercase, widely tracked context above already clear headings. This is light Unslop territory rather than evidence of a wholesale failed design.

**Proposal:** use 16/20/24px panel padding, 8/12/16/24px gaps, and consistent inner/outer radii. Convert nonessential decorative labels to sentence case or remove duplication; retain clear DEMO/TESTNET disclosure in readable form. Do not mechanically remove semantic status badges.

### F15 · P3 · Some decorative elements compete with task content

**Where:** `page.tsx` stat-corner glyphs and guardrail/sidebar content; `globals.css:288`; `portal-ui.tsx:10`. Rendered.

Stats add small symbolic ornaments; the large green budget card, green guardrail surface, active navigation and primary buttons all carry emphasis. There is also a small colored sidebar gradient and a decorative arrow in the portal wordmark. No widespread purple gradients, emoji navigation, glossy blobs, sparkle branding or perpetual motion were found.

**Proposal:** keep the existing green identity, make supporting surfaces quieter, and reserve rich emphasis for the selected financial fact and the current task. Retain semantic color and any approved brand assets. Normalize existing icon sizes rather than replacing the entire icon system without evidence.

### F16 · P3 · Page copy sometimes advertises instead of orienting

**Where:** `contractor/page.tsx` “Hello, …”, “Start with the work you did.” and “Approval, without surprises.”; owner demo title. Rendered.

The contractor name greeting persists across all three sections, while the true context appears lower. Several short headings use sentence-ending periods and promotional phrasing despite this being a working tool.

**Proposal:** contextual headings such as “Contractor workspace”, “Bill details” and “Wallet approval”, with the contractor name as secondary identity. Keep friendly explanatory paragraphs and precise simulation disclosures. No unsupported marketing claim needs replacing with invented evidence.

## What should be preserved

- Existing green identity and restrained Georgia/sans-serif pairing; this is not a generic purple/glow template.
- Clear distinction between demo and testnet, plus explicit restrictions on payment and deployment.
- Exact amounts and units, fixed recipients, real work-order references, and pending-outcome explanations.
- Native dialog semantics, explicit form labels, Escape dismissal, focus-visible styles and reduced-motion support.
- Meaningful status words in addition to color; layout width caps and generally successful phone stacking.
- The contractor bill preview as the product-specific visual moment. No generated hero image or fake marketing dashboard is needed.
- Guardrails, permission checks, revision semantics, invoice currency validation, source-text handling and transaction-link restrictions.

## Proposed direction — for approval

**Product:** Nnetics helps owners review contractor bills against approved work orders and lets contractors follow their review status, with explicit demo/testnet boundaries.

**Character:** exact, calm, accountable.

**World:** a payment desk with ledgers, work orders and receipts; retain the existing green identity and paper-like content surfaces.

**Moments:** one clearly ranked budget/authority summary in the owner view; the formatted bill and fixed recipient in contractor review.

**Signature:** an aligned amount-and-recipient fact group, consistently paired with its authority/status label wherever the existing product presents that information.

## Proposed implementation sequence and acceptance

This is a plan, not work already performed. Follow Unslop's pass order, keeping each pass narrow:

| Pass | Proposed work | Acceptance |
| --- | --- | --- |
| 1 Spacing | Shared gaps/insets; tablet tracks; checkbox geometry | No clipped supported content at 320, 390, 768, 820, 1080 and 1440px |
| 2 Color | Three text roles, stronger supporting text, quieter surfaces | Measured normal-text contrast at least 4.5:1; semantic states remain distinct |
| 3 Icons | Normalize existing recurring icon sizes and remove redundant ornaments | Names, roles and touch targets preserved |
| 4 Copy | Contextual headings, shorter visible actions, accurate persistence wording | No invented features; demo/testnet and authority meaning unchanged |
| 5 Type | Working text 14px, secondary/status 12px, identifiers 13px; preserve display headings | Amounts/units, long IDs and validation remain readable at phone widths and zoom |
| 6 Layout | Group onboarding and live controls; clarify mobile overflow; improve adjacent validation | Section order retained; all destinations/actions still reachable |
| 7 Details | Shared buttons/fields/status styles; field associations; radius consistency | Keyboard focus, dialogs and error recovery checked |
| 8 Visuals | Refine existing budget summary and bill preview | No decorative image generation or fabricated data |
| 9 Motion | Retain brief, explicit transitions and reduced-motion support | No new loops, layout animation or delayed feedback |

Separately approve F03's request-state repair and any associated event/focus behavior. Visual work should not modify adapter/server/contract code. If implementation reveals a behavior dependency, isolate it for review rather than mixing it into CSS changes.

After approved implementation, run the existing owner, contractor, onboarding and testnet browser suites against safe fixtures and the appropriate type/build checks. Protect recipient immutability, currency conflict blocking, server references, revoked-session clearing, pending-outcome behavior and owner/viewer restrictions. Validate all three dialogs, populated/empty/error views, long names/identifiers and keyboard access. Compare screenshots at the affected breakpoints. Existing tests were inspected for these protections but were not executed by this audit.

## Stageshow and Unslop application

Stageshow informed composition, hierarchy, readable density, content fitting and the distinction between focal information and supporting chrome. Its invoice/receipt and form-validation principles fit this product. Its requirements for illustrative cropping, filler bars, fake chrome, animations, copied gold components and film gates were not applied: these are real working screens, and the request was an audit only. No kit files or example assets were copied.

Unslop's signs checklist was applied across spacing, color, icons, copy, type, layout, details, visuals and motion. Classification: **targeted polish with accessibility and state-presentation repairs**, not a full redesign. No new direction has been applied.

Method credit: Unslop by Damir Sokolovsky (@heydamir), CC BY 4.0. This report applies its framework and does not reproduce its assets.

## Deliverables and decision

- `REPORT.md`: full findings, proposed direction and regression boundaries.
- `EVIDENCE.md`: links to all 37 screenshots.
- `measurements.json`: 30 primary state measurements; leaf-text samples are capped at 50 per state.
- `extra-measurements.json`: breakpoint/checkbox measurements and calculated contrast pairs.
- `capture.mjs` and `check-extra.mjs`: fixture-based reproduction scripts using installed Edge and Playwright; expect an app development server at `127.0.0.1:3101`. They intentionally block application API writes during inspection.

**Decision requested:** approve the proposed direction and presentation fixes, with F03's behavior repair explicitly included or deferred. No implementation will begin until you approve.
