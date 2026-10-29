import fs from "node:fs";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { baseEncode, PublicKey } from "near-api-js";
import { liveConfig } from "../src/server/config.ts";
import { account } from "../src/data/owner-adapter.ts";
type SetupAction = {
  type: string;
  deposit?: string;
  public_key?: string;
  receiver?: string;
  methods?: string[];
  allowance?: string;
  sha256?: string;
  method?: string;
  args?: Record<string, string>;
  gas?: string;
};
export interface DeploymentPlan {
  version: number;
  network: string;
  rpc: string;
  wasm_sha256: string;
  code_hash: string;
  wasm_bytes: number;
  review: Record<string, string>;
  steps: {
    name: string;
    signer: string;
    public_key: string;
    receiver: string;
    actions: SetupAction[];
  }[];
}
export function deploymentPlan(): DeploymentPlan {
  const c = liveConfig();
  if (!process.env.NNETICS_OWNER_ID)
    throw new Error(
      "Create an owner testnet wallet first; configure its account ID and public key.",
    );
  const vendor = account(process.env.NNETICS_VENDOR_ID || "");
  for (const id of [c.contract, c.worker, vendor]) {
    if (
      !id.endsWith("." + c.owner) ||
      id.split(".").length !== c.owner.split(".").length + 1
    )
      throw new Error("Setup creates direct subaccounts of the owner only.");
  }
  if (new Set([c.owner, c.contract, c.worker, vendor]).size !== 4)
    throw new Error("Use four distinct accounts.");
  const ownerKey = PublicKey.fromString(
    process.env.NNETICS_OWNER_PUBLIC_KEY || "",
  ).toString();
  const vaultKey = PublicKey.fromString(
    process.env.NNETICS_VAULT_PUBLIC_KEY || "",
  ).toString();
  const vendorKey = PublicKey.fromString(
    process.env.NNETICS_VENDOR_PUBLIC_KEY || "",
  ).toString();
  const workerKey = PublicKey.fromString(c.publicKey).toString();
  if (
    ![ownerKey, vaultKey, vendorKey, workerKey].every((k) =>
      k.startsWith("ed25519:"),
    ) ||
    new Set([ownerKey, vaultKey, workerKey]).size !== 3 ||
    workerKey === vendorKey
  )
    throw new Error("Use separate Ed25519 owner, vault and worker keys.");
  const wasm = fs.readFileSync(
    process.env.NNETICS_WASM_PATH || "../../artifacts/vault.wasm",
  );
  const hash = crypto.createHash("sha256").update(wasm).digest();
  if (
    hash.toString("hex") !==
    "1dd4f6971b13303661b29c6757a353c873368848490bdce2cd86a9cc360459f8"
  )
    throw new Error(
      "Use the exact production WASM retained by Linux run 40901797197. A changed artifact needs new validation/review.",
    );
  return {
    version: 1,
    network: "testnet",
    rpc: c.rpc,
    wasm_sha256: hash.toString("hex"),
    code_hash: baseEncode(hash),
    wasm_bytes: wasm.length,
    review: {
      independent_security_review: "incomplete",
      historical_bootstrap:
        "not configured; unknown transfer outcomes may remain blocked",
      rename: "fresh vault required",
      protocol:
        "contract runtime suites passed on protocols 86 and 88; future versions need new compatibility review",
      ai: "disabled until manual invoice acceptance passes",
    },
    steps: [
      {
        name: "create-vault",
        signer: c.owner,
        public_key: ownerKey,
        receiver: c.contract,
        actions: [
          { type: "CreateAccount" },
          { type: "Transfer", deposit: "6000000000000000000000000" },
          { type: "AddFullAccessKey", public_key: vaultKey },
        ],
      },
      {
        name: "create-worker",
        signer: c.owner,
        public_key: ownerKey,
        receiver: c.worker,
        actions: [
          { type: "CreateAccount" },
          { type: "Transfer", deposit: "1000000000000000000000000" },
          { type: "AddFullAccessKey", public_key: ownerKey },
          {
            type: "AddFunctionCallKey",
            public_key: workerKey,
            receiver: c.contract,
            methods: ["execute_payment"],
            allowance: "250000000000000000000000",
          },
        ],
      },
      {
        name: "create-vendor",
        signer: c.owner,
        public_key: ownerKey,
        receiver: vendor,
        actions: [
          { type: "CreateAccount" },
          { type: "Transfer", deposit: "100000000000000000000000" },
          { type: "AddFullAccessKey", public_key: vendorKey },
        ],
      },
      {
        name: "deploy-initialize",
        signer: c.contract,
        public_key: vaultKey,
        receiver: c.contract,
        actions: [
          { type: "DeployContract", sha256: hash.toString("hex") },
          {
            type: "FunctionCall",
            method: "new",
            args: {
              owner: c.owner,
              budget: "100000000000000000000000",
              payment_cap: "10000000000000000000000",
            },
            gas: "100000000000000",
            deposit: "0",
          },
        ],
      },
    ],
  };
}
export function planDigest(plan: ReturnType<typeof deploymentPlan>) {
  return crypto.createHash("sha256").update(JSON.stringify(plan)).digest("hex");
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const plan = deploymentPlan();
  console.log(
    JSON.stringify({ plan, approval_sha256: planDigest(plan) }, null, 2),
  );
}
