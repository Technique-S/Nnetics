// Demo-only visitor ledger: a blank simulated workspace per browser session, stored
// in a separate SQLite file. It never touches live accounts, credentials or the
// live transaction path, and every record it produces is explicitly simulated.
//
// Money convention: every monetary value inside this store — and every monetary
// value on its HTTP boundary — is a canonical yoctoNEAR integer string. The
// store never parses a NEAR decimal and never uses floating point. The browser
// adapter converts a NEAR decimal exactly once, at the edge.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { formatNear, account, uint } from "../data/owner-adapter.ts";
import { DEMO_FEE } from "../data/demo-constants.ts";

export { DEMO_FEE };

export type DemoPaymentStatus = "prepared" | "pending" | "confirmed" | "failed" | "cancelled";
export type DemoHistoryKind = "funding" | "payment" | "control";

export interface DemoLedgerPayment {
    id: string;
    kind: "payment";
    label: string;
    contractor: string;
    recipient: string;
    amount: string;
    fee: string;
    total: string;
    description: string;
    status: DemoPaymentStatus;
    reason: string;
    reference: string;
    createdAt: string;
    settledAt: string | null;
    billId: string | null;
    // True while the record waits for the owner's explicit confirmation. A
    // prepared record already holds its reservation but has moved no funds.
    awaitingConfirmation: boolean;
}

export interface DemoHistoryEntry {
    id: string;
    kind: DemoHistoryKind;
    label: string;
    amount: string;
    status: "pending" | "confirmed" | "failed";
    at: string;
}

export interface DemoReceipt {
    id: string;
    contractor: string;
    recipient: string;
    amount: string;
    reference: string;
    summary: string;
    at: string;
}

export interface DemoVaultState {
    funded: string;
    spent: string;
    reserved: string;
    limit: string;
    paused: boolean;
}

// The persisted vault plus the derived spendable balance.
export interface DemoVaultSnapshot extends DemoVaultState {
    available: string;
}

export interface DemoWorkspaceSnapshot {
    mode: "simulation";
    token: string;
    initialized: boolean;
    revision: number;
    profile: { name: string; vaultName: string; createdAt: string };
    vault: DemoVaultSnapshot;
    payments: DemoLedgerPayment[];
    history: DemoHistoryEntry[];
    receipts: DemoReceipt[];
    scenario: DemoScenario;
}

export type DemoScenario = "success" | "failure" | "unknown";

export interface DemoWorkspaceOptions {
    now?: () => number;
    settleDelayMs?: number;
}

export interface PreparePaymentInput {
    idempotencyKey: string;
    recipient: string;
    amount: string; // canonical yoctoNEAR
    description: string;
    contractor?: string;
    billId?: string;
}

export interface PreparedPayment {
    payment: DemoLedgerPayment;
    // Single-use secret that binds the owner's confirmation to this exact
    // prepared record. It is never derived from the request and never repeats.
    confirmationSecret: string;
}

const SESSION_DAYS = 30;
const FUND_SANITY = BigInt(1_000_000) * (10n ** 24n); // Demo funding sanity cap per request.
const PREPARED_TTL_MS = 15 * 60 * 1000; // An unconfirmed preparation releases its reservation after this.
const secret = () => crypto.randomBytes(32).toString("hex");
const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

// Shared text validation for visitor-entered labels and idempotency keys.
function profileText(value: unknown, label: string): string {
    if (typeof value !== "string" || !value.trim() || value.length > 80)
        throw Error(`Enter ${label} (1–80 characters).`);
    return value.trim();
}

// A canonical, positive yoctoNEAR amount. Decimal strings are rejected: the
// boundary carries integers only, so a decimal can never be silently scaled.
function exactYocto(value: unknown, label: string): bigint {
    const text = typeof value === "string" ? value.trim() : "";
    if (!/^-?\d+$/.test(text))
        throw Error(`Enter ${label} as an exact whole number of yoctoNEAR.`);
    const parsed = BigInt(text);
    if (parsed <= 0n)
        throw Error(`The ${label} must be a positive amount.`);
    if (!/^(0|[1-9][0-9]*)$/.test(text))
        throw Error(`Enter ${label} as an exact whole number of yoctoNEAR.`);
    uint(text);
    return parsed;
}

const SCHEMA = `PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS demo_ws_sessions(token TEXT PRIMARY KEY, workspace TEXT, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS demo_ws_workspaces(workspace TEXT PRIMARY KEY, profile TEXT NOT NULL DEFAULT '', vault TEXT NOT NULL, scenario TEXT NOT NULL DEFAULT 'success', revision INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS demo_ws_events(id TEXT PRIMARY KEY, workspace TEXT NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL, amount TEXT NOT NULL, status TEXT NOT NULL, at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS demo_ws_payments(id TEXT PRIMARY KEY, workspace TEXT NOT NULL, contractor TEXT NOT NULL DEFAULT '', recipient TEXT NOT NULL, amount TEXT NOT NULL, fee TEXT NOT NULL, total TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '', reference TEXT NOT NULL, created_at TEXT NOT NULL, settle_after INTEGER NOT NULL, settled_at TEXT, bill_id TEXT, confirm_secret TEXT NOT NULL DEFAULT '', UNIQUE(workspace, reference));
      CREATE TABLE IF NOT EXISTS demo_ws_idempotency(workspace TEXT NOT NULL, key TEXT NOT NULL, payment TEXT NOT NULL, PRIMARY KEY(workspace, key));
      CREATE TABLE IF NOT EXISTS demo_intent_ids(id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS demo_workspace_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);`;

const PAYMENT_COLUMNS = "id,contractor,recipient,amount,fee,total,description,status,reason,reference,created_at,settle_after,settled_at,bill_id,confirm_secret";

export class DemoWorkspaceStore {
    readonly db: DatabaseSync;
    private readonly now: () => number;
    readonly settleDelayMs: number;

    constructor(file: string, options: DemoWorkspaceOptions = {}) {
        this.now = options.now ?? (() => Date.now());
        this.settleDelayMs = options.settleDelayMs ?? 900;
        fs.mkdirSync(path.dirname(file), { recursive: true });
        this.db = new DatabaseSync(file);
        this.db.exec(SCHEMA);
        this.migrate();
        const storedMode = this.db.prepare("SELECT value FROM demo_workspace_meta WHERE key='mode'").get() as { value: string } | undefined;
        if (storedMode && storedMode.value !== "simulation") {
            this.db.close();
            throw Error("Demo workspace database mode mismatch. Demo records cannot use a live organization database.");
        }
        this.db.prepare("INSERT OR IGNORE INTO demo_workspace_meta VALUES ('mode','simulation')").run();
    }
    close() { this.db.close(); }
    simulationScope(token:string) {
        const session=this.session(token);
        const row=this.requiredWorkspaceRow(session.workspace ?? "");
        return {workspace:row.workspace,vault:this.vaultState(row)};
    }

    // Older demo workspaces predate the two-phase payment lifecycle. Their rows
    // gain the confirmation column without rewriting any recorded money.
    private migrate() {
        const columns = new Set((this.db.prepare("PRAGMA table_info(demo_ws_payments)").all() as { name: string }[]).map(c => c.name));
        if (!columns.has("confirm_secret"))
            this.db.exec("ALTER TABLE demo_ws_payments ADD COLUMN confirm_secret TEXT NOT NULL DEFAULT ''");
    }

    private withWrite<T>(body: () => T): T {
        this.db.exec("BEGIN IMMEDIATE");
        try {
            const result = body();
            this.db.exec("COMMIT");
            return result;
        } catch (e) {
            this.db.exec("ROLLBACK");
            throw e;
        }
    }

    private session(token: string): SessionRow {
        const row = this.db.prepare("SELECT token,workspace,expires FROM demo_ws_sessions WHERE token=?").get(hash(token)) as SessionRow | undefined;
        if (!row || row.expires <= this.now())
            throw Error("Start a demo workspace first. Open the demo route and create one; nothing is shared.");
        return row;
    }

    private workspaceRow(workspace: string): WorkspaceRow | undefined {
        return this.db.prepare("SELECT workspace,profile,vault,scenario,revision FROM demo_ws_workspaces WHERE workspace=?").get(workspace) as WorkspaceRow | undefined;
    }

    private requiredWorkspaceRow(workspace: string): WorkspaceRow {
        const row = this.workspaceRow(workspace);
        if (!row)
            throw Error("Create the owner profile and vault first; the demo starts from a blank workspace.");
        return row;
    }

    private zeroVault() {
        return JSON.stringify({ funded: "0", spent: "0", reserved: "0", limit: "", paused: false });
    }

    private vaultState(row: WorkspaceRow): DemoVaultState {
        const raw = JSON.parse(row.vault) as Partial<DemoVaultState>;
        return {
            funded: raw.funded ?? "0",
            spent: raw.spent ?? "0",
            reserved: raw.reserved ?? "0",
            limit: raw.limit ?? "",
            paused: raw.paused === true,
        };
    }

    private bumpRevision(workspace: string) {
        this.db.prepare("UPDATE demo_ws_workspaces SET revision=revision+1 WHERE workspace=?").run(workspace);
    }

    start(existing: string): { token: string; snapshot: DemoWorkspaceSnapshot } {
        const token = this.withWrite(() => {
            const alive = existing.length >= 32
                ? this.db.prepare("SELECT token FROM demo_ws_sessions WHERE token=? AND expires>?").get(hash(existing), this.now()) as { token: string } | undefined
                : undefined;
            if (alive) return existing;
            const fresh = secret();
            this.db.prepare("INSERT INTO demo_ws_sessions(token,workspace,expires) VALUES (?,NULL,?)").run(hash(fresh), this.now() + SESSION_DAYS * 86400000);
            return fresh;
        });
        return { token, snapshot: this.state(token) };
    }

    createWorkspace(token: string, input: { profileName: string; vaultName: string }): DemoWorkspaceSnapshot {
        const profileName = profileText(input.profileName, "an owner name");
        const vaultName = profileText(input.vaultName, "a vault name");
        this.withWrite(() => {
            const session = this.session(token);
            const existing = session.workspace ? this.workspaceRow(session.workspace) : undefined;
            if (existing && existing.profile)
                throw Error("This demo workspace was already created. Use Reset demo workspace to start over.");
            const workspace = existing?.workspace ?? (session.workspace ?? crypto.randomUUID());
            if (!existing || !session.workspace)
                this.db.prepare("UPDATE demo_ws_sessions SET workspace=? WHERE token=?").run(workspace, hash(token));
            // A new demo vault starts ready to simulate. Pausing is an explicit
            // owner decision, never the default, and it never touches live state.
            this.db.prepare(`INSERT INTO demo_ws_workspaces(workspace,profile,vault,scenario,revision) VALUES (?,?,?, 'success', 0)
              ON CONFLICT(workspace) DO UPDATE SET profile=excluded.profile, vault=excluded.vault, scenario='success', revision=revision+1`)
                .run(workspace, JSON.stringify({ name: profileName, vaultName, createdAt: new Date(this.now()).toISOString() }), this.zeroVault());
        });
        return this.state(token);
    }

    state(token: string): DemoWorkspaceSnapshot {
        const session = this.session(token);
        if (!session.workspace)
            return blankSnapshot(token);
        const row = this.requiredWorkspaceRow(session.workspace);
        this.settleDue(row);
        return this.assemble(this.requiredWorkspaceRow(row.workspace), token);
    }

    snapshot(token: string): DemoWorkspaceSnapshot { return this.state(token); }

    // Releases reservations for preparations the owner never confirmed and
    // settles confirmed attempts. Both paths are all-or-nothing: a failed
    // execution releases its reservation and never debits the vault.
    private settleDue(row: WorkspaceRow) {
        const fresh = this.requiredWorkspaceRow(row.workspace);
        this.withWrite(() => {
            const vault = this.vaultState(fresh);
            let changed = false;
            const expired = this.db.prepare("SELECT id,total FROM demo_ws_payments WHERE workspace=? AND status='prepared' AND id NOT IN (SELECT id FROM demo_intent_ids) AND created_at<=?")
                .all(fresh.workspace, new Date(this.now() - PREPARED_TTL_MS).toISOString()) as { id: string; total: string }[];
            for (const payment of expired) {
                vault.reserved = (BigInt(vault.reserved) - BigInt(payment.total)).toString();
                this.db.prepare("UPDATE demo_ws_payments SET status='cancelled', reason=?, settled_at=?, settle_after=0, confirm_secret='' WHERE id=? AND status='prepared'")
                    .run("The prepared payment expired before it was confirmed, so the reserved demo funds were released.", new Date(this.now()).toISOString(), payment.id);
                changed = true;
            }
            const due = this.db.prepare("SELECT id,total FROM demo_ws_payments WHERE workspace=? AND status='pending' AND id NOT IN (SELECT id FROM demo_intent_ids) AND settle_after<=?").all(fresh.workspace, this.now()) as { id: string; total: string }[];
            if (due.length && fresh.scenario !== "unknown") {
                const success = fresh.scenario === "success";
                for (const payment of due) {
                    vault.reserved = (BigInt(vault.reserved) - BigInt(payment.total)).toString();
                    // A debit may never exceed the funded balance. If it would,
                    // the reservation is released and the attempt fails instead.
                    const debitFits = BigInt(vault.spent) + BigInt(payment.total) <= BigInt(vault.funded);
                    const settled = success && debitFits;
                    if (settled) vault.spent = (BigInt(vault.spent) + BigInt(payment.total)).toString();
                    this.db.prepare("UPDATE demo_ws_payments SET status=?, reason=?, settled_at=?, settle_after=0 WHERE id=? AND status='pending'")
                        .run(
                            settled ? "confirmed" : "failed",
                            settled
                                ? ""
                                : success
                                    ? "The simulated debit would exceed the funded demo balance, so the reservation was released and no funds moved."
                                    : "Simulated settlement failed (the demo outcome control is set to failure). No funds left the demo vault this time.",
                            new Date(this.now()).toISOString(), payment.id);
                    changed = true;
                }
            }
            if (changed)
                this.db.prepare("UPDATE demo_ws_workspaces SET vault=? WHERE workspace=?").run(JSON.stringify(vault), fresh.workspace);
        });
    }

    fund(token: string, amount: string): DemoWorkspaceSnapshot {
        const parsed = exactYocto(amount, "funding amount");
        if (parsed > FUND_SANITY)
            throw Error(`Fund a smaller demo amount: the funding sanity limit is ${formatNear(FUND_SANITY.toString())} NEAR per request. The demo walkthrough can repeat funding freely.`);
        this.withWrite(() => {
            const session = this.session(token);
            const row = this.requiredWorkspaceRow(session.workspace ?? "");
            const vault = this.vaultState(row);
            vault.funded = (BigInt(vault.funded) + parsed).toString();
            this.db.prepare("UPDATE demo_ws_workspaces SET vault=?, revision=revision+1 WHERE workspace=?").run(JSON.stringify(vault), row.workspace);
            this.db.prepare("INSERT INTO demo_ws_events(id,workspace,kind,label,amount,status,at) VALUES (?,?,?,?,?,?,?)").run(
                crypto.randomUUID(), row.workspace, "funding",
                `Funded the demo vault with ${formatNear(parsed.toString())} NEAR from the Demo Wallet (simulated funds).`,
                formatNear(parsed.toString()), "confirmed", new Date(this.now()).toISOString());
        });
        return this.state(token);
    }

    private paymentRecord(r: PaymentRow, label?: string): DemoLedgerPayment {
        return {
            id: r.id, kind: "payment",
            label: label ?? r.description,
            contractor: r.contractor,
            recipient: r.recipient,
            amount: r.amount, fee: r.fee, total: r.total,
            description: r.description,
            status: r.status, reason: r.reason,
            reference: r.reference,
            createdAt: r.created_at,
            settledAt: r.settled_at,
            billId: r.bill_id,
            awaitingConfirmation: r.status === "prepared"
        };
    }

    private assemble(row: WorkspaceRow, token: string): DemoWorkspaceSnapshot {
        const profile = row.profile ? JSON.parse(row.profile) as { name: string; vaultName: string; createdAt: string } : null;
        const vault = this.vaultOf(row);
        const payments = (this.db.prepare(`SELECT ${PAYMENT_COLUMNS} FROM demo_ws_payments WHERE workspace=? ORDER BY rowid DESC`).all(row.workspace) as unknown as PaymentRow[]).map(r => this.paymentRecord(r));
        const funding = (this.db.prepare("SELECT id,kind,label,amount,status,at FROM demo_ws_events WHERE workspace=? ORDER BY rowid DESC").all(row.workspace) as unknown as DemoHistoryEntry[]);
        const history: DemoHistoryEntry[] = [
            ...funding,
            ...payments.map(p => ({ id: p.id, kind: "payment" as const, label: p.label, amount: p.amount, status: (p.status === "confirmed" ? "confirmed" : p.status === "failed" || p.status === "cancelled" ? "failed" : "pending") as DemoHistoryEntry["status"], at: p.createdAt }))
        ].sort((a, b) => b.at.localeCompare(a.at) || (a.kind === b.kind ? 0 : a.kind === "funding" ? 1 : -1));
        const receipts = payments.filter(p => p.status === "confirmed").map(p => ({
            id: p.id, contractor: p.contractor, recipient: p.recipient, amount: p.amount,
            reference: p.reference, at: p.createdAt,
            summary: `${p.contractor || p.recipient} · ${formatNear(p.amount)} NEAR · ${p.reference} · ${p.description} · Demo receipt: simulated funds, no live transfer.`
        }));
        return {
            mode: "simulation", token, initialized: !!profile,
            profile: profile ?? { name: "", vaultName: "", createdAt: "" },
            vault: { ...vault }, revision: row.revision,
            payments, history, receipts,
            scenario: row.scenario === "failure" ? "failure" : row.scenario === "unknown" ? "unknown" : "success"
        };
    }

    private vaultOf(row: WorkspaceRow) {
        const v = this.vaultState(row);
        const available = BigInt(v.funded) - BigInt(v.spent) - BigInt(v.reserved);
        return { ...v, available: available.toString() };
    }

    // Phase one of a simulated payment: validate the request, hold the amount
    // and wait for the owner's explicit confirmation. Nothing is executed and no
    // funds have moved when this returns.
    preparePayment(token: string, input: PreparePaymentInput): PreparedPayment {
        const key = profileText(input.idempotencyKey, "a payment key");
        const recipient = account(input.recipient);
        const parsed = exactYocto(input.amount, "payment amount");
        if (typeof input.description !== "string" || !input.description.trim() || input.description.length > 240)
            throw Error("Enter a short payment description (up to 240 characters).");
        const contractor = typeof input.contractor === "string" ? input.contractor.trim().slice(0, 80) : "";
        const billId = typeof input.billId === "string" && input.billId.trim() ? input.billId.trim().slice(0, 120) : null;
        return this.withWrite((): PreparedPayment => {
            const session = this.session(token);
            const row = this.requiredWorkspaceRow(session.workspace ?? "");
            // A retried preparation resolves to the same single attempt: no double debit, no second receipt.
            const seen = this.db.prepare("SELECT payment FROM demo_ws_idempotency WHERE workspace=? AND key=?").get(row.workspace, key) as { payment: string } | undefined;
            if (seen) {
                const record = this.db.prepare(`SELECT ${PAYMENT_COLUMNS} FROM demo_ws_payments WHERE id=?`).get(seen.payment) as unknown as PaymentRow | undefined;
                if (record) return { payment: this.paymentRecord(record), confirmationSecret: record.confirm_secret };
            }
            const vault = this.vaultState(row);
            // A paused demo vault refuses every new payment. The live vault keeps
            // its own pause rules untouched by this branch.
            if (vault.paused)
                throw Error("The demo vault is paused. Resume it in Vault & Controls before preparing a payment.");
            if (billId) {
                const claimed = this.db.prepare("SELECT id FROM demo_ws_payments WHERE workspace=? AND bill_id=? AND status IN ('prepared','pending','confirmed')").get(row.workspace, billId);
                if (claimed)
                    throw Error("This invoice has already been prepared or paid. Open Activity for the existing record.");
            }
            const total = (parsed + BigInt(DEMO_FEE)).toString();
            const displayAmount = formatNear(parsed.toString());
            const available = BigInt(vault.funded) - BigInt(vault.spent) - BigInt(vault.reserved);
            const declineReason =
                vault.limit && parsed > BigInt(vault.limit)
                    ? `The amount ${displayAmount} NEAR exceeds the demo spending limit (${formatNear(vault.limit)} NEAR) set in Settings. Use a smaller amount or raise the limit.`
                    : BigInt(total) > available
                        ? `Insufficient demo funds: the total debit is ${formatNear(total)} NEAR (amount ${displayAmount} + ${formatNear(DEMO_FEE)} demo fee), but only ${formatNear(available.toString())} NEAR is available. Fund the demo vault to continue.`
                        : null;
            const id = crypto.randomUUID();
            const confirmationSecret = secret();
            const record: PaymentRow = {
                id, contractor, recipient, amount: parsed.toString(), fee: DEMO_FEE, total,
                description: input.description.trim(),
                status: declineReason ? "failed" : "prepared",
                reason: declineReason ?? "",
                reference: this.nextReference(row.workspace),
                created_at: new Date(this.now()).toISOString(),
                settled_at: declineReason ? new Date(this.now()).toISOString() : null,
                bill_id: billId,
                confirm_secret: declineReason ? "" : confirmationSecret
            };
            this.db.prepare(`INSERT INTO demo_ws_payments(id,workspace,contractor,recipient,amount,fee,total,description,status,reason,reference,created_at,settle_after,settled_at,bill_id,confirm_secret) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
                record.id, row.workspace, record.contractor, record.recipient, record.amount, record.fee, record.total,
                record.description, record.status, record.reason, record.reference, record.created_at,
                0, record.settled_at, record.bill_id, record.confirm_secret);
            this.db.prepare("INSERT INTO demo_ws_idempotency(workspace,key,payment) VALUES (?,?,?)").run(row.workspace, key, record.id);
            if (!declineReason) {
                // The reservation is held from preparation until the attempt settles.
                vault.reserved = (BigInt(vault.reserved) + BigInt(total)).toString();
                this.db.prepare("UPDATE demo_ws_workspaces SET vault=? WHERE workspace=?").run(JSON.stringify(vault), row.workspace);
            }
            this.bumpRevision(row.workspace);
            return { payment: this.paymentRecord(record), confirmationSecret: declineReason ? "" : confirmationSecret };
        });
    }

    // Phase two: the owner's explicit confirmation releases the attempt. The
    // secret binds the confirmation to this exact prepared record and is
    // single-use, so a repeated confirmation never produces a second debit.
    confirmPayment(token: string, input: { paymentId: string; confirmationSecret: string }): DemoLedgerPayment {
        const paymentId = profileText(input.paymentId, "a payment reference");
        const confirmationSecret = typeof input.confirmationSecret === "string" ? input.confirmationSecret.trim() : "";
        // The refusal path below releases a reservation and records the failed
        // attempt. That work must survive the transaction, so the refusal is
        // raised only after the commit.
        const outcome = this.withWrite((): { payment: DemoLedgerPayment; refusal?: string } => {
            const session = this.session(token);
            const row = this.requiredWorkspaceRow(session.workspace ?? "");
            const record = this.db.prepare(`SELECT ${PAYMENT_COLUMNS} FROM demo_ws_payments WHERE id=? AND workspace=?`).get(paymentId, row.workspace) as unknown as PaymentRow | undefined;
            if (!record)
                throw Error("That prepared payment does not exist in this demo workspace.");
            if(this.db.prepare("SELECT id FROM demo_intent_ids WHERE id=?").get(record.id)) throw Error("Use the simulated Intents authorization endpoint.");
            // Confirming twice resolves to the same attempt.
            if (record.status === "pending" || record.status === "confirmed")
                return { payment: this.paymentRecord(record) };
            if (record.status !== "prepared")
                throw Error("This payment is no longer awaiting confirmation. Review its record in Activity.");
            if (!record.confirm_secret || record.confirm_secret !== confirmationSecret)
                throw Error("This confirmation does not match the prepared payment. Prepare the payment again and confirm it once.");
            const vault = this.vaultState(row);
            if (vault.paused) {
                // The owner paused the vault between preparation and confirmation:
                // release the reservation and leave a visible, failed record.
                vault.reserved = (BigInt(vault.reserved) - BigInt(record.total)).toString();
                this.db.prepare("UPDATE demo_ws_payments SET status='failed', reason=?, settled_at=?, settle_after=0, confirm_secret='' WHERE id=? AND status='prepared'")
                    .run("The demo vault was paused before this payment was confirmed, so the reserved demo funds were released.", new Date(this.now()).toISOString(), record.id);
                this.db.prepare("UPDATE demo_ws_workspaces SET vault=?, revision=revision+1 WHERE workspace=?").run(JSON.stringify(vault), row.workspace);
                const refused = this.db.prepare(`SELECT ${PAYMENT_COLUMNS} FROM demo_ws_payments WHERE id=?`).get(record.id) as unknown as PaymentRow;
                return {
                    payment: this.paymentRecord(refused),
                    refusal: "The demo vault was paused before this payment was confirmed. Resume it in Vault & Controls and prepare the payment again."
                };
            }
            if (BigInt(vault.reserved) < BigInt(record.total))
                throw Error("The reserved demo funds for this payment are no longer held. Prepare the payment again.");
            this.db.prepare("UPDATE demo_ws_payments SET status='pending', reason='', settle_after=?, confirm_secret='' WHERE id=? AND status='prepared'")
                .run(this.now() + this.settleDelayMs, record.id);
            this.bumpRevision(row.workspace);
            const updated = this.db.prepare(`SELECT ${PAYMENT_COLUMNS} FROM demo_ws_payments WHERE id=?`).get(record.id) as unknown as PaymentRow;
            return { payment: this.paymentRecord(updated) };
        });
        if (outcome.refusal) throw Error(outcome.refusal);
        return outcome.payment;
    }

    // Releases an unconfirmed preparation without executing it.
    cancelPayment(token: string, paymentId: string): DemoLedgerPayment {
        const id = profileText(paymentId, "a payment reference");
        return this.withWrite((): DemoLedgerPayment => {
            const session = this.session(token);
            const row = this.requiredWorkspaceRow(session.workspace ?? "");
            const record = this.db.prepare(`SELECT ${PAYMENT_COLUMNS} FROM demo_ws_payments WHERE id=? AND workspace=?`).get(id, row.workspace) as unknown as PaymentRow | undefined;
            if (!record)
                throw Error("That prepared payment does not exist in this demo workspace.");
            if(this.db.prepare("SELECT id FROM demo_intent_ids WHERE id=?").get(record.id)) throw Error("Use the simulated Intents lifecycle; reservations release on expiry.");
            if (record.status !== "prepared")
                throw Error("Only a prepared payment can be cancelled. Review its record in Activity.");
            const vault = this.vaultState(row);
            vault.reserved = (BigInt(vault.reserved) - BigInt(record.total)).toString();
            this.db.prepare("UPDATE demo_ws_payments SET status='cancelled', reason=?, settled_at=?, settle_after=0, confirm_secret='' WHERE id=? AND status='prepared'")
                .run("The prepared payment was cancelled, so the reserved demo funds were released.", new Date(this.now()).toISOString(), record.id);
            this.db.prepare("UPDATE demo_ws_workspaces SET vault=?, revision=revision+1 WHERE workspace=?").run(JSON.stringify(vault), row.workspace);
            const updated = this.db.prepare(`SELECT ${PAYMENT_COLUMNS} FROM demo_ws_payments WHERE id=?`).get(record.id) as unknown as PaymentRow;
            return this.paymentRecord(updated);
        });
    }

    private nextReference(workspace: string): string {
        // Demo references are sequential SIM-0001… ; each attempt keeps exactly one.
        const count = this.db.prepare("SELECT count(*) n FROM demo_ws_payments WHERE workspace=?").get(workspace) as { n: number };
        return "SIM-" + String(count.n + 1).padStart(4, "0");
    }

    setScenario(token: string, scenario: DemoScenario): DemoWorkspaceSnapshot {
        if (scenario !== "success" && scenario !== "failure" && scenario !== "unknown")
            throw Error("Choose a labeled demo settlement outcome.");
        this.withWrite(() => {
            const session = this.session(token);
            const row = this.requiredWorkspaceRow(session.workspace ?? "");
            this.db.prepare("UPDATE demo_ws_workspaces SET scenario=?, revision=revision+1 WHERE workspace=?").run(scenario, row.workspace);
        });
        return this.state(token);
    }

    setLimit(token: string, amount: string): DemoWorkspaceSnapshot {
        const limit = amount === "" ? "" : exactYocto(amount, "spending limit").toString();
        this.withWrite(() => {
            const session = this.session(token);
            const row = this.requiredWorkspaceRow(session.workspace ?? "");
            const vault = this.vaultState(row);
            vault.limit = limit;
            this.db.prepare("UPDATE demo_ws_workspaces SET vault=?, revision=revision+1 WHERE workspace=?").run(JSON.stringify(vault), row.workspace);
        });
        return this.state(token);
    }

    // The demo owner's explicit pause decision. It gates the demo ledger only:
    // the live vault keeps its own, independent pause state.
    setPaused(token: string, paused: boolean): DemoWorkspaceSnapshot {
        this.withWrite(() => {
            const session = this.session(token);
            const row = this.requiredWorkspaceRow(session.workspace ?? "");
            const vault = this.vaultState(row);
            vault.paused = paused === true;
            this.db.prepare("UPDATE demo_ws_workspaces SET vault=?, revision=revision+1 WHERE workspace=?").run(JSON.stringify(vault), row.workspace);
            this.db.prepare("INSERT INTO demo_ws_events(id,workspace,kind,label,amount,status,at) VALUES (?,?,?,?,?,?,?)").run(
                crypto.randomUUID(), row.workspace, "control",
                paused
                    ? "Paused the demo vault. New simulated payments are refused until it is resumed."
                    : "Resumed the demo vault. Simulated payments can be prepared again.",
                "0", "confirmed", new Date(this.now()).toISOString());
        });
        return this.state(token);
    }

    reset(token: string): DemoWorkspaceSnapshot {
        this.withWrite(() => {
            const session = this.session(token);
            const row = this.requiredWorkspaceRow(session.workspace ?? "");
            if(this.db.prepare("SELECT id FROM demo_ws_payments WHERE workspace=? AND id IN (SELECT id FROM demo_intent_ids) AND status IN ('prepared','pending')").get(row.workspace)) throw Error("Finish or expire the active simulated Intents payment before resetting.");
            this.db.prepare("DELETE FROM demo_ws_payments WHERE workspace=?").run(row.workspace);
            this.db.prepare("DELETE FROM demo_ws_events WHERE workspace=?").run(row.workspace);
            this.db.prepare("DELETE FROM demo_ws_idempotency WHERE workspace=?").run(row.workspace);
            this.db.prepare("UPDATE demo_ws_workspaces SET profile='', vault=?, scenario='success', revision=revision+1 WHERE workspace=?").run(this.zeroVault(), row.workspace);
        });
        return this.state(token);
    }
}

interface SessionRow {
    token: string;
    workspace: string | null;
    expires: number;
}

interface WorkspaceRow {
    workspace: string;
    profile: string;
    vault: string;
    scenario: string;
    revision: number;
}

interface PaymentRow {
    id: string; contractor: string; recipient: string; amount: string; fee: string; total: string;
    description: string; status: DemoPaymentStatus; reason: string; reference: string;
    created_at: string; settled_at: string | null; bill_id: string | null; confirm_secret: string;
}

function blankSnapshot(token: string): DemoWorkspaceSnapshot {
    return {
        mode: "simulation", token, initialized: false, revision: 0,
        profile: { name: "", vaultName: "", createdAt: "" },
        vault: { funded: "0", spent: "0", reserved: "0", limit: "", paused: false, available: "0" },
        payments: [], history: [], receipts: [], scenario: "success"
    };
}

// One shared store for the whole server process; the file is gitignored and
// per-deployment. Mirrors demoContractors(): same relative default path.
let singleton: DemoWorkspaceStore | undefined;
export function demoWorkspace() {
    return singleton ??= new DemoWorkspaceStore(path.resolve(/* turbopackIgnore: true */ process.env.NNETICS_DEMO_WORKSPACE_DB || "../../artifacts/demo/demo-workspace.db"));
}
