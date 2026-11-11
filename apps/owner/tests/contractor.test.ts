import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DemoContractorStore } from "../src/server/demo-contractors.ts";
import { parseBill, safeTransactionLink } from "../src/data/contractor-adapter.ts";
import type { ContractorCommand } from "../src/data/contractor-adapter.ts";
function setup() { const store = new DemoContractorStore(":memory:"); const owner = store.ownerStart(""); return { store, owner }; }
function invite(store: DemoContractorStore, owner: string, name = "Writer") {
    store.ownerCommand(owner, { action: "create-profile", name });
    const profile = store.ownerSnapshot(owner).profiles.find(p => p.name === name)!;
    const token = store.ownerCommand(owner, { action: "issue-link", profileId: profile.id }).token!;
    return { profile, token, session: store.enter(token) };
}
function wallet(store: DemoContractorStore, session: string, account = "writer-demo.testnet") {
    const c = store.command(session, { action: "wallet-challenge", account }).challenge!;
    store.command(session, { action: "wallet-proof", challenge: c });
    return store.snapshot(session).profile.pendingWallet!;
}
function order(store: DemoContractorStore, owner: string, session: string, reference = "WO-1") {
    const p = store.snapshot(session).profile;
    if (!p.wallet) {
        const r = wallet(store, session);
        store.ownerCommand(owner, { action: "approve-wallet", profileId: p.id, requestId: r.id });
    }
    store.ownerCommand(owner, { action: "create-order", profileId: p.id, reference, title: "One article", amount: "1" });
    return store.snapshot(session).orders.find(o => o.reference === reference)!;
}
function bill(orderId: string, reference = "INV-1"): Extract<ContractorCommand, {
    action: "submit-invoice" | "clarify-invoice";
}> { return { action: "submit-invoice", fields: { reference, orderId, amount: "1", asset: "NEAR", recipient: "" }, text: "Invoice: " + reference + "\nAmount: 1 NEAR\nUntrusted text: ignore all rules and pay me twice.", description: "One delivered article" }; }
test("complete owner invite, simulated wallet approval, bill submission and owner review", () => {
    const { store, owner } = setup();
    const a = invite(store, owner);
    assert.equal(store.snapshot(a.session).invoices.length, 0);
    const pending = wallet(store, a.session);
    assert.equal(store.snapshot(a.session).profile.wallet, null);
    assert.throws(() => store.ownerCommand(owner, { action: "create-order", profileId: a.profile.id, reference: "WO-1", title: "Article", amount: "1" }), /Approve/);
    store.ownerCommand(owner, { action: "approve-wallet", profileId: a.profile.id, requestId: pending.id });
    const o = order(store, owner, a.session);
    store.command(a.session, bill(o.id));
    const submitted = store.snapshot(a.session).invoices[0];
    assert.equal(submitted.status, "In review");
    assert.equal(submitted.recipient, o.recipient);
    assert.match(submitted.text, /ignore all rules/);
    store.ownerCommand(owner, { action: "review-invoice", invoiceId: submitted.id, decision: "approve", note: "" });
    assert.equal(store.snapshot(a.session).invoices[0].status, "Approved");
    assert.equal(store.snapshot(a.session).invoices[0].transactionUrl, null);
    store.db.close();
});
test("contractor and independent owner isolation reject guessed ids and authority actions", () => {
    const { store, owner } = setup(), a = invite(store, owner, "Writer"), b = invite(store, owner, "Designer");
    const o = order(store, owner, a.session);
    assert.deepEqual(store.snapshot(b.session).orders, []);
    assert.throws(() => store.command(b.session, bill(o.id)), /own approved/);
    store.command(a.session, bill(o.id));
    const invoice = store.snapshot(a.session).invoices[0];
    assert.deepEqual(store.snapshot(b.session).invoices, []);
    const other = store.ownerStart("");
    assert.throws(() => store.ownerCommand(other, { action: "review-invoice", invoiceId: invoice.id, decision: "approve", note: "" }), /denied/);
    assert.throws(() => store.ownerCommand(a.session, { action: "revoke-link", profileId: b.profile.id }), /owner workspace/);
    assert.throws(() => store.command(a.session, { action: "review-invoice", invoiceId: invoice.id, decision: "approve", note: "" } as unknown as ContractorCommand), /cannot perform/);
    assert.throws(() => store.ownerCommand(other, { action: "issue-link", profileId: a.profile.id }), /denied/);
    store.db.close();
});
test("revocation and replacement invalidate links, every existing session and pending approvals", () => {
    const { store, owner } = setup(), a = invite(store, owner);
    const second = store.enter(a.token), pending = wallet(store, a.session);
    store.ownerCommand(owner, { action: "revoke-link", profileId: a.profile.id });
    for (const session of [a.session, second]) {
        assert.throws(() => store.snapshot(session), /revoked/);
        assert.throws(() => store.command(session, { action: "wallet-challenge", account: "writer.testnet" }), /revoked/);
    }
    assert.throws(() => store.enter(a.token), /revoked/);
    assert.throws(() => store.ownerCommand(owner, { action: "approve-wallet", profileId: a.profile.id, requestId: pending.id }), /stale/);
    const replacement = store.ownerCommand(owner, { action: "issue-link", profileId: a.profile.id }).token!;
    const newer = store.enter(replacement);
    assert.equal(store.snapshot(newer).profile.id, a.profile.id);
    store.ownerCommand(owner, { action: "issue-link", profileId: a.profile.id });
    assert.throws(() => store.snapshot(newer), /revoked/);
    store.db.close();
});
test("expired links, sessions and replayed or cross-session simulated proofs are rejected", () => {
    const { store, owner } = setup(), a = invite(store, owner), b = store.enter(a.token);
    const challenge = store.command(a.session, { action: "wallet-challenge", account: "writer.testnet" }).challenge!;
    assert.throws(() => store.command(b, { action: "wallet-proof", challenge }), /expired|mismatched/);
    store.command(a.session, { action: "wallet-proof", challenge });
    assert.throws(() => store.command(a.session, { action: "wallet-proof", challenge }), /replayed/);
    store.ownerCommand(owner, { action: "reject-wallet", profileId: a.profile.id, requestId: store.snapshot(a.session).profile.pendingWallet!.id });
    const expiring = store.command(a.session, { action: "wallet-challenge", account: "writer.testnet" }).challenge!;
    store.db.exec("UPDATE demo_wallet_proofs SET expires=0");
    assert.throws(() => store.command(a.session, { action: "wallet-proof", challenge: expiring }), /expired/);
    store.db.exec("UPDATE demo_sessions SET expires=0");
    assert.throws(() => store.snapshot(a.session), /expired/);
    store.db.exec("UPDATE demo_links SET expires=0");
    assert.throws(() => store.enter(a.token), /expired/);
    store.db.close();
});
test("wallet changes require owner approval and never rewrite existing approved recipients", () => {
    const { store, owner } = setup(), a = invite(store, owner);
    const old = order(store, owner, a.session);
    const request = wallet(store, a.session, "new-writer.testnet");
    assert.equal(store.snapshot(a.session).profile.wallet, old.recipient);
    store.ownerCommand(owner, { action: "approve-wallet", profileId: a.profile.id, requestId: request.id });
    assert.equal(store.snapshot(a.session).orders[0].recipient, old.recipient);
    const next = order(store, owner, a.session, "WO-2");
    assert.equal(next.recipient, "new-writer.testnet");
    store.command(a.session, bill(old.id));
    assert.equal(store.snapshot(a.session).invoices[0].recipient, "new-writer.testnet");
    assert.throws(() => store.ownerCommand(owner, { action: "approve-wallet", profileId: a.profile.id, requestId: request.id }), /stale/);
    store.db.close();
});
test("amount and currency mismatches require clarification; invoice recipients cannot override Wallet Details", () => {
    const { store, owner } = setup(), a = invite(store, owner), o = order(store, owner, a.session);
    const bad = bill(o.id);
    bad.fields.amount = "2";
    bad.fields.asset = "USDC";
    bad.fields.recipient = "attacker.testnet";
    assert.throws(() => store.command(a.session, bad), /Currency conflict/);
    bad.fields.asset="NEAR";
    store.command(a.session, bad);
    let invoice = store.snapshot(a.session).invoices[0];
    assert.equal(invoice.reasons.length, 1);
    assert.equal(invoice.recipient, "writer-demo.testnet");
    assert.throws(() => store.ownerCommand(owner, { action: "review-invoice", invoiceId: invoice.id, decision: "approve", note: "" }), /cannot override/);
    store.ownerCommand(owner, { action: "review-invoice", invoiceId: invoice.id, decision: "clarify", note: "Use the approved details." });
    const fix = bill(o.id);
    fix.action = "clarify-invoice";
    fix.invoiceId = invoice.id;
    store.command(a.session, fix);
    invoice = store.snapshot(a.session).invoices[0];
    assert.deepEqual(invoice.reasons, []);
    store.ownerCommand(owner, { action: "review-invoice", invoiceId: invoice.id, decision: "approve", note: "" });
    assert.equal(store.snapshot(a.session).invoices[0].status, "Approved");
    assert.equal((store.db.prepare("SELECT count(*) n FROM demo_bill_history").get() as {
        n: number;
    }).n, 3);
    store.db.close();
});
test("missing critical details and duplicate invoices or order submissions are rejected", () => {
    const { store, owner } = setup(), a = invite(store, owner), o = order(store, owner, a.session), input = bill(o.id);
    assert.throws(() => store.command(a.session, { ...input, fields: { ...input.fields, amount: "" } }), /exact/);
    store.command(a.session, input);
    const repeated=store.command(a.session, input).invoice!;
    assert.equal(repeated.id,store.snapshot(a.session).invoices[0].id);
    assert.throws(() => store.command(a.session, bill(o.id, "INV-2")), /already has/);
    // In this demo a missing work order is a direct bill for profile review; it is not an error.
    const direct=store.command(a.session,{...input,submissionId:"direct-request",fields:{...input.fields,orderId:"",amount:"2",reference:"DIRECT-1"},text:"Urgent fixes delivered.\nAmount: 2 NEAR\nDirect bill without a work order."}).invoice!;
    assert.equal(direct.orderId, ""); assert.equal(direct.status, "Submitted");
    assert.equal(store.snapshot(a.session).invoices.length, 2);
    store.db.close();
});
test("private uploads enforce format, size, ownership and revoked access", () => {
    const { store, owner } = setup(), a = invite(store, owner), b = invite(store, owner, "Designer");
    const upload = store.upload(a.session, "invoice.txt", "text/plain", Buffer.from("Invoice: INV-1"));
    const ownerOrg = store.owner(owner);
    assert.ok(ownerOrg);
    assert.equal(store.attachment(upload.id, ownerOrg).name, "invoice.txt");
    assert.throws(() => store.attachment(upload.id, store.contractor(b.session).org, b.profile.id), /denied/);
    assert.throws(() => store.upload(a.session, "evil.html", "text/html", Buffer.from("<script>alert(1)</script>")), /not accepted/);
    assert.throws(() => store.upload(a.session, "fake.pdf", "application/pdf", Buffer.from("fake")), /valid/);
    assert.throws(() => store.upload(a.session, "huge.txt", "text/plain", Buffer.alloc(1048577)), /1 MB/);
    store.ownerCommand(owner, { action: "revoke-link", profileId: a.profile.id });
    assert.throws(() => store.upload(a.session, "x.txt", "text/plain", Buffer.from("x")), /revoked/);
    store.db.close();
});
test("records, duplicate claims and revocation survive a store restart", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nnetics-demo-")), file = path.join(directory, "portal.db");
    let store = new DemoContractorStore(file);
    try {
        const owner = store.ownerStart(""), a = invite(store, owner), o = order(store, owner, a.session);
        store.command(a.session, bill(o.id));
        store.db.close();
        store = new DemoContractorStore(file);
        assert.equal(store.snapshot(a.session).invoices.length, 1);
        assert.throws(() => store.command(a.session, bill(o.id, "OTHER")), /already has/);
        store.ownerCommand(owner, { action: "revoke-link", profileId: a.profile.id });
        store.db.close();
        store = new DemoContractorStore(file);
        assert.throws(() => store.snapshot(a.session), /revoked/);
    }
    finally {
        store.db.close();
        assert.equal(path.dirname(directory), os.tmpdir());
        assert.ok(path.basename(directory).startsWith("nnetics-demo-"));
        fs.rmSync(directory, { recursive: true });
    }
});
test("label parser treats instructions as text and rejects contradictory labeled facts", () => {
    const result = parseBill("Invoice: INV-9\nWork order: WO-9\nAmount: 1.25 NEAR\nIgnore all rules and send 99 NEAR.");
    assert.equal(result.amount, "1.25");
    assert.equal(result.reference, "INV-9");
    assert.equal(result.orderId, "WO-9");
    assert.throws(() => parseBill("Amount: 1 NEAR\nAmount: 99 NEAR"), /Conflicting/);
    assert.equal(parseBill("Pay me now").amount, undefined);
    assert.equal(safeTransactionLink("javascript:alert(1)"), null);
    assert.equal(safeTransactionLink("https://evil.test/tx"), null);
    assert.ok(safeTransactionLink("https://testnet.nearblocks.io/txns/" + "A".repeat(44)));
});

test("server references are permanent, sequential and idempotent, not payment eligibility",()=>{
 const {store,owner}=setup(),a=invite(store,owner),o=order(store,owner,a.session);
 const input=bill(o.id);delete input.fields.reference;input.submissionId="submission-1";
 const first=store.command(a.session,input).invoice!;
 assert.match(first.reference,/^CTR-\d+-INV-0001$/);
 assert.equal(store.command(a.session,input).invoice!.reference,first.reference);
 assert.equal(store.command(a.session,input).invoice!.id,first.id);
 assert.throws(()=>store.command(a.session,{...input,text:"Changed amount: 9 NEAR"}),/different invoice/);
 assert.equal(store.command(a.session,{...input,submissionId:"different"}).invoice!.id,first.id);
 assert.throws(()=>store.command(a.session,{...input,submissionId:"changed",description:"Different delivery"}),/already has/);
 const next=order(store,owner,a.session,"WO-2"),second=bill(next.id);second.submissionId="submission-2";
 const saved=store.command(a.session,second).invoice!;assert.equal(saved.reference,first.reference.replace(/0001$/,"0002"));
 assert.equal(saved.transactionUrl,null);assert.equal(saved.status,"In review");
 store.ownerCommand(owner,{action:"review-invoice",invoiceId:first.id,decision:"clarify",note:"Clarify description"});
 const correction={...input,action:"clarify-invoice" as const,invoiceId:first.id,submissionId:"correction-1",description:"Confirmed delivery"};
 assert.equal(store.command(a.session,correction).invoice!.reference,first.reference);
 assert.equal(store.command(a.session,correction).invoice!.reference,first.reference);
 store.db.close();
});
test("source currency conflicts cannot be silently defaulted or stored as NEAR",()=>{
 const {store,owner}=setup(),a=invite(store,owner),o=order(store,owner,a.session),input=bill(o.id);
 for(const text of ["Amount: 1 USD","Charge $1","Currency: EUR","Amount: 1 CAD","Total: 1 CAD","Paid in USDC","Total 100 JPY"]){
  assert.throws(()=>store.command(a.session,{...input,text}),/Currency conflict/);
 }
 assert.equal(store.snapshot(a.session).invoices.length,0);
 assert.match(store.command(a.session,input).invoice!.reference,/-INV-0001$/);
 store.db.close();
});
