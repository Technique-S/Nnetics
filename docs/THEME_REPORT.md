# Nnetics theme and submission-readiness report — 5 November 2026

**Subsequent submission preparation:** the owner selected a local demo video with optional hosting and MIT licensing. A hosted URL is not mandatory under the current official rules. [Current submission checklist](SUBMISSION_READINESS.md) supersedes the conditional hosted-rollout blocker below. The existing 3100 server was checked read-only and serves an older build without theme controls; it was not restarted, and the denied additional fixture startup was not repeated. Existing final-build captures remain the evidence for the redesigned UI. Exhaustive dark setup sub-state capture, runtime boundary crashes, OS-level high contrast and browser-toolbar zoom remain unverified as specified below.

## Result and scope

Jade & Midnight light and Jade Night dark are implemented locally in the existing **Next.js 16.4.3 / React 19.3.1** application. The missing dark specification was supplied during this session and implemented directly. No theme dependency, marketing route, database migration, wallet operation, runtime payment activation, deployment, commit or push was introduced. HEAD remains `70e4f5b`; unrelated uncommitted UI, RPC, session and checkpoint work was preserved.

The existing storage-funding transaction is **accepted under reviewed V3 only** in [the separate historical record](METEOR_HISTORICAL_ACCEPTANCE_V3.json). V2's original manual-review outcome, both IDs, active hold and consumed scope are untouched. **Future automatic Meteor reference-block reconciliation is not enabled or live-verified. Ongoing payment activation remains disabled.**

## Implementation

- Palette, aliases, shared browser surfaces and theme overrides: [tokens.css](../apps/owner/src/app/tokens.css). Existing `--canvas`, `--ink`, `--muted`, `--line`, `--green` and component variables alias semantic roles. Hardcoded interface colors in globals, workspace and contractor CSS modules were consolidated; provider/contract/API code was not changed.
- Mechanism: [appearance.ts](../apps/owner/src/data/appearance.ts), [AppearanceControl](../apps/owner/src/app/appearance-control.tsx), and the existing root/global-error layouts. A synchronous head script selects `html[data-theme]` before paint and sets matching `color-scheme`; it is permitted by the **unchanged** existing CSP. The control updates theme-color from the resolved background token.
- System preference is the default. A small accessible button in the authenticated account menu, on sign-in and in standalone contractor headers persists **only** `nnetics-appearance`. A fallback control covers loading/error/demo surfaces. Cross-tab preference events synchronize controls; system changes apply when no explicit choice exists. Storage failures are caught, with an in-memory visual preference keeping toggling usable. Persistence cannot be guaranteed across process restart when the browser denies storage; system preference still works.
- Authentication, session cookies, provider lifetimes, wallet identity and organization authorization are not inputs to or outputs from theme state. No provider key or dashboard controller was moved/remounted for theming.
- The compact shell is preserved: headings and route content immediately follow the small header; financial controls remain in Vault, access management in Access, recovery in Recovery. The sidebar runs from the top through the viewport; wallet-session explanation stays inside the account menu. Existing desktop collapse/mobile drawer, Escape/focus trap and independent sidebar preference remain intact.
- Native dialogs, contractor CSS modules, forms, tables, status pills, spinners, errors, loading skeletons, empty states, selection, caret, autofill and scrollbars use the shared roles. Dark depth uses surface steps and neutralizes light shadows. Coral is restrained to focus, wordmark/selection details and attention states; failure uses danger. Paid retains its label and check mark; financial status derivation is unchanged.
- A real presentation defect discovered during inspection was fixed: the modal received `getUserMessage(null)`, which rendered a generic error on opening a healthy form. Mapping now happens only when an error exists; the existing dialog regression explicitly asserts no false alert. Signing/cancellation/approval handlers and idempotency identities are unchanged.
- The contractor access-check loading state retains its heading and skeleton with the shared theme. The global-error boundary imports the shared styles and pre-paint script. The favicon is a high-contrast fixed brand monogram; its fixed artwork colors are a documented exception to interface-token linting.

## Exact base tokens

The following values are final. Light aliases preserve the approved base palette; derived interaction and semantic status variants are centralized in the same file.

| Token | Light | Dark |
| --- | --- | --- |
| `--color-bg` | `#F0F5F4` | `#0A1513` |
| `--color-surface` | `#FCFEFD` | `#101F1C` |
| `--color-surface-raised` | `#EAF1EF` | `#162A26` |
| `--color-tint` | `#D9EAE5` | `#12332D` |
| `--color-header` | `#102F33` | `#0D1B18` |
| `--color-line` | `#D7E3DF` | `#213834` |
| `--color-line-strong` | `#708789` | `#4B796F` |
| `--color-ink` | `#173338` | `#E7F2EF` |
| `--color-muted` | `#566A6B` | `#8FA8A1` |
| `--color-disabled` | `#566A6B` | `#5E7871` |
| `--color-primary` | `#246C68` | `#3DC5A3` |
| `--color-primary-hover` | `#1B5754` | `#5AD6B7` |
| `--color-on-primary` | `#FFFFFF` | `#04201A` |
| `--color-primary-deep` | `#154744` | `#2A9C82` |
| `--color-primary-soft` | `#173338` | `#BFEFE3` |
| `--color-accent` | `#A79AC4` | `#E58A72` |
| `--color-accent-bg` | `#F0ECF6` | `#33201C` |
| `--color-danger` | `#8B3027` | `#F26B84` |
| `--color-danger-bg` | `#FFF3EF` | `#3A1A22` |
| `--color-overlay` | `rgba(16,47,51,.48)` | `rgba(4,12,10,.72)` |

**Accessibility adjustment:** the supplied dark essential-boundary token `#2E4A44` did not reach 3:1 against the intended surfaces. Only its lightness was increased, retaining its hue: final **`#4B796F`**. It measures **3.060:1** against the raised surface, with higher contrast on the ordinary input surface. The supplied line token `#213834` remains for nonessential dividers. Pressed primary uses supplied `#2A9C82`; its text contrast passes. All other supplied dark base values are unchanged.

Measured minimums across the required and additional checked pairs: light text **4.994:1**, dark text **5.035:1**; essential boundaries/focus light **3.323:1**, dark **3.060:1**. Light lavender is decorative rather than small text or focus. Disabled nonessential text uses the specified disabled role and is excluded from active-text conformance claims; necessary explanations remain readable outside disabled controls.

## Actual route and state coverage

There are three application page routes, not a marketing site. APIs return records/attachments/health and have no themed page UI. Framework assets `/icon.svg` and `/robots.txt` retain their own roles. Titles, descriptions, private/noindex policy, canonical behavior and robots output are preserved; no sitemap, public page or JSON-LD was added.

| Existing route / surface | Applied coverage | Execution / visual evidence |
| --- | --- | --- |
| `/` sign-in | Initial loading, connector/approval/verification copy, retry/configuration/session errors, appearance control | Both-theme desktop/mobile sign-in captures; existing wallet/session browser fixtures passed |
| `/` organization/setup | Empty counts, organization selection/creation, create-vault review, pending/reconcile/interrupted/linked states | Shared forms/dialog/loading/error tokens; existing onboarding fixtures passed. Not every setup state was separately recaptured in dark mode |
| `/` Overview | Amounts, queued/review/Paid states, funds/limits, paused/revoked warnings | Both-theme desktop/mobile captures; authoritative Paid mapping and owner fixtures passed |
| `/` Contractors | Profiles, invitation/approval forms, orders, review, clarification, empty records | Shared contractor CSS module; desktop-light fixture capture of actual embedded records; complete contractor journey regressions passed |
| `/` Vendors / Work orders | Cards, immutable recipients, lists, approve/edit dialogs, disabled controls | Both-theme desktop/mobile captures and owner regressions |
| `/` Invoice review / Payment history | Preview, conflicts, unknown outcomes, transaction links, status pills | Both-theme captures; existing transaction/Paid/recovery regression cases passed |
| `/` Vault / Access / Recovery | Administrative forms, storage/payment distinctions, fee/recipient/network/expiry and unknown-outcome blocks | Actual disabled administrative forms captured in light; both-theme route captures and functional owner/RPC/browser fixtures passed |
| `/contractor` | Private invalid/revoked/error/loading access, Submit a bill, preview/missing details, My payments, clarification/status, Wallet details | Both-theme desktop/mobile captures; wallet/upload/invitation/clarification/revocation/duplicate journey fixtures passed |
| `/demo/contractors` and contractor demo mode | Explicit simulated-data notices, owner/contractor records, empty/loading/error states | Both-theme captures and full contractor regressions; no fixture is presented as real wallet evidence |
| Not-found | Own heading, recovery link, private metadata | Real route captures in both themes/sizes |
| `error.tsx` / `global-error.tsx` | Shared colors, recovery copy/button, global pre-paint styling | Eight static previews rendered from the actual React components and local CSS, both themes/sizes. No production boundary crash was induced; these are component-region previews, not runtime fault acceptance |
| Shared overlays/native controls | Dialog/backdrop, drawer, menu, copy/actions, focus, native controls, errors, skeletons | Both-theme dialog/navigation/loading/error captures; desktop and emulated mobile fixtures |

The coverage column states what is themed. It does not claim every state/theme/device combination or external wallet-extension UI was visually exercised. Meteor's own interface is unchanged.

## Representative screenshots

For the public-repository candidate, three reviewed fixture-only captures are prepared as [curated documentation assets](screenshots/README.md): [light owner](screenshots/owner-light.png), [dark owner](screenshots/owner-dark.png), [contractor preview](screenshots/contractor-dark.png). The more extensive gallery below references ignored local artifacts and is not promised to exist in a clean public checkout. No private capture directory is prepared for publication.

All records shown below are **presentation/demo fixtures**, with no real wallet, payment or provisioning action. Canonical captures from the final dual-theme build are under ignored `artifacts/submission-readiness/screenshots/`; earlier diagnostic captures also remain there and are not acceptance evidence for the final theme.

| Surface | Light | Dark |
| --- | --- | --- |
| Desktop overview | [Light](../artifacts/submission-readiness/screenshots/desktop-light-overview.png) | [Dark](../artifacts/submission-readiness/screenshots/desktop-dark-overview.png) |
| Mobile overview | [Light](../artifacts/submission-readiness/screenshots/mobile-light-overview.png) | [Dark](../artifacts/submission-readiness/screenshots/mobile-dark-overview.png) |
| Contractor bill/preview | [Light](../artifacts/submission-readiness/screenshots/desktop-light-contractor-submit.png) | [Dark](../artifacts/submission-readiness/screenshots/desktop-dark-contractor-submit.png) |
| Contractor payment statuses | [Light](../artifacts/submission-readiness/screenshots/mobile-light-contractor-payments.png) | [Dark](../artifacts/submission-readiness/screenshots/mobile-dark-contractor-payments.png) |
| Contractor wallet | [Light](../artifacts/submission-readiness/screenshots/mobile-light-contractor-wallet.png) | [Dark](../artifacts/submission-readiness/screenshots/mobile-dark-contractor-wallet.png) |
| Mobile dialog/focus | [Light](../artifacts/submission-readiness/screenshots/mobile-light-dialog.png) | [Dark](../artifacts/submission-readiness/screenshots/mobile-dark-dialog.png) |
| 320px navigation | [Light](../artifacts/submission-readiness/screenshots/mobile-light-320-navigation.png) | [Dark](../artifacts/submission-readiness/screenshots/mobile-dark-320-navigation.png) |
| Loading | [Light](../artifacts/submission-readiness/screenshots/desktop-light-loading.png) | [Dark](../artifacts/submission-readiness/screenshots/desktop-dark-loading.png) |
| Error/retry | [Light](../artifacts/submission-readiness/screenshots/desktop-light-error.png) | [Dark](../artifacts/submission-readiness/screenshots/desktop-dark-error.png) |
| Global error component region (static preview) | [Light](../artifacts/submission-readiness/screenshots/mobile-light-global-error-component.png) | [Dark](../artifacts/submission-readiness/screenshots/mobile-dark-global-error-component.png) |

Additional actual-template light administrative captures: [Vault](../artifacts/submission-readiness/screenshots/desktop-light-owner-vault.png), [Access](../artifacts/submission-readiness/screenshots/desktop-light-owner-access.png), [Recovery](../artifacts/submission-readiness/screenshots/desktop-light-owner-recovery.png), [Contractors](../artifacts/submission-readiness/screenshots/desktop-light-owner-contractors.png).

## Actual verification

Windows/PowerShell, Node **24.18.0**, isolated production directory `.next-rpc`. No packages were installed. Logs: ignored `artifacts/submission-readiness/`.

| Check | Actual final result |
| --- | --- |
| Full relevant browser suite | **160 passed, 0 failed/skipped** in 6.2 minutes |
| Focused dual-theme browser checks (subset) | **20 passed, 0 failed/skipped** |
| Owner/backend regressions | **215 passed, 0 failed/skipped**, including six pre-paint/preference unit cases and prior reference-block safeguards |
| Root regressions | **42 passed, 0 failed/skipped**; reused this session's valid run because root implementation did not change |
| Typecheck | **Passed** |
| Production build | **Passed** |
| `npm run check:theme` | **Passed**: required/additional token contrast and unintended interface-color literal scan |
| Existing `check:seo` / `check:links` | Not present in either package manifest; no unrelated infrastructure created |

Theme checks include system changes, explicit override, cross-tab synchronization, refresh, closing/relaunching a real isolated Edge browser process with its temporary profile, unavailable storage, 320px overflow, 720px CSS reflow corresponding to a 1440px desktop at 200%, keyboard drawer trap/Escape, reduced motion and Windows Chromium forced-colors emulation. The 200% check models the resulting CSS viewport; it is not a claim that browser chrome zoom was manually operated. Forced-colors emulation is not an OS-wide high-contrast acceptance run. These are fixture/browser evidence, **not new real-Meteor acceptance**.

`check:theme` scans only application `src` CSS/TS/TSX/SVG; dependencies, generated output, tests/fixtures and private artifacts are outside scope. Documented literal exceptions are the central palette, initial Next viewport theme-color and intentional fixed favicon artwork. Forced-colors uses system colors. The design detector returned three advisories: retained Arial typography (twice), and an earlier left-border declaration overridden by the final shared guidance rule. Computed guidance has the shared all-around border, not the flagged side-tab style. The approved typography was retained; no dependency/font download was introduced.

An intermediate light-only suite passed 148 cases before the dark specification arrived; it is superseded by the final 160-case run. The extra administrative screenshot helper initially failed on missing organization/session HTTP fixtures; this was screenshot-fixture coverage, not an application regression or a passing acceptance claim. Automatic approval review then rejected starting a separate fixture server on port 3114 (`blocked by policy`). No alternate startup path was used. Existing final captures plus serverless actual error-component previews were retained. The running port-3100 service was not restarted; the isolated final build is ready locally.

## Preservation and remaining submission blockers

Final read-only checks at **12:06:30 WAT**, finalized height **276332972**, block `8HZH4ktwKma5eZCpqQqocUBBK3fMhZSLUcYnGiV5Mtjr`: expected owner/code/no vault keys; vault paused; worker authorization null. Worker process count **0**. Both runtime gates false; legacy flag absent/empty. INV-0002 remains one Paid job, attempt 1, original payload/signed bytes and transaction `6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1`. Active/manual-review/history/consumption snapshot remains identical. Evidence: `artifacts/submission-readiness/containment-final.json`.

1. **Hosted submission, if a public URL is required:** final code is local/uncommitted and not deployed, as instructed. Publication/deployment and the production HTTPS origin still require the separate rollout process. This is not a failing local build or permission to activate payments.
2. **Future live owner reconciliation/payment use:** automatic V3 runtime adoption is deliberately not implemented/enabled/live-verified; V2's hold remains. Ongoing payments remain disabled. These limit financial-readiness claims, not the accepted historical transaction or read-only MVP demonstration.
3. **Local preview/additional visual acceptance:** restarting a separate fixture preview was policy-blocked. A final-build preview requires an allowed/manual local startup; no current-service restart is claimed. Exhaustive dark setup-state capture and runtime error-boundary fault injection remain unverified; shared styling and their existing functional fixtures passed.

Optional improvements, not blockers for the checked local build: manually inspect OS-level high contrast, actual browser-toolbar 200% zoom and other browser engines; take further setup-state screenshots when a preview is available. No independent accessibility/security certification is claimed. There are **no unresolved failing tests** in the final executed suites.
