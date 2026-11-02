# Contractor portal — isolated mock adapter

The user subsequently requested a persistent backend. The default `/contractor`
now uses that backend; this document describes the retained **explicit demo**.
New demo invitations include `?mode=demo`. See
[PERSISTENT_CONTRACTOR_PORTAL.md](PERSISTENT_CONTRACTOR_PORTAL.md) for actual
organization authorization, signed wallet proofs, preserved source text and
app-restart acceptance. No synthetic records are migrated to real identities.

2 November 2026. This is a local, explicitly labeled simulation. It adds no NEAR
contract methods, wallet connector calls, deployments, worker authorization or
payment execution. Existing real-wallet organization/session guards and immutable
contract work orders are unchanged. The user explicitly requested this mock portal
in parallel with the existing read-only transaction monitor; live owner acceptance
and Milestone 1 remain incomplete.

## Run the journey

Start the owner app using its existing scripts in `apps/owner` (`npm run build`,
then `npm run start`). Open `http://127.0.0.1:3100/demo/contractors`, also linked
from the existing `/?mode=demo` owner sidebar. A separate demo owner session
creates an empty simulated workspace; it is not attached to a real wallet.

1. Start the contractor demo and create a named contractor profile (maximum three
   per demo workspace). Create a private link; it is shown once. Copy/open it in
   another browser context to act as the contractor. No email/message is sent.
2. In **Wallet details**, enter a testnet-shaped account, prepare a simulated
   challenge and simulate proof. The owner must refresh and approve the request.
   No signature is verified and no NEAR key/account read occurs in this mock.
3. The owner approves a work order with a fixed reference, description, exact NEAR
   amount and the then-approved wallet. The recipient is stored immutably.
4. In **Submit a bill**, paste text or upload a file. “Format labeled details”
   recognizes explicit `Work order:`, `Amount: 1 NEAR` and optional
   `Wallet:` lines. This is a deterministic formatter, not AI. Conflicting labels
   demand clarification; arbitrary instructions remain literal invoice text.
5. Complete the approved work order, description and exact positive amount.
   Currency is fixed at **NEAR · Testnet**. Another source currency blocks submission
   until clarified; it is never converted or silently relabeled. The preview shows the approved order's
   recipient. A stated invoice wallet is a cross-check, never transfer authority.
6. Submit to **My payments**. The owner sees the same invoice in review. Amount,
   asset or wallet mismatches cannot be approved; request clarification with a
   note. The contractor can correct only that same invoice/order, retaining an
   audit history. Owner approval changes review status only; it sends no payment.
7. Request another wallet through **Wallet details**. Until owner approval, the
   current wallet stays unchanged. Approval changes future work orders only;
   existing orders and invoice recipients retain their original wallet.
8. Revoke the private link as owner. Existing sessions and future link exchanges
   are denied. The open portal clears records on its next read (two-second visible
   polling or focus/refresh); downloads and mutations check access immediately.

## Three contractor sections

- **Submit a bill:** text-first draft, upload, formatted preview and explicit
  payment-critical clarification. A bill can be submitted once per work order;
  another invoice reference does not bypass this durable uniqueness constraint.
- **My payments:** only this contractor's invoices, review notes and status.
  New submissions have no transaction link. When a typed snapshot contains one,
  the UI permits only testnet NearBlocks transaction URLs and labels the record
  simulated. The paid-history browser case uses a display fixture, not a payment.
- **Wallet details:** initial request, simulated proof and pending owner approval;
  later changes follow the same approval path. Revocation invalidates pending
  approvals so an old request cannot be accepted after access is replaced.

## Access and persistence

Invoice references are assigned server-side on successful submission, for example
`CTR-0042-INV-0001`. A durable contractor number and per-contractor sequence are
allocated in the same `BEGIN IMMEDIATE` SQLite transaction as the bill and
submission claim. Failed validation does not consume a number. Existing records
retain their references; clarification retains the original bill ID/reference.
The browser supplies an opaque submission key, never the invoice number. Exact
retries return the existing bill, including after a restart; a changed payload
under the same key fails. Identical retries with a new key also recover the
existing order's invoice. Different submissions for an already-claimed work order
remain blocked. A reference never establishes payment eligibility.

Owner-entered invoices in the main dashboard also have no reference input or
currency selector. Live organization submission allocates the reference in its
existing scoped durable queue after owner authorization. Demo owner entry uses
the same allocator in a separate per-demo-workspace SQLite queue under
`artifacts/demo/owner-invoices-<organization>.db`; these records reload through the
mock adapter and are never attached to a live identity. The server rejects an
explicit non-NEAR asset or conflicting source text. Main-dashboard fixture invoices
and earlier contractor records are not renumbered. These application changes do
not change contract methods or authorize any deployment/payment.

The typed HTTP mock adapters are in `src/data/contractor-adapter.ts`. The server
implementation is `src/server/demo-contractors.ts`, exposed only under
`/api/demo/contractors`. It imports no chain client or signer. The owner and
contractor credentials are distinct HttpOnly, SameSite=Strict cookies. A public
demo start creates a **new isolated demo workspace**, never another owner's scope.
Each owner mutation checks the owner session and organization. Each contractor
read/mutation derives its profile and organization from the capability session;
caller-supplied identifiers cannot choose another contractor's records.

Private links contain a random 256-bit capability in the URL fragment. The token
is exchanged in a same-origin POST, removed from the address bar after success,
stored only as a SHA-256 digest on the server and never persisted in browser
storage. Links expire after seven days; contractor sessions after one hour;
demo owner sessions after thirty days. Replacing/revoking a link increments its
profile generation and revokes existing capabilities/sessions on every request.
An invalid link exchange invalidates the previous session, including refresh.
Changing a fragment clears the UI before exchange and fences stale snapshots and
mutation responses. Owner demo sessions are not a production authentication flow.

Simulated wallet challenges are single-use, session/profile-bound and expire in
five minutes. Owner approval pins the pending request ID, generation and wallet
version. This exercises workflow guards, **not cryptographic wallet ownership**.

SQLite stores owner/profile/link/session metadata, immutable orders, invoices,
clarification history and private file blobs. Default file:
`artifacts/demo/contractors.db` (gitignored), separate from live identity/invoice
databases. `NNETICS_DEMO_PORTAL_DB` can select another persistent demo file.
Unique constraints and immediate transactions guard duplicate submissions and
concurrent requests across process restarts. All mutation requests enforce the
configured app Origin and bounded request bodies.

## Upload behavior and limits

TXT, PDF, PNG and JPEG only, up to 1 MB and 25 uploads per contractor. Server checks
extension/MIME and format signatures; TXT must be valid UTF-8 without NUL. HTML,
SVG and executable formats are rejected. Bill text is limited to 24,000 characters
(including TXT imported into the draft). Description is limited to 1,000 and
references to 80 characters. PDFs/images are attachment-only; no OCR or AI runs.
The attachment ID is bound to its organization/contractor, including on invoice
submission and download. Downloads enforce authorization, attachment disposition,
no-sniff and sandbox headers; files are not served as inline app HTML.

## Validation and remaining limits

`npm test` includes ten new domain tests: complete journey, independent owners
and contractor isolation, forged authority, revocation/replacement, expiry/replay,
immutable recipients after wallet change, mismatch/clarification, duplicate claims,
private uploads, restart persistence and deterministic text handling. Five browser
scenarios run on desktop/mobile: full journey, API isolation/CSRF/concurrent claims,
malformed text/upload, delayed-response link switching, and conditional history
links. See [VALIDATION.md](VALIDATION.md) for executed results and failures/fixes.

There is no live contractor adapter, actual contractor message signature, real
payment/status reconciliation, AI extraction, production account recovery or
independent security review. No live wallet receives synthetic records. Payment
and deployment controls are absent from this adapter/API; request action names
outside its whitelist fail. This mock's success does not satisfy live onboarding,
wallet proof, transaction recovery or Milestone 1 acceptance.
