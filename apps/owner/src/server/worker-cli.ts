import { liveConfig } from "./config.ts";
import { Queue, workerLock } from "./queue.ts";
import { WorkerNearTransport } from "./signer.ts";
import { PaymentWorker } from "./worker.ts";
import { assertTestedProtocol } from "../data/protocol.ts";
const config = liveConfig();
if (!config.configured)
  throw new Error("Complete testnet configuration first.");
if (process.env.NNETICS_TRANSACTIONS_AUTHORIZED !== "testnet-reviewed")
  throw new Error(
    "Worker disabled pending specific transaction authorization.",
  );
const transport = new WorkerNearTransport(config);
const block = await transport.rpc.finalized();
assertTestedProtocol(block.protocolVersion);
if (!(await transport.rpc.view("get_repair_checkpoint", {}, block.hash)))
  throw new Error(
    "Install and review the pre-payment recovery checkpoint before starting the worker.",
  );
const queue = new Queue(
  config.database,
  `testnet:${config.contract}:${config.codeHash}`,
);
const unlock = workerLock(config.database);
for (const id of config.vendorIds) queue.register("vendor", id);
for (const id of config.orderIds) queue.register("order", id);
let stopped = false;
process.on("SIGINT", () => {
  stopped = true;
});
process.on("SIGTERM", () => {
  stopped = true;
});
try {
  const worker = new PaymentWorker(queue, transport);
  do {
    try {
      await worker.tick();
    } catch (e) {
      console.error(
        "Worker paused on error:",
        e instanceof Error ? e.message : "unknown error",
      );
    }
    if (process.argv.includes("--once")) break;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  } while (!stopped);
} finally {
  unlock();
  queue.close();
}
