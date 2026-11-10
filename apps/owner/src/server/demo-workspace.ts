// Demo-only visitor ledger: a blank simulated workspace per browser session, stored
// in a separate SQLite file. It never touches live accounts, credentials or the
// live transaction path, and every record it produces is explicitly simulated.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { amountFromNear, formatNear, account } from "../data/owner-adapter.ts";
import { DEMO_FEE } from "../data/demo-constants.ts";

export { DEMO_FEE };

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
    status: "pending" | "confirmed" | "failed";
    reason: string;
    reference: string;
    createdAt: string;
    settledAt: string | null;
    billId: string | null;
}

export interface DemoHistoryEntry {
    id: string;
    kind: "funding" | "payment";
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

export interface DemoWorkspaceSnapshot {
    mode: "simulation";
    token: string;
    initialized: boolean;
    revision: number;
    profile: { name: string; vaultName: string; createdAt: string };
    vault: { funded: string; spent: string; reserved: string; limit: string; available: string };
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

const SESSION_DAYS = 30;
const FUND_SANITY = BigInt(1_000_000) * (10n ** 24n); // Demo funding sanity cap per request.
const secret = () => crypto.randomBytes(32).toString("hex");
const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

// Shared text validation for visitor-entered labels and idempotency keys.
function profileText(value: unknown, label: string): string {
    if (typeof value !== "string" || !value.trim() || value.length > 80)
        throw Error(`Enter ${label} (1–80 characters).`);
    return value.trim();
}
const SCHEMA = `PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS demo_ws_sessions(token TEXT PRIMARY KEY, workspace TEXT, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS demo_ws_workspaces(workspace TEXT PRIMARY KEY, profile TEXT NOT NULL DEFAULT '', vault TEXT NOT NULL, scenario TEXT NOT NULL DEFAULT 'success', revision INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS demo_ws_events(id TEXT PRIMARY KEY, workspace TEXT NOT NULL, kind TEXT NOT NULL, label TEXT NOT NULL, amount TEXT NOT NULL, status TEXT NOT NULL, at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS demo_ws_payments(id TEXT PRIMARY KEY, workspace TEXT NOT NULL, contractor TEXT NOT NULL DEFAULT '', recipient TEXT NOT NULL, amount TEXT NOT NULL, fee TEXT NOT NULL, total TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '', reference TEXT NOT NULL, created_at TEXT NOT NULL, settle_after INTEGER NOT NULL, settled_at TEXT, bill_id TEXT, UNIQUE(workspace, reference));
      CREATE TABLE IF NOT EXISTS demo_ws_idempotency(workspace TEXT NOT NULL, key TEXT NOT NULL, payment TEXT NOT NULL, PRIMARY KEY(workspace, key));
      CREATE TABLE IF NOT EXISTS demo_workspace_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);`;

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
        const storedMode = this.db.prepare("SELECT value FROM demo_workspace_meta WHERE key='mode'").get() as { value: string } | undefined;
        if (storedMode && storedMode.value !== "simulation") {
            this.db.close();
            throw Error("Demo workspace database mode mismatch. Demo records cannot use a live organization database.");
        }
        this.db.prepare("INSERT OR IGNORE INTO demo_workspace_meta VALUES ('mode','simulation')").run();
    }
    close() { this.db.close(); }

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
        return JSON.stringify({ funded: "0", spent: "0", reserved: "0", limit: "" });
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

    private settleDue(row: WorkspaceRow) {
        const fresh = this.requiredWorkspaceRow(row.workspace);
        this.withWrite(() => {
            const due = this.db.prepare("SELECT id,total FROM demo_ws_payments WHERE workspace=? AND status='pending' AND settle_after<=?").all(fresh.workspace, this.now()) as { id: string; total: string }[];
            if (!due.length) return;
            if (fresh.scenario === "unknown") return;
            const vault = JSON.parse(fresh.vault) as { funded: string; spent: string; reserved: string; limit: string };
            const success = fresh.scenario === "success";
            for (const payment of due) {
                vault.reserved = (BigInt(vault.reserved) - BigInt(payment.total)).toString();
                if (success) vault.spent = (BigInt(vault.spent) + BigInt(payment.total)).toString();
                this.db.prepare("UPDATE demo_ws_payments SET status=?, reason=?, settled_at=?, settle_after=? WHERE id=? AND status='pending'")
                    .run(
                        success ? "confirmed" : "failed",
                        success ? "" : "Simulated settlement failed (the demo outcome control is set to failure). No funds left the demo vault this time.",
                        new Date(this.now()).toISOString(), 0, payment.id);
            }
            this.db.prepare("UPDATE demo_ws_workspaces SET vault=? WHERE workspace=?").run(JSON.stringify(vault), fresh.workspace);
        });
    }

    fund(token: string, amount: string): DemoWorkspaceSnapshot {
        const raw = String(amount ?? "").trim();
        if (raw.startsWith("-")) throw Error("Fund a positive demo NEAR amount.");
        const parsed = amountFromNear(raw);
        if (BigInt(parsed) > FUND_SANITY)
            throw Error(`Fund a smaller demo amount: the funding sanity limit is ${formatNear(FUND_SANITY.toString())} NEAR per request. The demo walkthrough can repeat funding freely.`);
        this.withWrite(() => {
            const session = this.session(token);
            const row = this.requiredWorkspaceRow(session.workspace ?? "");
            const vault = JSON.parse(row.vault) as { funded: string; spent: string; reserved: string; limit: string };
            vault.funded = (BigInt(vault.funded) + BigInt(parsed)).toString();
            this.db.prepare("UPDATE demo_ws_workspaces SET vault=?, revision=revision+1 WHERE workspace=?").run(JSON.stringify(vault), row.workspace);
            this.db.prepare("INSERT INTO demo_ws_events(id,workspace,kind,label,amount,status,at) VALUES (?,?,?,?,?,?,?)").run(
                crypto.randomUUID(), row.workspace, "funding",
                `Funded the demo vault with ${formatNear(parsed)} NEAR from the Demo Wallet (simulated funds).`,
                formatNear(parsed), "confirmed", new Date(this.now()).toISOString());
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
            billId: r.bill_id
        };
    }

    private assemble(row: WorkspaceRow, token: string): DemoWorkspaceSnapshot {
        const profile = row.profile ? JSON.parse(row.profile) as { name: string; vaultName: string; createdAt: string } : null;
        const vault = this.vaultOf(row);
        const payments = (this.db.prepare("SELECT id,contractor,recipient,amount,fee,total,description,status,reason,reference,created_at,settled_at,bill_id FROM demo_ws_payments WHERE workspace=? ORDER BY rowid DESC").all(row.workspace) as unknown as PaymentRow[]).map(r => this.paymentRecord(r));
        const funding = (this.db.prepare("SELECT id,kind,label,amount,status,at FROM demo_ws_events WHERE workspace=? ORDER BY rowid DESC").all(row.workspace) as unknown as DemoHistoryEntry[]);
        const history: DemoHistoryEntry[] = [
            ...funding,
            ...payments.map(p => ({ id: p.id, kind: "payment" as const, label: p.label, amount: p.amount, status: p.status, at: p.createdAt }))
        ].sort((a, b) => b.at.localeCompare(a.at) || (a.kind === b.kind ? 0 : a.kind === "funding" ? 1 : -1));
        const receipts = payments.filter(p => p.status === "confirmed").map(p => ({
            id: p.id, contractor: p.contractor, recipient: p.recipient, amount: p.amount,
            reference: p.reference, at: p.createdAt,
            summary: `${p.contractor || p.recipient} · ${p.amount} NEAR · ${p.reference} · ${p.description} · Demo receipt: simulated funds, no live transfer.`
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
        const v = JSON.parse(row.vault) as { funded: string; spent: string; reserved: string; limit: string };
        const available = BigInt(v.funded) - BigInt(v.spent) - BigInt(v.reserved);
        return { ...v, available: available.toString() };
    }

    approvePayment(token: string, input: {
        idempotencyKey: string; recipient: string; amount: string; description: string;
        contractor?: string; billId?: string;
    }): DemoLedgerPayment {
        const key = profileText(input.idempotencyKey, "a payment key");
        const recipient = account(input.recipient);
        const parsed = amountFromNear(input.amount);
        if (typeof input.description !== "string" || !input.description.trim() || input.description.length > 240)
            throw Error("Enter a short payment description (up to 240 characters).");
        const contractor = typeof input.contractor === "string" ? input.contractor.trim().slice(0, 80) : "";
        const result = this.withWrite((): DemoLedgerPayment => {
            const session = this.session(token);
            const row = this.requiredWorkspaceRow(session.workspace ?? "");
            // A retried submission resolves to the same single attempt: no double debit, no second receipt.
            const seen = this.db.prepare("SELECT payment FROM demo_ws_idempotency WHERE workspace=? AND key=?").get(row.workspace, key) as { payment: string } | undefined;
            if (seen) {
                const record = this.db.prepare("SELECT id,contractor,recipient,amount,fee,total,description,status,reason,reference,created_at,settled_at,bill_id FROM demo_ws_payments WHERE id=?").get(seen.payment) as PaymentRow | undefined;
                if (record) return this.paymentRecord(record);
            }
            const vault = JSON.parse(row.vault) as { funded: string; spent: string; reserved: string; limit: string };
            const total = (BigInt(parsed) + BigInt(DEMO_FEE)).toString();
            const displayAmount = formatNear(parsed);
            const declineReason =
                vault.limit && BigInt(parsed) > BigInt(vault.limit)
                    ? `The amount ${displayAmount} NEAR exceeds the demo spending limit (${formatNear(vault.limit)} NEAR) set in Settings. Use a smaller amount or raise the limit.`
                    : BigInt(total) > BigInt(vault.funded) - BigInt(vault.spent) - BigInt(vault.reserved)
                        ? `Insufficient demo funds: the total debit is ${formatNear(total)} NEAR (amount ${displayAmount} + ${formatNear(DEMO_FEE)} demo fee), but only ${formatNear((BigInt(vault.funded) - BigInt(vault.spent) - BigInt(vault.reserved)).toString())} NEAR is available. Fund the demo vault to continue.`
                        : null;
            const id = crypto.randomUUID();
            const record: PaymentRow = {
                id, contractor, recipient, amount: parsed.toString(), fee: DEMO_FEE, total,
                description: input.description.trim(),
                status: declineReason ? "failed" : "pending",
                reason: declineReason ?? "",
                reference: this.nextReference(row.workspace),
                created_at: new Date(this.now()).toISOString(),
                settled_at: declineReason ? new Date(this.now()).toISOString() : null,
                bill_id: input.billId ?? null
            };
            this.db.prepare("INSERT INTO demo_ws_payments(id,workspace,contractor,recipient,amount,fee,total,description,status,reason,reference,created_at,settle_after,settled_at,bill_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
                record.id, row.workspace, record.contractor, record.recipient, record.amount, record.fee, record.total,
                record.description, record.status, record.reason, record.reference, record.created_at,
                record.status === "pending" ? this.now() + this.settleDelayMs : 0, record.settled_at, record.bill_id);
            this.db.prepare("INSERT INTO demo_ws_idempotency(workspace,key,payment) VALUES (?,?,?)").run(row.workspace, key, record.id);
            if (!declineReason) {
                vault.reserved = (BigInt(vault.reserved) + BigInt(total)).toString();
                this.db.prepare("UPDATE demo_ws_workspaces SET vault=? WHERE workspace=?").run(JSON.stringify(vault), row.workspace);
            }
            this.bumpRevision(row.workspace);
            return this.paymentRecord(record);
        });
        return result;
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
        const limit = amount === "" ? "" : amountFromNear(amount).toString();
        this.withWrite(() => {
            const session = this.session(token);
            const row = this.requiredWorkspaceRow(session.workspace ?? "");
            const vault = JSON.parse(row.vault) as { funded: string; spent: string; reserved: string; limit: string };
            vault.limit = limit;
            this.db.prepare("UPDATE demo_ws_workspaces SET vault=?, revision=revision+1 WHERE workspace=?").run(JSON.stringify(vault), row.workspace);
        });
        return this.state(token);
    }

    reset(token: string): DemoWorkspaceSnapshot {
        this.withWrite(() => {
            const session = this.session(token);
            const row = this.requiredWorkspaceRow(session.workspace ?? "");
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
    description: string; status: "pending" | "confirmed" | "failed"; reason: string; reference: string;
    created_at: string; settled_at: string | null; bill_id: string | null;
}

function blankSnapshot(token: string): DemoWorkspaceSnapshot {
    return {
        mode: "simulation", token, initialized: false, revision: 0,
        profile: { name: "", vaultName: "", createdAt: "" },
        vault: { funded: "0", spent: "0", reserved: "0", limit: "", available: "0" },
        payments: [], history: [], receipts: [], scenario: "success"
    };
}

// One shared store for the whole server process; the file is gitignored and
// per-deployment. Mirrors demoContractors(): same relative default path.
let singleton: DemoWorkspaceStore | undefined;
export function demoWorkspace() {
    return singleton ??= new DemoWorkspaceStore(path.resolve(/* turbopackIgnore: true */ process.env.NNETICS_DEMO_WORKSPACE_DB || "../../artifacts/demo/demo-workspace.db"));
}
