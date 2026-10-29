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
import type { Payment } from "../data/owner-adapter.ts";
import { transferMarker } from "./marker.ts";

export class WorkerNearTransport implements WorkerTransport {
  readonly rpc: NearRpc;
  readonly config: LiveConfig;
  constructor(config: LiveConfig) {
    this.config = config;
    this.rpc = new NearRpc(config);
  }
  snapshot(queue: Queue) {
    return this.rpc.snapshot(queue);
  }
  async prepare(args: {
    order_id: string;
    invoice_id: string;
    recipient: string;
    amount: string;
  }) {
    if (process.env.NNETICS_TRANSACTIONS_AUTHORIZED !== "testnet-reviewed")
      throw new Error("Testnet signing not authorized in this environment.");
    const block = await this.rpc.finalized();
    if (block.protocolVersion !== 86)
      throw new Error(
        `Protocol ${block.protocolVersion} has not passed this build's protocol-86 compatibility review.`,
      );
    if (!(await this.rpc.view("get_repair_checkpoint", {}, block.hash)))
      throw new Error(
        "A reviewed pre-payment repair checkpoint is required before worker signing.",
      );
    const k = await this.rpc.rpc<{
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
      permission.receiver_id !== this.config.contract ||
      permission.method_names.length !== 1 ||
      permission.method_names[0] !== "execute_payment" ||
      !permission.allowance ||
      BigInt(permission.allowance) === 0n ||
      !Number.isSafeInteger(k.nonce)
    )
      throw new Error(
        "Worker requires a funded, restricted execute_payment key with a finite allowance and exact nonce.",
      );
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
    if (process.env.NNETICS_TRANSACTIONS_AUTHORIZED !== "testnet-reviewed")
      throw new Error("Broadcast authorization required.");
    const block = await this.rpc.finalized();
    if (block.protocolVersion !== 86)
      throw new Error("Unreviewed testnet protocol; broadcast disabled.");
    const tx = SignedTransaction.decode(
      Buffer.from(signed, "base64"),
    ).transaction;
    if (
      tx.signerId !== this.config.worker ||
      tx.receiverId !== this.config.contract ||
      tx.publicKey.toString() !== this.config.publicKey ||
      tx.actions.length !== 1 ||
      tx.actions[0].functionCall?.methodName !== "execute_payment" ||
      tx.actions[0].functionCall.deposit !== 0n
    )
      throw new Error("Persisted transaction is not a worker payment.");
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
