# Persistent private contractor billing

Implemented locally on 2 November 2026. This replaces the default contractor
adapter with authenticated HTTP APIs and SQLite records. The earlier demo remains
explicitly separate; no demo records are copied into real organizations. This
does not deploy contracts, authorize a worker, initiate a payment or complete
public-testnet payment acceptance.

## Use the running application

1. Open `http://127.0.0.1:3100/`, verify your activated testnet account through
   Meteor and select/create your organization. The selected unprovisioned
   organization now includes its persistent contractor owner panel. A configured
   vault dashboard also has **Contractor billing** navigation.
2. Create a contractor profile and private link. The link opens `/contractor#…`;
   its token is exchanged for an HttpOnly capability session and removed from
   the address bar. Links are shown once; replacement invalidates previous access.
3. The contractor enters their testnet wallet in **Wallet details**, selects
   **Verify wallet and request approval**, and approves an off-chain Meteor
   message. The server verifies its NEP-413 signature and current finalized
   FullAccess key. This requests no transaction and installs no key.
4. The owner approves the exact pending request. The signing key is checked again
   before approval. Requests older than 15 minutes must be rejected so the
   contractor can submit a fresh proof. Wallet changes use the same process.
5. The owner approves a fixed **off-chain billing work order**. Its stored recipient
   never changes. This approval does not create an on-chain work order or vault
   payment authority. Those integrations remain gated separately.
6. The contractor primarily enters **What did you do?** and **How much are you
   requesting?** A sole work order is selected automatically; with multiple orders,
   the contractor must choose one. The preview explains missing/ambiguous details.
   Currency is fixed to **NEAR · Testnet**, with no currency selector or conversion.
7. Submission allocates a permanent server reference such as `CTR-0001-INV-0001`.
   The owner sees the same invoice in the selected organization's panel. Review
   can start, request clarification, approve or reject; the contractor sees the
   resulting state. Approval never initiates payment.
8. Restart the application using the same database paths. Reverify owner identity
   when required; records do not depend on keeping an owner browser session alive.
   A contractor's unexpired, unrevoked capability session can reload its records.

## Data and authorization

`PersistentContractorAdapter` and `PersistentContractorOwnerAdapter` call
`/api/live/contractors/*`. `ContractorBackend` checks existing verified identity
and organization authority on every owner request. An unprovisioned organization
requires its creator; configured vault organizations use the existing owner/viewer
authorization guard. Linked vault owner/code changes fail closed. An organization
authority binding also prevents a new owner silently inheriting earlier private
links/records. No wallet allowlist or connected-wallet ownership grant exists.

Contractor access derives the organization and profile from a hashed capability,
not caller-supplied IDs. Links expire in seven days and sessions in one hour.
Every read, mutation and download checks revocation/expiry. Replacing/revoking a
link increments its generation and invalidates existing sessions and pending wallet
requests. The server rejects access immediately. Same-browser tabs also receive a
revocation notification; other open clients clear records on their next visible
two-second poll/focus/read. Previously delivered content cannot be remotely erased.
Late responses are fenced by access generation.

Wallet proofs bind a random 32-byte nonce, origin, testnet account, profile,
session, generation and five-minute expiry. Successful proof consumption and the
pending request are committed together; replay/cross-profile/expired/revoked
proofs fail. Keys must be Ed25519 FullAccess keys on the finalized testnet account.
Verification follows [NEP-413](https://github.com/near/NEPs/blob/master/neps/nep-0413.md),
using the existing pinned SDK and digest implementation; no dependency update.

The default database is `artifacts/live/contractors.db`, configurable through
`NNETICS_CONTRACTOR_DATABASE`. It stores profiles, hashed links/sessions, wallet
requests, approved wallet versions, immutable work orders, uploads, invoices,
original text, review history, reference sequences and idempotency claims. WAL,
FULL synchronous writes, bounded locking and immediate transactions preserve
reference/order claims across concurrent requests and restarts. Historic internal
table names retain `demo_` prefixes because the storage engine was reused; the
database has a persistent-mode marker and rejects mixing with a demo database.
Demo owner authentication/proof methods are disabled in persistent mode.

The server generates references, never trusts a supplied invoice number as
payment eligibility and retains one invoice claim per work order. Exact retries
return the saved invoice; changed payloads under an old request key fail. A new
key cannot create another invoice for already claimed work. Clarification retains
the invoice ID/reference and original recipient.

## Text, review and payment states

- **Submitted:** a valid billing request awaits owner review.
- **Needs clarification:** payment-critical mismatch (including another source
  currency), or an owner clarification request. Owner approval cannot override it.
- **Under review:** the owner explicitly started review.
- **Approved / Rejected:** billing-review decisions, independent of payment.
- **Payment:** not initiated while this integration is gated. The backend exposes
  no command to set Paid, enqueue payment or supply a transaction link. The live
  UI suppresses an unverified Paid label/link. Confirmed chain evidence and live
  contractor payment reconciliation remain unimplemented; no Paid result is claimed.

The exact original submitted text, including whitespace, is stored permanently
as `originalText`. Clarifications update current text and append history without
overwriting that original. The owner and contractor can inspect both. Foreign
currency text is retained as Needs clarification; its amount is explicitly marked
as conflicted, never converted or displayed as a settled NEAR amount. Explicit
non-NEAR structured assets are rejected. Missing required work/amount/order details
block submission with instructions in the preview.

**Extraction is deterministic parsing, not a real AI provider or mock AI response.**
The optional formatter recognizes explicit work-order/amount/wallet labels and
rejects contradictory labels. Free text is untrusted literal data. PDF/images are
private attachments only, with no OCR; TXT can populate the draft. Existing format,
body-size and download authorization limits remain enforced.

## Executed verification

See [VALIDATION.md](VALIDATION.md) for the precise runs and failures. The local
production-build acceptance harness is reproducible with:

```powershell
cd apps/owner
npm run build
npm run test:contractor-acceptance
```

It starts an isolated production Next.js process on port 3210 with temporary
identity/contractor databases, disposable signing keys and a controlled HTTPS
testnet-RPC fixture. The child trusts only its generated fixture certificate;
normal TLS verification is retained. OpenSSL is required (Git's bundled executable
on Windows; `OPENSSL` can select a path). This test never uses real owner keys,
the application's live databases or public-chain transactions. It exercises actual
HTTP routes, signature checks and owner/contractor browser views, kills/restarts
the app with the same files, then verifies persisted records/statuses, retry/order
guards, currency clarification, unrelated-organization denial and revocation.

The passing result, logs and screenshots are retained in ignored local artifacts.
Controlled wallet/RPC fixtures are not real Meteor or public-testnet acceptance.
Local tests are not independent security review. Back up and persist the SQLite
files for continued use; multi-host storage, production invitation delivery,
production security review and on-chain work-order/payment linkage are not added.

## Explicit demo

`/demo/contractors` still uses the isolated simulated owner adapter and database.
Its new invitation URLs include `/contractor?mode=demo#…`; regenerating a previous
demo invitation provides the explicit mode. The default `/contractor` never falls
back to demo data or simulated wallet verification. No synthetic organization,
balance, invoice or payment is attached to a verified real wallet.
