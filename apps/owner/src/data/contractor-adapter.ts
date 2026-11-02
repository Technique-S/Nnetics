// Demo-only DTOs. No chain client, signing or payment execution interface.
export interface WalletRequest {
    id: string;
    account: string;
    baseVersion: number;
    generation: number;
    simulatedProof: boolean;
    publicKey?: string;
    verifiedAt?: number;
}
export interface ContractorProfile {
    id: string;
    name: string;
    generation: number;
    linkActive: boolean;
    wallet: string | null;
    walletVersion: number;
    pendingWallet: WalletRequest | null;
}
export interface ContractorOrder {
    id: string;
    reference: string;
    contractorId: string;
    title: string;
    amount: string;
    recipient: string;
}
export interface BillFields {
    reference?: string; // Read-only reference assigned by server; legacy source labels are ignored.
    orderId: string;
    amount: string;
    asset: string;
    recipient: string;
}
export interface BillAttachment {
    id: string;
    name: string;
    mime: string;
    size: number;
}
export interface ContractorBill extends BillFields {
    reference: string;
    id: string;
    contractorId: string;
    text: string;
    originalText?: string;
    description: string;
    status: "Submitted" | "Under review" | "In review" | "Needs clarification" | "Approved" | "Rejected" | "Paid";
    reasons: string[];
    ownerNote: string;
    attachment: BillAttachment | null;
    transactionUrl: string | null;
    submittedAt: string;
}
export interface PortalSnapshot {
    mode: "simulation" | "persistent";
    profiles: ContractorProfile[];
    orders: ContractorOrder[];
    invoices: ContractorBill[];
}
export interface ContractorSnapshot {
    mode: "simulation" | "persistent";
    profile: ContractorProfile;
    orders: ContractorOrder[];
    invoices: ContractorBill[];
}
export type OwnerPortalCommand = {
    action: "create-profile";
    name: string;
} | {
    action: "issue-link" | "revoke-link";
    profileId: string;
} | {
    action: "approve-wallet" | "reject-wallet";
    profileId: string;
    requestId: string;
} | {
    action: "create-order";
    profileId: string;
    reference: string;
    title: string;
    amount: string;
} | {
    action: "review-invoice";
    invoiceId: string;
    decision: "approve" | "clarify" | "reject" | "begin-review";
    note: string;
};
export type ContractorCommand = {
    action: "wallet-challenge";
    account: string;
} | {
    action: "wallet-proof";
    challenge: string;
} | {
    action: "submit-invoice" | "clarify-invoice";
    invoiceId?: string;
    submissionId?: string;
    fields: BillFields;
    text: string;
    description: string;
    attachmentId?: string;
};
export function parseBill(text: string): Partial<BillFields> {
    // Deliberately deterministic labels, never AI or executable instructions.
    const line = (label: string) => {
        const values = Array.from(text.matchAll(new RegExp(`^${label}:[ \\t]*(.+)$`, "gim")), m => m[1].trim());
        if (new Set(values).size > 1)
            throw Error(`Conflicting ${label.toLowerCase()} details. Clarify them before formatting.`);
        return values[0];
    };
    const money = line("Amount")?.match(/^(\d+(?:\.\d+)?)\s+([A-Za-z]+)$/);
    return { reference: line("Invoice"), orderId: line("Work order"), amount: money?.[1], asset: money?.[2]?.toUpperCase(), recipient: line("Wallet") };
}
export function safeTransactionLink(url: string | null): string | null {
    if (!url)
        return null;
    return /^https:\/\/testnet\.nearblocks\.io\/txns\/[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(url) ? url : null;
}
export interface ContractorPortalAdapter {
    readonly mode: "simulation" | "persistent";
    snapshot(): Promise<ContractorSnapshot>;
    command(input: ContractorCommand): Promise<{
        challenge?: string;
    }>;
    upload(file: File): Promise<BillAttachment>;
}

export interface ContractorOwnerAdapter {
 readonly mode:"simulation"|"persistent";
 snapshot():Promise<PortalSnapshot>;
 command(input:OwnerPortalCommand):Promise<{token?:string}>;
 start?():Promise<void>;
}
export interface WalletChallenge {nonce:string;message:string;recipient:string;accountId:string;}
async function persistentRequest<T>(path:string,body?:unknown):Promise<T>{
 const r=await fetch(`/api/live/contractors/${path}`,{method:body===undefined?"GET":"POST",credentials:"same-origin",cache:"no-store",...(body===undefined?{}:{headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),signal:AbortSignal.timeout(90000)});
 const data=await r.json();if(!r.ok)throw Error(data.error||"Private contractor access unavailable.");return data as T;
}
export class PersistentContractorAdapter implements ContractorPortalAdapter {
 readonly mode="persistent" as const;
 async enter(token:string){await persistentRequest("enter",{token});}
 snapshot(){return persistentRequest<ContractorSnapshot>("contractor");}
 command(input:ContractorCommand){return persistentRequest<{challenge?:string}>("contractor",input);}
 challenge(account:string){return persistentRequest<WalletChallenge>("wallet/challenge",{account});}
 proof(input:WalletChallenge&{accountId:string;publicKey:string;signature:string}){return persistentRequest("wallet/proof",input);}
 async upload(file:File){const form=new FormData();form.set("file",file);const r=await fetch("/api/live/contractors/upload",{method:"POST",body:form,credentials:"same-origin"});const data=await r.json();if(!r.ok)throw Error(data.error||"Upload failed.");return data as BillAttachment;}
}
export class PersistentContractorOwnerAdapter implements ContractorOwnerAdapter {
 readonly mode="persistent" as const;
 readonly organization:string;
 constructor(organization:string){this.organization=organization;}
 snapshot(){return persistentRequest<PortalSnapshot>(`owner?organization=${encodeURIComponent(this.organization)}`);}
 command(input:OwnerPortalCommand){return persistentRequest<{token?:string}>("owner",{...input,organization:this.organization});}
}
async function request<T>(path: string, body?: unknown): Promise<T> {
    const r = await fetch(`/api/demo/contractors/${path}`, { method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store",
        ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
    const data = await r.json();
    if (!r.ok)
        throw Error(data.error || "Demo access unavailable.");
    return data as T;
}
export class MockContractorAdapter implements ContractorPortalAdapter {
    readonly mode = "simulation" as const;
    async enter(token: string) { await request("enter", { token }); }
    snapshot() { return request<ContractorSnapshot>("contractor"); }
    command(input: ContractorCommand) { return request<{
        challenge?: string;
    }>("contractor", input); }
    async upload(file: File) {
        const form = new FormData();
        form.set("file", file);
        const r = await fetch("/api/demo/contractors/upload", { method: "POST", body: form });
        const data = await r.json();
        if (!r.ok)
            throw Error(data.error);
        return data as BillAttachment;
    }
}
export class MockContractorOwnerAdapter {
    readonly mode = "simulation" as const;
    async start() { await request("owner/start", {}); }
    snapshot() { return request<PortalSnapshot>("owner"); }
    command(input: OwnerPortalCommand) { return request<{
        token?: string;
    }>("owner", input); }
}
