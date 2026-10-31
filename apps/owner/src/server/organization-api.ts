import type { WalletAuth } from "./auth.ts";
import type { NearRpc } from "./chain.ts";
import { boundedId, structuredInvoice, type Queue } from "./queue.ts";
import { review } from "../data/owner-adapter.ts";

export interface OrganizationService {
  auth: WalletAuth;
  chain: NearRpc;
  queue: Queue;
}
export async function organizationSnapshot(
  s: OrganizationService,
  token: string,
) {
  const { access, block } = await s.auth.authorize(token);
  return { ...(await s.chain.snapshot(s.queue, block)), access };
}
// All application writes share the same authorization boundary. Read-only
// membership cannot submit an invoice, queue a payment or edit discovery hints.
export async function organizationMutation(
  s: OrganizationService,
  token: string,
  path: string,
  body: Record<string, unknown>,
) {
  const { block } = await s.auth.authorize(token, "owner");
  if (path === "members") {
    if (
      typeof body.enabled !== "boolean" ||
      body.role !== "viewer" ||
      typeof body.accountId !== "string"
    )
      throw new Error("Only explicit viewer grants/revocations are supported.");
    await s.auth.setViewer(token, body.accountId, body.enabled);
  } else if (path === "registry") {
    if (body.kind !== "vendor" && body.kind !== "order")
      throw new Error("Invalid registry kind.");
    s.queue.register(body.kind, boundedId(body.id));
  } else if (path === "invoices") {
    const invoice = structuredInvoice(body);
    const snapshot = await s.chain.snapshot(s.queue, block);
    s.queue.register("order", invoice.order_id);
    s.queue.add(invoice, review(snapshot, { ...invoice, reviewed: false }));
  } else if (path === "enqueue") {
    const job = s.queue.get(boundedId(body.id));
    if (!job || job.state !== "review")
      throw new Error("Only an unsubmitted review item may be queued.");
    const reasons = review(await s.chain.snapshot(s.queue, block), job.invoice);
    if (reasons.length) throw new Error(reasons.join(", "));
    s.queue.update(job.id, "queued");
  } else if (path === "review") {
    const job = s.queue.get(boundedId(body.id));
    if (!job) throw new Error("Invoice not found.");
    s.queue.db
      .prepare("UPDATE invoices SET payload=? WHERE id=?")
      .run(JSON.stringify({ ...job.invoice, reviewed: true }), job.id);
  } else throw new Error("Unknown endpoint.");
  return { ok: true };
}
