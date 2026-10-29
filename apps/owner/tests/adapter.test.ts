import test from "node:test";
import assert from "node:assert/strict";
import { MockOwnerAdapter } from "../src/data/mock-adapter.ts";
import {
  account,
  amountFromNear,
  DEPLOYMENT_ENABLED,
  formatNear,
  NEAR,
  review,
  uint,
} from "../src/data/owner-adapter.ts";

test("exact yocto amounts, range and canonical input; deployment unavailable", () => {
  assert.equal(amountFromNear("0.000000000000000000000001"), "1");
  assert.equal(
    formatNear("2000000000000000000000001"),
    "2.000000000000000000000001",
  );
  for (const value of ["1e2", "-1", "01", "0", "1.0000000000000000000000001"])
    assert.throws(() => amountFromNear(value));
  assert.throws(() => uint((1n << 128n).toString()));
  assert.equal(DEPLOYMENT_ENABLED, false);
});
test("snapshots are isolated copies and cannot grant authority", async () => {
  const a = new MockOwnerAdapter(0),
    s = await a.snapshot();
  s.vault.spent = uint("0");
  s.orders[0].status = "Approved";
  const fresh = await a.snapshot();
  assert.equal(fresh.orders[0].status, "Paid");
  assert.equal(fresh.vault.spent, (2n * NEAR).toString());
});
test("vendor updates preserve immutable approved recipients and slot count", async () => {
  const a = new MockOwnerAdapter(0),
    before = await a.snapshot();
  await a.command({
    method: "register_vendor",
    args: { vendor_id: "editor", recipient: account("new-editor.testnet") },
  });
  const after = await a.snapshot();
  assert.equal(after.orders[2].recipient, before.orders[2].recipient);
  assert.notEqual(after.vendors[2].recipient, after.orders[2].recipient);
  await assert.rejects(
    a.command({
      method: "register_vendor",
      args: { vendor_id: "fourth", recipient: account("fourth.testnet") },
    }),
    /three vendor slots/,
  );
});
test("review acknowledgement never overrides pause, vendor or recipient rules", async () => {
  const a = new MockOwnerAdapter(0);
  await a.markReviewed("INV-1043");
  let s = await a.snapshot();
  assert.ok(review(s, s.invoices[1]).includes("RECIPIENT_MISMATCH"));
  await a.command({ method: "set_paused", args: { paused: true } });
  await a.command({ method: "disable_vendor", args: { vendor_id: "editor" } });
  s = await a.snapshot();
  const codes = review(s, s.invoices[0]);
  assert.ok(codes.includes("PAUSED") && codes.includes("VENDOR_INACTIVE"));
  await assert.rejects(
    a.simulatePayment("INV-1042", "success"),
    /Payment blocked/,
  );
});
test("concurrent duplicate simulation claims one attempt and reserves before awaiting", async () => {
  const a = new MockOwnerAdapter(0),
    first = a.simulatePayment("INV-1042", "success");
  const pending = await a.snapshot();
  assert.equal(pending.vault.reserved, (4n * NEAR).toString());
  await assert.rejects(
    a.simulatePayment("INV-1042", "success"),
    /PAYMENT_PENDING/,
  );
  await first;
  const s = await a.snapshot();
  assert.equal(s.vault.last_attempt, "4");
  assert.equal(s.vault.spent, (5n * NEAR).toString());
  assert.equal(s.vault.reserved, NEAR.toString());
  await assert.rejects(
    a.simulatePayment("INV-1042", "success"),
    /ALREADY_PAID/,
  );
});
test("in-flight pause and revocation cannot cancel a conclusive successful result", async () => {
  const a = new MockOwnerAdapter(0),
    flight = a.simulatePayment("INV-1042", "success");
  await a.command({ method: "set_paused", args: { paused: true } });
  await a.command({ method: "revoke_agent", args: {} });
  await a.command({
    method: "revoke_work_order",
    args: { order_id: "video-003" },
  });
  await flight;
  const s = await a.snapshot();
  assert.equal(s.orders[2].status, "Paid");
  assert.equal(s.orders[2].enabled, false);
  assert.equal(s.vault.spent, (5n * NEAR).toString());
  assert.equal(s.vault.reserved, NEAR.toString());
});
test("confirmed failed transfer releases reservation while preserving revocation", async () => {
  const a = new MockOwnerAdapter(0),
    flight = a.simulatePayment("INV-1042", "failure");
  await a.command({
    method: "revoke_work_order",
    args: { order_id: "video-003" },
  });
  await flight;
  const s = await a.snapshot();
  assert.equal(s.orders[2].status, "Approved");
  assert.equal(s.orders[2].enabled, false);
  assert.equal(s.vault.spent, (2n * NEAR).toString());
  assert.equal(s.vault.reserved, NEAR.toString());
  await assert.rejects(
    a.simulatePayment("INV-1042", "success"),
    /ORDER_REVOKED/,
  );
});
test("unknown outcomes stay pending across refresh, pause and review; no retry", async () => {
  const a = new MockOwnerAdapter(0);
  await a.simulatePayment("INV-1042", "unknown");
  await a.markReviewed("INV-1042");
  await a.command({ method: "set_paused", args: { paused: true } });
  const s = await a.snapshot();
  assert.equal(s.orders[2].status, "Pending");
  assert.equal(s.vault.reserved, (4n * NEAR).toString());
  await assert.rejects(
    a.simulatePayment("INV-1042", "success"),
    /PAYMENT_PENDING/,
  );
  assert.equal((await a.snapshot()).vault.last_attempt, "4");
});
test("reset fences outstanding callbacks and advances the view revision", async () => {
  const a = new MockOwnerAdapter(0),
    flight = a.simulatePayment("INV-1042", "success");
  const prior = (await a.snapshot()).revision;
  a.reset();
  await flight;
  const s = await a.snapshot();
  assert.ok(s.revision > prior);
  assert.equal(s.orders[2].status, "Approved");
  assert.equal(s.vault.last_attempt, "3");
});
test("failed requests leave state intact and can be refreshed", async () => {
  const a = new MockOwnerAdapter(0),
    s = await a.snapshot();
  a.failNextRequest();
  await assert.rejects(
    a.command({ method: "set_paused", args: { paused: true } }),
    /Simulated adapter request failed/,
  );
  assert.deepEqual(await a.snapshot(), s);
});
test("expiry uses the exact nanosecond boundary and permanent order IDs cannot recycle", async () => {
  const a = new MockOwnerAdapter(0),
    s = await a.snapshot();
  const expiry = BigInt(s.orders[2].expires_at_ns);
  assert.ok(!review(s, s.invoices[0], expiry - 1n).includes("EXPIRED"));
  assert.ok(review(s, s.invoices[0], expiry).includes("EXPIRED"));
  await assert.rejects(
    a.command({
      method: "approve_work_order",
      args: {
        order_id: "video-003",
        vendor_id: "editor",
        amount: uint("1"),
        expires_at_ns: uint(expiry.toString()),
      },
    }),
    /cannot be reused/,
  );
});
