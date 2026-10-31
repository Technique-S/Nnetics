import crypto from "node:crypto";
import { PublicKey } from "near-api-js";
import { Queue } from "./queue.ts";
import { NearRpc } from "./chain.ts";
import { account } from "../data/owner-adapter.ts";
import type { Vault } from "../data/owner-adapter.ts";

export interface OrganizationAccess {
  organization: string;
  accountId: string;
  role: "owner" | "viewer";
  vaultOwner: string;
}
type Identity = { account_id: string; public_key: string };

export function walletAccount(value: unknown): string {
  if (typeof value !== "string") throw new Error("Wallet account ID required.");
  const id = account(value);
  if (!id.endsWith(".testnet") && !/^[0-9a-f]{64}$/.test(id))
    throw new Error(
      "Use a named testnet account or an activated implicit account.",
    );
  return id;
}

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
export class WalletAuth {
  readonly queue: Queue;
  readonly chain: NearRpc;
  constructor(queue: Queue, chain: NearRpc) {
    this.queue = queue;
    this.chain = chain;
    queue.bindOrganization(chain.config.organization);
    // Old owner-only sessions lack a verified identity and organization. Never
    // migrate their authority. Durable invoices/payment claims are untouched.
    queue.db.exec(`DELETE FROM sessions; DELETE FROM challenges;
      CREATE TABLE IF NOT EXISTS wallet_challenges (nonce TEXT PRIMARY KEY, message TEXT NOT NULL, expires INTEGER NOT NULL, account_id TEXT NOT NULL, context TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS wallet_sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL, account_id TEXT NOT NULL, public_key TEXT NOT NULL, context TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS organization_members (organization TEXT NOT NULL, account_id TEXT NOT NULL, role TEXT NOT NULL CHECK(role='viewer'), granted_by TEXT NOT NULL, PRIMARY KEY(organization,account_id));`);
  }
  context() {
    const c = this.chain.config;
    return JSON.stringify([
      c.network,
      c.organization,
      c.contract,
      c.codeHash,
      c.origin,
    ]);
  }
  challenge(accountId: string, organization: string) {
    if (organization !== this.chain.config.organization)
      throw new Error("Wrong organization.");
    const id = walletAccount(accountId);
    const { origin, contract, network } = this.chain.config;
    const nonce = crypto.randomBytes(32).toString("base64"),
      expires = Date.now() + 300000;
    const message = `Nnetics wallet login\nAccount: ${id}\nOrganization: ${organization}\nNetwork: ${network}\nVault: ${contract}\nOrigin: ${origin}\nExpires: ${new Date(expires).toISOString()}\nThis signature creates a 15-minute identity session. It grants no ownership or transaction approval.`;
    this.queue.db
      .prepare("DELETE FROM wallet_challenges WHERE expires < ?")
      .run(Date.now());
    this.queue.db
      .prepare("DELETE FROM wallet_sessions WHERE expires < ?")
      .run(Date.now());
    this.queue.db
      .prepare("INSERT INTO wallet_challenges VALUES (?,?,?,?,?)")
      .run(nonce, message, expires, id, this.context());
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
    organization: string;
  }) {
    const { config } = this.chain;
    const c = this.queue.db
      .prepare(
        "SELECT * FROM wallet_challenges WHERE nonce=? AND expires>? AND context=?",
      )
      .get(input.nonce, Date.now(), this.context()) as
      | { message: string; account_id: string }
      | undefined;
    if (
      !c ||
      input.organization !== config.organization ||
      input.accountId !== c.account_id ||
      !input.publicKey.startsWith("ed25519:")
    )
      throw new Error("Invalid, expired or replayed wallet challenge.");
    const signature = Buffer.from(input.signature, "base64");
    if (
      signature.length !== 64 ||
      signature.toString("base64") !== input.signature ||
      !PublicKey.fromString(input.publicKey).verify(
        nep413Digest(c.message, input.nonce, config.origin),
        signature,
      )
    )
      throw new Error("Invalid wallet signature.");
    const block = await this.chain.finalized();
    await this.verifyKey(
      { account_id: input.accountId, public_key: input.publicKey },
      block.hash,
    );
    if (
      this.queue.db
        .prepare(
          "DELETE FROM wallet_challenges WHERE nonce=? AND expires>? AND context=?",
        )
        .run(input.nonce, Date.now(), this.context()).changes !== 1
    )
      throw new Error("Challenge already consumed.");
    const token = crypto.randomBytes(32).toString("hex");
    this.queue.db
      .prepare("INSERT INTO wallet_sessions VALUES (?,?,?,?,?)")
      .run(
        this.hash(token),
        Date.now() + 900000,
        input.accountId,
        input.publicKey,
        this.context(),
      );
    return token;
  }
  hash(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
  verify(token: string): Identity {
    const identity = /^[a-f0-9]{64}$/.test(token)
      ? (this.queue.db
          .prepare(
            "SELECT account_id,public_key FROM wallet_sessions WHERE token=? AND expires>? AND context=?",
          )
          .get(this.hash(token), Date.now(), this.context()) as
          | Identity
          | undefined)
      : undefined;
    if (!identity)
      throw new Error("Authenticate your wallet for this organization.");
    return identity;
  }
  async verifyKey(identity: Identity, block: string) {
    const key = await this.chain.rpc<{
      permission: unknown;
      block_hash: string;
    }>("query", {
      request_type: "view_access_key",
      account_id: identity.account_id,
      public_key: identity.public_key,
      block_id: block,
    });
    if (key.block_hash !== block || key.permission !== "FullAccess")
      throw new Error(
        "Wallet authentication requires a current full-access key at the finalized block.",
      );
  }
  async authorize(token: string, capability: "read" | "owner" = "read") {
    const identity = this.verify(token);
    const block = await this.chain.finalized();
    await this.verifyKey(identity, block.hash);
    const vault = await this.chain.view<Vault>("get_vault", {}, block.hash);
    const owner = walletAccount(vault.owner);
    if (
      owner === this.chain.config.contract ||
      owner === this.chain.config.worker
    )
      throw new Error("Separate owner, vault and worker required.");
    const isOwner = identity.account_id === owner;
    const member = this.queue.db
      .prepare(
        "SELECT role FROM organization_members WHERE organization=? AND account_id=? AND granted_by=?",
      )
      .get(this.chain.config.organization, identity.account_id, owner) as
      | { role: string }
      | undefined;
    if (!isOwner && (capability === "owner" || member?.role !== "viewer"))
      throw new Error(
        "Organization access denied; owner actions require current on-chain vault ownership.",
      );
    // Recheck expiry/context after RPC latency; never return authority from a
    // cached role, wallet connection, or an owner supplied by the browser.
    this.verify(token);
    const access: OrganizationAccess = {
      organization: this.chain.config.organization,
      accountId: identity.account_id,
      role: isOwner ? "owner" : "viewer",
      vaultOwner: owner,
    };
    return { access, block };
  }
  async setViewer(token: string, accountId: string, enabled: boolean) {
    const { access } = await this.authorize(token, "owner");
    const id = walletAccount(accountId),
      org = this.chain.config.organization;
    if (enabled)
      this.queue.db
        .prepare(
          "INSERT OR REPLACE INTO organization_members VALUES (?,?,'viewer',?)",
        )
        .run(org, id, access.vaultOwner);
    else
      this.queue.db
        .prepare(
          "DELETE FROM organization_members WHERE organization=? AND account_id=?",
        )
        .run(org, id);
    this.queue.audit(
      `Organization ${org}: viewer ${id} ${enabled ? "granted" : "revoked"}`,
    );
  }
  logout(token: string) {
    this.queue.db
      .prepare("DELETE FROM wallet_sessions WHERE token=? AND context=?")
      .run(this.hash(token), this.context());
  }
}
