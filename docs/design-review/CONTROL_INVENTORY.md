# Keep / move / hide / remove inventory

Proposal only; production controls are unchanged. “Hide” means contextual disclosure or absence when inapplicable, never removed authorization. Classification: **E** essential in context; **D** useful in dedicated section; **A** advanced/support; **O** obsolete/redundant ordinary UI. Every row names the destination; sibling field labels and feedback follow the action to that destination.

## Identity and onboarding — `onboarding.tsx`

| Existing control/message | Class | Decision / destination |
|---|---|---|
| Product title / NEAR testnet | E | Keep wordmark; one network indicator in sign-in/header |
| Connect to Meteor / selected-account discovery | E | Keep primary sign-in action; state-specific button progress |
| Connecting / awaiting approval / verifying / accepted but workspace loading | E | Keep accurate stages in sign-in card; accepted proof gets saved-session retry, not another signature |
| Supported activated account / Meteor / correct network guidance | E/A | Short requirement beside Connect; detailed extension/site-access/account-format recovery under Connection help |
| No transaction / funds / key requested explanation | E | Keep immediately beside off-chain message action |
| Optional account ID input + Sign message to sign in | A | Move into Connection help → Use a specific account; retain validation |
| Switch wallet / retry verification during sign-in | E | Keep contextual cancel/retry; cancel stale challenge first |
| Reload login configuration | A | Show only on configuration failure, with actionable cause |
| Retry saved session / Retry verification | E | Keep alongside retryable failure; no signature for valid retained session |
| Open simulated demo | D | Keep secondary sign-in link; explicit synthetic banner throughout demo |
| Session-restoration text | E | Keep one actual loading state; skeleton has the eventual layout, no artificial delay |
| Signed-in account | E | Visible compact account control on every owner page, including mobile |
| Switch wallet | E | Account menu; explicitly revoke old context, then authenticate new account |
| Sign out / Disconnect wallet | E | One discoverable Account → Sign out/disconnect command; keep existing adapter logout semantics, not only cosmetic clearing |
| Check selected Meteor account (optional) | A | Account menu → Wallet details; explain optional signature before starting |
| Meteor cannot reliably observe selection explanation | E/A | Account menu detail, plus tooltip/help by visible authenticated identity; never mandatory return prompt |
| My organizations | D | Organization switcher, authorized saved names + role; no combined private data |
| Organization names and ready/unprovisioned/vault_verified state | E | Workspace picker and switcher; title uses saved name, fallback readable short ID |
| No organization / 0 invoices / 0 contractors / 0 history | E | Empty onboarding with Create organization; no synthetic account balances |
| Organization-name form / Create organization | E | Empty onboarding and switcher → Create organization; off-chain label |
| “No balance until linked/verified” | E | Empty vault summary only; do not repeat after verified state |
| Full organization ID | A | Settings → Details, copyable |
| Generic expired/signed-out/switched message on initial anonymous request | O | Remove from normal first visit; preserve explicit expiry/revocation reason when established |

## Shared owner shell — `page.tsx`, `globals.css`

| Existing control/message | Class | Decision / destination |
|---|---|---|
| Brand home link | E | Keep in shared header; normal navigation to Overview |
| Workspace UUID / generic “Owner workspace” | E/A | Show authorized organization name and true role; full ID in Settings |
| Overview / Vendors / Work orders / Invoice review / Payment history | E | Keep directly reachable primary navigation; Vendors represented as On-chain vendors within Contractors |
| Contractor billing button / Back to vault dashboard | D/O | Integrate billing into same owner navigation; remove shell-escaping Back button after canonical routes exist |
| Invoice count | E | Show count for relevant list; separate “needs review” from all historical records |
| Navigation scroll hint | O | Remove once responsive drawer/collapse is delivered |
| Authority-stays-with-you promotional note | O | Remove repeated sidebar card; exact approval semantics remain at invoice/order action |
| “M3 integration”, “Owner preview”, generic milestone/deployment footer | O | Remove ordinary UI; build/version in Diagnostics if needed |
| Global simulation/live banner | E/O | Keep conspicuous synthetic-data banner in demo. Live network indicator + specific context replaces repetitive live prose |
| Duplicate breadcrumb / account / avatar | E/O | One breadcrumb only when useful for detail navigation; account once in header; decorative OW avatar optional, never identity source |
| Refresh finalized state | E | Page data toolbar with last checked state and current loading indicator; diagnostic block hash elsewhere |
| Page title and subtitle | E | Immediately below compact header; meaningful title, short purpose |
| Disabled Deployment button on every page | O | Remove button; show deployment gate only in Vault onboarding / affected financial decision |
| Notices / dismissal / error / Retry refresh | E | Local to originating section/action; one global banner only for a global blocker |
| Pause and revoked-worker banners | E | One accurate compact state summary; pending count only from verified data; relevant explanation at controls |

## Administration — `testnet-controls.tsx`

| Existing control/message | Class | Decision / destination |
|---|---|---|
| Testnet wallet & funding heading | O | Remove omnibus heading; separate destinations below |
| Organization / account / role prose | E/O | Identity header + workspace role; remove repeated paragraph |
| Owner and vault address | E/A | Vault → Details, copyable; repeat actual owner/receiver in transaction review |
| Finalized block | A | Vault → Diagnostics and payment evidence detail; never lost |
| General deployment/review/bootstrap/weak-subjectivity/custody paragraph | A/E | Security & review details; action-specific current limitations before affected transaction. Avoid stale generic custody warnings for a verified locked vault |
| Funding action selector: payment ledger | D | Vault → Funding; fixed NEAR/network, ledger meaning and attached amount visible |
| Funding action: storage/operating reserve | D | Vault → Funding, clearly separate purpose and balance |
| Set total budget | D | Vault → Spending limits; cumulative semantics, committed minimum |
| Set payment cap | D | Vault → Spending limits; exact per-payment maximum |
| Amount field / Review owner transaction in wallet | E | Keep with selected action; show signer, receiver, method, amount/deposit, gas/fee bound, permissions, stop conditions before actual signature request |
| Recorded attempt ID + Reconcile recorded outcome | A/E | Payment history → attempt details → Reconcile; advanced lookup in Vault → Diagnostics. Clear read-only refresh vs transaction-based reconciliation distinction |
| Viewer account / Grant viewer / Revoke viewer | D | Settings → Access; role explanation and existing backend org/owner enforcement retained |
| Reference type / Existing reference / Import | D/A | Secondary Import vendor on contractor vendor list; Import order on work-order list. No generic global selector needed |
| Frozen contract lacks enumeration explanation | A | Inline help beside Import; full technical reason in Diagnostics |
| Durable queue list, IDs, state, reason, transaction link | E/D | Invoice payment detail / Payment history. Show human reference first, job/attempt IDs in details |
| No durable invoices message | E | Invoice/payment empty state only, not above Vendors |

## Dashboard pages and forms — `page.tsx`

| Existing control/message | Class | Decision / destination |
|---|---|---|
| Four vault metrics | E | Keep Overview; precise values/definitions as in REVIEW.md; never budget as cash |
| Guardrail budget bar / spent-reserved-uncommitted legend | D | Vault → Spending limits; handle zero budget safely; no invalid percentage |
| Vendor slot count | D | Contractors list / add profile/vendor action; enforce existing three-slot bounds |
| Pause/resume switch | E/D | Vault state/controls; concise status visible elsewhere. State exact effect on new initiation vs in-flight transfers |
| Authorize configured worker / Revoke authorization / worker identity | E/D | Vault → Worker access; account/key/method/expiry/deposit visible in review. Disabled throughout current rollout |
| Invoice review queue / Open review | E | Overview summary + Invoice review list/detail; status truthful |
| Recent attempts / View history | E | Overview summary → Payment history |
| Vendor cards / recipient / active/disabled / orders | D | Contractors → On-chain vendors; details remain inspectable |
| Manage vendor dialog: reference, recipient, validation | E | Vendor list → Manage; current registration/update guards unchanged |
| Disable/reactivate vendor | E | Vendor detail action with impact on future eligibility, immutable old orders explained |
| Work orders table / statuses / expiry / recipients | E | Work orders list; billing approval distinct from current chain authorization |
| New order dialog: ID, vendor, amount, expiry | E | Dedicated creation/detail form; full immutable recipient and exact amount confirmation |
| Revoke work order | E | Order detail action, preserving immutable history and no ID reuse |
| Owner-entered invoice: order, stated recipient, amount, original text | E | Invoice review → Enter invoice; automatic server reference; fixed NEAR; same mismatch/clarification semantics as contractor |
| Invoice facts and policy failure list | E | Invoice detail next to review decision; retain every blocking reason |
| Original invoice text | E | Visible review evidence; never replace with derived prose; revisions/history separate |
| Mark reviewed / Review acknowledged | E | Review workflow; label distinctly from payment linkage/eligibility |
| Queue reviewed invoice | E | Explicit invoice payment section, existing job only; held/unverified gates cannot be bypassed by redesign |
| Payment history filter | E | History toolbar; real outcomes including failed/pending, meaningful empty results |
| Transaction link / reference / attempt | E/A | Payment row/detail; confirmed link is preserved; raw IDs copyable in details |
| Horizontally scrollable table region / scroll hint | E/O | Keep accessible regional scroll where necessary; mobile summary rows preferred; show hint only if actual overflow |
| Form Cancel / Close / Save progress / validation | E | Retain native dialog semantics, focus return, input state, contextual error and busy guard |
| Simulation outcome selector / Simulate payment | D | Demo tools only; never present in live financial controls |
| Simulate load error / Reset demo | A | Explicit Demo tools section; no real record mutation |

## Vault provisioning — `vault-onboarding.tsx`

| Existing control/message | Class | Decision / destination |
|---|---|---|
| Create vault / verified status | E | Vault onboarding page; empty Overview links here |
| Required storage funding, fee notice, zero payment funds | E | Visible before wallet approval, not inside collapsed diagnostics |
| Review notice, setup not configured, signing disabled | E | Precise onboarding blockers and recovery action |
| Owner/network/vault/factory/receiver/method/request/deposit/gas/code hashes/digest/state | E/A | Human-readable transaction review with amount/network/owner/permissions always open; hashes/full encoded details expandable and copyable |
| Reviewed-details checkbox / Request Meteor approval | E | Keep genuine approval boundary, enabled only by existing plan checks |
| Same transaction retry / resume reconciliation / recorded hash | E | Progress page, existing outbox only; unknown outcome never creates new intent |
| Wallet hash different from prepared hash input | A/E | Show only for awaiting-chain reconciliation; explain exact-evidence checks |
| Failed retry of same vault | E | Only after conclusive failure and existing gates; no second vault |
| Initialization/no keys/paused/no worker semantics | E | Provisioning confirmation; current verified outcome, not a fake success animation |

## Owner contractor records — `contractor-owner.tsx`

| Existing control/message | Class | Decision / destination |
|---|---|---|
| Profile name / Create profile / 3-profile limit | E | Contractors list → Add contractor |
| Refresh owner records / loading / retry / access lock | E | Contractor list toolbar and scoped status; preserve generation/version fences |
| Create/replace private link / show-once link / Open portal | E | Contractor detail → Invitation; explain bearer access, expiry and replacement effects |
| Revoke access | E | Invitation section, immediate access invalidation; confirmation explains affected contractor |
| Approved wallet / initial pending / change request | E | Contractor detail → Wallet; old and requested recipient visible |
| Approve wallet / Reject wallet + proof explanation | E | Wallet request review; current key rechecked by backend; existing orders immutable |
| Work-order reference / description / exact amount / Approve work order | E | Work orders → New billing order, with contractor preselected; off-chain label preserved |
| Approved work-order list / immutable recipient | E | Work orders and contractor detail |
| Start review / review note / Approve bill / Request clarification / Reject bill | E | Invoice detail; retain reason-based blocking and immutable original text |
| Approved on-chain order ID / Link reviewed invoice | E/A | Invoice → Payment linkage; one matching chain order, one existing durable job; no hidden automatic enqueue |
| BillCard attachment download, original text, latest clarification, owner note, transaction | E | Invoice detail/history shared presentation; original/reference/amount/recipient never overwritten |
| Repeated “persistent records” / “no payment” banners | O/E | Remove developer phrasing; retain one explicit review-versus-payment explanation at decision |
| Start contractor demo | D | Demo-only route, stays synthetic |

## Contractor portal — `contractor/page.tsx`, `demo/portal-ui.tsx`

| Existing control/message | Class | Decision / destination |
|---|---|---|
| Submit a bill / My payments / Wallet details | E | Keep these three top-level sections only |
| Contractor name and organization context | E | Compact header/context; no admin navigation |
| Private access unavailable / revoked/expired recovery | E | Replace protected view with ask-owner-for-new-link message |
| What did you do? / How much requesting? | E | First fields in Submit a bill; primary task |
| Fixed currency: NEAR · Testnet | E | Keep literal label with amount; no selector or silent conversion |
| Format labeled details / Extract locally | D | One optional deterministic formatting action; preserve original text and preview confirmation |
| OpenRouter consent / AI extraction control | O/A | Do not expose provider-specific prompting in this deterministic MVP proposal. No provider added/removed/configured by audit; retain implementation capability uninvoked pending separate future decision |
| Invoice number input | O | Already absent; do not reintroduce. Server-assigned permanent reference in preview-after-save/list/history |
| File upload / accepted formats / 1 MB limit / no OCR | D/E | Optional attach details disclosure; constraints visible with input |
| Approved order selector | E | Keep explicit resolution to exactly one order; clarify zero or ambiguous matches |
| Short description (optional) | D | Optional details; avoid forcing repeat entry of original text |
| Stated wallet claim (optional) | D | Optional mismatch check, never an editable approved recipient |
| Extracted fields, quoted evidence, questions, confirmation checkbox | E | Structured preview; label values from approved order separately from submitted/deterministically parsed claims |
| Currency/amount/recipient/order conflict | E | Inline question at relevant field plus preview summary; preserve entered currency and block approval |
| Submit bill / Submit for clarification | E | Confirmation then persisted result; reuse submission ID on retry, never generate reference in UI |
| Answer clarification / Send clarification / Cancel | E | Same invoice workflow; retain linked order, reference, original text and amount constraints |
| Formatted preview / fixed recipient / attachment / source | E | Desktop side-by-side; mobile next step below entry, full confirmation before submit |
| Invoice list / statuses / owner notes / Refresh status | E | My payments; review and payment states distinct |
| View transaction | E | Only verified confirmed evidence; no invented link or Paid from approval |
| Initial wallet / requested new account / Verify wallet and request approval | E | Wallet details; off-chain proof and explicit owner approval, not “connect implies approved” |
| Pending wallet approval / old wallet remains unchanged | E | Wallet details current state |
| NEP-413, FullAccess, finalized-block, proof replay details | A/E | Wallet verification help; concise signature/key scope before action; technical details accessible |
| Simulated challenge/proof controls | D | Demo mode only, explicit simulated proof label |
| Generic payment/deployment disabled banners repeated throughout portal | O/E | One truthful status where relevant; no contractor-facing deployment configuration instructions |

## Backend invariants that relocation must not touch

Session/key checks, organization membership, on-chain ownership, role enforcement, invite generation/version revocation, challenge expiry/replay checks, immutable order recipient, strict amount/currency checks, payment job uniqueness, durable claims/outboxes, FINAL receipt verification and unknown-outcome reservation protection all remain authoritative server/contract rules. No hidden control is a substitute for those checks.
