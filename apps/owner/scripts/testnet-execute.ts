import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { execFileSync } from "node:child_process";
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
import { verifySetupSignature } from "./setup-signature.ts";
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
const preparationFile = `../../artifacts/live/setup-${step.name}.preparing.json`;
const cliSignedFile = path.resolve(
  `../../artifacts/live/setup-${step.name}.cli-signed.json`,
);
if (
  [evidenceFile, preparationFile, cliSignedFile].some((file) =>
    fs.existsSync(file),
  )
)
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
const keychainCli = process.env.NNETICS_SETUP_KEYCHAIN_CLI;
if (Boolean(keyFile) === Boolean(keychainCli))
  throw new Error(
    "Select exactly one protected signer: SETUP_KEY_FILE or SETUP_KEYCHAIN_CLI. Never paste secrets into chat.",
  );
if (
  keychainCli &&
  execFileSync(keychainCli, ["--version"], {
    encoding: "utf8",
    timeout: 10000,
  }).trim() !== "near-cli-rs 0.30.1"
)
  throw new Error("Review a changed keychain CLI version before signing.");
const block = await rpc.rpc<{ header: { hash: string; height: number } }>(
  "block",
  {
    finality: "final",
  },
);
const access = await rpc.rpc<{
  nonce: number;
  permission: unknown;
  block_hash: string;
}>("query", {
  request_type: "view_access_key",
  account_id: step.signer,
  public_key: step.public_key,
  block_id: block.header.hash,
});
if (
  access.permission !== "FullAccess" ||
  !Number.isSafeInteger(access.nonce) ||
  access.block_hash !== block.header.hash
)
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
  PublicKey.fromString(step.public_key),
  step.receiver,
  BigInt(access.nonce) + 1n,
  mapped,
  baseDecode(block.header.hash),
);
fs.mkdirSync("../../artifacts/live", { recursive: true });
// Claim the step before asking any signer. A crash or concurrent process must
// leave a blocked preparing record rather than silently generating another tx.
const preparation = fs.openSync(preparationFile, "wx", 0o600);
try {
  fs.writeFileSync(
    preparation,
    JSON.stringify(
      {
        plan_digest: digest,
        step: step.name,
        signer: step.signer,
        unsigned: Buffer.from(tx.encode()).toString("base64"),
        hash: baseEncode(
          crypto.createHash("sha256").update(tx.encode()).digest(),
        ),
        status: "preparing_do_not_retry",
      },
      null,
      2,
    ),
  );
  fs.fsyncSync(preparation);
} finally {
  fs.closeSync(preparation);
}
let encoded: string;
if (keychainCli) {
  // CLI save-to-file signs offline through the Windows keychain. No secret is
  // exported or passed through command arguments, and the CLI never broadcasts.
  execFileSync(
    keychainCli,
    [
      "--offline",
      "transaction",
      "sign-transaction",
      Buffer.from(tx.encode()).toString("base64"),
      "network-config",
      "testnet",
      "sign-with-keychain",
      "--signer-public-key",
      step.public_key,
      "--nonce",
      String(BigInt(access.nonce) + 1n),
      "--block-hash",
      block.header.hash,
      "--block-height",
      String(block.header.height),
      "save-to-file",
      cliSignedFile,
    ],
    { stdio: "pipe", timeout: 30000 },
  );
  const output = JSON.parse(fs.readFileSync(cliSignedFile, "utf8"));
  if (typeof output.signed_transaction_as_base64 !== "string")
    throw new Error(
      "Unexpected signed-transaction file; inspect before any retry.",
    );
  encoded = output.signed_transaction_as_base64;
} else {
  const key = KeyPair.fromString(
    fs.readFileSync(keyFile!, "utf8").trim() as Parameters<
      typeof KeyPair.fromString
    >[0],
  );
  if (key.getPublicKey().toString() !== step.public_key)
    throw new Error("Wrong setup signer key.");
  const signed = await new KeyPairSigner(key).signTransaction(tx);
  encoded = Buffer.from(signed.signedTransaction.encode()).toString("base64");
}
const verified = verifySetupSignature(tx, encoded);
const hash = verified.hash;
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
        signed: verified.signed,
        signer_control_verified: true,
        signer_public_key: step.public_key,
        finalized_key_block: block.header.hash,
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
const result = await rpc.rpc<{
  final_execution_status: string;
  transaction: { hash: string; signer_id: string; receiver_id: string };
  status: Record<string, unknown>;
}>("send_tx", {
  signed_tx_base64: verified.signed,
  wait_until: "FINAL",
});
fs.writeFileSync(
  `../../artifacts/live/setup-${step.name}.result.json`,
  JSON.stringify(result, null, 2),
  { flag: "wx" },
);
if (
  result.final_execution_status !== "FINAL" ||
  result.transaction.hash !== hash ||
  result.transaction.signer_id !== step.signer ||
  result.transaction.receiver_id !== step.receiver ||
  !("SuccessValue" in result.status)
)
  throw new Error(
    "Setup transaction is not a verified FINAL success. Reconcile the recorded hash before continuing.",
  );
console.log(
  `Check finalized state and https://testnet.nearblocks.io/txns/${hash}`,
);
