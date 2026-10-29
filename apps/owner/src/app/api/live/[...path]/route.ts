import { NextRequest, NextResponse } from "next/server";
import { liveConfig } from "../../../../server/config";
import { service } from "../../../../server/service";
import { boundedId, structuredInvoice } from "../../../../server/queue";
import { review } from "../../../../data/owner-adapter";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(req: NextRequest, context: Context) {
  try {
    const path = (await context.params).path.join("/");
    const c = liveConfig();
    if (path === "config")
      return json({
        network: "testnet",
        contract: c.contract,
        owner: c.owner,
        worker: c.worker,
        publicKey: c.publicKey,
        configured: c.configured,
        transactionsEnabled:
          process.env.NNETICS_TRANSACTIONS_AUTHORIZED === "testnet-reviewed",
      });
    const s = service();
    s.auth.verify(req.cookies.get("nnetics_session")?.value || "");
    if (path === "snapshot") return json(await s.chain.snapshot(s.queue));
    throw new Error("Unknown endpoint.");
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Request failed" },
      400,
    );
  }
}
export async function POST(req: NextRequest, context: Context) {
  try {
    const c = liveConfig();
    if (
      req.headers.get("origin") !== c.origin ||
      !req.headers.get("content-type")?.startsWith("application/json")
    )
      throw new Error("Same-origin JSON required.");
    const reader = req.body?.getReader(),
      chunks: Uint8Array[] = [];
    let size = 0;
    if (!reader) throw new Error("JSON body required.");
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 20000) {
        await reader.cancel();
        throw new Error("Request too large.");
      }
      chunks.push(part.value);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    const body = JSON.parse(raw),
      path = (await context.params).path.join("/");
    const s = service();
    if (path === "challenge") return json(s.auth.challenge());
    if (path === "login") {
      const token = await s.auth.login(body);
      const response = json({ ok: true });
      response.cookies.set("nnetics_session", token, {
        httpOnly: true,
        sameSite: "strict",
        secure: c.origin.startsWith("https:"),
        path: "/api/live",
        maxAge: 900,
      });
      return response;
    }
    const token = req.cookies.get("nnetics_session")?.value || "";
    if (path === "logout") {
      s.auth.logout(token);
      const r = json({ ok: true });
      r.cookies.set("nnetics_session", "", { path: "/api/live", maxAge: 0 });
      return r;
    }
    s.auth.verify(token);
    if (path === "registry") {
      if (!["vendor", "order"].includes(body.kind))
        throw new Error("Invalid registry kind.");
      s.queue.register(body.kind, boundedId(body.id));
      return json({ ok: true });
    }
    if (path === "invoices") {
      const invoice = structuredInvoice(body);
      s.queue.register("order", invoice.order_id);
      const snapshot = await s.chain.snapshot(s.queue);
      s.queue.add(invoice, review(snapshot, { ...invoice, reviewed: false }));
      return json({ ok: true });
    }
    if (path === "enqueue") {
      const job = s.queue.get(boundedId(body.id));
      if (!job || job.state !== "review")
        throw new Error("Only an unsubmitted review item may be queued.");
      const reasons = review(await s.chain.snapshot(s.queue), job.invoice);
      if (reasons.length) throw new Error(reasons.join(", "));
      s.queue.update(job.id, "queued");
      return json({ ok: true });
    }
    if (path === "review") {
      const job = s.queue.get(boundedId(body.id));
      if (!job) throw new Error("Invoice not found.");
      s.queue.db
        .prepare("UPDATE invoices SET payload=? WHERE id=?")
        .run(JSON.stringify({ ...job.invoice, reviewed: true }), job.id);
      return json({ ok: true });
    }
    throw new Error("Unknown endpoint.");
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Request failed" },
      400,
    );
  }
}
