# V3.1 real-model acceptance — 2026-11-11

Checkpoint verified: `4effc2cb22af31ae44d93cb4eef0595645eb40b6`.

Decision: **NO-GO for full real-model acceptance. Locally verified; real-model acceptance pending.**

## Provider diagnosis

One sequential, minimal inference diagnostic against the configured model `nvidia/nemotron-3.5-super-vl:free` returned HTTP 429, provider code 429, with the recognized restriction `free-models-per-day`. No Retry-After header was present. No inference retries were made.

Authenticated read-only key metadata returned HTTP 200 and `is_free_tier: true`. A subsequent read-only quota inspection returned `free_model_daily_requests: { used: 51, limit: 50, remaining: 0 }`. Only allowlisted metadata and classified terms were printed; credentials and raw response bodies were not printed or stored.

This confirms exhaustion of the account's daily free-model request allowance. This observed failure is not evidence of model capacity or concurrent-request saturation. Credit limit remaining was null, which does not establish a credit-balance exhaustion. The adapter currently reduces HTTP 429 to a generic structured rate_limit error and discards the provider body; diagnosis therefore inspected the restricted metadata directly without changing the adapter.

Official reference: https://openrouter.ai/docs/api_reference/limits . The documented free-model daily counter is per UTC day. Recheck the read-only counter after the daily reset before attempting acceptance again. Alternatively, the account owner can review the documented account credit/tier options; no purchase or model substitution was performed.

## Real-model acceptance matrix

| Scenario | Current result |
| --- | --- |
| Edit contractor profile | Unverified: inference blocked before tool selection |
| Retrieve wallet status | Unverified: provider allowance exhausted |
| Generate secure portal invitation | Unverified: provider allowance exhausted |
| Confirm portal revocation | Unverified through real model; no confirmation executed |
| Confirm archival | Unverified through real model; no confirmation executed |
| Restore contractor | Unverified through real model |
| Confirm eligible deletion | Unverified through real model; no confirmation executed |
| Retrieve pending wallet request | Unverified through real model |
| Confirm exact wallet decision | Unverified through real model; no confirmation executed |
| Contextual follow-ups/identity resolution | Unverified through real model |

No scenario is counted as passed from the existing controlled-provider tests. No application mutation was attempted during diagnosis, so no mutation retry, idempotency replay, or confirmation claim was needed. Existing idempotency, confirmation references and origin enforcement are unchanged. No blockchain transactions were made.

## Regression scope

No application code or configuration changed in this diagnostic pass; only this report was added. Consequently no new code-triggered regression/build run was required. The checkpoint's previously recorded 344 Node tests, 44 relevant browser checks, TypeScript checks, production build and 25-profile fresh-process persistence remain local verification evidence, not fresh results or real-model acceptance. Concurrent uncommitted Payables and other workspace changes were preserved and are outside this diagnosis.

Remaining blocker: restore a positive daily free-model allowance, then run all ten scenarios sequentially through the actual agent route in an authorized demo session, retaining each HTTP idempotency key and using only the returned server-authoritative confirmation cards for sensitive execution.
