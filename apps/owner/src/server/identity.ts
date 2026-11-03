import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PublicKey } from "near-api-js";
import { nep413Digest, walletAccount } from "./auth.ts";

// A transport outage is not evidence that the wallet's key was removed.
export class IdentityVerificationUnavailable extends Error {
  readonly retryable = true;
}
export const IDENTITY_SESSION_MS = 5 * 60 * 60 * 1000; // no earlier idle logout than the five-hour cap
export const IDENTITY_ABSOLUTE_MS = 5 * 60 * 60 * 1000;

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
  now = () => Date.now();
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
    const columns = (table: string) => new Set((this.db.prepare(`PRAGMA table_info(${table})`).all() as {name:string}[]).map(c=>c.name));
    const sessions=columns("identity_sessions"),challenges=columns("identity_challenges");
    // Old sessions have no authenticated absolute-age origin: require one fresh
    // proof rather than silently granting them a new lifetime. Billing is untouched.
    for(const [name,type] of [["created","INTEGER NOT NULL DEFAULT 0"],["absolute_expires","INTEGER NOT NULL DEFAULT 0"]])
      if(!sessions.has(name))this.db.exec(`ALTER TABLE identity_sessions ADD COLUMN ${name} ${type}`);
    for(const [name,type] of [["purpose","TEXT NOT NULL DEFAULT 'login'"],["session","TEXT"]])
      if(!challenges.has(name))this.db.exec(`ALTER TABLE identity_challenges ADD COLUMN ${name} ${type}`);
    // Existing sessions never gain a later absolute deadline under this policy.
    this.db.prepare('UPDATE identity_sessions SET absolute_expires=MIN(absolute_expires,created+?),expires=MIN(expires,created+?) WHERE created>0').run(IDENTITY_ABSOLUTE_MS,IDENTITY_ABSOLUTE_MS);
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
      expires = this.now() + 300000;
    const message = `Nnetics wallet identity login\nAccount: ${id}\nNetwork: testnet\nOrigin: ${this.config.origin}\nExpires: ${new Date(expires).toISOString()}\nSession limits: 5 hours idle, 5 hours absolute (five hours from sign-in). Only verified foreground activity renews idle time. Key validity and organization authority are rechecked. This grants no organization membership, vault ownership or transaction approval.`;
    this.db
      .prepare("DELETE FROM identity_challenges WHERE expires<=?")
      .run(this.now());
    this.db
      .prepare("INSERT INTO identity_challenges (nonce,browser,generation,account,message,expires,context) VALUES (?,?,?,?,?,?,?)")
      .run(nonce, browser.id, generation, id, message, expires, this.context());
    return { nonce, message, recipient: this.config.origin };
  }
  resumeChallenge(token:string,browserCookie:string) {
    const who=this.verify(token),browser=this.browser(browserCookie);
    const session=this.db.prepare("SELECT browser,generation FROM identity_sessions WHERE token=?").get(this.hash(token)) as {browser:string;generation:number};
    if(session.browser!==browser.id)throw Error("Wallet session belongs to another browser. Sign in again.");
    const nonce=crypto.randomBytes(32).toString("base64"),expires=this.now()+300000;
    const message=`Nnetics optional selected-wallet check\nNetwork: testnet\nOrigin: ${this.config.origin}\nExpires: ${new Date(expires).toISOString()}\nThe dashboard session belongs to ${who.account_id}. Confirm the account selected in Meteor. An unchanged account retains the existing session deadline. A different verified account signs out the previous session and requires a separate sign-in; this check never transfers its permissions. No transaction or payment authorization.`;
    this.db.prepare("INSERT INTO identity_challenges (nonce,browser,generation,account,message,expires,context,purpose,session) VALUES (?,?,?,?,?,?,?,?,?)").run(nonce,browser.id,session.generation,"*",message,expires,this.context(),"resume",this.hash(token));
    return {nonce,message,recipient:this.config.origin};
  }
  discoveryChallenge(browserCookie:string) {
    const browser=this.browser(browserCookie);this.logout(browser.cookie);
    const generation=(this.db.prepare('SELECT generation FROM identity_browsers WHERE id=?').get(browser.id) as {generation:number}).generation;
    const nonce=crypto.randomBytes(32).toString('base64'),expires=this.now()+300000;
    const message=`Nnetics wallet identity login\nNetwork: testnet\nOrigin: ${this.config.origin}\nExpires: ${new Date(expires).toISOString()}\nVerify the testnet account selected in Meteor using its current on-chain FullAccess key. Session limit: five hours from sign-in; activity cannot extend that deadline. This off-chain proof grants no organization membership, vault ownership, key installation, transaction or payment approval.`;
    this.db.prepare('INSERT INTO identity_challenges (nonce,browser,generation,account,message,expires,context,purpose) VALUES (?,?,?,?,?,?,?,?)').run(nonce,browser.id,generation,'*',message,expires,this.context(),'discover');
    return {nonce,message,recipient:this.config.origin};
  }
  async rpc<T>(method: string, params: unknown): Promise<T> {
    const r = await fetch(this.config.rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    }).catch(() => {
      throw new IdentityVerificationUnavailable(
        "Cannot reach NEAR testnet verification. Check your connection and retry verification; an existing session has not been revoked.",
      );
    });
    if (!r.ok)
      throw new IdentityVerificationUnavailable(
        "Testnet verification RPC is temporarily unavailable. Retry verification; no new access was granted.",
      );
    const body = await r.json().catch(() => {
      throw new IdentityVerificationUnavailable("Invalid verification RPC response. Retry verification.");
    });
    if (
      body.error &&
      ["UNKNOWN_ACCOUNT", "UNKNOWN_ACCESS_KEY"].includes(body.error.cause?.name)
    )
      throw new Error(
        "Account or signing key was not found on testnet. Select the activated account ID shown in Meteor, enable testnet and retry. An implicit address is a different account from its named account.",
      );
    if (body.error)
      throw new IdentityVerificationUnavailable(
        "NEAR testnet RPC could not verify the account. Retry with a fresh message; no access was granted.",
      );
    if (!body.result)
      throw new IdentityVerificationUnavailable("Incomplete testnet verification response. Retry verification.");
    return body.result as T;
  }
  async keyBlock(identity: Identity) {
    const [status, block] = await Promise.all([
      this.rpc<{ chain_id: string }>("status", []),
      this.rpc<{ header: { hash: string } }>("block", { finality: "final" }),
    ]);
    if(typeof status.chain_id!=="string" || typeof block.header?.hash!=="string" || !block.header.hash)
      throw new IdentityVerificationUnavailable("Incomplete network verification response. Retry verification; your session is retained.");
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
    if(key.block_hash!==block.header.hash || key.permission===undefined)
      throw new IdentityVerificationUnavailable("Inconclusive key verification response. Retry verification; your session is retained.");
    if (key.permission !== "FullAccess")
      throw new Error(
        "The signing key is removed, restricted or inconsistent. Reconnect the current testnet FullAccess wallet and verify again.",
      );
    return block.header.hash;
  }
  async login(input: Record<string, unknown>, browserCookie: string, resumeToken?: string) {
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
      .get(input.nonce, browser.id, this.now(), this.context()) as
      | { account: string; message: string; generation: number;purpose:string;session:string|null }
      | undefined;
    if (
      !c ||
      (c.account !== input.accountId && !(["resume","discover"].includes(c.purpose) && c.account==="*")) ||
      !input.publicKey.startsWith("ed25519:")
    )
      throw new Error(
        "Expired, mismatched or replayed login. Request a fresh message for the selected account.",
      );
    walletAccount(input.accountId);
    if((c.purpose==="resume")!==!!resumeToken)throw Error("Wallet proof purpose does not match this login endpoint.");
    if(c.purpose==="resume") {
      if(!resumeToken||c.session!==this.hash(resumeToken))throw Error("Resume proof does not belong to this session.");
      this.verify(resumeToken);
    }
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
    let token = crypto.randomBytes(32).toString("hex");
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
          .run(input.nonce, browser.id, this.now(), this.context()).changes !==
          1
      )
        throw new Error(
          "Login was superseded, expired or replayed. Verify the selected account again.",
        );
      if(c.purpose==="resume") {
        const previous=this.verify(resumeToken!);
        if(previous.account_id===input.accountId) {
          token=resumeToken!;
          this.db.prepare("UPDATE identity_sessions SET public_key=?, expires=MIN(absolute_expires,?) WHERE token=?").run(input.publicKey,this.now()+IDENTITY_SESSION_MS,this.hash(token));
          this.db.exec("COMMIT");
          return token;
        }
        // A cryptographically detected change revokes all previous browser
        // sessions/challenges, including those held by another tab.
        this.db.prepare("UPDATE identity_browsers SET generation=generation+1 WHERE id=?").run(browser.id);
        this.db.prepare("DELETE FROM identity_sessions WHERE browser=?").run(browser.id);
        this.db.prepare("DELETE FROM identity_challenges WHERE browser=?").run(browser.id);
        this.db.exec("COMMIT");
        return ""; // A detected change invalidates A; it never creates a session for B.
      }
      const generation=(this.db.prepare("SELECT generation FROM identity_browsers WHERE id=?").get(browser.id) as {generation:number}).generation;
      this.db
        .prepare("INSERT INTO identity_sessions (token,browser,generation,account,public_key,expires,context,created,absolute_expires) VALUES (?,?,?,?,?,?,?,?,?)")
        .run(
          this.hash(token),
          browser.id,
          generation,
          input.accountId,
          input.publicKey,
          this.now() + IDENTITY_SESSION_MS,
          this.context(),
          this.now(),
          this.now()+IDENTITY_ABSOLUTE_MS,
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
            `SELECT s.account AS account_id,s.public_key FROM identity_sessions s JOIN identity_browsers b ON b.id=s.browser AND b.generation=s.generation WHERE s.token=? AND s.expires>? AND s.absolute_expires>? AND s.created>0 AND s.context=?`,
          )
          .get(this.hash(token), this.now(), this.now(), this.context()) as
          | Identity
          | undefined)
      : undefined;
    if (!row)
      throw new Error(
        "Wallet verification required. Your session ended (5 hours idle, 5 hours absolute (five hours from sign-in)), was signed out or switched. Sign a fresh message; no payment is requested.",
      );
    return row;
  }
  sessionInfo(token:string) {
    const who=this.verify(token),row=this.db.prepare("SELECT expires,absolute_expires FROM identity_sessions WHERE token=?").get(this.hash(token)) as {expires:number;absolute_expires:number};
    return {accountId:who.account_id,idleExpires:row.expires,absoluteExpires:row.absolute_expires,serverTime:this.now(),idleLimitMs:IDENTITY_SESSION_MS,absoluteLimitMs:IDENTITY_ABSOLUTE_MS};
  }
  async renew(token:string,browserCookie:string) {
    await this.authenticate(token);
    const browser=this.browser(browserCookie),row=this.db.prepare("SELECT browser FROM identity_sessions WHERE token=?").get(this.hash(token)) as {browser:string};
    if(row.browser!==browser.id)throw Error("Session browser changed. Verify again.");
    this.verify(token); // latency/parallel logout must not revive expired authority
    this.db.prepare("UPDATE identity_sessions SET expires=MIN(absolute_expires,?) WHERE token=?").run(this.now()+IDENTITY_SESSION_MS,this.hash(token));
    return this.sessionInfo(token);
  }
  async authenticate(token: string) {
    const identity = this.verify(token);
    try {
      await this.keyBlock(identity);
    } catch (e) {
      if (!(e instanceof IdentityVerificationUnavailable))
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
