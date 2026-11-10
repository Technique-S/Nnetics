// Agent Tools Interface - Defines the contract between the AI agent and backend services
import { ContractorProfile } from "../data/contractor-adapter.ts";
import { OwnerSnapshot } from "../data/owner-adapter.ts";
import { DemoWorkspaceSnapshot } from "./demo-workspace.ts";

// Tool Result Types
export interface ToolSuccess<T> {
  success: true;
  data: T;
}

export interface ToolError {
  success: false;
  error: string;
  code?: string;
}

export type ToolResult<T> = ToolSuccess<T> | ToolError;

// Tool Definitions
export interface ListContractorsTool {
  kind: "list_contractors";
  args: {};
}

export interface GetContractorTool {
  kind: "get_contractor";
  args: { id?: string; name?: string };
}

export interface CreateContractorTool {
  kind: "create_contractor";
  args: { name: string };
}

export interface UpdateContractorTool {
  kind: "update_contractor";
  args: { id: string; name?: string };
}

export interface GetContractorInvoicesTool {
  kind: "get_contractor_invoices";
  args: { contractorId: string };
}

export interface GetVaultBalanceTool {
  kind: "get_vault_balance";
  args: {};
}

export interface GetVaultStatusTool {
  kind: "get_vault_status";
  args: {};
}

export interface GetVaultAvailableBalanceTool {
  kind: "get_vault_available_balance";
  args: {};
}

export interface GetVaultTransactionHistoryTool {
  kind: "get_vault_transaction_history";
  args: {};
}

export interface ListInvoicesTool {
  kind: "list_invoices";
  args: {};
}

export interface GetInvoiceTool {
  kind: "get_invoice";
  args: { id: string };
}

export interface GetPendingInvoicesTool {
  kind: "get_pending_invoices";
  args: {};
}

export interface GetOverdueInvoicesTool {
  kind: "get_overdue_invoices";
  args: {};
}

export interface GetOrganizationOverviewTool {
  kind: "get_organization_overview";
  args: {};
}

export interface GetOrganizationStatisticsTool {
  kind: "get_organization_statistics";
  args: {};
}

// Union of all tool types
export type AgentTool =
  | ListContractorsTool
  | GetContractorTool
  | CreateContractorTool
  | UpdateContractorTool
  | GetContractorInvoicesTool
  | GetVaultBalanceTool
  | GetVaultStatusTool
  | GetVaultAvailableBalanceTool
  | GetVaultTransactionHistoryTool
  | ListInvoicesTool
  | GetInvoiceTool
  | GetPendingInvoicesTool
  | GetOverdueInvoicesTool
  | GetOrganizationOverviewTool
  | GetOrganizationStatisticsTool;

// Tool Executor Interface
export interface AgentToolExecutor {
  // Contractor Tools
  listContractors(args: {}): Promise<ToolResult<ContractorProfile[]>>;
  getContractor(args: { id?: string; name?: string }): Promise<ToolResult<ContractorProfile | null>>;
  createContractor(args: { name: string }): Promise<ToolResult<ContractorProfile>>;
  updateContractor(args: { id: string; name?: string }): Promise<ToolResult<ContractorProfile>>;
  // Lifecycle tools prepare an operation for owner confirmation. They never
  // mutate anything by themselves.
  archiveContractor(args: { id: string }): Promise<ToolResult<any>>;
  restoreContractor(args: { id: string }): Promise<ToolResult<any>>;
  deleteContractor(args: { id: string }): Promise<ToolResult<any>>;
  getContractorInvoices(args: { contractorId: string }): Promise<ToolResult<any[]>>;

  // Vault Tools
  getVaultBalance(args: {}): Promise<ToolResult<string>>; // yoctoNEAR string
  getVaultStatus(args: {}): Promise<ToolResult<{ funded: string; spent: string; reserved: string; available: string; limit: string | null; paused: boolean }>>;
  getVaultAvailableBalance(args: {}): Promise<ToolResult<string>>; // yoctoNEAR string
  getVaultTransactionHistory(args: {}): Promise<ToolResult<any[]>>;

  // Invoice Tools
  listInvoices(args: {}): Promise<ToolResult<any[]>>;
  getInvoice(args: { id: string }): Promise<ToolResult<any | null>>;
  getPendingInvoices(args: {}): Promise<ToolResult<any[]>>;
  getOverdueInvoices(args: {}): Promise<ToolResult<any[]>>;

  // Organization Tools
  getOrganizationOverview(args: {}): Promise<ToolResult<any>>;
  getOrganizationStatistics(args: {}): Promise<ToolResult<any>>;
}

// Tool Registry - Maps tool names to executors
export interface ToolRegistry {
  [key: string]: (args: any) => Promise<ToolResult<any>>;
}