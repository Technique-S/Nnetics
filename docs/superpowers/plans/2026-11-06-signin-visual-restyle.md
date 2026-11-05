# Sign-in Visual Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle only the signed-out state of `/` to the approved "Nnetics — Connect Wallet" design (illustrated background, centered teal-monogram header, white card, blue CTA, footer), with a full dark adaptation and zero functional change.

**Architecture:** `Onboarding` keeps 100% of auth/session logic; a new presentational `sign-in-screen.tsx` receives props/callbacks and renders the design. All colors are theme tokens in `tokens.css` (required by `check:theme`); new styles live in `workspace.css` under `signin-*` classes; Plus Jakarta Sans is self-hosted via `next/font/local`, scoped to this page through a CSS variable.

**Tech Stack:** Next.js 16.4.3 App Router, React, plain CSS (global files), Playwright for browser verification.

**Spec:** `docs/superpowers/specs/2026-11-06-signin-visual-restyle-design.md`

**Identity note (resolved):** no personal git identity exists on this machine; the repo's origin is `https://github.com/Technique-S/Nnetics.git` and prior commits used `Codex <codex@users.noreply.github.com>`. Repo-local identity is set to that for consistency. The spec and plan are already committed as docs commits.

## Global Constraints

- `npm run check:theme` MUST pass: no hex/rgb literals in `src/` except `tokens.css`, `icon.svg`, `layout.tsx`; inline SVGs count as source. Text contrast ≥ 4.5:1; controls ≥ 3:1.
- Accessible names preserved verbatim (browser tests depend): button `Connect to Meteor`; region `aria-label="Meteor connection"`; input label `Testnet wallet account ID`; `Continue to workspace`; `Reload connection`; `Open explicitly simulated demo`; pill text `NEAR testnet`; heading `Restoring your saved session` unchanged.
- Auth model unchanged: NEAR testnet + Meteor extension only. No MetaMask/`window.ethereum`. No server/API changes.
- `error.tsx`, `global-error.tsx`, `not-found.tsx` must have zero diff. Old `.signin-surface` CSS stays for them.
- Footer links Privacy Policy / Terms of Service are dead links: `href="#"`, `aria-disabled="true"`, click `preventDefault()`. No new legal pages.
- Teal monogram brand (from `icon.svg`), NOT the mock's green ribbon.
- Self-hosted font only — no external Google Fonts request (privacy). `next/font/local` per Next 16 docs (`node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md`); `src` paths relative to the calling file.
- Dark theme delivered via `html[data-theme=dark]` overrides in `tokens.css`; no literals outside it.
- `prefers-reduced-motion` already zeroes animations globally; keep the floating-star animation CSS-driven so the global rule still disables it.
- Sign-in page background is `var(--color-bg)` in both themes (chosen over a separate token so `layout.tsx` `viewport.themeColor` stays correct and unchanged). Card uses near-white `var(--color-surface)`.
- Repo-local git identity required before any commit (see Identity note).

## Review Focus

1. **Dark theme sign-in contrast** (CTA button, footer links, subtitle on card/bg) — white on CTA, link on bg must be ≥ 4.5:1 → pinned by Task 2 (computed token values) and Task 6 (check:theme + Playwright `appearance.spec.ts` dark capture).
2. **`check:theme` literal scan fails** on inline SVG `fill="#…"` or rgb in CSS → all colors via `var(--*)` tokens; enforced by `npm run check:theme` in Task 2, 4, 6.
3. **Accessible-name regressions** (`Connect to Meteor` etc.) break browser tests → Task 3 keeps names verbatim; Task 6 runs `onboarding.spec.ts`, `action-states.spec.ts`, `interface.spec.ts`, `meteor-owner.spec.ts`.
4. **Horizontal overflow / clipped artwork at ≤760px and 320px** (SVGs positioned absolute can stick out) → `.signin-screen { overflow: hidden }` and ≤760px opacity reduction mandated in Task 4; Task 6 verifies `documentElement.scrollWidth <= innerWidth` at 320px and 1440px on `/`.
5. **Error / restore / cancel states broken by the markup move** (they reuse the same markup branches) → sign-in branches moved verbatim in Task 3; Task 6 verifies config-error, busy/cancel, restore paths via existing Playwright specs.

## File Structure

- Create `apps/owner/src/app/fonts.ts` — calls `localFont`, exports `jakarta` (`variable: "--font-jakarta"`).
- Create `apps/owner/src/app/fonts/plus-jakarta-sans-{400,500,600,700}.woff2` — latin subset, from Google Fonts CDN.
- Create `apps/owner/src/app/fonts/README.md` — source URL, retrieval date, OFL license reference.
- Create `apps/owner/src/app/sign-in-screen.tsx` — presentational signed-out screen (no state, no effects, no data fetching).
- Modify `apps/owner/src/app/layout.tsx` — `<body className={jakarta.variable}>`; nothing else (viewport.themeColor unchanged by design decision).
- Modify `apps/owner/src/app/tokens.css` — new tokens, light + dark (see Task 2 table).
- Modify `apps/owner/src/app/workspace.css` — append `signin-*` rules near the existing `.signin-surface` block.
- Modify `apps/owner/src/app/onboarding.tsx` — replace lines 460–483 with `<SignInScreen … />`; all logic untouched.
- Do NOT modify: `error.tsx`, `global-error.tsx`, `not-found.tsx`, server code, tests, `package.json`.

---

### Task 1: Self-hosted Plus Jakarta Sans + `next/font/local`

**Files:**
- Create: `apps/owner/src/app/fonts.ts`
- Create: `apps/owner/src/app/fonts/plus-jakarta-sans-400.woff2` (also 500, 600, 700)
- Create: `apps/owner/src/app/fonts/README.md`
- Modify: `apps/owner/src/app/layout.tsx`

**Interfaces:**
- Produces: CSS variable `--font-jakarta` on `<body>` (font-family chain set in Task 4 CSS as `var(--font-jakarta), Arial, Helvetica, sans-serif`).

- [ ] **Step 1: Download latin woff2 files**

Fetch `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap` with a Chrome UA; for each weight take the `latin` block's `url(...)` and download to `apps/owner/src/app/fonts/plus-jakarta-sans-<weight>.woff2`. Verify each file is > 10 KB and starts with `wOF2`.

- [ ] **Step 2: Write `src/app/fonts/README.md`**

Record: source URL, retrieval date 2026-11-06, weights 400/500/600/700, latin subset, SIL Open Font License 1.1 reference (`https://fonts.google.com/specimen/Plus+Jakarta+Sans` → license), and the `sha256` of each woff2 (`Get-FileHash -Algorithm SHA256`).

- [ ] **Step 3: Create `src/app/fonts.ts`**

```ts
import localFont from "next/font/local";

export const jakarta = localFont({
  src: [
    { path: "./fonts/plus-jakarta-sans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/plus-jakarta-sans-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/plus-jakarta-sans-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/plus-jakarta-sans-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-jakarta",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});
```

- [ ] **Step 4: Wire into root layout**

In `layout.tsx`: `import { jakarta } from "./fonts";` and change `<body>{children}<AppearanceControl /></body>` to `<body className={jakarta.variable}>{children}<AppearanceControl /></body>`. No other edits.

- [ ] **Step 5: Verify**

Run: `npm run build` — expected: build succeeds, no font loader errors. Run: `npm run typecheck` — expected: clean.

- [ ] **Step 6: Commit**

```bash
git add apps/owner/src/app/fonts.ts apps/owner/src/app/fonts apps/owner/src/app/layout.tsx
git commit -m "feat(sign-in): self-host Plus Jakarta Sans via next/font/local"
```

---

### Task 2: Design tokens (light + dark) in `tokens.css`

**Files:**
- Modify: `apps/owner/src/app/tokens.css`

**Interfaces:**
- Produces (used by Tasks 3–4): `--signin-cta`, `--signin-cta-hover`, `--signin-cta-pressed`, `--signin-link`, `--signin-cta-text`, `--shadow-card`, `--art-soft`, `--art-soft-2`, `--art-highlight`, `--art-line`, `--art-accent`, `--art-rose`, `--art-pencil-shade`, `--art-pencil-dark`, `--brand-dot`.

- [ ] **Step 1: Add to `:root` (light)**

Values below are pre-computed; white-on-CTA ≈ 5.3:1, subtitle uses existing `--text-muted` (already ≥ 4.5:1):

```css
  --signin-cta:#0D63E6; --signin-cta-hover:#0A55C0; --signin-cta-pressed:#084A9F; --signin-cta-text:#FFFFFF;
  --signin-link:#0D63E6;
  --shadow-card:0 10px 40px -10px rgb(16 47 51 / 8%), 0 2px 10px -2px rgb(16 47 51 / 8%);
  --signin-cta-shadow:0 4px 16px rgb(13 99 230 / 25%);
  --art-soft:#EDF2F9; --art-soft-2:#E9ECF3; --art-highlight:#F3F5F9;
  --art-line:#3B82F6; --art-accent:#75D625; --art-rose:#FF6B8B;
  --art-pencil-shade:#D9DFEA; --art-pencil-dark:#334155;
  --brand-dot:#E58A72;
```

- [ ] **Step 2: Add overrides in `html[data-theme=dark]`**

```css
  --signin-cta:#2E6BE6; --signin-cta-hover:#4A83F0; --signin-cta-pressed:#2458C4; --signin-cta-text:#FFFFFF;
  --signin-link:#8FBAFF;
  --shadow-card:none;
  --signin-cta-shadow:0 4px 16px rgb(0 0 0 / 35%);
  --art-soft:#162A26; --art-soft-2:#182B28; --art-highlight:#1E322E;
  --art-line:#6EA0F8; --art-accent:#75D625; --art-rose:#FF7FA0;
  --art-pencil-shade:#1E322E; --art-pencil-dark:#7E93A6;
  --brand-dot:#E58A72;
```

(White on `--signin-cta` dark ≈ 4.8:1; `--signin-link` dark on card ≈ 9:1.)

- [ ] **Step 3: Run checker**

Run: `npm run check:theme` — expected: `{passed: true, ...}`. (Artwork tokens are decorative, exempt from the 4.5:1 pairs; no hex leaves tokens.css.)

- [ ] **Step 4: Commit**

```bash
git add apps/owner/src/app/tokens.css
git commit -m "feat(sign-in): add sign-in and artwork design tokens for light and dark"
```

---

### Task 3: `SignInScreen` component + wire into `Onboarding`

**Files:**
- Create: `apps/owner/src/app/sign-in-screen.tsx`
- Modify: `apps/owner/src/app/onboarding.tsx:460-483`

**Interfaces:**
- Consumes: `AppearanceControl` (`inline` prop), `ActionButton`, `OperationFeedback` (`active: boolean; message: string`), `getUserMessage`, `getProgressMessage`, tokens from Task 2.
- Produces: `export function SignInScreen(props: SignInScreenProps): JSX.Element` with props exactly:

```ts
export interface SignInScreenProps {
  configReady: boolean;            // !!config
  restoreAvailable: boolean;
  busy: boolean;
  checkingSaved: boolean;
  loginStage: string;
  loginAttempted: boolean;
  error: string;
  account: string;
  accountValid: boolean;
  onReloadConfiguration: () => void;
  onRestore: () => void;
  onConnect: () => void;
  onCancel: () => void;
  onAccountChange: (value: string) => void;
  onUseDifferentWallet: () => void;
}
```

- [ ] **Step 1: Create `sign-in-screen.tsx` — structure**

Top-level: `<main className="signin-screen">` containing, in order:
1. `<div className="signin-art" aria-hidden="true">` — the 7 decorative SVGs from the mock (`starburst-tl`, `planet`, `starburst-bl`, `sunburst-tr`, `lime-star` (floating), `pencil`, `starburst-br`), each with `className="signin-art-item signin-art-<name>"`, `viewBox` and shape geometry copied exactly from the mock. Shapes carry only classNames; their fills/strokes are defined in Task 4 as `fill: var(--art-…)` rules (presentation attributes cannot reference CSS custom properties).
2. `<div className="signin-appearance"><AppearanceControl inline /></div>`
3. `<div className="signin-content">` — logo header: `<a className="signin-logo" href="/">` wrapping an inline teal monogram SVG matching `icon.svg` (rounded-square class `signin-logo-tile`, "N" path class `signin-logo-letter`, coral dot class `signin-logo-dot`; fills via Task 4 CSS) followed by `<span className="signin-wordmark">Nnetics</span>` and `<span className="signin-pill">NEAR testnet</span>`.
4. `<section className="signin-card">` — `<h1 className="signin-title">Sign in</h1>`, `<p className="signin-subtitle">Connect your wallet</p>`, intro copy paragraph (verbatim current copy: "Verify any supported, activated testnet wallet. You do not need an organization or vault to sign in. Wallet verification grants no organization membership or vault ownership."), `<details className="signin-disclosure"><summary>Supported wallets and networks</summary><p>Meteor extension only. Select NEAR testnet and an activated account. Other connectors are not supported by this sign-in flow.</p></details>`, `{error && <p role="alert">{getUserMessage(error)}</p>}`, then `<section className="signin-connection" aria-label="Meteor connection">` with the THREE branches copied verbatim from `onboarding.tsx:467-481` (only inside `{!configReady ? … : restoreAvailable ? … : …}` with `!config` → `!configReady`), plus `<OperationFeedback active={busy} message={loginStage} />` and `{!busy && <p>Connect opens an off-chain sign-in message in Meteor. No transaction, funds or access keys are requested.</p>}`.
   - `Connect to Meteor` button children: `<svg … wallet icon from mock (stroke="currentColor", aria-hidden="true", width/height 18)/><span>Connect to Meteor</span>`. Accessible name stays `Connect to Meteor`.
5. Demo link after the card: `<a className="button secondary signin-demo" href="/?mode=demo">Open explicitly simulated demo</a>`.
6. `<footer className="signin-footer"><span>@MDBcertified</span><span aria-hidden="true"> · </span><a href="#" className="signin-footer-link" aria-disabled="true" onClick={(e) => e.preventDefault()}>Privacy Policy</a><span aria-hidden="true"> · </span><a href="#" className="signin-footer-link" aria-disabled="true" onClick={(e) => e.preventDefault()}>Terms of Service</a></footer>`

- [ ] **Step 2: Connect branch buttons unchanged**

Exactly the current props: restore branch `pending={busy || checkingSaved} pendingLabel="Checking your saved session…" state={error ? "error" : "idle"} retryLabel="Continue to workspace"`; connect branch `pending={busy} pendingLabel={getProgressMessage(loginStage)} disabled={!!account.trim() && !accountValid} state={error && loginAttempted ? "error" : "idle"} retryLabel="Try again"`; cancel branch unchanged; account `<input>` keeps `maxLength={64} autoCapitalize="none" spellCheck={false}`; the input's `onChange` calls `onAccountChange(e.target.value)`; `Use a different wallet` calls `onUseDifferentWallet()`.

- [ ] **Step 3: Wire into `onboarding.tsx` (replace lines 460–483)**

```tsx
  return <SignInScreen
    configReady={!!config}
    restoreAvailable={restoreAvailable}
    busy={busy}
    checkingSaved={checkingSaved}
    loginStage={loginStage}
    loginAttempted={loginAttempted}
    error={error}
    account={account}
    accountValid={accountValid}
    onReloadConfiguration={() => location.reload()}
    onRestore={() => { setError(""); setCheckingSaved(true);
      void restoreSession().catch(e => { setError((e as Error).message);
        if (!(e instanceof LiveApiError && e.retryable)) setRestoreAvailable(false); })
        .finally(() => setCheckingSaved(false)); }}
    onConnect={() => { setLoginAttempted(true); void signIn(!account.trim()); }}
    onCancel={() => lock("Sign-in cancelled. You can connect again when ready.")}
    onAccountChange={(value) => { if (who || busy) lock(); setAccount(value); }}
    onUseDifferentWallet={() => { setAccount(""); lock("Choose a different wallet in Meteor, then connect again."); }}
  />;
```

Delete the old inline JSX (including `<AppearanceControl inline />`, `entry-brand`, `entry-network`). `accountValid` computation (lines 458–459) stays. Import `SignInScreen`. Remove now-unused imports ONLY if lint/typecheck flags them (`AppearanceControl` may still be used by the `who` branch — it is, keep it).

- [ ] **Step 4: Build + behavior sweep**

Run: `npm run typecheck && npm run build` — expected: clean; no unused-import errors (Next build lint treats them as warnings, not errors).

Run: `npx playwright test tests/browser/action-states.spec.ts tests/browser/onboarding.spec.ts --grep "Connect to Meteor"` — expected: all matched tests pass (button name, region, flow unchanged).

- [ ] **Step 5: Commit**

```bash
git add apps/owner/src/app/sign-in-screen.tsx apps/owner/src/app/onboarding.tsx
git commit -m "feat(sign-in): extract signed-out screen into SignInScreen component"
```

---

### Task 4: Artwork + layout CSS in `workspace.css`

**Files:**
- Modify: `apps/owner/src/app/workspace.css` (append near existing `.signin-surface` block)

**Interfaces:**
- Consumes: tokens from Task 2, classNames from Task 3.

- [ ] **Step 1: Root layout rules**

```css
.signin-screen { position:relative; min-height:100dvh; overflow:hidden; display:flex; flex-direction:column; background:var(--background); color:var(--text); font-family:var(--font-jakarta), Arial, Helvetica, sans-serif; padding:40px 20px 24px; }
.signin-art { position:absolute; inset:0; z-index:0; pointer-events:none; }
.signin-art-item { position:absolute; }
.signin-art-tl { top:-30px; left:-40px; width:260px; opacity:.85; }
.signin-art-planet { left:3%; top:40%; width:170px; }
.signin-art-bl { bottom:-60px; left:-40px; width:280px; opacity:.75; }
.signin-art-tr { top:-30px; right:-60px; width:320px; opacity:.65; }
.signin-art-lime-star { top:25%; right:17%; width:54px; height:54px; animation:signin-float 4s ease-in-out infinite alternate; }
.signin-art-pencil { right:-10px; top:42%; width:220px; }
.signin-art-br { bottom:-80px; right:-50px; width:300px; opacity:.8; }
@keyframes signin-float { from { transform:translateY(0) rotate(0); } to { transform:translateY(-8px) rotate(6deg); } }
.signin-appearance { position:absolute; top:16px; right:16px; z-index:2; }
.signin-content { position:relative; z-index:1; width:100%; max-width:460px; margin:auto; display:flex; flex-direction:column; align-items:center; }
```

Art SVG shape fills/strokes (Task 3 classNames): `.signin-art-tl path { fill:var(--art-soft); }` (same for `.signin-art-bl`, `.signin-art-br`), planet: circle/highlight `var(--art-soft-2)`/`var(--art-highlight)`, orbit ellipse `stroke:var(--art-line); fill:none;` (keep `stroke-dasharray` from mock), sunburst circle `var(--art-soft-2)` lines `stroke:var(--art-highlight)`, lime star `var(--art-accent)`, pencil: body `var(--art-soft-2)`, shade `var(--art-pencil-shade)`, dark tip `var(--art-pencil-dark)`, tip-highlight `var(--art-highlight)`, eraser `var(--art-rose)`, inner hole `var(--background)`.

- [ ] **Step 2: Logo header, card, CTA, footer rules**

```css
.signin-logo { display:flex; align-items:center; gap:12px; text-decoration:none; margin:8px 0 28px; }
.signin-logo-badge { width:40px; height:40px; display:block; }
.signin-logo-tile { fill:var(--color-header); }
.signin-logo-letter { fill:var(--sidebar-text); }
.signin-logo-dot { fill:var(--brand-dot); }
.signin-wordmark { font-size:22px; font-weight:700; letter-spacing:-.02em; color:var(--text); }
.signin-pill { font-size:12px; font-weight:600; color:var(--action); background:var(--selection); border-radius:999px; padding:4px 10px; }
.signin-card { width:100%; background:var(--surface); border:1px solid var(--border); border-radius:28px; box-shadow:var(--shadow-card); padding:40px 36px 36px; text-align:center; }
html[data-theme=dark] .signin-card { box-shadow:none; }
.signin-title { font-size:26px; font-weight:700; letter-spacing:-.01em; margin:0 0 6px; }
.signin-subtitle { color:var(--text-muted); font-size:14.5px; margin:0 0 20px; }
.signin-card :is(p, li) { color:var(--text-muted); }
.signin-disclosure { text-align:left; margin:16px 0; padding-top:16px; border-top:1px solid var(--border); }
.signin-disclosure summary { cursor:pointer; font-size:14px; color:var(--text); }
.signin-connection { text-align:left; }
.signin-connection .primary { width:100%; gap:10px; border-radius:14px; padding:15px 20px; }
.signin-connection .button.primary { background:var(--signin-cta); border-color:var(--signin-cta); color:var(--signin-cta-text); box-shadow:var(--signin-cta-shadow); }
.signin-connection .button.primary:hover:not(:disabled) { background:var(--signin-cta-hover); border-color:var(--signin-cta-hover); }
.signin-connection .button.primary:active:not(:disabled) { background:var(--signin-cta-pressed); border-color:var(--signin-cta-pressed); }
.signin-connection .button.secondary { margin-top:12px; }
.signin-demo { margin-top:20px; }
.signin-footer { position:relative; z-index:1; margin-top:auto; padding-top:28px; font-size:12.5px; color:var(--text-muted); text-align:center; }
.signin-footer-link { color:var(--signin-link); text-decoration:none; }
.signin-footer-link:hover { text-decoration:underline; }
.signin-footer-link[aria-disabled="true"] { cursor:default; }
```

- [ ] **Step 3: Responsive + motion + forced-colors**

```css
@media (max-width:760px) {
  .signin-art-planet, .signin-art-pencil { opacity:.35; }
  .signin-card { padding:32px 22px; border-radius:22px; }
  .signin-content { max-width:100%; }
  .signin-appearance { position:absolute; top:10px; right:10px; }
}
@media (prefers-reduced-motion: reduce) { .signin-art-lime-star { animation:none; } }
@media (forced-colors: active) { .signin-card { border:1px solid CanvasText; box-shadow:none; } .signin-pill { border:1px solid ButtonText; } }
```

- [ ] **Step 4: Verify no literal colors leaked**

Run: `npm run check:theme` — expected: `{passed: true}`. Any failure names the file/line with the literal — fix by moving the color into tokens.css.

- [ ] **Step 5: Visual check both themes**

Run: `npx playwright test tests/browser/appearance.spec.ts --grep "sign-in"` — expected: pass; screenshots written to `artifacts/submission-readiness/screenshots/{light,dark}-signin.png`. Open both and confirm: no overlap, no clipped artwork, card centered, lime star floats (light), dark CTA readable.

- [ ] **Step 6: Commit**

```bash
git add apps/owner/src/app/workspace.css apps/owner/src/app/tokens.css
git commit -m "feat(sign-in): style redesigned screen, art work and dark adaptation"
```

---

### Task 5: Remove dead styles from the extraction

**Files:**
- Modify: `apps/owner/src/app/workspace.css`
- Modify: `apps/owner/src/app/tokens.css` (drop `.signin-appearance` / `.entry-*` ONLY if unused)

- [ ] **Step 1: Find references**

Run: `Select-String -Path src -Pattern "signin-appearance|entry-brand|entry-network|entry-monogram"` — if no hits outside `tokens.css`/`workspace.css`, delete the now-dead rules (`.signin-appearance` is replaced by the positioned variant in Task 4; `.entry-brand`, `.entry-network`, and the `.entry-brand span` rule are unused).

- [ ] **Step 2: Verify error pages untouched**

Run: `git diff --name-only` and confirm `error.tsx`, `global-error.tsx`, `not-found.tsx` are absent. Run: `npm run build` — expected: success.

- [ ] **Step 3: Commit**

```bash
git add apps/owner/src/app/workspace.css apps/owner/src/app/tokens.css
git commit -m "chore(sign-in): drop styles orphaned by the extraction"
```

---

### Task 6: Full verification + screenshots for review

**Files:** none (verification only; may produce fixups in earlier files)

- [ ] **Step 1: Automated suite**

Run: `npm run check:theme && npm run typecheck && npm test && npm run build` — expected: all pass.

Run: `npx playwright test tests/browser/appearance.spec.ts tests/browser/interface.spec.ts tests/browser/redesign.spec.ts tests/browser/onboarding.spec.ts tests/browser/action-states.spec.ts tests/browser/meteor-owner.spec.ts` — expected: all pass; if any assertion depends on removed markup, fix the selector to the preserved accessible name (do not weaken the assertion; report the change).

- [ ] **Step 2: Overflow check at 320px and 1440px**

Run a one-off Playwright script (or extend an existing spec locally, do not commit it): goto `/`, resize 320×740 and 1440×900, assert `document.documentElement.scrollWidth <= innerWidth` in light and dark. Expected: true both. If false, clamp/hide the offending art item.

- [ ] **Step 3: Capture screenshots**

`npx playwright test tests/browser/appearance.spec.ts --grep "sign-in"` then copy `artifacts/submission-readiness/screenshots/DesktopChrome-light-signin.png` and `-dark-signin.png` (exact file names per test output) — report both to the user.

- [ ] **Step 4: Final commit (if any fixups)**

```bash
git add -A apps/owner/src
git commit -m "fix(sign-in): verification fixups"
```

---

## Self-Review

- **Spec coverage:** intent/both themes ✓ (Tasks 2, 4); Meteor-only auth preserved ✓ (Task 3 verbatim branches); isolated component + error pages untouched ✓ (Tasks 3, 5); self-hosted font ✓ (Task 1); dead footer links ✓ (Task 3); teal monogram ✓ (Tasks 3–4); no hex literals ✓ (Tasks 2, 4, 6); check:theme/typecheck/build/unit/Playwright ✓ (Task 6); `viewport.themeColor` — spec decision superseded (bg = `var(--color-bg)` = current `#F0F5F4`, so layout unchanged; noted, not silently dropped).
- **Proportion:** plan ≈ spec ×3; code blocks carry only decisions, not full implementations.
- **Type consistency:** `SignInScreenProps` defined once (Task 3); `jakarta` export name consistent (Task 1); all tokens referenced by Tasks 3–4 exist in Task 2 (`--signin-cta-shadow` included in both themes).
