// Real-provider smoke test for Ask Nnetics.
//
// This script talks to a running development server over HTTP. It creates a
// fresh demo workspace and owner portal, then sends ordinary requests through
// /api/agent. The server uses its configured OpenRouter credentials; this
// script never reads or prints the API key.
//
// Usage:
//   npm run agent:smoke
//   NNETICS_APP_ORIGIN=http://127.0.0.1:3100 npm run agent:smoke
import assert from "node:assert/strict";

const base = (process.env.NNETICS_APP_ORIGIN || "http://127.0.0.1:3100").replace(/\/$/, "");
const origin = new URL(base).origin;
const cookies = new Map<string, string>();
const suffix = Date.now().toString(36);
const contractorName = `Smoke Check ${suffix}`;

function cookieHeader() {
  return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function rememberCookies(response: Response) {
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(";", 1)[0];
    const index = pair.indexOf("=");
    if (index > 0) cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
}

async function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("origin", origin);
  if (cookies.size) headers.set("cookie", cookieHeader());
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${base}${path}`, { ...init, headers, redirect: "error" });
  rememberCookies(response);
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { response, data: data as Record<string, any> };
}

function expectOk(response: Response, data: Record<string, any>, label: string) {
  if (!response.ok) {
    const safe = typeof data?.error === "string" ? data.error : "request failed";
    throw new Error(`${label}: HTTP ${response.status} (${safe})`);
  }
}

async function agent(message: string, key: string) {
  const { response, data } = await request("/api/agent", {
    method: "POST",
    body: JSON.stringify({ message, conversationHistory: [], idempotencyKey: key }),
  });
  expectOk(response, data, `/api/agent ${message}`);
  assert.equal(data.mode, "demo");
  assert.equal(typeof data.reply, "string");
  assert.ok(data.reply.trim().length > 0);
  assert.equal(data.provider, "openrouter");
  assert.match(String(data.model), /gpt-4o-mini/);
  assert.ok(Number(data.modelCalls) >= 1, "expected at least one model call");
  return {
    response,
    data,
    trace: {
      requestId: data.requestId,
      provider: data.provider,
      model: data.model,
      modelCalls: data.modelCalls,
      toolCalls: data.toolCalls,
      stepLimitReached: data.stepLimitReached,
      headerRequestId: response.headers.get("x-agent-request-id"),
      headerModel: response.headers.get("x-agent-model"),
      executions: data.executions,
      reply: data.reply,
    },
  };
}

const health = await request("/api/health");
expectOk(health.response, health.data, "/api/health");

const workspace = await request("/api/demo/workspace/start", { method: "POST" });
expectOk(workspace.response, workspace.data, "demo workspace start");

const created = await request("/api/demo/workspace/create", {
  method: "POST",
  body: JSON.stringify({ profileName: "Smoke Owner", vaultName: "Smoke Vault" }),
});
expectOk(created.response, created.data, "demo workspace create");

const funded = await request("/api/demo/workspace/fund", {
  method: "POST",
  body: JSON.stringify({ amount: "2" }),
});
expectOk(funded.response, funded.data, "demo workspace fund");

const portal = await request("/api/demo/contractors/owner/start", {
  method: "POST",
  body: JSON.stringify({}),
});
expectOk(portal.response, portal.data, "demo portal start");

const creation = await agent(
  `Create a contractor named ${contractorName}`,
  `smoke-create-${suffix}`,
);
assert.ok(Number(creation.data.toolCalls) >= 1, "the model did not execute a tool");
assert.match(creation.data.reply, new RegExp(contractorName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

const snapshot = await request("/api/demo/contractors/owner");
expectOk(snapshot.response, snapshot.data, "portal snapshot");
const saved = (snapshot.data.profiles as Array<{ id: string; name: string }>)
  .find((profile) => profile.name === contractorName);
assert.ok(saved, "the created contractor was not persisted");
const contractorId = saved!.id;

const count = await agent("How many contractors do I have?", `smoke-count-${suffix}`);
assert.ok(Number(count.data.toolCalls) >= 1, "the count answer did not come from a tool");
assert.match(count.data.reply, /\b1\b/);

const vault = await agent("What is my vault balance?", `smoke-vault-${suffix}`);
assert.ok(Number(vault.data.toolCalls) >= 1, "the vault answer did not come from a tool");
assert.match(vault.data.reply, /2(?:\.0+)?\s*NEAR/i);

const deletion = await agent(
  `Delete the contractor ${contractorName}`,
  `smoke-delete-${suffix}`,
);
assert.match(
  deletion.data.reply,
  /not available|not supported|cannot|can't|unavailable|isn't possible|is not possible/i,
);

const after = await request("/api/demo/contractors/owner");
expectOk(after.response, after.data, "portal snapshot after deletion request");
assert.ok(
  (after.data.profiles as Array<{ id: string }>).some((profile) => profile.id === contractorId),
  "the deletion request changed the contractor record",
);

console.log(JSON.stringify({
  ok: true,
  origin,
  contractor: { id: contractorId, name: contractorName },
  traces: {
    create: creation.trace,
    count: count.trace,
    vault: vault.trace,
    delete: deletion.trace,
  },
}, null, 2));
