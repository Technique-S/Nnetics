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
