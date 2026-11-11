import { demoWorkspace } from "./demo-workspace.ts";
import type { ContractorProfile } from "../data/contractor-adapter.ts";

// Standalone simulated transfers can predate a billing profile and carry only
// its display name. Retain a profile on a conservative name/recipient match;
// never guess that a matching historical transfer belongs to somebody else.
export function assertNoDemoPaymentRecords(workspaceToken:string,profile:ContractorProfile,historicalNames:string[]=[]) {
  const workspace=demoWorkspace().state(workspaceToken);
  const names=new Set([profile.name,...historicalNames].map(name=>name.trim().toLocaleLowerCase()));
  const linked=workspace.payments.some(payment=>names.has(payment.contractor.trim().toLocaleLowerCase()) || (!!profile.wallet && payment.recipient===profile.wallet));
  if(linked) throw Error("Payment or spending-reservation history requires retention. Archive this contractor instead.");
}
