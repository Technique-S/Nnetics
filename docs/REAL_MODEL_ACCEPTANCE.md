# Actual-provider acceptance and current blocker

The release checks used the configured **OpenRouter / `nvidia/nemotron-3.5-super-vl:free`** integration, its actual credential and actual model-selected tools. No provider response or tool selection was mocked in these runs. They use fresh synthetic demo records and simulated wallet proof; they do not establish real NEAR wallet ownership or onchain settlement.

Current result: **BLOCKED — provider free-tier daily quota exhausted**. The configured key is on the OpenRouter free tier: `free_model_daily_requests` shows **50 used of a 50/day cap, 0 remaining** (`limit_source: openrouter_free_tier_daily`); the provider header `x-ratelimit-reset` is **2026-11-14T00:00:00Z** (01:00 Africa/Lagos). The five recorded runs of 2026-11-13 (00:15–00:45 UTC) consumed the daily window; a 01:07:59Z continuation attempt made zero successful model calls (HTTP 429 before the first tool executed, evidence `artifacts/final-real-model/2026-11-13T01-07-59.070Z/`). The daily quota restores automatically at the reset time; adding credits to the key (provider remedy hint) raises the cap to 1000/day but is an operator purchasing decision. Do not switch models or keys for acceptance: that verifies a different configuration, not the canonical one.

Thirty of the 34 advertised tool names have successful actual-provider execution evidence across the recorded scoped runs. These four still need successful live coverage:

- `get_invoice_payment_readiness`
- `preview_simulated_intent`
- `prepare_delete_contractor`
- `delete_contractor`

Actual checks already observed include contractor creation/rename, contextual wallet status, organization/vault reads, invitations/replacement, revocation, archive/cancel/restore, exact pending-wallet approval, work-order create/read/update/cancel, invoice/Payables reads, and prepared approve/clarify/reject decisions. Separate authenticated confirmation requests applied those review decisions. Cross-owner confirmation, forged secrets, cancellation, replay, foreign-record reads, invalid requests and provider errors were exercised against real HTTP handlers. This is combined scoped evidence, **not one uninterrupted full acceptance pass**.

The run found and repaired a real validator gap that rejected seven advertised financial tools before executor dispatch. Thirty-two new unit regressions cover dispatch, malformed/protected fields and live-mode denial. Actual-model work-order and invoice-review execution then succeeded. The completion allowance is now bounded at 2,048 tokens; response-byte, request-time and step/tool limits remain. Earlier 900-token truncation/empty-result failures are retained, not converted to successes. A conflicting fixture request was correctly refused by the model; the fixture IDs were corrected. Another harness request omitted its required clarification description and was rejected by the API; that harness input was corrected without changing application validation.

## Reproduce after provider quota is available

Use Node 24 and install `apps/owner` dependencies with its lockfile. From the canonical `apps/owner` directory on PowerShell:

```powershell
$env:NNETICS_RUN_REAL_MODEL_ACCEPTANCE = '1'
npm run test:real-model
```

On a constrained workstation with an existing canonical development preview, use a **separate clean local checkout of the same reviewed source** with its own installed `apps/owner/node_modules`:

```powershell
$env:NNETICS_RUN_REAL_MODEL_ACCEPTANCE = '1'
$env:NNETICS_ACCEPTANCE_APP_DIR = 'C:\path\to\isolated-checkout\apps\owner'
npm run test:real-model
```

Invoke the harness from the canonical app. It verifies matching server source files before using the alternate checkout. It reads the actual configured model/key from the canonical private environment or the process environment, passes only those provider settings to its child, and does not copy the private environment into the test checkout. The child server receives five fresh temporary database paths and blank transaction/payment/provisioning flags. It starts no worker and performs no blockchain call.

The harness owns its local server on port 3122 (`NNETICS_ACCEPTANCE_PORT` can choose another free port) and rejects an occupied port. Development-only execution traces identify the real model-selected tool names; the test adapter is never installed. Production UI behavior is verified separately by the secretless production browser suite.

Evidence is written under ignored `artifacts/final-real-model/<timestamp>/`: `acceptance.json`, actual response/execution data in `responses.private.json`, and server logs. Never publish cookies, private invitations or full private logs. The committed sanitized summary reports statuses/tool names/hashes and the evidence chain without those capabilities.

Scoped continuation is supported through `NNETICS_ACCEPTANCE_REMAINING`, `NNETICS_ACCEPTANCE_PRIOR_EVIDENCE`, `NNETICS_ACCEPTANCE_SHORT_REQUESTS`, and the `NNETICS_ACCEPTANCE_SKIP_VERIFIED_*` flags. Skip flags require recorded successful prior tools. Review the evidence chain and source hashes; they are not permission to invent prior passes. Ordinary fresh acceptance should leave continuation flags unset.

To finish the four outstanding tools after quota restoration, run this exact continuation from the canonical `apps/owner` directory (it uses the latest blocked-run evidence as its prior chain):

```powershell
$env:NNETICS_RUN_REAL_MODEL_ACCEPTANCE = '1'
$env:NNETICS_ACCEPTANCE_REMAINING = '1'
$env:NNETICS_ACCEPTANCE_SHORT_REQUESTS = '1'
$env:NNETICS_ACCEPTANCE_SKIP_VERIFIED_ORDERS = '1'
$env:NNETICS_ACCEPTANCE_SKIP_VERIFIED_READS = '1'
$env:NNETICS_ACCEPTANCE_SKIP_VERIFIED_REVIEW = '1'
$env:NNETICS_ACCEPTANCE_PRIOR_EVIDENCE = (Resolve-Path '../../artifacts/final-real-model/2026-11-13T01-07-59.070Z/acceptance.json').Path
npm run test:real-model
```

On a provider error, inspect the persisted workspace before retrying: a tool may have committed a change before a later model step failed. There is no automatic mutation retry. Restore provider availability or explicitly review a configuration change before running the outstanding scenarios. Do not change transaction gates to address a model quota problem.

Full acceptance requires all scenarios, confirmation/rejection checks, original-record preservation and the final restart-persistence check to complete, with every advertised tool accounted for. The current run did **not** reach full completion or its final model-suite restart check; backend/browser persistence coverage remains separate evidence. See [the final verification report](final-release-verification.md).
