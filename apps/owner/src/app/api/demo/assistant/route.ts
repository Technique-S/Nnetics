import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { demoWorkspace } from "../../../../server/demo-workspace";
import type { DemoWorkspaceSnapshot } from "../../../../server/demo-workspace";
import { demoContractors } from "../../../../server/demo-contractors";
import { demoAssistantReply, DemoAssistantBuckets } from "../../../../server/demo-assistant";
import type { DemoAssistantContext } from "../../../../server/demo-assistant";
import { amountFromNear } from "../../../../data/owner-adapter";
import { isAllowedAppOrigin } from "../../../../server/origin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const workspaceCookie = "nnetics_demo_workspace", portalCookie = "nnetics_demo_portal_owner";
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

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

// Demo bills keep display NEAR amounts ("0.4"); the assistant reasons in exact
// yoctoNEAR so its arithmetic matches the ledger exactly.
function portalContext(token: string) {
    // The contractor portal is a separate demo session; without it the
    // assistant still knows the vault, payments and receipts.
    try {
        const portal = demoContractors().ownerSnapshot(token);
        return {
            contractors: portal.profiles.map(p => p.name),
            outstanding: portal.invoices
                .filter(b => b.status === "Approved" && !b.payment?.confirmed)
                .map(b => ({
                    contractor: portal.profiles.find(p => p.id === b.contractorId)?.name ?? "",
                    amount: amountFromNear(b.amount).toString(),
                    reference: b.reference ?? ""
                }))
        };
    }
    catch {
        return { contractors: [], outstanding: [] };
    }
}

function assistantContext(state: DemoWorkspaceSnapshot, contractors: string[], outstanding: DemoAssistantContext["outstanding"]): DemoAssistantContext {
    const pending = state.payments.filter(p => p.status === "pending");
    const pendingTotal = pending.reduce((sum, p) => (BigInt(sum) + BigInt(p.total)).toString(), "0");
    return {
        profileName: state.profile.name || "the owner",
        available: state.vault.available,
        pendingTotal,
        pendingCount: pending.length,
        outstanding,
        receipts: state.receipts.map(r => ({ reference: r.reference, contractor: r.contractor, amount: r.amount, summary: r.summary })),
        contractors,
        scenario: state.scenario
    };
}

// Per-session model budget lives in process memory only, scoped by a hash of
// the workspace cookie; no session token or identity value is kept as a key.
const buckets = new DemoAssistantBuckets();

export async function GET() {
    // Status-only provider info. The configured model is safe to expose; the
    // key, base URL and any provider response are never returned or logged.
    const configured = Boolean(process.env.OPENROUTER_API_KEY) && Boolean(process.env.NNETICS_ASSISTANT_MODEL);
    return json({
        configured,
        provider: configured ? "OpenRouter (OpenAI-compatible chat completions)" : "none",
        model: configured ? process.env.NNETICS_ASSISTANT_MODEL : null,
        features: configured ? ["strict-schema action planning", "scripted fallback", "per-session rate bucket"] : ["scripted fallback only"]
    });
}

export async function POST(req: NextRequest) {
    try {
        if (!isAllowedAppOrigin(req.headers.get("origin")))
            throw Error("Demo requests must come from this app.");
        if (!req.headers.get("content-type")?.startsWith("application/json"))
            throw Error("Use JSON for the demo assistant.");
        const state = demoWorkspace().state(req.cookies.get(workspaceCookie)?.value || "");
        const input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await bytes(req, 65536)));
        if (!input || typeof input !== "object" || Array.isArray(input))
            throw Error("Invalid assistant request.");
        const message = typeof input.message === "string" ? input.message.slice(0, 2000) : "";
        const portal = portalContext(req.cookies.get(portalCookie)?.value || "");
        const context = assistantContext(state, portal.contractors, portal.outstanding);
        const key = process.env.OPENROUTER_API_KEY, model = process.env.NNETICS_ASSISTANT_MODEL;
        const result = await demoAssistantReply({
            message, context, useModel: Boolean(key && model), key, model,
            bucket: buckets.scope(crypto.createHash("sha256").update(state.token).digest("hex"))
        });
        return json({ reply: result.reply, actions: result.actions, mode: result.mode });
    }
    catch (e) {
        return json({ error: e instanceof Error ? e.message : "Assistant request failed." }, 400);
    }
}
