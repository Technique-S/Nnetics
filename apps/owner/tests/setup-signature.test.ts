import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  actions,
  KeyPair,
  KeyPairSigner,
  createTransaction,
  baseEncode,
  SignedTransaction,
} from "near-api-js";
import { verifySetupSignature } from "../scripts/setup-signature.ts";

test("setup key-control proof verifies exact approved transaction bytes and Ed25519 signature before broadcast", async () => {
  const key = KeyPair.fromRandom("ed25519"),
    signer = new KeyPairSigner(key);
  const expected = createTransaction(
    "owner.testnet",
    key.getPublicKey(),
    "vault.owner.testnet",
    7n,
    [actions.createAccount(), actions.transfer(6n * 10n ** 24n)],
    new Uint8Array(32).fill(1),
  );
  const signed = (await signer.signTransaction(expected)).signedTransaction;
  const encoded = Buffer.from(signed.encode()).toString("base64");
  assert.deepEqual(verifySetupSignature(expected, encoded), {
    signed: encoded,
    hash: baseEncode(
      crypto.createHash("sha256").update(expected.encode()).digest(),
    ),
  });
  const corrupted = SignedTransaction.decode(signed.encode());
  corrupted.signature.ed25519Signature!.data[0] ^= 1;
  assert.throws(
    () =>
      verifySetupSignature(
        expected,
        Buffer.from(corrupted.encode()).toString("base64"),
      ),
    /Invalid approved-owner/,
  );
  assert.throws(
    () => verifySetupSignature(expected, encoded + "\n"),
    /Noncanonical/,
  );
  assert.throws(() =>
    verifySetupSignature(
      expected,
      Buffer.concat([Buffer.from(signed.encode()), Buffer.from([0])]).toString(
        "base64",
      ),
    ),
  );
  for (const changed of [
    createTransaction(
      "owner.testnet",
      key.getPublicKey(),
      "attacker.testnet",
      7n,
      expected.actions,
      expected.blockHash,
    ),
    createTransaction(
      "owner.testnet",
      key.getPublicKey(),
      "vault.owner.testnet",
      8n,
      expected.actions,
      expected.blockHash,
    ),
    createTransaction(
      "owner.testnet",
      key.getPublicKey(),
      "vault.owner.testnet",
      7n,
      [actions.transfer(7n * 10n ** 24n)],
      expected.blockHash,
    ),
    createTransaction(
      "owner.testnet",
      key.getPublicKey(),
      "vault.owner.testnet",
      7n,
      expected.actions,
      new Uint8Array(32).fill(2),
    ),
  ]) {
    const altered = (await signer.signTransaction(changed)).signedTransaction;
    assert.throws(
      () =>
        verifySetupSignature(
          expected,
          Buffer.from(altered.encode()).toString("base64"),
        ),
      /changed the approved/,
    );
  }
});
