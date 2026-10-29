import { account, uint } from "../data/owner-adapter.ts";
import type {
  OwnerSnapshot,
  WorkOrder,
  Vendor,
  Vault,
  Payment,
} from "../data/owner-adapter.ts";
import type { LiveConfig } from "./config.ts";
import type { Queue } from "./queue.ts";

export class NearRpc {
  private counter = 0;
  readonly config: LiveConfig;
  constructor(config: LiveConfig) {
    this.config = config;
  }
  async rpc<T>(method: string, params: unknown): Promise<T> {
    const response = await fetch(this.config.rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: ++this.counter,
        method,
        params,
      }),
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`NEAR RPC HTTP ${response.status}`);
    const body = await response.json();
    if (body.error) throw new Error(`NEAR RPC: ${JSON.stringify(body.error)}`);
    if (!("result" in body)) throw new Error("Missing RPC result.");
    return body.result as T;
  }
  async finalized() {
    const status = await this.rpc<{
      chain_id: string;
      protocol_version: number;
    }>("status", []);
    if (status.chain_id !== "testnet")
      throw new Error("RPC is not NEAR testnet.");
    const b = await this.rpc<{
      header: { hash: string; timestamp_nanosec: string };
    }>("block", { finality: "final" });
    const timestamp = uint(b.header.timestamp_nanosec, (1n << 64n) - 1n);
    const code = await this.rpc<{ code_hash: string }>("query", {
      request_type: "view_account",
      account_id: this.config.contract,
      block_id: b.header.hash,
    });
    if (!this.config.codeHash || code.code_hash !== this.config.codeHash)
      throw new Error("Deployed code differs from the reviewed configuration.");
    return {
      hash: b.header.hash,
      timestamp,
      protocolVersion: status.protocol_version,
    };
  }
  async view<T>(method: string, args: object, block: string): Promise<T> {
    const r = await this.rpc<{ result: number[]; block_hash: string }>(
      "query",
      {
        request_type: "call_function",
        account_id: this.config.contract,
        method_name: method,
        args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
        block_id: block,
      },
    );
    if (r.block_hash !== block)
      throw new Error("Inconsistent contract read block.");
    return JSON.parse(Buffer.from(r.result).toString("utf8")) as T;
  }
  async snapshot(queue: Queue): Promise<OwnerSnapshot> {
    const block = await this.finalized();
    const vault = await this.view<Vault>("get_vault", {}, block.hash);
    if (vault.owner !== this.config.owner)
      throw new Error("Unexpected vault owner.");
    account(vault.owner);
    for (const n of [
      vault.budget,
      vault.payment_cap,
      vault.funded,
      vault.spent,
      vault.reserved,
      vault.last_attempt,
    ])
      uint(n);
    const vendors: Vendor[] = [],
      orders: WorkOrder[] = [],
      payments: Payment[] = [];
    const orderIds = new Set([
      ...queue.ids("order"),
      ...queue.all().map((j) => j.order_id),
    ]);
    for (const id of orderIds) {
      const o = await this.view<Omit<WorkOrder, "id" | "title"> | null>(
        "get_order",
        { order_id: id },
        block.hash,
      );
      if (o) {
        orders.push({ ...o, id, title: id });
        queue.register("vendor", o.vendor_id);
      }
    }
    for (const id of queue.ids("vendor")) {
      const v = await this.view<Pick<Vendor, "recipient" | "active"> | null>(
        "get_vendor",
        { vendor_id: id },
        block.hash,
      );
      if (v) vendors.push({ ...v, id, name: id, role: "Testnet vendor" });
    }
    // Attempts are sequential; page in bounded batches for RPC backpressure.
    // No local metadata can turn an unknown contract status into Paid.
    if (BigInt(vault.last_attempt) > 8000n)
      throw new Error("Attempt count exceeds this contract's supported bound.");
    for (let n = 1n; n <= BigInt(vault.last_attempt); n++) {
      const p = await this.view<Omit<
        Payment,
        "attempt_id" | "reference"
      > | null>("get_payment", { attempt_id: n.toString() }, block.hash);
      if (!p) throw new Error("Missing sequential payment attempt.");
      const j = queue
        .all()
        .find(
          (j) => j.invoice.id === p.invoice_id && j.attempt === n.toString(),
        );
      payments.push({
        ...p,
        attempt_id: uint(n.toString()),
        reference: j?.hash ?? "Transaction reference unavailable",
      });
    }
    return {
      mode: "testnet",
      revision: Date.now(),
      protocolVersion: block.protocolVersion,
      blockHash: block.hash,
      chainTimeNs: block.timestamp,
      vault,
      vendors,
      orders,
      payments,
      invoices: queue.all().map((j) => j.invoice),
      audit: queue.db
        .prepare("SELECT * FROM audit ORDER BY id DESC LIMIT 100")
        .all() as unknown as OwnerSnapshot["audit"],
      queue: queue
        .all()
        .map(({ id, state, reason, hash }) => ({ id, state, reason, hash })),
    };
  }
}
