import fs from "node:fs";
import crypto from "node:crypto";
import {
  actions,
  KeyPair,
  KeyPairSigner,
  PublicKey,
  createTransaction,
  baseDecode,
  baseEncode,
} from "near-api-js";
import { deploymentPlan, planDigest } from "./testnet-plan.ts";
import { NearRpc } from "../src/server/chain.ts";
import { liveConfig } from "../src/server/config.ts";
import { assertTestedProtocol } from "../src/data/protocol.ts";
// No automatic provisioning/deploy loop. Each invocation runs exactly one named
// step of the current digest-approved plan. Never retries with a new transaction.
const plan = deploymentPlan(),
  digest = planDigest(plan),
  step = plan.steps.find((s) => s.name === process.argv[2]);
if (!step || process.env.NNETICS_DEPLOYMENT_APPROVED_PLAN_SHA256 !== digest)
  throw new Error(
    "Review the complete plan, obtain explicit transaction authorization, then configure its exact SHA-256 and one step name.",
  );
const evidenceFile = `../../artifacts/live/setup-${step.name}.json`;
if (fs.existsSync(evidenceFile))
  throw new Error(
    "Setup outbox already exists. Investigate its recorded transaction; never sign a fresh retry.",
  );
const c = liveConfig(),
  rpc = new NearRpc(c);
const status = await rpc.rpc<{ chain_id: string; protocol_version: number }>(
  "status",
  [],
);
if (status.chain_id !== "testnet") throw new Error("Refusing non-testnet RPC.");
assertTestedProtocol(status.protocol_version);
const keyFile = process.env.NNETICS_SETUP_KEY_FILE;
if (!keyFile)
  throw new Error(
    "Use a protected local signer file; never paste owner secrets into chat.",
  );
const key = KeyPair.fromString(
  fs.readFileSync(keyFile, "utf8").trim() as Parameters<
    typeof KeyPair.fromString
  >[0],
);
if (key.getPublicKey().toString() !== step.public_key)
  throw new Error("Wrong setup signer key.");
const block = await rpc.rpc<{ header: { hash: string } }>("block", {
  finality: "final",
});
const access = await rpc.rpc<{ nonce: number; permission: unknown }>("query", {
  request_type: "view_access_key",
  account_id: step.signer,
  public_key: step.public_key,
  block_id: block.header.hash,
});
if (access.permission !== "FullAccess" || !Number.isSafeInteger(access.nonce))
  throw new Error(
    "Setup requires the correct full-access key and exact nonce.",
  );
const mapped = step.actions.map((a) => {
  switch (a.type) {
    case "CreateAccount":
      return actions.createAccount();
    case "Transfer":
      return actions.transfer(BigInt(a.deposit!));
    case "AddFullAccessKey":
      return actions.addFullAccessKey(PublicKey.fromString(a.public_key!));
    case "AddFunctionCallKey":
      return actions.addFunctionCallAccessKey(
        PublicKey.fromString(a.public_key!),
        a.receiver!,
        a.methods!,
        BigInt(a.allowance!),
      );
    case "DeployContract": {
      const wasm = fs.readFileSync(
        process.env.NNETICS_WASM_PATH || "../../artifacts/vault.wasm",
      );
      if (
        crypto.createHash("sha256").update(wasm).digest("hex") !==
        plan.wasm_sha256
      )
        throw new Error("WASM changed since approval.");
      return actions.deployContract(wasm);
    }
    case "FunctionCall":
      return actions.functionCall(
        a.method!,
        a.args!,
        BigInt(a.gas!),
        BigInt(a.deposit!),
      );
    default:
      throw new Error("Unknown setup action.");
  }
});
const tx = createTransaction(
  step.signer,
  key.getPublicKey(),
  step.receiver,
  BigInt(access.nonce) + 1n,
  mapped,
  baseDecode(block.header.hash),
);
const signed = await new KeyPairSigner(key).signTransaction(tx);
const hash = baseEncode(signed.txHash);
fs.mkdirSync("../../artifacts/live", { recursive: true });
// Exclusive durable outbox prevents signing/rebroadcasting a fresh setup transaction
// on repeated command invocation. Investigate status of the recorded hash first.
const fd = fs.openSync(evidenceFile, "wx", 0o600);
try {
  fs.writeFileSync(
    fd,
    JSON.stringify(
      {
        plan_digest: digest,
        step: step.name,
        hash,
        signer: step.signer,
        signed: Buffer.from(signed.signedTransaction.encode()).toString(
          "base64",
        ),
      },
      null,
      2,
    ),
  );
  fs.fsyncSync(fd);
} finally {
  fs.closeSync(fd);
}
console.log(
  `Persisted ${step.name}: ${hash}. Broadcasting this exact transaction once.`,
);
await rpc.rpc("send_tx", {
  signed_tx_base64: Buffer.from(signed.signedTransaction.encode()).toString(
    "base64",
  ),
  wait_until: "FINAL",
});
console.log(
  `Check finalized state and https://testnet.nearblocks.io/txns/${hash}`,
);
