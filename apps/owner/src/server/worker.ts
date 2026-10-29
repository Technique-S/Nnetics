import { review } from "../data/owner-adapter.ts";
import type { OwnerSnapshot, Payment } from "../data/owner-adapter.ts";
import type { Job, Queue } from "./queue.ts";

export interface WorkerTransport {
  snapshot(queue: Queue): Promise<OwnerSnapshot>;
  prepare(args: {
    order_id: string;
    invoice_id: string;
    recipient: string;
    amount: string;
  }): Promise<{ signed: string; hash: string }>;
  broadcast(signed: string): Promise<void>;
  transaction(hash: string): Promise<"final" | "unknown">;
  confirmsPayment(hash: string, payment: Payment): Promise<boolean>;
}
export class PaymentWorker {
  readonly queue: Queue;
  readonly chain: WorkerTransport;
  constructor(queue: Queue, chain: WorkerTransport) {
    this.queue = queue;
    this.chain = chain;
  }
  async tick() {
    // Restarted jobs are reconciled first. Unknown outcomes never become queued.
    for (const job of this.queue
      .all()
      .filter((j) => ["preparing", "submitted", "pending"].includes(j.state)))
      await this.reconcile(job);
    if (
      this.queue
        .all()
        .some((j) => ["preparing", "submitted", "pending"].includes(j.state))
    )
      return;
    for (const job of this.queue.all().filter((j) => j.state === "queued")) {
      const snapshot = await this.chain.snapshot(this.queue);
      const reasons = review(snapshot, job.invoice);
      if (reasons.length) {
        this.queue.update(job.id, "review", reasons.join(", "));
        continue;
      }
      if (!this.queue.claim(job.id)) continue;
      // preparing is committed before signing. A crash in this gap blocks instead
      // of guessing whether an external signer has submitted anything.
      try {
        const order = snapshot.orders.find((o) => o.id === job.order_id)!;
        const tx = await this.chain.prepare({
          order_id: order.id,
          invoice_id: job.id,
          recipient: order.recipient,
          amount: order.amount,
        });
        this.queue.update(
          job.id,
          "submitted",
          "Signed; outcome not yet known",
          tx,
        );
        await this.chain.broadcast(tx.signed);
      } catch (e) {
        this.queue.audit(
          `Payment ${job.id}: ${e instanceof Error ? e.message : "submission interrupted"}`,
        );
      }
      await this.reconcile(this.queue.get(job.id)!);
      if (
        ["preparing", "submitted", "pending"].includes(
          this.queue.get(job.id)!.state,
        )
      )
        return;
    }
  }
  async reconcile(job: Job) {
    const snapshot = await this.chain.snapshot(this.queue);
    const payment = snapshot.payments.findLast(
      (p) => p.invoice_id === job.id && p.order_id === job.order_id,
    );
    if (payment) {
      // Only a finalized on-chain terminal record is sufficient. RPC transaction
      // success alone is not proof that the asynchronous transfer succeeded.
      const order = snapshot.orders.find((o) => o.id === job.order_id);
      if (
        order &&
        payment.recipient === order.recipient &&
        payment.amount === order.amount
      ) {
        if (
          !job.hash ||
          !(await this.chain.confirmsPayment(job.hash, payment))
        ) {
          this.queue.update(
            job.id,
            "pending",
            "Contract payment observed, but its exact transaction/receipt linkage is not confirmed. No retry.",
          );
          return;
        }
        const state =
          payment.status === "Paid"
            ? "paid"
            : payment.status === "Failed"
              ? "failed"
              : "pending";
        this.queue.update(
          job.id,
          state,
          state === "pending"
            ? `${payment.status}: reserved; reconcile via owner wallet if callback recorded a result; historical proof required if unknown`
            : payment.status,
          { attempt: payment.attempt_id },
        );
        return;
      }
      this.queue.update(
        job.id,
        "blocked",
        "Payment differs from approved order; investigate.",
      );
      return;
    }
    if (!job.signed || !job.hash) {
      this.queue.update(
        job.id,
        "blocked",
        "Interrupted before durable signed transaction; manual investigation required. No automatic retry.",
      );
      return;
    }
    // A finalized failure, expiration or unknown hash is never permission to
    // create a new transaction. Retain the permanent local claim conservatively.
    const status = await this.chain.transaction(job.hash);
    if (status === "final") {
      this.queue.update(
        job.id,
        "blocked",
        "Final transaction has no matching payment record. Review rejection; no automatic retry.",
      );
      return;
    }
    this.queue.update(
      job.id,
      "submitted",
      "Unknown outcome; only identical bytes may be rebroadcast.",
    );
    try {
      await this.chain.broadcast(job.signed);
    } catch {
      /* Retain signed bytes/hash and all claims. */
    }
  }
}
