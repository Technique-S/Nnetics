import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {DemoContractorStore} from "../src/server/demo-contractors.ts";
import {ContractorRecordStore} from "../src/server/contractor-records.ts";
import {
    claimLifecycle,
    lifecycleScope,
    lifecycleSecret,
    lifecycleSummary,
    prepareLifecycle,
} from "../src/server/contractor-lifecycle.ts";

function fixture() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nnetics-contractor-lifecycle-"));
    const store = new DemoContractorStore(path.join(directory, "contractor.db"));
    const owner = store.ownerStart("");
    return {
        store, owner,
        close() { store.db.close(); fs.rmSync(directory, {recursive: true, force: true}); }
    };
}

function add(f: {store: DemoContractorStore; owner: string}, name: string) {
    const id = f.store.ownerCommand(f.owner, {action: "create-profile", name}).profileId!;
    return f.store.ownerSnapshot(f.owner).profiles.find(p => p.id === id)!;
}

const billInput = (submissionId: string) => ({
    action: "submit-invoice" as const,
    submissionId,
    fields: {orderId: "", amount: "0.4", asset: "NEAR", recipient: "writer.testnet"},
    text: "Delivered urgent fixes beyond the signed scope.",
    description: "Urgent fixes"
});

test("a contractor with no linked records can be deleted and leaves an audit record", async () => {
    const f = fixture(); try {
        const tia = add(f, "Tia");
        assert.equal(tia.deletable, true);
        f.store.ownerCommand(f.owner, {action: "delete-contractor", profileId: tia.id});
        const after = f.store.ownerSnapshot(f.owner);
        assert.equal(after.profiles.length, 0);
        assert.equal((after.archivedProfiles ?? []).length, 0);
        // The audit record survives the profile it describes.
        const event = after.events!.find(e => e.profileId === tia.id);
        assert.ok(event, "a deleted contractor must leave an audit record");
        assert.equal(event.action, "deleted");
        assert.equal(event.profileName, "Tia");
        // The profile itself is gone.
        assert.equal(f.store.ownerSnapshot(f.owner).profiles.some(p => p.id === tia.id), false);
    } finally { f.close(); }
});

test("a contractor with invoices cannot be deleted and is told to archive instead", async () => {
    const f = fixture(); try {
        const tia = add(f, "Tia");
        const link = f.store.ownerCommand(f.owner, {action: "issue-link", profileId: tia.id}).token!;
        const session = f.store.enter(link);
        f.store.command(session, billInput("sub-1"));
        const withBill = f.store.ownerSnapshot(f.owner).profiles.find(p => p.id === tia.id)!;
        assert.equal(withBill.deletable, false);
        assert.throws(() => f.store.ownerCommand(f.owner, {action: "delete-contractor", profileId: tia.id}), /Archive it instead/i);
        // Nothing was removed.
        assert.equal(f.store.ownerSnapshot(f.owner).profiles.length, 1);
        assert.equal(f.store.ownerSnapshot(f.owner).invoices.length, 1);
    } finally { f.close(); }
});

test("archiving keeps every invoice and revokes portal access", async () => {
    const f = fixture(); try {
        const tia = add(f, "Tia");
        const link = f.store.ownerCommand(f.owner, {action: "issue-link", profileId: tia.id}).token!;
        const session = f.store.enter(link);
        f.store.command(session, billInput("sub-1"));
        // The portal works before the archive.
        assert.ok(f.store.snapshot(session).profile.id);
        f.store.ownerCommand(f.owner, {action: "archive-contractor", profileId: tia.id});
        const after = f.store.ownerSnapshot(f.owner);
        assert.equal(after.profiles.length, 0);
        assert.equal((after.archivedProfiles ?? []).length, 1);
        assert.equal((after.archivedProfiles ?? [])[0].name, "Tia");
        // The invoice and its history are preserved.
        assert.equal(after.invoices.length, 1);
        // The portal link no longer works.
        assert.throws(() => f.store.snapshot(session), /revoked|expired/i);
        // The audit record explains what happened.
        const event = after.events!.find(e => e.profileId === tia.id);
        assert.ok(event);
        assert.equal(event.action, "archived");
        assert.match(event.detail, /preserved/i);
    } finally { f.close(); }
});

test("an archived contractor can be restored without touching financial records", async () => {
    const f = fixture(); try {
        const tia = add(f, "Tia");
        const link = f.store.ownerCommand(f.owner, {action: "issue-link", profileId: tia.id}).token!;
        const session = f.store.enter(link);
        f.store.command(session, billInput("sub-1"));
        f.store.ownerCommand(f.owner, {action: "archive-contractor", profileId: tia.id});
        f.store.ownerCommand(f.owner, {action: "restore-contractor", profileId: tia.id});
        const after = f.store.ownerSnapshot(f.owner);
        assert.equal(after.profiles.length, 1);
        assert.equal((after.archivedProfiles ?? []).length, 0);
        assert.equal(after.invoices.length, 1);
        assert.equal(after.events!.some(e => e.action === "restored"), true);
        // Restoring does not re-open the old portal link.
        assert.throws(() => f.store.snapshot(session), /revoked|expired/i);
    } finally { f.close(); }
});

test("a contractor can be renamed and the change is audited", async () => {
    const f = fixture(); try {
        const tia = add(f, "Tia");
        f.store.ownerCommand(f.owner, {action: "update-contractor", profileId: tia.id, name: "Tia Okafor"});
        const after = f.store.ownerSnapshot(f.owner);
        assert.equal(after.profiles[0].name, "Tia Okafor");
        assert.equal(after.events!.some(e => e.action === "updated"), true);
    } finally { f.close(); }
});

test("one organization can never act on another organization's contractor", async () => {
    const f = fixture(); try {
        const tia = add(f, "Tia");
        const other = f.store.ownerStart("");
        // A different owner cannot see, archive or delete this contractor.
        assert.throws(() => f.store.ownerCommand(other, {action: "archive-contractor", profileId: tia.id}), /access denied/i);
        assert.throws(() => f.store.ownerCommand(other, {action: "delete-contractor", profileId: tia.id}), /access denied/i);
        assert.equal(f.store.ownerSnapshot(f.owner).profiles.length, 1);
        assert.equal(f.store.ownerSnapshot(other).profiles.length, 0);
    } finally { f.close(); }
});

test("a demo workspace is not limited to three contractors", async () => {
    const f = fixture(); try {
        const names = Array.from({length: 25}, (_, index) => `Contractor ${index + 1}`);
        for (const name of names) add(f, name);
        const after = f.store.ownerSnapshot(f.owner);
        assert.equal(after.profiles.length, 25);
        assert.equal(after.profiles.filter(p => p.name === "Contractor 25").length, 1);
        // Every record is persisted and independently addressable.
        for (const profile of after.profiles) {
            assert.equal(f.store.ownerSnapshot(f.owner).profiles.some(p => p.id === profile.id), true);
        }
        // And they can be archived and deleted individually.
        const first = after.profiles[0];
        f.store.ownerCommand(f.owner, {action: "delete-contractor", profileId: first.id});
        assert.equal(f.store.ownerSnapshot(f.owner).profiles.length, 24);
        assert.equal((f.store.ownerSnapshot(f.owner).archivedProfiles ?? []).length, 0);
    } finally { f.close(); }
});

test("the lifecycle operations are refused for a verified organization", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nnetics-contractor-persistent-"));
    const store = new ContractorRecordStore(path.join(directory, "live.db"), "persistent");
    try {
        // A verified organization has its owner row written by the identity
        // service, not by ownerStart.
        const token = "live-owner-token";
        store.db.prepare("INSERT INTO demo_owners VALUES (?,?,?)")
            .run(crypto.createHash("sha256").update(token).digest("hex"), "live-org", Date.now() + 3600000);
        const id = store.ownerCommand(token, {action: "create-profile", name: "Live"}).profileId!;
        assert.throws(() => store.ownerCommand(token, {action: "archive-contractor", profileId: id}), /not available for this organization/i);
        assert.throws(() => store.ownerCommand(token, {action: "restore-contractor", profileId: id}), /not available for this organization/i);
        assert.throws(() => store.ownerCommand(token, {action: "delete-contractor", profileId: id}), /not available for this organization/i);
        assert.throws(() => store.ownerCommand(token, {action: "update-contractor", profileId: id, name: "Renamed"}), /not available for this organization/i);
        // The live workspace keeps exactly the contractor it had.
        assert.equal(store.ownerSnapshot(token).profiles.length, 1);
        assert.equal(store.ownerSnapshot(token).profiles[0].name, "Live");
    } finally {
        store.db.close();
        fs.rmSync(directory, {recursive: true, force: true});
    }
});

test("a prepared lifecycle operation carries no confirmation secret to the model", async () => {
    const f = fixture(); try {
        const tia = add(f, "Tia");
        const scope = lifecycleScope(f.owner);
        const operation = prepareLifecycle({
            scope, kind: "delete", contractorId: tia.id, contractorName: tia.name,
            eligibility: f.store.lifecycleEligibility(tia.id, f.store.owner(f.owner)!),
        });
        const summary = lifecycleSummary(operation);
        // The summary is exactly what the model may see.
        assert.equal(JSON.stringify(summary).includes(operation.secret), false);
        assert.equal("secret" in summary, false);
        assert.equal(summary.contractorName, "Tia");
        assert.equal(summary.eligible, true);
        // The secret is only reachable by the server for that owner scope.
        assert.equal(lifecycleSecret(scope, operation.id), operation.secret);
        assert.equal(lifecycleSecret(lifecycleScope("another-owner"), operation.id), null);
    } finally { f.close(); }
});

test("a lifecycle confirmation applies once and cannot be replayed", async () => {
    const f = fixture(); try {
        const tia = add(f, "Tia");
        const scope = lifecycleScope(f.owner);
        const operation = prepareLifecycle({
            scope, kind: "archive", contractorId: tia.id, contractorName: tia.name,
            eligibility: f.store.lifecycleEligibility(tia.id, f.store.owner(f.owner)!),
        });
        // A wrong secret never claims the operation.
        assert.equal(claimLifecycle(scope, operation.id, "wrong-secret"), null);
        assert.equal(f.store.ownerSnapshot(f.owner).profiles.length, 1);
        // The right secret claims it exactly once.
        const claimed = claimLifecycle(scope, operation.id, operation.secret);
        assert.ok(claimed);
        f.store.ownerCommand(f.owner, {action: "archive-contractor", profileId: tia.id});
        assert.equal(f.store.ownerSnapshot(f.owner).profiles.length, 0);
        // A replay is refused and never applies a second change.
        assert.equal(claimLifecycle(scope, operation.id, operation.secret), null);
        assert.equal(f.store.ownerSnapshot(f.owner).profiles.length, 0);
        assert.equal((f.store.ownerSnapshot(f.owner).archivedProfiles ?? []).length, 1);
    } finally { f.close(); }
});

test("a lifecycle confirmation from another owner session is refused", async () => {
    const f = fixture(); try {
        const tia = add(f, "Tia");
        const scope = lifecycleScope(f.owner);
        const operation = prepareLifecycle({
            scope, kind: "archive", contractorId: tia.id, contractorName: tia.name,
            eligibility: f.store.lifecycleEligibility(tia.id, f.store.owner(f.owner)!),
        });
        // The same secret in a different owner session buys nothing.
        assert.equal(claimLifecycle(lifecycleScope("someone-else"), operation.id, operation.secret), null);
        assert.equal(f.store.ownerSnapshot(f.owner).profiles.length, 1);
    } finally { f.close(); }
});
