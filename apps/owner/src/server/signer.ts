import {paymentExecutionEnabled} from './transaction-gates.ts';
import {assertFreshCheckpoint} from "./checkpoint-validity.ts";
import fs from "node:fs";
import crypto from "node:crypto";
import {
  KeyPair,
  KeyPairSigner,
  PublicKey,
  SignedTransaction,
  createTransaction,
  actions,
  baseDecode,
  baseEncode,
} from "near-api-js";
import { NearRpc } from "./chain.ts";
import type { LiveConfig } from "./config.ts";
import type { WorkerTransport } from "./worker.ts";
import type { Queue } from "./queue.ts";
import type { Payment, OwnerSnapshot } from "../data/owner-adapter.ts";
import { transferMarker } from "./marker.ts";
import { assertTestedProtocol } from "../data/protocol.ts";
import {workerScope,assertWorkerArguments} from './worker-scope.ts';
import {assertOperationalNetwork} from './operation-scope.ts';

export class WorkerNearTransport implements WorkerTransport {
  readonly rpc: NearRpc;
  readonly config: LiveConfig;
  private readonly queue?: Queue;
  constructor(config: LiveConfig, queue?: Queue) {
    this.config = config;
    this.queue = queue;
    this.rpc = new NearRpc(config);
  }
  snapshot(queue: Queue) {
    return this.rpc.snapshot(queue);
  }
  private assertDispatch(scope: ReturnType<typeof workerScope>) {
    if(scope.binding&&!this.queue)throw Error('The staged payment database is required.');
    this.queue?.assertPaymentWindow(scope.planHash);
    if(scope.binding)this.queue!.assertStagedRelease(scope.args.invoice_id,scope.binding,scope.planHash);
  }
  async assertReady(snapshot: OwnerSnapshot) {
    if(!paymentExecutionEnabled())throw Error('Payment execution is disabled.');
    if(!snapshot.blockHash||!snapshot.chainTimeNs)throw Error('A finalized payment snapshot is required.');
    assertTestedProtocol(snapshot.protocolVersion!);
    assertFreshCheckpoint(await this.rpc.view('get_repair_checkpoint',{},snapshot.blockHash),snapshot.chainTimeNs);
    this.assertDispatch(workerScope(this.config)); // Missing scope must not consume a queued job's claim.
  }
  async prepare(args: {
    order_id: string;
    invoice_id: string;
    recipient: string;
    amount: string;
  }) {
    if (!paymentExecutionEnabled())
      throw new Error("Testnet signing not authorized in this environment.");
    const block = await this.rpc.finalized();
    assertTestedProtocol(block.protocolVersion);
    assertFreshCheckpoint(await this.rpc.view("get_repair_checkpoint", {}, block.hash), block.timestamp);
    const scope=workerScope(this.config);assertWorkerArguments(scope,args);
    this.assertDispatch(scope);
    assertOperationalNetwork(await this.rpc.rpc('status',[]));
    const price=await this.rpc.rpc<{gas_price:string}>('gas_price',{block_id:block.hash});
    if(252_000_000_000_000n*BigInt(price.gas_price)*2n>BigInt(scope.maxFee))throw Error('Worker fees exceed the reviewed allowance.');
    const k = await this.rpc.rpc<{
      block_hash:string;
      nonce: number;
      permission: {
        FunctionCall?: {
          receiver_id: string;
          method_names: string[];
          allowance: string | null;
        };
      };
    }>("query", {
      request_type: "view_access_key",
      account_id: this.config.worker,
      public_key: this.config.publicKey,
      block_id: block.hash,
    });
    const permission = k.permission.FunctionCall;
    if (
      !permission ||
      k.block_hash!==block.hash ||
      permission.receiver_id !== this.config.contract ||
      permission.method_names.length !== 1 ||
      permission.method_names[0] !== "execute_payment" ||
      !permission.allowance ||
      BigInt(permission.allowance) < BigInt(scope.maxFee) ||
      !Number.isSafeInteger(k.nonce)
    )
      throw new Error(
        "Worker requires a funded, restricted execute_payment key with a finite allowance and exact nonce.",
      );
    const balance=await this.rpc.rpc<{amount:string;storage_usage:number}>('query',{request_type:'view_account',account_id:this.config.worker,block_id:block.hash});
    if(BigInt(balance.amount)-BigInt(balance.storage_usage)*10n**19n<BigInt(scope.maxFee))throw Error('Worker gas balance is below the reviewed allowance.');
    if(!paymentExecutionEnabled()||workerScope(this.config).planHash!==scope.planHash)throw Error('Payment permission changed during preflight. No key loaded or transaction signed.');
    const secretFile = process.env.NNETICS_WORKER_KEY_FILE;
    if (!secretFile)
      throw new Error(
        "Configure a local restricted worker key file, outside the repository.",
      );
    const key = KeyPair.fromString(
      fs.readFileSync(secretFile, "utf8").trim() as Parameters<
        typeof KeyPair.fromString
      >[0],
    );
    if (
      !this.config.publicKey.startsWith("ed25519:") ||
      key.getPublicKey().toString() !== this.config.publicKey
    )
      throw new Error("Worker key mismatch.");
    const tx = createTransaction(
      this.config.worker,
      PublicKey.fromString(this.config.publicKey),
      this.config.contract,
      BigInt(k.nonce) + 1n,
      [actions.functionCall("execute_payment", args, 250_000_000_000_000n, 0n)],
      baseDecode(block.hash),
    );
    const { signedTransaction } = await new KeyPairSigner(key).signTransaction(
      tx,
    );
    return {
      signed: Buffer.from(signedTransaction.encode()).toString("base64"),
      hash: baseEncode(
        crypto.createHash("sha256").update(tx.encode()).digest(),
      ),
    };
  }
  async broadcast(signed: string) {
    if (!paymentExecutionEnabled())
      throw new Error("Broadcast authorization required.");
    const block = await this.rpc.finalized();
    assertTestedProtocol(block.protocolVersion);
    assertFreshCheckpoint(await this.rpc.view("get_repair_checkpoint", {}, block.hash), block.timestamp);
    const scope=workerScope(this.config);
    this.assertDispatch(scope);
    assertOperationalNetwork(await this.rpc.rpc('status',[]));
    const tx = SignedTransaction.decode(
      Buffer.from(signed, "base64"),
    ).transaction;
    if (
      tx.signerId !== this.config.worker ||
      tx.receiverId !== this.config.contract ||
      tx.publicKey.toString() !== this.config.publicKey ||
      tx.actions.length !== 1 ||
      tx.actions[0].functionCall?.methodName !== "execute_payment" ||
      tx.actions[0].functionCall.gas !== 250_000_000_000_000n ||
      tx.actions[0].functionCall.deposit !== 0n
    )
      throw new Error("Persisted transaction is not a worker payment.");
    assertWorkerArguments(scope,JSON.parse(Buffer.from(tx.actions[0].functionCall!.args).toString()));
    const price=await this.rpc.rpc<{gas_price:string}>('gas_price',{block_id:block.hash});
    if(252_000_000_000_000n*BigInt(price.gas_price)*2n>BigInt(scope.maxFee))throw Error('Worker fees exceed the reviewed allowance. Existing bytes retained; no replacement.');
    if(!paymentExecutionEnabled()||workerScope(this.config).planHash!==scope.planHash)throw Error('Payment permission changed before broadcast. Existing bytes retained.');
    await this.rpc.rpc("send_tx", {
      signed_tx_base64: signed,
      wait_until: "FINAL",
    });
  }
  async transaction(hash: string): Promise<"final" | "unknown"> {
    try {
      const result = await this.rpc.rpc<{ final_execution_status: string }>(
        "tx",
        {
          tx_hash: hash,
          sender_account_id: this.config.worker,
          wait_until: "FINAL",
        },
      );
      return result.final_execution_status === "FINAL" ? "final" : "unknown";
    } catch {
      return "unknown";
    }
  }
  async confirmsPayment(hash: string, payment: Payment): Promise<boolean> {
    try {
      const r = await this.rpc.rpc<{
        final_execution_status: string;
        transaction: {
          hash: string;
          signer_id: string;
          receiver_id: string;
          public_key: string;
        };
        receipts_outcome: {
          outcome: {
            executor_id: string;
            logs: string[];
            status: Record<string, unknown>;
          };
        }[];
      }>("EXPERIMENTAL_tx_status", {
        tx_hash: hash,
        sender_account_id: this.config.worker,
        wait_until: "FINAL",
      });
      if (
        r.final_execution_status !== "FINAL" ||
        r.transaction.hash !== hash ||
        r.transaction.signer_id !== this.config.worker ||
        r.transaction.receiver_id !== this.config.contract ||
        r.transaction.public_key !== this.config.publicKey
      )
        return false;
      const matches = r.receipts_outcome.filter(
        (r) =>
          r.outcome.executor_id === this.config.contract &&
          ("SuccessReceiptId" in r.outcome.status ||
            "SuccessValue" in r.outcome.status) &&
          r.outcome.logs.some((l) => l.startsWith("NNETICS_TRANSFER_V1:")),
      );
      return (
        matches.length === 1 &&
        matches[0].outcome.logs.filter((l) =>
          l.startsWith("NNETICS_TRANSFER_V1:"),
        ).length === 1 &&
        matches[0].outcome.logs.includes(
          transferMarker(this.config.contract, payment),
        )
      );
    } catch {
      return false;
    }
  }
}
