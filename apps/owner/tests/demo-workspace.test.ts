import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DEMO_FEE, DemoWorkspaceStore} from "../src/server/demo-workspace.ts";
import type {DemoWorkspaceSnapshot} from "../src/server/demo-workspace.ts";

function fixture() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nnetics-demo-workspace-"));
    let tick = Date.now();
    const now = () => tick;
    let store = new DemoWorkspaceStore(path.join(directory, "workspace.db"), {now});
    return {
        get store() { return store; },
        advanceClock(ms: number) { tick += ms; },
        restart() { store.close(); store = new DemoWorkspaceStore(path.join(directory, "workspace.db"), {now}); },
        close() { store.close(); fs.rmSync(directory, {recursive: true, force: true}); }
    };
}

test("start returns a blank demo workspace; the visitor creates an owner profile and vault in two steps", async () => {
    const f = fixture(); try {
        const started = f.store.start("");
        assert.ok(started.token.length >= 32);
        assert.equal(started.snapshot.initialized, false);
        // A second start with the same session keeps the same state; no new session.
        assert.equal(f.store.start(started.token).token, started.token);
        assert.deepEqual(f.store.start(started.token).snapshot.vault, {funded: "0", spent: "0", reserved: "0", limit: "", available: "0"});
        // The profile and vault are created explicitly; nothing is pre-created.
        const created = f.store.createWorkspace(started.token, {profileName: "Demo owner", vaultName: "Demo vault"});
        assert.equal(created.initialized, true);
        assert.equal(created.profile.name, "Demo owner");
        assert.equal(created.profile.vaultName, "Demo vault");
        // Creating twice is refused: the walkthrough records belong to this visitor only.
        await assert.rejects(async () => f.store.createWorkspace(started.token, {profileName: "Again", vaultName: "Again"}), /already created/);
        await assert.rejects(async () => f.store.createWorkspace(started.token, {profileName: "  ", vaultName: "v"}), /owner name/);
    } finally { f.close(); }
});

test("funding accepts any positive exact amount repeatedly and never caps cumulative funding", async () => {
    const f = fixture(); try {
        const s = f.store.start(""); f.store.createWorkspace(s.token, {profileName: "Owner", vaultName: "Vault"});
        assert.equal(DEMO_FEE, "1000000000000000000000"); // 0.001 NEAR in yoctoNEAR
        f.store.fund(s.token, "0.5");
        const second = f.store.fund(s.token, "1.25");
        assert.equal(second.vault.funded, "1750000000000000000000000");
        assert.equal(second.vault.available, "1750000000000000000000000");
        const funding = second.history.filter(e => e.kind === "funding");
        assert.equal(funding.length, 2);
        assert.match(funding[0].label, /Funded/);
        assert.equal(funding[0].amount, "1.25");
        assert.equal(funding[0].status, "confirmed");
        // Rejections: zero/negative/malformed/sanity-capped amounts never touch the vault.
        await assert.rejects(async () => f.store.fund(s.token, "0"), /positive/);
        await assert.rejects(async () => f.store.fund(s.token, "-1"), /positive/);
        await assert.rejects(async () => f.store.fund(s.token, "1.2.3"), /exact/);
        await assert.rejects(async () => f.store.fund(s.token, "1e3"), /exact/);
        await assert.rejects(async () => f.store.fund(s.token, "2000000"), /sanity/);
        const unchanged = f.store.state(s.token);
        assert.equal(unchanged.vault.funded, "1750000000000000000000000");
        assert.equal(unchanged.history.filter(e => e.kind === "funding").length, 2);
    } finally { f.close(); }
});

test("payment approval reserves once, settles once with a confirmed receipt, and shows pending first", async () => {
    const f = fixture(); try {
        const s = f.store.start(""); f.store.createWorkspace(s.token, {profileName: "Owner", vaultName: "Vault"});
        f.store.fund(s.token, "1");
        const approved = f.store.approvePayment(s.token, {
            idempotencyKey: "attempt-1", recipient: "writer-demo.testnet", amount: "0.1",
            description: "Sample article delivered"
        });
        assert.equal(approved.status, "pending");
        assert.equal(approved.fee, DEMO_FEE);
        assert.equal(approved.total, "101000000000000000000000"); // 0.1 + 0.001 NEAR
        const reserved = f.store.state(s.token);
        assert.equal(reserved.vault.reserved, approved.total);
        assert.equal(reserved.vault.spent, "0");
        assert.match(approved.reference, /^SIM-\d{4}$/);
        // Pending is visible in History before settlement.
        assert.ok(reserved.history.some(e => e.id === approved.id && e.status === "pending"));
        // Snapshot before the settle delay keeps the attempt pending.
        assert.equal(f.store.state(s.token).payments[0].status, "pending");
        f.advanceClock(10_000);
        const settled = f.store.state(s.token);
        const confirmed = settled.payments.find(p => p.id === approved.id)!;
        assert.equal(confirmed.status, "confirmed");
        assert.equal(confirmed.settledAt !== null, true);
        const vault = settled.vault;
        assert.equal(vault.spent, "101000000000000000000000");
        assert.equal(vault.reserved, "0");
        assert.equal(vault.available, "899000000000000000000000");
        assert.equal(settled.history.filter(e => e.id === approved.id).length, 1);
        assert.equal(settled.receipts[0].id, approved.id);
        assert.match(settled.receipts[0].summary, /writer-demo\.testnet/);
        // Settling again through refreshes changes nothing.
        f.advanceClock(60_000);
        const again = f.store.state(s.token);
        assert.equal(again.payments[0].status, "confirmed");
        assert.equal(again.vault.spent, "101000000000000000000000");
        assert.equal(again.history.filter(e => e.id === approved.id).length, 1);
    } finally { f.close(); }
});

test("double-click, retry and refresh cannot duplicate debits or receipts", async () => {
    const f = fixture(); try {
        const s = f.store.start(""); f.store.createWorkspace(s.token, {profileName: "Owner", vaultName: "Vault"});
        f.store.fund(s.token, "1");
        const input = {
            idempotencyKey: "attempt-1", recipient: "writer-demo.testnet", amount: "0.1",
            description: "Sample article delivered"
        };
        f.store.approvePayment(s.token, input);
        const retry = f.store.approvePayment(s.token, input);
        const third = f.store.approvePayment(s.token, {...input, description: " _"}); // same key, any payload
        assert.deepEqual(third.id, retry.id);
        f.advanceClock(10_000); f.store.state(s.token);
        assert.equal(f.store.state(s.token).payments.length, 1);
        assert.equal(f.store.state(s.token).vault.spent, "101000000000000000000000");
        assert.equal(f.store.state(s.token).receipts.length, 1);
        // The retried caller's stored attempt is the single settled record, never a second one.
        assert.equal(f.store.state(s.token).payments[0].status, "confirmed");
        // A new, different attempt is an independent payment.
        const other = f.store.approvePayment(s.token, {...input, idempotencyKey: "attempt-2"});
        assert.notEqual(other.id, retry.id);
    } finally { f.close(); }
});

test("the failure scenario releases the reservation without a debit and is repeatable", async () => {
    const f = fixture(); try {
        const s = f.store.start(""); f.store.createWorkspace(s.token, {profileName: "Owner", vaultName: "Vault"});
        f.store.fund(s.token, "1");
        f.store.setScenario(s.token, "failure");
        const a = f.store.approvePayment(s.token, {
            idempotencyKey: "fail-1", recipient: "writer-demo.testnet", amount: "0.1", description: "Bill A"
        });
        f.advanceClock(10_000);
        let snap = f.store.state(s.token);
        assert.equal(snap.payments[0].status, "failed");
        assert.match(snap.payments[0].reason, /failed/);
        assert.equal(snap.vault.reserved, "0");
        assert.equal(snap.vault.spent, "0");
        assert.equal(snap.receipts.length, 0);
        assert.ok(snap.history.some(e => e.id === a.id && e.status === "failed"));
        // Repeatable: the same scenario can fail again on a fresh attempt.
        const b = f.store.approvePayment(s.token, {
            idempotencyKey: "fail-2", recipient: "writer-demo.testnet", amount: "0.1", description: "Bill B"
        });
        f.advanceClock(10_000);
        snap = f.store.state(s.token);
        assert.equal(snap.payments.find(p => p.id === b.id)!.status, "failed");
        assert.equal(snap.vault.funded, "1000000000000000000000000");
        // Switching back settles future attempts as confirmed.
        f.store.setScenario(s.token, "success");
        const c = f.store.approvePayment(s.token, {
            idempotencyKey: "ok-1", recipient: "writer-demo.testnet", amount: "0.1", description: "Bill C"
        });
        f.advanceClock(10_000);
        snap = f.store.state(s.token);
        assert.equal(snap.payments.find(p => p.id === c.id)!.status, "confirmed");
        assert.equal(snap.vault.spent, "101000000000000000000000");
        assert.equal(snap.receipts.length, 1);
    } finally { f.close(); }
});

test("insufficient demo funds decline the attempt, never reserve, and the decline is a repeatable failed record", async () => {
    const f = fixture(); try {
        const s = f.store.start(""); f.store.createWorkspace(s.token, {profileName: "Owner", vaultName: "Vault"});
        f.store.fund(s.token, "0.001"); // exactly one demo fee; nothing left for an amount
        const declined = f.store.approvePayment(s.token, {
            idempotencyKey: "decline-1", recipient: "writer-demo.testnet", amount: "0.1", description: "Too big"
        });
        assert.equal(declined.status, "failed");
        assert.match(declined.reason, /Insufficient demo funds/);
        const snap = f.store.state(s.token);
        assert.equal(snap.vault.reserved, "0");
        assert.equal(snap.vault.spent, "0");
        assert.equal(snap.receipts.length, 0);
        assert.ok(snap.history.some(e => e.id === declined.id && e.status === "failed"));
        // Repeatable with a different key.
        const again = f.store.approvePayment(s.token, {
            idempotencyKey: "decline-2", recipient: "writer-demo.testnet", amount: "0.1", description: "Too big"
        });
        assert.equal(again.status, "failed");
        assert.equal(f.store.state(s.token).payments.length, 2);
        // Fund more: the same request succeeds afterwards.
        f.store.fund(s.token, "1");
        const third = f.store.approvePayment(s.token, {
            idempotencyKey: "decline-3", recipient: "writer-demo.testnet", amount: "0.1", description: "Too big"
        });
        assert.equal(third.status, "pending");
    } finally { f.close(); }
});

test("an explicitly set demo spending limit declines larger amounts until the owner changes it", async () => {
    const f = fixture(); try {
        const s = f.store.start(""); f.store.createWorkspace(s.token, {profileName: "Owner", vaultName: "Vault"});
        f.store.fund(s.token, "2");
        const limited = f.store.setLimit(s.token, "0.5");
        assert.equal(limited.vault.limit, "500000000000000000000000");
        const declined = f.store.approvePayment(s.token, {
            idempotencyKey: "limit-1", recipient: "writer-demo.testnet", amount: "1", description: "Over the limit"
        });
        assert.equal(declined.status, "failed");
        assert.match(declined.reason, /spending limit/);
        assert.equal(f.store.state(s.token).vault.reserved, "0");
        const within = f.store.approvePayment(s.token, {
            idempotencyKey: "limit-2", recipient: "writer-demo.testnet", amount: "0.5", description: "At the limit"
        });
        assert.equal(within.status, "pending");
        f.advanceClock(10_000);
        assert.equal(f.store.state(s.token).payments.find(p => p.id === within.id)!.status, "confirmed");
        // Clearing the limit allows a larger payment again.
        const cleared = f.store.setLimit(s.token, "");
        assert.equal(cleared.vault.limit, "");
        const larger = f.store.approvePayment(s.token, {
            idempotencyKey: "limit-3", recipient: "writer-demo.testnet", amount: "1.2", description: "No limit"
        });
        assert.equal(larger.status, "pending");
        await assert.rejects(async () => f.store.setLimit(s.token, "0"), /positive|exact/);
        await assert.rejects(async () => f.store.setLimit(s.token, "abc"), /positive|exact/);
    } finally { f.close(); }
});

test("reset returns the walkthrough to a blank workspace on the same session", async () => {
    const f = fixture(); try {
        const s = f.store.start(""); f.store.createWorkspace(s.token, {profileName: "Owner", vaultName: "Vault"});
        f.store.fund(s.token, "1");
        f.store.approvePayment(s.token, {idempotencyKey: "k", recipient: "w.testnet", amount: "0.1", description: "x"});
        f.advanceClock(10_000); f.store.state(s.token);
        const blank = f.store.reset(s.token);
        assert.equal(blank.initialized, false);
        assert.equal(f.store.state(s.token).token, s.token);
        assert.deepEqual(f.store.state(s.token).vault, {funded: "0", spent: "0", reserved: "0", limit: "", available: "0"});
        assert.equal(f.store.state(s.token).payments.length, 0);
        assert.equal(f.store.state(s.token).receipts.length, 0);
        assert.equal(f.store.state(s.token).history.length, 0);
        assert.equal(f.store.state(s.token).revision > 0, true);
        // The walkthrough can be created again from scratch on the same session.
        f.store.createWorkspace(s.token, {profileName: "Second run", vaultName: "Second vault"});
        assert.equal(f.store.state(s.token).profile.name, "Second run");
        assert.equal(f.store.state(s.token).history.length, 0);
    } finally { f.close(); }
});

test("sessions are per visitor: a different token cannot see or act on another visitor's workspace", async () => {
    const f = fixture(); try {
        const a = f.store.start(""), b = f.store.start("");
        assert.notEqual(a.token, b.token);
        f.store.createWorkspace(a.token, {profileName: "Owner A", vaultName: "Vault A"});
        f.store.fund(a.token, "1");
        await assert.rejects(async () => f.store.state(""), /first/);
        await assert.rejects(async () => f.store.state("forged-token"), /first/);
        assert.equal(f.store.state(b.token).initialized, false);
        assert.equal(f.store.state(a.token).history.length >= 1, true);
        await assert.rejects(async () => f.store.fund(b.token, "1"), /profile and vault/);
        // Expiry closes a session: a fresh visitor starts blank.
        f.store.db.prepare("UPDATE demo_ws_sessions SET expires=1").run();
        await assert.rejects(async () => f.store.state(a.token), /first/);
        const relaunched = f.store.start(a.token);
        assert.equal(f.store.state(relaunched.token).initialized, false);
    } finally { f.close(); }
});

test("state survives a server restart with funding, receipts and pending attempts intact", async () => {
    const f = fixture(); try {
        const s = f.store.start(""); f.store.createWorkspace(s.token, {profileName: "Owner", vaultName: "Vault"});
        f.store.fund(s.token, "1");
        f.store.approvePayment(s.token, {idempotencyKey: "p1", recipient: "w.testnet", amount: "0.1", description: "Keep"});
        f.store.approvePayment(s.token, {idempotencyKey: "p2", recipient: "w.testnet", amount: "0.2", description: "Pending"});
        const before = f.store.state(s.token);
        f.restart();
        const after = f.store.state(s.token);
        assert.equal(after.vault.funded, "1000000000000000000000000");
        assert.equal(after.receipts.length, 0);
        assert.equal(after.payments.length, 2);
        assert.deepEqual(after.payments.map(p => p.status), before.payments.map(p => p.status));
        assert.equal(after.history.length, before.history.length);
        f.advanceClock(10_000);
        assert.equal(f.store.state(s.token).payments.find(p => p.id === before.payments[0].id)!.status, "confirmed");
    } finally { f.close(); }
});
