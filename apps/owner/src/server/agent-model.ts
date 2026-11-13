// Model adapter for Ask Nnetics. The only provider is the existing OpenRouter
// OpenAI-compatible chat-completions endpoint; no vendor SDK or new provider is
// introduced. This module owns bounded response reading and structured errors
// so provider failures can never be mistaken for a successful agent answer.
import crypto from "node:crypto";

export const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_ASSISTANT_MODEL = "openai/gpt-4o-mini";

export type AgentErrorCode =
  | "provider_not_configured"
  | "provider_auth"
  | "unsupported_model"
  | "provider_rejected"
  | "rate_limit"
  | "context_length"
  | "provider_unavailable"
  | "protocol_error"
  | "model_response_invalid"
  | "invalid_tool_arguments"
  | "unknown_tool"
  | "tool_execution_failed"
  | "authorization_error"
  | "conversation_context_error"
  | "step_limit"
  | "internal_error";

export class AgentModelError extends Error {
  readonly code: AgentErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly providerRequestId?: string;

  constructor(
    code: AgentErrorCode,
    message: string,
    options: { status?: number; retryable?: boolean; providerRequestId?: string } = {},
  ) {
    super(message);
    this.name = "AgentModelError";
    this.code = code;
    this.status = options.status ?? 503;
    this.retryable = options.retryable ?? false;
    this.providerRequestId = options.providerRequestId;
  }
}

export interface AgentToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type AgentChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: AgentToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string; name?: string };

export interface ProviderToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AgentModelRequest {
  messages: AgentChatMessage[];
  tools?: ProviderToolDefinition[];
  toolChoice?: "auto";
}

export interface AgentModelResponse {
  content: string | null;
  toolCalls: AgentToolCall[];
  finishReason?: string;
  providerRequestId?: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

export interface AgentModelAdapter {
  readonly provider: string;
  readonly model: string;
  complete(request: AgentModelRequest): Promise<AgentModelResponse>;
}

export type AgentObserver = (event: { event: string } & Record<string, unknown>) => void;

export interface OpenRouterAdapterOptions {
  apiKey: string;
  model: string;
  endpoint?: string;
  request?: typeof fetch;
  timeoutMs?: number;
  maxResponseBytes?: number;
}

function requestIdFrom(headers: Headers): string | undefined {
  return headers.get("x-request-id") ?? headers.get("x-openrouter-request-id") ?? undefined;
}

function isAbort(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

function providerError(status: number, providerRequestId?: string): AgentModelError {
  if (status === 401 || status === 403)
    return new AgentModelError("provider_auth", "The AI model provider rejected the server credentials. Your request may not have completed. An operator must check the server configuration.", { status: 503, providerRequestId });
  if (status === 404)
    return new AgentModelError("unsupported_model", "The configured AI model is not available from the provider. Your request may not have completed.", { status: 502, providerRequestId });
  if (status === 429)
    return new AgentModelError("rate_limit", "The AI model is rate-limited right now. Your request may not have completed. Try again in a moment.", { status: 429, retryable: true, providerRequestId });
  if (status === 408 || status === 409 || status === 425 || status >= 500)
    return new AgentModelError("provider_unavailable", "The AI model service is unavailable right now. Your request may not have completed. Try again in a moment.", { status: 503, retryable: true, providerRequestId });
  return new AgentModelError("provider_rejected", "The AI model provider rejected the request. Your request may not have completed.", { status: 502, providerRequestId });
}

function looksLikeContextLength(body: string) {
  return /context[_\s-]?length|maximum context|too many tokens|context window|reduce the length/i.test(body);
}

async function readBounded(response: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) throw new AgentModelError("model_response_invalid", "The AI model returned an empty response. Your request may not have completed.", { status: 502 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw new AgentModelError("model_response_invalid", "The AI model returned an oversized response. Your request may not have completed.", { status: 502 });
      }
      chunks.push(part.value);
    }
  } catch (error) {
    if (error instanceof AgentModelError) throw error;
    throw new AgentModelError("provider_unavailable", "The AI model response was interrupted. Your request may not have completed. Try again in a moment.", { status: 503, retryable: true });
  }
  return Buffer.concat(chunks, size);
}

function contentText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const text = value
      .map((part) => part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string"
        ? String((part as Record<string, unknown>).text)
        : "")
      .join("");
    return text || null;
  }
  return null;
}

function normalizeToolCalls(value: unknown, providerRequestId?: string): AgentToolCall[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value))
    throw new AgentModelError("model_response_invalid", "The AI model returned an unusable tool request. Your request may not have completed.", { status: 502, providerRequestId });
  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new AgentModelError("model_response_invalid", "The AI model returned an unusable tool request. Your request may not have completed.", { status: 502, providerRequestId });
    const item = raw as Record<string, unknown>;
    const fn = item.function;
    if (!fn || typeof fn !== "object" || Array.isArray(fn))
      throw new AgentModelError("model_response_invalid", "The AI model returned an unusable tool request. Your request may not have completed.", { status: 502, providerRequestId });
    const call = fn as Record<string, unknown>;
    const id = typeof item.id === "string" && item.id.trim() ? item.id : "";
    const name = typeof call.name === "string" ? call.name.trim() : "";
    const args = typeof call.arguments === "string" ? call.arguments : call.arguments && typeof call.arguments === "object" ? JSON.stringify(call.arguments) : "";
    const type = item.type === undefined ? "function" : item.type;
    if (!id || !name || !args || type !== "function")
      throw new AgentModelError("model_response_invalid", "The AI model returned an unusable tool request. Your request may not have completed.", { status: 502, providerRequestId });
    return { id, type: "function" as const, function: { name, arguments: args } };
  });
}

export class OpenRouterAgentAdapter implements AgentModelAdapter {
  readonly provider = "openrouter";
  readonly model: string;
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly request: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxResponseBytes: number;

  constructor(options: OpenRouterAdapterOptions) {
    if (!options.apiKey.trim()) throw new AgentModelError("provider_not_configured", "Ask Nnetics is not configured with an AI model on this server. Your request may not have completed.", { status: 503 });
    this.apiKey = options.apiKey.trim();
    this.model = options.model.trim();
    this.endpoint = options.endpoint ?? OPENROUTER_CHAT_COMPLETIONS_URL;
    this.request = options.request ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxResponseBytes = options.maxResponseBytes ?? 256 * 1024;
  }

  async complete(request: AgentModelRequest): Promise<AgentModelResponse> {
    const hasTools = Array.isArray(request.tools) && request.tools.length > 0;
    const body: Record<string, unknown> = {
      model: this.model,
      messages: request.messages,
      temperature: 0,
      // Leave room for the configured reasoning model's tool calls and final
      // answer. The previous 900-token ceiling truncated valid acceptance
      // requests. Response bytes, request timeout and runtime step caps remain.
      max_tokens: 2048,
      provider: { require_parameters: true },
    };
    if (hasTools) {
      body.tools = request.tools;
      body.tool_choice = request.toolChoice ?? "auto";
    }

    let response: Response;
    try {
      response = await this.request(this.endpoint, {
        method: "POST",
        redirect: "error",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "Ask Nnetics",
        },
        signal: AbortSignal.timeout(this.timeoutMs),
        body: JSON.stringify(body),
      });
    } catch (error) {
      if (isAbort(error))
        throw new AgentModelError("provider_unavailable", "The AI model service did not respond in time. Your request may not have completed. Try again in a moment.", { status: 503, retryable: true });
      throw new AgentModelError("provider_unavailable", "The AI model service is unavailable right now. Your request may not have completed. Try again in a moment.", { status: 503, retryable: true });
    }

    const providerRequestId = requestIdFrom(response.headers);
    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = Buffer.from(await readBounded(response, 16 * 1024)).toString("utf8");
      } catch {
        // The status is enough to classify the failure; never echo the body.
      }
      if (response.status === 400 && looksLikeContextLength(errorBody))
        throw new AgentModelError("context_length", "This conversation is too long for the configured AI model. Start a shorter conversation or clear the transcript.", { status: 413, providerRequestId });
      throw providerError(response.status, providerRequestId);
    }

    const bytes = await readBounded(response, this.maxResponseBytes);
    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.from(bytes).toString("utf8"));
    } catch {
      throw new AgentModelError("model_response_invalid", "The AI model returned a response that could not be read. Your request may not have completed.", { status: 502, providerRequestId });
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new AgentModelError("model_response_invalid", "The AI model returned a response that could not be read. Your request may not have completed.", { status: 502, providerRequestId });
    const root = parsed as Record<string, unknown>;
    const choices = root.choices;
    if (!Array.isArray(choices) || choices.length === 0)
      throw new AgentModelError("model_response_invalid", "The AI model returned no usable choice. Your request may not have completed.", { status: 502, providerRequestId });
    const choice = choices[0];
    if (!choice || typeof choice !== "object" || Array.isArray(choice))
      throw new AgentModelError("model_response_invalid", "The AI model returned no usable choice. Your request may not have completed.", { status: 502, providerRequestId });
    const record = choice as Record<string, unknown>;
    const message = record.message;
    if (!message || typeof message !== "object" || Array.isArray(message))
      throw new AgentModelError("model_response_invalid", "The AI model returned no usable message. Your request may not have completed.", { status: 502, providerRequestId });
    const assistant = message as Record<string, unknown>;
    const content = contentText(assistant.content);
    const toolCalls = normalizeToolCalls(assistant.tool_calls, providerRequestId);
    const finishReason = typeof record.finish_reason === "string" ? record.finish_reason : undefined;
    if (!toolCalls.length && !content?.trim())
      throw new AgentModelError("model_response_invalid", "The AI model returned an empty answer. Your request may not have completed.", { status: 502, providerRequestId });
    if (!toolCalls.length && finishReason === "length")
      throw new AgentModelError("model_response_invalid", "The AI model answer was cut off before completion. Your request may not have completed. Try a shorter request.", { status: 502, providerRequestId });

    const usageRaw = root.usage;
    const usage = usageRaw && typeof usageRaw === "object" && !Array.isArray(usageRaw)
      ? {
        promptTokens: typeof (usageRaw as Record<string, unknown>).prompt_tokens === "number" ? (usageRaw as Record<string, number>).prompt_tokens : undefined,
        completionTokens: typeof (usageRaw as Record<string, unknown>).completion_tokens === "number" ? (usageRaw as Record<string, number>).completion_tokens : undefined,
        totalTokens: typeof (usageRaw as Record<string, unknown>).total_tokens === "number" ? (usageRaw as Record<string, number>).total_tokens : undefined,
      }
      : undefined;

    return { content, toolCalls, finishReason, providerRequestId, usage };
  }
}

// Test-only adapter injection. The route is exercised directly by the test
// suite, so a controlled adapter can prove that the model, not the old parser,
// selected the tools. This is never available in a production process.
let testAdapter: AgentModelAdapter | null = null;

export function setAgentModelAdapterForTests(adapter: AgentModelAdapter | null) {
  if (process.env.NODE_ENV === "production") throw new Error("Test model adapter override is disabled in production.");
  testAdapter = adapter;
}

export function configuredAgentAdapter(): AgentModelAdapter {
  if (testAdapter) return testAdapter;
  const key = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.NNETICS_ASSISTANT_MODEL?.trim() || DEFAULT_ASSISTANT_MODEL;
  if (!key)
    throw new AgentModelError("provider_not_configured", "Ask Nnetics is not configured with an AI model on this server. Your request may not have completed. Set OPENROUTER_API_KEY and NNETICS_ASSISTANT_MODEL.", { status: 503 });
  return new OpenRouterAgentAdapter({ apiKey: key, model });
}

export function providerStatus() {
  const model = process.env.NNETICS_ASSISTANT_MODEL?.trim() || DEFAULT_ASSISTANT_MODEL;
  return {
    configured: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    provider: "OpenRouter (OpenAI-compatible chat completions)",
    model,
    endpoint: OPENROUTER_CHAT_COMPLETIONS_URL,
    toolCalling: true,
  };
}

export function developmentObserver(): AgentObserver | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  if (process.env.NNETICS_AGENT_TRACE === "0") return undefined;
  return (event) => {
    try {
      console.info("[ask-nnetics]", JSON.stringify(event));
    } catch {
      // Observability must never break a conversation.
    }
  };
}

export function newRequestId() {
  return crypto.randomUUID();
}
