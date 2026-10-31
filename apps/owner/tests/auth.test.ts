import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { KeyPair, KeyPairSigner } from "near-api-js";
import { serializeNep413 } from "@near-wallet-selector/core";
import { WalletAuth, nep413Digest } from "../src/server/auth.ts";
import { Queue, structuredInvoice } from "../src/server/queue.ts";
import { NearRpc } from "../src/server/chain.ts";
import { liveConfig } from "../src/server/config.ts";
import {
  organizationMutation,
  organizationSnapshot,
} from "../src/server/organization-api.ts";
import { MockOwnerAdapter } from "../src/data/mock-adapter.ts";

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "nnetics-auth-"));
  const queue = new Queue(
    path.join(directory, "queue.db"),
    "testnet:vault:code",
  );
  const chain = new NearRpc({
    ...liveConfig(),
    organization: "studio",
    codeHash: "reviewed",
  });
  let owner = "owner.testnet";
  let permission: unknown = "FullAccess";
  let keyBlock = "final-block";
  const keys = new Map<string, string>();
  chain.finalized = async () => ({
    hash: "final-block",
    timestamp: "1" as Awaited<ReturnType<NearRpc["finalized"]>>["timestamp"],
    protocolVersion: 88,
  });
  chain.rpc = async <T>(method: string, params: unknown) => {
    const p = params as {
      account_id: string;
      public_key: string;
      block_id: string;
    };
    assert.equal(method, "query");
    assert.equal(p.block_id, "final-block");
    if (keys.get(p.account_id) !== p.public_key)
      throw new Error("Unknown account key");
    return { permission, block_hash: keyBlock } as T;
  };
  chain.view = async <T>(method: string, _args: object, block: string) => {
    assert.equal(method, "get_vault");
    assert.equal(block, "final-block");
    return { owner } as T;
  };
  const auth = new WalletAuth(queue, chain);
  async function signed(accountId = "owner.testnet") {
    const key = KeyPair.fromRandom("ed25519");
    keys.set(accountId, key.getPublicKey().toString());
    const challenge = auth.challenge(accountId, "studio");
    const params = {
      ...challenge,
      nonce: Buffer.from(challenge.nonce, "base64"),
    };
    const result = await new KeyPairSigner(key).signNep413Message(
      accountId,
      params,
    );
    return {
      challenge,
      params,
      input: {
        nonce: challenge.nonce,
        accountId,
        publicKey: key.getPublicKey().toString(),
        signature: Buffer.from(result.signature).toString("base64"),
        organization: "studio",
      },
    };
  }
  return {
    queue,
    chain,
    auth,
    keys,
    signed,
    owner: (value: string) => {
      owner = value;
    },
    permission: (value: unknown) => {
      permission = value;
    },
    keyBlock: (value: string) => {
      keyBlock = value;
    },
    close: () => {
      queue.close();
      fs.rmSync(directory, { recursive: true });
    },
  };
}

test("NEP-413 login binds account, origin, organization and nonce; rejects tampering, replay and expiry", async () => {
  const f = fixture();
  try {
    const { challenge: c, params, input } = await f.signed();
    assert.deepEqual(
      nep413Digest(c.message, c.nonce, c.recipient),
      crypto.createHash("sha256").update(serializeNep413(params)).digest(),
    );
    await assert.rejects(() =>
      f.auth.login({ ...input, accountId: "impostor.testnet" }),
    );
    await assert.rejects(() =>
      f.auth.login({ ...input, organization: "another-org" }),
    );
    await assert.rejects(() =>
      f.auth.login({
        ...input,
        signature: input.signature.replace(
          /^./,
          input.signature[0] === "A" ? "B" : "A",
        ),
      }),
    );
    const wrong = f.auth.challenge("owner.testnet", "studio");
    await assert.rejects(() => f.auth.login({ ...input, nonce: wrong.nonce }));
    f.chain.config.origin = "https://other.example";
    await assert.rejects(() => f.auth.login(input));
    f.chain.config.origin = c.recipient;
    f.permission({
      FunctionCall: { receiver_id: "vault.testnet", method_names: [] },
    });
    await assert.rejects(() => f.auth.login(input), /full-access/);
    f.permission("FullAccess");
    const results = await Promise.allSettled([
      f.auth.login(input),
      f.auth.login(input),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    await assert.rejects(() => f.auth.login(input), /replayed/);
    const token = (
      results.find(
        (r) => r.status === "fulfilled",
      ) as PromiseFulfilledResult<string>
    ).value;
    assert.equal(f.auth.verify(token).account_id, "owner.testnet");
    f.auth.logout(token);
    assert.throws(() => f.auth.verify(token));
    const expired = await f.signed();
    f.queue.db
      .prepare("UPDATE wallet_challenges SET expires=0 WHERE nonce=?")
      .run(expired.input.nonce);
    await assert.rejects(() => f.auth.login(expired.input));
    assert.throws(() => nep413Digest(c.message, "bad", c.recipient));
    assert.throws(() => f.auth.challenge("owner.near", "studio"));
    assert.throws(() => f.auth.challenge("owner.testnet", "other"));
  } finally {
    f.close();
  }
});

test("verified login alone grants no organization or vault ownership; arbitrary wallets cannot self-enroll", async () => {
  const f = fixture();
  try {
    const stranger = await f.auth.login(
      (await f.signed("stranger.testnet")).input,
    );
    assert.equal(f.auth.verify(stranger).account_id, "stranger.testnet");
    await assert.rejects(() => f.auth.authorize(stranger), /access denied/);
    await assert.rejects(
      () => f.auth.setViewer(stranger, "stranger.testnet", true),
      /access denied/,
    );
    const owner = await f.auth.login((await f.signed()).input);
    assert.equal((await f.auth.authorize(owner, "owner")).access.role, "owner");
    f.owner("stranger.testnet");
    await assert.rejects(
      () => f.auth.authorize(owner, "owner"),
      /access denied/,
    );
    assert.equal(
      (await f.auth.authorize(stranger, "owner")).access.role,
      "owner",
    );
  } finally {
    f.close();
  }
});

test("owner-issued viewer membership is scoped, read-only, immediately revocable and invalid after owner changes", async () => {
  const f = fixture();
  try {
    const owner = await f.auth.login((await f.signed()).input);
    const viewer = await f.auth.login((await f.signed("viewer.testnet")).input);
    await f.auth.setViewer(owner, "viewer.testnet", true);
    assert.equal((await f.auth.authorize(viewer)).access.role, "viewer");
    await assert.rejects(
      () => f.auth.authorize(viewer, "owner"),
      /access denied/,
    );
    await assert.rejects(
      () => f.auth.setViewer(viewer, "third.testnet", true),
      /access denied/,
    );
    await f.auth.setViewer(owner, "viewer.testnet", false);
    await assert.rejects(() => f.auth.authorize(viewer), /access denied/);
    await f.auth.setViewer(owner, "viewer.testnet", true);
    f.owner("replacement.testnet");
    await assert.rejects(() => f.auth.authorize(viewer), /access denied/);
    await assert.rejects(() => f.auth.authorize(owner), /access denied/);
  } finally {
    f.close();
  }
});

test("protected access rechecks finalized key ownership, permission, expiry, RPC availability and context", async () => {
  const f = fixture();
  try {
    const token = await f.auth.login((await f.signed()).input);
    f.permission({ FunctionCall: {} });
    await assert.rejects(() => f.auth.authorize(token), /full-access/);
    f.permission("FullAccess");
    f.keyBlock("other-block");
    await assert.rejects(() => f.auth.authorize(token), /finalized block/);
    f.keyBlock("final-block");
    const publicKey = f.keys.get("owner.testnet")!;
    f.keys.delete("owner.testnet");
    await assert.rejects(() => f.auth.authorize(token), /Unknown account key/);
    f.keys.set("owner.testnet", publicKey);
    for (const field of [
      "organization",
      "origin",
      "codeHash",
      "contract",
    ] as const) {
      const before = f.chain.config[field];
      Object.assign(f.chain.config, { [field]: "other" });
      assert.throws(() => f.auth.verify(token), /Authenticate/);
      Object.assign(f.chain.config, { [field]: before });
    }
    const original = f.chain.finalized;
    f.chain.finalized = async () => {
      throw new Error("RPC unavailable");
    };
    await assert.rejects(() => f.auth.authorize(token), /RPC unavailable/);
    f.chain.finalized = original;
    f.queue.db.prepare("UPDATE wallet_sessions SET expires=0").run();
    await assert.rejects(() => f.auth.authorize(token), /Authenticate/);
  } finally {
    f.close();
  }
});

test("legacy sessions never gain organization authority; migration preserves durable payment claims", async () => {
  const f = fixture();
  try {
    f.queue.db
      .prepare("INSERT INTO sessions VALUES (?,?)")
      .run(f.auth.hash("a".repeat(64)), Date.now() + 60000);
    f.queue.add(
      structuredInvoice({
        id: "inv",
        order_id: "order",
        vendor_id: "vendor",
        recipient: "vendor.testnet",
        amount: "1",
        asset: "NEAR",
        text: "",
      }),
      [],
    );
    f.queue.claim("inv");
    const auth = new WalletAuth(f.queue, f.chain);
    assert.throws(() => auth.verify("a".repeat(64)));
    assert.equal(f.queue.get("inv")?.state, "preparing");
    assert.throws(
      () => f.queue.bindOrganization("other-org"),
      /different organization/,
    );
    const token = await auth.login((await f.signed()).input);
    const restarted = new WalletAuth(f.queue, f.chain);
    assert.equal((await restarted.authorize(token)).access.role, "owner");
  } finally {
    f.close();
  }
});

test("organization API denies every mutation to viewers and outsiders; snapshots use the authorization block", async () => {
  const f = fixture();
  try {
    const owner = await f.auth.login((await f.signed()).input);
    const viewer = await f.auth.login((await f.signed("viewer.testnet")).input);
    const stranger = await f.auth.login(
      (await f.signed("stranger.testnet")).input,
    );
    const service = { auth: f.auth, chain: f.chain, queue: f.queue };
    await organizationMutation(service, owner, "members", {
      accountId: "viewer.testnet",
      role: "viewer",
      enabled: true,
    });
    f.chain.snapshot = async (_queue, block) => {
      assert.equal(block?.hash, "final-block");
      return new MockOwnerAdapter(0).snapshot();
    };
    assert.equal(
      (await organizationSnapshot(service, viewer)).access.role,
      "viewer",
    );
    await assert.rejects(
      () => organizationSnapshot(service, stranger),
      /access denied/,
    );
    for (const token of [viewer, stranger, ""]) {
      for (const route of [
        "members",
        "registry",
        "invoices",
        "enqueue",
        "review",
      ]) {
        await assert.rejects(() =>
          organizationMutation(service, token, route, {
            role: "owner",
            accountId: "stranger.testnet",
            enabled: true,
            id: "inv",
            kind: "order",
          }),
        );
      }
    }
    assert.deepEqual(f.queue.all(), []);
    assert.deepEqual(f.queue.ids("order"), []);
    await assert.rejects(
      () =>
        organizationMutation(service, owner, "members", {
          accountId: "stranger.testnet",
          role: "owner",
          enabled: true,
        }),
      /Only explicit viewer/,
    );
    await organizationMutation(service, owner, "registry", {
      kind: "order",
      id: "existing-order",
    });
    assert.deepEqual(f.queue.ids("order"), ["existing-order"]);
    await organizationMutation(service, owner, "members", {
      accountId: "viewer.testnet",
      role: "viewer",
      enabled: false,
    });
    await assert.rejects(
      () => organizationSnapshot(service, viewer),
      /access denied/,
    );
    f.queue.db
      .prepare(
        "INSERT INTO organization_members VALUES ('other-org','viewer.testnet','viewer','owner.testnet')",
      )
      .run();
    await assert.rejects(
      () => organizationSnapshot(service, viewer),
      /access denied/,
    );
  } finally {
    f.close();
  }
});
