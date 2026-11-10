import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DEMO_FEE, DemoWorkspaceStore} from "../src/server/demo-workspace.ts";

const YOCTO = 10n ** 24n;
function near(value: string): string {
    const [whole, fraction = ""] = value.split(".");
    return (BigInt(whole) * YOCTO + BigInt(fraction.padEnd(24, "0"))).toString();
}
const NEAR_0_1 = near("0.1");
const NEAR_1 = near("1");
const FEE = BigInt(DEMO_FEE);

function fixture() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nnetics-demo-lifecycle-"));
    let tick = Date.now();
    const now = () => tick;
    let store = new DemoWorkspaceStore(path.join(directory, "workspace.db"), {now});
    return {
        get store() { return store; },
        advanceClock(ms: number) { tick += ms; },
        close() { store.close(); fs.rmSync(directory, {recursive: true, force: true}); }
    };
}

function workspace() {
    const f = fixture();
    const s = f.store.start("");
    f.store.createWorkspace(s.token, {profileName: "Owner", vaultName: "Vault"});
    f.store.fund(s.token, NEAR_1);
    return { f, token: s.token };
}

const draft = (over: Record<string, string> = {}) => ({
    idempotencyKey: "k-1",
    recipient: "writer-demo.testnet",
    amount: NEAR_0_1,
    description: "Milestone delivery",
    ...over
});

test("a paused demo vault refuses every new payment and records nothing", async () => {
    const {f, token} = workspace(); try {
        const paused = f.store.setPaused(token, true);
        assert.equal(paused.vault.paused, true);
        assert.ok(paused.history.some(e => e.kind === "control" && /Paused the demo vault/.test(e.label)));
        await assert.rejects(async () => f.store.preparePayment(token, draft()), /paused/i);
        // A refused preparation leaves no record and no reservation.
        const state = f.store.state(token);
        assert.equal(state.payments.length, 0);
        assert.equal(state.vault.reserved, "0");
        assert.equal(state.vault.spent, "0");
    } finally { f.close(); }
});

test("an authorised resume restores the demo vault and payments work again", async () => {
    const {f, token} = workspace(); try {
        f.store.setPaused(token, true);
        await assert.rejects(async () => f.store.preparePayment(token, draft()), /paused/i);
        const resumed = f.store.setPaused(token, false);
        assert.equal(resumed.vault.paused, false);
        assert.ok(resumed.history.some(e => e.kind === "control" && /Resumed the demo vault/.test(e.label)));
        const prepared = f.store.preparePayment(token, draft());
        assert.equal(prepared.payment.status, "prepared");
        f.store.confirmPayment(token, {paymentId: prepared.payment.id, confirmationSecret: prepared.confirmationSecret});
        f.advanceClock(10_000);
        assert.equal(f.store.state(token).payments[0].status, "confirmed");
    } finally { f.close(); }
});

test("pausing between preparation and confirmation releases the reservation and records the refusal", async () => {
    const {f, token} = workspace(); try {
        const prepared = f.store.preparePayment(token, draft());
        assert.equal(f.store.state(token).vault.reserved, prepared.payment.total);
        f.store.setPaused(token, true);
        await assert.rejects(async () => f.store.confirmPayment(token, {paymentId: prepared.payment.id, confirmationSecret: prepared.confirmationSecret}), /paused/i);
        const state = f.store.state(token);
        // The reservation is released, no funds moved, and the attempt is visible.
        assert.equal(state.vault.reserved, "0");
        assert.equal(state.vault.spent, "0");
        assert.equal(state.payments.find(p => p.id === prepared.payment.id)!.status, "failed");
        assert.match(state.payments.find(p => p.id === prepared.payment.id)!.reason, /paused/i);
    } finally { f.close(); }
});

test("a confirmation is bound to the exact prepared payment and is single-use", async () => {
    const {f, token} = workspace(); try {
        const prepared = f.store.preparePayment(token, draft());
        // A foreign secret never confirms anything.
        await assert.rejects(async () => f.store.confirmPayment(token, {paymentId: prepared.payment.id, confirmationSecret: "not-the-secret"}), /does not match/i);
        assert.equal(f.store.state(token).payments[0].status, "prepared");
        // Another prepared payment's secret cannot confirm this one.
        const other = f.store.preparePayment(token, draft({idempotencyKey: "k-2"}));
        await assert.rejects(async () => f.store.confirmPayment(token, {paymentId: prepared.payment.id, confirmationSecret: other.confirmationSecret}), /does not match/i);
        assert.equal(f.store.state(token).payments[0].status, "prepared");
        // The matching secret confirms it.
        const confirmed = f.store.confirmPayment(token, {paymentId: prepared.payment.id, confirmationSecret: prepared.confirmationSecret});
        assert.equal(confirmed.status, "pending");
        // Repeating the confirmation resolves to the same attempt: no second debit.
        const repeated = f.store.confirmPayment(token, {paymentId: prepared.payment.id, confirmationSecret: prepared.confirmationSecret});
        assert.equal(repeated.id, confirmed.id);
        assert.equal(repeated.status, "pending");
        f.advanceClock(10_000);
        const state = f.store.state(token);
        assert.equal(state.payments.length, 2);
        assert.equal(state.vault.spent, (BigInt(NEAR_0_1) + FEE).toString());
        assert.equal(state.receipts.length, 1);
    } finally { f.close(); }
});

test("an invoice can never be paid twice", async () => {
    const {f, token} = workspace(); try {
        const first = f.store.preparePayment(token, draft({billId: "bill-1"}));
        assert.equal(first.payment.billId, "bill-1");
        // A second attempt for the same invoice is refused, even with a new key.
        await assert.rejects(async () => f.store.preparePayment(token, draft({idempotencyKey: "k-2", billId: "bill-1"})), /already been prepared or paid/i);
        f.store.confirmPayment(token, {paymentId: first.payment.id, confirmationSecret: first.confirmationSecret});
        f.advanceClock(10_000);
        assert.equal(f.store.state(token).payments[0].status, "confirmed");
        // And it stays refused after the invoice was paid.
        await assert.rejects(async () => f.store.preparePayment(token, draft({idempotencyKey: "k-3", billId: "bill-1"})), /already been prepared or paid/i);
        assert.equal(f.store.state(token).payments.length, 1);
        // A different invoice is unaffected.
        const other = f.store.preparePayment(token, draft({idempotencyKey: "k-4", billId: "bill-2"}));
        assert.equal(other.payment.status, "prepared");
    } finally { f.close(); }
});

test("cancelling a prepared payment releases its reservation without a debit", async () => {
    const {f, token} = workspace(); try {
        const prepared = f.store.preparePayment(token, draft());
        assert.equal(f.store.state(token).vault.reserved, prepared.payment.total);
        const cancelled = f.store.cancelPayment(token, prepared.payment.id);
        assert.equal(cancelled.status, "cancelled");
        const state = f.store.state(token);
        assert.equal(state.vault.reserved, "0");
        assert.equal(state.vault.spent, "0");
        assert.equal(state.vault.available, NEAR_1);
        // A cancelled preparation can no longer be confirmed.
        await assert.rejects(async () => f.store.confirmPayment(token, {paymentId: prepared.payment.id, confirmationSecret: prepared.confirmationSecret}), /no longer awaiting confirmation/i);
    } finally { f.close(); }
});

test("an unconfirmed preparation expires and releases its reservation", async () => {
    const {f, token} = workspace(); try {
        const prepared = f.store.preparePayment(token, draft());
        assert.equal(f.store.state(token).vault.reserved, prepared.payment.total);
        // Past the preparation lifetime the reservation is released.
        f.advanceClock(16 * 60 * 1000);
        const state = f.store.state(token);
        assert.equal(state.vault.reserved, "0");
        assert.equal(state.vault.spent, "0");
        assert.equal(state.payments.find(p => p.id === prepared.payment.id)!.status, "cancelled");
    } finally { f.close(); }
});

test("multiple pending payments hold their own reservations and settle independently", async () => {
    const {f, token} = workspace(); try {
        f.store.fund(token, near("5"));
        const a = f.store.preparePayment(token, draft({idempotencyKey: "a"}));
        const b = f.store.preparePayment(token, draft({idempotencyKey: "b", amount: near("0.2")}));
        assert.equal(f.store.state(token).vault.reserved, (BigInt(a.payment.total) + BigInt(b.payment.total)).toString());
        f.store.confirmPayment(token, {paymentId: a.payment.id, confirmationSecret: a.confirmationSecret});
        f.store.confirmPayment(token, {paymentId: b.payment.id, confirmationSecret: b.confirmationSecret});
        f.advanceClock(10_000);
        const state = f.store.state(token);
        assert.equal(state.vault.reserved, "0");
        assert.equal(state.vault.spent, (BigInt(a.payment.total) + BigInt(b.payment.total)).toString());
        assert.equal(state.payments.filter(p => p.status === "confirmed").length, 2);
        assert.equal(state.receipts.length, 2);
    } finally { f.close(); }
});

test("one workspace can never see or spend another workspace's money", async () => {
    const f = fixture(); try {
        const a = f.store.start(""), b = f.store.start("");
        f.store.createWorkspace(a.token, {profileName: "A", vaultName: "A"});
        f.store.createWorkspace(b.token, {profileName: "B", vaultName: "B"});
        f.store.fund(a.token, NEAR_1);
        // B has no funds and no profile-linked access to A's records.
        assert.equal(f.store.state(b.token).vault.funded, "0");
        const prepared = f.store.preparePayment(a.token, draft());
        // B cannot confirm A's prepared payment.
        await assert.rejects(async () => f.store.confirmPayment(b.token, {paymentId: prepared.payment.id, confirmationSecret: prepared.confirmationSecret}), /does not exist/i);
        // B cannot cancel A's prepared payment either.
        await assert.rejects(async () => f.store.cancelPayment(b.token, prepared.payment.id), /does not exist/i);
        assert.equal(f.store.state(a.token).vault.reserved, prepared.payment.total);
    } finally { f.close(); }
});

test("the demo ledger never records a negative balance", async () => {
    const {f, token} = workspace(); try {
        // Spend almost everything, then attempt one more payment.
        const first = f.store.preparePayment(token, draft({idempotencyKey: "a", amount: near("0.9")}));
        f.store.confirmPayment(token, {paymentId: first.payment.id, confirmationSecret: first.confirmationSecret});
        f.advanceClock(10_000);
        const declined = f.store.preparePayment(token, draft({idempotencyKey: "b", amount: near("0.5")}));
        assert.equal(declined.payment.status, "failed");
        const state = f.store.state(token);
        assert.ok(BigInt(state.vault.available) >= 0n, "available balance must never be negative");
        assert.ok(BigInt(state.vault.reserved) >= 0n, "reserved funds must never be negative");
        assert.ok(BigInt(state.vault.spent) >= 0n, "spent funds must never be negative");
        assert.ok(BigInt(state.vault.spent) <= BigInt(state.vault.funded), "spent funds can never exceed funded funds");
    } finally { f.close(); }
});

test("the demo ledger reaches no chain, no wallet and no signing code", async () => {
    const source = fs.readFileSync(new URL("../src/server/demo-workspace.ts", import.meta.url), "utf8");
    // The simulated ledger must not reach a contract, an RPC endpoint, a signer
    // or a private key. Its only persistence is the local demo SQLite file.
    assert.equal(/rpc\.testnet|nearblocks|signTransaction|keyPair|privateKey|signer/i.test(source), false);
    const adapter = fs.readFileSync(new URL("../src/data/demo-workspace-adapter.ts", import.meta.url), "utf8");
    assert.equal(/rpc\.testnet|nearblocks|signTransaction|keyPair|privateKey|signer/i.test(adapter), false);
});
