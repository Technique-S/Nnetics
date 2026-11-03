import { test } from "node:test";
import assert from "node:assert/strict";
import {
  signMeteorMessage,
  testnetWalletAccount,
  requestMeteorVaultCreation,
} from "../src/data/meteor-message.ts";
import type { MeteorExtension } from "../src/data/meteor-message.ts";

function fixture() {
  let listener: (value: unknown) => void = () => {};
  let registrations = 0;
  const sent: Record<string, unknown>[] = [];
  const extension: MeteorExtension = {
    addMessageDataListener(fn) {
      listener = fn;
      registrations++;
    },
    sendMessageData(data) {
      sent.push(data as Record<string, unknown>);
    },
  };
  const input = {
    accountId: "owner.testnet",
    message: "Bound login challenge",
    recipient: "localhost:3100",
    nonce: new Uint8Array(32).fill(17),
  };
  const signature = {
    accountId: input.accountId,
    publicKey: `ed25519:${"1".repeat(32)}`,
    signature: `${"A".repeat(86)}==`,
  };
  const respond = (data: object) =>
    listener({ uid: sent.at(-1)!.uid, ...data });
  return {
    extension,
    input,
    signature,
    sent,
    respond,
    listener: () => listener,
    registrations: () => registrations,
  };
}

test("Meteor provisioning requests one prepared transaction, correlates replies and treats cancellation as unknown", async () => {
  const f = fixture();
  const unsigned = Buffer.from("controlled unsigned transaction").toString(
    "base64",
  );
  const request = requestMeteorVaultCreation(f.extension, unsigned);
  assert.equal(f.sent[0].actionType, "sign");
  assert.equal(f.sent[0].network, "testnet");
  assert.deepEqual(f.sent[0].inputs, { transactions: unsigned });
  f.listener()({ uid: "stale-proof", status: "closed_success" });
  f.respond({ status: "closed_fail" });
  await assert.rejects(request, /unknown/);
  const retry = requestMeteorVaultCreation(f.extension, unsigned);
  f.respond({
    status: "closed_success",
    payload: { executionOutcomes: [{ untrusted: true }] },
  });
  await retry;
});

test("Meteor extension sends only testnet NEP-413 messages, correlates responses and acknowledges completion", async () => {
  const f = fixture();
  const request = signMeteorMessage(f.extension, f.input);
  const first = f.sent[0];
  assert.equal(first.network, "testnet");
  assert.equal(first.actionType, "sign_message");
  assert.equal(first.status, "initializing");
  assert.deepEqual(
    (first.inputs as { nonce: unknown }).nonce,
    Object.fromEntries(Array.from({ length: 32 }, (_, i) => [i, 17])),
  );
  assert.equal("public_key" in (first.inputs as object), false);
  // A stale/unrelated response cannot complete this request.
  f.listener()({
    uid: "old-request",
    status: "closed_success",
    payload: f.signature,
  });
  f.respond({ status: "connected" });
  f.respond({ status: "closed_success", payload: f.signature });
  assert.deepEqual(await request, f.signature);
  assert.equal(f.sent.at(-1)!.status, "closed_success");
  assert.equal("inputs" in f.sent.at(-1)!, false);
  // Replay after completion has no effect. Reuse one dispatcher, new request ID.
  f.respond({ status: "closed_success", payload: f.signature });
  const next = signMeteorMessage(f.extension, f.input);
  assert.notEqual(f.sent.at(-1)!.uid, first.uid);
  f.respond({ status: "closed_success", payload: f.signature });
  await next;
  assert.equal(f.registrations(), 1);
  assert.ok(
    f.sent.every(
      (data) =>
        data.actionType === "sign_message" && data.network === "testnet",
    ),
  );
});

test("Meteor rejects wrong network, action, account and malformed results without granting a session", async () => {
  for (const response of [
    { network: "mainnet" },
    { actionType: "login" },
    { payload: { accountId: "different.testnet" } },
    { payload: { publicKey: "invalid" } },
    { payload: { signature: "invalid" } },
    { payload: null },
  ]) {
    const f = fixture();
    const request = signMeteorMessage(f.extension, f.input);
    f.respond({ status: "closed_success", payload: f.signature, ...response });
    await assert.rejects(request, /different network|invalid or different/);
    assert.equal(f.sent.at(-1)!.status, "disconnected");
  }
});

test("Meteor declines, timeout and extension failure terminate; concurrent requests cannot replace the challenge", async () => {
  for (const status of ["closed_fail", "closed_window", "disconnected"]) {
    const f = fixture();
    const request = signMeteorMessage(f.extension, f.input);
    assert.throws(
      () => signMeteorMessage(f.extension, f.input),
      /already pending/,
    );
    f.respond({ status });
    await assert.rejects(request, /declined or disconnected/);
    const retry = signMeteorMessage(f.extension, f.input);
    f.respond({ status: "closed_success", payload: f.signature });
    await retry;
  }
  const f = fixture();
  await assert.rejects(signMeteorMessage(f.extension, f.input, 5), /timed out/);
  const retry = signMeteorMessage(f.extension, f.input);
  f.respond({ status: "closed_success", payload: f.signature });
  await retry;
  f.extension.sendMessageData = () => {
    throw new Error("extension disappeared");
  };
  await assert.rejects(signMeteorMessage(f.extension, f.input), /unavailable/);
});

test("account switching aborts a pending Meteor proof and ignores its late signature", async () => {
  const f = fixture(),
    controller = new AbortController();
  const first = signMeteorMessage(
    f.extension,
    f.input,
    120000,
    controller.signal,
  );
  const oldUid = f.sent[0].uid;
  controller.abort();
  await assert.rejects(first, /account changed/);
  const second = signMeteorMessage(f.extension, f.input);
  f.listener()({ uid: oldUid, status: "closed_success", payload: f.signature });
  f.respond({ status: "closed_success", payload: f.signature });
  assert.deepEqual(await second, f.signature);
});

test("Meteor refuses mainnet IDs and invalid nonces before opening the extension", () => {
  const f = fixture();
  for (const value of [
    "owner.near",
    "testnet",
    "Owner.testnet",
    "owner..testnet",
    "-owner.testnet",
    "a".repeat(65),
  ])
    assert.throws(() => testnetWalletAccount(value), /testnet account/);
  for (const value of ["owner.testnet", "vault.owner.testnet", "a".repeat(64)])
    assert.equal(testnetWalletAccount(value), value);
  assert.throws(
    () =>
      signMeteorMessage(f.extension, { ...f.input, nonce: new Uint8Array(31) }),
    /Invalid wallet/,
  );
  assert.equal(f.sent.length, 0);
});

test('foreground wallet discovery omits the old account and accepts only a valid selected testnet identity',async()=>{
 const f=fixture(),{accountId:_,...input}=f.input;
 const request=signMeteorMessage(f.extension,input,1000);
 assert.equal('accountId' in (f.sent[0].inputs as object),false);
 f.respond({status:'closed_success',payload:{...f.signature,accountId:'different.testnet'}});
 assert.equal((await request).accountId,'different.testnet');
 const bad=signMeteorMessage(f.extension,input,1000);f.respond({status:'closed_success',payload:{...f.signature,accountId:'owner.near'}});await assert.rejects(()=>bad,/mainnet|unsupported/);
});
