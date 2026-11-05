import test from "node:test";
import assert from "node:assert/strict";
import {assertFreshCheckpoint, CHECKPOINT_MAX_AGE_NS} from "../src/server/checkpoint-validity.ts";
import {WorkerNearTransport} from "../src/server/signer.ts";
import {liveConfig} from "../src/server/config.ts";
import {uint} from "../src/data/owner-adapter.ts";
const checkpoint = (timestamp: unknown) => ({head: {inner_lite: {timestamp}}});
test("recovery evidence must exist and contain an exact integer timestamp", () => {
  for (const value of [null, {}, checkpoint(1), checkpoint("1.5"), checkpoint("-1")])
    assert.throws(() => assertFreshCheckpoint(value, "100"));
});
test("stale evidence blocks preparation and broadcast before key use or network submission", async () => {
  const previous = process.env.NNETICS_PAYMENT_EXECUTION_AUTHORIZED;
  process.env.NNETICS_PAYMENT_EXECUTION_AUTHORIZED = "testnet-reviewed";
  let submitted = 0;
  try {
    const transport = new WorkerNearTransport(liveConfig());
    transport.rpc.finalized = async () => ({hash: "fixture-block", timestamp: uint(String(CHECKPOINT_MAX_AGE_NS + 1n)), protocolVersion: 88});
    transport.rpc.view = async <T>() => checkpoint("1") as T;
    transport.rpc.rpc = async () => {submitted++; throw Error("Unexpected RPC submission");};
    await assert.rejects(transport.prepare({order_id: "fixture-order", invoice_id: "fixture-invoice", recipient: "fixture.testnet", amount: "1"}), /checkpoint is expired/);
    await assert.rejects(transport.broadcast("not-a-signed-transaction"), /checkpoint is expired/);
    assert.equal(submitted, 0);
  } finally {
    if (previous === undefined) delete process.env.NNETICS_PAYMENT_EXECUTION_AUTHORIZED;
    else process.env.NNETICS_PAYMENT_EXECUTION_AUTHORIZED = previous;
  }
});
test("freshness uses finalized network time, rejecting the expiry boundary and future evidence", () => {
  const time = 1793682686057769230n;
  assertFreshCheckpoint(checkpoint(String(time)), String(time));
  assertFreshCheckpoint(checkpoint(String(time)), String(time + CHECKPOINT_MAX_AGE_NS - 1n));
  assert.throws(() => assertFreshCheckpoint(checkpoint(String(time)), String(time + CHECKPOINT_MAX_AGE_NS)));
  assert.throws(() => assertFreshCheckpoint(checkpoint(String(time + 1n)), String(time)));
});
