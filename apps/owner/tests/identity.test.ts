import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { KeyPair, KeyPairSigner } from "near-api-js";
import { IdentityAuth } from "../src/server/identity.ts";
import { OrganizationIdentityAuth } from "../src/server/service.ts";
import { Queue } from "../src/server/queue.ts";
import { NearRpc } from "../src/server/chain.ts";
import { liveConfig } from "../src/server/config.ts";

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nnetics-identity-"));
  const auth = new IdentityAuth({
    network: "testnet",
    rpc: "https://test.rpc.fastnear.com",
    origin: "http://127.0.0.1:3100",
    database: path.join(directory, "identities.db"),
  });
  const keys = new Map<string, ReturnType<typeof KeyPair.fromRandom>>();
  let permission: unknown = "FullAccess",
    network = "testnet";
  auth.rpc = async <T>(method: string, params: unknown) => {
    if (method === "status") return { chain_id: network } as T;
    if (method === "block") return { header: { hash: "final-block" } } as T;
    const p = params as {
      account_id: string;
      public_key: string;
      block_id: string;
    };
    assert.equal(p.block_id, "final-block");
    if (keys.get(p.account_id)?.getPublicKey().toString() !== p.public_key)
      throw Error("Account key missing on testnet");
    return { permission, block_hash: "final-block" } as T;
  };
  function signed(account = "new.testnet", browser = auth.browser("").cookie) {
    let key = keys.get(account);
    if (!key) {
      key = KeyPair.fromRandom("ed25519");
      keys.set(account, key);
    }
    const challenge = auth.challenge(account, browser);
    return {
      browser,
      challenge,
      input: async () => {
        const signature = await new KeyPairSigner(key!).signNep413Message(
          account,
          { ...challenge, nonce: Buffer.from(challenge.nonce, "base64") },
        );
        return {
          accountId: account,
          nonce: challenge.nonce,
          publicKey: key!.getPublicKey().toString(),
          signature: Buffer.from(signature.signature).toString("base64"),
        };
      },
    };
  }
  async function login(account = "new.testnet", browser?: string) {
    const request = signed(account, browser);
    return {
      ...request,
      token: await auth.login(await request.input(), request.browser),
    };
  }
  return {
    auth,
    keys,
    signed,
    login,
    setPermission: (value: unknown) => {
      permission = value;
    },
    setNetwork: (value: string) => {
      network = value;
    },
    close: () => {
      auth.db.close();
      fs.rmSync(directory, { recursive: true, force: true });
    },
    directory,
  };
}
test("unseen wallets authenticate without any org or vault and create only their own empty organization", async () => {
  const f = fixture();
  try {
    const a = await f.login("first.testnet"),
      b = await f.login("second.testnet");
    const first = await f.auth.authenticate(a.token),
      second = await f.auth.authenticate(b.token);
    assert.deepEqual(f.auth.organizations(first), []);
    assert.deepEqual(f.auth.organizations(second), []);
    const org = await f.auth.createOrganization(a.token, "First studio");
    assert.equal(org.role, "creator");
    assert.equal(org.status, "unprovisioned");
    assert.deepEqual(f.auth.organization(first, org.id).invoices, []);
    assert.deepEqual(f.auth.organization(first, org.id).contractors, []);
    assert.deepEqual(f.auth.organization(first, org.id).payments, []);
    assert.throws(() => f.auth.organization(second, org.id), /access denied/);
    const other = await f.auth.createOrganization(b.token, "Second studio");
    assert.deepEqual(
      f.auth.organizations(first).map((o) => o.id),
      [org.id],
    );
    assert.deepEqual(
      f.auth.organizations(second).map((o) => o.id),
      [other.id],
    );
    const returned = await f.login("first.testnet");
    assert.deepEqual(
      f.auth
        .organizations(await f.auth.authenticate(returned.token))
        .map((o) => o.id),
      [org.id],
    );
    assert.throws(() => f.auth.organization(first, other.id), /access denied/);
  } finally {
    f.close();
  }
});
test("identity rejects replay, expiry, wrong browser/origin/network and restricted or removed signing keys", async () => {
  const f = fixture();
  try {
    const request = f.signed(),
      input = await request.input();
    await assert.rejects(
      () => f.auth.login(input, f.auth.browser("").cookie),
      /Expired|mismatched/,
    );
    const token = await f.auth.login(input, request.browser);
    await assert.rejects(
      () => f.auth.login(input, request.browser),
      /Expired|replayed/,
    );
    const originRequest = f.signed("origin.testnet");
    const originInput = await originRequest.input();
    f.auth.config.origin = "http://other.example";
    await assert.rejects(
      () => f.auth.login(originInput, originRequest.browser),
      /Expired|mismatched/,
    );
    assert.throws(() => f.auth.verify(token), /verification required/);
    f.auth.config.origin = "http://127.0.0.1:3100";
    f.setPermission({ FunctionCall: {} });
    await assert.rejects(() => f.auth.authenticate(token), /restricted/);
    f.setPermission("FullAccess");
    assert.throws(() => f.auth.verify(token), /verification required/);
    const removed = await f.login("removed.testnet");
    const removedKey = f.keys.get("removed.testnet")!;
    f.keys.delete("removed.testnet");
    await assert.rejects(
      () => f.auth.authenticate(removed.token),
      /key missing/,
    );
    f.keys.set("removed.testnet", removedKey);
    assert.throws(() => f.auth.verify(removed.token), /verification required/);
    const session = await f.login("expired-session.testnet");
    f.auth.db.prepare("UPDATE identity_sessions SET expires=0").run();
    assert.throws(() => f.auth.verify(session.token), /verification required/);
    const expired = f.signed();
    f.auth.db
      .prepare("UPDATE identity_challenges SET expires=0 WHERE nonce=?")
      .run(expired.challenge.nonce);
    const expiredInput = await expired.input();
    await assert.rejects(
      () => f.auth.login(expiredInput, expired.browser),
      /Expired|replayed/,
    );
    const wrong = f.signed();
    const wrongInput = await wrong.input();
    wrongInput.signature = Buffer.alloc(64).toString("base64");
    await assert.rejects(
      () => f.auth.login(wrongInput, wrong.browser),
      /Invalid wallet signature/,
    );
    f.setNetwork("mainnet");
    const network = f.signed();
    const networkInput = await network.input();
    await assert.rejects(
      () => f.auth.login(networkInput, network.browser),
      /Wrong RPC network/,
    );
  } finally {
    f.close();
  }
});
test("starting a switch revokes the old session even if the new login fails; stale asynchronous proofs cannot revive it", async () => {
  const f = fixture();
  try {
    const a = await f.login("first.testnet"),
      pending = f.signed("second.testnet", a.browser);
    assert.throws(() => f.auth.verify(a.token), /verification required/);
    const input = await pending.input();
    const original = f.auth.keyBlock.bind(f.auth);
    let release!: () => void;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    f.auth.keyBlock = async (who) => {
      await original(who);
      await wait;
      return "final-block";
    };
    const old = f.auth.login(input, a.browser);
    f.auth.logout(a.browser);
    release();
    await assert.rejects(() => old, /superseded|replayed/);
    f.auth.keyBlock = original;
    const b = await f.login("second.testnet", a.browser);
    assert.equal(
      (await f.auth.authenticate(b.token)).account_id,
      "second.testnet",
    );
    assert.throws(() => f.auth.verify(a.token), /verification required/);
    f.auth.logout(a.browser);
    assert.throws(() => f.auth.verify(b.token), /verification required/);
  } finally {
    f.close();
  }
});
test("global wallet identity never bypasses the existing vault owner/viewer boundary or adopts a legacy org session", async () => {
  const f = fixture();
  const queue = new Queue(
    path.join(f.directory, "vault.db"),
    "testnet:vault:code",
  );
  const chain = new NearRpc({
    ...liveConfig(),
    organization: "studio",
    contract: "vault.owner.testnet" as ReturnType<
      typeof liveConfig
    >["contract"],
    worker: "worker.owner.testnet" as ReturnType<typeof liveConfig>["worker"],
  });
  let owner = "owner.testnet";
  chain.finalized = async () => ({
    hash: "final-block",
    timestamp: "1" as Awaited<ReturnType<NearRpc["finalized"]>>["timestamp"],
    protocolVersion: 88,
  });
  chain.rpc = f.auth.rpc.bind(f.auth);
  chain.view = async <T>() => ({ owner }) as T;
  const guard = new OrganizationIdentityAuth(queue, chain, f.auth);
  try {
    const a = await f.login(owner),
      b = await f.login("new.testnet");
    await assert.rejects(() => guard.authorize(b.token), /access denied/);
    assert.equal(
      (await guard.authorize(a.token, "owner")).access.role,
      "owner",
    );
    await guard.setViewer(a.token, "new.testnet", true);
    assert.equal((await guard.authorize(b.token)).access.role, "viewer");
    await assert.rejects(
      () => guard.authorize(b.token, "owner"),
      /access denied/,
    );
    owner = "changed.testnet";
    await assert.rejects(() => guard.authorize(a.token), /access denied/);
    await assert.rejects(() => guard.authorize(b.token), /access denied/);
    assert.equal(f.auth.verify(a.token).account_id, "owner.testnet");
    assert.throws(() => guard.verify("a".repeat(64)), /verification required/);
  } finally {
    queue.close();
    f.close();
  }
});
