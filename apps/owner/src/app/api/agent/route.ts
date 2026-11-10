// Ask Nnetics - model-driven tool calling.
//
// Authentication and authorization happen before the model is contacted. The
// model receives only the tools that are actually implemented for this mode,
// chooses the tool calls, and receives the executor's real results. There is no
// keyword parser and no scripted fallback: provider failures are explicit.
import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server.js";
import { AgentToolExecutor } from "../../../server/agent-tool-executor.ts";
import { identityService } from "../../../server/identity.ts";
import { demoWorkspace } from "../../../server/demo-workspace.ts";
import { demoContractors } from "../../../server/demo-contractors.ts";
import { isAllowedAppOrigin } from "../../../server/origin.ts";
import {
  AgentModelError,
  configuredAgentAdapter,
  developmentObserver,
  newRequestId,
  providerStatus,
} from "../../../server/agent-model.ts";
import {
  actionChips,
  runAgent,
  verifiedContractorReferences,
  type AgentConversationTurn,
  type AgentToolExecution,
  type AgentVerifiedReference,
} from "../../../server/agent-runtime.ts";
import {
  catalogForMode,
  capabilitySummary,
  type AgentMode,
} from "../../../server/agent-tool-catalog.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32 * 1024;
const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_TURNS = 5;
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const IDEMPOTENCY_MAX_ENTRIES = 500;

class AgentRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;
  constructor(status: number, code: string, message: string, retryable = false) {
    super(message);
    this.name = "AgentRequestError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

interface VerifiedContext {
  mode: AgentMode;
  orgId: string;
  demoWorkspaceToken?: string;
  demoPortalToken?: string;
  verifiedReferences: AgentVerifiedReference[];
  // Stable, non-secret scope for the idempotency cache. Raw cookies are never
  // used as cache keys.
  scope: string;
}

interface CachedIdempotentRun {
  fingerprint: string;
  writeCache: Map<string, AgentToolExecution>;
  response?: { body: Record<string, unknown>; status: number };
  expires: number;
}

const idempotencyRuns = new Map<string, CachedIdempotentRun>();

const json = (data: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      ...extraHeaders,
    },
  });

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

async function readJsonBody(req: NextRequest): Promise<Record<string, unknown>> {
  const reader = req.body?.getReader();
  if (!reader) throw new AgentRequestError(400, "invalid_request", "Send a JSON request body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.length;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new AgentRequestError(413, "request_too_large", "The request is too large.");
    }
    chunks.push(part.value);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks, size).toString("utf8"));
  } catch {
    throw new AgentRequestError(400, "invalid_request", "Send a valid JSON request body.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new AgentRequestError(400, "invalid_request", "Send a JSON object as the request body.");
  return parsed as Record<string, unknown>;
}

function readConversationHistory(value: unknown): AgentConversationTurn[] {
  if (!Array.isArray(value)) return [];
  const turns: AgentConversationTurn[] = [];
  for (const item of value.slice(-10)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const user = typeof record.user === "string" ? record.user : typeof record.message === "string" ? record.message : "";
    const assistant = typeof record.assistant === "string" ? record.assistant : typeof record.reply === "string" ? record.reply : "";
    if (!user.trim() || !assistant.trim()) continue;
    turns.push({ user: user.slice(0, MAX_MESSAGE_CHARS), assistant: assistant.slice(0, 4000) });
  }
  return turns.slice(-MAX_HISTORY_TURNS);
}

function idempotencyKeyOf(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new AgentRequestError(400, "invalid_idempotency_key", "The idempotency key must be a string.");
  if (value.length < 8 || value.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(value))
    throw new AgentRequestError(400, "invalid_idempotency_key", "Use an idempotency key of 8-128 letters, digits, dots, dashes, underscores or colons.");
  return value;
}

// A demo session exists only when both signed cookies resolve. An incomplete or
// expired demo session is ignored so a live identity request can still proceed.
function demoSession(req: NextRequest): { workspaceToken: string; portalToken: string } | null {
  const workspaceToken = req.cookies.get("nnetics_demo_workspace")?.value ?? "";
  const portalToken = req.cookies.get("nnetics_demo_portal_owner")?.value ?? "";
  if (!workspaceToken || !portalToken) return null;
  try {
    demoWorkspace().state(workspaceToken);
    if (!demoContractors().owner(portalToken)) return null;
    return { workspaceToken, portalToken };
  } catch {
    return null;
  }
}

function authenticate(req: NextRequest): VerifiedContext {
  const demo = demoSession(req);
  if (demo) {
    // Resolve the real contractor records once for pronoun follow-ups. The
    // model only receives names that exist in the authenticated organization.
    const snapshot = demoContractors().ownerSnapshot(demo.portalToken);
    const references = snapshot.profiles.map((profile) => ({ id: profile.id, name: profile.name }));
    return {
      mode: "demo",
      orgId: "demo",
      demoWorkspaceToken: demo.workspaceToken,
      demoPortalToken: demo.portalToken,
      verifiedReferences: references,
      scope: `demo:${sha256(demo.workspaceToken)}:${sha256(demo.portalToken)}`,
    };
  }

  const identityToken = req.cookies.get("nnetics_identity")?.value ?? "";
  if (!identityToken)
    throw new AgentRequestError(401, "authentication_required", "Sign in or start the demo first.");
  try {
    const who = identityService().verify(identityToken);
    const organization = identityService().organizations(who)[0];
    if (!organization?.id) throw new Error("No organization");
    return {
      mode: "live",
      orgId: organization.id,
      verifiedReferences: [],
      scope: `live:${organization.id}`,
    };
  } catch {
    throw new AgentRequestError(401, "authentication_required", "Sign in or start the demo first.");
  }
}

function observerFor(requestId: string, mode: AgentMode) {
  const observe = developmentObserver();
  if (!observe) return undefined;
  return (event: { event: string } & Record<string, unknown>) => {
    observe({ ...event, requestId, mode });
  };
}

function traceHeaders(trace: {
  requestId: string;
  mode: AgentMode;
  provider?: string;
  model?: string;
  modelCalls?: number;
  toolCalls?: number;
  stepLimitReached?: boolean;
  replay?: boolean;
}) {
  if (process.env.NODE_ENV === "production") return {};
  return {
    "X-Agent-Request-Id": trace.requestId,
    "X-Agent-Mode": trace.mode,
    ...(trace.provider ? { "X-Agent-Provider": trace.provider } : {}),
    ...(trace.model ? { "X-Agent-Model": trace.model } : {}),
    ...(trace.modelCalls !== undefined ? { "X-Agent-Model-Calls": String(trace.modelCalls) } : {}),
    ...(trace.toolCalls !== undefined ? { "X-Agent-Tool-Calls": String(trace.toolCalls) } : {}),
    ...(trace.stepLimitReached !== undefined ? { "X-Agent-Step-Limit": trace.stepLimitReached ? "1" : "0" } : {}),
    ...(trace.replay ? { "X-Agent-Idempotent-Replay": "1" } : {}),
  };
}

function errorBody(code: string, message: string, requestId: string, retryable: boolean, mayHaveChanged = false) {
  // A write can succeed and a later model step can still fail. In that case a
  // message that claims nothing changed would be false, so the claim is
  // removed before the accurate retry guidance is appended.
  const base = mayHaveChanged
    ? message.replace(/\bNothing was changed\.?\s*/gi, "").replace(/\s{2,}/g, " ").trim()
    : message;
  const reply = mayHaveChanged
    ? `${base} A record may already have been saved before the interruption. Review the workspace before retrying.`
    : base;
  return {
    reply,
    actions: [],
    mode: "error" as const,
    error: reply,
    code,
    requestId,
    retryable,
    mayHaveChanged,
  };
}

function errorResponse(error: unknown, requestId: string, mode: AgentMode, mayHaveChanged: boolean) {
  if (error instanceof AgentRequestError) {
    return json(errorBody(error.code, error.message, requestId, error.retryable, mayHaveChanged), error.status, traceHeaders({ requestId, mode }));
  }
  if (error instanceof AgentModelError) {
    return json(
      errorBody(error.code, error.message, requestId, error.retryable, mayHaveChanged),
      error.status,
      traceHeaders({ requestId, mode }),
    );
  }
  return json(
    errorBody(
      "internal_error",
      "Ask Nnetics failed unexpectedly. No further action was attempted. Check the workspace before retrying.",
      requestId,
      true,
      mayHaveChanged,
    ),
    500,
    traceHeaders({ requestId, mode }),
  );
}

function pruneIdempotencyCache(now: number) {
  for (const [key, entry] of idempotencyRuns) {
    if (entry.expires <= now) idempotencyRuns.delete(key);
  }
  while (idempotencyRuns.size >= IDEMPOTENCY_MAX_ENTRIES) {
    const oldest = idempotencyRuns.keys().next().value as string | undefined;
    if (!oldest) break;
    idempotencyRuns.delete(oldest);
  }
}

export async function GET() {
  const status = providerStatus();
  return json({
    name: "Ask Nnetics Agent",
    version: "2.0.0",
    description:
      "Model-driven assistant. The configured language model interprets each request, selects from the application tools implemented for the current mode, and writes the final answer.",
    provider: status,
    demo: capabilitySummary("demo"),
    live: capabilitySummary("live"),
    tools: catalogForMode("demo").map((tool) => ({
      name: tool.name,
      risk: tool.risk,
      confirmationRequired: tool.confirmationRequired,
      description: tool.description,
    })),
  });
}

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  let mode: AgentMode = "demo";
  let context: VerifiedContext | null = null;
  // Declared outside the try so a failure can report whether a write already
  // succeeded before the provider or a later model step failed.
  let writeCache = new Map<string, AgentToolExecution>();
  try {
    if (!isAllowedAppOrigin(req.headers.get("origin")))
      throw new AgentRequestError(403, "origin_not_allowed", "Requests must come from this app.");
    if (!req.headers.get("content-type")?.startsWith("application/json"))
      throw new AgentRequestError(415, "unsupported_media_type", "Use JSON for agent requests.");

    const input = await readJsonBody(req);
    const message = typeof input.message === "string" ? input.message.trim() : "";
    if (!message)
      throw new AgentRequestError(400, "empty_message", "Please provide a message.");
    if (message.length > MAX_MESSAGE_CHARS)
      throw new AgentRequestError(413, "message_too_long", `Keep the message under ${MAX_MESSAGE_CHARS} characters.`);

    const history = readConversationHistory(input.conversationHistory ?? input.history);
    const idempotencyKey = idempotencyKeyOf(input.idempotencyKey);

    context = authenticate(req);
    mode = context.mode;

    const observer = observerFor(requestId, mode);
    observer?.({
      event: "request_received",
      messageChars: message.length,
      historyTurns: history.length,
      hasIdempotencyKey: Boolean(idempotencyKey),
    });

    // The idempotency entry is created before the provider call so a write that
    // completed before a provider outage is not repeated by an HTTP retry with
    // the same key.
    const fingerprint = sha256(`${message}\n${JSON.stringify(history)}`);
    const journalKey = idempotencyKey ? `${context.scope}:${idempotencyKey}` : null;
    if (journalKey) {
      const now = Date.now();
      pruneIdempotencyCache(now);
      const existing = idempotencyRuns.get(journalKey);
      if (existing && existing.expires > now) {
        if (existing.fingerprint !== fingerprint)
          throw new AgentRequestError(409, "idempotency_conflict", "This idempotency key was already used for a different request.");
        if (existing.response) {
          observer?.({ event: "idempotent_replay" });
          return json(existing.response.body, existing.response.status, traceHeaders({
            requestId: String(existing.response.body.requestId ?? requestId),
            mode,
            replay: true,
          }));
        }
        writeCache = existing.writeCache;
      } else {
        const entry: CachedIdempotentRun = {
          fingerprint,
          writeCache,
          expires: now + IDEMPOTENCY_TTL_MS,
        };
        idempotencyRuns.set(journalKey, entry);
      }
    }

    const adapter = configuredAgentAdapter();
    const verifiedReferences = context.mode === "demo"
      ? verifiedContractorReferences(history, context.verifiedReferences)
      : [];

    const result = await runAgent({
      mode: context.mode,
      message,
      history,
      adapter,
      observer,
      requestId,
      verifiedReferences,
      writeCache,
      executor: new AgentToolExecutor(context.mode === "demo", {
        orgId: context.orgId,
        isDemo: context.mode === "demo",
        demoWorkspaceToken: context.demoWorkspaceToken,
        demoPortalToken: context.demoPortalToken,
        liveContext: context.mode === "live" ? { orgId: context.orgId } : undefined,
      }),
    });

    const body: Record<string, unknown> = {
      reply: result.reply,
      actions: actionChips(result.executions),
      mode: context.mode,
      requestId,
      provider: result.provider,
      model: result.model,
      modelCalls: result.modelCalls,
      toolCalls: result.toolCalls,
      stepLimitReached: result.stepLimitReached,
      // Development-only trace for operator verification. It contains only the
      // authenticated user's own tool arguments and results, never credentials,
      // cookies, or provider response bodies.
      ...(process.env.NODE_ENV !== "production" ? {
        executions: result.executions.map((execution) => ({
          name: execution.name,
          args: execution.args,
          result: execution.result,
          deduplicated: execution.deduplicated,
        })),
      } : {}),
    };

    if (journalKey) {
      const entry = idempotencyRuns.get(journalKey);
      if (entry && entry.fingerprint === fingerprint)
        entry.response = { body, status: 200 };
    }

    observer?.({
      event: "request_completed",
      modelCalls: result.modelCalls,
      toolCalls: result.toolCalls,
      stepLimitReached: result.stepLimitReached,
      replyChars: result.reply.length,
    });

    return json(body, 200, traceHeaders({
      requestId,
      mode,
      provider: result.provider,
      model: result.model,
      modelCalls: result.modelCalls,
      toolCalls: result.toolCalls,
      stepLimitReached: result.stepLimitReached,
    }));
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const code = error instanceof AgentModelError || error instanceof AgentRequestError
        ? error.code
        : error instanceof Error
          ? error.name
          : "unknown";
      // Log only a classification, never message content, arguments, cookies,
      // provider bodies, or credentials.
      console.info("[ask-nnetics]", JSON.stringify({ event: "request_failed", requestId, mode, code }));
    }
    return errorResponse(error, requestId, mode, writeCache.size > 0);
  }
}
