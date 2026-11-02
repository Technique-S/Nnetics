import type { DatabaseSync } from "node:sqlite";

// Caller holds BEGIN IMMEDIATE: allocation and invoice insertion commit together.
export function referenceTables(db: DatabaseSync) {
  db.exec(`CREATE TABLE IF NOT EXISTS invoice_contractors(number INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS invoice_sequences(scope TEXT PRIMARY KEY, next INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS invoice_submissions(scope TEXT NOT NULL, token TEXT NOT NULL, fingerprint TEXT NOT NULL, invoice TEXT NOT NULL, PRIMARY KEY(scope,token));`);
}
export function previousSubmission(db: DatabaseSync, scope: string, token: string, fingerprint: string): string | undefined {
  if (!/^[A-Za-z0-9_:-]{1,80}$/.test(token)) throw Error("Missing or invalid submission key. Reload the invoice form.");
  const old = db.prepare("SELECT fingerprint,invoice FROM invoice_submissions WHERE scope=? AND token=?").get(scope, token) as {fingerprint:string;invoice:string}|undefined;
  if (old && old.fingerprint !== fingerprint) throw Error("This submission key already belongs to different invoice details. Open the existing invoice.");
  return old?.invoice;
}
export function nextReference(db: DatabaseSync, scope: string): string {
  db.prepare("INSERT OR IGNORE INTO invoice_contractors(scope) VALUES (?)").run(scope);
  const {number} = db.prepare("SELECT number FROM invoice_contractors WHERE scope=?").get(scope) as {number:number};
  db.prepare("INSERT OR IGNORE INTO invoice_sequences VALUES (?,1)").run(scope);
  const {next} = db.prepare("SELECT next FROM invoice_sequences WHERE scope=?").get(scope) as {next:number};
  if (!Number.isSafeInteger(next) || next >= Number.MAX_SAFE_INTEGER) throw Error("Invoice sequence exhausted.");
  db.prepare("UPDATE invoice_sequences SET next=next+1 WHERE scope=?").run(scope);
  return `CTR-${String(number).padStart(4,"0")}-INV-${String(next).padStart(4,"0")}`;
}
