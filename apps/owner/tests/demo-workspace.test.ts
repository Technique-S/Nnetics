import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DEMO_FEE, DemoWorkspaceStore} from "../src/server/demo-workspace.ts";
import type {DemoWorkspaceSnapshot} from "../src/server/demo-workspace.ts";

// The demo ledger speaks canonical yoctoNEAR only. These helpers keep the
// arithmetic in the tests exact and readable.
const YOCTO = 10n ** 24n;
function near(value: string): string {
    const [whole, fraction = ""] = value.split(".");
    return (BigInt(whole) * YOCTO + BigInt(fraction.padEnd(24, "0"))).toString();
}
const NEAR_0_1 = near("0.1");
const NEAR_0_5 = near("0.5");
const NEAR_1 = near("1");
const NEAR_2 = near("2");
const FEE = BigInt(DEMO_FEE);

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

function workspace() {
    const f = fixture();
    const s = f.store.start("");
    f.store.createWorkspace(s.token, {profileName: "Owner", vaultName: "Vault"});
    return { f, token: s.token };
}

test("start returns a blank demo workspace; the visitor creates an owner profile and vault in two steps", async () => {
    const f = fixture(); try {
        const started = f.store.start("");
        assert.ok(started.token.length >= 32);
        assert.equal(started.snapshot.initialized, false);
        // A second start with the same session keeps the same state; no new session.
        assert.equal(f.store.start(started.token).token, started.token);
        assert.deepEqual(f.store.start(started.token).snapshot.vault, {funded: "0", spent: "0", reserved: "0", limit: "", paused: false, available: "0"});
        // The profile and vault are created explicitly; nothing is pre-created.
        const created = f.store.createWorkspace(started.token, {profileName: "Demo owner", vaultName: "Demo vault"});
        assert.equal(created.initialized, true);
        assert.equal(created.profile.name, "Demo owner");
        assert.equal(created.profile.vaultName, "Demo vault");
        // A new demo vault is ready to simulate: it is never paused by default.
        assert.equal(created.vault.paused, false);
        // Creating twice is refused: the walkthrough records belong to this visitor only.
        await assert.rejects(async () => f.store.createWorkspace(started.token, {profileName: "Again", vaultName: "Again"}), /already created/);
        await assert.rejects(async () => f.store.createWorkspace(started.token, {profileName: "  ", vaultName: "v"}), /owner name/);
    } finally { f.close(); }
});

test("funding accepts any positive exact yoctoNEAR amount repeatedly and never caps cumulative funding", async () => {
    const f = fixture(); try {
        const s = f.store.start(""); f.store.createWorkspace(s.token, {profileName: "Owner", vaultName: "Vault"});
        assert.equal(DEMO_FEE, "1000000000000000000000"); // 0.001 NEAR in yoctoNEAR
        f.store.fund(s.token, NEAR_0_5);
        const second = f.store.fund(s.token, near("1.25"));
        assert.equal(second.vault.funded, near("1.75"));
        assert.equal(second.vault.available, near("1.75"));
        const funding = second.history.filter(e => e.kind === "funding");
        assert.equal(funding.length, 2);
        assert.match(funding[0].label, /Funded/);
        assert.equal(funding[0].amount, "1.25");
        assert.equal(funding[0].status, "confirmed");
        // Rejections: zero/negative/malformed amounts never touch the vault.
        await assert.rejects(async () => f.store.fund(s.token, "0"), /positive/);
        await assert.rejects(async () => f.store.fund(s.token, "-1"), /positive/);
        await assert.rejects(async () => f.store.fund(s.token, "1.2.3"), /exact/);
        await assert.rejects(async () => f.store.fund(s.token, "1e3"), /exact/);
        await assert.rejects(async () => f.store.fund(s.token, (BigInt(near("2000000")) + 1n).toString()), /sanity/);
        const unchanged = f.store.state(s.token);
        assert.equal(unchanged.vault.funded, near("1.75"));
        assert.equal(unchanged.history.filter(e => e.kind === "funding").length, 2);
    } finally { f.close(); }
});

test("preparation reserves once, confirmation settles once, and the receipt is recorded", async () => {
    const {f, token} = workspace(); try {
        f.store.fund(token, NEAR_1);
        const prepared = f.store.preparePayment(token, {
            idempotencyKey: "attempt-1", recipient: "writer-demo.testnet", amount: NEAR_0_1,
            description: "Sample article delivered"
        });
        assert.equal(prepared.payment.status, "prepared");
        assert.equal(prepared.payment.awaitingConfirmation, true);
        assert.equal(prepared.payment.fee, DEMO_FEE);
        assert.equal(prepared.payment.total, (BigInt(NEAR_0_1) + FEE).toString());
        assert.ok(prepared.confirmationSecret.length >= 32);
        // Preparation reserves the amount but moves nothing.
        const reserved = f.store.state(token);
        assert.equal(reserved.vault.reserved, prepared.payment.total);
        assert.equal(reserved.vault.spent, "0");
        assert.match(prepared.payment.reference, /^SIM-\d{4}$/);
        // A prepared record is visible in history before it is confirmed.
        assert.ok(reserved.history.some(e => e.id === prepared.payment.id && e.status === "pending"));
        // Nothing executes before the owner's explicit confirmation.
        assert.equal(f.store.state(token).payments[0].status, "prepared");

        const confirmed = f.store.confirmPayment(token, {paymentId: prepared.payment.id, confirmationSecret: prepared.confirmationSecret});
        assert.equal(confirmed.status, "pending");
        // The settlement delay keeps the attempt pending until it is due.
        assert.equal(f.store.state(token).payments[0].status, "pending");
        f.advanceClock(10_000);
        const settled = f.store.state(token);
        const record = settled.payments.find(p => p.id === prepared.payment.id)!;
        assert.equal(record.status, "confirmed");
        assert.equal(record.settledAt !== null, true);
        const vault = settled.vault;
        assert.equal(vault.spent, (BigInt(NEAR_0_1) + FEE).toString());
        assert.equal(vault.reserved, "0");
        assert.equal(vault.available, (BigInt(NEAR_1) - BigInt(NEAR_0_1) - FEE).toString());
        assert.equal(settled.history.filter(e => e.id === prepared.payment.id).length, 1);
        assert.equal(settled.receipts[0].id, prepared.payment.id);
        assert.match(settled.receipts[0].summary, /writer-demo\.testnet/);
        // Settling again through refreshes changes nothing.
        f.advanceClock(60_000);
        const again = f.store.state(token);
        assert.equal(again.payments[0].status, "confirmed");
        assert.equal(again.vault.spent, (BigInt(NEAR_0_1) + FEE).toString());
        assert.equal(again.history.filter(e => e.id === prepared.payment.id).length, 1);
    } finally { f.close(); }
});

test("double-click, retry and refresh cannot duplicate debits or receipts", async () => {
    const {f, token} = workspace(); try {
        f.store.fund(token, NEAR_1);
        const input = {
            idempotencyKey: "attempt-1", recipient: "writer-demo.testnet", amount: NEAR_0_1,
            description: "Sample article delivered"
        };
        const first = f.store.preparePayment(token, input);
        const retry = f.store.preparePayment(token, input);
        const third = f.store.preparePayment(token, {...input, description: " _"}); // same key, any payload
        assert.deepEqual(third.payment.id, retry.payment.id);
        assert.equal(third.payment.total, first.payment.total);
        // One reservation, one attempt.
        assert.equal(f.store.state(token).vault.reserved, first.payment.total);
        f.store.confirmPayment(token, {paymentId: first.payment.id, confirmationSecret: first.confirmationSecret});
        f.advanceClock(10_000); f.store.state(token);
        assert.equal(f.store.state(token).payments.length, 1);
        assert.equal(f.store.state(token).vault.spent, (BigInt(NEAR_0_1) + FEE).toString());
        assert.equal(f.store.state(token).receipts.length, 1);
        // The retried caller's stored attempt is the single settled record, never a second one.
        assert.equal(f.store.state(token).payments[0].status, "confirmed");
        // A new, different attempt is an independent payment.
        const other = f.store.preparePayment(token, {...input, idempotencyKey: "attempt-2"});
        assert.notEqual(other.payment.id, retry.payment.id);
    } finally { f.close(); }
});

test("the failure scenario releases the reservation without a debit and is repeatable", async () => {
    const {f, token} = workspace(); try {
        f.store.fund(token, NEAR_1);
        f.store.setScenario(token, "failure");
        const a = f.store.preparePayment(token, {
            idempotencyKey: "fail-1", recipient: "writer-demo.testnet", amount: NEAR_0_1, description: "Bill A"
        });
        f.store.confirmPayment(token, {paymentId: a.payment.id, confirmationSecret: a.confirmationSecret});
        f.advanceClock(10_000);
        let snap = f.store.state(token);
        assert.equal(snap.payments[0].status, "failed");
        assert.match(snap.payments[0].reason, /failed/);
        assert.equal(snap.vault.reserved, "0");
        assert.equal(snap.vault.spent, "0");
        assert.equal(snap.receipts.length, 0);
        assert.ok(snap.history.some(e => e.id === a.payment.id && e.status === "failed"));
        // Repeatable: the same scenario can fail again on a fresh attempt.
        const b = f.store.preparePayment(token, {
            idempotencyKey: "fail-2", recipient: "writer-demo.testnet", amount: NEAR_0_1, description: "Bill B"
        });
        f.store.confirmPayment(token, {paymentId: b.payment.id, confirmationSecret: b.confirmationSecret});
        f.advanceClock(10_000);
        snap = f.store.state(token);
        assert.equal(snap.payments.find(p => p.id === b.payment.id)!.status, "failed");
        assert.equal(snap.vault.funded, NEAR_1);
        // Switching back settles future attempts as confirmed.
        f.store.setScenario(token, "success");
        const c = f.store.preparePayment(token, {
            idempotencyKey: "ok-1", recipient: "writer-demo.testnet", amount: NEAR_0_1, description: "Bill C"
        });
        f.store.confirmPayment(token, {paymentId: c.payment.id, confirmationSecret: c.confirmationSecret});
        f.advanceClock(10_000);
        snap = f.store.state(token);
        assert.equal(snap.payments.find(p => p.id === c.payment.id)!.status, "confirmed");
        assert.equal(snap.vault.spent, (BigInt(NEAR_0_1) + FEE).toString());
        assert.equal(snap.receipts.length, 1);
    } finally { f.close(); }
});

test("insufficient demo funds decline the attempt, never reserve, and the decline is a repeatable failed record", async () => {
    const {f, token} = workspace(); try {
        f.store.fund(token, DEMO_FEE); // exactly one demo fee; nothing left for an amount
        const declined = f.store.preparePayment(token, {
            idempotencyKey: "decline-1", recipient: "writer-demo.testnet", amount: NEAR_0_1, description: "Too big"
        });
        assert.equal(declined.payment.status, "failed");
        assert.match(declined.payment.reason, /Insufficient demo funds/);
        const snap = f.store.state(token);
        assert.equal(snap.vault.reserved, "0");
        assert.equal(snap.vault.spent, "0");
        assert.equal(snap.receipts.length, 0);
        assert.ok(snap.history.some(e => e.id === declined.payment.id && e.status === "failed"));
        // Repeatable with a different key.
        const again = f.store.preparePayment(token, {
            idempotencyKey: "decline-2", recipient: "writer-demo.testnet", amount: NEAR_0_1, description: "Too big"
        });
        assert.equal(again.payment.status, "failed");
        assert.equal(f.store.state(token).payments.length, 2);
        // Fund more: the same request succeeds afterwards.
        f.store.fund(token, NEAR_1);
        const third = f.store.preparePayment(token, {
            idempotencyKey: "decline-3", recipient: "writer-demo.testnet", amount: NEAR_0_1, description: "Too big"
        });
        assert.equal(third.payment.status, "prepared");
    } finally { f.close(); }
});

test("an explicitly set demo spending limit declines larger amounts until the owner changes it", async () => {
    const {f, token} = workspace(); try {
        f.store.fund(token, NEAR_2);
        const limited = f.store.setLimit(token, NEAR_0_5);
        assert.equal(limited.vault.limit, NEAR_0_5);
        const declined = f.store.preparePayment(token, {
            idempotencyKey: "limit-1", recipient: "writer-demo.testnet", amount: NEAR_1, description: "Over the limit"
        });
        assert.equal(declined.payment.status, "failed");
        assert.match(declined.payment.reason, /spending limit/);
        assert.equal(f.store.state(token).vault.reserved, "0");
        const within = f.store.preparePayment(token, {
            idempotencyKey: "limit-2", recipient: "writer-demo.testnet", amount: NEAR_0_5, description: "At the limit"
        });
        assert.equal(within.payment.status, "prepared");
        f.store.confirmPayment(token, {paymentId: within.payment.id, confirmationSecret: within.confirmationSecret});
        f.advanceClock(10_000);
        assert.equal(f.store.state(token).payments.find(p => p.id === within.payment.id)!.status, "confirmed");
        // Clearing the limit allows a larger payment again.
        const cleared = f.store.setLimit(token, "");
        assert.equal(cleared.vault.limit, "");
        const larger = f.store.preparePayment(token, {
            idempotencyKey: "limit-3", recipient: "writer-demo.testnet", amount: near("1.2"), description: "No limit"
        });
        assert.equal(larger.payment.status, "prepared");
        await assert.rejects(async () => f.store.setLimit(token, "0"), /positive|exact/);
        await assert.rejects(async () => f.store.setLimit(token, "abc"), /positive|exact/);
    } finally { f.close(); }
});

test("reset returns the walkthrough to a blank workspace on the same session", async () => {
    const {f, token} = workspace(); try {
        f.store.fund(token, NEAR_1);
        const prepared = f.store.preparePayment(token, {idempotencyKey: "k", recipient: "w.testnet", amount: NEAR_0_1, description: "x"});
        f.store.confirmPayment(token, {paymentId: prepared.payment.id, confirmationSecret: prepared.confirmationSecret});
        f.advanceClock(10_000); f.store.state(token);
        const blank = f.store.reset(token);
        assert.equal(blank.initialized, false);
        assert.equal(f.store.state(token).token, token);
        assert.deepEqual(f.store.state(token).vault, {funded: "0", spent: "0", reserved: "0", limit: "", paused: false, available: "0"});
        assert.equal(f.store.state(token).payments.length, 0);
        assert.equal(f.store.state(token).receipts.length, 0);
        assert.equal(f.store.state(token).history.length, 0);
        assert.equal(f.store.state(token).revision > 0, true);
        // The walkthrough can be created again from scratch on the same session.
        f.store.createWorkspace(token, {profileName: "Second run", vaultName: "Second vault"});
        assert.equal(f.store.state(token).profile.name, "Second run");
        assert.equal(f.store.state(token).history.length, 0);
    } finally { f.close(); }
});

test("sessions are per visitor: a different token cannot see or act on another visitor's workspace", async () => {
    const f = fixture(); try {
        const a = f.store.start(""), b = f.store.start("");
        assert.notEqual(a.token, b.token);
        f.store.createWorkspace(a.token, {profileName: "Owner A", vaultName: "Vault A"});
        f.store.fund(a.token, NEAR_1);
        await assert.rejects(async () => f.store.state(""), /first/);
        await assert.rejects(async () => f.store.state("forged-token"), /first/);
        assert.equal(f.store.state(b.token).initialized, false);
        assert.equal(f.store.state(a.token).history.length >= 1, true);
        await assert.rejects(async () => f.store.fund(b.token, NEAR_1), /profile and vault/);
        // Expiry closes a session: a fresh visitor starts blank.
        f.store.db.prepare("UPDATE demo_ws_sessions SET expires=1").run();
        await assert.rejects(async () => f.store.state(a.token), /first/);
        const relaunched = f.store.start(a.token);
        assert.equal(f.store.state(relaunched.token).initialized, false);
    } finally { f.close(); }
});

test("state survives a server restart with funding, receipts and pending attempts intact", async () => {
    const {f, token} = workspace(); try {
        f.store.fund(token, NEAR_1);
        const first = f.store.preparePayment(token, {idempotencyKey: "p1", recipient: "w.testnet", amount: NEAR_0_1, description: "Keep"});
        f.store.confirmPayment(token, {paymentId: first.payment.id, confirmationSecret: first.confirmationSecret});
        const second = f.store.preparePayment(token, {idempotencyKey: "p2", recipient: "w.testnet", amount: near("0.2"), description: "Pending"});
        const before = f.store.state(token);
        f.restart();
        const after = f.store.state(token);
        assert.equal(after.vault.funded, NEAR_1);
        assert.equal(after.receipts.length, 0);
        assert.equal(after.payments.length, 2);
        assert.deepEqual(after.payments.map(p => p.status), before.payments.map(p => p.status));
        assert.equal(after.history.length, before.history.length);
        // Both the confirmed attempt and the unconfirmed preparation still hold
        // their reservation across the restart.
        assert.equal(after.vault.reserved, (BigInt(first.payment.total) + BigInt(second.payment.total)).toString());
        f.advanceClock(10_000);
        const settled = f.store.state(token);
        assert.equal(settled.payments.find(p => p.id === first.payment.id)!.status, "confirmed");
        // A prepared record stays prepared until it is confirmed.
        assert.equal(settled.payments.find(p => p.id === second.payment.id)!.status, "prepared");
    } finally { f.close(); }
});
