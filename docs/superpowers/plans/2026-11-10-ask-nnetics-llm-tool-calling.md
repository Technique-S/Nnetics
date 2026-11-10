# Ask Nnetics LLM tool-calling implementation plan

1. Add `agent-model.ts`: OpenRouter adapter, bounded response parsing, structured errors, test adapter override, development observer.
2. Add `agent-tool-catalog.ts`: mode-aware definitions, JSON schemas, risk/confirmation metadata, capability/unsupported text.
3. Add `agent-runtime.ts`: system prompt, bounded history, verified references, validation, tool loop, dedupe, step-limit summary, action chips.
4. Fix the executor's genuinely broken demo read paths: contractor invoices, invoices by owner snapshot, contractor lookup by ID/name, organization overview, transaction contractor fields; require explicit demo tokens.
5. Return the created profile ID from `create-profile` and use it in `createContractor`.
6. Rewrite `/api/agent` around authenticated context + the model loop; remove parser/formatter routing; add explicit error mapping, dev headers, idempotency cache.
7. Update the client to send an idempotency key and use accurate capability copy; extend chip navigation for vault/invoice actions.
8. Add controlled-provider route tests A-K and provider-adapter unit tests.
9. Add a real-provider HTTP smoke script.
10. Run typecheck, tests, build; run the smoke test and browser acceptance; fix regressions.
11. Produce the final report with a real model -> tool -> model trace.
