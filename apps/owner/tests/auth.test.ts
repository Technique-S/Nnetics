import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { KeyPair, KeyPairSigner } from "near-api-js";
import { serializeNep413 } from "@near-wallet-selector/core";
import { OwnerAuth, nep413Digest } from "../src/server/auth.ts";
import { Queue } from "../src/server/queue.ts";
import { NearRpc } from "../src/server/chain.ts";
import { liveConfig } from "../src/server/config.ts";
test("NEP-413 bytes match official selector; owner session rejects replay, expired, wrong origin/key and limited keys", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nnetics-auth-"));
  const queue = new Queue(path.join(directory, "queue.db"));
  const chain = new NearRpc({
    ...liveConfig(),
    owner: "owner.testnet" as ReturnType<typeof liveConfig>["owner"],
  });
  let permission: unknown = "FullAccess";
  chain.finalized = async () => ({
    hash: "final-block",
    timestamp: "1" as Awaited<ReturnType<NearRpc["finalized"]>>["timestamp"],
    protocolVersion: 86,
  });
  chain.rpc = async <T>() => ({ permission }) as T;
  const auth = new OwnerAuth(queue, chain),
    c = auth.challenge();
  const params = { ...c, nonce: Buffer.from(c.nonce, "base64") };
  assert.deepEqual(
    nep413Digest(c.message, c.nonce, c.recipient),
    crypto.createHash("sha256").update(serializeNep413(params)).digest(),
  );
  const key = KeyPair.fromRandom("ed25519"),
    signer = new KeyPairSigner(key);
  const signature = await signer.signNep413Message("owner.testnet", params);
  const input = {
    nonce: c.nonce,
    accountId: "owner.testnet",
    publicKey: key.getPublicKey().toString(),
    signature: Buffer.from(signature.signature).toString("base64"),
  };
  await assert.rejects(() =>
    auth.login({ ...input, accountId: "impostor.testnet" }),
  );
  const wrong = auth.challenge();
  await assert.rejects(() => auth.login({ ...input, nonce: wrong.nonce }));
  permission = {
    FunctionCall: { receiver_id: "vault.testnet", method_names: [] },
  };
  await assert.rejects(() => auth.login(input), /full-access/);
  permission = "FullAccess";
  const token = await auth.login(input);
  auth.verify(token);
  await assert.rejects(() => auth.login(input), /replayed/);
  auth.logout(token);
  assert.throws(() => auth.verify(token));
  const expired = auth.challenge();
  queue.db
    .prepare("UPDATE challenges SET expires=0 WHERE nonce=?")
    .run(expired.nonce);
  await assert.rejects(() => auth.login({ ...input, nonce: expired.nonce }));
  assert.throws(() => nep413Digest(c.message, "bad", c.recipient));
  queue.close();
  fs.rmSync(directory, { recursive: true });
});
