import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { account, uint } from "../data/owner-adapter.ts";
import type { Invoice } from "../data/owner-adapter.ts";

export function boundedId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_:-]{1,64}$/.test(value))
    throw new Error(
      "Invalid reference (1–64 ASCII letters, digits, _, : or -).",
    );
  return value;
}
export function structuredInvoice(input: unknown): Omit<Invoice, "reviewed"> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Structured invoice required.");
  const i = input as Record<string, unknown>;
  if (
    Object.keys(i).sort().join(",") !==
    "amount,asset,id,order_id,recipient,text,vendor_id"
  )
    throw new Error("Unexpected invoice fields.");
  if (
    typeof i.recipient !== "string" ||
    typeof i.amount !== "string" ||
    typeof i.asset !== "string" ||
    typeof i.text !== "string" ||
    i.text.length > 8000
  )
    throw new Error("Malformed invoice fields.");
  return {
    id: boundedId(i.id),
    order_id: boundedId(i.order_id),
    vendor_id: boundedId(i.vendor_id),
    recipient: account(i.recipient),
    amount: uint(i.amount),
    asset: i.asset,
    text: i.text,
  };
}
export type JobState =
  | "queued"
  | "review"
  | "preparing"
  | "submitted"
  | "pending"
  | "paid"
  | "failed"
  | "blocked";
export interface Job {
  id: string;
  order_id: string;
  invoice: Invoice;
  state: JobState;
  reason: string;
  signed: string | null;
  hash: string | null;
  attempt: string | null;
}
type Row = {
  id: string;
  order_id: string;
  payload: string;
  state: JobState;
  reason: string;
  signed: string | null;
  hash: string | null;
  attempt: string | null;
};
const job = (r: Row): Job => ({ ...r, invoice: JSON.parse(r.payload) });
export class Queue {
  readonly db: DatabaseSync;
  readonly filename: string;
  constructor(filename: string, scope = "testnet") {
    this.filename = filename;
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db
      .exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS metadata (id TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, payload TEXT NOT NULL, state TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '', signed TEXT, hash TEXT, attempt TEXT);
      CREATE UNIQUE INDEX IF NOT EXISTS claimed_order ON invoices(order_id) WHERE state IN ('queued','preparing','submitted','pending','paid','blocked','failed');
      CREATE TABLE IF NOT EXISTS registry (kind TEXT NOT NULL, id TEXT NOT NULL, PRIMARY KEY(kind,id));
      CREATE TABLE IF NOT EXISTS challenges (nonce TEXT PRIMARY KEY, message TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, description TEXT NOT NULL, time TEXT NOT NULL);`);
    this.db
      .prepare("INSERT OR IGNORE INTO metadata VALUES ('scope',?)")
      .run(scope);
    if (
      (
        this.db
          .prepare("SELECT value FROM metadata WHERE id='scope'")
          .get() as { value: string }
      ).value !== scope
    ) {
      this.db.close();
      throw new Error(
        "Database belongs to a different network/vault/code hash.",
      );
    }
  }
  audit(description: string) {
    this.db
      .prepare("INSERT INTO audit(description,time) VALUES (?,?)")
      .run(description, new Date().toISOString());
  }
  add(invoice: Omit<Invoice, "reviewed">, reasons: string[]) {
    const i = structuredInvoice(invoice);
    this.db
      .prepare(
        "INSERT INTO invoices(id,order_id,payload,state,reason) VALUES (?,?,?,?,?)",
      )
      .run(
        i.id,
        i.order_id,
        JSON.stringify({ ...i, reviewed: false }),
        reasons.length ? "review" : "queued",
        reasons.join(", "),
      );
    this.audit(
      `Structured invoice ${i.id}: ${reasons.length ? "review required" : "queued"}`,
    );
  }
  all(): Job[] {
    return (
      this.db
        .prepare("SELECT * FROM invoices ORDER BY rowid DESC")
        .all() as unknown as Row[]
    ).map(job);
  }
  get(id: string): Job | undefined {
    const r = this.db.prepare("SELECT * FROM invoices WHERE id=?").get(id) as
      | Row
      | undefined;
    return r && job(r);
  }
  update(
    id: string,
    state: JobState,
    reason = "",
    extra: { signed?: string; hash?: string; attempt?: string } = {},
  ) {
    this.db
      .prepare(
        "UPDATE invoices SET state=?,reason=?,signed=COALESCE(?,signed),hash=COALESCE(?,hash),attempt=COALESCE(?,attempt) WHERE id=?",
      )
      .run(
        state,
        reason,
        extra.signed ?? null,
        extra.hash ?? null,
        extra.attempt ?? null,
        id,
      );
  }
  claim(id: string): boolean {
    return (
      this.db
        .prepare(
          "UPDATE invoices SET state='preparing' WHERE id=? AND state='queued'",
        )
        .run(id).changes === 1
    );
  }
  register(kind: "vendor" | "order", id: string) {
    this.db
      .prepare("INSERT OR IGNORE INTO registry VALUES (?,?)")
      .run(kind, boundedId(id));
  }
  ids(kind: "vendor" | "order"): string[] {
    return (
      this.db
        .prepare("SELECT id FROM registry WHERE kind=? ORDER BY id")
        .all(kind) as { id: string }[]
    ).map((r) => r.id);
  }
  close() {
    this.db.close();
  }
}
// Separate SQLite DB holds a process-lifetime OS lock. Crash releases it; no
// expiring lease can allow two live signers to race. Queue writes remain available.
export function workerLock(filename: string): () => void {
  const db = new DatabaseSync(filename + ".worker-lock.db");
  try {
    db.exec("PRAGMA busy_timeout=0; BEGIN EXCLUSIVE");
  } catch (e) {
    db.close();
    throw new Error("Another worker owns this database.", { cause: e });
  }
  return () => {
    db.exec("ROLLBACK");
    db.close();
  };
}
