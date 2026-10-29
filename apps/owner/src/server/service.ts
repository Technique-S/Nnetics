import { liveConfig } from "./config.ts";
import { Queue } from "./queue.ts";
import { NearRpc } from "./chain.ts";
import { OwnerAuth } from "./auth.ts";
let singleton: { queue: Queue; chain: NearRpc; auth: OwnerAuth } | undefined;
export function service() {
  if (singleton) return singleton;
  const config = liveConfig();
  if (!config.configured)
    throw new Error(
      "Testnet is not configured. Set account IDs, reviewed code hash and worker public key; use demo mode meanwhile.",
    );
  const queue = new Queue(
    config.database,
    `testnet:${config.contract}:${config.codeHash}`,
  );
  for (const id of config.vendorIds) queue.register("vendor", id);
  for (const id of config.orderIds) queue.register("order", id);
  const chain = new NearRpc(config);
  singleton = { queue, chain, auth: new OwnerAuth(queue, chain) };
  return singleton;
}
