# Nnetics V3.2 audit

Baseline captured at `31d5f216c86936eb8ad3f71241a5ea2cd329b868` without resetting the working tree.

| Capability | Existing authoritative path | V3.2 agent outcome |
| --- | --- | --- |
| Work-order create/read | Owner records (`create-order`, owner snapshot) | Exposed in demo mode; creation requires the existing approved-wallet rule. |
| Work-order update/cancel | Not previously available | Added only for active, unlinked records; both require server-held, one-time confirmation. |
| Invoice search/detail | Owner snapshot | Existing reads remain scoped to the authenticated owner session. |
| Invoice creation | Authenticated contractor portal | Deliberately not exposed to the owner agent. |
| Invoice review | Owner record `review-invoice` | Added as a prepared, confirmed action; approval is blocked by recorded discrepancies. |
| Payment readiness | Demo intent preview and vault ledger | Added as a read-only projection; no payment path is exposed. |
| Live mode | No implemented agent record tools | Remains unavailable; no live authority was implied. |

Safety invariants: confirmation secrets remain out of model context; confirmation revalidates the exact invoice/order snapshot; linked work orders are immutable to the agent; approval never starts a blockchain transaction; existing origin and owner-session enforcement is unchanged.

Verification performed: root Node tests passed (42); owner TypeScript check passed; owner production build passed. The owner Node suite was started twice and showed its V3.1 lifecycle, provider-safety, Payables, origin, and payment-security checks passing through the captured output, but the execution window ended before its final aggregate result. Browser and real-model V3.2 acceptance remain to be run against an authorized session.
