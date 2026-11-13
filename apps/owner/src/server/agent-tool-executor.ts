import {billingAsset,NEAR_ASSET} from "../data/billing-assets.ts";
import {PAYABLE_FILTERS,projectPayables,matchesPayable,type PayableFilter} from "../data/payables.ts";
import { assertNoDemoPaymentRecords } from "./agent-deletion.ts";
import { executeContractorTool, contractorView } from "./agent-contractor-tools.ts";
// Agent Tool Executor - Implements the tool interface by connecting to existing backend services
import {demoIntents,previewDemoQuote} from "./demo-intents.ts";
import {DEMO_ASSETS} from "../data/demo-intents.ts";
import { contractorService } from "./contractor-service.ts";
import type { ToolResult } from "./agent-tools.ts";
import { identityService } from "./identity.ts";
import { service } from "./service.ts";
import { organizationSnapshot } from "./organization-api.ts";
import { demoContractors } from "./demo-contractors.ts";
import { demoWorkspace } from "./demo-workspace.ts";
import { lifecycleScope, lifecycleSummary, prepareLifecycle } from "./contractor-lifecycle.ts";
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

  private payableRecords() {
    if(!this.demoMode)throw Error("Payables tools do not grant live organization or payment authority.");
    const owner=this.demoOwnerToken(),token=this.demoWorkspaceToken();
    demoIntents().list(token,owner);
    const portal=demoContractors().ownerSnapshot(owner),ledger=demoWorkspace().state(token);
    return projectPayables(portal,ledger.payments).map(item=>{
      const blockers=[...item.blockers];
      if(item.stage==="Ready to Pay") {
        const quote=previewDemoQuote(item.bill.amount,"near",demoIntents().rates,item.bill.payoutAsset??NEAR_ASSET,item.bill.asset);
        if(ledger.vault.paused)blockers.push("Demo vault is paused.");
        if(BigInt(quote.total)>BigInt(ledger.vault.available))blockers.push("Insufficient simulated funds including fees.");
        if(ledger.vault.limit&&BigInt(quote.total)>BigInt(ledger.vault.limit))blockers.push("Spending policy limit exceeded.");
      }
      return {...item,invoiceDenomination:item.bill.asset,payoutAsset:billingAsset(item.bill.payoutAsset??NEAR_ASSET),amendments:item.bill.amendments??[],fundingAsset:"Selected separately by owner during payment review",blockers};
    });
  }
  async listPayables(args:{status?:string;query?:string;overdue?:boolean}):Promise<ToolResult<unknown>> {
    try {
      if(args.status&&!PAYABLE_FILTERS.includes(args.status as PayableFilter))throw Error("Unsupported payable status.");
      const all=this.payableRecords(),items=all.filter(item=>matchesPayable(item,(args.status??"All") as PayableFilter,args.query??"")&&(!args.overdue||item.overdue===true));
      return {success:true,data:{count:items.length,dueDatesUnknown:all.filter(item=>item.overdue===null).length,payables:items.map(({bill,payment,...item})=>({...item,originalInvoiceReference:bill.sourceReference??bill.reference,dueAt:bill.dueAt??null,paymentReference:payment?.reference??null}))}};
    }catch(e){return {success:false,error:e instanceof Error?e.message:"Payables access denied."};}
  }
  async getPayable(args:{id:string}):Promise<ToolResult<unknown>> {
    try {
      const record=this.payableRecords().find(item=>item.id===args.id||item.invoiceNumber===args.id);
      if(!record)throw Error("Payable access denied or not found.");
      const {bill,payment,...item}=record;
      return {success:true,data:{...item,originalInvoiceReference:bill.sourceReference??bill.reference,originalInvoiceText:bill.originalText??bill.text,conversionQuotes:demoIntents().list(this.demoWorkspaceToken(),this.demoOwnerToken()).filter(v=>v.intent.billId===bill.id).map(({intent})=>({state:intent.state,invoiceAmount:intent.invoiceAmount??bill.amount,invoiceCurrency:intent.invoiceCurrency??bill.asset,fundingAssetId:intent.sourceAssetId??intent.sourceAsset,fundingNetwork:intent.sourceChain,sourceAmount:intent.sourceAmount,payoutAssetId:intent.destinationAssetId??NEAR_ASSET,payoutNetwork:intent.destinationChain,destinationAmount:intent.destinationAmount,deliveredAmount:intent.deliveredAmount??null,feeNearEquivalent:intent.fee,simulated:true})),attachment:bill.attachment,reviewEvents:bill.reviewEvents??[],dueAt:bill.dueAt??null,paymentReference:payment?.reference??null}};
    }catch(e){return {success:false,error:e instanceof Error?e.message:"Payable access denied."};}
  }
  async listUnlinkedInvoices():Promise<ToolResult<unknown>> {
    try {
      if(!this.demoMode)throw Error("Simulation tools are demo-only.");
      if(!demoContractors().owner(this.demoOwnerToken()))throw Error("Valid demo owner authorization required.");
      if(this.orgContext.demoWorkspaceToken)demoIntents().list(this.demoWorkspaceToken(),this.demoOwnerToken());
      const invoices=demoContractors().ownerSnapshot(this.demoOwnerToken()).invoices.filter(b=>!b.orderId);
      return {success:true,data:invoices.map(b=>({id:b.id,reference:b.reference,amount:b.amount,currency:b.asset,requestedAmount:b.requestedAmount??b.amount,requestedCurrency:b.requestedAsset??b.asset,payoutAsset:billingAsset(b.payoutAsset??NEAR_ASSET),status:b.status,workOrder:"No work order"}))};
    }catch(e){return {success:false,error:e instanceof Error?e.message:"Demo access denied."};}
  }
  async getSimulatedPaymentStatus():Promise<ToolResult<unknown>> {
    try {
      if(!this.demoMode)throw Error("Simulation tools are demo-only.");
      const attempts=demoIntents().list(this.demoWorkspaceToken(),this.demoOwnerToken());
      return {success:true,data:attempts.map(({intent,audit})=>({reference:intent.reference,billId:intent.billId,state:intent.state,invoiceAmount:intent.invoiceAmount??intent.destinationAmount,invoiceCurrency:intent.invoiceCurrency??"NEAR",fundingAssetId:intent.sourceAssetId??intent.sourceAsset,fundingNetwork:intent.sourceChain,sourceAmount:intent.sourceAmount,payoutAssetId:intent.destinationAssetId??NEAR_ASSET,payoutNetwork:intent.destinationChain,destinationAmount:intent.destinationAmount,deliveredAmount:intent.deliveredAmount??null,reason:intent.reason,audit}))};
    }catch(e){return {success:false,error:e instanceof Error?e.message:"Demo access denied."};}
  }
  async previewSimulatedIntent(args:{id:string;sourceAsset:string}):Promise<ToolResult<unknown>> {
    try {
      if(!this.demoMode)throw Error("Simulation tools are demo-only.");
      demoIntents().list(this.demoWorkspaceToken(),this.demoOwnerToken());
      const ledger=demoWorkspace().state(this.demoWorkspaceToken()),store=demoContractors(),owner=this.demoOwnerToken();
      if(!store.owner(owner))throw Error("Valid demo owner authorization required.");
      const snapshot=store.ownerSnapshot(owner),bill=snapshot.invoices.find(b=>b.id===args.id);
      if(!bill)throw Error("Invoice access denied.");
      const profile=snapshot.profiles.find(p=>p.id===bill.contractorId),asset=DEMO_ASSETS.find(a=>a.id===args.sourceAsset);
      if(!asset)throw Error("Unsupported simulated asset.");
      const quote=previewDemoQuote(bill.amount,args.sourceAsset,demoIntents().rates,bill.payoutAsset??NEAR_ASSET,bill.asset),fee=BigInt(quote.fee),total=BigInt(quote.total);
      const blockers=[...projectPayables(snapshot,ledger.payments).find(p=>p.id===bill.id)!.blockers,...(bill.status!=="Approved"?["Owner invoice approval required"]:[]),...bill.reasons,...(!profile?.wallet?["Approved wallet required in Wallet Details"]:[]),...(profile?.archived?["Contractor archived"]:[]),...(ledger.vault.paused?["Demo vault paused"]:[]),...(BigInt(ledger.vault.available)<total?["Insufficient simulated funds"]:[]),...(ledger.vault.limit&&total>BigInt(ledger.vault.limit)?["Spending policy limit exceeded"]:[]),...(ledger.payments.some(p=>p.billId===bill.id&&["prepared","pending","confirmed"].includes(p.status))?["Existing active or completed payment"]:[])];
      return {success:true,data:{mode:"Demo / Simulated",billId:bill.id,reference:bill.reference,workOrder:bill.orderReference||"No work order",eligible:!blockers.length,blockers,recipient:profile?.wallet||null,source:asset,sourceAmount:quote.sourceAmount,illustrativeRate:quote.rate,mockSolver:quote.solver,savedQuote:false,invoice:{amount:bill.amount,currency:bill.asset},quoteType:"EXACT_OUTPUT",destination:{chain:quote.destination.chain,asset:quote.destination.symbol,assetId:quote.destination.id,amount:quote.destinationAmount},illustrativeFeeNear:formatNear(fee.toString()),totalNearEquivalent:formatNear(total.toString()),proposal:bill.status==="Approved"?"Review and authorize simulated payment":"Review invoice for owner approval",confirmationRequired:true,nextStep:"Open View payables. Owner approval and structured confirmation of the saved quote are required. This preview does not approve or authorize payment."}};
    }catch(e){return {success:false,error:e instanceof Error?e.message:"Demo access denied."};}
  }
  // Contractor Tools
  async listContractors(args: {query?:string;archived?:boolean;offset?:number;limit?:number}): Promise<ToolResult<any>> {
    try {
      if (!this.isDemoOperation()) return {success:false,error:"Live mode not fully implemented"};
      const store=demoContractors(),token=this.demoOwnerToken();
      if(!store.owner(token)) return {success:false,code:"owner_required",error:"Owner session required."};
      const snapshot=store.ownerSnapshot(token);
      const all=(args.archived ? snapshot.archivedProfiles ?? [] : snapshot.profiles).filter(p => !args.query || p.name.toLocaleLowerCase().includes(args.query.toLocaleLowerCase()));
      const offset=args.offset ?? 0,limit=Math.min(args.limit ?? 100,100);
      const items=all.slice(offset,offset+limit).map(contractorView);
      return {success:true,data:{count:all.length,contractors:items,nextOffset:offset+limit<all.length ? offset+limit : null}};
    } catch(error) {return {success:false,error:error instanceof Error ? error.message : "Failed to list contractors"};}
  }

  async getContractor(args: { id?: string; name?: string }): Promise<ToolResult<any | null>> {
    try {
      if (this.isDemoOperation()) {
        const store = demoContractors();
        const snapshot = store.ownerSnapshot(this.demoOwnerToken());
        let profile = args.id
          ? [...snapshot.profiles,...(snapshot.archivedProfiles ?? [])].find((p: any) => p.id === args.id)
          : undefined;
        if (!args.id && args.name) {
          const needle = args.name.trim().toLocaleLowerCase();
          const matches = [...snapshot.profiles,...(snapshot.archivedProfiles ?? [])].filter((p: any) =>
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
            ...contractorView(profile),
            wallet: profile.wallet,
            generation: profile.generation,
            archived: profile.archived === true,
            deletable: profile.deletable === true
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
            generation: createdProfile.generation,
            archived: createdProfile.archived === true,
            deletable: createdProfile.deletable === true
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
        return this.contractorLifecycleTool("update_contractor",args);
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

  async contractorLifecycleTool(name: string, args: Record<string, unknown>): Promise<ToolResult<unknown>> {
    if (!this.isDemoOperation()) return {success:false,code:"mode_unavailable",error:"Lifecycle agent tools are demo-only."};
    return executeContractorTool(this.demoOwnerToken(),name,args);
  }

  // Contractor lifecycle tools. They never mutate anything: they resolve the
  // contractor, evaluate whether the operation is allowed and register a
  // pending operation. The owner completes it with an explicit confirmation
  // in the dashboard. The confirmation secret never reaches the model.
  async archiveContractor(args: { id: string }): Promise<ToolResult<any>> {
    return this.prepareLifecycle("archive", args.id);
  }

  async restoreContractor(args: { id: string }): Promise<ToolResult<any>> {
    return this.prepareLifecycle("restore", args.id);
  }

  async deleteContractor(args: { id: string }): Promise<ToolResult<any>> {
    return this.prepareLifecycle("delete", args.id);
  }

  private prepareLifecycle(kind: "archive" | "restore" | "delete", id: string): ToolResult<any> {
    try {
      if (!this.isDemoOperation())
        return { success: false, error: "Live mode not fully implemented" };
      const store = demoContractors();
      const ownerToken = this.demoOwnerToken();
      const org = store.owner(ownerToken);
      if (!org)
        return { success: false, code: "demo_owner_required", error: "Demo owner session required. Start the contractor demo first." };
      const snapshot = store.ownerSnapshot(ownerToken);
      const profile =
        (snapshot.profiles as any[]).find((p: any) => p.id === id) ??
        ((snapshot.archivedProfiles ?? []) as any[]).find((p: any) => p.id === id);
      if (!profile)
        return { success: false, code: "contractor_not_found", error: "No contractor with that record ID exists in this demo organization." };
      if(kind === "delete") assertNoDemoPaymentRecords(this.demoWorkspaceToken(),profile,(snapshot.events ?? []).filter(event=>event.profileId===profile.id).map(event=>event.profileName));
      const eligibility = store.lifecycleEligibility(profile.id, org);
      if (kind === "delete" && !eligibility.eligible)
        return {
          success: false,
          code: "lifecycle_not_allowed",
          error: `${eligibility.reason} Offer to archive the contractor instead.`
        };
      if (kind === "archive" && profile.archived === true)
        return { success: false, code: "lifecycle_not_allowed", error: "This contractor is already archived. Use restore to bring them back." };
      if (kind === "restore" && profile.archived !== true)
        return { success: false, code: "lifecycle_not_allowed", error: "This contractor is not archived, so there is nothing to restore." };
      const operation = prepareLifecycle({
        scope: lifecycleScope(ownerToken),
        workspaceToken: kind === "delete" ? this.demoWorkspaceToken() : undefined,
        kind,
        contractorId: profile.id,
        contractorName: profile.name,
        eligibility: kind === "delete" ? eligibility : {...eligibility,eligible:true,reason:kind === "archive" ? "Archival is allowed and preserves linked records." : "Restoration is allowed; revoked portal credentials stay revoked."}
      });
      // The summary carries no confirmation secret: only the dashboard can
      // complete the operation.
      return { success: true, data: lifecycleSummary(operation) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to prepare the contractor operation"
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
        const contractor = [...snapshot.profiles,...(snapshot.archivedProfiles ?? [])].find((p: any) => p.id === args.contractorId);
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
    if(this.orgContext.demoWorkspaceToken)demoIntents().list(this.demoWorkspaceToken(),this.demoOwnerToken());
    const snapshot = demoContractors().ownerSnapshot(this.demoOwnerToken());
    const names = new Map([...snapshot.profiles,...(snapshot.archivedProfiles ?? [])].map((profile) => [profile.id, profile.name]));
    return snapshot.invoices.map((bill) => ({
      id: bill.id,
      reference: bill.reference,
      amount: bill.amount,
      currency:bill.asset,requestedAmount:bill.requestedAmount??bill.amount,requestedCurrency:bill.requestedAsset??bill.asset,payoutAsset:billingAsset(bill.payoutAsset??NEAR_ASSET),approvedAmount:bill.approval?.amount??null,amendments:bill.amendments??[],
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

  async listWorkOrders(args:{contractorId?:string;status?:string}):Promise<ToolResult<any>> {
    try { const snapshot=demoContractors().ownerSnapshot(this.demoOwnerToken()); const names=new Map([...snapshot.profiles,...(snapshot.archivedProfiles??[])].map(p=>[p.id,p.name]));
      const orders=snapshot.orders.filter(o=>(!args.contractorId||o.contractorId===args.contractorId)&&(!args.status||(o.status??"active")===args.status)).map(o=>({...o,status:o.status??"active",contractorName:names.get(o.contractorId)??null,linkedInvoiceCount:snapshot.invoices.filter(b=>b.orderId===o.id).length}));
      return {success:true,data:{count:orders.length,workOrders:orders}};
    } catch(e){return {success:false,error:e instanceof Error?e.message:"Work order access denied."};}
  }
  async getWorkOrder(args:{id:string}):Promise<ToolResult<any>> { const r=await this.listWorkOrders({}); if(!r.success)return r; const item=(r.data as any).workOrders.find((o:any)=>o.id===args.id); return {success:true,data:item??null}; }
  async createWorkOrder(args:{contractorId:string;reference:string;title:string;amount:string}):Promise<ToolResult<any>> {
    try { const store=demoContractors(),owner=this.demoOwnerToken(); store.ownerCommand(owner,{action:"create-order",profileId:args.contractorId,reference:args.reference,title:args.title,amount:args.amount} as OwnerPortalCommand); const order=store.ownerSnapshot(owner).orders.find(o=>o.reference===args.reference&&o.contractorId===args.contractorId); return {success:true,data:order??null}; } catch(e){return {success:false,error:e instanceof Error?e.message:"Work order was not created."};}
  }
  private prepareFinancial(kind:"update-work-order"|"cancel-work-order"|"review-invoice",id:string,details:Record<string,string|number|null>):ToolResult<any> {
    try { const store=demoContractors(),owner=this.demoOwnerToken(),org=store.owner(owner); if(!org) throw Error("Demo owner session required."); const snapshot=store.ownerSnapshot(owner);
      const order=kind.includes("work-order")?snapshot.orders.find(o=>o.id===id):undefined; const bill=kind==="review-invoice"?snapshot.invoices.find(b=>b.id===id):undefined;
      const contractorId=order?.contractorId??bill?.contractorId; const profile=[...snapshot.profiles,...(snapshot.archivedProfiles??[])].find(p=>p.id===contractorId); if(!profile) throw Error(kind==="review-invoice"?"Invoice access denied.":"Work order access denied.");
      if(order&&((order.status??"active")==="cancelled"||snapshot.invoices.some(b=>b.orderId===order.id))) throw Error("This work order is no longer eligible: linked invoices or cancellation prevent the change.");
      if(order) details={...details,orderId:order.id};
      if(bill){ const decision=String(details.decision); if(!["approve","reject","clarify"].includes(decision)) throw Error("Invalid review decision."); if(!["Submitted","Under review","In review","Needs clarification"].includes(bill.status)) throw Error("Invoice review is already complete."); const discrepancies=[...bill.reasons,...(bill.orderId&&snapshot.orders.find(o=>o.id===bill.orderId)?.amount!==bill.amount?["Invoice amount differs from linked work order."]:[])]; if(decision==="approve"&&discrepancies.length) throw Error(`Approval blocked: ${discrepancies.join(" ")}`); if((decision==="reject"||decision==="clarify")&&!String(details.note??"").trim()) throw Error("A review note is required for rejection or clarification."); details={...details,invoiceId:bill.id,status:bill.status,amount:bill.amount,asset:bill.asset,orderId:bill.orderId||null,discrepancies:discrepancies.join(" | ")}; }
      const op=prepareLifecycle({scope:lifecycleScope(owner),kind,contractorId:profile.id,contractorName:profile.name,eligibility:{eligible:true,reason:"Eligible; the current record will be revalidated at confirmation.",linked:{bills:0,orders:0,uploads:0,activeLinks:0}},details}); return {success:true,data:lifecycleSummary(op)};
    }catch(e){return {success:false,error:e instanceof Error?e.message:"Unable to prepare action."};}
  }
  async updateWorkOrder(args:{id:string;title?:string;amount?:string}):Promise<ToolResult<any>> { if(args.title===undefined&&args.amount===undefined)return {success:false as const,error:"Specify a work-order field to update."}; return this.prepareFinancial("update-work-order",args.id,{title:args.title??null,amount:args.amount??null}); }
  async cancelWorkOrder(args:{id:string}):Promise<ToolResult<any>> { return this.prepareFinancial("cancel-work-order",args.id,{}); }
  async reviewInvoice(args:{id:string;decision:string;note?:string}):Promise<ToolResult<any>> { return this.prepareFinancial("review-invoice",args.id,{decision:args.decision,note:args.note??""}); }
  async getInvoicePaymentReadiness(args:{id:string}):Promise<ToolResult<any>> { const r=await this.previewSimulatedIntent({id:args.id,sourceAsset:"near"}); if(!r.success)return r; const d=r.data as any; return {success:true,data:{invoiceId:d.billId,reference:d.reference,eligible:d.eligible,blockers:d.blockers,recipient:d.recipient,approvalRequired:d.invoice?.status!=="Approved",paymentExecution:"not available through Ask Nnetics"}}; }

  async getPendingInvoices(args: {}): Promise<ToolResult<any[]>> {
    // Legacy helper, not exposed in the model tool catalog. No throwing work
    // occurs here; keep its existing empty result without an unreachable catch.
    return { success: true, data: [] };
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








