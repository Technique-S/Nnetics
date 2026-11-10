// Agent Tool Executor - Implements the tool interface by connecting to existing backend services
import { contractorService } from "./contractor-service.ts";
import type { ToolResult } from "./agent-tools.ts";
import { identityService } from "./identity.ts";
import { service } from "./service.ts";
import { organizationSnapshot } from "./organization-api.ts";
import { demoContractors } from "./demo-contractors.ts";
import { demoWorkspace } from "./demo-workspace.ts";
import { amountFromNear, formatNear } from "../data/owner-adapter.ts";
import type { ContractorProfile, OwnerPortalCommand } from "../data/contractor-adapter.ts";
import type { OwnerSnapshot } from "../data/owner-adapter.ts";
import type { DemoWorkspaceSnapshot } from "./demo-workspace.ts";
import type { Identity } from "./identity.ts";

export class AgentToolExecutor implements AgentToolExecutor {
  private readonly demoMode: boolean;
  private readonly orgContext: { orgId: string; isDemo: boolean; demoContext?: any; liveContext?: any; demoWorkspaceToken?: string; demoPortalToken?: string };

  constructor(demoMode: boolean, orgContext: { orgId: string; isDemo: boolean; demoContext?: any; liveContext?: any; demoWorkspaceToken?: string; demoPortalToken?: string }) {
    this.demoMode = demoMode;
    this.orgContext = orgContext;
  }

  // Helper to determine if we're in demo mode for a specific operation
  private isDemoOperation(): boolean {
    return this.demoMode || this.orgContext.orgId === "demo";
  }

  // Never fall back to a placeholder owner token: without the signed demo owner
  // cookie there is no organization to read or mutate.
  private demoOwnerToken(): string {
    const token = this.orgContext.demoPortalToken;
    if (!token) throw new Error("Demo owner session required. Start the contractor demo first.");
    return token;
  }

  // The vault is a separate demo session from the contractor owner portal.
  // Never substitute a placeholder token: without the signed workspace cookie
  // there is no ledger to read or change.
  private demoWorkspaceToken(): string {
    const token = this.orgContext.demoWorkspaceToken;
    if (!token) throw new Error("Demo workspace session required. Start the demo first.");
    return token;
  }

  // Contractor Tools
  async listContractors(args: {}): Promise<ToolResult<any[]>> {
    try {
      if (this.isDemoOperation()) {
        const store = demoContractors();
        // Get contractor profiles from demo store
        // In a real implementation, we'd get the token from demoContext
        const snapshot = store.ownerSnapshot(this.demoOwnerToken()); // TODO: get from context
        return {
          success: true,
          data: (snapshot as any).profiles.map((p: any) => ({
            id: p.id,
            name: p.name,
            wallet: p.wallet,
            generation: p.generation
          }))
        };
      } else {
        // Live mode - would get from organization context
        // For now, return not implemented to focus on demo mode
        return { success: false, error: "Live mode not fully implemented" };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list contractors"
      };
    }
  }

  async getContractor(args: { id?: string; name?: string }): Promise<ToolResult<any | null>> {
    try {
      if (this.isDemoOperation()) {
        const store = demoContractors();
        const snapshot = store.ownerSnapshot(this.demoOwnerToken());
        let profile = args.id
          ? (snapshot as any).profiles.find((p: any) => p.id === args.id)
          : undefined;
        if (!profile && args.name) {
          const needle = args.name.trim().toLocaleLowerCase();
          const matches = (snapshot as any).profiles.filter((p: any) =>
            String(p.name).trim().toLocaleLowerCase() === needle);
          if (matches.length > 1) {
            return {
              success: false,
              code: "ambiguous_contractor",
              error: `Several contractors match "${args.name.trim()}": ${matches.map((p: any) => `${p.name} (ID: ${p.id})`).join(", ")}. Ask which one the user means.`
            };
          }
          profile = matches[0];
        }
        if (!profile) {
          return { success: true, data: null }; // Not found
        }
        return {
          success: true,
          data: {
            id: profile.id,
            name: profile.name,
            wallet: profile.wallet,
            generation: profile.generation
          }
        };
      } else {
        return { success: false, error: "Live mode not fully implemented" };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get contractor"
      };
    }
  }

  async createContractor(args: { name: string }): Promise<ToolResult<any>> {
    try {
      if (this.isDemoOperation()) {
        const store = demoContractors();
        const ownerToken = this.demoOwnerToken();
        const result = store.ownerCommand(ownerToken, { action: "create-profile", name: args.name } as OwnerPortalCommand);

        // Use the exact persisted record returned by the store. Falling back to
        // a name lookup only supports older callers that do not return profileId.
        const snapshot = store.ownerSnapshot(ownerToken);
        const createdProfile = result.profileId
          ? (snapshot as any).profiles.find((p: any) => p.id === result.profileId)
          : (snapshot as any).profiles.find((p: any) => p.name === args.name);

        if (!createdProfile) {
          return { success: false, error: "The contractor was not persisted. Nothing was created." };
        }

        return {
          success: true,
          data: {
            id: createdProfile.id,
            name: createdProfile.name,
            wallet: createdProfile.wallet,
            generation: createdProfile.generation
          }
        };
      } else {
        return { success: false, error: "Live mode not fully implemented" };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create contractor"
      };
    }
  }

  async updateContractor(args: { id: string; name?: string }): Promise<ToolResult<any>> {
    try {
      if (this.isDemoOperation()) {
        // For demo mode update, we would need to modify the profile
        // This is simplified - in reality we'd fetch, update, and save
        return { success: false, error: "Update not implemented in demo mode" };
      } else {
        return { success: false, error: "Live mode not fully implemented" };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update contractor"
      };
    }
  }

  async getContractorInvoices(args: { contractorId: string }): Promise<ToolResult<any[]>> {
    try {
      if (this.isDemoOperation()) {
        const store = demoContractors();
        // Owner-scoped snapshot: a contractor session token is not an owner
        // capability, and contractor invoices must stay inside this owner org.
        const snapshot = store.ownerSnapshot(this.demoOwnerToken());
        const contractor = (snapshot as any).profiles.find((p: any) => p.id === args.contractorId);
        if (!contractor) {
          return { success: false, code: "contractor_not_found", error: "No contractor with that record ID exists in this demo organization." };
        }
        return {
          success: true,
          data: (snapshot as any).invoices
            .filter((inv: any) => inv.contractorId === args.contractorId)
            .map((inv: any) => ({
              id: inv.id,
              reference: inv.reference,
              amount: inv.amount,
              status: inv.status,
              description: inv.description,
              contractorId: inv.contractorId,
              contractorName: contractor.name,
              orderReference: inv.orderReference
            }))
        };
      } else {
        return { success: false, error: "Live mode not fully implemented" };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get contractor invoices"
      };
    }
  }

  // Vault Tools
  async getVaultBalance(args: {}): Promise<ToolResult<string>> {
    try {
      if (this.isDemoOperation()) {
        // Demo mode - get from demo workspace
        const demoWs = demoWorkspace();
        // Simplified - would get from actual demo workspace context
        const snapshot = demoWs.state(this.demoWorkspaceToken());
        return {
          success: true,
          data: (snapshot as any).vault.funded // Total funded amount
        };
      } else {
        // Live mode - would get from organization snapshot
        return { success: false, error: "Live mode vault balance not implemented" };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get vault balance"
      };
    }
  }

  async getVaultStatus(args: {}): Promise<ToolResult<any>> {
    try {
      if (this.isDemoOperation()) {
        const demoWs = demoWorkspace();
        const snapshot = demoWs.state(this.demoWorkspaceToken());
        const vault = (snapshot as any).vault;
        return {
          success: true,
          data: {
            funded: vault.funded,
            spent: vault.spent,
            reserved: vault.reserved,
            available: vault.available,
            limit: vault.limit || null,
            // The demo vault's real pause state. A paused demo vault refuses
            // every new simulated payment until it is resumed.
            paused: vault.paused === true
          }
        };
      } else {
        return { success: false, error: "Live mode vault status not implemented" };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get vault status"
      };
    }
  }

  async getVaultAvailableBalance(args: {}): Promise<ToolResult<string>> {
    try {
      if (this.isDemoOperation()) {
        const demoWs = demoWorkspace();
        const snapshot = demoWs.state(this.demoWorkspaceToken());
        return {
          success: true,
          data: (snapshot as any).vault.available
        };
      } else {
        return { success: false, error: "Live mode available balance not implemented" };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get available balance"
      };
    }
  }

  async getVaultTransactionHistory(args: {}): Promise<ToolResult<any[]>> {
    try {
      if (this.isDemoOperation()) {
        const demoWs = demoWorkspace();
        const snapshot = demoWs.state(this.demoWorkspaceToken());
        const payments = new Map((snapshot as any).payments.map((payment: any) => [payment.id, payment]));
        return {
          success: true,
          data: (snapshot as any).history.map((hist: any) => {
            const payment = payments.get(hist.id) as any;
            return {
              id: hist.id,
              type: hist.kind,
              label: hist.label,
              amount: hist.amount,
              amountNear: hist.amount,
              status: hist.status,
              timestamp: hist.at,
              contractor: payment?.contractor || null,
              reference: payment?.reference || null
            };
          })
        };
      } else {
        return { success: false, error: "Live mode transaction history not implemented" };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get vault transaction history"
      };
    }
  }

  // Invoice Tools. Demo invoices are contractor bills in the owner portal, not
  // confirmed payment receipts in the vault ledger. Keeping the two apart stops
  // the model from reporting a paid receipt as an outstanding invoice.
  private demoInvoices() {
    const snapshot = demoContractors().ownerSnapshot(this.demoOwnerToken());
    const names = new Map(snapshot.profiles.map((profile) => [profile.id, profile.name]));
    return snapshot.invoices.map((bill) => ({
      id: bill.id,
      reference: bill.reference,
      amount: bill.amount,
      status: bill.status,
      description: bill.description,
      contractorId: bill.contractorId,
      contractorName: names.get(bill.contractorId) ?? null,
      orderReference: bill.orderReference ?? null,
      submittedAt: bill.submittedAt,
    }));
  }

  async listInvoices(args: {}): Promise<ToolResult<any[]>> {
    try {
      if (this.isDemoOperation()) {
        return { success: true, data: this.demoInvoices() };
      }
      return { success: false, error: "Live mode invoices not implemented" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list invoices"
      };
    }
  }

  async getInvoice(args: { id: string }): Promise<ToolResult<any | null>> {
    try {
      if (this.isDemoOperation()) {
        return { success: true, data: this.demoInvoices().find((invoice) => invoice.id === args.id) ?? null };
      }
      return { success: false, error: "Live mode get invoice not implemented" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get invoice"
      };
    }
  }

  async getPendingInvoices(args: {}): Promise<ToolResult<any[]>> {
    try {
      return { success: true, data: [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get pending invoices"
      };
    }
  }

  async getOverdueInvoices(args: {}): Promise<ToolResult<any[]>> {
    try {
      // Similar to pending but with overdue logic - simplified for now
      if (this.isDemoOperation()) {
        if (this.demoMode) {
          const demoWs = demoWorkspace();
          const snapshot = demoWs.state(this.demoWorkspaceToken());
          // For demo, we'll treat overdue as pending for simplicity
          const pendingPayments = (snapshot as any).payments.filter((p: any) => p.status === "pending");
          return {
            success: true,
            data: pendingPayments.map((p: any) => ({
              id: p.id,
              contractor: p.contractor,
              amount: p.total,
              description: p.description,
              status: p.status
            }))
          };
        } else {
          // Demo contractor mode
          return { success: true, data: [] }; // Simplified
        }
      } else {
        return { success: false, error: "Live mode overdue invoices not implemented" };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get overdue invoices"
      };
    }
  }

  // Organization Tools
  async getOrganizationOverview(args: {}): Promise<ToolResult<any>> {
    try {
      if (this.isDemoOperation()) {
        const workspace = demoWorkspace().state(this.demoWorkspaceToken());
        const portal = demoContractors().ownerSnapshot(this.demoOwnerToken());
        const outstanding = portal.invoices.filter((bill) => bill.status === "Approved");
        let outstandingYocto = 0n;
        for (const bill of outstanding) {
          try {
            outstandingYocto += BigInt(amountFromNear(bill.amount));
          } catch {
            // A malformed legacy amount is omitted rather than aborting the
            // whole overview; the count still reflects the record.
          }
        }
        return {
          success: true,
          data: {
            name: workspace.profile.vaultName || workspace.profile.name || "Demo Organization",
            mode: "demo",
            contractorCount: portal.profiles.length,
            invoiceCount: portal.invoices.length,
            orderCount: portal.orders.length,
            outstandingApprovedCount: outstanding.length,
            outstandingApprovedYoctoNEAR: outstandingYocto.toString(),
            outstandingApprovedNear: formatNear(outstandingYocto.toString()),
            vault: {
              fundedYoctoNEAR: workspace.vault.funded,
              fundedNear: formatNear(workspace.vault.funded),
              spentYoctoNEAR: workspace.vault.spent,
              spentNear: formatNear(workspace.vault.spent),
              reservedYoctoNEAR: workspace.vault.reserved,
              reservedNear: formatNear(workspace.vault.reserved),
              availableYoctoNEAR: workspace.vault.available,
              availableNear: formatNear(workspace.vault.available),
              paused: workspace.vault.paused === true,
            },
          }
        };
      }
      return { success: false, error: "Live mode organization overview not implemented" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get organization overview"
      };
    }
  }

  async getOrganizationStatistics(args: {}): Promise<ToolResult<any>> {
    try {
      // For now, return similar to overview
      return await this.getOrganizationOverview(args);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get organization statistics"
      };
    }
  }
}








