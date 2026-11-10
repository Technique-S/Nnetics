# Siohioma shell for the Nnetics demo — short design

Date: 2026-11-07 · Status: awaiting approval

## Intent and why

The demo workspace (`/?mode=demo` in `apps/owner`) already implements the requested
behavior: six tabs in order Overview → Contractors → Receipts → History → Vault →
Settings, an Overview fed by the simulated ledger (Needs attention, Available vault
balance, Total paid, Recent activity, Confirmed payouts over time), a right-hand
payment-status column with a contextual next action (Fund vault / Add contractor),
empty states, funding kept in Vault, activity linking to History/receipts, a mobile
drawer, the "Demo · simulated funds" banner and dark-mode controls.

Missing is the attached sample's visual architecture. This pass restyles the **demo
shell only**: rounded app frame, compact icon-plus-label sidebar, slim header,
prominent summary cards, dashboard grid — expressed entirely in the existing
Jade & Midnight / Jade Night tokens (`tokens.css`). Workflows, routes, data and
copy remain untouched.

## Goals

- **Rounded app frame**: demo workspace (sidebar + main) sits in a rounded (~28–32px),
  bordered, softly shadowed frame, centered with a max width (~1500px) on the theme
  canvas; page scrolls inside it like the sample.
- **Sidebar ~250px, icon + label** (order already correct): Siohioma treatment —
  brand mark, workspace name, rounded-xl nav items, active item marked by a small
  accent pill on the rail's edge; existing collapse toggle collapses to the ~72px
  icon rail with saved state; theme surfaces come from `--sidebar*` tokens.
- **Slim header**: one row — "Demo · simulated funds" (left), demo account/appearance
  menu and refresh as pill/circular controls (right). No search input (nothing to
  search; no fake controls).
- **Overview grid (sample-mapped)**: top row of three prominent cards — dark hero
  card (Needs attention content; empty state keeps it calm), Available vault
  balance, Total paid. Then left/center region: Recent activity as a
  transaction-list card, below it Confirmed payouts over time as a bar-card.
  Right rail (~1/3): Payment status (SVG donut of Paid/Pending/Failed counts with
  center total) and the Next-action card in accent-tinted background with a primary
  button. Donut and bars are hand-rolled SVG/CSS — **no new dependencies** (no
  Chart.js / Tailwind / icon CDNs).
- **Same treatment across the other five tabs**: panels become rounded cards with
  the sample's card paddings; headings, banners, records restyled; workflows,
  links and controls unchanged (funding stays in Vault).
- **Mobile (≤760px)**: compact drawer menu; single column where Available vault
  balance and Next action come first, then status, attention, paid, activity,
  chart; "Demo · simulated funds" visible; demo banner text truncates safely.
- **Themes**: identical structure in Jade & Midnight and Jade Night; dark depth via
  existing surface steps and `box-shadow:none`; **existing dark-mode controls**
  (account menu + Settings appearance control) keep working unchanged.
- **Verification**: extend/keep the demo browser specs; verify setup→Overview and
  payout→receipt flows on desktop and mobile in **both themes**.

## Non-goals

- No visual changes to the live (wallet) dashboard, sign-in screen, contractor
  portal, or `Ask Nnetics` beyond inheritance (Ask Nnetics keeps its look).
- No theme/token value changes, no new fonts or libraries, no data/API changes.
- No commits or pushes: the pass stays uncommitted with the existing tree.

## Anti-goals (failures)

- Breaking existing test selectors (headings, button names, `aria-current`,
  `overview-*` hooks) — the restyle must not rename user-visible labels.
- Nonfunctional decoration that adds fake search/filters.
- Live-view regression via shared CSS (hence demo-gated classes below).

## Constraints

- Next 16 app-router client component; styling continues in `workspace.css`
  + `tokens.css` with their alias system; 760px breakpoint; reduced-motion and
  forced-colors affordances preserved.

## Approach (one sensible path)

Add demo-scoped wrapper/attribute classes (e.g. `.app-shell.demo-shell`,
`data-demo=true` on `<html>`) set by the Dashboard when the adapter is
`DemoWorkspaceAdapter`. All new restyle rules in `workspace.css` are scoped under
those hooks, so shared shell markup stays and the live view is untouched.
Alternatives rejected: restyling the shell globally (out of scope for the live
view), and rebuilding the demo screens as separate components (duplicates
workflows and breaks the existing specs for no gain).

Decisions already made with the user: sidebar = the sample's full ~250px
icon-plus-label sidebar, collapse enabled (reusing the existing toggle + saved
state).

## Left to the builder

Pixel values, focus-visible details, the donut's stroke math, empty-state phrasing
reusing current copy, and keeping/refreshing the two browser specs (setup→Overview,
payout→receipt) across desktop/mobile and both themes.
