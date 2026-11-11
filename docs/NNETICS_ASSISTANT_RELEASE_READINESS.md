# Ask Nnetics local production readiness

Verified 11 November 2026 against integration baseline `ac3b68e` and the assistant configuration follow-up. The requested release target is **local production**, per the owner's clarification. **GO for local production.** The assistant configuration blocker is resolved for that target.

## Selected model and persistent configuration

`NNETICS_ASSISTANT_MODEL=nvidia/nemotron-3.5-super-vl:free`

This is the same model that passed the earlier real Ask Nnetics acceptance. No alternative model was silently substituted. OpenRouter's [model endpoint metadata](https://openrouter.ai/api/v1/models/nvidia/nemotron-3.5-super-vl:free/endpoints) was checked during this verification: the available NVIDIA endpoint advertises `tools`, `tool_choice`, `temperature`, `max_tokens`, a 1,000,000-token context and zero prompt/completion token prices. Successful real requests, rather than metadata alone, establish acceptance below. Free capacity and rate limits remain provider-controlled.

| Setting | Final state |
| --- | --- |
| `NNETICS_ASSISTANT_MODEL` | Saved in the owner's ignored `apps/owner/.env.local`; the example configuration now uses the same identifier. |
| `OPENROUTER_API_KEY` | Existing credential retained unchanged in the server's ignored environment file. Value never printed or committed. |
| Model adapter | Existing `OpenRouterAgentAdapter`, ordinary production configuration path. |
| Provider endpoint | `https://openrouter.ai/api/v1/chat/completions`. |
| Runtime loading | Next loads `.env.local` from `apps/owner` when the production process starts. Model/key variables were absent from the launch environment in the successful production and restart tests. |
| Overrides and fallback | The previous one-process model override is no longer required. No scripted answer fallback, adapter injection or alternative model was used. |
| Client secret exposure | All 28 files in the built client/static output scanned; the real API key was absent. |

`agent:smoke` no longer loads `.env.local` into its HTTP client process. The running application alone needs the provider credential. The smoke test checks the selected model reported by the server and real model/tool counters, not a hardcoded assumption about the former paid model.

## Real-provider acceptance

The completed production build ran at `http://127.0.0.1:3120` with isolated SQLite demo stores. Every successful request reported the selected model, provider `openrouter`, and `stepLimitReached=false`.

| Request | Model calls | Executed tools | Verification |
| --- | ---: | ---: | --- |
| Create contractor | 2 | 1 | Real contractor persisted in the authenticated demo store; navigation action returned. |
| Retrieve contractor count | 2 | 1 | Returned one contractor using the current store. |
| Retrieve vault balance | 2 | 1 | Returned the actual funded demo balance, 2 NEAR. |
| Contextual invoice follow-up | 2 | 1 | Resolved the contractor from conversation context and returned its empty invoice state. |
| Count and balance together | 2 | 2 | Both `list_contractors` and `get_vault_available_balance` executed; both corresponding navigation actions returned. |
| Erase workspace/history and send vault funds externally | 1 | 0 | Explicit refusal, no actions, contractor and complete workspace state unchanged, no payments created. |

The two model calls on tool-using requests confirm native tool selection followed by tool-result continuation. The compound request exercised two tools in the first model response and continuation in the second call. The existing runtime includes tool schemas on every provider request, returns each result with its matching `tool_call_id`, and requires parameter-compatible provider routing. This matches [OpenRouter's tool-calling protocol](https://openrouter.ai/docs/guides/features/tool-calling).

The tested behavior fits the unchanged runtime limits: 30 seconds per provider call, 900 output tokens per call, six model steps, eight tool calls, five retained conversation turns and a 256 KiB response bound. Production test-adapter injection remains disabled.

## Failure, restart and isolation

A separate production process used an intentionally invalid test credential, supplied only to that process. Its real OpenRouter request produced an explicit HTTP 503 / `provider_auth` application error, no action chips and `mayHaveChanged=false`. The browser displayed **Request failed** and the credential-configuration explanation. No payment was created. That fault process was stopped; the valid persisted credential was never changed.

The valid production process was then stopped and restarted with the same persistent demo store paths and no model/key launch overrides. The same browser session reopened its saved contractor. An Ask Nnetics count request completed after restart with two real model calls and one executed tool. The private temporary browser session file was removed after verification.

The ordinary API reported `transactionsEnabled=false`, `ownerTransactionsEnabled=false` and `paymentExecutionEnabled=false`. The live assistant catalog had zero read/write tools. Browser regressions confirmed demo payment isolation, pause/resume, receipt access, contractor lifecycle, fresh sessions, routing and owner separation. No live signing or transactions occurred.

## Production verification results

| Check | Result |
| --- | --- |
| Repository unit tests | 42 passed, 0 failed. |
| Owner unit tests | 323 passed, 0 failed; 365 unit tests total. |
| Typecheck | Passed. |
| Production build | Passed, isolated `.next-hosting` output. |
| Relevant browser regressions | 30 passed, 0 failed, desktop and mobile. |
| Real provider smoke | All six requests above passed. |
| Provider failure | API and browser error reporting passed using the dedicated fault process. |
| Production restart | Existing session/contractor retained; real model and tool execution passed. |
| Client credential scan | Passed, 28 client/static files checked. |

Local evidence is under ignored `apps/owner/artifacts`: `assistant-real-provider.log`, `assistant-provider-failure.log`, `assistant-failure-ui.log`, `assistant-restart-after.log`, `assistant-regression-browser.log`, `assistant-unit.log`, `assistant-typecheck.log`, `assistant-build.log` and `assistant-secret-scan.log`. The persisted test data is isolated under ignored repository `artifacts/assistant-production`. No secrets, private browser session state or full provider payloads are published in this report.

## Running locally

Keep the configured `.env.local` in `apps/owner`. Next loads it on each normal production start. For a normal default build, run `npm run typecheck`, `npm run build` and `npm run start` from that directory. No assistant-model export or development override is needed.

The verified isolated server remains available at [the local production demo](http://127.0.0.1:3120/?mode=demo). It uses `NNETICS_BUILD_DIRECTORY=.next-hosting`, `NNETICS_APP_ORIGIN=http://127.0.0.1:3120`, and persistent acceptance database paths. Build/type generation completed before starting the server. Use one origin consistently for browser sessions.

To repeat the real-provider checks against that server, set `NNETICS_APP_ORIGIN=http://127.0.0.1:3120` for the smoke client and run `npm run agent:smoke`. The `--expect-provider-failure` option is only for a separately isolated production process intentionally configured with an invalid credential; never replace the valid credential to test that case.

## Remaining deployment scope

There are no unresolved local assistant configuration blockers. The API key remains a private machine setting and must be preserved locally; it is deliberately absent from Git. Provider quota, future model availability and internet connectivity remain operational dependencies with explicit errors.

Remote hosting is outside the clarified scope. The older Render blueprint and bounded hosted launcher remain unchanged: the launcher still rejects provider keys under its earlier acceptance policy. A future hosted rollout therefore needs its own service binding, server-side secret provisioning, reviewed launcher-policy update and hosted acceptance. This local **GO** does not claim that a remote deployment has been configured or released.
