import { ownerAttempt } from "../../../../server/owner-attempt";
import {transactionCapabilities} from '../../../../server/transaction-gates';
import { withRpcScope } from "../../../../server/rpc-request";
import { RequestError, READ_TIMEOUTS } from "../../../../data/request-policy";
import { NextRequest, NextResponse } from "next/server";
import { liveConfig } from "../../../../server/config";
import { Provisioning } from "../../../../server/provisioning";
import { service } from "../../../../server/service";
import {
  identityService,
  identityConfig,
  IdentityVerificationUnavailable,
  type Workspace,
} from "../../../../server/identity";
import {
  organizationSnapshot,
  organizationMutation,
} from "../../../../server/organization-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };
const json = (body: unknown, status = 200, retryAfterMs=0) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store",...(retryAfterMs>0?{"Retry-After":String(Math.ceil(retryAfterMs/1000))}:{}) } });
async function get(req: NextRequest, context: Context) {
  try {
    const path = (await context.params).path.join("/");
    const identity = identityService();
    if (path === "config") {
      let c;
      try {
        c = liveConfig();
      } catch {
        /* Vault configuration is not wallet identity. */
      }
      return json({
        network: identity.config.network,
        walletLoginEnabled: true,
        contract: c?.contract || "",
        organization: c?.organization || "",
        worker: c?.worker || "",
        publicKey: c?.publicKey || "",
        configured: c?.configured || false,
        missingConfiguration: c?.missingConfiguration || [],
        ...transactionCapabilities(),
      });
    }
    const token = req.cookies.get("nnetics_identity")?.value || "";
    if(path==="session") {
      await identity.authenticate(token);
      return json(identity.sessionInfo(token));
    }
    if (path === "provisioning")
      return json(
        await new Provisioning(identity).status(
          token,
          req.nextUrl.searchParams.get("organization") || "",
        ),
      );
    if (path === "identity") {
      const who = await identity.authenticate(token);
      const organizations: Workspace[] = identity.organizations(who);
      let notice = "";
      try {
        const c = liveConfig();
        if (c.configured) {
          try {
            const { access } = await service().auth.authorize(token);
            organizations.unshift({
              id: c.organization,
              name: c.organization,
              status: "ready",
              role: access.role,
            });
          } catch (e) {
            const message = e instanceof Error ? e.message : "";
            if (!message.startsWith("Organization access denied"))
              notice =
                "Wallet login succeeded, but the configured vault workspace could not be verified. Retry workspace discovery; no vault records were loaded.";
          }
        }
      } catch {
        notice =
          "Wallet login succeeded. Vault configuration needs developer review before a vault workspace can be used.";
      }
      identity.verify(token);
      return json({
        accountId: who.account_id,
        network: "testnet",
        organizations,
        notice,
        session: identity.sessionInfo(token),
      });
    }
    if (path === "organization") {
      const who = await identity.authenticate(token);
      return json(
        identity.organization(
          who,
          req.nextUrl.searchParams.get("organization") || "",
        ),
      );
    }
    const c = liveConfig();
    const requested = req.nextUrl.searchParams.get("organization");
    if (requested && requested !== c.organization)
      throw new Error("Organization access denied.");
    const s = service();
    await identity.authenticate(token);
    if (path === "owner-attempt") return json(await ownerAttempt(s, token));
    if (path === "snapshot") return json(await organizationSnapshot(s, token));
    throw new Error("Unknown endpoint.");
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Request failed", verificationUnavailable:e instanceof IdentityVerificationUnavailable || e instanceof RequestError, automaticRetry: e instanceof IdentityVerificationUnavailable ? e.automaticRetry : e instanceof RequestError ? e.retryable : false, retryable: (e instanceof IdentityVerificationUnavailable || e instanceof RequestError && e.retryable) },
      (e instanceof IdentityVerificationUnavailable || e instanceof RequestError && e.retryable) ? 503 : 400,
      e instanceof IdentityVerificationUnavailable || e instanceof RequestError ? e.retryAfterMs : 0,
    );
  }
}
async function post(req: NextRequest, context: Context) {
  try {
    const c = identityConfig();
    if (
      req.headers.get("origin") !== c.origin ||
      !req.headers.get("content-type")?.startsWith("application/json")
    )
      throw new Error(
        `Open Nnetics at ${c.origin}; wallet verification requires JSON requests from that exact application origin.`,
      );
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
    const identities = identityService();
    const browser = identities.browser(
      req.cookies.get("nnetics_browser")?.value || "",
    ).cookie;
    const cookies = {
      httpOnly: true,
      sameSite: "strict" as const,
      secure: c.origin.startsWith("https:"),
      path: "/api/live",
    };
    if (path === "challenge") {
      const response = json(body.discover===true?identities.discoveryChallenge(browser):identities.challenge(body.accountId, browser));
      response.cookies.set("nnetics_browser", browser, {
        ...cookies,
        maxAge: 2592000,
      });
      response.cookies.set("nnetics_identity", "", { ...cookies, maxAge: 0 });
      response.cookies.set("nnetics_session", "", { ...cookies, maxAge: 0 });
      return response;
    }
    if (path === "login") {
      const token = await identities.login(body, browser);
      const response = json({ ok: true });
      response.cookies.set("nnetics_identity", token, {
        ...cookies,
        maxAge: Math.max(0,Math.floor((identities.sessionInfo(token).absoluteExpires-Date.now())/1000)),
      });
      return response;
    }
    const token = req.cookies.get("nnetics_identity")?.value || "";
    if(path==="session/challenge")return json(identities.resumeChallenge(token,browser));
    if(path==="session/resume") {
      const previous=identities.verify(token).account_id;
      const resumed=await identities.login(body,browser,token);
      if(!resumed){
        const response=json({accountId:body.accountId,accountChanged:true,authenticationRequired:true});
        response.cookies.set("nnetics_identity","",{...cookies,maxAge:0});
        return response;
      }
      const info=identities.sessionInfo(resumed);
      const response=json({...info,accountChanged:previous!==info.accountId});
      response.cookies.set("nnetics_identity",resumed,{...cookies,maxAge:Math.max(0,Math.floor((info.absoluteExpires-Date.now())/1000))});
      return response;
    }
    if(path==="session/renew") {
      if(body.active!==true)throw Error("Explicit foreground activity required for renewal.");
      return json(await identities.renew(token,browser));
    }
    if (
      [
        "provisioning/prepare",
        "provisioning/dispatch",
        "provisioning/reconcile",
        "provisioning/retry",
      ].includes(path)
    ) {
      if (typeof body.organization !== "string")
        throw Error("Select your organization.");
      const provisioning = new Provisioning(identities);
      if (path.endsWith("prepare"))
        return json(await provisioning.prepare(token, body.organization));
      if (path.endsWith("dispatch"))
        return json(
          await provisioning.dispatch(
            token,
            body.organization,
            String(body.digest || ""),
          ),
        );
      if (path.endsWith("retry"))
        return json(
          await provisioning.retry(
            token,
            body.organization,
            String(body.digest || ""),
          ),
        );
      if(body.transactionHash!==undefined && typeof body.transactionHash!=="string")
        throw Error("Enter a public wallet transaction hash.");
      return json(await provisioning.reconcile(token, body.organization,body.transactionHash));
    }
    if (path === "logout") {
      identities.logout(browser);
      const r = json({ ok: true });
      r.cookies.set("nnetics_identity", "", { ...cookies, maxAge: 0 });
      r.cookies.set("nnetics_session", "", { ...cookies, maxAge: 0 });
      return r;
    }
    if (path === "organizations")
      return json(await identities.createOrganization(token, body.name));
    await identities.authenticate(token);
    const s = service();
    if (path === "owner-attempt") {
      return json(await ownerAttempt(s, token, body));
    }
    return json(await organizationMutation(s, token, path, body));
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Request failed", verificationUnavailable:e instanceof IdentityVerificationUnavailable || e instanceof RequestError, automaticRetry: e instanceof IdentityVerificationUnavailable ? e.automaticRetry : e instanceof RequestError ? e.retryable : false, retryable: (e instanceof IdentityVerificationUnavailable || e instanceof RequestError && e.retryable) },
      (e instanceof IdentityVerificationUnavailable || e instanceof RequestError && e.retryable) ? 503 : 400,
      e instanceof IdentityVerificationUnavailable || e instanceof RequestError ? e.retryAfterMs : 0,
    );
  }
}

// The browser owns GET retries; server RPC reads get one attempt per GET.
// POSTs are never replayed by the browser: only their safe RPC reads retry here.
export function GET(req: NextRequest, context: Context) {
  const requested = Number(req.headers.get('x-nnetics-read-timeout'));
  const timeout = READ_TIMEOUTS.includes(requested) ? requested : undefined;
  const offset=Number(req.headers.get('x-nnetics-read-attempt'))||0;
  const budget=Number(req.headers.get('x-nnetics-budget'))||180000;
  return withRpcScope(req.signal, timeout, () => get(req, context),Math.floor(Math.max(0,Math.min(3,offset))),budget);
}
export function POST(req: NextRequest, context: Context) {
  return withRpcScope(req.signal, undefined, () => post(req, context),0,Number(req.headers.get('x-nnetics-budget'))||180000);
}
