# Nnetics V3.1 contractor lifecycle

## Baseline (2026-11-11)

Working repository: `payscope`, branch `feature/nnetics-v3`. Commit `976562f` is an ancestor. The only later committed change is `21d30e0` (verification documentation). Pre-existing staged, unstaged and untracked demo Intents work is preserved. Recoverable snapshots use `refs/checkpoints/nnetics-v31/*`, with a separate temporary index; the user's branch and index are not rewritten.

Baseline: `npm test`, 336 passed, zero failures.

| Capability | Existing implementation | Required extension |
| --- | --- | --- |
| Profile edits | `ContractorRecordStore.ownerMutation`: update-contractor (name) | Agent tool, email/company allowlist and validation |
| Wallet status | Profile wallet, version and pendingWallet | Agent reads and retained decision status |
| Archive/restore | Transactional owner commands, audit, portal revocation | Archived lookup, richer confirmation UI |
| Delete | Linked bill/order/upload/link checks; audit survives | Pending wallet/history guards, prepare_delete alias |
| Portal invitations | issue-link/revoke-link, hashed credentials, generation, seven-day expiry | Opaque delivery reference, authenticated reveal, confirmed replacement/revocation |
| Wallet decisions | approve-wallet/reject-wallet checks request ID, version, generation and link | Exact recipient-bound confirmation, audit and retained decision |
| Agent | OpenRouter model selection, bounded validated tools, owner cookies, retry cache | Lifecycle registration, no parser replacement |
| Demo capacity | Three-profile cap already removed in uncommitted work | 25-profile/persistence/search verification and bounded listing |

## Authorization inventory

Demo owner cookies resolve through hashed SQLite owner credentials with expiry and organization scope. Profile access checks organization; contractor sessions derive scope from nonrevoked, unexpired links and matching generations. Owner mutations run in SQLite transactions. Contractor commands cannot execute owner actions. Persistent identity and blockchain/payment paths remain separately gated. Ask Nnetics live tools remain unavailable. Same-origin mutation checks, bounded request bodies, no-store responses and no-referrer policies remain in force.

Payment receipts and spending reservations belong to the separate workspace ledger; deletion must never cascade into that ledger. Linked invoices/orders preserve financial identity. Wallet history additionally retains recipient identity.

## Delivered behavior and reused services

All new agent capabilities are demo-owner scoped; live-mode tools remain unavailable. The OpenRouter adapter, semantic model selection, conversation history, bounded six model steps/eight tool calls, structured errors, multi-tool calls and HTTP/write idempotency remain in place. No regex command router, blockchain execution or real-vault limits were changed.

The implementation reuses `demoContractors()` / `ContractorRecordStore.owner`, `ownerSnapshot`, `ownerCommand`, `profile`, `save`, `audit`, `lifecycleEligibility`, `enter`, and the existing `update-contractor`, `archive-contractor`, `restore-contractor`, `delete-contractor`, `issue-link`, `revoke-link`, `approve-wallet` and `reject-wallet` mutations. These run through existing organization checks and SQLite transactions. `demoWorkspace().state` supplies read-only payment/reservation retention checks.

New backend operations: allowlisted email/company profile persistence; `portalStatus` (not issued/active/revoked/expired); retained wallet decision metadata and audit; `assertNoDemoPaymentRecords`; server-held invitation delivery references and authenticated reveal; confirmed portal replacement/revocation and exact wallet decisions; cancellation of prepared operations. Optional JSON profile fields preserve compatibility with existing records.

New tools: `update_contractor`, `prepare_delete_contractor`, `create_contractor_portal_invitation`, `revoke_contractor_portal_invitation`, `get_contractor_wallet_status`, `list_pending_wallet_changes`, `get_wallet_change_request`, `prepare_wallet_change_decision`. Existing `archive_contractor` and `restore_contractor` are reused; `delete_contractor` remains a preparation-only compatibility alias. `list_contractors` adds search, archived selection, exact matching count, offset and a maximum page size of 100. Wallet list reads report their total and whether their first 100 records are truncated.

## Confirmation and security

The existing server-held lifecycle preparation registry now also binds portal generation and wallet decisions. Operations expire after ten minutes, are capped at 500, and require a random single-use secret plus the same authenticated owner scope. The model receives only a summary. The secret is attached separately by the authenticated route, never enters provider messages or localStorage, and cannot be supplied as a tool argument. Cancel consumes the reference without applying a domain mutation. Claims are synchronous; repeat claims fail. Invalidated or failed claims require fresh preparation.

Deletion rechecks domain eligibility and the preparation's server-held workspace payment history before executing. Linked invoices (including paid invoices), orders, attachments, portal links, pending wallet requests, approved recipient or decision history block deletion and offer archival. Standalone simulated payment/reservation matches are conservatively retained by current/audited contractor names or known recipient. Financial tables are never cascade-deleted. Audit events survive eligible profile deletion.

Archive removes the profile from active lists and revokes access while preserving bills, orders, payments, receipts, audit and pending request evidence. Restore returns the profile to active status without reviving revoked links or sessions. Archived profiles cannot receive new links/orders or owner wallet decisions. Old contractor sessions fail their existing generation/revocation checks.

First invitations reuse the existing token issuer. Reissuing any previously issued access requires explicit confirmation, including expired/revoked access. Raw URLs and tokens are held only in a bounded server-side ten-minute delivery registry; tool results carry an opaque reference. The authenticated no-store/no-referrer reveal endpoint checks owner scope, generation, archive state and actual link validity. The browser offers Show/Copy invitation, using the real `/contractor?mode=demo#…` entry point. Credentials and confirmation data are not saved in conversation history. The existing database stores only invitation token hashes; server restart loses delivery references, not persisted profiles.

Wallet reads return the approved wallet, pending request, version, last decision and whether a decision remains actionable. Confirmed decisions bind contractor, request ID, approve/reject, old/new wallet, base version, portal generation, proof mode and rejection reason. The endpoint rechecks these before calling the existing owner decision service, which also checks expected recipients inside its transaction. Rejection retains the current wallet. Both decisions persist status and an audit event. No direct wallet setter, private keys or signing credentials are exposed.

The frontend renders proposed, awaiting confirmation, executing, completed, failed, cancelled and expired states. Cards show contractor name/ID, consequences, affected request/recipients and Confirm/Cancel. Completion refreshes contractor views and dashboard snapshots; those snapshots include portal/wallet state, counts and audit events. Keyboard focus moves to the result, mobile modal focus remains intact, and no new animation is introduced. The UI mechanical detector returned no findings; desktop/mobile screenshots were inspected.

## Checkpoints and concurrent work

Recoverable refs: baseline `775075d`, A `f5c4abc`, B `8d2ef64`, C `c118a86`, D `07f1e79`, intermediate verification `0bac7d1`, and final `refs/checkpoints/nnetics-v31/E`, under `refs/checkpoints/nnetics-v31/`. Snapshots use a temporary index and do not overwrite the user's index or branch.

During verification another workflow merged the original Intents changes and committed the in-progress lifecycle files as `9397cf7`, then began Payables changes. Those changes are preserved. The independent verification worktree is `../payscope-lifecycle-verify`. Its final lifecycle state is saved in `refs/checkpoints/nnetics-v31/E`; this supersedes intermediate `0bac7d1`, whose executor briefly captured concurrent Payables imports. Only the verification worktree executor was rebuilt from `9397cf7` plus lifecycle changes; the main checkout retains all concurrent Payables code.

## Verification and limitations

Baseline: 336/336 existing Node tests passed. Checkpoint checks: A 27 existing relevant tests plus the new route acceptance; B 34; C 35; D 42, all passed, with TypeScript checks at each checkpoint. The first production build passed. Final isolated verification: all 344 Node tests passed; all 40 relevant agent/domain checks passed after the final retention and archived-invoice refinements; the eight acceptance cases passed again with fresh-process persistence. `npm run typecheck` and `npx tsc --noEmit` passed. The final standard `npm run build` passed with physical local dependencies. Earlier junction-based Turbopack and Webpack attempts failed during environment verification; neither changed product configuration.

Eight new actual-agent-route acceptance cases verify edits, fixed IDs, persistence after opening a new SQLite store and from a fresh Node process, deletion cancellation and single use, linked paid-invoice preservation, archive/restore with revoked credentials, secure invitations, exact wallet decisions/rejection/staleness, 25 agent-created profiles, similar/duplicate names, pagination, multi-step ID reuse, idempotent HTTP replay, provider failure after preparation, expiry, cross-organization rejection and standalone spending reservations. The controlled adapter chooses tools through the actual request-processing path; it does not replace application services.

Eight new controlled-provider browser tests passed on desktop/mobile: confirmation cancellation/execution/refresh/focus, executing/failure/expiry, private invitation reveal and a usable independent contractor portal, and old/new wallet/reason display. These tests control model responses to isolate UI behavior; backend confirmation authorization is tested through the actual agent and confirmation routes in Node. Browser testing also created 26 profiles and verified list pagination/search.

Real OpenRouter smoke was attempted with the unchanged configured model `nvidia/nemotron-3.5-super-vl:free`. The provider returned HTTP 429. The two existing real-provider browser checks also returned HTTP 429. Real-model tool selection and full real-provider lifecycle acceptance therefore remain unverified; they are not claimed passed. The app reports structured rate-limit errors and no automatic sensitive confirmation occurred.

The initial 40-check browser regression run recorded 34 passes, two provider failures, two skipped mobile duplicates and two Playwright trace-output collisions. The latter came from running two suites against the same output directory; affected non-provider checks passed after reruns with isolated output on desktop/mobile using frozen lifecycle test sources. Concurrent Payables navigation-helper edits caused a source/build mismatch in an intermediate rerun and were excluded from lifecycle verification. Unique relevant browser results across successful runs: 44 passed (36 existing checks plus eight new checks), two real-provider checks blocked by HTTP 429, and two intentionally skipped mobile provider duplicates.

Operational limits: confirmation and delivery registries are process-local and intentionally fail closed after restart; multi-process deployments need a shared durable registry. HTTP idempotency retains the existing ten-minute in-process scope. Wallet list results are capped at 100 and expose truncation; individual lookup remains available. Financial identity retention is conservative. Tests use simulated funds and no real transactions.

Automatic approval review rejected isolated-server environment overrides with “blocked by policy.” Verification instead used the existing configured origin and restarted the local application server without changing origin/security configuration.
