import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PublicKey } from "near-api-js";
import { nep413Digest, walletAccount } from "./auth.ts";

export function identityConfig() {
  const network = process.env.NNETICS_NETWORK || "testnet";
  if (network !== "testnet")
    throw new Error(
      "Wrong network: Nnetics supports NEAR testnet. Switch Meteor to testnet.",
    );
  const origin = process.env.NNETICS_APP_ORIGIN || "http://127.0.0.1:3100";
  if (new URL(origin).origin !== origin)
    throw new Error(
      "Configure the exact application origin, then restart the server.",
    );
  const rpc = process.env.NNETICS_RPC_URL || "https://test.rpc.fastnear.com";
  if (new URL(rpc).protocol !== "https:")
    throw new Error("Wallet verification needs an HTTPS testnet RPC.");
  return {
    network: "testnet" as const,
    origin,
    rpc,
    database: path.resolve(
      /* turbopackIgnore: true */ process.env.NNETICS_IDENTITY_DATABASE ||
        "../../artifacts/live/identities.db",
    ),
  };
}
export interface Identity {
  account_id: string;
  public_key: string;
}
export interface Workspace {
  id: string;
  name: string;
  status: "unprovisioned" | "ready" | "vault_verified";
  role: "creator" | "owner" | "viewer";
}
export class IdentityAuth {
  readonly db: DatabaseSync;
  readonly config: ReturnType<typeof identityConfig>;
  constructor(config: ReturnType<typeof identityConfig>) {
    this.config = config;
    fs.mkdirSync(path.dirname(config.database), { recursive: true });
    this.db = new DatabaseSync(config.database);
    this.db
      .exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS identity_browsers (id TEXT PRIMARY KEY, generation INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS identity_challenges (nonce TEXT PRIMARY KEY, browser TEXT NOT NULL, generation INTEGER NOT NULL, account TEXT NOT NULL, message TEXT NOT NULL, expires INTEGER NOT NULL, context TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS identity_sessions (token TEXT PRIMARY KEY, browser TEXT NOT NULL, generation INTEGER NOT NULL, account TEXT NOT NULL, public_key TEXT NOT NULL, expires INTEGER NOT NULL, context TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS identity_organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, creator TEXT NOT NULL, network TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS organization_vaults (organization TEXT PRIMARY KEY, vault TEXT NOT NULL UNIQUE, owner TEXT NOT NULL, payload TEXT NOT NULL);`);
  }
  hash(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex");
  }
  context() {
    return JSON.stringify([
      "wallet-identity-v2",
      this.config.network,
      this.config.origin,
    ]);
  }
  browser(value: string) {
    const cookie = /^[a-f0-9]{64}$/.test(value)
      ? value
      : crypto.randomBytes(32).toString("hex");
    const id = this.hash(cookie);
    this.db
      .prepare("INSERT OR IGNORE INTO identity_browsers VALUES (?,0)")
      .run(id);
    return { cookie, id };
  }
  logout(browserCookie: string) {
    const { id } = this.browser(browserCookie);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare(
          "UPDATE identity_browsers SET generation=generation+1 WHERE id=?",
        )
        .run(id);
      this.db.prepare("DELETE FROM identity_sessions WHERE browser=?").run(id);
      this.db
        .prepare("DELETE FROM identity_challenges WHERE browser=?")
        .run(id);
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  challenge(account: unknown, browserCookie: string) {
    // Invalid switches must revoke the old browser session as well.
    const browser = this.browser(browserCookie);
    this.logout(browser.cookie);
    const id = walletAccount(account);
    const generation = (
      this.db
        .prepare("SELECT generation FROM identity_browsers WHERE id=?")
        .get(browser.id) as { generation: number }
    ).generation;
    const nonce = crypto.randomBytes(32).toString("base64"),
      expires = Date.now() + 300000;
    const message = `Nnetics wallet identity login\nAccount: ${id}\nNetwork: testnet\nOrigin: ${this.config.origin}\nExpires: ${new Date(expires).toISOString()}\nThis off-chain signature verifies identity for 15 minutes. It grants no organization membership, vault ownership or transaction approval.`;
    this.db
      .prepare("DELETE FROM identity_challenges WHERE expires<=?")
      .run(Date.now());
    this.db
      .prepare("INSERT INTO identity_challenges VALUES (?,?,?,?,?,?,?)")
      .run(nonce, browser.id, generation, id, message, expires, this.context());
    return { nonce, message, recipient: this.config.origin };
  }
  async rpc<T>(method: string, params: unknown): Promise<T> {
    const r = await fetch(this.config.rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    }).catch(() => {
      throw new Error(
        "Cannot reach NEAR testnet verification. Check your connection and retry with a fresh login message.",
      );
    });
    if (!r.ok)
      throw new Error(
        "Testnet verification RPC is unavailable. Retry login; no access was granted.",
      );
    const body = await r.json();
    if (
      body.error &&
      ["UNKNOWN_ACCOUNT", "UNKNOWN_ACCESS_KEY"].includes(body.error.cause?.name)
    )
      throw new Error(
        "Account or signing key was not found on testnet. Select the activated account ID shown in Meteor, enable testnet and retry. An implicit address is a different account from its named account.",
      );
    if (body.error)
      throw new Error(
        "NEAR testnet RPC could not verify the account. Retry with a fresh message; no access was granted.",
      );
    if (!body.result)
      throw new Error("Incomplete testnet verification response. Retry login.");
    return body.result as T;
  }
  async keyBlock(identity: Identity) {
    const [status, block] = await Promise.all([
      this.rpc<{ chain_id: string }>("status", []),
      this.rpc<{ header: { hash: string } }>("block", { finality: "final" }),
    ]);
    if (status.chain_id !== "testnet")
      throw new Error(
        "Wrong RPC network. Configure NEAR testnet; mainnet login is disabled.",
      );
    const key = await this.rpc<{ permission: unknown; block_hash: string }>(
      "query",
      {
        request_type: "view_access_key",
        account_id: identity.account_id,
        public_key: identity.public_key,
        block_id: block.header.hash,
      },
    );
    if (key.block_hash !== block.header.hash || key.permission !== "FullAccess")
      throw new Error(
        "The signing key is removed, restricted or inconsistent. Reconnect the current testnet FullAccess wallet and verify again.",
      );
    return block.header.hash;
  }
  async login(input: Record<string, unknown>, browserCookie: string) {
    if (
      typeof input.nonce !== "string" ||
      typeof input.accountId !== "string" ||
      typeof input.publicKey !== "string" ||
      typeof input.signature !== "string"
    )
      throw new Error(
        "Malformed wallet response. Request a fresh login message.",
      );
    const browser = this.browser(browserCookie);
    const c = this.db
      .prepare(
        "SELECT * FROM identity_challenges WHERE nonce=? AND browser=? AND expires>? AND context=?",
      )
      .get(input.nonce, browser.id, Date.now(), this.context()) as
      | { account: string; message: string; generation: number }
      | undefined;
    if (
      !c ||
      c.account !== input.accountId ||
      !input.publicKey.startsWith("ed25519:")
    )
      throw new Error(
        "Expired, mismatched or replayed login. Request a fresh message for the selected account.",
      );
    const sig = Buffer.from(input.signature, "base64");
    if (
      sig.length !== 64 ||
      sig.toString("base64") !== input.signature ||
      !PublicKey.fromString(input.publicKey).verify(
        nep413Digest(c.message, input.nonce, this.config.origin),
        sig,
      )
    )
      throw new Error(
        "Invalid wallet signature. Select the requested testnet account and sign the fresh message.",
      );
    await this.keyBlock({
      account_id: input.accountId,
      public_key: input.publicKey,
    });
    const token = crypto.randomBytes(32).toString("hex");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const current = this.db
        .prepare("SELECT generation FROM identity_browsers WHERE id=?")
        .get(browser.id) as { generation: number };
      if (
        current.generation !== c.generation ||
        this.db
          .prepare(
            "DELETE FROM identity_challenges WHERE nonce=? AND browser=? AND expires>? AND context=?",
          )
          .run(input.nonce, browser.id, Date.now(), this.context()).changes !==
          1
      )
        throw new Error(
          "Login was superseded, expired or replayed. Verify the selected account again.",
        );
      this.db
        .prepare("INSERT INTO identity_sessions VALUES (?,?,?,?,?,?,?)")
        .run(
          this.hash(token),
          browser.id,
          c.generation,
          input.accountId,
          input.publicKey,
          Date.now() + 900000,
          this.context(),
        );
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
    return token;
  }
  verify(token: string): Identity {
    const row = /^[a-f0-9]{64}$/.test(token)
      ? (this.db
          .prepare(
            `SELECT s.account AS account_id,s.public_key FROM identity_sessions s JOIN identity_browsers b ON b.id=s.browser AND b.generation=s.generation WHERE s.token=? AND s.expires>? AND s.context=?`,
          )
          .get(this.hash(token), Date.now(), this.context()) as
          | Identity
          | undefined)
      : undefined;
    if (!row)
      throw new Error(
        "Wallet verification required. Sign a fresh login message; the previous session is expired or switched.",
      );
    return row;
  }
  async authenticate(token: string) {
    const identity = this.verify(token);
    try {
      await this.keyBlock(identity);
    } catch (e) {
      this.db
        .prepare("DELETE FROM identity_sessions WHERE token=?")
        .run(this.hash(token));
      throw e;
    }
    this.verify(token);
    return identity;
  }
  organizations(identity: Identity): Workspace[] {
    return (
      this.db
        .prepare(
          "SELECT id,name, (SELECT vault FROM organization_vaults WHERE organization=id) AS vault FROM identity_organizations WHERE creator=? AND network=? ORDER BY rowid",
        )
        .all(identity.account_id, this.config.network) as {
        id: string;
        name: string;
        vault?: string;
      }[]
    ).map((row) => ({
      ...row,
      status: row.vault ? "vault_verified" : "unprovisioned",
      role: "creator",
    }));
  }
  async createOrganization(token: string, name: unknown) {
    const identity = await this.authenticate(token);
    if (typeof name !== "string" || !name.trim() || name.trim().length > 80)
      throw new Error("Enter an organization name of 1–80 characters.");
    this.verify(token);
    const id = crypto.randomUUID();
    this.db
      .prepare("INSERT INTO identity_organizations VALUES (?,?,?,?)")
      .run(id, name.trim(), identity.account_id, this.config.network);
    return {
      id,
      name: name.trim(),
      status: "unprovisioned",
      role: "creator",
    } as Workspace;
  }
  organization(identity: Identity, id: string) {
    const row = this.organizations(identity).find((org) => org.id === id);
    if (!row)
      throw new Error(
        "Organization access denied. Return to your authorized organizations.",
      );
    return { ...row, invoices: [], contractors: [], payments: [] };
  }
}
let singleton: IdentityAuth | undefined;
export function identityService() {
  const config = identityConfig();
  if (!singleton || JSON.stringify(singleton.config) !== JSON.stringify(config))
    singleton = new IdentityAuth(config);
  return singleton;
}
