import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DemoContractorStore} from "../src/server/demo-contractors.ts";
import type {ContractorBill} from "../src/data/contractor-adapter.ts";

function fixture() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nnetics-demo-contractor-bills-"));
    const store = new DemoContractorStore(path.join(directory, "contractor.db"));
    const owner = store.ownerStart("");
    return {
        store, owner,
        close() { store.db.close(); fs.rmSync(directory, {recursive: true, force: true}); }
    };
}

// Owner creates a profile and hands the contractor a private link; the
// contractor opens a session via that link.
function seeded(f: { store: DemoContractorStore; owner: string }) {
    f.store.ownerCommand(f.owner, {action: "create-profile", name: "Writer"});
    const profile = f.store.ownerSnapshot(f.owner).profiles[0];
    const link = f.store.ownerCommand(f.owner, {action: "issue-link", profileId: profile.id}).token!;
    const session = f.store.enter(link);
    return {profile, session};
}

// Demo wallet proof: challenge → simulated proof → owner approval.
function wallet(f: { store: DemoContractorStore; owner: string }, s: { profile: { id: string }; session: string }) {
    const {challenge} = f.store.command(s.session, {action: "wallet-challenge", account: "writer.testnet"});
    f.store.command(s.session, {action: "wallet-proof", challenge: challenge!});
    const p = f.store.ownerSnapshot(f.owner).profiles.find(x => x.id === s.profile.id)!;
    f.store.ownerCommand(f.owner, {action: "approve-wallet", profileId: p.id, requestId: p.pendingWallet!.id});
}

const directInput = (submissionId: string, over: Record<string, string> = {}) => ({
    action: "submit-invoice" as const,
    submissionId,
    fields: {orderId: "", amount: "0.4", asset: "NEAR", recipient: "", ...over},
    text: "Delivered urgent fixes beyond the signed scope.",
    description: "Urgent fixes"
});

test("demo contractor can bill without a work order and the owner reviews it in the profile", async () => {
    const f = fixture(); try {
        const s = seeded(f); wallet(f, s);
        const bill = f.store.command(s.session, directInput("direct-1")).invoice!;
        assert.equal(bill.status, "Submitted");
        assert.equal(bill.orderId, "");
        assert.equal(bill.orderReference, "No work order");
        // The recipient defaults to the approved demo wallet when none is given.
        assert.equal(bill.recipient, "writer.testnet");
        assert.deepEqual(bill.reasons, []);
        // The owner sees the direct bill among the profile's bills and reviews it
        // there; approval never requires a work order in this demo mode.
        const listed = f.store.ownerSnapshot(f.owner).invoices.find(b => b.id === bill.id)!;
        assert.equal(listed.status, "Submitted");
        f.store.ownerCommand(f.owner, {action: "review-invoice", invoiceId: bill.id, decision: "begin-review", note: ""});
        f.store.ownerCommand(f.owner, {action: "review-invoice", invoiceId: bill.id, decision: "approve", note: ""});
        assert.equal(f.store.ownerSnapshot(f.owner).invoices.find(b => b.id === bill.id)!.status, "Approved");
        // The contractor's own workspace mirrors the owner's review.
        assert.equal(f.store.snapshot(s.session).invoices.find(b => b.id === bill.id)!.status, "Approved");
    } finally { f.close(); }
});

test("several bills without a work order coexist for one contractor, each with its own reference", async () => {
    const f = fixture(); try {
        const s = seeded(f); wallet(f, s);
        const one = f.store.command(s.session, directInput("direct-1")).invoice!;
        const two = f.store.command(s.session, directInput("direct-2", {amount: "1.2", description: "Second direct bill"})).invoice!;
        assert.equal(one.status, "Submitted");
        assert.equal(two.status, "Submitted");
        assert.notEqual(two.reference, one.reference);
        const direct = f.store.ownerSnapshot(f.owner).invoices.filter(b => b.orderId === "");
        assert.equal(direct.length, 2);
        assert.ok(direct.every(b => b.orderReference === "No work order" && /^CTR-\d{4}-INV-\d{4}$/.test(b.reference)));
        // Both remain independently reviewable.
        f.store.ownerCommand(f.owner, {action: "review-invoice", invoiceId: one.id, decision: "approve", note: ""});
        assert.equal(f.store.ownerSnapshot(f.owner).invoices.find(b => b.id === two.id)!.status, "Submitted");
    } finally { f.close(); }
});

test("a direct bill is idempotent per submission key, and a changed retry under the same key is refused", async () => {
    const f = fixture(); try {
        const s = seeded(f); wallet(f, s);
        const first = f.store.command(s.session, directInput("direct-1")).invoice!;
        const again = f.store.command(s.session, directInput("direct-1")).invoice!;
        assert.equal(again.id, first.id);
        await assert.rejects(async () => f.store.command(s.session, directInput("direct-1", {amount: "0.5"})),
            /different invoice details/);
        assert.equal(f.store.ownerSnapshot(f.owner).invoices.length, 1);
    } finally { f.close(); }
});

test("clarification on a direct bill stays tied to the same bill and preserves the original text", async () => {
    const f = fixture(); try {
        const s = seeded(f); wallet(f, s);
        const bill = f.store.command(s.session, directInput("direct-1")).invoice!;
        f.store.ownerCommand(f.owner, {action: "review-invoice", invoiceId: bill.id, decision: "clarify", note: "State the hours."});
        assert.equal(f.store.snapshot(s.session).invoices.find(b => b.id === bill.id)!.status, "Needs clarification");
        const corrected = f.store.command(s.session, {
            ...directInput("fix-1"),
            action: "clarify-invoice" as const,
            invoiceId: bill.id,
            text: "Delivered urgent fixes. Three hours."
        }).invoice!;
        assert.equal(corrected.id, bill.id);
        assert.equal(corrected.status, "Submitted");
        assert.equal(corrected.originalText, bill.text);
        assert.equal(corrected.text, "Delivered urgent fixes. Three hours.");
        // Back in review: the owner's follow-up decision lands on the same bill.
        f.store.ownerCommand(f.owner, {action: "review-invoice", invoiceId: bill.id, decision: "approve", note: ""});
        assert.equal(f.store.ownerSnapshot(f.owner).invoices.find(b => b.id === bill.id)!.status, "Approved");
    } finally { f.close(); }
});

test("direct bills do not require wallets and ignore invoice recipient claims", async () => {
    const f = fixture(); try {
        const a = seeded(f); // No wallet proof at all.
        assert.equal(f.store.command(a.session, directInput("direct-1")).invoice!.recipient, "");
        // An explicit recipient is ignored; only Wallet Details can supply it.
        const explicit = f.store.command(a.session, directInput("direct-2", {recipient: "writer.demo.testnet"})).invoice!;
        assert.equal(explicit.recipient, "");
        // With an approved demo wallet, the bill defaults to that wallet.
        wallet(f, a);
        const defaulted = f.store.command(a.session, directInput("direct-3")).invoice!;
        assert.equal(defaulted.recipient, "writer.testnet");
    } finally { f.close(); }
});

test("persistent mode supports optional work orders without bypassing organization identity", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nnetics-persistent-direct-"));
    const {IdentityAuth} = await import("../src/server/identity.ts");
    const {ContractorBackend} = await import("../src/server/contractor-service.ts");
    const {KeyPair, KeyPairSigner} = await import("near-api-js");
    const identity = new IdentityAuth({network: "testnet", origin: "http://127.0.0.1:3100", rpc: "https://test.rpc.fastnear.com", database: path.join(directory, "identity.db")});
    const keys = new Map<string, ReturnType<typeof KeyPair.fromRandom>>();
    identity.rpc = async <T,>(method: string, params: unknown) => {
        if (method === "status") return {chain_id: "testnet"} as T;
        if (method === "block") return {header: {hash: "final-block"}} as T;
        const p = params as Record<string, string>;
        if (p.request_type === "view_account") return {code_hash: "pinned", block_hash: "final-block"} as T;
        if (p.request_type === "call_function") return {result: Array.from(Buffer.from(JSON.stringify({owner: "owner.testnet"}))), block_hash: "final-block"} as T;
        if (keys.get(p.account_id)?.getPublicKey().toString() !== p.public_key) throw Error("Account key missing");
        return {permission: "FullAccess", block_hash: "final-block"} as T;
    };
    const backend = new ContractorBackend(path.join(directory, "contractors.db"), identity);
    const sign = async (account: string, c: {nonce: string; message: string; recipient: string}) => {
        let key = keys.get(account);
        if (!key) { key = KeyPair.fromRandom("ed25519"); keys.set(account, key); }
        const sig = await new KeyPairSigner(key).signNep413Message(account, {...c, nonce: Buffer.from(c.nonce, "base64")});
        return {...c, accountId: account, publicKey: key.getPublicKey().toString(), signature: Buffer.from(sig.signature).toString("base64")};
    };
    try {
        const brow = identity.browser("").cookie;
        const c = identity.challenge("owner.testnet", brow);
        const token = await identity.login(await sign("owner.testnet", c), brow);
        const org = (await identity.createOrganization(token, "Studio")).id;
        await backend.ownerWrite(token, org, {action: "create-profile", name: "Writer"});
        const profile = (await backend.ownerRead(token, org)).profiles.find(p => p.name === "Writer")!;
        const link = (await backend.ownerWrite(token, org, {action: "issue-link", profileId: profile.id})).token!;
        const session = await backend.enterVerifiedLink(link);
        const direct=(await backend.write(session, directInput("direct-1"))).invoice!;
        assert.equal(direct.orderId, "");assert.equal(direct.recipient, "");
        await backend.ownerWrite(token,org,{action:"review-invoice",invoiceId:direct.id,decision:"approve",note:""});
        assert.equal((await backend.ownerRead(token,org)).invoices[0].status,"Approved");
        assert.equal((await backend.write(session,directInput("direct-2",{recipient:"writer.testnet"}))).invoice!.recipient,"");
        // Persistent order-based billing continues to reject any orderId it cannot match.
        await assert.rejects(() => backend.write(session, directInput("direct-3", {orderId: "ghost-order"})), /approved work order/);
    } finally {
        backend.db.close(); identity.db.close(); fs.rmSync(directory, {recursive: true, force: true});
    }
});
