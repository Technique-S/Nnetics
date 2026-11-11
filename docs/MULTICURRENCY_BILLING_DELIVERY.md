# Multi-currency billing and simulated exact-output settlement

Integrated into the main application on `feature/nnetics-v3`, November 11, 2026.
Open `http://127.0.0.1:3100/?mode=demo#Payables`. The contractor uses the existing
private invitation and `/contractor?mode=demo` portal. No standalone application,
live transaction, real quote request or permission change is part of this work.

## Diagnosis

The billing form and storage layer enforced a native-NEAR-only invoice, and the
simulator hard-coded NEAR as the destination even though it exposed multiple
funding assets. A dollar symbol was treated as a currency conflict, rather than
a request for denomination confirmation. The preview also attributed the
recipient to a work order even when the address came from Wallet Details.

## Data and billing

- `ContractorBill.amount/asset` is the current invoice obligation, not the funding
  amount. `requestedAmount/requestedAsset` preserves the original request.
- `payoutAsset` is a network-specific registry identifier. Tickers alone never
  select a payment destination. The local simulation registry includes NEAR,
  USDC and USDT on NEAR, plus Ethereum USDC and ETH as funding assets.
- A dollar amount requires explicit confirmation of invoice denomination and
  preferred crypto payout. Confirming 500 USDC preserves 500 tokens; confirming
  USD preserves the fiat claim separately from the crypto conversion estimate.
- The form preserves original text, automatic reference, optional work order,
  attachments and submission idempotency. Existing NEAR submission fingerprints
  remain compatible. No address input was added to billing.
- Missing wallet approval does not prevent submission or owner review. Recipient
  authority still comes exclusively from the current approved Wallet Details.
- A non-NEAR destination network can be recorded and reviewed. Settlement is
  explicitly blocked because the existing approved-wallet mechanism currently
  verifies NEAR recipients only; no EVM wallet authority is inferred.

## Simulator

`previewDemoQuote` calculates a fixed destination output using integer base-unit
arithmetic. Quotes record invoice amount/currency, canonical funding asset ID,
funding network/amount, destination asset ID/network/amount, rates, modeled fees,
expiry and mock solver. Existing short funding identifiers remain compatible
aliases; authoritative payment comparisons use network-specific identifiers.
Registry entries are local simulation configurations, not discovery or a claim
that a token contract is available through a live API.

For the acceptance example, the fixed mock USDC rate is 0.25 NEAR equivalent per
USDC. Delivering 500 USDC requires 125 NEAR plus the modeled 0.25% markup:
**125.3125 simulated NEAR**. Funding-unit rounding is always upward and included
in the debit; fees never reduce the fixed recipient amount. Fiat assumptions are
also displayed explicitly as simulated. None are live prices.

Funding allocations use the existing shared NEAR-equivalent demo vault pool;
this is explained in payment review. The implementation does not pretend to
have independent real blockchain balances. Reservations, availability, spending
policy and fee accounting continue to use this existing integer ledger. The
completed intent records `deliveredAmount/deliveredAssetId` independently of the
vault debit. Receipts and history include payout asset/network and source
funding context, with aggregate demo amounts labeled NEAR equivalent.

The existing authorization, wallet-version checks, expiry, duplicate protection,
pause and spending limits, deterministic failure/refund behavior and immutable
audit remain in place. Durable settlement locks prevent an amendment during an
active or completed payment. A terminal intent releases its lock through
reconciliation; completion remains the durable outbox for updating the separate
contractor store. An interrupted authorization fails closed until expiry and
reconciliation, rather than allowing an amount override.

The conceptual reference is official NEAR Intents documentation:
[exact-output swaps](https://docs.agentsonintents.com/integration/distribution-channels/1click-api/swap-types)
and [quote request parameters](https://docs.agentsonintents.com/integration/distribution-channels/1click-api/quickstart/making-a-request).
The simulator fixes the destination and computes the source requirement. Its
0.25% markup is an explicitly modeled local fee, not a claim to reproduce live
1Click pricing, fee configuration, slippage or wire responses.

## Payables and alternative amounts

The selected payable shows contractor, reference, short purpose, original and
approved amounts, status and **Pay approved amount**. **View details** is closed
initially and contains original text, attachment links, work order, approved
wallet/network, provenance, amendment history and invoice audit. Payment review
opens only when requested; funding is chosen independently from payout.

The existing backend has no partial-payment ledger. **Propose a different
amount** therefore implements a revised-approval flow only:

1. Authenticated owner proposes a different invoice amount and required reason.
2. The amount stays unchanged and payment is blocked pending contractor response.
3. The authenticated contractor accepts or declines the exact proposal.
4. Acceptance updates the invoice obligation, retains the original request and
   removes the previous approval. A fresh owner approval is required.
5. A fresh exact-output quote and explicit payment authorization are required.
   Stale quotes for the former amount are excluded from the active review.

Old/new amounts, reason, actor when known, proposal/acknowledgment/approval times
and payment authorization time are retained. Demo user identities that do not
exist are not fabricated. Partial payment and reduced-final-settlement commands
are rejected. Existing work-order amounts are immutable: the owner must unlink
the optional billing agreement before proposing an invoice amendment.

This amendment flow is demo-only. Live amendment execution is not configured;
the existing immutable live NEAR agreements and authorization paths are intact.
Persistent multi-currency billing is reviewable, but the live payment bridge
explicitly requires native NEAR denomination and payout. It cannot execute a
USDC/USDT or fiat settlement.

## Ask Nnetics

The existing authorized read tools expose invoice denomination, payout asset,
funding selection, outstanding obligation, amendments, actual conversion quotes,
delivery and eligibility/blocking reasons. Saved quote previews use the same
projection and mock math as the UI. No amount-amendment or payment-execution AI
permission was added; changes require the same owner/contractor UI workflow.

## Verification

- Owner/server suite: **361 passed**, zero failed.
- Root suite: **42 passed**, zero failed.
- Production build, explicit typecheck and theme check passed.
- Impeccable mechanical check: no findings. Desktop/mobile render inspection
  includes the original invoice and simulated 500 USDC delivery.
- The integrated acceptance browser case passed on desktop and mobile, including
  missing-wallet submission, no work order, dollar confirmation, collapsed
  details, NEAR funding, exact 500 USDC delivery and contractor acknowledgment.
- Full desktop/mobile browser regression: **220 passed of 224 cases**. The four
  failures were two legacy tests on both screen sizes: clarification changed a
  field while leaving contradictory current text, and the theme test targeted a
  temporary layout fallback during hydration. Test corrections preserve the
  original billing text, correct the clarification text and target the page's
  actual appearance control. The final focused rerun passed **14 of 14 cases**
  (2.7 minutes), including all four corrected cases and the integrated payment/
  Payables workflows against the latest main production build. It also pays the
  acknowledged and freshly approved 400 USDC amendment, while retaining the
  original 500 USDC request and excluding its stale quote. No local test failure
  remains unresolved. The 224 distinct browser cases passed across the full run
  and these corrected reruns; this is not a claim of 224 passes in one command.

An external configured-provider smoke test returned HTTP 429. Subsequent local
regression runs exclude configured model/provider tests; controlled agent/tool
tests remain included. Provider configuration and permissions were unchanged.
Real-model acceptance remains subject to the previously documented provider
quota limit in `NNETICS_V31_REAL_MODEL_ACCEPTANCE.md`.

Automatic approval review rejected a separate server launch on port 3197 with
alternate database settings. Verification continued through the actual main
local app on port 3100. No deployment or real blockchain operation was attempted.
