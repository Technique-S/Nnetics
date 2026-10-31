import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { baseEncode, PublicKey } from "near-api-js";
import { testnetWalletAccount } from "../src/data/meteor-message.ts";

export function factoryDeploymentPlan(input: {
  funder: string;
  publicKey: string;
  factory: string;
  storageByteCost: string;
  factoryWasm: Uint8Array;
  vaultWasm: Uint8Array;
}) {
  testnetWalletAccount(input.funder);
  testnetWalletAccount(input.factory);
  if (
    !input.funder.endsWith(".testnet") ||
    input.factory.length > 21 ||
    !input.factory.endsWith("." + input.funder) ||
    input.factory.split(".").length !== input.funder.split(".").length + 1
  )
    throw Error(
      "The infrastructure factory must be a direct subaccount of the selected named testnet funder, at most 21 characters long.",
    );
  if (
    !/^\d+$/.test(input.storageByteCost) ||
    BigInt(input.storageByteCost) <= 0n
  )
    throw Error("Supply finalized protocol storage_amount_per_byte.");
  const publicKey = PublicKey.fromString(input.publicKey).toString();
  if (!publicKey.startsWith("ed25519:"))
    throw Error("Use the funder's existing FullAccess Ed25519 key.");
  const hash = (bytes: Uint8Array) =>
    crypto.createHash("sha256").update(bytes).digest();
  const factoryHash = hash(input.factoryWasm),
    vaultHash = hash(input.vaultWasm);
  const funding = (
    BigInt(input.factoryWasm.length + 4096) * BigInt(input.storageByteCost) +
    5n * 10n ** 23n
  ).toString();
  const plan = {
    version: 1,
    network: "testnet",
    signer: input.funder,
    publicKey,
    receiver: input.factory,
    actions: [
      { type: "CreateAccount" },
      { type: "Transfer", deposit: funding },
      {
        type: "DeployContract",
        sha256: factoryHash.toString("hex"),
        bytes: input.factoryWasm.length,
      },
    ],
    expected_factory_code_hash: baseEncode(factoryHash),
    expected_vault_code_hash: baseEncode(vaultHash),
    vault_sha256: vaultHash.toString("hex"),
    vault_bytes: input.vaultWasm.length,
    access_keys:
      "none; factory and new vaults are locked, without upgrade keys",
    initializer: "none; factory is stateless and cannot be claimed",
    storage_amount_per_byte: input.storageByteCost,
    funding_rule:
      "code bytes + 4096 bytes overhead at protocol storage price, plus 0.5 NEAR operating reserve; gas additional",
    customer_vault_funding: "5000000000000000000000000",
    customer_method: "create_vault",
    customer_gas: "250000000000000",
    customer_initial_state: {
      paused: true,
      owner: "original verified wallet signer",
      agent: null,
      budget: "0",
      payment_cap: "10000000000000000000000",
      funded: "0",
    },
    review: {
      linux_verification: "required for these exact artifacts",
      independent_review: "incomplete",
      bootstrap: "unresolved; payments disabled",
      irreversible:
        "Locked contract storage/operating funding has no admin withdrawal or upgrade path",
    },
  };
  const digest = crypto
    .createHash("sha256")
    .update(JSON.stringify(plan))
    .digest("hex");
  return { plan, digest };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const required = (key: string) => {
    const value = process.env[key];
    if (!value)
      throw Error(`Missing ${key}; no transaction was signed or sent.`);
    return value;
  };
  const factoryWasm = fs.readFileSync(
    required("NNETICS_REVIEWED_FACTORY_WASM"),
  );
  const vaultWasm = fs.readFileSync(
    required("NNETICS_REVIEWED_PROVISIONING_VAULT_WASM"),
  );
  for (const [bytes, key] of [
    [factoryWasm, "NNETICS_REVIEWED_FACTORY_SHA256"],
    [vaultWasm, "NNETICS_REVIEWED_PROVISIONING_VAULT_SHA256"],
  ] as const)
    if (
      crypto.createHash("sha256").update(bytes).digest("hex") !== required(key)
    )
      throw Error("Reviewed artifact SHA-256 mismatch.");
  const result = factoryDeploymentPlan({
    funder: required("NNETICS_FACTORY_FUNDER_ID"),
    publicKey: required("NNETICS_FACTORY_FUNDER_PUBLIC_KEY"),
    factory: required("NNETICS_FACTORY_ID"),
    storageByteCost: required("NNETICS_FINALIZED_STORAGE_BYTE_COST"),
    factoryWasm,
    vaultWasm,
  });
  console.log(JSON.stringify(result, null, 2));
  console.log(
    "UNSIGNED PLAN ONLY. Obtain approval for this exact digest after Linux validation and a fresh testnet preflight. No execution command is provided.",
  );
}
