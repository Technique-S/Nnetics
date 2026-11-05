# Sign-in page visual restyle — design

Date: 2026-11-06 · Owner: PayScope / Nnetics (`payscope` repo, `apps/owner`)

## Intent

Restyle the signed-out state of `/` to the supplied "Nnetics — Connect Wallet" mock: a light, airy, illustrated page — soft off-white background with decorative geometric SVGs, a centered logo header, one white rounded card with a bold blue CTA, and a small footer. Adapt the same composition to the app's dark theme. **No functional, behavioral or auth change.**

## Size

Small change. One presentational component + CSS + tokens + font files. No new behavior, no architecture change.

## Goals

- The signed-out page matches the mock's visual direction in light theme and a coherent dark adaptation (same layout, app dark palette, all art/illustration colors via theme tokens).
- Every existing behavior of the sign-in flow is preserved exactly: config load + failure state, session restore ("Continue to workspace"), Meteor connect with staged progress + cancel, optional "specific testnet account" input with validation, error/retry states, BroadcastChannel cross-tab locking, `?mode=demo` link, appearance control.
- `error.tsx`, `global-error.tsx`, `not-found.tsx` remain pixel-identical (zero diff).
- `npm run check:theme`, `typecheck`, build, unit tests, and the Playwright sign-in/appearance/redesign/action-states specs pass; screenshots regenerated for review.

## Non-goals / anti-goals

- No MetaMask/`window.ethereum`/EVM logic. Auth stays NEAR testnet + Meteor extension, off-chain message only.
- No new legal pages. Footer Privacy Policy / Terms of Service render as **dead links** (`href="#"`, non-navigating, `aria-disabled="true"`) until real pages exist — user's explicit call.
- The green ribbon logo is NOT introduced. Header keeps the **existing teal "N" monogram** (recreated as inline SVG matching `icon.svg`: deep-teal rounded square, light "N", coral dot).
- No restyling of the dashboard, onboarding, contractor or demo surfaces. No global font swap for the rest of the app.
- Dark mode is not removed; the appearance toggle stays on the sign-in page.

## Constraints

- `scripts/check-theme.mjs`: **no hex/rgb literals anywhere in `src/`** except `tokens.css`, `icon.svg`, `layout.tsx`. All colors — including inline SVG illustration fills — must come from CSS variables defined in `tokens.css`. Contrast ≥ 4.5:1 text / ≥ 3:1 controls. Raw `#1975ff`/`#94a3b8` from the mock are not used as-is; the CTA and subtitle colors are theme tokens adjusted to pass (subtitle uses the muted-text token, which already passes).
- Browser tests assert accessible names/roles: `Connect to Meteor` button, region `Meteor connection`, `Testnet wallet account ID` label, demo link, "Restoring your saved session" heading. These names/roles/labels are kept verbatim.
- `prefers-reduced-motion` already zeroes animations globally; the floating-star animation respects it. `forced-colors` keeps the visible focus outline.
- Privacy-conscious app: **no external Google Fonts request**. Plus Jakarta Sans (400/500/600/700, latin subset, woff2) is self-hosted in the repo and wired via `next/font/local`, scoped to the sign-in surface only (CSS variable, e.g. `--font-signin`, used by the new component's styles; rest of app keeps its current stack).
- Server is untouched; this is a front-end-only change.

## Approach (picked: B — isolated component)

1. **New presentational component** `apps/owner/src/app/sign-in-screen.tsx`: renders the full signed-out screen (decorative background layer, logo header + wordmark + "NEAR testnet" pill, card with h1 `Sign in`, subtitle, connect section, footer). Receives props from `Onboarding`: `config` status, `busy`, `loginStage`, `error`, `restoreAvailable`, `checkingSaved`, `loginAttempted`, `account`, `accountValid`, and callbacks (`onConnect`, `onCancel`, `onRestore`, `onAccountChange`, `onReload`, account-reset). All state, effects, auth and session logic stay in `Onboarding`; the component holds none.
2. **`onboarding.tsx`**: replace only the final signed-out `return (...)` markup with `<SignInScreen .../>`; no logic changes. The `signin-surface`/`entry-brand` rules stay for the error/not-found pages, untouched.
3. **CSS**: new scoped rules in `workspace.css` near the existing `.signin-surface` block (classes prefixed `signin-*`; the old classes are NOT retargeted). Mobile (`≤768px`) follows the mock: card padding shrinks, planet/pencil illustrations drop to low opacity. All sizes fluid; no fixed pixel widths that could overflow.
4. **Tokens** in `tokens.css`: new `--signin-*` / `--art-*` variables for page bg, card, CTA, CTA hover/active, shadow, and illustration fills/strokes — defined for `:root` and overridden in `html[data-theme=dark]`. Artwork in dark theme uses subdued, low-contrast strokes on the dark background (no pure-white art; the teal monogram artwork itself is unchanged).
5. **Layout structure**: body-level decorative SVGs as one `aria-hidden="true"` layer behind content (fed real markup only; no `background-image: url(data:image...)` so `check:theme` and bundler both stay happy); content column `max-width: 460px` centered; card `border-radius: 28px`, dual soft shadow in light, flat tonal surface step in dark (shadows removed in dark, per existing dark-depth rule).
6. **Card content mapping** (copy kept substantive, restyled):
   - h1 `Sign in`; subtitle `Connect your wallet`.
   - Region `aria-label="Meteor connection"` kept; primary button keeps **`Connect to Meteor`** label + wallet SVG icon (18px, currentColor). Busy state keeps `ActionButton` pending behavior (`pendingLabel` from `getProgressMessage(loginStage)`); cancel button and restore path (`Continue to workspace`) unchanged.
   - Config-error state keeps `Reload connection` button; restore path keeps its wording; `Supported wallets and networks` disclosure kept (Meteor extension only, activated testnet account); security fine-print kept ("off-chain sign-in message… No transaction, funds or access keys are requested."); specific-account disclosure kept with validation messaging.
   - Demo link kept: `Open explicitly simulated demo` (`/?mode=demo`).
   - `NEAR testnet` pill kept top-right; appearance control kept (top corner, restyled to new look).
7. **Footer**: `@MDBcertified` + separator dots + `Privacy Policy` / `Terms of Service` dead links (`href="#"`, `aria-disabled="true"`, click prevented). Rendered on the sign-in screen only.
8. **Metadata**: `layout.tsx` `viewport.themeColor` updated to the new light page background. `page.tsx`/`onboarding.tsx` logic, metadata and `privateMetadata("Sign in to your workspace…")` unchanged.

## Rejected alternatives

- **A. Restyle `.signin-surface` in place** — would retheme `error.tsx`/`global-error.tsx`/`not-found.tsx` unasked and mixes auth markup with presentational rework in one file.
- **C. Literal port of the pasted HTML/JS** — changes the auth model to MetaMask/EVM, hardcodes light-only colors that fail `check:theme`, drops session restore and the demo path, and dead-links would navigate.

## Verification

`npm run check:theme` · `npm run typecheck` · `npm test` (unit) · `npm run build` · Playwright: `appearance.spec.ts` (sign-in screenshots light+dark), `interface.spec.ts`, `redesign.spec.ts`, `onboarding.spec.ts`, `action-states.spec.ts`, `meteor-owner.spec.ts` — no selector/role changes required. Report both screenshots for the user's review.

## Left to the builder

Token names and exact hex values (must pass the checker), precise illustration stroke colors for dark, spacing rhythm, and minor copy tightening inside the card — all as long as the behaviors, accessible names and check:theme stay green.
