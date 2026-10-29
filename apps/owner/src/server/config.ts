import path from "node:path";
import { account } from "../data/owner-adapter.ts";

export function liveConfig() {
  const contract = account(
    process.env.NNETICS_VAULT_ID || "unconfigured.testnet",
  );
  const owner = account(
    process.env.NNETICS_OWNER_ID || "unconfigured-owner.testnet",
  );
  const worker = account(
    process.env.NNETICS_WORKER_ID || "unconfigured-worker.testnet",
  );
  for (const id of [contract, worker])
    if (!id.endsWith(".testnet"))
      throw new Error("Only named testnet accounts are supported.");
  if (!owner.endsWith(".testnet") && !/^[0-9a-f]{64}$/.test(owner))
    throw new Error(
      "Owner must be a named testnet account or an implicit Ed25519 account. Mainnet is disabled.",
    );
  if (new Set([contract, owner, worker]).size !== 3)
    throw new Error("Separate owner, vault and worker required.");
  const rpc = process.env.NNETICS_RPC_URL || "https://test.rpc.fastnear.com";
  if (new URL(rpc).protocol !== "https:")
    throw new Error("Use an HTTPS testnet RPC.");
  const origin = process.env.NNETICS_APP_ORIGIN || "http://127.0.0.1:3100";
  if (new URL(origin).origin !== origin)
    throw new Error("Configure an exact app origin.");
  const codeHash = process.env.NNETICS_EXPECTED_CODE_HASH || "";
  const publicKey = process.env.NNETICS_WORKER_PUBLIC_KEY || "";
  const configured = Boolean(
    process.env.NNETICS_VAULT_ID &&
      process.env.NNETICS_OWNER_ID &&
      process.env.NNETICS_WORKER_ID &&
      codeHash &&
      publicKey,
  );
  return {
    contract,
    owner,
    worker,
    rpc,
    origin,
    codeHash,
    publicKey,
    configured,
    database: path.resolve(
      /* turbopackIgnore: true */ process.env.NNETICS_DATABASE ||
        "../../artifacts/live/invoices.db",
    ),
    vendorIds: (process.env.NNETICS_VENDOR_IDS || "")
      .split(",")
      .filter(Boolean),
    orderIds: (process.env.NNETICS_ORDER_IDS || "").split(",").filter(Boolean),
  };
}
export type LiveConfig = ReturnType<typeof liveConfig>;
