import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { baseEncode, baseDecode, KeyPair, Transaction } from "near-api-js";
import { IdentityAuth } from "../src/server/identity.ts";
import {
  Provisioning,
  VAULT_FUNDING,
  vaultAccount,
} from "../src/server/provisioning.ts";
import { verifyVaultTransaction } from "../src/data/vault-transaction.ts";
import { factoryDeploymentPlan } from "../scripts/factory-plan.ts";

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nnetics-provisioning-"));
  const identities = new IdentityAuth({
    network: "testnet",
    origin: "http://127.0.0.1:3100",
    rpc: "https://controlled.invalid",
    database: path.join(dir, "identity.db"),
  });
  let who = {
    account_id: "new.testnet",
    public_key: KeyPair.fromRandom("ed25519").getPublicKey().toString(),
  };
  identities.authenticate = async () => who;
  identities.verify = () => who;
  identities.db
    .prepare("INSERT INTO identity_organizations VALUES (?,?,?,?)")
    .run("organization-one", "Private studio", who.account_id, "testnet");
  const config = {
    factory: "v.operator.testnet",
    factoryHash: "reviewed-factory",
    vaultHash: baseEncode(new Uint8Array(32).fill(12)),
    enabled: true,
  };
  const p = new Provisioning(identities, config),
    block = baseEncode(new Uint8Array(32).fill(7));
  let outcome = "unknown",
    targetExists = false,
    owner = "new.testnet",
    code = config.vaultHash,
    keys: unknown[] = [],
    protocol = 88,
    finality = "FINAL";
  let mutate = (t: any) => t;
  p.rpc = async <T>(method: string, params: unknown): Promise<T> => {
    const q = params as any;
    let result: any;
    if (method === "status")
      result = { chain_id: "testnet", protocol_version: protocol };
    else if (method === "block")
      result = { header: { hash: block, height: 500 } };
    else if (method === "tx") {
      if (outcome === "unknown") throw Object.assign(Error("RPC does not know this hash"),{rpcCode:"UNKNOWN_TRANSACTION"});
      const i = p.read("organization-one")!;
      const success = (executor_id: string) => ({
        outcome: { executor_id, status: { SuccessValue: "" } },
      });
      result = mutate({
        final_execution_status: finality,
        transaction: {
          hash: i.hash,
          signer_id: i.owner,
          public_key: i.publicKey,
          nonce: Number(i.nonce),
          receiver_id: i.config.factory,
          actions: [
            {
              FunctionCall: {
                method_name: "create_vault",
                args: Buffer.from(
                  JSON.stringify({ request_id: i.requestId }),
                ).toString("base64"),
                deposit: VAULT_FUNDING,
                gas: "250000000000000",
              },
            },
          ],
        },
        status: {
          SuccessValue:
            outcome === "refund" ? "" : Buffer.from("true").toString("base64"),
        },
        receipts_outcome: [
          success(config.factory),
          success(i.vault),
          success(config.factory),
        ],
      });
      if (outcome === "callback_failure")
        result.receipts_outcome[2].outcome.status = {
          Failure: { error: "callback gas" },
        };
      if (outcome === "refund")
        result.receipts_outcome[1].outcome.status = {
          Failure: { error: "init failed" },
        };
    } else if (q.request_type === "view_access_key")
      result = { block_hash: block, permission: "FullAccess", nonce: 42 };
    else if (q.request_type === "view_access_key_list")
      result = {
        block_hash: block,
        keys: q.account_id === config.factory ? [] : keys,
      };
    else if (q.request_type === "view_account")
      result =
        q.account_id === config.factory
          ? { block_hash: block, code_hash: config.factoryHash }
          : q.account_id === who.account_id
            ? { block_hash: block, amount: "10000000000000000000000000" }
            : targetExists
              ? { block_hash: block, code_hash: code }
              : undefined;
    else if (q.request_type === "call_function")
      result = {
        block_hash: block,
        result: Array.from(
          Buffer.from(
            JSON.stringify(
              q.method_name === "get_config"
                ? {
                    vault_code_hash: Array.from(baseDecode(config.vaultHash)),
                    funding: VAULT_FUNDING,
                    version: 1,
                  }
                : {
                    owner,
                    paused: true,
                    agent: null,
                    budget: "0",
                    payment_cap: "10000000000000000000000",
                    funded: "0",
                    spent: "0",
                    reserved: "0",
                    last_attempt: "0",
                  },
            ),
          ),
        ),
      };
    else throw Error("Unexpected RPC method");
    return result as T;
  };
  return {
    p,
    identities,
    config,
    set: (changes: {
      outcome?: string;
      exists?: boolean;
      owner?: string;
      code?: string;
      keys?: unknown[];
      protocol?: number;
      finality?: string;
      mutate?: (t: any) => any;
      account?: string;
    }) => {
      if (changes.outcome !== undefined) outcome = changes.outcome;
      if (changes.exists !== undefined) targetExists = changes.exists;
      if (changes.owner !== undefined) owner = changes.owner;
      if (changes.code !== undefined) code = changes.code;
      if (changes.keys !== undefined) keys = changes.keys;
      if (changes.protocol !== undefined) protocol = changes.protocol;
      if (changes.finality !== undefined) finality = changes.finality;
      if (changes.mutate) mutate = changes.mutate;
      if (changes.account) who = { ...who, account_id: changes.account };
    },
    close: () => {
      identities.db.close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
async function prepared(f: ReturnType<typeof fixture>) {
  const plan = await f.p.prepare("session", "organization-one");
  return f.p.dispatch("session", "organization-one", plan.planDigest!);
}

test("owner wallet-hash reconciliation preserves original evidence and requires the same key/nonce/full call and finalized initialized vault",async()=>{
 const f=fixture();try{
  await prepared(f);const original=f.p.read("organization-one")!,candidate=baseEncode(new Uint8Array(32).fill(19)),rpc=f.p.rpc.bind(f.p);
  f.set({outcome:"success",exists:true,mutate:t=>({...t,transaction:{...t.transaction,hash:candidate}})});
  f.p.rpc=async(method,params)=>{if(method==="tx"&&(params as any).tx_hash===original.hash)throw Object.assign(Error("unknown"),{rpcCode:"UNKNOWN_TRANSACTION"});return rpc(method,params);};
  for(const change of [(t:any)=>t.transaction.nonce++, (t:any)=>t.transaction.public_key="wrong",(t:any)=>t.transaction.signer_id="other.testnet",(t:any)=>t.transaction.actions[0].FunctionCall.deposit="1",(t:any)=>t.transaction.actions[0].FunctionCall.args="e30=",(t:any)=>t.receipts_outcome[1].outcome.status={Failure:{}}]){
   f.set({mutate:t=>{t.transaction.hash=candidate;change(t);return t;}});
   let result;try{result=await f.p.reconcile("session","organization-one",candidate);}catch{/* Rejected evidence must leave the recorded request untouched. */}
   if(result)assert.notEqual(result.state,"verified");
   assert.equal(f.p.read("organization-one")!.hash,original.hash);
  }
  f.set({mutate:t=>{t.transaction.hash=candidate;return t;}});
  const result=await f.p.reconcile("session","organization-one",candidate);assert.equal(result.state,"verified");
  const saved=f.p.read("organization-one")!;assert.equal(saved.hash,candidate);assert.equal(saved.preparedHash,original.hash);assert.equal(saved.unsigned,undefined);
  const history=f.identities.db.prepare("SELECT payload FROM vault_provisioning_history WHERE hash=?").get(original.hash!) as {payload:string};assert.equal(JSON.parse(history.payload).unsigned,original.unsigned);
 }finally{f.close();}
});
test("factory deployment plan pins both artifacts and creates a locked direct subaccount without signing", () => {
  const input = {
    funder: "operator.testnet",
    publicKey: KeyPair.fromRandom("ed25519").getPublicKey().toString(),
    factory: "v.operator.testnet",
    storageByteCost: "10000000000000000000",
    factoryWasm: Buffer.from("controlled factory bytes"),
    vaultWasm: Buffer.from("controlled vault bytes"),
  };
  const { plan, digest } = factoryDeploymentPlan(input);
  assert.deepEqual(
    plan.actions.map((a) => a.type),
    ["CreateAccount", "Transfer", "DeployContract"],
  );
  assert.equal(digest.length, 64);
  assert.equal(plan.network, "testnet");
  assert.equal(plan.customer_initial_state.paused, true);
  assert.throws(
    () => factoryDeploymentPlan({ ...input, factory: "other.testnet" }),
    /direct subaccount/,
  );
  assert.notEqual(
    factoryDeploymentPlan({ ...input, vaultWasm: Buffer.from("changed") })
      .digest,
    digest,
  );
});
test("provisioning is deterministic for implicit/named owners and preserves exact intent across concurrency and restart", async () => {
  const f = fixture();
  try {
    const id = "a".repeat(32);
    assert.notEqual(
      vaultAccount("a".repeat(64), id, f.config.factory),
      vaultAccount("new.testnet", id, f.config.factory),
    );
    assert.ok(vaultAccount("a".repeat(64), id, f.config.factory).length <= 64);
    const plans = await Promise.all([
      f.p.prepare("s", "organization-one"),
      f.p.prepare("s", "organization-one"),
    ]);
    assert.equal(plans[0].vault, plans[1].vault);
    const calls = await Promise.all(
      plans.map((p) => f.p.dispatch("s", "organization-one", p.planDigest!)),
    );
    assert.equal(calls[0].hash, calls[1].hash);
    assert.equal(calls[0].unsigned, calls[1].unsigned);
    const tx = Transaction.decode(Buffer.from(calls[0].unsigned!, "base64"));
    assert.equal(String(tx.nonce), "43");
    assert.equal(tx.actions.length, 1);
    assert.equal(await verifyVaultTransaction(calls[0]), calls[0].unsigned);
    await assert.rejects(
      verifyVaultTransaction({ ...calls[0], factory: "wrong.testnet" }),
      /differs/,
    );
    await assert.rejects(
      verifyVaultTransaction({ ...calls[0], hash: "replayed-hash" }),
      /differs/,
    );
    const restarted = new Provisioning(f.identities, f.config);
    restarted.rpc = f.p.rpc;
    assert.equal(
      (await restarted.reconcile("s", "organization-one")).state,
      "awaiting_chain",
    );
    assert.equal(
      (await restarted.dispatch("s", "organization-one", plans[0].planDigest!))
        .hash,
      calls[0].hash,
    );
    assert.equal(
      f.identities.db
        .prepare("SELECT count(*) AS n FROM organization_vaults")
        .get()!.n,
      0,
    );
    await assert.rejects(
      f.p.retry("s", "organization-one", calls[0].planDigest!),
      /conclusively failed/,
    );
  } finally {
    f.close();
  }
});
test("only complete finalized factory success and expected initialized owner link an organization; strangers remain denied", async () => {
  const f = fixture();
  try {
    await prepared(f);
    f.set({
      outcome: "success",
      exists: true,
      finality: "EXECUTED_OPTIMISTIC",
    });
    assert.equal(
      (await f.p.reconcile("s", "organization-one")).state,
      "awaiting_chain",
    );
    f.set({ finality: "FINAL" });
    assert.equal(
      (await f.p.reconcile("s", "organization-one")).state,
      "verified",
    );
    assert.equal(
      f.identities.organizations(await f.identities.authenticate("s"))[0]
        .status,
      "vault_verified",
    );
    assert.equal(
      (await f.p.reconcile("s", "organization-one")).state,
      "verified",
    );
    assert.equal(
      f.identities.db
        .prepare("SELECT count(*) AS n FROM organization_vaults")
        .get()!.n,
      1,
    );
    f.set({ account: "stranger.testnet" });
    await assert.rejects(
      f.p.status("s", "organization-one"),
      /Organization access denied/,
    );
  } finally {
    f.close();
  }
});
test("changed owner/code or installed access keys cannot link a vault; stale proof cannot refresh authority", async () => {
  for (const bad of [
    { owner: "attacker.testnet" },
    { code: "different" },
    { keys: [{ permission: "FullAccess" }] },
  ]) {
    const f = fixture();
    try {
      await prepared(f);
      f.set({ outcome: "success", exists: true, ...bad });
      await assert.rejects(
        f.p.reconcile("s", "organization-one"),
        /No link created/,
      );
      assert.equal(
        f.identities.db
          .prepare("SELECT count(*) AS n FROM organization_vaults")
          .get()!.n,
        0,
      );
    } finally {
      f.close();
    }
  }
});
test("unknown, cancelled/interrupted and callback-failed provisioning keeps the same blocked hash and no link", async () => {
  const f = fixture();
  try {
    const first = await prepared(f),
      hash = first.hash;
    assert.equal((await f.p.reconcile("s", "organization-one")).hash, hash);
    f.set({ outcome: "callback_failure", exists: true });
    const callback = await f.p.reconcile("s", "organization-one");
    assert.equal(callback.state, "awaiting_chain");
    assert.match(callback.message!, /callback/);
    assert.equal(
      f.identities.db
        .prepare("SELECT count(*) AS n FROM organization_vaults")
        .get()!.n,
      0,
    );
    const retry = await f.p.dispatch(
      "s",
      "organization-one",
      first.planDigest!,
    );
    assert.equal(retry.unsigned, first.unsigned);
  } finally {
    f.close();
  }
});
test("failed creation with conclusive returned refund is terminal and never silently prepares a duplicate", async () => {
  const f = fixture();
  try {
    const first = await prepared(f);
    f.set({ outcome: "refund", exists: false });
    assert.equal(
      (await f.p.reconcile("s", "organization-one")).state,
      "failed",
    );
    await assert.rejects(
      f.p.dispatch("s", "organization-one", first.planDigest!),
      /terminal/,
    );
    assert.equal((await f.p.prepare("s", "organization-one")).hash, first.hash);
    const retry = await f.p.retry("s", "organization-one", first.planDigest!);
    assert.equal(retry.vault, first.vault);
    assert.equal(retry.state, "prepared");
    assert.equal(retry.hash, undefined);
    assert.equal(
      f.identities.db
        .prepare("SELECT count(*) AS n FROM vault_provisioning_history")
        .get()!.n,
      1,
    );
  } finally {
    f.close();
  }
});
test("deployment gate, changed plan/protocol and replayed transaction evidence fail closed", async () => {
  const f = fixture();
  try {
    f.config.enabled = false;
    const plan = await f.p.prepare("s", "organization-one");
    await assert.rejects(
      f.p.dispatch("s", "organization-one", plan.planDigest!),
      /disabled/,
    );
    f.config.enabled = true;
    await assert.rejects(
      f.p.dispatch("s", "organization-one", "wrong"),
      /plan changed/,
    );
    f.set({ protocol: 89 });
    await assert.rejects(
      f.p.dispatch("s", "organization-one", plan.planDigest!),
      /protocol/i,
    );
    f.set({ protocol: 88 });
    await f.p.dispatch("s", "organization-one", plan.planDigest!);
    f.set({
      outcome: "success",
      exists: true,
      mutate: (t) => ({
        ...t,
        transaction: { ...t.transaction, hash: "old unrelated transaction" },
      }),
    });
    await assert.rejects(f.p.reconcile("s", "organization-one"), /differs/);
    assert.equal(
      f.identities.db
        .prepare("SELECT count(*) AS n FROM organization_vaults")
        .get()!.n,
      0,
    );
  } finally {
    f.close();
  }
});
