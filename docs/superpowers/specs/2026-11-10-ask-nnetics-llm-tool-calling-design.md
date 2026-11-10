# Ask Nnetics: model-driven tool calling

Date: 2026-11-10
Status: approved by the user's implementation request; minimum-change design.

## Problem

`POST /api/agent` authenticates the request, runs `parseMessageToTool`, executes one tool, and formats a hardcoded reply. The configured OpenRouter model is only used by the separate `/api/demo/assistant` endpoint, which has no tools, uses a fixed JSON action allowlist, and silently falls back to scripted replies. Ask Nnetics therefore never receives tool definitions, never selects a tool, never receives tool results, and never writes the final answer.

## Provider

- Existing provider: OpenRouter, OpenAI-compatible chat completions.
- Endpoint: `https://openrouter.ai/api/v1/chat/completions`.
- Configured model: `openai/gpt-4o-mini` from `NNETICS_ASSISTANT_MODEL`.
- Key: server-only `OPENROUTER_API_KEY`.
- OpenRouter metadata for this model advertises `tools` and `tool_choice` on the OpenAI endpoint. Requests use `provider.require_parameters = true` so a tool-capable provider is selected.
- No new provider or SDK is introduced.

## Architecture

```text
POST /api/agent
  -> origin / JSON validation
  -> demo or live authentication (existing cookies / identity)
  -> bounded, sanitized conversation history
  -> mode-aware tool catalog (implemented and authorized tools only)
  -> OpenRouter adapter, native tools + tool_choice=auto
  -> bounded model/tool loop (max 6 steps)
       model -> validate name/args -> execute AgentToolExecutor
             -> append tool result -> model
  -> final model answer
  -> action chips derived from successful tool executions
  -> structured response; provider failures are explicit
```

The deterministic parser and hardcoded response formatters are removed from the request path. They are not used as a fallback. Missing configuration and provider failures return an explicit error and never execute a scripted answer.

## Tool catalog

Only tools that are actually implemented in the current mode are exposed.

Demo mode, read:

- `list_contractors`
- `get_contractor` (record ID or exact case-insensitive name)
- `get_contractor_invoices`
- `get_vault_status`
- `get_vault_available_balance`
- `get_vault_balance` (lifetime funded, explicitly not spendable)
- `get_vault_transaction_history`
- `list_invoices`
- `get_invoice`
- `get_organization_overview`

Demo mode, write:

- `create_contractor` (risk: write; the user's explicit request is the consent; no payment)

Live mode exposes no tools because the existing executor's live paths are stubs. The model explains that live agent operations are unavailable rather than pretending.

Unsupported through Ask Nnetics and stated in the system prompt: deleting/archiving contractors, editing contractor details, portal link management, wallet approval, work orders, invoice review, payment drafts, payment execution, and live blockchain operations.

## Authorization

- The request's authenticated demo cookies or identity are resolved before the model is called.
- The model never receives an organization ID, demo token, cookie, API key, or wallet credential.
- Tool arguments only select records inside the authenticated organization.
- `AgentToolExecutor` resolves every record from the authenticated owner snapshot; name and ID references are revalidated server-side.
- The model cannot request an arbitrary organization or tool. Unknown tools and invalid arguments become tool error messages, not execution.
- The only mutation is `create_contractor`. Duplicate calls in one run are deduplicated by tool name + normalized arguments. The route also supports an optional client idempotency key for sequential HTTP retries.

## Conversation context

- The client transcript is untrusted display data.
- At most five well-formed user/assistant turns are passed, in chronological order, with length caps.
- Client-provided history is never treated as tool output, authorization, or proof that an action happened.
- Named contractor references in history are resolved against the authenticated contractor records before being included as verified references.
- `get_contractor` accepts a name so follow-ups such as "show me his details" resolve without trusting a client-supplied ID.

## Provider errors

Structured categories: not configured, authentication, unsupported model, rate limit, context length, provider unavailable, protocol/response error, invalid tool arguments, unknown tool, authorization, conversation context, step limit, internal.

The UI receives a short, user-friendly message and a stable code. Raw provider bodies, headers, keys, cookies, and stack traces are never returned. Provider failures are not converted into deterministic answers.

## Observability

Development only, via structured `console.info` events and response headers:

- request attempted
- provider and model
- provider request/trace ID when present
- response received
- tool calls requested and executed
- tool results returned to the model
- final response generated
- model call and tool call counts

No message bodies, tool arguments, credentials, cookies, or tokens are logged. Production exposes none of these headers.

## Verification

- Controlled-provider tests through the actual route for A-K: creation, counting, listing, capabilities, vault, context, deletion intent, multi-tool, outage, invocation proof, and security/integrity.
- A real-provider smoke script against the running app.
- Browser acceptance through the existing demo walkthrough and Ask Nnetics.
- Full regression, typecheck, and production build.
