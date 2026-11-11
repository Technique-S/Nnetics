import {billingAsset,NEAR_ASSET} from "./billing-assets.ts";
import type {ContractorBill,ContractorProfile,PortalSnapshot} from "./contractor-adapter.ts";
import type {DemoWsPayment} from "./demo-workspace-adapter.ts";

export const PAYABLE_FILTERS=["All","Awaiting Approval","Ready to Pay","Processing","Paid","Rejected / Failed"] as const;
export type PayableFilter=typeof PAYABLE_FILTERS[number];
export type PayableStage=Exclude<PayableFilter,"All">;
export interface Payable {
    id:string;invoiceNumber:string;contractor:string;description:string;bill:ContractorBill;
    requestedAmount:string;requestedCurrency:string;approvedAmount:string|null;approvedCurrency:string|null;
    remainingAmount:string;recipient:string|null;recordedRecipient:string|null;approver:string|null;approvedAt:string|null;
    adjustmentReason:string|null;stage:PayableStage;approvalStatus:string;invoiceStatus:string;paymentStatus:string;
    failed:boolean;payment:DemoWsPayment|null;overdue:boolean|null;blockers:string[];
}

// Presentation only: no invoice/payment writes, conversions or execution authority.
export function payableFor(bill:ContractorBill,profile:ContractorProfile|undefined,payments:readonly DemoWsPayment[]=[],mode:PortalSnapshot["mode"]="simulation",now=Date.now()):Payable {
    const attempts=payments.filter(p=>p.billId===bill.id);
    const payment=attempts.find(p=>p.status==="confirmed") ?? attempts.find(p=>p.status==="pending"||p.status==="prepared") ?? attempts[0] ?? null;
    const paid=payment?.status==="confirmed" || bill.payment?.confirmed===true || (mode==="simulation"&&bill.status==="Paid");
    const processing=!!payment&&["prepared","pending"].includes(payment.status) || !!bill.payment&&["queued","prepared","preparing","signing","pending","broadcast","submitted","confirming","unknown","paid","retry","reconciling"].includes(bill.payment.state);
    const failed=payment?.status==="failed"||payment?.status==="cancelled"||["failed","blocked"].includes(bill.payment?.state??"");
    const approved=["Approved","Paid"].includes(bill.status);
    const stage:PayableStage=paid?"Paid":bill.status==="Rejected"?"Rejected / Failed":processing?"Processing":bill.status==="Approved"?"Ready to Pay":bill.status==="Paid"?"Processing":"Awaiting Approval";
    const requestedAmount=bill.requestedAmount??bill.amount,requestedCurrency=bill.requestedAsset??bill.asset;
    const approvedAmount=approved?(bill.approval?.amount??bill.amount):null,approvedCurrency=approved?(bill.approval?.asset??bill.asset):null;
    const blockers=[...bill.reasons];
    const payout=billingAsset(bill.payoutAsset??NEAR_ASSET);
    if(bill.amendments?.some(a=>a.state==="proposed"))blockers.push("Contractor acknowledgment of the proposed revised amount is required.");
    if(!payout||payout.chain!=="NEAR")blockers.push("Unsupported payout route: Wallet Details currently approves NEAR destinations only.");
    if(mode==="persistent"&&(bill.asset!=="NEAR"||(bill.payoutAsset??NEAR_ASSET)!==NEAR_ASSET))blockers.push("Live settlement supports native NEAR only. Invoice review is available; multi-currency settlement is not enabled.");
    if(!approved)blockers.push("Invoice approval required.");
    if(!profile?.wallet)blockers.push("Approved wallet required in Wallet Details.");
    if(profile?.archived)blockers.push("Contractor is archived.");
    if(mode==="persistent"&&!paid&&bill.recipient&&profile?.wallet&&bill.recipient!==profile.wallet)blockers.push("The recorded recipient differs from the current approved wallet. Recipient revalidation is required before payment.");
    if(bill.payment?.reason&&!paid)blockers.push(bill.payment.reason);
    if(processing)blockers.push("An existing payment is processing; do not pay again.");
    if(paid)blockers.push("This payable is already paid.");
    if(mode==="persistent"&&bill.status==="Paid"&&!bill.payment?.confirmed)blockers.push("Verified settlement evidence is unavailable.");
    const due=bill.dueAt?Date.parse(bill.dueAt):NaN;
    return {id:bill.id,invoiceNumber:bill.reference,contractor:profile?.name??"Contractor unavailable",description:bill.description,bill,
        requestedAmount,requestedCurrency,approvedAmount,approvedCurrency,remainingAmount:paid?"0":approvedAmount??bill.amount,
        recipient:profile?.wallet??null,recordedRecipient:payment?.recipient??bill.recipient??null,approver:bill.approval?.by??null,approvedAt:bill.approval?.at??null,
        adjustmentReason:bill.approval?.adjustmentReason??null,stage,approvalStatus:approved&&bill.status==="Paid"?"Approved":bill.status,invoiceStatus:bill.status,
        paymentStatus:paid?"Settled":processing?(payment?.status==="prepared"?"Authorized · funds reserved":"Processing"):payment?.reason||bill.payment?.reason||(failed?"Last attempt failed · available for retry":"Not started"),
        failed,payment,overdue:Number.isFinite(due)?!paid&&due<now:null,blockers};
}
export function projectPayables(snapshot:PortalSnapshot,payments:readonly DemoWsPayment[]=[],now=Date.now()):Payable[] {
    const profiles=new Map([...snapshot.profiles,...(snapshot.archivedProfiles??[])].map(p=>[p.id,p]));
    return snapshot.invoices.map(b=>payableFor(b,profiles.get(b.contractorId),payments,snapshot.mode,now));
}
export function matchesPayable(item:Payable,filter:PayableFilter,query=""):boolean {
    const state=filter==="All"||item.stage===filter||(filter==="Rejected / Failed"&&item.failed);
    const needle=query.trim().toLocaleLowerCase();
    return state&&(!needle||[item.invoiceNumber,item.contractor,item.description,item.bill.orderReference,item.bill.sourceReference,item.recipient].some(value=>value?.toLocaleLowerCase().includes(needle)));
}
