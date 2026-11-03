export interface ExtractedBilling {
 description:string|null;
 amount:string|null;
 currency:string|null;
 workOrderReference:string|null;
 recipient:string|null;
 amountEvidence:string|null;
 questions:string[];
}
export interface BillingPreview {
 id:string;
 mode:"ai"|"deterministic";
 label:string;
 fields:ExtractedBilling;
 questions:string[];
 source:"contractor-confirmation-required";
}
