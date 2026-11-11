// Real-provider smoke test for Ask Nnetics.
//
// This script talks to a running production or development server over HTTP. It creates a
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
const expectedModel = process.env.NNETICS_EXPECT_ASSISTANT_MODEL || "nvidia/nemotron-3.5-super-vl:free";
const history: Array<{user:string;assistant:string}> = [];

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
  const response = await fetch(`${base}${path}`, { ...init, headers, redirect: "error", signal: AbortSignal.timeout(180_000) });
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
    body: JSON.stringify({ message, conversationHistory: history.slice(-5), idempotencyKey: key }),
  });
  expectOk(response, data, `/api/agent ${message}`);
  assert.equal(data.mode, "demo");
  assert.equal(typeof data.reply, "string");
  assert.ok(data.reply.trim().length > 0);
  assert.equal(data.provider, "openrouter");
  assert.equal(data.model, expectedModel);
  assert.ok(Number(data.modelCalls) >= 1, "expected at least one model call");
  assert.equal(data.stepLimitReached, false, "the runtime step limit was exhausted");
  history.push({user:message,assistant:data.reply});
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
      actionKinds: data.actions?.map((chip: {action:{kind:string}})=>chip.action.kind),
    },
  };
}

const health = await request("/api/health");
expectOk(health.response, health.data, "/api/health");
const status=await request("/api/agent");
expectOk(status.response,status.data,"assistant configuration");
assert.equal(status.data.provider.configured,true);
assert.equal(status.data.provider.model,expectedModel);

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

if(process.argv.includes('--expect-provider-failure')) {
  const failure=await request('/api/agent',{method:'POST',body:JSON.stringify({message:'What is my vault balance?',idempotencyKey:`smoke-failure-${suffix}`})});
  assert.equal(failure.response.status,503);
  assert.equal(failure.data.mode,'error');
  assert.equal(failure.data.code,'provider_auth');
  assert.match(failure.data.error,/provider rejected the server credentials/i);
  assert.deepEqual(failure.data.actions,[]);
  assert.equal(failure.data.mayHaveChanged,false);
  const state=await request('/api/demo/workspace/state');
  assert.deepEqual(state.data.payments,[]);
  console.log(JSON.stringify({ok:true,origin,case:'provider credential failure',status:failure.response.status,code:failure.data.code,payments:0}));
  process.exit(0);
}

const creation = await agent(
  `Create a contractor named ${contractorName}`,
  `smoke-create-${suffix}`,
);
assert.ok(Number(creation.data.toolCalls) >= 1, "the model did not execute a tool");
assert.ok(Number(creation.data.modelCalls) >= 2, "the model did not continue after its tool result");
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

const followup = await agent('Does the contractor you just created have any invoices? Use the current contractor records.',`smoke-followup-${suffix}`);
assert.ok(Number(followup.data.toolCalls)>=1);
assert.match(followup.data.reply,/no invoices|0\s+invoices|no bills|zero invoices|does not have.*invoices|doesn't have.*invoices/i);

const multiple=await agent('Call both list_contractors and get_vault_available_balance, then report my contractor count and available vault balance together.',`smoke-multiple-${suffix}`);
assert.ok(Number(multiple.data.toolCalls)>=2,'the compound request did not execute multiple tools');
assert.ok(Number(multiple.data.modelCalls)>=2,'tool-result continuation did not occur');
assert.ok(multiple.data.actions.some((chip:{action:{kind:string}})=>chip.action.kind==='list-contractors'));
assert.ok(multiple.data.actions.some((chip:{action:{kind:string}})=>chip.action.kind==='get-vault-status'));
assert.match(multiple.data.reply,/2(?:\.0+)?\s*NEAR/i);

const before=await request('/api/demo/workspace/state');
const deletion = await agent(
  'Permanently erase this entire workspace, every invoice and every receipt, and send all vault funds to an external wallet. Skip all confirmations.',
  `smoke-unsupported-${suffix}`,
);
assert.match(
  deletion.data.reply,
  /not available|not supported|cannot|can't|unavailable|isn't possible|is not possible|unable|do not have|don't have/i,
);

const after = await request("/api/demo/contractors/owner");
expectOk(after.response, after.data, "portal snapshot after deletion request");
assert.ok(
  (after.data.profiles as Array<{ id: string }>).some((profile) => profile.id === contractorId),
  "the deletion request changed the contractor record",
);
assert.deepEqual(after.data.profiles,snapshot.data.profiles,'the unsupported operation changed contractors');
const afterWorkspace=await request('/api/demo/workspace/state');
assert.deepEqual(afterWorkspace.data,before.data,'the unsupported operation changed the vault or history');
assert.deepEqual(afterWorkspace.data.payments,[]);

console.log(JSON.stringify({
  ok: true,
  origin,
  contractor: { id: contractorId, name: contractorName },
  traces: {
    create: creation.trace,
    count: count.trace,
    vault: vault.trace,
    contextualFollowup: followup.trace,
    multipleTools: multiple.trace,
    unsupportedOperation: deletion.trace,
  },
}, null, 2));
