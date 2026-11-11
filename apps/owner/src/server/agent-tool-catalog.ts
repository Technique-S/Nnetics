import {DEMO_ASSETS} from "../data/demo-intents.ts";
import { contractorTools } from "./agent-contractor-tools.ts";
// Authoritative catalog of application tools exposed to the model. A tool is
// listed only when the existing executor has a real implementation for that
// mode. Descriptions are written for model selection; authorization remains in
// the executor and never depends on what the model was told.
export type AgentMode = "demo" | "live";

export type AgentToolName =
  | "list_payables"
  | "get_payable"
  | "list_pending_wallet_changes"
  | "get_wallet_change_request"
  | "prepare_wallet_change_decision"
  | "create_contractor_portal_invitation"
  | "revoke_contractor_portal_invitation"
  | "update_contractor"
  | "get_contractor_wallet_status"
  | "list_unlinked_invoices"
  | "preview_simulated_intent"
  | "get_simulated_payment_status"
  | "list_contractors"
  | "get_contractor"
  | "create_contractor"
  | "archive_contractor"
  | "restore_contractor"
  | "delete_contractor"
  | "prepare_delete_contractor"
  | "get_contractor_invoices"
  | "get_vault_balance"
  | "get_vault_status"
  | "get_vault_available_balance"
  | "get_vault_transaction_history"
  | "list_invoices"
  | "get_invoice"
  | "get_organization_overview";

export interface AgentToolDefinition {
  name: AgentToolName;
  description: string;
  inputSchema: Record<string, unknown>;
  risk: "read" | "write";
  confirmationRequired: boolean;
  modes: AgentMode[];
}

const noArgs = { type: "object", properties: {}, additionalProperties: false } as const;

const definitions: AgentToolDefinition[] = [
  ...contractorTools,
  {name:"list_payables",risk:"read",confirmationRequired:false,modes:["demo"],description:"Read the authorized unified Payables list. Use for awaiting approval, ready to pay, processing, paid, failed or overdue questions. A failed attempt does not revoke invoice approval. Return only recorded approvers, amounts and dates; overdue is unknown when no due date exists. This tool cannot approve or pay.",inputSchema:{type:"object",properties:{status:{type:"string",enum:["All","Awaiting Approval","Ready to Pay","Processing","Paid","Rejected / Failed"]},query:{type:"string"},overdue:{type:"boolean"}},additionalProperties:false}},
  {name:"get_payable",risk:"read",confirmationRequired:false,modes:["demo"],description:"Read one payable by exact invoice ID or invoice number: original purpose/text, requested amount, approved amount, recorded approver and time, approved wallet, remaining payable, payment status, due-date availability and blocking reasons. Unknown provenance must remain unknown. Open View payables for review and payment; never execute payment through this tool.",inputSchema:{type:"object",properties:{id:{type:"string"}},required:["id"],additionalProperties:false}},
  {name:"list_unlinked_invoices",risk:"read",confirmationRequired:false,modes:["demo"],inputSchema:noArgs,description:"Lists demo bills without a work order, including unpaid bills. Work orders are optional; the owner can review these bills directly."},
  {name:"get_simulated_payment_status",risk:"read",confirmationRequired:false,modes:["demo"],inputSchema:noArgs,description:"Returns persisted Demo / Simulated NEAR Intents attempts, payment states and audit events. No live payment access."},
  {name:"preview_simulated_intent",risk:"read",confirmationRequired:false,modes:["demo"],inputSchema:{type:"object",properties:{id:{type:"string"},sourceAsset:{type:"string",enum:DEMO_ASSETS.map(a=>a.id)}},required:["id","sourceAsset"],additionalProperties:false},description:"Explains a demo bill's eligibility and previews an illustrative intent payment, or proposes invoice approval. This read-only tool does not approve an invoice, create an authorization or execute payment. Direct the user to View payables to explicitly approve the bill, generate a saved quote, confirm its exact terms and execute in the dashboard. Wallets only come from Wallet Details."},
  {
    name: "create_contractor",
    risk: "write",
    confirmationRequired: false,
    modes: ["demo"],
    description:
      "Creates a contractor profile in the current demo organization and persists it immediately. Use this when the user asks to create, add, or register a contractor. Pass only the person's name: remove instruction words such as 'named', 'called', 'name', or 'contractor' from the value, preserve the user's capitalization and every word of the name, and do not invent a wallet or other fields. A demo workspace is not limited in how many contractors it holds. A successful result returns the persisted record ID.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The contractor's person name, exactly as intended, without instruction words. 1-80 characters." },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "list_contractors",
    risk: "read",
    confirmationRequired: false,
    modes: ["demo"],
    description:
      "Returns a bounded page (default 100) of active contractor profiles; set archived=true for archived profiles and query to search. offset and limit support pagination. Returns the matching count. Returns contractor profiles in the current demo organization, including the exact count. Use this to list contractors, count them, search for a contractor, or find the first contractor. Never answer a contractor count from memory; call this tool.",
    inputSchema: {type:"object",properties:{query:{type:"string"},archived:{type:"boolean"},offset:{type:"integer",minimum:0},limit:{type:"integer",minimum:1,maximum:100}},additionalProperties:false},
  },
  {
    name: "get_contractor",
    risk: "read",
    confirmationRequired: false,
    modes: ["demo"],
    description:
      "Finds one contractor in the current demo organization by exact record ID or by exact case-insensitive name. Use this for follow-up questions such as 'show me his details' after resolving the person's name from the conversation. If several records share a name, the result is ambiguous and you must ask which one the user means. Do not guess an ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Persisted contractor record ID." },
        name: { type: "string", description: "The contractor's exact name, matched case-insensitively." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "archive_contractor",
    risk: "write",
    confirmationRequired: true,
    modes: ["demo"],
    description:
      "Prepares the removal of a contractor from the active list in the current demo organization. The contractor's invoices, payment records and receipts are preserved and their portal access is revoked. This tool prepares the operation only: it never changes anything by itself. Pass the contractor's persisted record ID. The result reports whether the operation is allowed and what it will do; the owner then confirms it in the dashboard. Never report the contractor as archived until the confirmation has actually happened.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Persisted contractor record ID." },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "restore_contractor",
    risk: "write",
    confirmationRequired: true,
    modes: ["demo"],
    description:
      "Prepares the return of an archived contractor to the active list in the current demo organization. No financial record changes. This tool prepares the operation only: it never changes anything by itself. Pass the contractor's persisted record ID. The owner then confirms it in the dashboard.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Persisted contractor record ID." },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "prepare_delete_contractor",
    risk: "write",
    confirmationRequired: true,
    modes: ["demo"],
    description:
      "Prepares the permanent deletion of a contractor profile in the current demo organization. Only a profile with no invoices, work orders, attachments or active portal access may be deleted; when the contractor still has records, report that archiving is the available option instead. This tool prepares the operation only: it never changes anything by itself. Pass the contractor's persisted record ID. The owner then confirms it in the dashboard. Never report the contractor as deleted until the confirmation has actually happened.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Persisted contractor record ID." },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_contractor_invoices",
    risk: "read",
    confirmationRequired: false,
    modes: ["demo"],
    description:
      "Returns the invoice and bill records that belong to one contractor in the current demo organization. Pass the contractor's persisted record ID. Use this for questions about a specific contractor's invoices or unpaid bills.",
    inputSchema: {
      type: "object",
      properties: {
        contractorId: { type: "string", description: "Persisted contractor record ID." },
      },
      required: ["contractorId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_vault_status",
    risk: "read",
    confirmationRequired: false,
    modes: ["demo"],
    description:
      "Returns the complete current position of the active demo vault: total funded, spent, reserved, available/spendable, spending limit, and paused state, with exact yoctoNEAR values and NEAR display strings. Use this for 'how much money is in the vault?', 'what's left?', 'how much can I afford to pay?', or any question about funds. Never invent a balance.",
    inputSchema: noArgs,
  },
  {
    name: "get_vault_available_balance",
    risk: "read",
    confirmationRequired: false,
    modes: ["demo"],
    description:
      "Returns only the currently available/spendable demo vault balance, with yoctoNEAR and NEAR values. Use when the user asks only what is available. Use get_vault_status when they also ask about total funded, spent, or reserved amounts.",
    inputSchema: noArgs,
  },
  {
    name: "get_vault_balance",
    risk: "read",
    confirmationRequired: false,
    modes: ["demo"],
    description:
      "Returns the lifetime total funded into the demo vault, with yoctoNEAR and NEAR values. This is not the current spendable balance. Use get_vault_status for the current funded/spent/reserved/available position.",
    inputSchema: noArgs,
  },
  {
    name: "get_vault_transaction_history",
    risk: "read",
    confirmationRequired: false,
    modes: ["demo"],
    description:
      "Returns the demo vault's funding and payment history, newest first, including amount, status, time, contractor name, and reference for payments. Use this to answer questions about what was paid, payment history, or how much has been paid to a contractor. All funds are simulated.",
    inputSchema: noArgs,
  },
  {
    name: "list_invoices",
    risk: "read",
    confirmationRequired: false,
    modes: ["demo"],
    description:
      "Returns the invoice and bill records in the current demo organization, with reference, amount, status, description, and contractor ID. Use this to list, count, or summarize invoices. Do not confuse confirmed payment receipts with invoices.",
    inputSchema: noArgs,
  },
  {
    name: "get_invoice",
    risk: "read",
    confirmationRequired: false,
    modes: ["demo"],
    description:
      "Returns one invoice or bill record by its persisted ID in the current demo organization. Use after list_invoices when the user asks about a specific invoice.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Persisted invoice/bill ID." },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_organization_overview",
    risk: "read",
    confirmationRequired: false,
    modes: ["demo"],
    description:
      "Returns a compact overview of the current demo organization: contractor count, invoice count, order count, outstanding approved invoices (count and NEAR amount), and the vault's funded/spent/available totals. Use for broad 'summarize my organization' questions.",
    inputSchema: noArgs,
  },
];

definitions.push({...definitions.find(tool => tool.name === "prepare_delete_contractor")!, name:"delete_contractor"});

export const ALL_AGENT_TOOLS: readonly AgentToolDefinition[] = Object.freeze(definitions);

export function catalogForMode(mode: AgentMode): AgentToolDefinition[] {
  return definitions.filter((tool) => tool.modes.includes(mode));
}

export function findAgentTool(name: string, mode: AgentMode): AgentToolDefinition | undefined {
  return catalogForMode(mode).find((tool) => tool.name === name);
}

export const UNSUPPORTED_OPERATIONS = [
  "Directly changing contractor payout wallets, roles or financial fields. Wallet changes must use the contractor request and confirmed owner decision workflow.",
  "Creating work orders, reviewing invoices, preparing payment drafts or executing payments. These are done in the dashboard.",
  "Real blockchain, wallet, or live payment operations. Every tool in this build is demo-only and uses simulated funds.",
] as const;

export const UNSUPPORTED_LIVE_OPERATIONS = [
  "Reading or changing live organization records through Ask Nnetics. The existing live tool paths are not implemented in this build.",
  "Every write operation, including creating contractors, managing portal access, reviewing invoices, and executing payments.",
] as const;

export function capabilitySummary(mode: AgentMode) {
  const catalog = catalogForMode(mode);
  return {
    mode,
    reads: catalog.filter((tool) => tool.risk === "read").map((tool) => tool.name),
    writes: catalog.filter((tool) => tool.risk === "write").map((tool) => tool.name),
    confirmationRequired: catalog.filter((tool) => tool.confirmationRequired).map((tool) => tool.name),
    unsupported: mode === "demo" ? [...UNSUPPORTED_OPERATIONS] : [...UNSUPPORTED_LIVE_OPERATIONS],
  };
}
