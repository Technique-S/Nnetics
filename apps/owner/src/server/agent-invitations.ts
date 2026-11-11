import crypto from "node:crypto";
import { demoContractors } from "./demo-contractors.ts";
import { lifecycleScope } from "./contractor-lifecycle.ts";

// Raw invitations are held only on the server, for a short delivery window.
// Restart loses delivery references, never reactivates a credential.
const invitations = new Map<string,{scope:string;contractorId:string;generation:number;token:string;expiresAt:number}>();
export function issueAgentInvitation(owner:string,contractorId:string) {
  const store=demoContractors();
  const result=store.ownerCommand(owner,{action:"issue-link",profileId:contractorId});
  if(!result.token) throw Error("Invitation issuance failed.");
  const profile=store.ownerSnapshot(owner).profiles.find(p=>p.id===contractorId)!;
  const reference=crypto.randomUUID(),now=Date.now();
  for(const [key,value] of invitations) if(value.expiresAt<=now || value.contractorId===contractorId) invitations.delete(key);
  while(invitations.size>=500) invitations.delete(invitations.keys().next().value!);
  invitations.set(reference,{scope:lifecycleScope(owner),contractorId,generation:profile.generation,token:result.token,expiresAt:now+10*60*1000});
  return {invitationReference:reference,contractorId,contractorName:profile.name,status:"active",deliveryExpiresAt:now+10*60*1000};
}
export function revealAgentInvitation(owner:string,reference:string) {
  const store=demoContractors();
  if(!store.owner(owner)) throw Error("Owner authentication required.");
  const delivery=invitations.get(reference);
  if(!delivery || delivery.scope!==lifecycleScope(owner) || delivery.expiresAt<=Date.now()) throw Error("Invitation delivery expired or unavailable. Ask to prepare a new invitation.");
  const profile=store.ownerSnapshot(owner).profiles.find(p=>p.id===delivery.contractorId);
  if(!profile || profile.archived || !profile.linkActive || profile.generation!==delivery.generation) throw Error("This invitation was revoked or replaced.");
  // Recheck actual token expiry and revocation without creating a session.
  if(store.portalStatus(owner,profile.id).status!=="active") throw Error("This invitation has expired or been revoked.");
  return {path:`/contractor?mode=demo#${delivery.token}`};
}
