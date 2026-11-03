import crypto from "node:crypto";
import {
  actions,
  baseDecode,
  baseEncode,
  createTransaction,
  PublicKey,
} from "near-api-js";
import type { IdentityAuth, Identity } from "./identity.ts";
import { assertTestedProtocol } from "../data/protocol.ts";

export const VAULT_FUNDING = "5000000000000000000000000";
const GAS = "250000000000000";
export interface ProvisioningConfig {
  factory: string;
  factoryHash: string;
  vaultHash: string;
  enabled: boolean;
}
export function provisioningConfig(): ProvisioningConfig {
  return {
    factory: process.env.NNETICS_FACTORY_ID || "",
    factoryHash: process.env.NNETICS_FACTORY_CODE_HASH || "",
    vaultHash: process.env.NNETICS_PROVISIONING_VAULT_CODE_HASH || "",
    enabled: process.env.NNETICS_PROVISIONING_ENABLED === "testnet-reviewed",
  };
}
export function vaultAccount(
  owner: string,
  requestId: string,
  factory: string,
) {
  if (
    !/^[a-f0-9]{32}$/.test(requestId) ||
    !/^[a-z0-9._-]+\.testnet$/.test(factory) ||
    factory.length > 21
  )
    throw Error(
      "A reviewed testnet factory (at most 21 characters) is required.",
    );
  return `v-${crypto.createHash("sha256").update(`${owner}:${requestId}`).digest("hex").slice(0, 40)}.${factory}`;
}
interface Intent {
  preparedHash?: string;
  organization: string;
  owner: string;
  requestId: string;
  vault: string;
  config: ProvisioningConfig;
  state: "prepared" | "awaiting_chain" | "verified" | "failed";
  hash?: string;
  unsigned?: string;
  nonce?: string;
  publicKey?: string;
  finalizedBlock?: string;
  resolvedHeight?: number;
  message?: string;
}
function pinned(c: ProvisioningConfig) {
  return {
    factory: c.factory,
    factoryHash: c.factoryHash,
    vaultHash: c.vaultHash,
  };
}
export class Provisioning {
  readonly identities: IdentityAuth;
  readonly config: ProvisioningConfig;
  constructor(identities: IdentityAuth, config = provisioningConfig()) {
    this.identities = identities;
    this.config = config;
    identities.db
      .exec(`CREATE TABLE IF NOT EXISTS vault_provisioning (organization TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS organization_vaults (organization TEXT PRIMARY KEY, vault TEXT NOT NULL UNIQUE, owner TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS vault_provisioning_history (hash TEXT PRIMARY KEY, organization TEXT NOT NULL, payload TEXT NOT NULL);`);
  }
  own(who: Identity, organization: string) {
    this.identities.organization(who, organization);
  }
  read(organization: string): Intent | undefined {
    const row = this.identities.db
      .prepare("SELECT payload FROM vault_provisioning WHERE organization=?")
      .get(organization) as { payload: string } | undefined;
    return row ? JSON.parse(row.payload) : undefined;
  }
  save(intent: Intent) {
    this.identities.db
      .prepare("UPDATE vault_provisioning SET payload=? WHERE organization=?")
      .run(JSON.stringify(intent), intent.organization);
  }
  async rpc<T = any>(method: string, params: unknown): Promise<T> {
    // Read-only RPC exclusively. This service never signs or broadcasts.
    const response = await fetch(this.identities.config.rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    if (!response.ok)
      throw Error(
        `Provisioning RPC HTTP ${response.status}; reconcile before retrying.`,
      );
    const body = await response.json();
    if (body.error?.cause?.name === "UNKNOWN_ACCOUNT") return undefined as T;
    if (body.error)
      throw Object.assign(Error(
        "Provisioning outcome is unknown. Retry reconciliation; no new vault or authority was granted.",
      ), { rpcCode: body.error.cause?.name });
    if (!body.result) throw Error("Incomplete provisioning evidence.");
    return body.result;
  }
  async block() {
    const [status, block] = await Promise.all([
      this.rpc("status", []),
      this.rpc("block", { finality: "final" }),
    ]);
    if (status.chain_id !== "testnet")
      throw Error("Wrong network: testnet provisioning only.");
    assertTestedProtocol(status.protocol_version);
    return block.header;
  }
  async view(account: string, method: string, block: string) {
    const r = await this.rpc("query", {
      request_type: "call_function",
      account_id: account,
      method_name: method,
      args_base64: "e30=",
      block_id: block,
    });
    if (r.block_hash !== block)
      throw Error("Inconsistent finalized contract response.");
    return JSON.parse(Buffer.from(r.result).toString());
  }
  async checkedFactory(block: string) {
    const c = this.config;
    if (!c.factory || !c.factoryHash || !c.vaultHash)
      throw Error(
        "Create vault is not configured: deploy and review the factory and vault artifacts first. No transaction was requested.",
      );
    const [account, keys, config] = await Promise.all([
      this.rpc("query", {
        request_type: "view_account",
        account_id: c.factory,
        block_id: block,
      }),
      this.rpc("query", {
        request_type: "view_access_key_list",
        account_id: c.factory,
        block_id: block,
      }),
      this.view(c.factory, "get_config", block),
    ]);
    if (
      !account ||
      account.block_hash !== block ||
      account.code_hash !== c.factoryHash ||
      keys.block_hash !== block ||
      keys.keys.length !== 0 ||
      baseEncode(Uint8Array.from(config.vault_code_hash)) !== c.vaultHash ||
      config.funding !== VAULT_FUNDING ||
      config.version !== 1
    )
      throw Error(
        "Factory code, embedded vault, funding or immutable-key checks failed. Deployment review is required.",
      );
  }
  public(intent?: Intent) {
    return {
      configured: !!(
        this.config.factory &&
        this.config.factoryHash &&
        this.config.vaultHash
      ),
      enabled: this.config.enabled,
      network: "testnet",
      requiredFunding: VAULT_FUNDING,
      feeNotice:
        "5 testnet NEAR funds vault storage and operating balance; transaction gas is additional. The payout ledger starts at zero.",
      reviewNotice:
        "Independent verifier review and checkpoint bootstrap remain unresolved. No payments, worker activation or unpause are authorized.",
      ...(intent
        ? {
            organization: intent.organization,
            owner: intent.owner,
            vault: intent.vault,
            requestId: intent.requestId,
            factory: intent.config.factory,
            factoryCodeHash: intent.config.factoryHash,
            vaultCodeHash: intent.config.vaultHash,
            state: intent.state,
            hash: intent.hash,
            finalizedBlock: intent.finalizedBlock,
            message: intent.message,
            transaction: {
              signer: intent.owner,
              receiver: intent.config.factory,
              method: "create_vault",
              args: { request_id: intent.requestId },
              deposit: VAULT_FUNDING,
              gas: GAS,
            },
            planDigest: crypto
              .createHash("sha256")
              .update(
                JSON.stringify({
                  owner: intent.owner,
                  vault: intent.vault,
                  config: pinned(intent.config),
                  requestId: intent.requestId,
                  deposit: VAULT_FUNDING,
                  gas: GAS,
                }),
              )
              .digest("hex"),
          }
        : {}),
    };
  }
  async status(token: string, organization: string) {
    const who = await this.identities.authenticate(token);
    this.own(who, organization);
    const intent = this.read(organization);
    return intent?.state === "verified"
      ? this.reconcile(token, organization)
      : this.public(intent);
  }
  async prepare(token: string, organization: string) {
    const who = await this.identities.authenticate(token);
    this.own(who, organization);
    const old = this.read(organization);
    if (old) return this.public(old);
    if (
      !this.config.factory ||
      !this.config.factoryHash ||
      !this.config.vaultHash
    )
      throw Error(
        "Create vault is not configured: deploy and review the factory and vault artifacts first. No transaction was requested.",
      );
    const block = await this.block();
    await this.checkedFactory(block.hash);
    const requestId = crypto
      .createHash("sha256")
      .update(organization)
      .digest("hex")
      .slice(0, 32);
    const intent: Intent = {
      organization,
      owner: who.account_id,
      requestId,
      config: { ...this.config },
      vault: vaultAccount(who.account_id, requestId, this.config.factory),
      state: "prepared",
    };
    const existing = await this.rpc("query", {
      request_type: "view_account",
      account_id: intent.vault,
      block_id: block.hash,
    });
    if (existing)
      throw Error(
        "Deterministic vault already exists without a recorded provisioning transaction. Review before linking; no automatic claim is permitted.",
      );
    this.identities.verify(token);
    this.identities.db
      .prepare("INSERT OR IGNORE INTO vault_provisioning VALUES (?,?)")
      .run(organization, JSON.stringify(intent));
    return this.public(this.read(organization));
  }
  async dispatch(token: string, organization: string, digest: string) {
    const who = await this.identities.authenticate(token);
    this.own(who, organization);
    const intent = this.read(organization);
    if (!intent || intent.owner !== who.account_id)
      throw Error("Prepare your own vault transaction first.");
    if (!this.config.enabled)
      throw Error(
        "Wallet deployment requests are disabled pending factory review and specific testnet transaction authorization.",
      );
    if (
      JSON.stringify(pinned(intent.config)) !==
        JSON.stringify(pinned(this.config)) ||
      this.public(intent).planDigest !== digest
    )
      throw Error("Provisioning plan changed; review is required.");
    if (intent.state === "verified" || intent.state === "failed")
      throw Error(
        "This provisioning attempt is terminal; no new transaction is prepared automatically.",
      );
    const block = await this.block();
    await this.checkedFactory(block.hash);
    if (intent.hash) {
      await this.reconcile(token, organization);
      if (this.read(organization)?.state !== "awaiting_chain")
        throw Error("Provisioning resolved. Refresh its verified status.");
      // Only repeat the exact same unsigned transaction/hash, never a new nonce.
      return { ...this.public(intent), unsigned: intent.unsigned };
    }
    const key = await this.rpc("query", {
      request_type: "view_access_key",
      account_id: who.account_id,
      public_key: who.public_key,
      block_id: block.hash,
    });
    const balance = await this.rpc("query", {
      request_type: "view_account",
      account_id: who.account_id,
      block_id: block.hash,
    });
    if (
      key.block_hash !== block.hash ||
      key.permission !== "FullAccess" ||
      !Number.isSafeInteger(key.nonce) ||
      balance.block_hash !== block.hash ||
      BigInt(balance.amount) < BigInt(VAULT_FUNDING) + 10n ** 23n
    )
      throw Error(
        "Use the current FullAccess wallet with at least 5.1 testnet NEAR, including a gas/storage buffer.",
      );
    const tx = createTransaction(
      who.account_id,
      PublicKey.fromString(who.public_key),
      intent.config.factory,
      BigInt(key.nonce) + 1n,
      [
        actions.functionCall(
          "create_vault",
          { request_id: intent.requestId },
          BigInt(GAS),
          BigInt(VAULT_FUNDING),
        ),
      ],
      baseDecode(block.hash),
    );
    const bytes = Buffer.from(tx.encode());
    intent.hash = baseEncode(
      crypto.createHash("sha256").update(bytes).digest(),
    );
    intent.unsigned = bytes.toString("base64");
    intent.nonce = String(tx.nonce);
    intent.publicKey = who.public_key;
    intent.state = "awaiting_chain";
    intent.message =
      "Wallet outcome may be pending or cancelled. Reconcile this exact hash before retrying; never create another vault.";
    this.identities.verify(token);
    // Serialize the preparing gap across parallel tabs/processes.
    this.identities.db.exec("BEGIN IMMEDIATE");
    try {
      const current = this.read(organization)!;
      if (current.hash) {
        this.identities.db.exec("COMMIT");
        return { ...this.public(current), unsigned: current.unsigned };
      }
      this.save(intent);
      this.identities.db.exec("COMMIT");
    } catch (e) {
      this.identities.db.exec("ROLLBACK");
      throw e;
    }
    return { ...this.public(intent), unsigned: intent.unsigned };
  }
  async retry(token: string, organization: string, digest: string) {
    const who = await this.identities.authenticate(token);
    this.own(who, organization);
    const previous = this.read(organization);
    if (
      !previous?.hash ||
      previous.state !== "failed" ||
      !previous.resolvedHeight ||
      this.public(previous).planDigest !== digest
    )
      throw Error(
        "Only conclusively failed, refunded provisioning can prepare another transaction. Unknown outcomes remain blocked.",
      );
    if (
      JSON.stringify(pinned(previous.config)) !==
      JSON.stringify(pinned(this.config))
    )
      throw Error("Pinned configuration changed; review required.");
    const block = await this.block();
    await this.checkedFactory(block.hash);
    if (
      block.height < previous.resolvedHeight ||
      (await this.rpc("query", {
        request_type: "view_account",
        account_id: previous.vault,
        block_id: block.hash,
      }))
    )
      throw Error(
        "Vault absence is not conclusively verified after the failed attempt. Retry blocked.",
      );
    this.identities.verify(token);
    this.identities.db.exec("BEGIN IMMEDIATE");
    try {
      const current = this.read(organization)!;
      if (current.hash !== previous.hash || current.state !== "failed")
        throw Error("Provisioning changed in another tab. Resume it first.");
      this.identities.db
        .prepare(
          "INSERT OR IGNORE INTO vault_provisioning_history VALUES (?,?,?)",
        )
        .run(previous.hash, organization, JSON.stringify(previous));
      const next: Intent = {
        organization: previous.organization,
        owner: previous.owner,
        requestId: previous.requestId,
        vault: previous.vault,
        config: previous.config,
        state: "prepared",
        message:
          "Previous creation conclusively failed and refunded. Review a new transaction for the same deterministic vault.",
      };
      this.save(next);
      this.identities.db.exec("COMMIT");
      return this.public(next);
    } catch (e) {
      this.identities.db.exec("ROLLBACK");
      throw e;
    }
  }
  async reconcile(token: string, organization: string, walletHash?: string) {
    const who = await this.identities.authenticate(token);
    this.own(who, organization);
    let intent = this.read(organization);
    if (!intent?.hash) return this.public(intent);
    const original = { ...intent };
    const replacing = !!walletHash && walletHash !== intent.hash;
    if (replacing) {
      if (intent.state !== "awaiting_chain" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletHash!))
        throw Error("Only a pending owner request can reconcile a wallet transaction hash.");
      try {
        await this.rpc("tx", {tx_hash:intent.hash,sender_account_id:intent.owner,wait_until:"NONE"});
        throw Error("Recorded transaction is known; reconcile its existing hash.");
      } catch (e) {
        if ((e as {rpcCode?:string}).rpcCode !== "UNKNOWN_TRANSACTION") throw e;
      }
      // Same key + nonce and every approved action must match below. A FINAL
      // success consumes that nonce, so the old hash cannot later execute too.
      intent = {...intent, hash:walletHash, preparedHash:intent.hash};
    }
    if (intent.owner !== who.account_id)
      throw Error("Provisioning identity mismatch.");
    if (
      JSON.stringify(pinned(intent.config)) !==
      JSON.stringify(pinned(this.config))
    )
      throw Error(
        "Pinned factory configuration changed; manual review required.",
      );
    let tx;
    try {
      tx = await this.rpc("tx", {
        tx_hash: intent.hash,
        sender_account_id: intent.owner,
        wait_until: "FINAL",
      });
    } catch {
      return {
        ...this.public(intent),
        state:
          intent.state === "verified"
            ? "verification_unavailable"
            : intent.state,
        message:
          "Transaction outcome remains unknown. The recorded intent stays blocked; retry reconciliation or the exact same transaction only.",
      };
    }
    if (tx.final_execution_status !== "FINAL") {
      if(replacing)throw Error("Wallet transaction must be FINAL before reconciliation.");
      return this.public(intent);
    }
    const t = tx.transaction,
      call = t?.actions?.[0]?.FunctionCall;
    if (
      t?.hash !== intent.hash ||
      t.signer_id !== intent.owner ||
      t.public_key !== intent.publicKey ||
      String(t.nonce) !== intent.nonce ||
      t.receiver_id !== intent.config.factory ||
      t.actions.length !== 1 ||
      call?.method_name !== "create_vault" ||
      call.deposit !== VAULT_FUNDING ||
      String(call.gas) !== GAS ||
      call.args !==
        Buffer.from(JSON.stringify({ request_id: intent.requestId })).toString(
          "base64",
        )
    )
      throw Error(
        "Final transaction differs from the recorded approved provisioning request.",
      );
    const block = await this.block();
    await this.checkedFactory(block.hash);
    const account = await this.rpc("query", {
      request_type: "view_account",
      account_id: intent.vault,
      block_id: block.hash,
    });
    if (
      !Array.isArray(tx.receipts_outcome) ||
      tx.receipts_outcome.length < 3 ||
      !tx.receipts_outcome.some(
        (r: any) => r.outcome?.executor_id === intent.vault,
      ) ||
      tx.receipts_outcome.some(
        (r: any) =>
          !r.outcome?.status ||
          !(
            "SuccessValue" in r.outcome.status ||
            "SuccessReceiptId" in r.outcome.status ||
            "Failure" in r.outcome.status
          ),
      )
    )
      throw Error("Final receipt evidence is incomplete. No vault linked.");
    const failures = tx.receipts_outcome.some(
      (r: any) => "Failure" in r.outcome.status,
    );
    if (!account && tx.status?.SuccessValue === "") {
      if (replacing) throw Error("Wallet hash repair requires complete successful creation.");
      // The pinned factory returns the refund promise on failed creation. FINAL
      // plus its empty successful result conclusively completes that refund.
      intent.state = "failed";
      intent.finalizedBlock = block.hash;
      intent.resolvedHeight = block.height;
      intent.message =
        "Creation failed and its returned refund completed. No vault linked. Review the recorded transaction before any new attempt.";
      this.identities.verify(token);
      this.save(intent);
      return this.public(intent);
    }
    if (
      !account ||
      failures ||
      Buffer.from(tx.status?.SuccessValue || "", "base64").toString() !== "true"
    ) {
      if(replacing)throw Error("Wallet transaction has not conclusively initialized the vault.");
      return {
        ...this.public(intent),
        message:
          "Creation, callback or refund did not conclusively succeed. No vault linked; keep this intent blocked for review.",
      };
    }
    const [keys, vault] = await Promise.all([
      this.rpc("query", {
        request_type: "view_access_key_list",
        account_id: intent.vault,
        block_id: block.hash,
      }),
      this.view(intent.vault, "get_vault", block.hash),
    ]);
    if (
      account.block_hash !== block.hash ||
      account.code_hash !== intent.config.vaultHash ||
      keys.block_hash !== block.hash ||
      keys.keys.length ||
      vault.owner !== intent.owner ||
      (intent.state !== "verified" &&
        (vault.paused !== true ||
          vault.agent !== null ||
          vault.budget !== "0" ||
          vault.payment_cap !== "10000000000000000000000" ||
          [vault.funded, vault.spent, vault.reserved].some((v) => v !== "0") ||
          String(vault.last_attempt) !== "0"))
    )
      throw Error(
        "Vault code, keys, initialized owner or initial authority differs from the reviewed plan. No link created.",
      );
    this.identities.verify(token);
    intent.state = "verified";
    intent.finalizedBlock = block.hash;
    intent.message =
      "Finalized initialization and expected owner verified. Payments remain disabled pending review and separate authority setup.";
    this.identities.db.exec("BEGIN IMMEDIATE");
    try {
      const current=this.read(organization);
      if(current?.hash!==original.hash||current?.state!==original.state)
        throw Error("Provisioning changed during reconciliation. Refresh before retrying.");
      if(replacing){
        this.identities.db.prepare("INSERT OR IGNORE INTO vault_provisioning_history VALUES (?,?,?)")
          .run(original.hash!,organization,JSON.stringify(original));
        delete intent.unsigned; // Never dispatch the original bytes under a new hash.
      }
      this.identities.db
        .prepare("INSERT OR IGNORE INTO organization_vaults VALUES (?,?,?,?)")
        .run(organization, intent.vault, intent.owner, JSON.stringify(intent));
      const linked = this.identities.db
        .prepare(
          "SELECT vault,owner FROM organization_vaults WHERE organization=?",
        )
        .get(organization) as { vault: string; owner: string };
      if (linked.vault !== intent.vault || linked.owner !== intent.owner)
        throw Error("Organization already links a different vault.");
      this.save(intent);
      this.identities.db.exec("COMMIT");
    } catch (e) {
      this.identities.db.exec("ROLLBACK");
      throw e;
    }
    return this.public(intent);
  }
}
