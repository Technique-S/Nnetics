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
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Array<{ user: string; assistant: string }>>(readStoredConversation);
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      const id = window.requestAnimationFrame(() => inputRef.current?.focus());
      return () => window.cancelAnimationFrame(id);
    }
    launcherRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (open) transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight });
  }, [messages, open]);
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send() {
    const message = input.trim().slice(0, 500);
    if (!message || busy) return;
    setMessages(old => [...old, { who: "you", text: message }]);
    setInput("");
    setBusy(true);
    setNote("");
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          idempotencyKey: requestKey(),
          conversationHistory: conversationHistory.slice(-5)
        })
      });
      const data = await response.json().catch(() => null) as {
        reply?: string;
        actions?: ActionChip[];
        mode?: string;
        error?: string;
        code?: string;
        retryable?: boolean;
      } | null;
      if (!response.ok || !data || typeof data.reply !== "string")
        throw new Error(data?.error || data?.reply || "The agent is unavailable. Try again in a moment.");

      setConversationHistory(prev => {
        const updated = [...prev, { user: message, assistant: data.reply || "" }].slice(-5);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(CONVERSATION_KEY, JSON.stringify(updated));
          } catch {
            // Storage may be unavailable or full; the chat still works.
          }
        }
        return updated;
      });

      setMessages(old => [...old, {
        who: "assistant",
        text: data.reply!,
        mode: data.mode === "demo" ? "demo" : data.mode === "live" ? "live" : "error",
        chips: data.actions ?? []
      }]);
    } catch (e) {
      setMessages(old => [...old, {
        who: "assistant",
        text: e instanceof Error ? e.message : "The agent is unavailable. Try again in a moment.",
        mode: "error"
      }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open && (
        <button type="button" ref={launcherRef} className="ask-nnetics" aria-expanded={false} onClick={() => setOpen(true)}>
          Ask Nnetics<span className="ask-nnetics-sub">demo · simulated funds</span>
        </button>
      )}
      {open && (
        <section className="ask-nnetics-panel" role="dialog" aria-modal="true" aria-label="Ask Nnetics demo assistant">
          <header className="ask-nnetics-head">
            <h2>Ask Nnetics</h2>
            <span className="ask-nnetics-badge">Demo · simulated funds · model-driven, records stay in this demo</span>
            <button type="button" className="text-button" autoFocus onClick={() => setOpen(false)} aria-label="Close the demo assistant">Close</button>
          </header>
          <div className="ask-nnetics-transcript" ref={transcriptRef} aria-live="polite">
            {messages.length === 0 && (
              <p className="ask-nnetics-empty">Ask in natural language, e.g. “create a contractor named Amara”, “how many contractors do I have?”, “what is my vault balance?”, or “show my invoices”. The configured model reads your request, uses the demo tools it needs, and answers from this simulated workspace. Deleting or archiving a contractor is prepared and then waits for your confirmation in the dashboard.</p>
            )}
            {messages.map((message, index) => (
              <article key={index} className={message.who === "you" ? "ask-nnetics-you" : "ask-nnetics-assistant"}>
                <p>{message.text}</p>
                {message.mode && <span className="ask-nnetics-mode">{message.mode === "demo" ? "Demo · simulated funds" : message.mode === "live" ? "Live" : "Error"}</span>}
                {message.chips && message.chips.length > 0 && (
                  <div className="ask-nnetics-actions">
                    {message.chips.map((item, chipIndex) => (
                      <button key={chipIndex} type="button" className="text-button" onClick={() => onAction(item.action)}>{item.label}</button>
                    ))}
                  </div>
                )}
              </article>
            ))}
            {busy && <p role="status">Thinking in this simulated workspace…</p>}
          </div>
          {note && <p className="ask-nnetics-note" role="status">{note}</p>}
          <form className="ask-nnetics-form" onSubmit={e => { e.preventDefault(); void send(); }}>
            <label className="ask-nnetics-input-label" htmlFor="ask-nnetics-message">Message the demo assistant</label>
            <input id="ask-nnetics-message" ref={inputRef} value={input} onChange={e => setInput(e.target.value)} maxLength={500} placeholder="e.g. create a contractor named Amara" disabled={busy} />
            <ActionButton type="submit" className="button primary" busy={busy} disabled={busy || !input.trim()}>Send</ActionButton>
          </form>
        </section>
      )}
    </>
  );
}