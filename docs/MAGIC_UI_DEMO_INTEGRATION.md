# Magic UI demo integration

Current scope: demo enhancements on `/?mode=demo`, `/demo/contractors`, and `/contractor?mode=demo`; the latest follow-up explicitly places decorative Light Rays on the shared sign-in screen (`/`). Smooth Cursor has been removed everywhere. Live operational routes retain their existing presentation; sign-in has only the explicitly requested decorative rays. The existing Animated Theme Toggler is frozen at commit f10cbdd.

## Integration plan

| Component | Planned surface | Files / adaptation |
| --- | --- | --- |
| Bento Grid | Demo Overview | `page.tsx`, shared demo presentation: retain existing responsive grid areas |
| Magic Card | Overview cards and demo entry | Semantic wrappers retain headings, content and emerald tokens |
| Animated List | Recent activity and bounded notification feeds | Show all initial records immediately; stable keys animate new records only |
| Number Ticker | Invoice, contractor and payout counts | Integer counts only; all monetary values stay exact and static |
| Typing Animation | Assistant greeting and non-critical fresh responses; demo entry copy | Non-blocking full-text accessibility layer, reduced-motion and completion controls |
| Smooth Cursor | Removed on user request | Native pointer restored everywhere |
| Ripple Button | Eligible secondary/form/filter actions | Shared wrapper preserves native button props, refs and action state |
| Interactive Hover Button | Explicit low-risk primary CTAs | Shared wrapper; static wallet/payment authorization exceptions |
| Progressive Blur | Independently scrolling demo transcript, payable list, sidebar/drawers | Only at overflowing edges; hide on focus, never on full page |
| Light Rays | Actual sign-in screen only | Visible from the first rendered rays; static reduced-motion fallback |

The app uses Next.js 16.4.3, React 19.3.1, Tailwind 4 and npm lockfiles. No Cult UI implementation or dependency is present in this main checkout. Existing tokens, typography, route structure, permissions, data adapters and API behavior are the authority.

## Source and installation

Official catalog: https://magicui.design/llms.txt and https://magicui.design/docs/components.
Every component is sourced from `https://magicui.design/docs/components/<slug>` and its official `https://magicui.design/r/<slug>.json` registry entry.

Executed (shadcn uses this app's npm lockfile for dependencies):

```text
pnpm dlx shadcn@latest add @magicui/bento-grid @magicui/magic-card @magicui/animated-list @magicui/number-ticker @magicui/typing-animation @magicui/smooth-cursor @magicui/ripple-button @magicui/interactive-hover-button @magicui/progressive-blur @magicui/light-rays --yes
```

Registry sources are adapted for operational accessibility and Nnetics' tokens, rather than introducing another theme provider. Dense tables, financial disclosures, wallet authentication, menu triggers, navigation/accessibility icon controls and irreversible authorizations retain their native behavior.

## Implemented coverage and component sourcing

All ten sources were originally installed from the official registry; Smooth Cursor was subsequently removed on user request. The theme toggler was already present and is unchanged by this integration.

| Component / official documentation | Demo integration |
| --- | --- |
| [Bento Grid](https://magicui.design/docs/components/bento-grid) | Overview grid; existing named areas and responsive breakpoints retained |
| [Magic Card](https://magicui.design/docs/components/magic-card) | Overview balance, attention, counts, status, activity, chart, quick actions and first steps; subtle token-based spotlight |
| [Animated List](https://magicui.design/docs/components/animated-list) | Recent activity and payment, receipt, invoice, funding and audit feeds; initial records immediately visible, supplied chronological order and stable keys retained; feeds above 50 records stay static |
| [Number Ticker](https://magicui.design/docs/components/number-ticker) | Pending invoice, active contractor and payout/status counts; monetary amounts never enter the ticker |
| [Typing Animation](https://magicui.design/docs/components/typing-animation) | Demo setup introduction, assistant greeting and fresh non-critical replies; full text is immediately available to assistive technology and selection, visual completion is capped at 650ms |
| Smooth Cursor | Removed, including source, mount and cursor-hiding CSS |
| [Ripple Button](https://magicui.design/docs/components/ripple-button) | Eligible secondary actions, searches/filters, form controls, refresh/retry and assistant actions across demo workspace and contractor pages |
| [Interactive Hover Button](https://magicui.design/docs/components/interactive-hover-button) | Demo progression and creation, add contractor, demo start, next-action navigation, and bill submission for review |
| [Progressive Blur](https://magicui.design/docs/components/progressive-blur) | Overflowing assistant transcript, payable list and sidebar/drawer; 10px edges with a 2px maximum blur, disabled on focused regions |
| [Light Rays](https://magicui.design/docs/components/light-rays) | Shared sign-in screen only; five immediately visible emerald rays, zero-duration static reduced-motion mode, stopped while the document is hidden |

Routes covered: `/?mode=demo` (setup, Overview, Contractors, Payables, Activity, Vault & Controls, Settings, Ask Nnetics), `/demo/contractors`, and `/contractor?mode=demo`. Signed-out `/` and `/contractor` are checked for absence of demo effects. Shared wrappers render their previous native structure outside demo mode.

## Buttons and justified exceptions

The audit inspected 127 button/action declarations plus the preserved theme/error controls. New wrappers retain button type, refs, event handlers, labels, disabled/fieldset behavior, busy states and keyboard form submission. Hover overlays are hidden from assistive technology and never create nested buttons.

- Wallet authentication, wallet verification, authorization, approval, reconciliation, irreversible payment confirmation, access revocation and destructive controls retain the existing unembellished presentation.
- Icon-only navigation/accessibility controls, menu triggers, switches, the Animated Theme Toggler and financially detailed selectable rows remain specialized controls.
- "Save billing agreement" remains static because it commits an immutable recipient/amount agreement. "Submit bill for review" is an ordinary review request and uses the primary effect.
- Create Organization and live onboarding are excluded by the demo-only scope. The latest follow-up moves Light Rays from demo setup to the actual shared sign-in page.
- Full-page content, ordinary contractor lists and transaction tables do not acquire artificial nested scrolling or blur. Blur is limited to regions that actually scroll independently.
- Assistant errors, stored history, addresses, numeric/financial replies, approval/confirmation copy and actionable response chips remain static. The existing JSON response transport and request lifecycle are unchanged.

## Dependencies and source adaptations

Added runtime dependencies: `motion@14.12.0`, `cn@0.5.2`. Existing `lucide-react` supplies icons. Removed the installer's unused `next-themes`, Radix icons, Radix UI and stock button dependency: only the Bento Grid layout is used, with Nnetics' existing semantic cards/actions. No new theme provider or palette was introduced. Magic UI's upstream MIT license is retained in `MAGIC_UI_LICENSE.txt`.

The activity list's marketing-style reveal/reversal was adapted to immediate operational records. Magic Card uses semantic variables rather than a separate theme hook. Smooth Cursor is removed; native browser cursor behavior is used everywhere. Demo effects are scoped to `html[data-demo-ui]`; the sign-in rays use their own explicit screen selector; the central provider derives this flag only from the current demo URL.

## Initial integration validation

- Repository unit tests: 42 passed. Application unit tests: 363 passed (405 total).
- Existing production browser regressions: 77 passed; one expected mobile configured-model test skipped because that suite intentionally runs its provider check once on desktop.
- Final production integration/contractor pass: 14 passed, including all eight new integration checks and six contractor regressions.
- `npm run typecheck`: passed. Isolated production `npm run build`: passed.
- `npm run check:theme`: passed, including reviewed token contrast and no unintended palette literals.
- Impeccable mechanical detector: empty findings (`[]`). `git diff --check`: passed.
- Visual captures reviewed at desktop, tablet and mobile sizes in both themes. A demo-only active-navigation hover contrast fix retains the sidebar's semantic colors.
- Appearance-control, Animated Theme Toggler and token files are byte-for-byte unchanged by this integration (`git diff --exit-code` against the preserved theme commit).
- No lint script or linter is configured in this repository; TypeScript, theme checks and the mechanical design check were used without adding a new lint stack.

No known integration-specific defects remain in the tested paths. Native cursors are used on all devices. Light Rays now appear exclusively on the actual sign-in page; this decorative exception follows the latest request. There is no Cult UI integration in this checkout to validate. The active preview remains `http://127.0.0.1:3100/?mode=demo`; no publishing or push is part of this change.

## Modified files

Repository-relative paths (generated Next route references are excluded):

- `apps/owner/package-lock.json`
- `apps/owner/package.json`
- `apps/owner/src/app/action-button.tsx`
- `apps/owner/src/app/agent-invitation.tsx`
- `apps/owner/src/app/ask-nnetics.tsx`
- `apps/owner/src/app/contractor-owner.tsx`
- `apps/owner/src/app/contractor-payment-draft.tsx`
- `apps/owner/src/app/contractor/page.tsx`
- `apps/owner/src/app/dashboard-navigation.tsx`
- `apps/owner/src/app/demo-magic.css`
- `apps/owner/src/app/error.tsx`
- `apps/owner/src/app/globals.css`
- `apps/owner/src/app/layout.tsx`
- `apps/owner/src/app/page.tsx`
- `apps/owner/src/app/payables-panel.tsx`
- `apps/owner/src/app/record-search.tsx`
- `apps/owner/src/app/simulated-intent.tsx`
- `apps/owner/src/components/demo/demo-button.tsx`
- `apps/owner/src/components/demo/demo-context.tsx`
- `apps/owner/src/components/demo/demo-scroll.tsx`
- `apps/owner/src/components/demo/demo-surfaces.tsx`
- `apps/owner/src/components/ui/animated-list.tsx`
- `apps/owner/src/components/ui/bento-grid.tsx`
- `apps/owner/src/components/ui/interactive-hover-button.tsx`
- `apps/owner/src/components/ui/light-rays.tsx`
- `apps/owner/src/components/ui/magic-card.tsx`
- `apps/owner/src/components/ui/number-ticker.tsx`
- `apps/owner/src/components/ui/progressive-blur.tsx`
- `apps/owner/src/components/ui/ripple-button.tsx`
- `apps/owner/src/components/ui/smooth-cursor.tsx`
- `apps/owner/src/components/ui/typing-animation.tsx`
- `apps/owner/src/lib/utils.ts`
- `apps/owner/tests/action-button.test.ts`
- `apps/owner/tests/browser/contractor.spec.ts`
- `apps/owner/tests/browser/magic-ui-demo.spec.ts`
- `apps/owner/tests/fixtures/load-tsx.ts`
- `apps/owner/tests/magic-presentation.test.ts`
- `docs/MAGIC_UI_DEMO_INTEGRATION.md`
- `docs/MAGIC_UI_LICENSE.txt`

## Reproducible checks

```text
npm test                                           # repository root
npm test                                           # apps/owner
npm run typecheck                                  # apps/owner
npm run check:theme                                # apps/owner
NNETICS_BUILD_DIRECTORY=.next-hosting npm run build # PowerShell uses $env:NNETICS_BUILD_DIRECTORY
```

Production browser tests use `NNETICS_BUILD_DIRECTORY=.next-hosting`, `NNETICS_BROWSER_BASE_URL=http://127.0.0.1:3112`, and matching `NNETICS_APP_ORIGIN` to avoid changing the active development preview on port 3100.

```text
npx playwright test tests/browser/appearance.spec.ts tests/browser/animated-theme-toggler.spec.ts tests/browser/action-states.spec.ts tests/browser/contractor.spec.ts tests/browser/payables.spec.ts tests/browser/multicurrency.spec.ts tests/browser/ask-nnetics.spec.ts tests/browser/overview-smoke.spec.ts tests/browser/navigation-consolidation.spec.ts
npx playwright test tests/browser/magic-ui-demo.spec.ts tests/browser/contractor.spec.ts --project=desktop
```

The integration suite explicitly covers desktop (1440px), tablet (820px), mobile (390px), both themes, native touch/reduced-motion pointers, native pointer behavior and editing, nested scroll focus, smallest-unit precision, chronological activity, and live-page exclusion. Existing regressions cover the theme reveal, persistence, forced colors, contractor permissions, invoice review, authorization, settlement, multicurrency amounts and model-backed assistant interactions.

The contractor workflow fixture now waits for an owner-created agreement to reach the other browser context before parsing its reference. This removes a race with the portal's existing focus/poll refresh; production polling and invoice logic are unchanged.

## Follow-up: native pointer and sign-in rays

Removed the Smooth Cursor component, central mount, pointer-hiding CSS and obsolete cursor-operation assertions. Motion remains a shared dependency for the other components. Light Rays moved from demo setup to `SignInScreen`; the ray layer now sits above the existing page background and below all sign-in content. The negative per-ray phase offset and nonzero initial opacity avoid a long invisible startup. Normal blending makes the emerald visible in light mode too. The same rays render statically for reduced motion, and pause while the page is hidden. No wallet authentication behavior is changed.

New files: `apps/owner/src/components/sign-in-rays.tsx`, `apps/owner/tests/browser/sign-in-rays.spec.ts`. Removed file: `apps/owner/src/components/ui/smooth-cursor.tsx`.

Follow-up verification: production build and TypeScript passed; theme and mechanical design checks passed; six focused action/list/native-render unit tests passed. Eight active-port-3100 sign-in browser cases passed across desktop/mobile, light/dark, and animated/reduced-motion modes. Visual captures confirm the rays are visible and the wallet button remains the hit-test target. No dependency was removed because Motion and `cn` are still used by the other components.

The active-port desktop demo native-pointer/text-editing browser regression also passed (nine focused browser cases in total).
