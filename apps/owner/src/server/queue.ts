import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import {isDeepStrictEqual} from 'node:util';
import { nextReference, previousSubmission, referenceTables } from "./invoice-references.ts";
import { requireNear } from "../data/invoice-currency.ts";
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
      .exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS metadata (id TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, payload TEXT NOT NULL, state TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '', signed TEXT, hash TEXT, attempt TEXT);
      CREATE UNIQUE INDEX IF NOT EXISTS claimed_order ON invoices(order_id) WHERE state IN ('queued','preparing','submitted','pending','paid','blocked','failed');
      CREATE TABLE IF NOT EXISTS registry (kind TEXT NOT NULL, id TEXT NOT NULL, PRIMARY KEY(kind,id));
      CREATE TABLE IF NOT EXISTS staged_payment_jobs (bill TEXT PRIMARY KEY, job TEXT NOT NULL UNIQUE, organization TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS staged_payment_releases (job TEXT PRIMARY KEY, plan TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS staged_payment_no_dispatch BEFORE UPDATE OF state ON invoices
        WHEN NEW.state <> 'review' AND EXISTS (SELECT 1 FROM staged_payment_jobs WHERE job=OLD.id)
          AND NOT EXISTS (SELECT 1 FROM staged_payment_releases WHERE job=OLD.id)
        BEGIN SELECT RAISE(ABORT, 'Staged payment requires separate release authorization'); END;
      CREATE TRIGGER IF NOT EXISTS staged_payment_no_duplicate BEFORE INSERT ON invoices
        WHEN EXISTS (SELECT 1 FROM staged_payment_jobs s JOIN invoices i ON i.id=s.job WHERE i.order_id=NEW.order_id)
        BEGIN SELECT RAISE(ABORT, 'Agreement already has a staged payment'); END;
      CREATE TABLE IF NOT EXISTS challenges (nonce TEXT PRIMARY KEY, message TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, description TEXT NOT NULL, time TEXT NOT NULL);`);
    referenceTables(this.db);
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
  bindOrganization(organization: string) {
    this.db
      .prepare("INSERT OR IGNORE INTO metadata VALUES ('organization',?)")
      .run(organization);
    const row = this.db
      .prepare("SELECT value FROM metadata WHERE id='organization'")
      .get() as { value: string };
    if (row.value !== organization)
      throw new Error("Database belongs to a different organization.");
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
  submitGenerated(invoice: Omit<Invoice,"reviewed">, reasons: string[]) {
    const input = structuredInvoice(invoice);
    requireNear(input.asset,input.text);
    const {id:token,...fields}=input, fingerprint=JSON.stringify(fields), scope=input.vendor_id;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const previous=previousSubmission(this.db,scope,token,fingerprint);
      if(previous) { const existing=this.get(previous)!; this.db.exec("COMMIT"); return existing.invoice; }
      const existing=this.all().find(j=>j.order_id===input.order_id);
      if(existing && this.db.prepare("SELECT 1 FROM invoice_submissions WHERE scope=? AND invoice=? AND fingerprint=?").get(scope,existing.id,fingerprint)) {this.db.exec("COMMIT");return existing.invoice;}
      if(existing) throw Error("This work order already has an invoice. Open its status instead.");
      const generated={...input,id:nextReference(this.db,scope)};
      this.add(generated,reasons);
      this.db.prepare("INSERT INTO invoice_submissions VALUES (?,?,?,?)").run(scope,token,fingerprint,generated.id);
      this.db.exec("COMMIT");
      return {...generated,reviewed:false};
    } catch(e) {this.db.exec("ROLLBACK");throw e;}
  }
  all(): Job[] {
    return (
      this.db
        .prepare("SELECT * FROM invoices ORDER BY rowid DESC")
        .all() as unknown as Row[]
    ).map(job);
  }
  importReviewed(invoice:Omit<Invoice,"reviewed">) {
    const input=structuredInvoice(invoice);requireNear(input.asset,input.text);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const prior=this.get(input.id);
      if(prior){
        const {reviewed:_,...saved}=prior.invoice;
        if(JSON.stringify(saved)!==JSON.stringify(input))throw Error("Invoice queue binding differs; investigate before retry.");
        this.db.exec("COMMIT");return prior;
      }
      if(this.all().some(j=>j.order_id===input.order_id))throw Error("This approved work order already has a durable invoice claim.");
      this.add(input,["Contractor invoice reviewed; execution gated. Explicit owner queue release and transaction authorization still required."]);
      this.db.prepare("UPDATE invoices SET payload=? WHERE id=?").run(JSON.stringify({...input,reviewed:true}),input.id);
      this.register("order",input.order_id);
      this.db.exec("COMMIT");return this.get(input.id)!;
    }catch(e){this.db.exec("ROLLBACK");throw e;}
  }
  stagePayment(organization: string, bill: string, agreement: string, invoice: Omit<Invoice,"reviewed">) {
    const input = structuredInvoice(invoice);
    requireNear(input.asset, input.text);
    const args = {order_id:input.order_id, invoice_id:input.id, recipient:input.recipient, amount:input.amount};
    const binding = {organization, bill, agreement, job:input.id, args, argsBase64:Buffer.from(JSON.stringify(args)).toString('base64')};
    const payload = JSON.stringify(binding);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.bindOrganization(organization);
      const prior = this.db.prepare("SELECT payload FROM staged_payment_jobs WHERE bill=?").get(bill) as {payload:string}|undefined;
      if (prior) {
        const job = this.get(input.id);
        if (prior.payload !== payload || job?.state !== 'review' || JSON.stringify(job.invoice) !== JSON.stringify({...input,reviewed:false}))
          throw Error("Existing staged payment differs. Manual review required.");
      } else {
        if (this.db.prepare("SELECT 1 FROM invoices WHERE order_id=?").get(input.order_id))
          throw Error("Agreement already has a durable payment job.");
        this.add(input, ["Acceptance job staged. Dispatch is unavailable."]);
        this.db.prepare("INSERT INTO staged_payment_jobs VALUES (?,?,?,?)").run(bill,input.id,organization,payload);
      }
      this.db.exec("COMMIT");
      return binding;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  stagedPayment(bill: string, organization: string) {
    const row=this.db.prepare('SELECT payload FROM staged_payment_jobs WHERE bill=? AND organization=?').get(bill,organization) as {payload:string}|undefined;
    return row?JSON.parse(row.payload) as {organization:string;bill:string;agreement:string;job:string;argsBase64:string}:undefined;
  }
  stagedReleasePlan(job: string) {
    return (this.db.prepare('SELECT plan FROM staged_payment_releases WHERE job=?').get(job) as {plan:string}|undefined)?.plan;
  }
  releaseStagedPayment(invoice: Omit<Invoice,'reviewed'>, planHash: string) {
    const input=structuredInvoice(invoice);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.assertPaymentWindow(planHash);
      const job=this.get(input.id);
      const previous=this.stagedReleasePlan(input.id);
      if(!job||JSON.stringify({...job.invoice,reviewed:false})!==JSON.stringify({...input,reviewed:false})||
        (previous?previous!==planHash:job.state!=='review')||
        !this.db.prepare('SELECT 1 FROM staged_payment_jobs WHERE job=?').get(input.id))throw Error('Staged payment differs from the reviewed release.');
      if(!previous){
        this.db.prepare('INSERT INTO staged_payment_releases VALUES (?,?)').run(input.id,planHash);
        this.db.prepare("UPDATE invoices SET state='queued',reason='',payload=? WHERE id=?").run(JSON.stringify({...input,reviewed:true}),input.id);
        this.register('order',input.order_id);
      }
      this.db.exec('COMMIT');
      return this.get(input.id)!;
    }catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  assertStagedRelease(job: string, binding: unknown, planHash: string) {
    const row=this.db.prepare('SELECT s.payload, r.plan FROM staged_payment_jobs s JOIN staged_payment_releases r ON r.job=s.job WHERE s.job=?').get(job) as {payload:string;plan:string}|undefined;
    if(!row||row.plan!==planHash||!isDeepStrictEqual(JSON.parse(row.payload),binding))
      throw Error('The exact staged payment was not released under this plan.');
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
  assertPaymentWindow(planHash:string) {
    if(this.db.prepare('SELECT 1 FROM metadata WHERE id=?').get('cleanup:'+planHash))
      throw Error('Cleanup has begun. Payment dispatch is permanently closed for this plan.');
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
