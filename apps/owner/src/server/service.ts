import { liveConfig } from "./config.ts";
import { Queue } from "./queue.ts";
import { NearRpc } from "./chain.ts";
import { WalletAuth } from "./auth.ts";
import { identityService, type IdentityAuth } from "./identity.ts";
export class OrganizationIdentityAuth extends WalletAuth {
  readonly identities: IdentityAuth;
  constructor(queue: Queue, chain: NearRpc, identities = identityService()) {
    super(queue, chain);
    this.identities = identities;
  }
  override verify(token: string) {
    return this.identities.verify(token);
  }
}
let singleton: { queue: Queue; chain: NearRpc; auth: WalletAuth } | undefined;
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
  const chain = new NearRpc(config);
  try {
    const auth = new OrganizationIdentityAuth(queue, chain);
    for (const id of config.vendorIds) queue.register("vendor", id);
    for (const id of config.orderIds) queue.register("order", id);
    singleton = { queue, chain, auth };
  } catch (error) {
    queue.close();
    throw error;
  }
  return singleton;
}
