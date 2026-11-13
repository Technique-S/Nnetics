import {paymentExecutionEnabled} from './transaction-gates.ts';
import {assertFreshCheckpoint} from "./checkpoint-validity.ts";
import { liveConfig } from "./config.ts";
import { Queue, workerLock, boundedId } from "./queue.ts";
import { WorkerNearTransport } from "./signer.ts";
import { PaymentWorker } from "./worker.ts";
import { assertTestedProtocol } from "../data/protocol.ts";
const config = liveConfig();
if (!config.configured)
  throw new Error("Complete testnet configuration first.");
if (!paymentExecutionEnabled())
  throw new Error(
    "Worker disabled pending specific transaction authorization.",
  );
const jobIndex=process.argv.indexOf('--job');
if(jobIndex<0||!process.argv[jobIndex+1]||!process.argv.includes('--once'))throw Error('Bounded worker requires --once --job <existing approved invoice reference>. Ongoing execution is not enabled.');
const onlyJob=boundedId(process.argv[jobIndex+1]);
process.env.NNETICS_PAYMENT_JOB_ID=onlyJob;
const queue = new Queue(
  config.database,
  `testnet:${config.contract}:${config.codeHash}`,
);
queue.bindOrganization(config.organization);
if(!queue.get(onlyJob)||queue.all().some(j=>j.id!==onlyJob&&['preparing','submitted','pending'].includes(j.state))){queue.close();throw Error('Selected job missing or another transaction is unresolved. No worker started.');}
const unlock = workerLock(config.database);
const transport = new WorkerNearTransport(config,queue);
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
  const block = await transport.rpc.finalized();
  assertTestedProtocol(block.protocolVersion);
  assertFreshCheckpoint(await transport.rpc.view("get_repair_checkpoint", {}, block.hash), block.timestamp);
  const worker = new PaymentWorker(queue, transport, onlyJob);
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
    await new Promise((resolve) => { setTimeout(resolve, 5000); });
  } while (!stopped);
} finally {
  unlock();
  queue.close();
}
