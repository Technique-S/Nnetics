import { assertNoDemoPaymentRecords } from "../../../../../server/agent-deletion.ts";
import { issueAgentInvitation, revealAgentInvitation } from "../../../../../server/agent-invitations.ts";
import { NextRequest, NextResponse } from "next/server.js";
import {demoIntents} from "../../../../../server/demo-intents.ts";
import { demoContractors } from "../../../../../server/demo-contractors.ts";
import { claimLifecycle, lifecycleScope } from "../../../../../server/contractor-lifecycle.ts";
import type { ContractorCommand, OwnerPortalCommand } from "../../../../../data/contractor-adapter.ts";
import { isAllowedAppOrigin } from "../../../../../server/origin.ts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ownerCookie = "nnetics_demo_portal_owner", contractorCookie = "nnetics_demo_portal_contractor";
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
export async function GET(req: NextRequest, context: Context) {
    try {
        const path = (await context.params).path, store = demoContractors();
        demoIntents().reconcile();
        if (path.join("/") === "owner")
            return json(store.ownerSnapshot(req.cookies.get(ownerCookie)?.value || ""));
        if (path.join("/") === "contractor")
            return json(store.snapshot(req.cookies.get(contractorCookie)?.value || ""));
        if (path[0] === "attachment" && path.length === 2) {
            let file;
            try {
                const org = store.owner(req.cookies.get(ownerCookie)?.value || "");
                if (!org)
                    throw Error("Owner access denied.");
                file = store.attachment(path[1], org);
            }
            catch {
                const who = store.contractor(req.cookies.get(contractorCookie)?.value || "");
                file = store.attachment(path[1], who.org, who.profile.id);
            }
            return new NextResponse(new Uint8Array(file.bytes), { headers: { "Content-Type": file.mime, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox", "Referrer-Policy": "no-referrer" } });
        }
        return json({ error: "Unknown demo endpoint." }, 404);
    }
    catch (e) {
        return json({ error: e instanceof Error ? e.message : "Demo access denied." }, 403);
    }
}
export async function POST(req: NextRequest, context: Context) {
    let entering = false;
    try {
        if (!isAllowedAppOrigin(req.headers.get("origin")))
            throw Error("Demo requests must come from this app.");
        const path = (await context.params).path.join("/"), store = demoContractors();
        const owner = req.cookies.get(ownerCookie)?.value || "", contractor = req.cookies.get(contractorCookie)?.value || "";
        if (path === "upload") {
            store.contractor(contractor);
            if (!req.headers.get("content-type")?.startsWith("multipart/form-data;"))
                throw Error("Use a file upload.");
            const raw = await bytes(req, 1114112);
            const form = await new Request(req.url, { method: "POST", headers: { "Content-Type": req.headers.get("content-type")! }, body: new Uint8Array(raw) }).formData();
            const file = form.get("file");
            if (!(file instanceof File))
                throw Error("Choose an invoice file.");
            return json(store.upload(contractor, file.name, file.type || (/\.txt$/i.test(file.name) ? "text/plain" : ""), new Uint8Array(await file.arrayBuffer())));
        }
        if (!req.headers.get("content-type")?.startsWith("application/json"))
            throw Error("Use JSON for this demo action.");
        const input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await bytes(req, 65536)));
        if (!input || typeof input !== "object" || Array.isArray(input))
            throw Error("Invalid demo request.");
        if (path === "owner/start")
            return cookie(json({ mode: "simulation" }), ownerCookie, store.ownerStart(owner), 30 * 86400);
        if (path === "enter") {
            entering = true;
            store.logoutContractor(contractor);
            return cookie(json({ mode: "simulation" }), contractorCookie, store.enter(input.token), 3600);
        }
        if(path === "owner/reveal-invitation") return json(revealAgentInvitation(owner,String(input.reference ?? "")));
        if (path === "owner")
            return json(store.ownerCommand(owner, input as OwnerPortalCommand));
        // The owner confirmed a prepared contractor lifecycle operation. The
        // single-use secret is bound to the owner session and to that exact
        // operation, so it can be applied once and only by the owner.
        if (path === "owner/confirm-lifecycle" || path === "owner/cancel-lifecycle") {
            const org = store.owner(owner);
            if (!org)
                throw Error("Not an owner workspace.");
            const operation = claimLifecycle(lifecycleScope(owner), String(input.operationId ?? ""), String(input.secret ?? ""));
            if (!operation)
                throw Error("This confirmation is no longer valid. Prepare the operation again.");
            if (path === "owner/cancel-lifecycle") return json({state:"cancelled"});
            const snapshot = store.ownerSnapshot(owner);
            const profile = [...snapshot.profiles, ...(snapshot.archivedProfiles ?? [])].find(p => p.id === operation.contractorId);
            if (!profile)
                throw Error("That contractor no longer exists in this demo workspace.");
            // Revalidate before anything is applied.
            if (operation.kind === "delete") {
                assertNoDemoPaymentRecords(operation.workspaceToken ?? req.cookies.get("nnetics_demo_workspace")?.value ?? "",profile,(snapshot.events ?? []).filter(event=>event.profileId===profile.id).map(event=>event.profileName));
                const eligibility = store.lifecycleEligibility(operation.contractorId, org);
                if (!eligibility.eligible)
                    throw Error(eligibility.reason);
            }
            if (operation.kind === "archive" && profile.archived === true)
                throw Error("This contractor is already archived.");
            if (operation.kind === "restore" && profile.archived !== true)
                throw Error("This contractor is not archived.");
            if(operation.kind === "wallet-decision") {
                const d=operation.details;
                const pending=profile.pendingWallet;
                if(!d || !pending || pending.id!==d.requestId || pending.account!==d.newWallet || profile.wallet!==d.oldWallet || pending.baseVersion!==d.baseVersion || pending.generation!==d.generation || profile.generation!==d.generation || store.portalStatus(owner,profile.id).status!=="active") throw Error("Wallet request changed or is no longer actionable. Prepare a fresh decision.");
                if(d.decision!=="approve" && d.decision!=="reject") throw Error("Invalid wallet decision.");
                store.ownerCommand(owner,{action:d.decision === "approve" ? "approve-wallet" : "reject-wallet",profileId:profile.id,requestId:pending.id,reason:String(d.reason),expectedAccount:String(d.newWallet),expectedWallet:d.oldWallet as string|null});
                const updated=store.ownerSnapshot(owner).profiles.find(p=>p.id===profile.id)!;
                return json({state:"completed",operation:{kind:operation.kind,contractorName:profile.name},decision:updated.lastWalletDecision,wallet:updated.wallet});
            }
            if(operation.kind === "revoke-portal" || operation.kind === "replace-portal") {
                if(profile.archived || profile.generation!==operation.details?.generation) throw Error("Portal access changed. Prepare this operation again.");
                const invitation=operation.kind === "replace-portal" ? issueAgentInvitation(owner,profile.id) : (store.ownerCommand(owner,{action:"revoke-link",profileId:profile.id}),null);
                return json({state:"completed",invitation,operation:{kind:operation.kind,contractorName:profile.name}});
            }
            const result = store.ownerCommand(owner, { action: `${operation.kind}-contractor`, profileId: operation.contractorId } as OwnerPortalCommand);
            return json({ operation: { kind: operation.kind, contractorId: operation.contractorId, contractorName: operation.contractorName }, result, state: store.ownerSnapshot(owner) });
        }
        if (path === "contractor")
            return json(store.command(contractor, input as ContractorCommand));
        return json({ error: "Unknown demo endpoint." }, 404);
    }
    catch (e) {
        const response = json({ error: e instanceof Error ? e.message : "Demo request failed." }, 400);
        return entering ? cookie(response, contractorCookie, "", 0) : response;
    }
}
