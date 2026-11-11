import { NextRequest, NextResponse } from "next/server.js";
import {demoIntents} from "../../../../../server/demo-intents.ts";
import {demoContractors} from "../../../../../server/demo-contractors.ts";
import { demoWorkspace } from "../../../../../server/demo-workspace.ts";
import type { DemoWorkspaceSnapshot, DemoScenario } from "../../../../../server/demo-workspace.ts";
import { isAllowedAppOrigin } from "../../../../../server/origin.ts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cookieName = "nnetics_demo_workspace";
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
function cookie(response: NextResponse, name: string, value: string, age: number) { response.cookies.set(name, value, { httpOnly: true, sameSite: "strict", path: "/", maxAge: age, secure: process.env.NODE_ENV === "production" && process.env.NNETICS_APP_ORIGIN?.startsWith("https:") === true }); return response; }
type Context = {
    params: Promise<{
        path: string[];
    }>;
};
async function bytes(req: NextRequest, max: number) {
    const reader = req.body?.getReader();
    if (!reader)
        throw Error("Missing request body.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
        const part = await reader.read();
        if (part.done)
            break;
        size += part.value.length;
        if (size > max) {
            await reader.cancel();
            throw Error("Request too large.");
        }
        chunks.push(part.value);
    }
    return Buffer.concat(chunks, size);
}

// The demo session token rides only in the httpOnly cookie; every snapshot
// returned to the page is stripped of it so page scripts cannot exfiltrate
// the visitor's demo session.
function safe(snapshot: DemoWorkspaceSnapshot) {
    const { token: _private, ...rest } = snapshot;
    return rest;
}

export async function GET(req: NextRequest, context: Context) {
    try {
        const path = (await context.params).path, store = demoWorkspace();
        if (path.join("/") === "state") {
            const token=req.cookies.get(cookieName)?.value || "",owner=req.cookies.get("nnetics_demo_portal_owner")?.value || "";
            if(demoContractors().owner(owner) && store.state(token).initialized)demoIntents().list(token,owner);
            return json(safe(store.state(token)));
        }
        return json({ error: "Unknown demo endpoint." }, 404);
    }
    catch (e) {
        return json({ error: e instanceof Error ? e.message : "Demo access denied." }, 403);
    }
}
export async function POST(req: NextRequest, context: Context) {
    try {
        if (!isAllowedAppOrigin(req.headers.get("origin")))
            throw Error("Demo requests must come from this app.");
        const path = (await context.params).path.join("/"), store = demoWorkspace();
        const token = req.cookies.get(cookieName)?.value || "";
        if (path === "start") {
            const started = store.start(token);
            return cookie(json(safe(started.snapshot)), cookieName, started.token, 30 * 86400);
        }
        if (!req.headers.get("content-type")?.startsWith("application/json"))
            throw Error("Use JSON for this demo action.");
        const input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await bytes(req, 65536)));
        if (!input || typeof input !== "object" || Array.isArray(input))
            throw Error("Invalid demo request.");
        if (path === "create")
            return json(safe(store.createWorkspace(token, { profileName: String(input.profileName ?? ""), vaultName: String(input.vaultName ?? "") })));
        if (path === "fund")
            return json(safe(store.fund(token, String(input.amount ?? ""))));
        if (path === "reset")
            return json(safe(store.reset(token)));
        // Phase one of a simulated payment: validate, reserve, and wait for the
        // owner's explicit confirmation. The amount is canonical yoctoNEAR.
        if (path === "payment/prepare") {
            if(input.billId) throw Error("Pay approved bills through the validated simulated Intents workflow.");
            const prepared = store.preparePayment(token, {
                idempotencyKey: String(input.idempotencyKey ?? ""),
                recipient: String(input.recipient ?? ""),
                amount: String(input.amount ?? ""),
                description: String(input.description ?? ""),
                contractor: typeof input.contractor === "string" ? input.contractor : undefined,
                billId: typeof input.billId === "string" ? input.billId : undefined
            });
            return json({ ...prepared, state: safe(store.state(token)) });
        }
        // Phase two: the owner's confirmation releases the attempt. The secret is
        // single-use and bound to the exact prepared record.
        if (path === "payment/confirm") {
            const payment = store.confirmPayment(token, {
                paymentId: String(input.paymentId ?? ""),
                confirmationSecret: String(input.confirmationSecret ?? "")
            });
            return json({ payment, state: safe(store.state(token)) });
        }
        if (path === "payment/cancel") {
            const payment = store.cancelPayment(token, String(input.paymentId ?? ""));
            return json({ payment, state: safe(store.state(token)) });
        }
        if (path === "scenario")
            return json(safe(store.setScenario(token, input.scenario as DemoScenario)));
        if (path === "limit")
            return json(safe(store.setLimit(token, String(input.amount ?? ""))));
        if (path === "pause") {
            if (typeof input.paused !== "boolean")
                throw Error("Choose whether the demo vault is paused.");
            return json(safe(store.setPaused(token, input.paused)));
        }
        return json({ error: "Unknown demo endpoint." }, 404);
    }
    catch (e) {
        return json({ error: e instanceof Error ? e.message : "Demo request failed." }, 400);
    }
}
