import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NearRpc } from "../src/server/chain.ts";
import { liveConfig } from "../src/server/config.ts";
import { WorkerNearTransport } from "../src/server/signer.ts";
import { Queue } from "../src/server/queue.ts";
import { account, uint } from "../src/data/owner-adapter.ts";
import { transferMarker } from "../src/server/marker.ts";
import type { Payment } from "../src/data/owner-adapter.ts";

test("implicit owner IDs are accepted on testnet while mainnet named owners remain disabled", () => {
  const previous = process.env.NNETICS_OWNER_ID;
  try {
    process.env.NNETICS_OWNER_ID =
      "28".repeat(32);
    assert.equal(liveConfig().owner, process.env.NNETICS_OWNER_ID);
    process.env.NNETICS_OWNER_ID = "owner.near";
    assert.throws(() => liveConfig(), /Mainnet is disabled/);
  } finally {
    if (previous === undefined) delete process.env.NNETICS_OWNER_ID;
    else process.env.NNETICS_OWNER_ID = previous;
  }
});

test("finalized reads reject wrong network/code and inconsistent block responses", async () => {
  const chain = new NearRpc({ ...liveConfig(), codeHash: "reviewed-code" });
  let network = "testnet",
    code = "reviewed-code",
    method = "";
  chain.rpc = async <T>(name: string) => {
    method = name;
    if (name === "status")
      return { chain_id: network, protocol_version: 88 } as T;
    if (name === "block")
      return {
        header: {
          hash: "final-hash",
          timestamp_nanosec: "18446744073709550000",
        },
      } as T;
    return {
      code_hash: code,
      result: Buffer.from("null"),
      block_hash: "wrong-block",
    } as T;
  };
  const block = await chain.finalized();
  assert.equal(block.timestamp, "18446744073709550000");
  assert.equal(block.protocolVersion, 88);
  await assert.rejects(
    () => chain.view("get_vault", {}, block.hash),
    /Inconsistent/,
  );
  network = "mainnet";
  await assert.rejects(() => chain.finalized(), /not NEAR testnet/);
  assert.equal(method, "status");
  network = "testnet";
  code = "unreviewed";
  await assert.rejects(() => chain.finalized(), /reviewed configuration/);
});
test("signer refuses signing/broadcast on protocol 88 even if generic authorization flag is set", async () => {
  const previous = process.env.NNETICS_TRANSACTIONS_AUTHORIZED;
  process.env.NNETICS_TRANSACTIONS_AUTHORIZED = "testnet-reviewed";
  try {
    const transport = new WorkerNearTransport(liveConfig());
    transport.rpc.finalized = async () => ({
      hash: "final-hash",
      timestamp: "1" as Awaited<ReturnType<NearRpc["finalized"]>>["timestamp"],
      protocolVersion: 88,
    });
    await assert.rejects(
      () =>
        transport.prepare({
          order_id: "order",
          invoice_id: "invoice",
          recipient: "vendor.testnet",
          amount: "1",
        }),
      /compatibility/,
    );
    await assert.rejects(
      () => transport.broadcast("never-decode-or-send"),
      /Unreviewed/,
    );
  } finally {
    if (previous === undefined)
      delete process.env.NNETICS_TRANSACTIONS_AUTHORIZED;
    else process.env.NNETICS_TRANSACTIONS_AUTHORIZED = previous;
  }
});
test("database rejects scope reuse without leaking an open connection", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nnetics-scope-")),
    file = path.join(directory, "q.db");
  const a = new Queue(file, "a");
  a.close();
  assert.throws(() => new Queue(file, "b"));
  fs.rmSync(directory, { recursive: true });
});

test("receipt marker matches actual renamed Rust sandbox output; transaction linkage rejects substitution and ambiguity", async () => {
  // Run 40901797197, fault-record-gas-historical-success-proof/result.json.
  // Public, ephemeral Sandbox accounts; this is historical protocol-86 evidence.
  const vault = account("vault.dev-20261029153409-68194307268020.test.near");
  const payment: Payment = {
    attempt_id: uint("1"),
    order_id: "article",
    invoice_id: "inv",
    recipient: account("dev-20261029153410-54143092504382.test.near"),
    amount: uint("1000000000000000000000000"),
    initiated_at_ns: uint("1793288094910639687"),
    status: "Paid",
    reference: "fixture-hash",
  };
  const marker =
    "NNETICS_TRANSFER_V1:dd891ce4f6c48059e7e2ccba0692212038f38d237bebbfb65302bef8056bb18a";
  assert.equal(transferMarker(vault, payment), marker);
  const transport = new WorkerNearTransport({
    ...liveConfig(),
    contract: vault,
  });
  const response = {
    final_execution_status: "FINAL",
    transaction: {
      hash: "fixture-hash",
      signer_id: transport.config.worker,
      receiver_id: vault,
      public_key: transport.config.publicKey,
    },
    receipts_outcome: [
      {
        outcome: {
          executor_id: vault,
          logs: [marker],
          status: { SuccessReceiptId: "transfer-receipt" },
        },
      },
    ],
  };
  transport.rpc.rpc = async <T>() => response as T;
  assert.equal(await transport.confirmsPayment("fixture-hash", payment), true);
  assert.equal(
    await transport.confirmsPayment("substitute-hash", payment),
    false,
  );
  assert.equal(
    await transport.confirmsPayment("fixture-hash", {
      ...payment,
      amount: uint("1"),
    }),
    false,
  );
  response.receipts_outcome[0].outcome.logs.push(marker);
  assert.equal(await transport.confirmsPayment("fixture-hash", payment), false);
  response.receipts_outcome[0].outcome.logs.pop();
  response.final_execution_status = "EXECUTED_OPTIMISTIC";
  assert.equal(await transport.confirmsPayment("fixture-hash", payment), false);
});
