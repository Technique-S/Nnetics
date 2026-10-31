import { NextRequest, NextResponse } from "next/server";
import { liveConfig } from "../../../../server/config";
import { Provisioning } from "../../../../server/provisioning";
import { service } from "../../../../server/service";
import {
  identityService,
  identityConfig,
  type Workspace,
} from "../../../../server/identity";
import {
  organizationSnapshot,
  organizationMutation,
} from "../../../../server/organization-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(req: NextRequest, context: Context) {
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
        transactionsEnabled:
          process.env.NNETICS_TRANSACTIONS_AUTHORIZED === "testnet-reviewed",
      });
    }
    const token = req.cookies.get("nnetics_identity")?.value || "";
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
      await identity.authenticate(token);
      return json({
        accountId: who.account_id,
        network: "testnet",
        organizations,
        notice,
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
    if (path === "snapshot") return json(await organizationSnapshot(s, token));
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
      const response = json(identities.challenge(body.accountId, browser));
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
        maxAge: 900,
      });
      return response;
    }
    const token = req.cookies.get("nnetics_identity")?.value || "";
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
      return json(await provisioning.reconcile(token, body.organization));
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
    return json(await organizationMutation(s, token, path, body));
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Request failed" },
      400,
    );
  }
}
