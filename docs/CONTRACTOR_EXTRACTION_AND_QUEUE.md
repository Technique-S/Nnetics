# Contractor extraction and durable payment linkage

Implemented locally, 2 November 2026. No contract changes, deployment, payment,
checkpoint installation, worker activation or push is authorized by this work.
The existing unresolved infrastructure transaction and provisioning gate remain.

## Extraction

The persistent contractor portal offers manual entry, local deterministic parsing,
and optional server-side OpenRouter extraction. Configure privately in
`apps/owner/.env.local`:

```dotenv
OPENROUTER_API_KEY=<configure privately; never commit>
NNETICS_AI_MODEL=nvidia/nemotron-3.5-super-vl:free
```

Restart the app after configuration. Never use a `NEXT_PUBLIC_` variable for the
key. The key is read only by server code; provider errors do not echo its response
body, credentials or invoice text. `.env.local` is ignored by Git.

The selected [free model's policy](https://openrouter.ai/nvidia/nemotron-3.5-super-vl:free)
prohibits confidential/personal input. The contractor must explicitly confirm
their entered text is suitable before choosing AI extraction. Only that text is
sent; the server does not add organization records, work orders, wallet requests
or attachments. PDF/image attachments still have no OCR. The deterministic button
does not call a provider. The demo remains explicitly simulated and has no AI.

The adapter uses OpenRouter's [strict structured-output interface](https://openrouter.ai/docs/guides/features/structured-outputs)
with `require_parameters: true`, a fixed server endpoint, no tools or actions,
bounded input/output and a 20-second timeout. Independent runtime validation
requires exactly the schema's keys, bounded nullable strings, bounded questions
and a positive exact decimal amount. An extracted amount requires a quoted source
substring containing that amount; a wallet or order reference must occur in the
source. Invalid, ungrounded, truncated or unavailable output falls back to a
**visibly labeled deterministic parser**. There is no silent provider/model swap.

AI output is untrusted billing claims, never approval or authority. It cannot
change wallets, create/approve work, increase an approved amount or authorize a
payment. Suggested amount and recipient are independently compared with the
immutable billing order and again with the finalized on-chain order at linkage.
Source currencies/ranges/multiple amounts produce clarification; no conversion
or substitution of the order's allowance is performed. Missing amounts require
entry, and ambiguous work-order matches require explicit selection.

The preview distinguishes extracted/manual values from the fixed recipient
**supplied from the work order**. Confirmation is required after extraction and
reset after editing payment fields. Previews are scoped to contractor, session,
link generation, exact source text and fifteen-minute expiry. Submitted previews
are retained for audit; expiration prevents new use, while an already committed
identical submission can still return its original invoice after restart.
`originalText` remains permanent across clarification.

## Owner-controlled payment linkage

Approving a bill remains separate from payment. For an Approved invoice the owner
can select exactly one on-chain work-order ID and choose **Link reviewed invoice**.
The backend requires:

- Current verified owner authority for the same organization.
- A verified provisioning record for its vault and matching explicit reviewed
  payment-adapter configuration. Unprovisioned organizations fail closed.
- A pinned finalized testnet/code/owner read and an enabled, unexpired chain order
  in Approved state, with an active vendor.
- Exact agreement among contractor/profile, local billing order, invoice and
  chain order for recipient and amount; NEAR only and no unresolved source issues.

The vendor, recipient and yoctoNEAR amount come from the chain order. Invoice
references identify records and do not establish payment eligibility. Billing text
over the existing queue's 8,000-character bound is blocked without truncating or
overwriting the original record.

A separate durable `contractor_queue_intents` record claims the invoice and chain
order before import into the scoped payment queue. Import is idempotent, rejects
another invoice claiming the order, and preserves submitted/pending/failed/paid
jobs and their exact signed bytes/hash. An interruption before import or after
import resumes the same intent. Conflicting reference/intent data blocks for
investigation; it never resets a payment claim. Independently generated owner and
contractor references can collide in this MVP; such collisions deliberately block
linkage and require investigation rather than overwriting a queued invoice.

Imported jobs start in **review/held** with `reviewed: true`; they do not start a
worker. The owner must separately release them through the existing enqueue guard,
which rechecks contract payment rules. The configured adapter currently serves one
organization/vault/database scope per running app. Provisioning other organizations
does not automatically configure another worker or grant payment authority.

The portal shows payment progress separately from billing-review status. It shows
Paid/a transaction link only after the existing worker's terminal queue record is
corroborated by a fresh finalized contract payment with exact invoice/order/amount/
recipient plus the existing verified transaction-marker linkage. A queue label or
successful transaction alone is insufficient. Missing RPC/proof stays pending or
blocked. This code path has not yet passed public-testnet payment acceptance.

## Actual verification versus pending acceptance

See `VALIDATION.md` for commands, exact results and environmental failures. The
production restart harness uses actual HTTP routes, SQLite and cryptographic
signatures, but controlled RPC/wallet fixtures. These are not real Meteor results.

On 2 November the configured OpenRouter endpoint returned **HTTP 429** for synthetic
text. Its configuration format passed local checks; a successful real-model
response has **not** been demonstrated. Provider output parsing, injection cases,
failure and fallback are verified with controlled responses.

Babygoat's earlier real Meteor owner login and returning on-chain-owner workspace
passed. For the contractor journey the user chose **Grandtheft as owner and
Babygoat as contractor**. User-operated real Meteor proof, owner wallet approval,
invoice submission, clarification and final owner review passed: INV-0002 is
Approved for 0.001 NEAR on ACCEPTANCE-001. Original text and immutable claim/
recipient are preserved, including after an actual production process restart.
The correction used explicitly labeled deterministic extraction. Browser control
was unavailable, so live results were verified against actual backend storage;
post-restart UI rendering and real contractor cross-organization/revocation checks
are not independently observed. Earlier two-wallet owner acceptance remains
separate and unchanged. No payment or queue linkage passed public-testnet
acceptance, and no chain outcome is inferred from these off-chain actions.
