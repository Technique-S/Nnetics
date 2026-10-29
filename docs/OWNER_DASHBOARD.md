# Milestone 2: local owner dashboard

This document records the **historical Milestone 2 simulation baseline**. Current
Milestone 3 integration, wallet/queue behavior and remaining limitations are in
[LIVE_INTEGRATION.md](LIVE_INTEGRATION.md). The root URL now selects testnet mode;
use `/?mode=demo` to reproduce the explicitly simulated dashboard described here.

This is a local frontend milestone, backed exclusively by a typed, in-memory mock
adapter. It is not the completed wallet/chain integration. All people, accounts,
invoices, deposits and payment attempts are synthetic. Reloading the browser starts
a fresh session. Reset also fences outstanding simulated callbacks.

## Run locally

From apps/owner, use Node 24 and run:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3100. For a production-mode local preview, run npm run build
and then npm run start. Both server commands bind only to 127.0.0.1.

The app pins Next.js 16.4.3, React/React DOM 19.3.1, Tailwind 4.3.3 and TypeScript
5.9.3 in its own package manifest/lockfile. Official installation guidance was
checked: [Next.js](https://nextjs.org/docs/app/getting-started/installation) and
[Tailwind](https://tailwindcss.com/docs/installation/framework-guides/nextjs).
The reference policy at the repository root retains its separate dependency-free
test command; frontend dependencies do not enter the contract build.

## Implemented screens

- Overview: funded ledger, spent/reserved/uncommitted budget, cap, permanent vendor
  slots, pending attempts, pause switch and worker revocation/authorization simulation.
- Vendors: view, disable/re-enable and update recipients within three permanent IDs.
  Updating a vendor does not change recipients of previously approved orders.
- Work orders: create immutable exact approvals, view recipient/amount/expiry/status,
  revoke future initiation, retain pending/paid records and reject recycled IDs.
- Invoice review: enter sample fields and original text manually, compare exact
  recipients/amounts, show policy reasons and acknowledge review. Acknowledgement
  never overrides failed rules or creates approval. Source text renders literally;
  no extractor or model runs.
- Payment history: all attempts, pending/paid/failed filters and explicit simulated
  references. Unknown outcomes remain reserved and cannot be retried or unlocked
  by review, refresh, elapsed time, pause or revocation.

The demo controls select a conclusively successful/failed/unknown simulated result,
inject a load failure, or reset synthetic state. New simulations reserve and claim
synchronously before awaiting a result. Pause/revocation remains usable in flight;
it cannot reverse an already initiated transfer. Failed results preserve revocation.

## Typed adapter and preserved interface

src/data/owner-adapter.ts defines the simulation-only adapter capability, typed
snapshot and owner command union. Method names/argument fields are the existing
Rust interface: register_vendor, disable_vendor, approve_work_order,
revoke_work_order, set_paused, authorize_agent and revoke_agent. Amounts and
nanosecond expiries remain canonical decimal strings, with BigInt validation and
exact 24-place NEAR conversion. Expiry comparisons retain nanosecond precision.

The aggregate snapshot adds explicitly off-chain IDs, labels, invoice text, audit
entries and simulated receipt references. Its vault data is the UI's typed subset,
not a generated complete contract binding. The contract ABI and serialized storage
layout were not changed for the dashboard. Mock policy checks serve UX tests;
they are not chain authorization and do not replace independent contract enforcement.

There is no live adapter, RPC URL, signing key, wallet connector, server action,
funding path or deployment method. Deployment is a false capability in the adapter
and an explicitly disabled UI control. Browser connection policy allows the local
origin only (plus local development WebSocket); no remote fonts or external assets
are required. The mock exposes only its synthetic public worker identity.

## Execution and visual verification

Executed locally on Windows with Node 24:

| Check | Written | Executed | Result |
| --- | --- | --- | --- |
| Strict TypeScript check | Application, adapter, config and tests | tsc --noEmit | Passed |
| Production-mode build | Next.js static prerender/local server | next build | Passed |
| Adapter tests | 11 distinct Node tests | 11 | Passed |
| Browser tests | 4 scenarios × desktop/mobile | 8 executions in headless Edge | Passed |
| Dependency audit at install | 50 packages at initial install | npm audit | Zero reported vulnerabilities at that time |

Browser scenarios cover simulation labels, disabled deployment, all navigation,
vendor recipient updates with immutable old orders, new order creation/revocation,
pause/worker controls, conflicting invoices that stay blocked after review, unknown
outcomes remaining locked after refresh, load error recovery and literal untrusted
source text. Navigation tests reject external browser requests and check document
width on desktop and 390px mobile. These checks are not a full accessibility audit.

The initial browser run found a real mobile grid overflow affecting pointer access
to controls, and an ambiguous test locator for the framework's route-announcer
alert. The grid now constrains min-content width while tables scroll internally;
the application error region has its own accessible name. All eight cases passed
after these corrections. Desktop/mobile overview and review screenshots were
inspected and retained under ignored artifacts/owner/.

Reproduce from apps/owner:

```sh
npm run typecheck
npm test
npm run build
npm run test:browser
```

Windows tests use installed Edge. On other supported hosts, install Playwright's
Chromium test browser first. Browser test output lives under ignored test-results/;
traces are retained on failure. Source formatting used Prettier 3.6.2.

## Incomplete at the Milestone 2 baseline

Wallet connection, real owner authorization, chain reads/writes, authoritative chain
clock, persistent invoice/audit storage, indexing/reconciliation cursors and a live
worker are not implemented. The mock uses browser time, in-memory data and simulated
results. There is no real historical-proof upload or repair control. AI extraction
remains Milestone 3. The frontend is kept local; no dashboard code or service has
been published or deployed. Contract deployment remains disabled pending review
and separate transaction authorization. Passing frontend tests is distinct from the
Milestone 1 VM benchmarks and from independent security review.
