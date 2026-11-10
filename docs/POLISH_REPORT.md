# Nnetics polish — Phase 1

This is the Phase 1 action-presentation report, not a claim that the later copy, metadata and route-check phases have passed. The superseding corrections in `UX_AUDIT.md` govern those phases.

## Correction disposition

- Token amounts use the existing precision-safe `formatNear`; `displayAmount` is a thin display wrapper. `Intl` is used only for dates. Tests cover the smallest unit and values beyond floating-point precision.
- Financial decision fields, network, recipient, exact amount, fees, expiry and unknown-result guards were not removed. Stored identifiers, API names, contract methods, payment rules and idempotency identities are unchanged.
- The shared button no longer defaults every error to “Try again.” Financial forms retain specific review/save wording. A pending or unknown payment is still blocked by the existing guards.
- Saved-session checking, wallet sign-in and connection reload are separate, mutually exclusive controls with separate handlers. Financial signing and read-only transaction checking were not merged.
- Existing sign-out, wallet cancellation, revocation and owner-approval handlers remain authoritative. The dialog has one visible Cancel control; Escape keeps its existing handler.
- No public pages, footer destinations, sitemap entries or JSON-LD were added. Organization/WebSite/SoftwareApplication/FAQ/public breadcrumb JSON-LD: **not applicable, no public routes**.
- Production origin is unassigned. Only `NEXT_PUBLIC_SITE_URL` may supply it; there is no localhost/guessed metadata fallback. Approved metadata tagline: “Pay approved contractor work within limits you set.”
- The custom lint script was removed in the correction commit. No dependencies were installed. The request/RPC task's files and changes remain outside these commits.

## Action changes

| Before | Phase 1 result |
| --- | --- |
| Connect, sign-message and connection-retry primary controls | One current sign-in action with pending/error presentation; optional account entry remains optional |
| Saved-session retry mixed into wallet handler | Separate “Continue to workspace” read-only action; no new wallet proof |
| Configuration retry mixed into wallet handler | Separate “Reload connection” action while configuration is unavailable |
| Dialog close icon plus Cancel | One Cancel button, with existing Escape behavior |
| Ad hoc async button rendering | Shared native `ActionButton`, disabled pending state, spinner and reduced-motion fallback |
| Generic error label on financial forms | Specific “Review wallet request” or existing save label; no automatic request or replay |
| Provisioning dispatch still offered after a transaction ID was saved | Only the existing “Check setup status” action is shown; signing is not offered again |
| Previously clicked selection could inherit a later loading state | Synchronous selections clear their pending marker; only the initiating async control loads |

Buttons retain native form-submit semantics. Refresh controls call their existing refresh function explicitly, so a click event cannot accidentally become a read-policy argument. Rendering, mounting or animating an action does not trigger a request.

## Verification scope

All executions are local Windows / Node 24.18.0. No Linux CI, independent security review or new real-wallet journey is claimed by this UI phase.

An isolated snapshot is built from committed code plus only this phase's projected UI/test changes. It uses separate fixture/demo storage, no private environment file and no live records. This separates these changes from the other request/RPC task's uncommitted behavior. Shared working-tree results are recorded separately below.

| Actual execution | Result |
| --- | --- |
| Shared-tree owner tests | 120 passed, including concurrent request/recovery tests; these are not all part of this commit |
| Root reference tests | 42 passed |
| Final presentation unit checks | 7 passed: action states/native semantics/no render-triggered requests, precision, origin and error distinctions |
| Shared-tree production build | Passed with the normal Next build |
| Final shared-tree action browser checks | 10 passed across desktop and mobile |
| Isolated owner suite | 103 passed: existing 96 tests plus 7 presentation cases |
| Isolated type-check and production build | Passed; webpack build used with the shared dependency junction |
| Initial isolated full browser run | 97 passed, 2 failed, 1 intentionally skipped mobile browser-restart duplicate |
| Final isolated targeted browser run | 12 passed: both corrected login cases plus all 10 action-state cases |
| Broader shared-tree browser run | 94 passed, 11 failed, 1 skipped; **not green** |

The two isolated failures were the same stale fixture on desktop/mobile: it returned a saved-session outage before sign-in, then tried to click the wallet action. The fixture now starts unauthenticated and returns the workspace outage only after accepting the proof. Both corrected cases pass without a second signature. The final targeted run also covers the added saved-session pending state, unknown provisioning status-only gate and unrelated-button spinner regression. The full run and final targeted run together cover 103 passing desktop/mobile cases plus the one intentional skip; this is not represented as a single fresh full-suite run.

The shared-tree failures concern slow verification, temporary session-read failures, pre-session proof retry, reload-time saved-session recovery, post-proof workspace recovery and unreadable service responses. The other task's uncommitted request policy changes read retries/deadlines and one-shot writes. Those failures are reported, not fixed by modifying that task's code or weakening its assertions. The broader shared-tree suite was not rerun after the final fixture/presentation changes; its integration status remains unresolved. The final 10 action checks do pass against that shared tree. Request/RPC files, configuration and request-policy/backend tests remain excluded from this phase's commit. The shared onboarding browser file includes only this phase's control selectors and the corrected login fixture.

Desktop (1440 px) and mobile (390 px) sign-in/dialog renders were captured with fixture requests and visually inspected. The single cancel control and exact NEAR/recipient fields fit both layouts. Existing copy/metadata issues remain explicitly assigned to later phases.

Read-only payment baseline check at `2026-11-04T15:12:25.419Z`, finalized height `276211630`: owner remains `grandtheft.testnet`, vault paused, automatic-payment authorization absent, no reserved funds and the original 0.001-NEAR payment to `babygoat.testnet` still Paid. The original transaction is [6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1](https://testnet.nearblocks.io/txns/6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1). No worker CLI process was running. No transactions, new jobs, deployment or push were performed.

## Later phases remain open

Route inventory and original title/h1 values remain in `UX_AUDIT.md`; metadata was not changed in this phase. Per-route and authorized-view metadata, contractor loading h1, error boundaries, icons, robots exclusions, visible breadcrumbs, vocabulary/error mapping, network-indicator consolidation, `check:seo` and fixture-only `check:links` still require their respective implementation phases. No pass is claimed for those absent checks.

The later display vocabulary is fixed by the user's table: Agreements for work orders, Payment limits for budgets/caps, plain payment/permission/balance wording, and clear separation of Contractors from payment-recipient records. Internal names remain unchanged. Every route stays noindex, and private invitation links/tokens must never enter canonicals, sitemaps or logs.


## Remaining-phase work in progress

The next pass is uncommitted so it can be completed as phase-sized commits. Error presentation now uses the shared mapper in sign-in, owner/contractor and provisioning views. Private-route metadata, authorized dashboard/contractor-tab title updates, contractor loading h1, recovery boundaries and robots exclusions have been implemented. No sitemap, public page, JSON-LD or absolute canonical was added. Type-check, production build and the seven presentation unit cases passed for this work.

A fresh fixture-only inspection covered 19 route/view states. The nine owner sections have distinct titles and descriptions (128–140 characters), the contractor portal and demo-owner route have distinct metadata, and 404 has its own title. All inspected states had one h1 and no canonical. Organization selection/setup/restoration and the demo overview still need distinct state metadata; the inspection is not a passing SEO acceptance. Visible breadcrumbs, icons, comprehensive vocabulary cleanup, network-indicator consolidation and the final fixture-only SEO/link scripts remain incomplete. Existing browser assertions also require presentation-only updates before a fresh full regression run.

The Jade & Midnight attachment was read. Its exact palette, no-theme-switch requirement and full route/state coverage are queued after the remaining phases, as requested. The visual identity has not been applied yet. The request/RPC changes remain excluded from this work, and their previously reported integration failures have not been declared resolved. No transactions or pushes were performed.
