import { issueAgentInvitation } from "./agent-invitations.ts";
import { prepareLifecycle, lifecycleScope, lifecycleSummary } from "./contractor-lifecycle.ts";
import type { AgentToolDefinition } from "./agent-tool-catalog.ts";
import type { ToolResult } from "./agent-tools.ts";
import { demoContractors } from "./demo-contractors.ts";
import type { ContractorProfile } from "../data/contractor-adapter.ts";

const id = { type: "string", minLength: 1, maxLength: 120 };
function tool(name: string, description: string, properties: Record<string, unknown>, required: string[], write = false, confirmation = false): AgentToolDefinition {
  return { name: name as AgentToolDefinition["name"], description, inputSchema: { type: "object", properties, required, additionalProperties: false }, risk: write ? "write" : "read", confirmationRequired: confirmation, modes: ["demo"] };
}
export const contractorTools = [
  tool("list_pending_wallet_changes", "Lists actual pending contractor wallet requests in this organization with old and proposed recipients. No mutations.", {}, []),
  tool("get_wallet_change_request", "Reads the exact contractor's pending wallet request, old recipient, new recipient, proof mode and whether it remains actionable. Does not decide it.", {id,requestId:id}, ["id"]),
  tool("prepare_wallet_change_decision", "Prepares approve or reject for the exact pending request. Requires an explicit owner confirmation card before any decision. Rejection requires a reason. Never directly overwrites a wallet.", {id,requestId:id,decision:{type:"string",enum:["approve","reject"]},reason:{type:"string",minLength:1,maxLength:1000}}, ["id","requestId","decision"], true, true),
  tool("create_contractor_portal_invitation", "Creates a first portal invitation for an active contractor. For previously issued/revoked/expired access, only prepares replacement for explicit owner confirmation. Returns an opaque delivery reference; the authenticated UI reveals the private link. Never invent or request a raw token.", {id}, ["id"], true),
  tool("revoke_contractor_portal_invitation", "Prepares revocation of contractor portal access. Returns actual active/revoked/expired status and waits for explicit owner confirmation. Does not revoke by itself.", {id}, ["id"], true, true),
  tool("update_contractor", "Updates only name, email or company on an existing active contractor. Resolve the exact ID with get_contractor first; never guess among duplicate names. Cannot change wallets or financial fields.", { id, name: {type:"string", minLength:1,maxLength:80}, email: {type:"string",minLength:1,maxLength:254}, company:{type:"string",minLength:1,maxLength:160} }, ["id"], true),
  tool("get_contractor_wallet_status", "Returns actual approved wallet, pending change and last approved/rejected decision. Omit id to list contractors needing wallet setup or with pending changes; use exact IDs for a specific person.", {id}, []),
];

// Validate against the same strict, flat schemas sent to the provider. Optional
// fields are optional, but unknown/protected fields never enter the executor.
export function validateContractorTool(name: string, raw: Record<string, unknown>): string | null {
  const definition = contractorTools.find(tool => tool.name === name);
  if (!definition) return "Unknown contractor tool.";
  const schema = definition.inputSchema as { properties: Record<string, {type:string;minLength?:number;maxLength?:number;enum?:string[]}>; required: string[] };
  for (const key of Object.keys(raw)) if (!(key in schema.properties)) return `Unexpected argument "${key}".`;
  for (const key of schema.required) if (!(key in raw)) return `Missing argument "${key}".`;
  for (const [key,value] of Object.entries(raw)) {
    const rule = schema.properties[key];
    if (typeof value !== rule.type || typeof value !== "string" || value.trim().length < (rule.minLength ?? 1) || value.length > (rule.maxLength ?? 120) || (rule.enum && !rule.enum.includes(value))) return `Invalid argument "${key}".`;
  }
  if (name === "update_contractor" && !["name","email","company"].some(key => key in raw)) return "Specify a field to update.";
  if (name === "prepare_wallet_change_decision" && raw.decision === "reject" && !raw.reason) return "A rejection reason is required.";
  return null;
}

export function contractorView(p: ContractorProfile) {
  return { id:p.id, name:p.name, email:p.email ?? null, company:p.company ?? null, wallet:p.wallet, generation:p.generation, archived:p.archived, deletable:p.deletable };
}
export function walletView(p: ContractorProfile) {
  return { contractorId:p.id, contractorName:p.name, wallet:p.wallet, walletVersion:p.walletVersion, status:p.pendingWallet ? "change_pending" : p.wallet ? "configured" : "not_configured", pendingRequest:p.pendingWallet ? {id:p.pendingWallet.id,account:p.pendingWallet.account,previousWallet:p.wallet,simulatedProof:p.pendingWallet.simulatedProof} : null, lastDecision:p.lastWalletDecision ?? null, canDecide:!!p.pendingWallet && !p.archived && p.linkActive && p.pendingWallet.baseVersion===p.walletVersion && p.pendingWallet.generation===p.generation };
}
export function executeContractorTool(ownerToken: string, name: string, args: Record<string, unknown>): ToolResult<unknown> {
  try {
    const validation = validateContractorTool(name,args);
    if (validation) return {success:false,code:"invalid_arguments",error:validation};
    const store = demoContractors();
    if (!store.owner(ownerToken)) return {success:false,code:"owner_required",error:"An authenticated demo owner is required."};
    const snapshot = store.ownerSnapshot(ownerToken);
    const profiles = [...snapshot.profiles,...(snapshot.archivedProfiles ?? [])];
    const profile = profiles.find(p => p.id === args.id);
    if (args.id && !profile) return {success:false,code:"contractor_not_found",error:"No contractor with that ID exists in this organization."};
    if (name === "list_pending_wallet_changes") return {success:true,data:profiles.filter(p=>p.pendingWallet).slice(0,100).map(walletView)};
    if (["get_wallet_change_request","prepare_wallet_change_decision"].includes(name) && profile) {
      const request=profile.pendingWallet;
      if(!request || (args.requestId && args.requestId!==request.id)) return {success:false,code:"request_not_found",error:"No matching pending wallet change exists for this contractor."};
      const wallet=walletView(profile);
      if(name === "get_wallet_change_request") return {success:true,data:wallet};
      if(!wallet.canDecide || store.portalStatus(ownerToken,profile.id).status!=="active") throw Error("Wallet request is stale, archived or access is unavailable.");
      const operation=prepareLifecycle({scope:lifecycleScope(ownerToken),kind:"wallet-decision",contractorId:profile.id,contractorName:profile.name,eligibility:store.lifecycleEligibility(profile.id,store.owner(ownerToken)!),details:{requestId:request.id,decision:String(args.decision),reason:String(args.reason ?? "Approved by owner."),oldWallet:profile.wallet,newWallet:request.account,baseVersion:request.baseVersion,generation:request.generation,proof:request.simulatedProof ? "Demo simulated ownership proof" : "Verified ownership proof"}});
      return {success:true,data:lifecycleSummary(operation)};
    }
    if (["create_contractor_portal_invitation","revoke_contractor_portal_invitation"].includes(name) && profile) {
      if(profile.archived) throw Error("Restore the contractor before managing portal access.");
      const portal=store.portalStatus(ownerToken,profile.id);
      if(name === "create_contractor_portal_invitation" && portal.status === "not_issued") return {success:true,data:issueAgentInvitation(ownerToken,profile.id)};
      if(name === "revoke_contractor_portal_invitation" && ["not_issued","revoked"].includes(portal.status)) return {success:true,data:{contractorId:profile.id,contractorName:profile.name,status:portal.status,changed:false}};
      const operation=prepareLifecycle({scope:lifecycleScope(ownerToken),kind:name === "create_contractor_portal_invitation" ? "replace-portal" : "revoke-portal",contractorId:profile.id,contractorName:profile.name,eligibility:store.lifecycleEligibility(profile.id,store.owner(ownerToken)!),details:{previousStatus:portal.status,generation:portal.generation}});
      return {success:true,data:lifecycleSummary(operation)};
    }
    if (name === "update_contractor" && profile) {
      const {id,...fields} = args;
      store.ownerCommand(ownerToken,{action:"update-contractor",profileId:String(id),...fields});
      return {success:true,data:contractorView(store.ownerSnapshot(ownerToken).profiles.find(p => p.id === id)!)};
    }
    if (name === "get_contractor_wallet_status") return {success:true,data:profile ? walletView(profile) : profiles.slice(0,100).map(walletView)};
    return {success:false,code:"tool_unavailable",error:"Unsupported contractor operation."};
  } catch (error) { return {success:false,code:"contractor_operation_failed",error:error instanceof Error ? error.message : "Contractor operation failed."}; }
}
