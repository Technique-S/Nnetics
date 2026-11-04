# Nnetics product polish — Phase 0 audit

4 November 2026 · Baseline `d0782955ee06ba6b78b067e0957750d48840fe59` · Phase 0 only

## Framework and boundaries

The application uses **Next.js 16.4.3 App Router with React 19.3.1 and TypeScript**. Server layouts provide metadata; `/` is a client page containing wallet onboarding and a hash-selected owner dashboard. `/contractor` and `/demo/contractors` are client pages backed by server API routes. Private records use server authorization and durable SQLite stores; payments use the existing guarded vault/worker. This is not a public marketing website or an unprotected static SPA.

Use Next Metadata/Viewport, route metadata files and built-in robots/sitemap generators in later phases. No head-management dependency is necessary. Dashboard hash views need browser-tab title/description updates after authorized restoration; they are not independent server routes. Public crawler visibility would require actual server-rendered public routes, if separately authorized. Moving the auth provider or converting hash navigation into remounting routes is unnecessary for this presentation pass.

No contracts, policy code, fixtures, signing configuration, payment rules or application UI were changed during Phase 0. Source and current committed render evidence were reviewed, with a fresh 19-state metadata inspection in isolated browser contexts using intercepted records. No real wallet session, private invitation, transaction or payment was requested. The existing Paid record, paused vault, revoked worker and disabled execution remain the baseline.

## Required values

| Placeholder | Evidence | Disposition |
|---|---|---|
| BRAND_NAME | README heading, application wordmark and metadata consistently say **Nnetics** | Available; reuse Nnetics |
| SITE_URL | Neither SITE_URL nor NEXT_PUBLIC_SITE_URL is configured in the private local environment; no approved hosted production origin is established in the repository | **Missing. Ask once; do not use localhost or invent a Render/custom-domain address** |
| TAGLINE | README contains a technical product description, and previous design proposals contain illustrative marketing lines, but no declared authoritative tagline | **Missing. Ask once; do not promote a proposal into approved brand copy** |

Private environment contents were not copied. The local wallet-signing origin is a different setting and must not be replaced with the SEO production URL.

## Route, page and state inventory

Metadata keys used below:

- **O:** title `Nnetics · Owner dashboard`; description `Guarded NEAR testnet payments, with an explicitly labeled demo mode.`; robots `noindex, nofollow`; no canonical, breadcrumb or JSON-LD.
- **C:** title `Nnetics · Contractor portal`; inherits O's description; robots `noindex, nofollow`; no canonical, breadcrumb or JSON-LD.
- **—:** not a separate document; inherits its containing page's head and h1. Dialogs/drawers must have an accessible name rather than a second page h1.

| Route / surface | File / controlling component | Access | Current title | Current h1 / accessible heading |
|---|---|---|---|---|
| `/`, anonymous sign-in | `apps/owner/src/app/page.tsx` → `onboarding.tsx` | Public transactional, noindex | O | Nnetics · NEAR testnet |
| `/`, saved-session restoration | `onboarding.tsx:428` | Session being verified; records hidden | O | Restoring your saved session |
| `/`, connecting / awaiting message / verification failure / accepted proof with workspace failure | `onboarding.tsx` login stage and retry branches | Transactional | O | Same sign-in h1; status/error text changes |
| `/`, new/returning wallet organization list | `onboarding.tsx:324` | Authenticated identity, organization access checked separately | O | Your workspace |
| `/`, selected unprovisioned organization | `onboarding.tsx`, `vault-onboarding.tsx` | Authorized organization creator/owner | O | Selected organization name |
| Create vault: review, prepared, awaiting chain, failed/retry, verified | `vault-onboarding.tsx` | Authorized organization; signing separately gated | — | Create vault / Verified vault is h2 under organization h1 |
| `/#Overview` | `page.tsx` Dashboard | Organization-authorized owner/viewer | O | Your payment desk |
| `/#Contractors` | `page.tsx`, embedded `contractor-owner.tsx` | Organization-authorized | O | Contractors |
| `/#Vendors` (On-chain vendors label) | `page.tsx` | Organization-authorized | O | Vendors |
| `/#Work%20orders` | `page.tsx` | Organization-authorized | O | Work orders |
| `/#Invoice%20review` | `page.tsx` | Organization-authorized | O | Invoice review |
| `/#Payment%20history` | `page.tsx` | Organization-authorized | O | Payment history |
| `/#Vault` | `page.tsx`, `testnet-controls.tsx` | Organization-authorized; mutations owner-only | O | Vault |
| `/#Access` | Same | Organization-authorized; membership mutations owner-only | O | Access |
| `/#Recovery` | Same | Organization-authorized; wallet reconciliation owner-only | O | Recovery |
| Manage vendor dialog | `page.tsx:109–181`, dynamic form | Owner; native dialog | — | No extra h1; h2 Manage a vendor |
| Approve work order dialog | Same | Owner; native dialog | — | h2 Approve a work order |
| Enter invoice dialog | Same | Owner; native dialog | — | h2 Enter a structured invoice / Add a sample invoice |
| Sidebar / mobile drawer | `dashboard-navigation.tsx` | Same authorized page | — | Workspace navigation accessible name; no h1 |
| Account menu / session-help disclosure | `onboarding.tsx` | Authenticated | — | Account & organizations / About this wallet session |
| Reference import / verification details | `page.tsx`, `testnet-controls.tsx` | Authorized, role-gated | — | Summary + h2; no page h1 |
| Overview/vendor/order/invoice/history empty and loading states | `page.tsx`, `loading-skeleton.tsx` | Authorized or restoring | O | Existing page h1, or Opening your payment desk while initial snapshot loads |
| Async notices, errors and action progress | `page.tsx`, `testnet-controls.tsx` | Same page | — | No h1; role=status or role=alert |
| `/contractor`, valid private invitation | `contractor/page.tsx`, `contractor/layout.tsx`, `demo/portal-ui.tsx` | Private-link-authorized; wallet proof/owner approval additional requirements | C | `{contractor name} · Billing` |
| Submit a bill / My payments / Wallet details tabs | `contractor/page.tsx` | Same private contractor | C | Same contractor h1 on all tabs |
| Contractor loading | Same | Link/session under validation, no protected snapshot | C | **No h1 during loading** |
| Revoked/missing/invalid link | Same | Public denial/recovery surface, no protected records | C | Private access unavailable |
| Clarification / pending wallet / requested wallet change / upload failure / extraction confirmation | Same, plus `BillCard` in `demo/portal-ui.tsx` | Same private contractor | — | Section headings/statuses, not new pages |
| `/?mode=demo` | Root `Onboarding` → mock adapter → Dashboard | Explicit simulation, no live identity | O | Your payment desk; other views use their existing dashboard h1 |
| `/demo/contractors` | `demo/contractors/page.tsx` → `contractor-owner.tsx` | Explicit demo owner session; isolated records | O | Contractors and bills |
| Demo contractor invitation | `/contractor` with demo/private-link state | Demo private session, simulated verification | C | `{demo contractor} · Billing` |
| Native replace-link / revoke-link confirmation | `contractor-owner.tsx` | Authorized owner | — | Browser confirmation, no extra page h1 |
| Profile/order/invoice lists, no records, load error / retry / locked access | `contractor-owner.tsx` | Organization or demo session | — | Page title plus section h2s |
| Missing route / 404 | `not-found.tsx`, inherited root layout | Public recovery surface, noindex | O | Page not found |
| Error boundaries | No custom `error.tsx` / `global-error.tsx` found | Next default unexpected-error handling | Framework default/inherited depending failure | Not product-controlled; needs explicit coverage |
| API routes | `/api/health`, `/api/live/[...path]`, `/api/live/contractors/[...path]`, `/api/demo/contractors/[...path]`, `/api/demo/owner-invoices` | Auth as implemented; health/config exceptions | N/A | JSON/attachments, not UI pages; raw messages currently leak through frontend error paths |

There are no landing, product, pricing, how-it-works, help, FAQ, terms, privacy or contact pages. Do not fabricate those pages, legal policies, claims, sibling links, testimonials or prices to satisfy a generic SEO checklist. No indexed public route currently qualifies for Organization/WebSite/SoftwareApplication/FAQ structured data. Authentication/private-link checks remain the security boundary; robots directives are not access control.

## Duplicate and overlapping actions

| Location | Current overlap | Required presentation treatment / distinction |
|---|---|---|
| Sign-in | Connect to Meteor + optional Sign message to sign in + Switch wallet / retry verification | One selected-wallet primary action with idle/loading/error state. Optional explicit-account entry can remain advanced; changing identity is a distinct secondary action. |
| Failed restoration / sign-in | Retry saved session + Connect to Meteor + optional retry controls may coexist | A retained session must retry restoration without a new signature. Bind the primary action to the actual recovery path; preserve this security/UX distinction. |
| Configuration error | Disabled Connect + Reload login configuration | One primary configuration recovery state with a specific reason; no unexplained disabled action. |
| Account menu vs advanced login | Switch wallet + Sign out + Switch wallet / retry verification | Sign out and deliberate identity change have distinct outcomes; label clearly and remove mixed “switch/retry” language. Do not merge them by altering revocation behavior. |
| Owner initial-load error | Opening heading + Retry loading | Same primary recovery action; error should not still look indefinitely loading. |
| Owner snapshot error | Refresh icon + Retry refresh | One refresh action driven by state; retry text after failure. |
| Owner modal | Close icon + Cancel | One dismissal control per brief. Keep Escape/native cancel and accessible naming. |
| Shared modal primary | Review / submit + Save simulated change + Saving… | Action-specific verb/object label, shared loading/error component, explicit simulation context outside the action label. |
| Organization load/create | Retry owner access/configuration + Create organization | Do not treat separate operations as duplicates; the screen should choose the valid next action for its state. |
| Contractor owner | Refresh owner records + Retry owner access | One reload action in its ready/error states; creation remains a distinct action. |
| Invitation replacement/revocation | Replace private link + Revoke access | **Not duplicates.** Replacement creates a new link; revocation ends access. Preserve consequences and deliberate confirmation. |
| Initial wallet / wallet change | Current wallet, request verification, approve/reject request | **Not duplicates.** Separate wallet control, owner consent and immutable existing-order recipient. Simplify copy, never collapse authority steps. |
| Bill preparation | Format labeled details + Extract locally · deterministic + optional AI extraction | Competing preparation paths. Prefer manual text/amount/order as primary; optional tooling needs truthful labels/privacy consent. No provider activation in this pass. |
| Bill failure / clarification | Submit bill for review / Send clarification / Cancel clarification | State-specific primary label on the same invoice; cancellation genuinely leaves edit mode. Reuse existing submission ID and history. |
| Vault setup | Create vault, Request Meteor approval, Reconcile and retry identical transaction, Resume / reconcile provisioning, Review retry of same vault | Several buttons are state branches, but some overlap in awaiting-chain state. First check the existing intent. **Read-only reconciliation and signing/broadcast cannot be merged blindly.** Never generate a replacement intent from a cosmetic retry. |
| Vault form | Fund ledger / fund reserve / set total budget / set cap behind generic Action + Review owner transaction | Different effects, not duplicates. Short human labels and current→proposed preview; same async button behavior around the existing handler. |
| Recovery | Header refresh + read-only refresh + wallet reconciliation | Consolidate read-only refresh; retain a separately and accurately named wallet reconciliation action. It changes accounting and can incur fees. |
| Existing links | Wordmark, return-to-workspace 404, demo back links | Wordmark and explicit recovery may share a destination without being duplicate adjacent actions. Avoid adding more back/cancel controls. |

## Copy, formatting and safe-decision findings

1. Technical language remains visible in navigation, headings, status, details, tooltips and labels: on-chain, finalized, authority, worker, ledger, Tgas, hash, digest, verifier, checkpoint, protocol, backend, immutable, structured invoice, deterministic, synthetic, testnet and deployment. Their individual meanings must be translated; none is an unconditional safe-to-delete list.
2. Preserve exact amount/token, full recipient access/copy, network at the financial decision, request effect, expiry/due date if present, known fees and unknown-outcome blocks. A blocked or ambiguous transfer must never become a generic retry invitation. Do not convert exact yocto/NEAR arithmetic into floating-point `Intl.NumberFormat` calculations; presentation formatting must preserve precision.
3. There are many `.message` → error state → role=alert paths. Sources include `onboarding.tsx`, `page.tsx`, `contractor-owner.tsx`, `contractor/page.tsx`, `vault-onboarding.tsx`; the source index below identifies individual lines. A shared presentation mapper must preserve session-expired vs temporary-RPC, duplicate invoice vs unknown transfer, rejected wallet vs failed transfer, and owner-only denials.
4. Native NEAR testnet **tokens do move** in live testnet payments. Only off-chain identity messages and explicit demo flows can truthfully say no funds move. A single unobtrusive network indicator is appropriate, plus network information wherever needed for a safe signing/payment decision. Do not imply mainnet readiness or real-money settlement.
5. Long paragraphs repeat permission and infrastructure details; buttons use slashes, mixed labels and implementation vocabulary. Keep essential disclosure available at the decision rather than removing it entirely or logging it only.
6. Owner, viewer, off-chain bill approval, approved chain work, queue state and confirmed payment are not interchangeable. Proposed plain-language labels must map these one-to-one; UI naming must not rename stored IDs or methods.
7. Date formatting currently uses local ad hoc `toLocaleDateString`; exact token formatting is `formatNear`, not a shared locale-presenter. Use a common date formatter and precision-safe amount presentation layer later. Do not alter expiry comparisons, values or recipient strings.
8. A shared ActionButton is absent. Existing native buttons have separate state/copy/disabled implementations. Reuse handlers and idempotency identities; never trigger a request from a mount/animation or regenerate an invoice/job during retry.

## Metadata, links and SEO findings

- O's title/description are reused by sign-in, setup, all nine dashboard views, demo owner and 404. C's description is inherited from O and shared across all contractor tabs. Titles are shorter than the requested 30–60 characters; the root description is shorter than 110–155.
- Root has `lang="en"` and Next supplies its default viewport. No explicit theme-color, icon/app-icon files, Open Graph/Twitter configuration, canonical, robots route, sitemap route, reusable Breadcrumbs or public JSON-LD helper was found.
- Private and transactional pages already have noindex/nofollow; retain that. The brief first asks for canonicals on every route, then more specifically restricts canonicals/structured data to public pages. Follow the specific public-only rule; record private canonicals/JSON-LD as not applicable rather than inventing public discoverability.
- There are no actual public informational siblings for a Product/How it works/Help/Terms/Privacy/Contact footer. List absent destinations instead of adding broken or fabricated links. A private contractor route is intentionally reachable only through a private link; it should not appear in public navigation/sitemap or expose invitation tokens in canonical URLs/logs.
- Owner hash views are reachable through the sidebar; `/demo/contractors` is linked from simulation; `/contractor` is reachable from owner-created invitations; the wordmark/recovery reaches `/`. 404 is intentionally not a navigation destination. Empty states and payment details can better link to the actual next screen without inventing entity routes.
- Future `check:links` must distinguish a missing page from a legitimate private-access denial and exercise authorized views with controlled fixtures. Never crawl/mutate real organization records or publish private links as test output.

## Missing specification and interpretation log

- The pasted brief refers to a **Phase 2 banned-term table**, but includes no terms/table after that heading. Exact banned-term pass/fail cannot be claimed. The provisional infrastructure scan below is a discovery index, not a supplied ban policy. Essential token/network/recipient information cannot be banned blindly.
- The brief refers to an unknown-error **“generic message above”**, but supplies no literal generic message. Proposed wording must be identified as newly authored rather than quoted from the user.
- Phase numbering is omitted in the attachment's headings. Working sequence: Phase 0 audit/configuration; Phase 1 shared action behavior; Phase 2 vocabulary/errors/formatting; Phase 3 metadata/link/breadcrumb/SEO plumbing; Phase 4 checks and polish report. Commit each separately; no push without the standing approval.
- BRAND_NAME is known. SITE_URL and TAGLINE are the only missing placeholders to ask at the end of Phase 0. Do not guess a production origin or claim earlier illustrative copy is approved.
- Actual due dates/fees must come from existing records/configuration. A work-order expiry is not automatically an invoice due date; no fake fee estimate or due date will be added.
- No lint tool/script exists in the app or root package. Record the missing command rather than installing an unrequested dependency during the audit.

## Phase 0 execution and handoff

- Fresh browser metadata inspection: **19 states**, including all owner views, entry/setup, demo and private/denied contractor views and 404, using synthetic intercepted records.
- App type-check: passed. Owner backend tests: **96 passed**. Root reference tests and production build: see completion result below.
- `npm run lint`: unavailable, exits with missing-script error. No lint pass is claimed.
- No UI code, contracts, policy modules, rule fixtures, data stores or secret files changed. New files are this report and a reproducible metadata-inspection script. No real wallet proof, payment, deployment, worker execution or push occurred.

Implementation resumes at Phase 1 after the missing production URL and tagline are supplied. Checks will use the same framework mechanisms and preserve the paused/revoked payment state.

## Appendix A — fresh rendered metadata baseline

These are observed browser states with synthetic protected records, not newly authenticated real-wallet results. `null` is absence. All rows had zero Breadcrumb nav elements and zero JSON-LD scripts.

| State | URL | Title | Description | Visible h1 | Robots | Canonical |
|---|---|---|---|---|---|---|
| Overview | /#Overview | Nnetics · Owner dashboard | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Your payment desk | noindex, nofollow | None |
| Contractors | /#Contractors | Nnetics · Owner dashboard | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Contractors | noindex, nofollow | None |
| Vendors | /#Vendors | Nnetics · Owner dashboard | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Vendors | noindex, nofollow | None |
| Work orders | /#Work%20orders | Nnetics · Owner dashboard | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Work orders | noindex, nofollow | None |
| Invoice review | /#Invoice%20review | Nnetics · Owner dashboard | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Invoice review | noindex, nofollow | None |
| Payment history | /#Payment%20history | Nnetics · Owner dashboard | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Payment history | noindex, nofollow | None |
| Vault | /#Vault | Nnetics · Owner dashboard | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Vault | noindex, nofollow | None |
| Access | /#Access | Nnetics · Owner dashboard | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Access | noindex, nofollow | None |
| Recovery | /#Recovery | Nnetics · Owner dashboard | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Recovery | noindex, nofollow | None |
| Sign in | / | Nnetics · Owner dashboard | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Nnetics · NEAR testnet | noindex, nofollow | None |
| Empty workspace | / | Nnetics · Owner dashboard | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Your workspace | noindex, nofollow | None |
| Draft organization | / | Nnetics · Owner dashboard | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Your workspace | noindex, nofollow | None |
| Restore | / | Nnetics · Owner dashboard | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Restoring your saved session | noindex, nofollow | None |
| Verification error | / | Nnetics · Owner dashboard | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Nnetics · NEAR testnet | noindex, nofollow | None |
| Demo dashboard | /?mode=demo | Nnetics · Owner dashboard | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Your payment desk | noindex, nofollow | None |
| Demo contractors | /demo/contractors | Nnetics · Owner dashboard | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Contractors and bills | noindex, nofollow | None |
| Contractor portal | /contractor | Nnetics · Contractor portal | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Ada Brooks · audit fixture · Billing | noindex, nofollow | None |
| Revoked invitation | /contractor | Nnetics · Contractor portal | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Private access unavailable | noindex, nofollow | None |
| Not found | /phase-zero-missing-route | Nnetics · Owner dashboard | Guarded NEAR testnet payments, with an explicitly labeled demo mode. | Page not found | noindex | None |

## Appendix B — provisional infrastructure/clutter source scan

The requested banned-term list is missing. This **candidate** scan used infrastructure words (testnet/mainnet, NEAR, NEP-413, FullAccess, finalized, protocol, checkpoint/bootstrap/verifier, outbox/worker/ledger, yocto/Tgas/hash/digest, reconciliation, on/off-chain, backend/server/API/SQLite, deployment/Milestone, synthetic/simulation/mock, configured/artifact/epoch/nonce/receipt/storage/authority/policy). It found 220 source lines. It is not an instruction to remove essential financial facts or code identifiers. Imports/conditions are included as provenance and must be distinguished from rendered text. Excerpts are shortened; source file/line identifies the complete original. No policy/fixture source was rewritten.

| File:line | Source excerpt / candidate |
|---|---|
| `apps/owner/src/app/contractor/page.tsx:11` | const empty: BillFields = { reference: "", orderId: "", amount: "", asset: "NEAR", recipient: "" }; |
| `apps/owner/src/app/contractor/page.tsx:46` | const token = location.hash.slice(1); |
| `apps/owner/src/app/contractor/page.tsx:101` | missing.push("Currency conflict: clarify the source currency. Only NEAR on testnet is supported; no conversion was made."); |
| `apps/owner/src/app/contractor/page.tsx:110` | setFields(f => ({ ...f, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v)), asset: "NEAR", reference: f.reference, orderId: match?.id \|\| f.orderId })); |
| `apps/owner/src/app/contractor/page.tsx:120` | setFields(f=>({...f,amount:result.fields.amount\|\|f.amount,recipient:result.fields.recipient\|\|f.recipient,orderId:match?.length===1?match[0].id:f.orderId,asset:"NEAR"})); |
| `apps/owner/src/app/contractor/page.tsx:144` | <label htmlFor="bill-text">{persistent ? "What did you do?" : "Bill text"}</label><textarea id="bill-text" aria-describedby="submission-guidance" rows={7} maxLength={24000} value={body} onChange={e => {setBody(e.target.value);setExtraction(null);setConfirmed(false);}} placeholder={'Work order: WO-001\nAmount: 1 NEAR\nOne article delivered for the approved brief.'}/><div className={s.actions}><button type="button" cla… |
| `apps/owner/src/app/contractor/page.tsx:145` | {persistent && <><label htmlFor="primary-amount">How much are you requesting?</label><input id="primary-amount" aria-describedby="submission-guidance" inputMode="decimal" value={fields.amount} onChange={e=>setFields({...fields,amount:e.target.value})}/><p>Currency: NEAR · Testnet</p></>} <label htmlFor="work-order">Approved work order</label><select id="work-order" aria-describedby="submission-guidance" disabled={!!e… |
| `apps/owner/src/app/contractor/page.tsx:154` | <p>Currency: NEAR · Testnet</p></>} |
| `apps/owner/src/app/contractor/page.tsx:156` | {extraction&&<section aria-label="Extraction confirmation"><p>{extraction.label}</p><dl><dt>Extracted work description</dt><dd>{extraction.fields.description \|\| "Not extracted; confirm manually"}</dd><dt>Extracted amount claim</dt><dd>{extraction.fields.amount \|\| "Missing; enter one exact amount"}</dd><dt>Stated currency</dt><dd>{extraction.fields.currency \|\| "Not stated; clarify if needed. Testnet supports NEAR only… |
| `apps/owner/src/app/contractor/page.tsx:158` | <aside><section className={s.preview} aria-label="Formatted bill preview"><span className={s.tag}>{persistent ? "Formatted preview · Testnet" : "Formatted preview · Demo"}</span><h3>{edit?.reference \|\| "Reference assigned on submission"}</h3><p className={s.muted}>{snapshot.profile.name}</p><div className={s.money}>{fields.amount \|\| "—"} {currencyConflict(body) ? "— currency conflict" : "NEAR"}</div><dl><dt>Work orde… |
| `apps/owner/src/app/contractor/page.tsx:159` | {tab === "My payments" && <section className={s.card}><div className={s.split}><div><h2>My payments</h2><p className={s.muted}>Your submitted invoices and owner-review status. {persistent ? "These records are saved by your organization. Review approval is not a payment; no Paid state is shown without confirmed chain evidence." : "All records here are simulated."}</p></div><button className={`${s.button} ${s.secondary… |
| `apps/owner/src/app/contractor/page.tsx:160` | {tab === "Wallet details" && <div className={s.grid}><section className={s.card}><h2>Wallet details</h2><span className={s.pill}>{snapshot.profile.wallet ? "Owner-approved wallet" : "Initial wallet not approved"}</span><p className={s.meta}>{snapshot.profile.wallet \|\| "No approved wallet yet"}</p><p className={s.muted}>{persistent ? "Verify wallet control with a NEAR testnet message, then wait for explicit owner appr… |
| `apps/owner/src/app/contractor/page.tsx:165` | const signed=await signMeteorMessage(meteorExtension(),{...challenge,nonce:Uint8Array.from(atob(challenge.nonce),c=>c.charCodeAt(0))},120000,controller.signal); |
| `apps/owner/src/app/contractor/page.tsx:168` | },"Wallet control verified. Owner approval is still required.")}>Verify wallet and request approval</button><p className={s.small}>Meteor testnet extension required. This requests an off-chain message only, never a transaction or key installation.</p></div> : <div className={s.actions}><button className={`${s.button} ${s.secondary}`} disabled={busy \|\| !wallet} onClick={() => perform(() => adapter.command({ action: "w… |
| `apps/owner/src/app/contractor-owner.tsx:86` | setNotice(persistent?"Private record saved. No payment or deployment was initiated.":"Simulated change saved. No live transaction was requested."); |
| `apps/owner/src/app/contractor-owner.tsx:94` | return <PortalShell owner persistent={persistent} embedded={embedded}><div className={s.intro}>{embedded ? <h2 className={s.heading}>Contractors and bills</h2> : <h1 className={s.heading}>Contractors and bills</h1>}<p className={s.muted}>Invite a contractor, review their wallet, then approve a fixed work order. {persistent ? "These are your organization’s persistent billing records. Work-order approval here is off-ch… |
| `apps/owner/src/app/contractor-owner.tsx:95` | {loadState === "loading" ? <section className={s.card} aria-busy="true"><p role="status">Loading contractor records…</p><LoadingSkeleton/></section> : !snapshot && loadState !== "start" ? <section className={s.card}><h2>{loadState === "locked" ? "Verify your wallet again" : "Contractor records unavailable"}</h2><p>{persistent ? "Sign in with Meteor on the owner page and select your organization. Records require curre… |
| `apps/owner/src/app/contractor-owner.tsx:100` | {p.pendingWallet && <div className={s.notice}><strong>{p.wallet ? "Wallet change request" : "Initial wallet approval"}</strong><p className={s.meta}>{p.pendingWallet.account}</p><p className={s.small}>{persistent ? "Signed wallet control verified; current on-chain key is rechecked at approval." : "Simulated verification only."} Approval affects future work orders; existing recipients stay fixed.</p><div className={s.… |
| `apps/owner/src/app/contractor-owner.tsx:102` | void run({ action: "create-order", profileId: p.id, ...f }); }}><label>Work order reference<input aria-label={`Work order reference · ${p.name}`} required value={orders[p.id]?.reference \|\| ""} onChange={e => setOrders({ ...orders, [p.id]: { ...orders[p.id], reference: e.target.value } })}/></label><label>Work description<input aria-label={`Work description · ${p.name}`} required value={orders[p.id]?.title \|\| ""} onCh… |
| `apps/owner/src/app/contractor-owner.tsx:103` | </section><div><section className={s.card}><h2>Approved work orders</h2>{snapshot.orders.length === 0 ? <p className={s.empty}>Approve a wallet before creating a work order.</p> : snapshot.orders.map(o => <div key={o.id} className={s.row}><h3>{o.reference} · {o.title}</h3><p>{o.amount} NEAR</p><p className={s.meta}>Immutable recipient: {o.recipient}</p></div>)}</section><section className={s.card}><h2>Invoice review … |
| `apps/owner/src/app/dashboard-navigation.tsx:34` | <nav aria-label="Owner dashboard"><span className="nav-active-indicator" aria-hidden="true"/>{destinations.map((name,i)=><a data-first-control={i===6?"true":undefined} data-group={i>=6?"controls":"work"} key={name} href={`#${encodeURIComponent(name)}`} aria-label={name} title={name} aria-current={view===name?"page":undefined} onClick={e=>{e.preventDefault();onNavigate(name);setOpen(false);}}><span aria-hidden="true" … |
| `apps/owner/src/app/dashboard-navigation.tsx:35` | <div className="sidebar-bottom"><span className="nav-label">{live?"NEAR testnet":"Simulated demo"}</span><p className="nav-label">Approval and payment are separate.</p></div> |
| `apps/owner/src/app/demo/portal-ui.tsx:14` | return <Surface className={`${s.shell} ${owner ? `owner-billing-surface ${embedded ? "embedded-billing" : ""}` : "contractor-surface"}`}><header className={s.top}><a className={s.brand} href={persistent ? "/" : "/?mode=demo"}>Nnetics</a><span className={s.tag}>{persistent ? (owner ? "OWNER RECORDS" : "PRIVATE CONTRACTOR") : owner ? "OWNER DEMO" : "CONTRACTOR DEMO"}</span></header><aside className={s.banner}>{persiste… |
| `apps/owner/src/app/demo/portal-ui.tsx:23` | return <article className={s.invoice}><div className={s.split}><div><span className={s.pill} data-status={bill.status}>{confirmed?"Paid":persistent && bill.status === "Paid" ? "Payment evidence unavailable" : bill.status}</span><h3>{bill.reference}</h3><p className={s.muted}>{bill.description}</p></div><strong>{bill.amount} {persistent && bill.reasons.some(r=>r.startsWith("Currency conflict")) ? "— currency conflict;… |
| `apps/owner/src/app/layout.tsx:7` | "Guarded NEAR testnet payments, with an explicitly labeled demo mode.", |
| `apps/owner/src/app/onboarding.tsx:4` | import { NearOwnerAdapter, LiveApiError, checkMeteorIdentity, api, type PublicConfig } from "../data/near-adapter"; |
| `apps/owner/src/app/onboarding.tsx:5` | import { MockOwnerAdapter } from "../data/mock-adapter"; |
| `apps/owner/src/app/onboarding.tsx:22` | network: "testnet"; |
| `apps/owner/src/app/onboarding.tsx:32` | /* Storage availability must never prevent clearing private state. */ |
| `apps/owner/src/app/onboarding.tsx:64` | const epoch = useRef(0), |
| `apps/owner/src/app/onboarding.tsx:71` | epoch.current++; |
| `apps/owner/src/app/onboarding.tsx:93` | revocation.current = api("logout", {}); |
| `apps/owner/src/app/onboarding.tsx:96` | "Could not revoke the previous session. Check the server connection and click Switch wallet / retry verification again.", |
| `apps/owner/src/app/onboarding.tsx:102` | const mine = epoch.current; |
| `apps/owner/src/app/onboarding.tsx:103` | const fresh=await api<PublicConfig>("config",undefined,signal); |
| `apps/owner/src/app/onboarding.tsx:104` | const identity = await api<IdentityView>("identity",undefined,signal); |
| `apps/owner/src/app/onboarding.tsx:105` | if (mine !== epoch.current) return; |
| `apps/owner/src/app/onboarding.tsx:114` | if(autoOpen && fresh.configured && identity.organizations.some(o=>o.id===fresh.organization && o.status==='ready')) |
| `apps/owner/src/app/onboarding.tsx:131` | epoch.current++;pending.current?.abort();pending.current=null;setBusy(false); |
| `apps/owner/src/app/onboarding.tsx:132` | setActive(null);setSelectedDraft(null);setWho({accountId:cachedAccount,network:'testnet',organizations:[],notice:''}); |
| `apps/owner/src/app/onboarding.tsx:145` | void api<PublicConfig>("config") |
| `apps/owner/src/app/onboarding.tsx:149` | `Cannot load testnet login configuration: ${e.message}. Check the server and retry.`, |
| `apps/owner/src/app/onboarding.tsx:162` | revocation.current = api("logout", {}); |
| `apps/owner/src/app/onboarding.tsx:165` | "Previous wallet verification could not be revoked. Check the server and retry verification.", |
| `apps/owner/src/app/onboarding.tsx:187` | if(stopped\|\|running)return;running=true;clearTimeout(timer);const mine=epoch.current; |
| `apps/owner/src/app/onboarding.tsx:188` | try{const next=await api<{accountId:string;idleExpires:number;absoluteExpires:number;serverTime?:number}>('session');if(mine!==epoch.current)return; |
| `apps/owner/src/app/onboarding.tsx:191` | }catch(e){if(mine===epoch.current)failure(e);} |
| `apps/owner/src/app/onboarding.tsx:192` | finally{running=false;lastCheck=Date.now();if(!stopped&&mine===epoch.current)timer=setTimeout(refresh,30000);} |
| `apps/owner/src/app/onboarding.tsx:199` | renewing.current=true;const mine=epoch.current; |
| `apps/owner/src/app/onboarding.tsx:200` | void api<{accountId:string;idleExpires:number;absoluteExpires:number;serverTime?:number}>('session/renew',{active:true}).then(next=>{ |
| `apps/owner/src/app/onboarding.tsx:201` | if(mine!==epoch.current)return; |
| `apps/owner/src/app/onboarding.tsx:204` | }).catch(e=>{if(mine===epoch.current)failure(e);}).finally(()=>{renewing.current=false;}); |
| `apps/owner/src/app/onboarding.tsx:213` | const mine=epoch.current,timer=setTimeout(()=>{if(mine===epoch.current)lock('Your five-hour session has expired. Verify your wallet again; no payment is requested.');},Math.max(0,duration)); |
| `apps/owner/src/app/onboarding.tsx:217` | if(busy)return;const mine=epoch.current,controller=new AbortController();pending.current=controller;setBusy(true);setWalletNotice(''); |
| `apps/owner/src/app/onboarding.tsx:220` | if(mine!==epoch.current)return; |
| `apps/owner/src/app/onboarding.tsx:225` | }catch(e){if(mine===epoch.current)setWalletNotice('The wallet check was inconclusive. Your session remains tied to '+who?.accountId+'. '+(e as Error).message);} |
| `apps/owner/src/app/onboarding.tsx:226` | finally{if(mine===epoch.current){pending.current=null;setBusy(false);}} |
| `apps/owner/src/app/onboarding.tsx:232` | setWho({accountId,network:'testnet',organizations:[],notice:''}); |
| `apps/owner/src/app/onboarding.tsx:246` | const mine = epoch.current, |
| `apps/owner/src/app/onboarding.tsx:256` | await api("logout", {}); |
| `apps/owner/src/app/onboarding.tsx:257` | if (mine !== epoch.current) return; |
| `apps/owner/src/app/onboarding.tsx:262` | message=>{if(mine===epoch.current)setLoginStage(message);}, |
| `apps/owner/src/app/onboarding.tsx:264` | if (mine !== epoch.current) return; |
| `apps/owner/src/app/onboarding.tsx:266` | if(mine!==epoch.current)return; |
| `apps/owner/src/app/onboarding.tsx:270` | if (mine === epoch.current) { |
| `apps/owner/src/app/onboarding.tsx:280` | if (mine === epoch.current) { |
| `apps/owner/src/app/onboarding.tsx:291` | <span>Signed in as {who.accountId} · NEAR testnet</span> |
| `apps/owner/src/app/onboarding.tsx:325` | <p>Live testnet identity. No simulated records or balances.</p> |
| `apps/owner/src/app/onboarding.tsx:341` | on-chain. |
| `apps/owner/src/app/onboarding.tsx:353` | const mine = epoch.current; |
| `apps/owner/src/app/onboarding.tsx:357` | const fresh=await api<PublicConfig>("config"); |
| `apps/owner/src/app/onboarding.tsx:358` | if(!fresh.configured\|\|fresh.organization!==org.id)throw Error("Workspace configuration changed. Reload login configuration before opening this vault."); |
| `apps/owner/src/app/onboarding.tsx:364` | if (mine === epoch.current) setActive(adapter); |
| `apps/owner/src/app/onboarding.tsx:366` | await api( |
| `apps/owner/src/app/onboarding.tsx:370` | if (mine === epoch.current) setSelectedDraft(org); |
| `apps/owner/src/app/onboarding.tsx:373` | if (mine === epoch.current) |
| `apps/owner/src/app/onboarding.tsx:393` | const mine = epoch.current; |
| `apps/owner/src/app/onboarding.tsx:397` | const created = await api<Workspace>("organizations", { |
| `apps/owner/src/app/onboarding.tsx:400` | if (mine !== epoch.current) return; |
| `apps/owner/src/app/onboarding.tsx:405` | if (mine === epoch.current) setError((e as Error).message); |
| `apps/owner/src/app/onboarding.tsx:407` | if (mine === epoch.current) setBusy(false); |
| `apps/owner/src/app/onboarding.tsx:436` | <a className="entry-brand" href="/">Nnetics<span>.</span></a><span className="entry-network">NEAR testnet</span> |
| `apps/owner/src/app/onboarding.tsx:437` | <h1>Nnetics · NEAR testnet</h1> |
| `apps/owner/src/app/onboarding.tsx:439` | Verify any supported, activated testnet wallet. You do not need an |
| `apps/owner/src/app/onboarding.tsx:444` | Meteor extension only. Select NEAR testnet and the activated named |
| `apps/owner/src/app/onboarding.tsx:445` | .testnet account or 64-character implicit account shown in your wallet. |
| `apps/owner/src/app/onboarding.tsx:466` | ? "Meteor is available. Connect opens an off-chain identity message for the account selected in your wallet. No transaction, funds or keys." |
| `apps/owner/src/app/onboarding.tsx:467` | : "Connect opens an off-chain sign-in message in Meteor. No transaction, funds or access keys are requested."} |
| `apps/owner/src/app/onboarding.tsx:470` | <summary>Use a specific testnet account (optional)</summary> |
| `apps/owner/src/app/onboarding.tsx:472` | Testnet wallet account ID |
| `apps/owner/src/app/onboarding.tsx:486` | <p>Enter the activated testnet account ID shown in Meteor.</p> |
| `apps/owner/src/app/onboarding.tsx:518` | Open explicitly simulated demo |
| `apps/owner/src/app/page.tsx:5` | import { DEMO_AGENT } from "../data/mock-adapter"; |
| `apps/owner/src/app/page.tsx:6` | import { NearOwnerAdapter, api } from "../data/near-adapter"; |
| `apps/owner/src/app/page.tsx:12` | import { TestnetControls } from "./testnet-controls"; |
| `apps/owner/src/app/page.tsx:105` | {formatNear(value)} <span>NEAR</span> |
| `apps/owner/src/app/page.tsx:143` | {live ? "NEAR TESTNET" : "LOCAL SIMULATION"} |
| `apps/owner/src/app/page.tsx:176` | : "Save simulated change"} |
| `apps/owner/src/app/page.tsx:198` | adapter.mode === "simulation" ? "INV-1042" : "", |
| `apps/owner/src/app/page.tsx:218` | e instanceof Error ? e.message : "Unable to load the simulation.", |
| `apps/owner/src/app/page.tsx:243` | e instanceof Error ? e.message : "The simulated request failed.", |
| `apps/owner/src/app/page.tsx:256` | window.location.hash = encodeURIComponent(next); |
| `apps/owner/src/app/page.tsx:261` | const restore = () => { try {const name = decodeURIComponent(location.hash.slice(1)); if (views.includes(name as View)) setView(name as View);} catch {/* Invalid route hints never affect account authority. */} }; |
| `apps/owner/src/app/page.tsx:272` | {adapter.mode === "simulation" |
| `apps/owner/src/app/page.tsx:273` | ? "Loading clearly labeled synthetic data…" |
| `apps/owner/src/app/page.tsx:274` | : "Loading verified NEAR testnet records…"} |
| `apps/owner/src/app/page.tsx:299` | Vault: "Payment funds and spending authority are separate. Review both before signing.", |
| `apps/owner/src/app/page.tsx:300` | Access: "Manage who can view this organization. Owner authority stays on chain.", |
| `apps/owner/src/app/page.tsx:302` | Overview: "Approved work. Bounded authority. A clear record.", |
| `apps/owner/src/app/page.tsx:346` | asset: "NEAR", |
| `apps/owner/src/app/page.tsx:351` | const response=await fetch("/api/demo/owner-invoices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(draft)}); |
| `apps/owner/src/app/page.tsx:361` | ? "Request submitted. Refresh finalized state to confirm owner actions; eligible invoices enter the durable worker queue." |
| `apps/owner/src/app/page.tsx:362` | : "Local simulation updated. No transaction was submitted.", |
| `apps/owner/src/app/page.tsx:406` | ? "Ready for worker" |
| `apps/owner/src/app/page.tsx:459` | href={`https://testnet.nearblocks.io/txns/${encodeURIComponent(p.reference)}`} |
| `apps/owner/src/app/page.tsx:469` | {live ? "Testnet transaction" : "Simulated receipt"} |
| `apps/owner/src/app/page.tsx:487` | {!live && <div className="simulation-banner"> |
| `apps/owner/src/app/page.tsx:488` | <span className="simulation-tag"> |
| `apps/owner/src/app/page.tsx:489` | {live ? "TESTNET" : "SIMULATION"} |
| `apps/owner/src/app/page.tsx:493` | ? "Live testnet data. Owner actions require wallet signatures; queued invoices may be paid by the authorized worker." |
| `apps/owner/src/app/page.tsx:494` | : "Synthetic data. No wallet connected. No tokens moved. Saved invoices persist; other demo changes reset on reload."} |
| `apps/owner/src/app/page.tsx:507` | live ? "Refresh finalized state" : "Refresh mock state" |
| `apps/owner/src/app/page.tsx:513` | live ? "Finalized state refreshed." : "Mock state refreshed.", |
| `apps/owner/src/app/page.tsx:566` | {view === "Contractors" && (live ? <PersistentContractorOwner embedded organization={s.access?.organization \|\| live.config.organization}/> : <p className="notice">Explore the <a href="/demo/contractors">explicitly simulated contractor workspace</a>.</p>)} |
| `apps/owner/src/app/page.tsx:568` | {!live && ["Vault", "Access", "Recovery"].includes(view) && <p className="notice">These controls require a verified testnet organization. No live account is attached to this simulation.</p>} |
| `apps/owner/src/app/page.tsx:574` | aria-label={live ? "Testnet error" : "Simulation error"} |
| `apps/owner/src/app/page.tsx:599` | {(v.paused \|\| !v.agent) && <div className="pause-banner"><Icon name="shield"/><div><strong>{v.paused ? "Payments paused." : "Worker authority revoked."}</strong> {!v.agent && "Worker access revoked. "}{pending.length ? `${pending.length} transfer(s) awaiting confirmation; funds remain reserved.` : "No unresolved transfers."}</div></div>} |
| `apps/owner/src/app/page.tsx:606` | ? "Finalized vault accounting" |
| `apps/owner/src/app/page.tsx:607` | : "Simulated vault accounting" |
| `apps/owner/src/app/page.tsx:612` | "Uncommitted authority", |
| `apps/owner/src/app/page.tsx:614` | "Within your cumulative authority", |
| `apps/owner/src/app/page.tsx:630` | ? "Funded less spent and reserved · storage excluded" |
| `apps/owner/src/app/page.tsx:631` | : "Synthetic deposits · storage excluded", |
| `apps/owner/src/app/page.tsx:668` | {live ? "the worker" : "a local simulation"}. Review |
| `apps/owner/src/app/page.tsx:749` | : "Open within approved authority"} |
| `apps/owner/src/app/page.tsx:757` | ? "Allow new testnet payments" |
| `apps/owner/src/app/page.tsx:758` | : "Allow new simulated payments" |
| `apps/owner/src/app/page.tsx:775` | <section className="panel worker-panel"> |
| `apps/owner/src/app/page.tsx:776` | <div className="worker-icon"> |
| `apps/owner/src/app/page.tsx:779` | <h3>Worker permission</h3> |
| `apps/owner/src/app/page.tsx:781` | {v.agent?.account_id ?? "No authorized worker"} |
| `apps/owner/src/app/page.tsx:807` | ? "Revoke worker authority" |
| `apps/owner/src/app/page.tsx:809` | ? "Authorize configured testnet worker" |
| `apps/owner/src/app/page.tsx:810` | : "Authorize synthetic worker"} |
| `apps/owner/src/app/page.tsx:910` | <th>Authority</th> |
| `apps/owner/src/app/page.tsx:930` | {!o.enabled && <small>Authority revoked</small>} |
| `apps/owner/src/app/page.tsx:987` | ? "Ready for worker" |
| `apps/owner/src/app/page.tsx:998` | : "Requested payment · synthetic invoice"} |
| `apps/owner/src/app/page.tsx:1041` | ? "worker eligibility review" |
| `apps/owner/src/app/page.tsx:1042` | : "this local simulation"} |
| `apps/owner/src/app/page.tsx:1090` | ? "Invoice queued. The worker reconciles finalized results before any new submission." |
| `apps/owner/src/app/page.tsx:1091` | : "Simulation finished. Inspect its outcome in payment history.", |
| `apps/owner/src/app/page.tsx:1098` | : "Simulation in flight…" |
| `apps/owner/src/app/page.tsx:1107` | ? "Review acknowledgement grants no payment authority. Only finalized contract approvals authorize worker payments." |
| `apps/owner/src/app/page.tsx:1108` | : "Review acknowledgement grants no payment authority. No real transaction or signature is created."} |
| `apps/owner/src/app/page.tsx:1127` | ? "Finalized contract attempts" |
| `apps/owner/src/app/page.tsx:1128` | : "Simulated receipts"} |
| `apps/owner/src/app/page.tsx:1157` | aria-label="Local simulation controls" |
| `apps/owner/src/app/page.tsx:1160` | <strong>Local simulation controls</strong> |
| `apps/owner/src/app/page.tsx:1163` | deployment are unavailable. |
| `apps/owner/src/app/page.tsx:1169` | aria-label="Next simulated transfer outcome" |
| `apps/owner/src/app/page.tsx:1196` | setNotice("Synthetic workspace reset."); |
| `apps/owner/src/app/page.tsx:1208` | Testnet deployment requires explicit authorization |
| `apps/owner/src/app/page.tsx:1252` | defaultValue="writer-demo.testnet" |
| `apps/owner/src/app/page.tsx:1288` | Exact amount in NEAR |
| `apps/owner/src/app/page.tsx:1317` | <p>Currency: NEAR · Testnet</p> |
| `apps/owner/src/app/page.tsx:1329` | Requested amount in NEAR |
| `apps/owner/src/app/page.tsx:1354` | ? "Optional source text; it cannot change payment authority." |
| `apps/owner/src/app/page.tsx:1355` | : "Paste synthetic invoice text only." |
| `apps/owner/src/app/testnet-controls.tsx:3` | import {NearOwnerAdapter, api} from "../data/near-adapter"; |
| `apps/owner/src/app/testnet-controls.tsx:21` | return <section className={`task-surface task-${section}`} aria-label="Testnet owner controls" aria-busy={working}> |
| `apps/owner/src/app/testnet-controls.tsx:23` | {(section==="vault"\|\|section==="recovery")&&!adapter.config.transactionsEnabled&&<p className="notice">Testnet transactions are disabled. Review and explicit transaction authorization are required before wallet requests.</p>} |
| `apps/owner/src/app/testnet-controls.tsx:25` | <dl className="vault-ledger">{[["Available payment funds",(BigInt(v.funded)-committed).toString()],["Reserved",v.reserved],["Uncommitted authority",(BigInt(v.budget)-committed).toString()],["Confirmed spend",v.spent]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{formatNear(value)} <small>NEAR</small></dd></div>)}</dl> |
| `apps/owner/src/app/testnet-controls.tsx:26` | <div className="task-columns"><section className="task-form"><h2>Funding and limits</h2><p>Add funds or change a spending ceiling. Storage funding does not become payment funds.</p> |
| `apps/owner/src/app/testnet-controls.tsx:27` | <fieldset disabled={readOnly\|\|working\|\|!adapter.config.transactionsEnabled}><label>Action<select value={target} onChange={e=>setTarget(e.target.value as Action)}><option value="deposit">Fund payment ledger</option><option value="fund_storage">Fund storage/operating reserve</option><option value="set_budget">Set total budget</option><option value="set_payment_cap">Set payment cap</option></select></label> |
| `apps/owner/src/app/testnet-controls.tsx:28` | <label>Amount (NEAR)<input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" aria-invalid={!validAmount}/></label> |
| `apps/owner/src/app/testnet-controls.tsx:29` | {!validAmount&&<p className="field-error">Enter a valid NEAR amount. Use an exact positive amount.</p>} |
| `apps/owner/src/app/testnet-controls.tsx:30` | <div className="transaction-review"><strong>{current===undefined?"Add funds":"Replace spending limit"}</strong>{current!==undefined&&<p>Current: {formatNear(current)} NEAR → Proposed: {amount \|\| "—"} NEAR</p>}<p>Network: NEAR testnet · Receiver: <span className="mono">{adapter.config.contract}</span></p><p>{current===undefined?`Attached funding: ${amount \|\| "—"} NEAR plus transaction fees.`:"This sets the total ceili… |
| `apps/owner/src/app/testnet-controls.tsx:31` | <button className="button primary" disabled={!validAmount} onClick={()=>void request("fund",()=>target==="deposit"\|\|target==="fund_storage"?adapter.fund(target,amountFromNear(amount)):adapter.limits(target,amountFromNear(amount)),"Wallet request submitted; refresh finalized state to confirm.")}>{working?"Waiting for wallet…":"Review owner transaction in wallet"}</button></fieldset></section> |
| `apps/owner/src/app/testnet-controls.tsx:32` | <aside className="task-context"><h2>Current authority</h2><dl><dt>Cumulative budget</dt><dd>{formatNear(v.budget)} NEAR</dd><dt>Per-payment cap</dt><dd>{formatNear(v.payment_cap)} NEAR</dd><dt>New payments</dt><dd>{v.paused?"Paused":"Not paused"}</dd><dt>Worker</dt><dd>{v.agent?"Authorized":"Revoked"}</dd></dl><p>Funds are money available for transfers. Authority is permission to spend within the approved work order … |
| `apps/owner/src/app/testnet-controls.tsx:34` | {section==="access"&&<div className="task-columns"><section className="task-form"><h2>Viewer access</h2><p>Manage read-only access for a known account. This never grants vault ownership or payment authority.</p><fieldset disabled={readOnly\|\|working}><label>Viewer account<input value={viewer} onChange={e=>setViewer(e.target.value)} maxLength={64} autoCapitalize="none" spellCheck={false}/></label>{viewer&&!validViewer&… |
| `apps/owner/src/app/testnet-controls.tsx:35` | {section==="recovery"&&<><section className="task-form"><h2>Recorded transfer attempts</h2><button className="text-button" disabled={working} onClick={()=>void request("refresh",async()=>{},"Recorded state refreshed.")}>Refresh recorded state · read-only</button><p>Chain outcomes and worker jobs are separate records. An empty worker queue does not resolve an unknown transfer.</p>{snapshot.payments.length===0?<p class… |
| `apps/owner/src/app/testnet-controls.tsx:36` | <fieldset disabled={readOnly\|\|working\|\|!adapter.config.transactionsEnabled}><label>Recorded attempt ID<input value={attempt} onChange={e=>setAttempt(e.target.value)} inputMode="numeric"/></label><p className="field-help">Use the recorded attempt ID from payment details. Reconciliation requests a wallet transaction to update accounting from recorded evidence. It cannot authorize another vendor payment. Review the rece… |
| `apps/owner/src/app/testnet-controls.tsx:37` | <section className="task-form"><h2>Worker jobs</h2>{snapshot.queue?.length?<ul className="job-list">{snapshot.queue.map(j=><li key={j.id}><strong>{j.id}</strong><p>{j.state}: {j.reason}</p>{j.hash&&<a target="_blank" rel="noreferrer" href={`https://testnet.nearblocks.io/txns/${encodeURIComponent(j.hash)}`}>Transaction</a>}</li>)}</ul>:<p className="empty-state">No worker jobs in this organization queue. Check transfe… |
| `apps/owner/src/app/testnet-controls.tsx:38` | {section==="references"&&<section className="task-form"><h2>Import existing references</h2><p>Load an existing on-chain reference. Importing discovers a record; it does not approve work or change its recipient.</p><fieldset disabled={readOnly\|\|working}><label>Reference type<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="order">Work order</option><option value="vendor">Vendor</… |
| `apps/owner/src/app/testnet-controls.tsx:40` | <details className="verification-details"><summary>Verification details</summary><dl><dt>Vault</dt><dd>{adapter.config.contract}</dd><dt>Owner</dt><dd>{v.owner}</dd><dt>Organization</dt><dd>{snapshot.access?.organization}</dd><dt>Finalized block</dt><dd>Finalized block: {snapshot.blockHash}</dd></dl><p>Unknown outcomes remain reserved. Deployment and historical-proof repair retain their existing review and authorizat… |
| `apps/owner/src/app/vault-onboarding.tsx:4` | import { api } from "../data/near-adapter"; |
| `apps/owner/src/app/vault-onboarding.tsx:11` | configured: boolean; |
| `apps/owner/src/app/vault-onboarding.tsx:21` | hash?: string; |
| `apps/owner/src/app/vault-onboarding.tsx:45` | void api<Progress>( |
| `apps/owner/src/app/vault-onboarding.tsx:58` | async function run(action: "prepare" \| "reconcile" \| "dispatch" \| "retry") { |
| `apps/owner/src/app/vault-onboarding.tsx:62` | const p = await api<Progress>("provisioning/" + action, { |
| `apps/owner/src/app/vault-onboarding.tsx:64` | digest: progress?.planDigest, |
| `apps/owner/src/app/vault-onboarding.tsx:65` | ...(action==="reconcile"&&walletHash.trim()?{transactionHash:walletHash.trim()}:{}), |
| `apps/owner/src/app/vault-onboarding.tsx:71` | // Losing focus clears authenticated records. The durable outbox survives |
| `apps/owner/src/app/vault-onboarding.tsx:75` | await api<Progress>("provisioning/reconcile", { organization }), |
| `apps/owner/src/app/vault-onboarding.tsx:91` | NEAR testnet only. The owner is your verified wallet. No organization or |
| `apps/owner/src/app/vault-onboarding.tsx:92` | vault authority is inferred from connecting Meteor. |
| `apps/owner/src/app/vault-onboarding.tsx:96` | "Vault storage/operating funding: 5 testnet NEAR, plus transaction fees. No payment ledger funding."} |
| `apps/owner/src/app/vault-onboarding.tsx:100` | "Independent contract review and historical-proof bootstrap remain unresolved. Payments stay disabled."} |
| `apps/owner/src/app/vault-onboarding.tsx:102` | {!progress?.configured && ( |
| `apps/owner/src/app/vault-onboarding.tsx:104` | Factory deployment and pinned artifact configuration require review |
| `apps/owner/src/app/vault-onboarding.tsx:113` | <dd>testnet</dd> |
| `apps/owner/src/app/vault-onboarding.tsx:125` | <dd>5 testnet NEAR</dd> |
| `apps/owner/src/app/vault-onboarding.tsx:127` | <dd>250 Tgas (fees additional)</dd> |
| `apps/owner/src/app/vault-onboarding.tsx:131` | <details className="verification-details"><summary>Artifact verification details</summary><dl>            <dt>Vault code hash</dt> |
| `apps/owner/src/app/vault-onboarding.tsx:133` | <dt>Factory code hash</dt> |
| `apps/owner/src/app/vault-onboarding.tsx:140` | and starts paused, without a worker or funded payment ledger. These |
| `apps/owner/src/app/vault-onboarding.tsx:143` | {progress.hash && ( |
| `apps/owner/src/app/vault-onboarding.tsx:147` | href={`https://testnet.nearblocks.io/txns/${progress.hash}`} |
| `apps/owner/src/app/vault-onboarding.tsx:151` | {progress.hash} |
| `apps/owner/src/app/vault-onboarding.tsx:157` | <p>Verified at finalized block {progress.finalizedBlock}</p> |
| `apps/owner/src/app/vault-onboarding.tsx:188` | {progress.hash |
| `apps/owner/src/app/vault-onboarding.tsx:189` | ? "Reconcile and retry identical transaction" |
| `apps/owner/src/app/vault-onboarding.tsx:194` | Deployment signing is disabled pending review and specific |
| `apps/owner/src/app/vault-onboarding.tsx:195` | testnet transaction authorization. |
| `apps/owner/src/app/vault-onboarding.tsx:200` | {progress?.hash && ( |
| `apps/owner/src/app/vault-onboarding.tsx:202` | {progress.state==="awaiting_chain"&&<label>Wallet transaction hash (only if different)<input value={walletHash} onChange={e=>setWalletHash(e.target.value)} /><span>Read-only verification of the same approved signer, key, nonce and call. Does not send or retry a transaction.</span></label>} |
| `apps/owner/src/app/vault-onboarding.tsx:206` | onClick={() => void run("reconcile")} |
| `apps/owner/src/app/vault-onboarding.tsx:208` | Resume / reconcile provisioning |

## Appendix C — raw-message / alert presentation paths

39 candidate paths. Dynamic `{error}` text can carry raw API messages even where this line does not directly reference `.message`. Map at the presentation boundary; do not rewrite contract/policy failure codes.

| File:line | Source excerpt |
|---|---|
| `apps/owner/src/app/contractor/page.tsx:43` | setError(e instanceof Error ? e.message : "Private access unavailable."); |
| `apps/owner/src/app/contractor/page.tsx:61` | setError(e instanceof Error ? e.message : "Invalid private link."); |
| `apps/owner/src/app/contractor/page.tsx:82` | setError(e instanceof Error ? e.message : "Demo action failed."); |
| `apps/owner/src/app/contractor/page.tsx:115` | setError(e instanceof Error ? e.message : "Clarify the bill details."); |
| `apps/owner/src/app/contractor/page.tsx:139` | return <PortalShell persistent={persistent}>{loading ? <section aria-busy="true"><p>Opening your private workspace…</p><LoadingSkeleton/></section> : !snapshot ? <section className={s.card}><h1 className={s.heading}>Private access unavailable</h1><p role="alert">{error \|\| "Open the private invitation link the owner created for you."}</p><p className={s.muted}>Ask the owner for a new link if this one was revoked or ex… |
| `apps/owner/src/app/contractor/page.tsx:142` | {error && <p role="alert" className={`${s.notice} ${s.error}`}>{error}</p>}{notice && <p role="status" className={s.notice}>{notice}</p>} |
| `apps/owner/src/app/contractor-owner.tsx:33` | const message = e instanceof Error ? e.message : "Owner access unavailable."; |
| `apps/owner/src/app/contractor-owner.tsx:55` | if (mine === generation.current) setError(e instanceof Error ? e.message : "Could not start the demo. Retry."); |
| `apps/owner/src/app/contractor-owner.tsx:89` | if(mine===generation.current) setError(e instanceof Error ? e.message : "Request failed. Retry."); |
| `apps/owner/src/app/contractor-owner.tsx:94` | return <PortalShell owner persistent={persistent} embedded={embedded}><div className={s.intro}>{embedded ? <h2 className={s.heading}>Contractors and bills</h2> : <h1 className={s.heading}>Contractors and bills</h1>}<p className={s.muted}>Invite a contractor, review their wallet, then approve a fixed work order. {persistent ? "These are your organization’s persistent billing records. Work-order approval here is off-ch… |
| `apps/owner/src/app/onboarding.tsx:138` | if(e instanceof LiveApiError&&e.retryable)setVerificationIssue(e.message); |
| `apps/owner/src/app/onboarding.tsx:139` | else lock((e as Error).message,false); |
| `apps/owner/src/app/onboarding.tsx:149` | `Cannot load testnet login configuration: ${e.message}. Check the server and retry.`, |
| `apps/owner/src/app/onboarding.tsx:175` | else setError(e instanceof Error ? e.message : "Your session could not be restored. Sign in again."); |
| `apps/owner/src/app/onboarding.tsx:183` | if(e instanceof LiveApiError && e.retryable)setVerificationIssue(e.message+' Private records and actions are blocked until silent verification succeeds; your session is retained.'); |
| `apps/owner/src/app/onboarding.tsx:184` | else lock(e instanceof Error?e.message:'Session verification failed. Sign in again.'); |
| `apps/owner/src/app/onboarding.tsx:225` | }catch(e){if(mine===epoch.current)setWalletNotice('The wallet check was inconclusive. Your session remains tied to '+who?.accountId+'. '+(e as Error).message);} |
| `apps/owner/src/app/onboarding.tsx:241` | setError((e as Error).message); |
| `apps/owner/src/app/onboarding.tsx:272` | if(signedIn)setVerificationIssue(`Your message was accepted. Workspace loading could not finish: ${(e as Error).message}. Retry verification without another wallet signature.`); |
| `apps/owner/src/app/onboarding.tsx:275` | ? (signedIn?"Your message was accepted. Workspace loading could not finish; retry the saved session. ":"")+e.message + (e.message.includes("Meteor extension")?" Open this site in the browser profile containing Meteor, enable its site access, unlock it and retry.":"") |
| `apps/owner/src/app/onboarding.tsx:316` | <p role="alert">{verificationIssue}</p> |
| `apps/owner/src/app/onboarding.tsx:318` | if(e instanceof LiveApiError && e.retryable) setVerificationIssue(e.message); |
| `apps/owner/src/app/onboarding.tsx:319` | else lock((e as Error).message); |
| `apps/owner/src/app/onboarding.tsx:343` | {error && <p role="alert">{error}</p>} |
| `apps/owner/src/app/onboarding.tsx:374` | setError((e as Error).message); |
| `apps/owner/src/app/onboarding.tsx:405` | if (mine === epoch.current) setError((e as Error).message); |
| `apps/owner/src/app/onboarding.tsx:448` | {error && <p role="alert">{error}</p>} |
| `apps/owner/src/app/onboarding.tsx:452` | setError((e as Error).message); |
| `apps/owner/src/app/page.tsx:18` | reasonText, |
| `apps/owner/src/app/page.tsx:163` | <p role="alert" className="error"> |
| `apps/owner/src/app/page.tsx:218` | e instanceof Error ? e.message : "Unable to load the simulation.", |
| `apps/owner/src/app/page.tsx:243` | e instanceof Error ? e.message : "The simulated request failed.", |
| `apps/owner/src/app/page.tsx:279` | <p role="alert">{error}</p> |
| `apps/owner/src/app/page.tsx:573` | role="alert" |
| `apps/owner/src/app/page.tsx:1033` | <li key={code}>{reasonText[code]}</li> |
| `apps/owner/src/app/testnet-controls.tsx:39` | {error&&<p role="alert">{error}</p>}{working&&<p role="status">Checking the requested action…</p>} |
| `apps/owner/src/app/vault-onboarding.tsx:52` | if (current) setError(e.message); |
| `apps/owner/src/app/vault-onboarding.tsx:79` | setError((e as Error).message); |
| `apps/owner/src/app/vault-onboarding.tsx:108` | {error && <p role="alert">{error}</p>} |

## Appendix D — action, disclosure, dialog and feedback index

AST inventory of 125 UI elements. Dynamic expressions are retained as source excerpts; shared components can represent several concrete screens. This index supports the overlapping-action groups above and exposes empty/error/status branches without executing mutations.

| File:line | Element | Source content (shortened) |
|---|---|---|
| `apps/owner/src/app/contractor/page.tsx:139` | p | {error \|\| "Open the private invitation link the owner created for you."} |
| `apps/owner/src/app/contractor/page.tsx:141` | button | {t} |
| `apps/owner/src/app/contractor/page.tsx:142` | p | {error} |
| `apps/owner/src/app/contractor/page.tsx:142` | p | {notice} |
| `apps/owner/src/app/contractor/page.tsx:144` | button | Format labeled details |
| `apps/owner/src/app/contractor/page.tsx:146` | details | <summary>Attachments and extraction (optional)</summary> <div className={s.file}><label htmlFor="invoice-upload">Attach an invoice</label><input id="invoice-upload" type="file" accept=".txt,.pdf,.png,.jpg,.jpeg" disabled={busy} on |
| `apps/owner/src/app/contractor/page.tsx:149` | button | Extract with AI · review required |
| `apps/owner/src/app/contractor/page.tsx:149` | button | Extract locally · deterministic |
| `apps/owner/src/app/contractor/page.tsx:158` | div | <p>{blockingMissing.length ? "Before you submit" : "Ready for owner review"}</p> {blockingMissing.length ? blockingMissing.join(" · ") : "Submission requests review; it does not authorize payment."} |
| `apps/owner/src/app/contractor/page.tsx:158` | button | {edit ? "Send clarification" : persistent && currencyConflict(body) ? "Submit for clarification" : "Submit bill for review"} |
| `apps/owner/src/app/contractor/page.tsx:158` | button | Cancel clarification |
| `apps/owner/src/app/contractor/page.tsx:159` | button | Refresh status |
| `apps/owner/src/app/contractor/page.tsx:159` | p | No submitted invoices yet. |
| `apps/owner/src/app/contractor/page.tsx:159` | button | Answer clarification |
| `apps/owner/src/app/contractor/page.tsx:160` | div | <strong>Awaiting owner approval</strong> <p className={s.meta}>{snapshot.profile.pendingWallet.account}</p> <p>The current approved wallet remains unchanged until the owner accepts this request.</p> |
| `apps/owner/src/app/contractor/page.tsx:160` | button | Verify wallet and request approval |
| `apps/owner/src/app/contractor/page.tsx:168` | button | Prepare simulated verification |
| `apps/owner/src/app/contractor/page.tsx:168` | button | Simulate proof and request approval |
| `apps/owner/src/app/contractor-owner.tsx:94` | p | {error} |
| `apps/owner/src/app/contractor-owner.tsx:94` | p | {notice} |
| `apps/owner/src/app/contractor-owner.tsx:95` | p | Loading contractor records… |
| `apps/owner/src/app/contractor-owner.tsx:95` | button | Retry owner access |
| `apps/owner/src/app/contractor-owner.tsx:95` | button | {busy ? "Starting demo…" : "Start contractor demo"} |
| `apps/owner/src/app/contractor-owner.tsx:96` | button | Create contractor profile |
| `apps/owner/src/app/contractor-owner.tsx:96` | button | Refresh owner records |
| `apps/owner/src/app/contractor-owner.tsx:97` | div | <label htmlFor="private-link">Private invitation link · shown once</label> <input id="private-link" readOnly value={invite}/> <p className={s.small}>Anyone with this link can access this contractor’s {persistent ? "private records |
| `apps/owner/src/app/contractor-owner.tsx:98` | p | No contractors yet. Create your first profile to invite them. |
| `apps/owner/src/app/contractor-owner.tsx:99` | button | {p.linkActive ? "Replace private link" : "Create private link"} |
| `apps/owner/src/app/contractor-owner.tsx:99` | button | Revoke access |
| `apps/owner/src/app/contractor-owner.tsx:100` | div | <strong>{p.wallet ? "Wallet change request" : "Initial wallet approval"}</strong> <p className={s.meta}>{p.pendingWallet.account}</p> <p className={s.small}>{persistent ? "Signed wallet control verified; current on-chain key is re |
| `apps/owner/src/app/contractor-owner.tsx:100` | button | Approve wallet |
| `apps/owner/src/app/contractor-owner.tsx:100` | button | Reject wallet |
| `apps/owner/src/app/contractor-owner.tsx:102` | button | Approve work order |
| `apps/owner/src/app/contractor-owner.tsx:103` | p | Approve a wallet before creating a work order. |
| `apps/owner/src/app/contractor-owner.tsx:103` | p | Contractor submissions will appear here. |
| `apps/owner/src/app/contractor-owner.tsx:103` | button | Link reviewed invoice · {b.reference} |
| `apps/owner/src/app/contractor-owner.tsx:103` | button | Start review |
| `apps/owner/src/app/contractor-owner.tsx:103` | button | Approve bill |
| `apps/owner/src/app/contractor-owner.tsx:103` | button | Request clarification |
| `apps/owner/src/app/contractor-owner.tsx:103` | button | Reject bill |
| `apps/owner/src/app/dashboard-navigation.tsx:29` | button | <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 6h16 M4 12h16 M4 18h16"/></svg> |
| `apps/owner/src/app/dashboard-navigation.tsx:31` | button | Close navigation |
| `apps/owner/src/app/demo/portal-ui.tsx:23` | p | Owner: {bill.ownerNote} |
| `apps/owner/src/app/demo/portal-ui.tsx:23` | details | <summary>Original billing text</summary> <pre className={s.inline}>{bill.originalText ?? bill.text}</pre> {bill.originalText && bill.originalText !== bill.text && <><p>Latest clarification</p><pre className={s.inline}>{bill.text}< |
| `apps/owner/src/app/loading-skeleton.tsx:2` | div | <span className="skeleton-line short"/> <span className="skeleton-line"/> <div className="skeleton-grid">{[0,1,2].map(i=><span className="skeleton-block" key={i}/>)}</div> <span className="skeleton-line"/> <span className="skeleto |
| `apps/owner/src/app/onboarding.tsx:292` | details | <summary>Account & organizations</summary> <div className="account-menu-actions"> <button className="button secondary" onClick={() => lock()}> Switch wallet </button> <button className="button secondary" onClick={()=>lock("You sig |
| `apps/owner/src/app/onboarding.tsx:293` | button | Switch wallet |
| `apps/owner/src/app/onboarding.tsx:296` | button | Sign out |
| `apps/owner/src/app/onboarding.tsx:297` | button | Check selected Meteor account (optional) |
| `apps/owner/src/app/onboarding.tsx:299` | button | My organizations |
| `apps/owner/src/app/onboarding.tsx:309` | details | <summary>About this wallet session</summary> <p>This session belongs to {who.accountId}. Meteor does not reliably report selection changes. Use Switch wallet to sign in as another account.</p> |
| `apps/owner/src/app/onboarding.tsx:312` | p | {walletNotice} |
| `apps/owner/src/app/onboarding.tsx:316` | p | {verificationIssue} |
| `apps/owner/src/app/onboarding.tsx:317` | button | Retry verification |
| `apps/owner/src/app/onboarding.tsx:343` | p | {error} |
| `apps/owner/src/app/onboarding.tsx:349` | button | {org.name} · {" "} {org.status === "ready" ? org.role : org.status === "vault_verified" ? "Vault linked; verify current state" : "Vault not provisioned"} |
| `apps/owner/src/app/onboarding.tsx:420` | button | Create organization |
| `apps/owner/src/app/onboarding.tsx:443` | details | <summary>Supported wallets and networks</summary> <p> Meteor extension only. Select NEAR testnet and the activated named .testnet account or 64-character implicit account shown in your wallet. Other wallet connectors are not suppo |
| `apps/owner/src/app/onboarding.tsx:448` | p | {error} |
| `apps/owner/src/app/onboarding.tsx:449` | button | Retry saved session |
| `apps/owner/src/app/onboarding.tsx:457` | button | {busy ? loginStage\|\|"Connecting…" : "Connect to Meteor"} |
| `apps/owner/src/app/onboarding.tsx:464` | p | {busy ? loginStage : ready ? "Meteor is available. Connect opens an off-chain identity message for the account selected in your wallet. No transaction, funds or keys." : "Connect opens an off-chain sign-in message in Meteor. No tr |
| `apps/owner/src/app/onboarding.tsx:469` | details | <summary>Use a specific testnet account (optional)</summary> <label> Testnet wallet account ID <input value={account} maxLength={64} autoCapitalize="none" spellCheck={false} onChange={(e) => { const next = e.target.value; if (who  |
| `apps/owner/src/app/onboarding.tsx:488` | button | {busy ? "Awaiting wallet approval / verifying…" : "Sign message to sign in"} |
| `apps/owner/src/app/onboarding.tsx:497` | button | Switch wallet / retry verification |
| `apps/owner/src/app/onboarding.tsx:509` | button | Reload login configuration |
| `apps/owner/src/app/page.tsx:131` | dialog | <div className="modal-head"> <div> <span className="eyebrow"> {live ? "NEAR TESTNET" : "LOCAL SIMULATION"} </span> <h2 id="modal-title">{title}</h2> </div> <button className="icon-button" aria-label="Close dialog" onClick={onClose |
| `apps/owner/src/app/page.tsx:147` | button | <Icon name="close" /> |
| `apps/owner/src/app/page.tsx:163` | p | {error} |
| `apps/owner/src/app/page.tsx:168` | button | Cancel |
| `apps/owner/src/app/page.tsx:171` | button | {busy ? "Saving…" : live ? "Review / submit" : "Save simulated change"} |
| `apps/owner/src/app/page.tsx:279` | p | {error} |
| `apps/owner/src/app/page.tsx:280` | button | Retry loading |
| `apps/owner/src/app/page.tsx:368` | div | No invoices to review. |
| `apps/owner/src/app/page.tsx:373` | button | <span className="avatar small"> {vendorName(s, i.vendor_id) .split(" ") .map((n) => n[0]) .join("") .slice(0, 2)} </span> <span className="queue-person"> <strong>{vendorName(s, i.vendor_id)}</strong> <small> {i.id} · {i.order_id}  |
| `apps/owner/src/app/page.tsx:479` | div | No attempts match this outcome. |
| `apps/owner/src/app/page.tsx:504` | button | <Icon name="refresh" size={18} /> |
| `apps/owner/src/app/page.tsx:537` | button | <Icon name="plus" size={16} /> Manage vendor |
| `apps/owner/src/app/page.tsx:546` | button | <Icon name="plus" size={16} /> New work order |
| `apps/owner/src/app/page.tsx:555` | button | <Icon name="plus" size={16} /> {live ? "Enter structured invoice" : "Add sample invoice"} |
| `apps/owner/src/app/page.tsx:566` | p | Explore the <a href="/demo/contractors">explicitly simulated contractor workspace</a> . |
| `apps/owner/src/app/page.tsx:568` | p | These controls require a verified testnet organization. No live account is attached to this simulation. |
| `apps/owner/src/app/page.tsx:569` | p | Updating verified records… |
| `apps/owner/src/app/page.tsx:571` | div | {error} <button onClick={() => { setError(null); void refresh(); }} > Retry refresh </button> |
| `apps/owner/src/app/page.tsx:577` | button | Retry refresh |
| `apps/owner/src/app/page.tsx:588` | div | <Icon name="check" size={16} /> {notice} <button aria-label="Dismiss notification" onClick={() => setNotice("")} > × </button> |
| `apps/owner/src/app/page.tsx:591` | button | × |
| `apps/owner/src/app/page.tsx:657` | button | Open review <Icon name="arrow" size={15} /> |
| `apps/owner/src/app/page.tsx:678` | button | View history <Icon name="arrow" size={15} /> |
| `apps/owner/src/app/page.tsx:752` | button | <span /> |
| `apps/owner/src/app/page.tsx:788` | button | {v.agent ? "Revoke worker authority" : live ? "Authorize configured testnet worker" : "Authorize synthetic worker"} |
| `apps/owner/src/app/page.tsx:827` | div | <h2>No vendor references loaded</h2> <p>Add a vendor or import an existing reference below. Existing approved orders retain their original recipient.</p> |
| `apps/owner/src/app/page.tsx:859` | button | {vendor.active ? "Disable future payments" : "Enable vendor"} |
| `apps/owner/src/app/page.tsx:914` | div | No work orders loaded. Import an existing reference below, or add a vendor and approve one exact amount and recipient. |
| `apps/owner/src/app/page.tsx:934` | button | Revoke order |
| `apps/owner/src/app/page.tsx:1056` | button | {invoice.reviewed ? "Review acknowledged" : "Mark reviewed"} |
| `apps/owner/src/app/page.tsx:1075` | button | {busy.includes("payment") ? live ? "Queueing…" : "Simulation in flight…" : live ? "Queue reviewed invoice" : "Simulate payment"} <Icon name="arrow" size={15} /> |
| `apps/owner/src/app/page.tsx:1113` | section | {live ? "Enter a structured invoice to begin." : "Add a sample invoice to begin."} |
| `apps/owner/src/app/page.tsx:1182` | button | Simulate load error |
| `apps/owner/src/app/page.tsx:1191` | button | Reset demo |
| `apps/owner/src/app/page.tsx:1203` | details | <summary>Import existing {view === "Vendors" ? "vendor" : "work order"}</summary> <TestnetControls key={view} adapter={live} snapshot={s} run={run} section="references" referenceKind={view === "Vendors" ? "vendor" : "order"}/> |
| `apps/owner/src/app/testnet-controls.tsx:22` | p | Read-only viewer · owner actions are unavailable. |
| `apps/owner/src/app/testnet-controls.tsx:23` | p | Testnet transactions are disabled. Review and explicit transaction authorization are required before wallet requests. |
| `apps/owner/src/app/testnet-controls.tsx:29` | p | Enter a valid NEAR amount. Use an exact positive amount. |
| `apps/owner/src/app/testnet-controls.tsx:31` | button | {working?"Waiting for wallet…":"Review owner transaction in wallet"} |
| `apps/owner/src/app/testnet-controls.tsx:34` | p | Enter a valid NEAR account ID. |
| `apps/owner/src/app/testnet-controls.tsx:34` | button | Grant viewer access |
| `apps/owner/src/app/testnet-controls.tsx:34` | button | Revoke viewer access |
| `apps/owner/src/app/testnet-controls.tsx:35` | button | Refresh recorded state · read-only |
| `apps/owner/src/app/testnet-controls.tsx:35` | p | No transfer attempts in the loaded vault history. |
| `apps/owner/src/app/testnet-controls.tsx:35` | button | Use recorded attempt {p.attempt_id} |
| `apps/owner/src/app/testnet-controls.tsx:36` | button | Reconcile recorded outcome |
| `apps/owner/src/app/testnet-controls.tsx:37` | p | No worker jobs in this organization queue. Check transfer attempts separately. |
| `apps/owner/src/app/testnet-controls.tsx:38` | button | Import existing reference |
| `apps/owner/src/app/testnet-controls.tsx:39` | p | {error} |
| `apps/owner/src/app/testnet-controls.tsx:39` | p | Checking the requested action… |
| `apps/owner/src/app/testnet-controls.tsx:40` | details | <summary>Verification details</summary> <dl><dt>Vault</dt><dd>{adapter.config.contract}</dd><dt>Owner</dt><dd>{v.owner}</dd><dt>Organization</dt><dd>{snapshot.access?.organization}</dd><dt>Finalized block</dt><dd>Finalized block:  |
| `apps/owner/src/app/vault-onboarding.tsx:103` | p | Factory deployment and pinned artifact configuration require review and approval before wallet requests can be enabled. |
| `apps/owner/src/app/vault-onboarding.tsx:108` | p | {error} |
| `apps/owner/src/app/vault-onboarding.tsx:131` | details | <summary>Artifact verification details</summary> <dl> <dt>Vault code hash</dt> <dd>{progress.vaultCodeHash}</dd> <dt>Factory code hash</dt> <dd>{progress.factoryCodeHash}</dd> <dt>Plan SHA-256</dt> <dd>{progress.planDigest}</dd> < |
| `apps/owner/src/app/vault-onboarding.tsx:155` | p | {progress.message} |
| `apps/owner/src/app/vault-onboarding.tsx:162` | button | Create vault |
| `apps/owner/src/app/vault-onboarding.tsx:183` | button | {progress.hash ? "Reconcile and retry identical transaction" : "Request Meteor approval"} |
| `apps/owner/src/app/vault-onboarding.tsx:203` | button | Resume / reconcile provisioning |
| `apps/owner/src/app/vault-onboarding.tsx:213` | button | Review retry of same vault |

### Phase 0 completed checks

Owner type-check passed; owner backend suite 96/96 passed; root reference suite 42/42 passed; production build passed. Lint could not run because neither package defines a lint script. `check:seo` and `check:links` do not exist yet and are scheduled in later phases; no pass is claimed. This documentation-only phase did not rerun real-wallet acceptance or the browser mutation workflow suite. The local app was restarted on its existing configured origin after the build; worker/payment controls were not activated.

### Concurrent work preserved

The working tree was clean at Phase 0 start. Request/RPC changes appeared during the audit in live API, adapter, chain/config/identity/provisioning and new request-policy/request helpers, plus `.env.example`. They belong to separate ongoing work: they were not edited, staged, reset or included in this phase commit. Re-read their final error/status interfaces before Phase 1–2 presentation changes. The reported executions are actual runs, not a guarantee about later concurrent edits.
