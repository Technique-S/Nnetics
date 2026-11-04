# Assessment B — technical audit and browser evidence

Date: 2026-11-04. Target: `apps/owner/src/app`, Nnetics. Independent Assessment B; Assessment A and its judgments were not consulted. This is a read-only assessment of the current working implementation, not a review of only the committed baseline. No production source or configuration was edited by this assessment.

## Implementation integrity verdict

**Pass with release issues.** The shared payment-desk palette, invoice references, immutable recipients, reserved outcomes, separate review/payment language, and explicit demo/private identities form a coherent product-specific working interface. The detector's three aesthetic warnings do not establish a generic or broken implementation. Browser inspection did establish an actual CSS variant regression and an inaccurate mobile accessibility state, neither found by the source detector.

## Audit health

| Dimension | Score / 4 | Evidence and qualification |
|---|---:|---|
| Accessibility | 2 | Labels, native dialogs, focus treatment and status messages exist; destructive controls have 1.07:1 text contrast, several supporting text styles fail 4.5:1, and the closed mobile drawer reports expanded. |
| Performance | 3* | Source uses local/system fonts, restrained opacity/transform effects and no large image assets on these surfaces. No layout-read/write loop or persistent `will-change` was found in the inspected app components. Runtime speed is unmeasured. |
| Theming | 2 | A shared token base exists, but many literal colors and appended overrides remain in both stylesheets; one generic button override defeats the destructive variant. Dark mode is not an advertised/current feature, so its absence is not counted as a bug. |
| Responsive design | 3 | Every inspected route/view fits 320, 390, 768 and 1440 CSS px without document overflow. Tables scroll in their own region; emulated touch navigation and table panning work. Some controls remain below the 44 px comfort target. |
| Implementation integrity | 3 | Coherent shared presentation with isolated but consequential variant, metadata and landmark problems. |
| **Total** | **13/20*** | **Acceptable: significant targeted work remains.** |

*Provisional audit rubric, not a measured performance score or WCAG AA certification. No Lighthouse, Web Vitals, bundle analysis, CPU/network benchmark, assistive-technology session, physical mobile device test, or full browser/text-scaling matrix was performed. The total includes a source-only performance estimate and should not be presented as a validated runtime quality metric.

Counted issues: **0 P0, 3 P1, 2 P2, 1 P3**. All three P1 findings should be addressed before release.

## Coverage and method

- All three page routes: `/`, `/contractor`, `/demo/contractors`. Also inspected the explicit `/?mode=demo` capture and source branch. APIs are not additional UI routes.
- Owner views: Overview, Contractors, Vendors/on-chain vendors, Work orders, Invoice review, Payment history, Vault, Access and Recovery at all four widths. Opened the structured-invoice native dialog and dismissed it with Escape without submitting.
- Contractor views: Submit a bill, My payments and Wallet details at all four widths; clarification and pending-wallet/revoked-access data states. No wallet request or submission was made.
- Entry/onboarding: sign-in at all four widths; viewer, zero-pending, zero-budget, empty organization, draft organization/provisioning, RPC failure, restoration/loading and contractor-record failure states. The draft organization was selected using an intercepted GET, not created.
- Fresh, isolated, headless Microsoft Edge/Chromium browser contexts; all `/api/**` requests were intercepted with synthetic fixture data. Unrecognized action requests were denied. No real session, cookie, wallet, signing request or database write was used. Session responses were synthetic as well. The existing localhost app server was reused and left running.
- Independent DOM/geometry checks and screenshots live under ignored `artifacts/design-runtime/b-evidence/`; compact, reviewable evidence is saved in [assessment-b-browser.json](evidence/assessment-b-browser.json), [assessment-b-contrast.json](evidence/assessment-b-contrast.json), [assessment-b-touch-motion.json](evidence/assessment-b-touch-motion.json) and [assessment-b-navigation-state.json](evidence/assessment-b-navigation-state.json). Expanded screenshots in this evidence directory and the earlier `implemented/` captures were also checked against source. Existing uncommitted UI changes were left untouched.
- Contrast values use computed foreground colors and composited ancestor background colors, then the WCAG relative-luminance formula. They are evidence for the cited flat backgrounds, not a complete pixel-level audit. Disabled controls and redundant avatar initials are not used as release findings. Modal-background entries in the raw contrast JSON are not counted as newly visible modal failures.

## Required detector attempt and overlay limitations

Ran exactly once from the repository root:

```text
C:\Users\Kazi\.agents\skills\impeccable\scripts\impeccable.cmd detect --json apps/owner/src/app
```

**Result: exit 2, valid JSON, three warnings; deterministic source scan succeeded.** Exit 2 means findings, not a crash. Raw output is intentionally ignored at `artifacts/design-runtime/audit-v2-detector.json`.

| Detector finding | Source/context verification | Disposition |
|---|---|---|
| `side-tab`, `demo/portal.module.css:19` | `.guidance` really has a 3 px left border. It marks the functional “Before you submit”/readiness status region, with text and `role="status"`, not a repeated decorative card accent. | True syntax match; contextual aesthetic warning, no technical failure. Do not remove useful status hierarchy solely to satisfy it. |
| `overused-font`, `globals.css:81` | Arial body font is genuinely present, with Helvetica/sans-serif fallback. The detector description lists several other popular font names, but the matched snippet is Arial. | Expected conventional choice for an Operate surface; not an accessibility/performance defect or evidence of poor originality by itself. |
| `overused-font`, `globals.css:617` | Arial is repeated in `.count`. Same type family, not a second independent typography system. | Duplicate contextual warning; consolidate in future token cleanup if useful. |

No detector errors were hidden and a clean detector result is not claimed. This source scan does not validate contrast, rendered geometry, keyboard behavior or performance.

The required browser-overlay procedure was attempted on owner, contractor, demo-owner and sign-in views. Mutable preflight succeeded: a `[Human]` document-title prefix and an inline script executed in the disposable pages. Started the live server in ignored `artifacts/design-runtime` on localhost port 8400, PID 20896. Injection of `http://localhost:8400/detect.js` was **blocked by the application's `script-src 'self' 'unsafe-inline' 'unsafe-eval'` Content Security Policy** on all four views. No detector console messages or visible overlay resulted. CSP and production HTML were not weakened. Therefore **rendered detector overlay unavailable; manual browser/DOM evidence used**. The helper was stopped successfully with `live-server stop --keep-inject`; all audit browser contexts were closed. No human-visible overlay is claimed.

## Prioritized findings

### B1 · P1 — destructive portal button labels nearly disappear

**Location:** `apps/owner/src/app/demo/portal.module.css:1` (`.danger`) and `:26` (later `.button` override); `contractor-owner.tsx:108` onward. **Categories:** Accessibility, theming, implementation integrity.

“Revoke access” and “Reject bill” render `#a13f31` text on `#1b6650` green at **1.068:1**, while enabled and actionable. The later generic `.button{background:#1b6650}` replaces the earlier `.danger` background without changing its red foreground. The secondary variant receives a later `.button.secondary` exception; the danger variant does not. This is visible in the owner Contractors view, standalone demo-owner route and draft onboarding embed. The labels are hard to read and the destructive action takes the primary-action fill, undermining recognition at a consequential choice. WCAG 2.2 SC 1.4.3 requires 4.5:1 here. The danger hover rule happens to restore a pale background; that does not fix the resting state or touch use.

**Recommendation:** Give the destructive variant an explicit coherent foreground/background pair after the base button rule (or use a consistent modifier system), and check normal, hover, focus and disabled combinations. **Suggested command:** `$impeccable harden`, then `$impeccable polish`.

### B2 · P1 — repeated supporting-text contrast failures

**Location:** `globals.css:706`, `:718`, `:806`, `:861`, `:1048`, `:1168`, `:1201`, `:1312`; `demo/portal.module.css:1` (`.muted`, `.tab`). **Categories:** Accessibility, theming.

Computed default-state examples (all ordinary-size text):

| Visible text/style | Foreground / background | Ratio |
|---|---|---:|
| Guardrail explanation | `#6c7d62` / `#f0f2ed` | 3.924:1 |
| Budget/cap/vendor-slot labels | `#6d7a64` / `#f0f2ed` | 4.034:1 |
| Vendor ID and identifier | `#788373` / white | 3.968:1 |
| “Original invoice text” | `#718168` / white | 4.165:1 |
| Payment-history “Outcome” filter label | `#75826b` / white | 4.068:1 |
| Panel-foot explanations | `#6b7e62` / `#fbfcf8` | 4.259:1 |
| “Failed”/“Revoked” badge text | `#a05e4e` / `#fbefea` | 4.431:1 |
| Portal introductory muted text | `#68776f` / canvas `#f6f6f2` | 4.349:1 |
| Inactive contractor navigation button text | `#63766a` / canvas `#f6f6f2` | 4.476:1 |
| Structured-invoice explanatory text | `#6f7e65` / `#fcfdf9` | 4.240:1 |

These are instructions, identifiers, controls and payment-state explanations, not incidental decoration. Several appear at 12 px, so they do not qualify for the large-text 3:1 threshold. WCAG SC 1.4.3 is not met for the cited pairs. The faint avatar initials in raw evidence are redundant beside full names and are excluded from this issue's scope.

**Recommendation:** Introduce a small set of surface-aware muted/error tokens that exceed 4.5:1 with margin on white, canvas, neutral panels and status fills. Recheck the actual cascade, including both portal and global styles, rather than only token definitions. **Suggested command:** `$impeccable colorize`, followed by `$impeccable audit`.

### B3 · P1 — closed mobile drawer reports `aria-expanded="true"`

**Location:** `dashboard-navigation.tsx:23`, toggle `aria-expanded={open||!collapsed}`. **Category:** Accessibility.

At 390 px in a fresh context, the drawer has computed `visibility:hidden`, but its controlling button reports `aria-expanded="true"`. `collapsed` tracks the desktop rail and starts false; it is not the mobile `open` state. Screen-reader users receive an inaccurate control state on initial load and after closing the drawer. The label and `aria-controls` exist, and the drawer does open/close; the exposed state is the failure. WCAG SC 4.1.2 applies.

**Recommendation:** Derive expanded state from the active responsive mode (`open` on mobile, `!collapsed` on desktop), and keep it synchronized across resizing, initial render and Escape dismissal. **Suggested command:** `$impeccable harden`.

### B4 · P2 — draft onboarding embeds a second main landmark and page heading

**Location:** `onboarding.tsx:322` and `:395`; `demo/portal-ui.tsx:12`; `contractor-owner.tsx:103`. **Categories:** Accessibility, implementation integrity.

The selected-draft state has a `<main aria-label="Wallet onboarding">` containing `PersistentContractorOwner`, whose shell emits another `<main>` unless an ancestor has the `.main-content` class. This onboarding ancestor lacks that class. Independent DOM evidence confirms **two main elements, one nested**, plus the workspace h1 and embedded Contractors-and-bills h1. The main dashboard Contractors view correctly chooses a section wrapper to avoid this problem, so the defect is specific to the onboarding embed. Landmark navigation is ambiguous and the embedded panel appears as another page rather than a section of setup. This is an HTML/landmark quality issue; a full screen-reader impact test was not run.

**Recommendation:** Make the reusable shell's semantic element explicit for embedding, use one page-level main, and adapt the embedded heading level. Preserve the standalone route's main/h1. **Suggested command:** `$impeccable harden`, then `$impeccable onboard`.

### B5 · P2 — live contractor page is titled “Contractor demo”

**Location:** `contractor/layout.tsx:3`. **Category:** Implementation integrity / accessibility orientation.

The persistent `/contractor` page body says “PRIVATE CONTRACTOR” and “Persistent private records,” while the actual document title is **“Nnetics · Contractor demo.”** Independent browser metadata confirms this on all three contractor views. Browser tabs/history and screen-reader page announcements consequently misidentify the live private workspace as simulated. This weakens an otherwise careful distinction between testnet/private records and the explicit demo. The demo-owner route also inherits the generic owner title, but the directly contradictory persistent contractor title is the actionable case.

**Recommendation:** Use an accurate neutral contractor title, or route-aware metadata that preserves the explicit demo distinction without leaking private details. **Suggested command:** `$impeccable clarify`.

### B6 · P3 — small isolated controls could be easier to touch

**Location:** `globals.css:893`, `:1892`; overview payment switch and navigation toggle. **Category:** Responsive design.

The payment switch is 34×20 CSS px; the navigation toggle is 40×40. They fall short of the preferred 44×44 comfort target. **This is not reported as an automatic WCAG 2.5.8 failure:** the switch has substantial surrounding space and the toggle exceeds the 24×24 AA minimum. Likewise, a 13 px rendered portal checkbox is enclosed in a much larger clickable text label; its input box alone is not the complete target. The portal's generic block/width rule does center that checkbox above its label, a small consistency problem visible on narrow screens.

**Recommendation:** Expand the switch/toggle hit areas while preserving their visual size; style checkbox rows explicitly so the indicator remains beside the label. **Suggested command:** `$impeccable adapt`, then `$impeccable polish`.

## Verified strengths and non-findings

- No document-level horizontal overflow in the sampled 320/390/768/1440 layouts. Tables intentionally remain wider inside labeled, keyboard-focusable scroll regions, with mobile scroll hints; this is not page overflow. A synthesized Chromium touch pan moved the payment table from `scrollLeft=0` to its 184 px maximum. This is emulated touch evidence, not physical-device testing.
- Synthesized touch opened navigation and selected Payment history; the drawer closed afterward. Mobile keyboard Shift+Tab from the first drawer item wrapped to Recovery, Tab wrapped to Close navigation, Escape returned focus to Toggle navigation, and inert siblings were cleared. The incorrect expanded attribute in B3 remains despite this working behavior.
- Native `dialog.showModal()`, accessible dialog title, explicit close button, cancel control and Escape handler are present. Inputs generally have explicit or enclosing labels; icon-only refresh/close buttons have names. Owner skip link, current nav state and live status/error messages are present. No claim of complete keyboard/assistive-technology coverage is made.
- Reduced-motion restoration retains the loading heading and three skeleton blocks while running **zero animations**. With no preference, `skeleton-breathe` runs. The global `animation:none` rule therefore has an understandable static alternative for the inspected loading state, rather than erasing its meaning. Normal effects are short opacity/transform/color changes; no essential gesture or information depends on animation in these views.
- Viewer/read-only, revoked access, RPC failure and empty states provide textual explanation and recovery context. No page JavaScript errors occurred in the independent sampled states. These synthetic responses do not establish production service reliability or security correctness.
- Approval versus payment, fixed recipients, unknown reserved outcomes, wallet-message versus transaction requests, and demo limitations are stated in text. Color is not the only status channel.

## Systemic causes and next steps

The most consequential pattern is layered styling: base rules, shared-scale additions, and approved-presentation additions coexist in the same files. Generic overrides can win over variants while literal muted colors remain tuned for older backgrounds. This directly explains B1 and several B2 pairs; it is more useful to repair the variant/token contract than to chase the detector's Arial warning. The reusable shell's inferred semantic element similarly works in one embedding context and fails in another.

1. **P1 — `$impeccable harden`:** restore destructive-button contrast and semantics; synchronize the mobile drawer's exposed state; then remove the nested main in the draft embed.
2. **P1 — `$impeccable colorize`:** correct the verified text/status pairs across both stylesheets, then re-run `$impeccable audit` on rendered states.
3. **P2 — `$impeccable clarify`:** correct persistent contractor metadata and keep live/demo wording aligned.
4. **P3 — `$impeccable adapt`:** enlarge isolated touch hit areas and align checkbox-label rows.
5. **Final — `$impeccable polish`:** visually recheck all routes and owner view states after the cascade changes, including destructive controls and 320 px layouts.

Questions skipped: Assessment B evidence handoff only; the parent critique owns synthesis and the user-facing closing question after both isolated assessments finish.
