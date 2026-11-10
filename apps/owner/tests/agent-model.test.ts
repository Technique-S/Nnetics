// Unit tests for the OpenRouter adapter. These prove native tool calling,
// bounded response handling, and explicit error classification. No real network
// request is made and no credential is printed.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AgentModelError,
  OpenRouterAgentAdapter,
  configuredAgentAdapter,
  setAgentModelAdapterForTests,
  type AgentModelRequest,
} from "../src/server/agent-model.ts";

const TOOL = {
  type: "function" as const,
  function: {
    name: "list_contractors",
    description: "List contractors",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
};

function request(overrides: Partial<AgentModelRequest> = {}): AgentModelRequest {
  return {
    messages: [{ role: "user", content: "how many contractors?" }],
    tools: [TOOL],
    toolChoice: "auto",
    ...overrides,
  };
}

function completion(message: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({
    id: "gen-test",
    choices: [{ index: 0, message, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    ...extra,
  }), { status: 200, headers: { "content-type": "application/json", "x-request-id": "req-test" } });
}

test("adapter sends native tool definitions and parses a tool call without leaking the key", async () => {
  let capturedUrl = "";
  let capturedHeaders: Headers | null = null;
  let capturedBody: Record<string, unknown> | null = null;
  const adapter = new OpenRouterAgentAdapter({
    apiKey: "test-key-not-real",
    model: "openai/gpt-4o-mini",
    request: (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedHeaders = new Headers(init?.headers);
      capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return completion({
        role: "assistant",
        content: null,
        tool_calls: [{
          id: "call-1",
          type: "function",
          function: { name: "list_contractors", arguments: "{}" },
        }],
      });
    }) as typeof fetch,
  });

  const response = await adapter.complete(request());
  assert.equal(capturedUrl, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(capturedHeaders!.get("authorization"), "Bearer test-key-not-real");
  assert.equal(capturedBody!.model, "openai/gpt-4o-mini");
  assert.deepEqual(capturedBody!.provider, { require_parameters: true });
  assert.equal(capturedBody!.tool_choice, "auto");
  assert.deepEqual(capturedBody!.tools, [TOOL]);
  assert.equal(response.toolCalls.length, 1);
  assert.equal(response.toolCalls[0].function.name, "list_contractors");
  assert.equal(response.toolCalls[0].function.arguments, "{}");
  assert.equal(response.providerRequestId, "req-test");
  assert.equal(JSON.stringify(response).includes("test-key-not-real"), false);
});

test("adapter accepts a normal text answer and content parts", async () => {
  const text = new OpenRouterAgentAdapter({
    apiKey: "k",
    model: "m",
    request: (async () => completion({ role: "assistant", content: "  Three contractors.  " })) as typeof fetch,
  });
  const answer = await text.complete(request());
  assert.equal(answer.content, "  Three contractors.  ");
  assert.equal(answer.toolCalls.length, 0);

  const parts = new OpenRouterAgentAdapter({
    apiKey: "k",
    model: "m",
    request: (async () => completion({ role: "assistant", content: [{ type: "text", text: "Part " }, { type: "text", text: "answer" }] })) as typeof fetch,
  });
  assert.equal((await parts.complete(request())).content, "Part answer");
});

test("provider status failures map to explicit, safe categories", async () => {
  const cases: Array<{ status: number; body?: string; code: string; http: number }> = [
    { status: 401, code: "provider_auth", http: 503 },
    { status: 403, code: "provider_auth", http: 503 },
    { status: 404, code: "unsupported_model", http: 502 },
    { status: 429, code: "rate_limit", http: 429 },
    { status: 500, code: "provider_unavailable", http: 503 },
    { status: 503, body: "provider-secret-detail", code: "provider_unavailable", http: 503 },
    { status: 400, body: "maximum context length exceeded", code: "context_length", http: 413 },
    { status: 422, code: "provider_rejected", http: 502 },
  ];
  for (const item of cases) {
    const adapter = new OpenRouterAgentAdapter({
      apiKey: "k",
      model: "m",
      request: (async () => new Response(item.body ?? "provider-secret-detail", { status: item.status })) as typeof fetch,
    });
    await assert.rejects(
      () => adapter.complete(request()),
      (error: unknown) => {
        assert.ok(error instanceof AgentModelError);
        assert.equal(error.code, item.code);
        assert.equal(error.status, item.http);
        assert.equal(error.message.includes("provider-secret-detail"), false);
        return true;
      },
    );
  }
});

test("rate limits and unavailability are marked retryable; auth failures are not", async () => {
  const make = (status: number) => new OpenRouterAgentAdapter({
    apiKey: "k",
    model: "m",
    request: (async () => new Response("x", { status })) as typeof fetch,
  });
  await assert.rejects(() => make(429).complete(request()), (error: unknown) =>
    error instanceof AgentModelError && error.retryable === true);
  await assert.rejects(() => make(500).complete(request()), (error: unknown) =>
    error instanceof AgentModelError && error.retryable === true);
  await assert.rejects(() => make(401).complete(request()), (error: unknown) =>
    error instanceof AgentModelError && error.retryable === false);
});

test("malformed, empty, truncated and oversized responses never become answers", async () => {
  const malformed = new OpenRouterAgentAdapter({
    apiKey: "k",
    model: "m",
    request: (async () => new Response("{not-json", { status: 200 })) as typeof fetch,
  });
  await assert.rejects(() => malformed.complete(request()), (error: unknown) =>
    error instanceof AgentModelError && error.code === "model_response_invalid");

  const empty = new OpenRouterAgentAdapter({
    apiKey: "k",
    model: "m",
    request: (async () => new Response(JSON.stringify({ choices: [] }), { status: 200 })) as typeof fetch,
  });
  await assert.rejects(() => empty.complete(request()), (error: unknown) =>
    error instanceof AgentModelError && error.code === "model_response_invalid");

  const truncated = new OpenRouterAgentAdapter({
    apiKey: "k",
    model: "m",
    request: (async () => new Response(JSON.stringify({
      choices: [{ message: { role: "assistant", content: "cut off" }, finish_reason: "length" }],
    }), { status: 200 })) as typeof fetch,
  });
  await assert.rejects(() => truncated.complete(request()), (error: unknown) =>
    error instanceof AgentModelError && error.code === "model_response_invalid");

  const oversized = new OpenRouterAgentAdapter({
    apiKey: "k",
    model: "m",
    maxResponseBytes: 16,
    request: (async () => new Response("x".repeat(1024), { status: 200 })) as typeof fetch,
  });
  await assert.rejects(() => oversized.complete(request()), (error: unknown) =>
    error instanceof AgentModelError && error.code === "model_response_invalid");

  const badTool = new OpenRouterAgentAdapter({
    apiKey: "k",
    model: "m",
    request: (async () => completion({
      role: "assistant",
      content: null,
      tool_calls: [{ id: "call", type: "function", function: { name: "", arguments: "{}" } }],
    })) as typeof fetch,
  });
  await assert.rejects(() => badTool.complete(request()), (error: unknown) =>
    error instanceof AgentModelError && error.code === "model_response_invalid");
});

test("network failure and timeout are explicit provider unavailability", async () => {
  const offline = new OpenRouterAgentAdapter({
    apiKey: "k",
    model: "m",
    request: (async () => { throw new TypeError("fetch failed"); }) as typeof fetch,
  });
  await assert.rejects(() => offline.complete(request()), (error: unknown) =>
    error instanceof AgentModelError && error.code === "provider_unavailable" && error.retryable);

  const timeout = new OpenRouterAgentAdapter({
    apiKey: "k",
    model: "m",
    request: (async () => { throw new DOMException("timed out", "TimeoutError"); }) as typeof fetch,
  });
  await assert.rejects(() => timeout.complete(request()), (error: unknown) =>
    error instanceof AgentModelError && error.code === "provider_unavailable" && error.retryable);
});

test("missing credentials fail explicitly and the test override is disabled in production", async () => {
  const env = process.env as Record<string, string | undefined>;
  const savedKey = process.env.OPENROUTER_API_KEY;
  const savedModel = process.env.NNETICS_ASSISTANT_MODEL;
  const savedEnv = env.NODE_ENV;
  try {
    setAgentModelAdapterForTests(null);
    delete process.env.OPENROUTER_API_KEY;
    assert.throws(() => configuredAgentAdapter(), (error: unknown) =>
      error instanceof AgentModelError && error.code === "provider_not_configured");

    env.NODE_ENV = "production";
    assert.throws(() => setAgentModelAdapterForTests({
      provider: "test",
      model: "test",
      complete: async () => ({ content: "x", toolCalls: [] }),
    }), /disabled in production/);
  } finally {
    if (savedKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = savedKey;
    if (savedModel === undefined) delete process.env.NNETICS_ASSISTANT_MODEL;
    else process.env.NNETICS_ASSISTANT_MODEL = savedModel;
    if (savedEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = savedEnv;
    setAgentModelAdapterForTests(null);
  }
});
