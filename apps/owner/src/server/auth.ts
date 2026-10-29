import crypto from "node:crypto";
import { PublicKey } from "near-api-js";
import { Queue } from "./queue.ts";
import { NearRpc } from "./chain.ts";

function borshString(value: string) {
  const bytes = Buffer.from(value),
    length = Buffer.alloc(4);
  length.writeUInt32LE(bytes.length);
  return Buffer.concat([length, bytes]);
}
export function nep413Digest(
  message: string,
  nonce: string,
  recipient: string,
  callbackUrl?: string,
) {
  const tag = Buffer.alloc(4);
  tag.writeUInt32LE(2 ** 31 + 413);
  const n = Buffer.from(nonce, "base64");
  if (n.length !== 32 || n.toString("base64") !== nonce)
    throw new Error("Invalid challenge nonce.");
  return crypto
    .createHash("sha256")
    .update(
      Buffer.concat([
        tag,
        borshString(message),
        n,
        borshString(recipient),
        ...(callbackUrl === undefined
          ? [Buffer.from([0])]
          : [Buffer.from([1]), borshString(callbackUrl)]),
      ]),
    )
    .digest();
}
export class OwnerAuth {
  readonly queue: Queue;
  readonly chain: NearRpc;
  constructor(queue: Queue, chain: NearRpc) {
    this.queue = queue;
    this.chain = chain;
  }
  challenge() {
    const { origin, contract, owner } = this.chain.config;
    const nonce = crypto.randomBytes(32).toString("base64"),
      expires = Date.now() + 300000;
    const message = `Nnetics testnet invoice queue access\nOwner: ${owner}\nVault: ${contract}\nOrigin: ${origin}\nExpires: ${new Date(expires).toISOString()}\nThis signature creates a 15-minute invoice-queue session. It does not approve a transaction.`;
    this.queue.db
      .prepare("DELETE FROM challenges WHERE expires < ?")
      .run(Date.now());
    this.queue.db
      .prepare("DELETE FROM sessions WHERE expires < ?")
      .run(Date.now());
    this.queue.db
      .prepare("INSERT INTO challenges VALUES (?,?,?)")
      .run(nonce, message, expires);
    return {
      nonce,
      message,
      recipient: origin,
    };
  }
  async login(input: {
    nonce: string;
    accountId: string;
    publicKey: string;
    signature: string;
  }) {
    const { config } = this.chain;
    const c = this.queue.db
      .prepare("SELECT * FROM challenges WHERE nonce=? AND expires>?")
      .get(input.nonce, Date.now()) as { message: string } | undefined;
    if (
      !c ||
      input.accountId !== config.owner ||
      !input.publicKey.startsWith("ed25519:")
    )
      throw new Error("Invalid, expired or replayed owner challenge.");
    const signature = Buffer.from(input.signature, "base64");
    if (
      signature.length !== 64 ||
      !PublicKey.fromString(input.publicKey).verify(
        nep413Digest(c.message, input.nonce, config.origin),
        signature,
      )
    )
      throw new Error("Invalid owner signature.");
    const block = await this.chain.finalized();
    const key = await this.chain.rpc<{ permission: unknown }>("query", {
      request_type: "view_access_key",
      account_id: config.owner,
      public_key: input.publicKey,
      block_id: block.hash,
    });
    if (key.permission !== "FullAccess")
      throw new Error(
        "Owner authentication requires an existing full-access wallet key.",
      );
    if (
      this.queue.db
        .prepare("DELETE FROM challenges WHERE nonce=? AND expires>?")
        .run(input.nonce, Date.now()).changes !== 1
    )
      throw new Error("Challenge already consumed.");
    const token = crypto.randomBytes(32).toString("hex");
    this.queue.db
      .prepare("INSERT INTO sessions VALUES (?,?)")
      .run(this.hash(token), Date.now() + 900000);
    return token;
  }
  hash(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
  verify(token: string) {
    if (
      !/^[a-f0-9]{64}$/.test(token) ||
      !this.queue.db
        .prepare("SELECT token FROM sessions WHERE token=? AND expires>?")
        .get(this.hash(token), Date.now())
    )
      throw new Error(
        "Connect the owner wallet and authenticate the invoice queue.",
      );
  }
  logout(token: string) {
    this.queue.db
      .prepare("DELETE FROM sessions WHERE token=?")
      .run(this.hash(token));
  }
}
