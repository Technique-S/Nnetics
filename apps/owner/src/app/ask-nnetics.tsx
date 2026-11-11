"use client";
import { useEffect, useRef, useState } from "react";
import { ActionButton } from "./action-button";

export type AssistantAction =
  | { kind: "create-contractor"; name: string }
  | { kind: "list-contractors" }
  | { kind: "get-contractor"; id: string }
  | { kind: "update-contractor"; id: string; name?: string }
  | { kind: "get-contractor-invoices"; contractorId: string }
  | { kind: "get-vault-balance" }
  | { kind: "get-vault-status" }
  | { kind: "get-vault-available-balance" }
  | { kind: "get-vault-transaction-history" }
  | { kind: "list-invoices" }
  | { kind: "get-invoice"; id: string }
  | { kind: "get-pending-invoices" }
  | { kind: "get-overdue-invoices" }
  | { kind: "get-organization-overview" }
  | { kind: "get-organization-statistics" }
  | { kind: "create-contractor"; name: string; update?: boolean; contractorId?: string }
  | { kind: "prepare-payment-draft"; contractor: string; amount: string; description: string }
  | { kind: "confirm-contractor-lifecycle"; operationId: string; secret: string }
  | { kind: "find-receipt"; reference: string; contractor: string }
  | { kind: "summarize-outstanding" };

interface ActionChip {
  action: AssistantAction;
  label: string;
}

interface PanelMessage {
  who: "you" | "assistant";
  text: string;
  mode?: "demo" | "live" | "error";
  chips?: ActionChip[];
}

const CONVERSATION_KEY = "ask-nnetics-conversation";

// localStorage is display-only history, not trusted app state. A malformed or
// oversized record must never break the panel.
function readStoredConversation(): Array<{ user: string; assistant: string }> {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CONVERSATION_KEY);
    if (!raw || raw.length > 64 * 1024) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((turn) => turn && typeof turn === "object" && typeof turn.user === "string" && typeof turn.assistant === "string")
      .slice(-5)
      .map((turn) => ({ user: turn.user.slice(0, 500), assistant: turn.assistant.slice(0, 4000) }));
  } catch {
    return [];
  }
}

function requestKey() {
  return globalThis.crypto?.randomUUID?.() ?? `ask-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AskNnetics({ onAction }: { onAction: (action: AssistantAction) => void }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [failedRequest, setFailedRequest] = useState<{message: string; key: string} | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{user: string; assistant: string}>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const turns = readStoredConversation();
    setConversationHistory(turns);
    setMessages(turns.flatMap(turn => [{who: "you", text: turn.user}, {who: "assistant", text: turn.assistant, mode: "demo"}]));
  }, []);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const narrow = window.matchMedia("(max-width: 760px)");
    if (narrow.matches) panel?.showModal();
    else panel?.show();
    inputRef.current?.focus();
    return () => {
      panel?.close();
      launcherRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (open) transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight });
  }, [messages, open, busy]);

  async function send(retry?: {message: string; key: string}) {
    const message = retry?.message ?? input.trim().slice(0, 500);
    if (!message || busy) return;
    const key = retry?.key ?? requestKey();
    if (!retry) setMessages(old => [...old, {who: "you", text: message}]);
    setInput("");
    setBusy(true);
    setFailedRequest(null);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          idempotencyKey: key,
          conversationHistory: conversationHistory.slice(-5)
        })
      });
      const data = await response.json().catch(() => null) as {
        reply?: string;
        actions?: ActionChip[];
        mode?: string;
        error?: string;
        retryable?: boolean;
      } | null;
      if (!response.ok || !data || typeof data.reply !== "string") {
        if (!data || data.retryable || response.status >= 500) setFailedRequest({message, key});
        throw new Error(data?.error || data?.reply || "The agent is unavailable. Try again in a moment.");
      }
      setConversationHistory(prev => {
        const updated = [...prev, {user: message, assistant: data.reply!}].slice(-5);
        try { window.localStorage.setItem(CONVERSATION_KEY, JSON.stringify(updated)); } catch {}
        return updated;
      });
      setMessages(old => [...old, {
        who: "assistant", text: data.reply!,
        mode: data.mode === "demo" ? "demo" : data.mode === "live" ? "live" : "error",
        chips: data.actions ?? []
      }]);
    } catch (error) {
      if (error instanceof TypeError) setFailedRequest({message, key});
      setMessages(old => [...old, {who: "assistant", text: error instanceof Error ? error.message : "The agent is unavailable. Try again in a moment.", mode: "error"}]);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" ref={launcherRef} className="ask-nnetics" aria-haspopup="dialog" aria-expanded={open} aria-controls="ask-nnetics-panel" onClick={() => setOpen(value => !value)}>
      <AssistantMark/>Ask Nnetics
    </button>
    {open && <dialog ref={panelRef} id="ask-nnetics-panel" className={`ask-nnetics-panel${expanded ? " is-expanded" : ""}`}
      aria-label="Ask Nnetics demo assistant" onCancel={event => {event.preventDefault();setOpen(false);}}
      onKeyDown={event => {if (event.key === "Escape") {event.preventDefault();setOpen(false);}}}>
      <header className="ask-nnetics-head">
        <AssistantMark/>
        <div><h2>Ask Nnetics</h2><p>Demo workspace · simulated funds</p></div>
        <button type="button" className="text-button ask-nnetics-expand" aria-pressed={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Shrink" : "Expand"}</button>
        <button type="button" className="text-button" onClick={() => setOpen(false)} aria-label="Close the demo assistant">Close</button>
      </header>
      <div className="ask-nnetics-transcript" ref={transcriptRef} role="log" aria-label="Conversation" tabIndex={0}>
        {messages.length === 0 && <div className="ask-nnetics-empty">
          <h3>What would you like to check?</h3>
          <p>Ask about your vault, contractors or invoices. Actions that need approval open for review in the workspace.</p>
          <div className="ask-nnetics-actions">
            {["What is my vault balance?", "Show my invoices", "How many contractors do I have?"].map(prompt => (
              <button key={prompt} type="button" className="button secondary" onClick={() => {setInput(prompt);inputRef.current?.focus();}}>{prompt}</button>
            ))}
          </div>
        </div>}
        {messages.map((message, index) => (
          <article key={index} data-mode={message.mode} className={message.who === "you" ? "ask-nnetics-you" : "ask-nnetics-assistant"}>
            <strong className="ask-nnetics-mode">{message.who === "you" ? "You" : message.mode === "error" ? "Request failed" : "Nnetics"}</strong>
            <p>{message.text}</p>
            {message.chips && message.chips.length > 0 && <div className="ask-nnetics-actions">
              {message.chips.map((item, chipIndex) => <button key={chipIndex} type="button" className="button secondary" onClick={() => {
                onAction(item.action);
                if (panelRef.current?.matches(":modal")) setOpen(false);
              }}>{item.label}</button>)}
            </div>}
          </article>
        ))}
        {busy && <p className="ask-nnetics-progress" role="status">Waiting for Nnetics…</p>}
        {failedRequest && <button type="button" className="button secondary" onClick={() => void send(failedRequest)}>Retry request</button>}
      </div>
      <form className="ask-nnetics-form" onSubmit={event => {event.preventDefault();void send();}}>
        <label className="ask-nnetics-input-label" htmlFor="ask-nnetics-message">Message the demo assistant</label>
        <input id="ask-nnetics-message" ref={inputRef} value={input} onChange={event => setInput(event.target.value)} maxLength={500} placeholder="Ask about your workspace" readOnly={busy}/>
        <ActionButton type="submit" className="button primary" busy={busy} disabled={busy || !input.trim()}>Send</ActionButton>
      </form>
    </dialog>}
  </>;
}

function AssistantMark() {
  return <svg className="assistant-mark" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2 14.5 9.5 22 12 14.5 14.5 12 22 9.5 14.5 2 12 9.5 9.5Z"/>
  </svg>;
}
