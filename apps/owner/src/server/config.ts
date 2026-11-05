import path from "node:path";
import { account } from "../data/owner-adapter.ts";

export function liveConfig() {
  const contract = account(
    process.env.NNETICS_VAULT_ID || "unconfigured.testnet",
  );
  const organization = process.env.NNETICS_ORGANIZATION_ID || "unconfigured";
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(organization))
    throw new Error(
      "Configure an organization ID (1–64 ASCII letters, digits, _ or -).",
    );
  const network = process.env.NNETICS_NETWORK || "testnet";
  if (network !== "testnet") throw new Error("Only NEAR testnet is enabled.");
  const worker = account(
    process.env.NNETICS_WORKER_ID || "unconfigured-worker.testnet",
  );
  for (const id of [contract, worker])
    if (!id.endsWith(".testnet"))
      throw new Error("Only named testnet accounts are supported.");
  if (contract === worker)
    throw new Error("Separate vault and worker required.");
  const rpc = process.env.NNETICS_RPC_URL || "https://rpc.testnet.fastnear.com";
  if (new URL(rpc).protocol !== "https:")
    throw new Error("Use an HTTPS testnet RPC.");
  const origin = process.env.NNETICS_APP_ORIGIN || "http://127.0.0.1:3100";
  if (new URL(origin).origin !== origin)
    throw new Error("Configure an exact app origin.");
  const codeHash = process.env.NNETICS_EXPECTED_CODE_HASH || "";
  const publicKey = process.env.NNETICS_WORKER_PUBLIC_KEY || "";
  const missingConfiguration = [
    "NNETICS_ORGANIZATION_ID",
    "NNETICS_VAULT_ID",
    "NNETICS_WORKER_ID",
    "NNETICS_EXPECTED_CODE_HASH",
    "NNETICS_WORKER_PUBLIC_KEY",
  ].filter((name) => !process.env[name]);
  const configured = missingConfiguration.length === 0;
  return {
    contract,
    organization,
    network: network as "testnet",
    worker,
    rpc,
    origin,
    codeHash,
    publicKey,
    configured,
    missingConfiguration,
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
