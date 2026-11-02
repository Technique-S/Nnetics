import crypto from "node:crypto";
import { nextReference, previousSubmission, referenceTables } from "./invoice-references.ts";
import { requireNear, currencyConflict } from "../data/invoice-currency.ts";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { amountFromNear, formatNear } from "../data/owner-adapter.ts";
import { testnetWalletAccount } from "../data/meteor-message.ts";
import type { BillAttachment, BillFields, ContractorBill, ContractorCommand, ContractorOrder, ContractorProfile, ContractorSnapshot, OwnerPortalCommand, PortalSnapshot } from "../data/contractor-adapter.ts";
const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const secret = () => crypto.randomBytes(32).toString("hex");
const id = () => crypto.randomUUID();
function text(value: unknown, max: number, label: string): string {
    if (typeof value !== "string" || !value.trim() || value.length > max)
        throw Error(`Enter ${label} (up to ${max} characters).`);
    return value.trim();
}
export class ContractorRecordStore {
    readonly mode: "simulation" | "persistent";
    readonly db: DatabaseSync;
    constructor(file: string, mode: "simulation" | "persistent" = "simulation") {
        this.mode=mode;
        fs.mkdirSync(path.dirname(file), { recursive: true });
        this.db = new DatabaseSync(file);
        this.db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS demo_owners(token TEXT PRIMARY KEY, org TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS demo_profiles(id TEXT PRIMARY KEY, org TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS demo_links(token TEXT PRIMARY KEY, profile TEXT NOT NULL, generation INTEGER NOT NULL, expires INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS demo_sessions(token TEXT PRIMARY KEY, link TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS demo_orders(id TEXT PRIMARY KEY, org TEXT NOT NULL, profile TEXT NOT NULL, reference TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(org,reference));
      CREATE TABLE IF NOT EXISTS demo_bills(id TEXT PRIMARY KEY, org TEXT NOT NULL, profile TEXT NOT NULL, reference TEXT NOT NULL, order_id TEXT NOT NULL UNIQUE, payload TEXT NOT NULL, UNIQUE(org,profile,reference));
      CREATE TABLE IF NOT EXISTS demo_bill_history(id INTEGER PRIMARY KEY, bill TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS demo_uploads(id TEXT PRIMARY KEY, org TEXT NOT NULL, profile TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, bytes BLOB NOT NULL);
      CREATE TABLE IF NOT EXISTS demo_wallet_proofs(challenge TEXT PRIMARY KEY, session TEXT NOT NULL, profile TEXT NOT NULL, account TEXT NOT NULL, expires INTEGER NOT NULL);`);
        referenceTables(this.db);
        this.db.exec("CREATE TABLE IF NOT EXISTS contractor_store_metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL)");
        const storedMode=this.db.prepare("SELECT value FROM contractor_store_metadata WHERE key='mode'").get() as {value:string}|undefined;
        const demoOwners=this.db.prepare("SELECT count(*) n FROM demo_owners").get() as {n:number};
        if((storedMode&&storedMode.value!==mode)||(mode==="persistent"&&demoOwners.n>0)) {
            this.db.close();throw Error("Contractor database mode mismatch. Demo records cannot become real organization records.");
        }
        this.db.prepare("INSERT OR IGNORE INTO contractor_store_metadata VALUES ('mode',?)").run(mode);
    }
    ownerStart(existing: string) {
        if(this.mode!=="simulation") throw Error("Verified organization identity required.");
        if (existing) {
            try {
                this.owner(existing);
                return existing;
            }
            catch { /* New simulated workspace only. */ }
        }
        const token = secret();
        this.db.prepare("INSERT INTO demo_owners VALUES (?,?,?)").run(hash(token), id(), Date.now() + 30 * 86400000);
        return token;
    }
    owner(token: string): string {
        const row = this.db.prepare("SELECT org FROM demo_owners WHERE token=? AND expires>?").get(hash(token), Date.now()) as {
            org: string;
        } | undefined;
        if (!row)
            throw Error("Open a demo owner workspace first. This is not live wallet login.");
        return row.org;
    }
    protected profile(profileId: string, org?: string): ContractorProfile {
        const row = this.db.prepare("SELECT org,payload FROM demo_profiles WHERE id=?").get(profileId) as {
            org: string;
            payload: string;
        } | undefined;
        if (!row || (org && row.org !== org))
            throw Error("Contractor access denied.");
        return JSON.parse(row.payload);
    }
    protected save(org: string, profile: ContractorProfile) { this.db.prepare("UPDATE demo_profiles SET payload=? WHERE id=? AND org=?").run(JSON.stringify(profile), profile.id, org); }
    private capability(token: string) {
        const row = this.db.prepare(`SELECT l.profile,l.generation,p.org FROM demo_links l JOIN demo_profiles p ON p.id=l.profile
      WHERE l.token=? AND l.expires>? AND l.revoked=0`).get(hash(token), Date.now()) as {
            profile: string;
            generation: number;
            org: string;
        } | undefined;
        if (!row)
            throw Error("This private link has expired or been revoked. Ask the owner for a new link.");
        const profile = this.profile(row.profile);
        if (!profile.linkActive || profile.generation !== row.generation)
            throw Error("This private link has been revoked.");
        return { org: row.org, profile };
    }
    enter(token: string) {
        if (!/^[a-f0-9]{64}$/.test(token))
            throw Error("Invalid private link.");
        this.capability(token);
        const session = secret();
        this.db.prepare("INSERT INTO demo_sessions VALUES (?,?,?)").run(hash(session), hash(token), Date.now() + 3600000);
        return session;
    }
    logoutContractor(session: string) { this.db.prepare("DELETE FROM demo_sessions WHERE token=?").run(hash(session)); }
    contractor(session: string) {
        const row = this.db.prepare(`SELECT l.profile,l.generation,p.org,l.expires,l.revoked FROM demo_sessions s
      JOIN demo_links l ON s.link=l.token JOIN demo_profiles p ON p.id=l.profile WHERE s.token=? AND s.expires>?`)
            .get(hash(session), Date.now()) as {
            profile: string;
            generation: number;
            org: string;
            expires: number;
            revoked: number;
        } | undefined;
        if (!row || row.revoked || row.expires <= Date.now())
            throw Error("Private access expired or revoked. Ask the owner for a new link.");
        const profile = this.profile(row.profile);
        if (!profile.linkActive || profile.generation !== row.generation)
            throw Error("Private access revoked. Ask the owner for a new link.");
        return { org: row.org, profile };
    }
    protected rows<T>(table: "demo_orders" | "demo_bills", org: string, profile?: string): T[] {
        return (this.db.prepare(`SELECT payload FROM ${table} WHERE org=?${profile ? " AND profile=?" : ""} ORDER BY rowid DESC`).all(...(profile ? [org, profile] : [org])) as {
            payload: string;
        }[]).map(r => JSON.parse(r.payload));
    }
    ownerSnapshot(token: string): PortalSnapshot {
        const org = this.owner(token);
        return { mode: this.mode, profiles: (this.db.prepare("SELECT payload FROM demo_profiles WHERE org=? ORDER BY rowid").all(org) as {
                payload: string;
            }[]).map(r => JSON.parse(r.payload)), orders: this.rows("demo_orders", org), invoices: this.rows("demo_bills", org) };
    }
    snapshot(token: string): ContractorSnapshot {
        const { org, profile } = this.contractor(token);
        return { mode: this.mode, profile, orders: this.rows("demo_orders", org, profile.id), invoices: this.rows("demo_bills", org, profile.id) };
    }
    ownerCommand(token: string, input: OwnerPortalCommand): {
        token?: string;
    } {
        const org = this.owner(token);
        this.db.exec("BEGIN IMMEDIATE");
        try {
            const result = this.ownerMutation(org, input);
            this.db.exec("COMMIT");
            return result;
        }
        catch (e) {
            this.db.exec("ROLLBACK");
            throw e;
        }
    }
    protected ownerMutation(org: string, input: OwnerPortalCommand): {
        token?: string;
    } {
        if (input.action === "create-profile") {
            const p: ContractorProfile = { id: id(), name: text(input.name, 80, "contractor name"), generation: 0, linkActive: false, wallet: null, walletVersion: 0, pendingWallet: null };
            const count = this.db.prepare("SELECT count(*) AS n FROM demo_profiles WHERE org=?").get(org) as {
                n: number;
            };
            if (count.n >= 3)
                throw Error("This MVP demo supports three contractors per workspace.");
            this.db.prepare("INSERT INTO demo_profiles VALUES (?,?,?)").run(p.id, org, JSON.stringify(p));
            return {};
        }
        if (input.action === "review-invoice") {
            const bill = this.rows<ContractorBill>("demo_bills", org).find(b => b.id === input.invoiceId);
            if (!bill)
                throw Error("Invoice access denied.");
            if (!["Submitted", "Under review", "In review", "Needs clarification"].includes(bill.status))
                throw Error("Invoice review is already complete.");
            if (!["approve", "clarify", "reject", "begin-review"].includes(input.decision))
                throw Error("Invalid review action.");
            if (input.decision === "approve" && bill.reasons.length)
                throw Error("Payment-critical mismatches must be clarified; review cannot override the work order.");
            this.db.prepare("INSERT INTO demo_bill_history(bill,payload) VALUES (?,?)").run(bill.id, JSON.stringify(bill));
            bill.status = input.decision === "begin-review" ? "Under review" : input.decision === "approve" ? "Approved" : input.decision === "clarify" ? "Needs clarification" : "Rejected";
            bill.ownerNote = input.decision === "begin-review" ? "Owner review started. No payment initiated." : input.decision === "approve" ? "Approved for review only. Payment execution is disabled." : text(input.note, 1000, "review note");
            this.db.prepare("UPDATE demo_bills SET payload=? WHERE id=? AND org=?").run(JSON.stringify(bill), bill.id, org);
            return {};
        }
        if (!("profileId" in input))
            throw Error("Unsupported demo action.");
        const p = this.profile(input.profileId, org);
        if (input.action === "issue-link" || input.action === "revoke-link") {
            p.generation++;
            p.linkActive = input.action === "issue-link";
            p.pendingWallet = null;
            this.db.prepare("UPDATE demo_links SET revoked=1 WHERE profile=?").run(p.id);
            this.save(org, p);
            if (!p.linkActive)
                return {};
            const token = secret();
            this.db.prepare("INSERT INTO demo_links VALUES (?,?,?,?,0)").run(hash(token), p.id, p.generation, Date.now() + 7 * 86400000);
            return { token };
        }
        if (input.action === "approve-wallet" || input.action === "reject-wallet") {
            const request = p.pendingWallet;
            if (!request || request.id !== input.requestId || request.baseVersion !== p.walletVersion || request.generation !== p.generation || !p.linkActive)
                throw Error("Wallet request is stale or access was revoked.");
            if (input.action === "approve-wallet") {
                p.wallet = request.account;
                p.walletVersion++;
            }
            p.pendingWallet = null;
            this.save(org, p);
            return {};
        }
        if (input.action === "create-order") {
            if (!p.wallet)
                throw Error("Approve the contractor's initial wallet first.");
            const o: ContractorOrder = { id: id(), reference: text(input.reference, 80, "work order reference"), title: text(input.title, 240, "work description"), contractorId: p.id, recipient: p.wallet, amount: formatNear(amountFromNear(input.amount)) };
            this.db.prepare("INSERT INTO demo_orders VALUES (?,?,?,?,?)").run(o.id, org, p.id, o.reference, JSON.stringify(o));
            return {};
        }
        throw Error("Unsupported demo action.");
    }
    command(session: string, input: ContractorCommand): {
        challenge?: string;
        invoice?: ContractorBill;
    } {
        this.db.exec("BEGIN IMMEDIATE");
        try {
            const { org, profile: p } = this.contractor(session);
            if (input.action === "wallet-challenge") {
                if(this.mode!=="simulation") throw Error("Use verified wallet message proof.");
                if (p.pendingWallet)
                    throw Error("The owner must resolve your pending wallet request first.");
                const account = testnetWalletAccount(text(input.account, 64, "testnet wallet"));
                const challenge = secret();
                this.db.prepare("DELETE FROM demo_wallet_proofs WHERE session=?").run(hash(session));
                this.db.prepare("INSERT INTO demo_wallet_proofs VALUES (?,?,?,?,?)").run(hash(challenge), hash(session), p.id, account, Date.now() + 300000);
                this.db.exec("COMMIT");
                return { challenge };
            }
            if (input.action === "wallet-proof") {
                if(this.mode!=="simulation") throw Error("Use verified wallet message proof.");
                const proof = this.db.prepare("SELECT account FROM demo_wallet_proofs WHERE challenge=? AND session=? AND profile=? AND expires>?").get(hash(input.challenge), hash(session), p.id, Date.now()) as {
                    account: string;
                } | undefined;
                if (!proof || p.pendingWallet)
                    throw Error("Simulated proof expired, replayed or mismatched. Start again.");
                this.db.prepare("DELETE FROM demo_wallet_proofs WHERE challenge=?").run(hash(input.challenge));
                p.pendingWallet = { id: id(), account: proof.account, baseVersion: p.walletVersion, generation: p.generation, simulatedProof: true };
                this.save(org, p);
            }
            else if (input.action === "submit-invoice" || input.action === "clarify-invoice") {
                const invoice = this.bill(org, p, input);
                this.db.exec("COMMIT");
                return { invoice };
            }
            else
                throw Error("Contractors cannot perform owner or payment actions.");
            this.db.exec("COMMIT");
            return {};
        }
        catch (e) {
            this.db.exec("ROLLBACK");
            throw e;
        }
    }
    private bill(org: string, p: ContractorProfile, input: Extract<ContractorCommand, {
        action: "submit-invoice" | "clarify-invoice";
    }>) {
        const f = input.fields as BillFields;
        if (!f || typeof f !== "object")
            throw Error("Clarify the required invoice details.");
        const orderId = text(f.orderId, 80, "approved work order"), asset = "NEAR";
        const order = this.rows<ContractorOrder>("demo_orders", org, p.id).find(o => o.id === orderId);
        if (!order)
            throw Error("Select your own approved work order.");
        const amount = formatNear(amountFromNear(f.amount)), description = text(input.description, 1000, "work description");
        text(input.text,24000,"bill text");
        const body=input.text;
        // Persistent billing may retain conflicting source text for clarification;
        // its NEAR request is never eligible while that conflict exists.
        requireNear(f.asset || "NEAR", this.mode === "persistent" ? "" : body);
        const scope = `${org}:${p.id}`, submission = input.submissionId || f.reference || "";
        const fingerprint = hash(JSON.stringify({action:input.action,invoiceId:input.invoiceId || "",orderId, amount, body, description, recipient:f.recipient || "", attachmentId:input.attachmentId || ""}));
        if (input.action === "submit-invoice" || input.submissionId) {
            const previous = previousSubmission(this.db, scope, submission, fingerprint);
            if (previous) return this.rows<ContractorBill>("demo_bills", org, p.id).find(b => b.id === previous)!;
        }
        if (input.action === "submit-invoice") {
            const existing = this.rows<ContractorBill>("demo_bills", org, p.id).find(b => b.orderId === orderId);
            if(existing && this.db.prepare("SELECT 1 FROM invoice_submissions WHERE scope=? AND invoice=? AND fingerprint=?").get(scope,existing.id,fingerprint)) return existing;
            if (existing)
                throw Error("This work order already has a submission. Open its status instead.");
        }
        const old = input.action === "clarify-invoice" ? this.rows<ContractorBill>("demo_bills", org, p.id).find(b => b.id === input.invoiceId) : undefined;
        const reference = old?.reference || nextReference(this.db, scope);
        const recipient = f.recipient?.trim() || order.recipient;
        const reasons: string[] = [];
        if(this.mode === "persistent" && currencyConflict(body)) reasons.push("Currency conflict in source text. Clarification is required; no amount was converted to NEAR.");
        if (amount !== order.amount)
            reasons.push("Amount differs from approved work order.");
        if (asset !== "NEAR")
            reasons.push("Only native NEAR is supported.");
        if (recipient !== order.recipient)
            reasons.push("Wallet differs from the immutable work order recipient.");
        let attachment: BillAttachment | null = null;
        if (input.attachmentId) {
            const a = this.attachment(input.attachmentId, org, p.id);
            attachment = { id: input.attachmentId, name: a.name, mime: a.mime, size: a.bytes.length };
        }
        let bill: ContractorBill = { id: id(), contractorId: p.id, reference, orderId, amount, asset, recipient, text: body, originalText: body, description, status: this.mode === "persistent" ? (reasons.length ? "Needs clarification" : "Submitted") : "In review", reasons, ownerNote: "", attachment, transactionUrl: null, submittedAt: new Date().toISOString() };
        if (input.action === "clarify-invoice") {
            if (!old || old.status !== "Needs clarification" || old.orderId !== orderId)
                throw Error("Only a requested clarification of the same invoice and work order is allowed.");
            this.db.prepare("INSERT INTO demo_bill_history(bill,payload) VALUES (?,?)").run(old.id, JSON.stringify(old));
            bill = { ...bill, id: old.id, originalText: old.originalText ?? old.text, attachment: attachment || old.attachment };
            this.db.prepare("UPDATE demo_bills SET payload=? WHERE id=? AND profile=?").run(JSON.stringify(bill), old.id, p.id);
            if(input.submissionId) this.db.prepare("INSERT INTO invoice_submissions VALUES (?,?,?,?)").run(scope,submission,fingerprint,bill.id);
        }
        else {
            try {
                this.db.prepare("INSERT INTO demo_bills VALUES (?,?,?,?,?,?)").run(bill.id, org, p.id, reference, orderId, JSON.stringify(bill));
            }
            catch (e) {
                if (String(e).includes("UNIQUE"))
                    throw Error("This invoice or work order already has a submission. Open its status instead.");
                throw e;
            }
            this.db.prepare("INSERT INTO invoice_submissions VALUES (?,?,?,?)").run(scope, submission, fingerprint, bill.id);
        }
        return bill;
    }
    upload(session: string, name: string, mime: string, bytes: Uint8Array): BillAttachment {
        const { org, profile } = this.contractor(session);
        if (bytes.length === 0 || bytes.length > 1048576)
            throw Error("Upload a non-empty file up to 1 MB.");
        const b = Buffer.from(bytes);
        let valid = false;
        if (mime === "text/plain" && /\.txt$/i.test(name)) {
            try {
                const s = new TextDecoder("utf-8", { fatal: true }).decode(b);
                valid = !s.includes("\0");
            }
            catch {
                valid = false;
            }
        }
        if (mime === "application/pdf" && /\.pdf$/i.test(name))
            valid = b.subarray(0, 5).toString() === "%PDF-";
        if (mime === "image/png" && /\.png$/i.test(name))
            valid = b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        if (mime === "image/jpeg" && /\.jpe?g$/i.test(name))
            valid = b[0] === 255 && b[1] === 216 && b[2] === 255;
        if (!valid)
            throw Error("Use a valid UTF-8 TXT, PDF, PNG or JPEG file. HTML and executable files are not accepted.");
        const clean = text(name, 150, "file name").replace(/[\r\n\/\\]/g, "_");
        const uploadId = id();
        const count = this.db.prepare("SELECT count(*) AS n FROM demo_uploads WHERE profile=?").get(profile.id) as {
            n: number;
        };
        if (count.n >= 25)
            throw Error("Demo attachment limit reached.");
        this.db.prepare("INSERT INTO demo_uploads VALUES (?,?,?,?,?,?)").run(uploadId, org, profile.id, clean, mime, b);
        return { id: uploadId, name: clean, mime, size: b.length };
    }
    attachment(uploadId: string, org: string, profile?: string) {
        const row = this.db.prepare(`SELECT name,mime,bytes FROM demo_uploads WHERE id=? AND org=?${profile ? " AND profile=?" : ""}`).get(...(profile ? [uploadId, org, profile] : [uploadId, org])) as {
            name: string;
            mime: string;
            bytes: Uint8Array;
        } | undefined;
        if (!row)
            throw Error("Attachment access denied.");
        return row;
    }
}
