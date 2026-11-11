"use client";
import { AgentInvitation } from "./agent-invitation";
import { useEffect, useRef, useState } from "react";

export interface ContractorConfirmation {
  kind: "confirm-contractor-lifecycle";
  operationId: string;
  secret: string;
  contractorId?: string;
  contractorName?: string;
  actionKind?: string;
  consequence?: string;
  expiresAt?: number;
  details?: Record<string, string | number | null>;
}
export function AgentConfirmation({ action }: {action: ContractorConfirmation}) {
  const [state,setState] = useState("proposed");
  const [invitation,setInvitation]=useState<{invitationReference:string;contractorName:string}|null>(null);
  const [error,setError] = useState("");
  const status = useRef<HTMLParagraphElement>(null);
  const executing = useRef(false);
  useEffect(() => {
    setState("awaiting_confirmation");
    const timer = setTimeout(() => setState(old => ["proposed","awaiting_confirmation"].includes(old) ? "expired" : old),Math.max(0,(action.expiresAt ?? Date.now())-Date.now()));
    return () => clearTimeout(timer);
  },[action.expiresAt]);
  async function decide(cancel:boolean) {
    if(executing.current || !["proposed","awaiting_confirmation"].includes(state)) return;
    executing.current=true;setState("executing");setError("");
    try {
      const response=await fetch(`/api/demo/contractors/owner/${cancel ? "cancel" : "confirm"}-lifecycle`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operationId:action.operationId,secret:action.secret})});
      const data=await response.json();
      if(!response.ok) throw Error(data.error || "The operation could not be verified. Review current records before preparing it again.");
      if(data.invitation) setInvitation(data.invitation);
      setState(cancel ? "cancelled" : "completed");
      if(!cancel) window.dispatchEvent(new Event("nnetics-contractor-changed"));
    } catch(e) {setState((action.expiresAt ?? Infinity)<=Date.now() ? "expired" : "failed");setError(e instanceof Error ? e.message : "Request failed.");}
    finally {executing.current=false;requestAnimationFrame(()=>status.current?.focus());}
  }
  const pending=["proposed","awaiting_confirmation"].includes(state);
  return <section className="agent-confirmation" aria-label={`${action.actionKind ?? "Contractor action"} confirmation`}>
    <h3>{(action.actionKind ?? "Contractor action").replaceAll("-"," ")} · {action.contractorName}</h3>
    <p>Contractor ID: {action.contractorId}</p>
    <p>{action.consequence}</p>
    {action.details && <dl>{Object.entries(action.details).map(([key,value])=><div key={key}><dt>{key.replaceAll(/([A-Z])/g," $1")}</dt><dd>{value === null ? "None" : String(value)}</dd></div>)}</dl>}
    <p ref={status} tabIndex={-1} role="status">{state === "awaiting_confirmation" ? "Awaiting confirmation" : state.charAt(0).toUpperCase()+state.slice(1)}{error ? `: ${error}` : ""}</p>
    {invitation && <AgentInvitation reference={invitation.invitationReference} contractorName={invitation.contractorName}/>}
    {pending && <div className="ask-nnetics-actions"><button type="button" className="button primary" onClick={()=>void decide(false)}>Confirm {action.actionKind?.replaceAll("-"," ") ?? "action"}</button><button type="button" className="button secondary" onClick={()=>void decide(true)}>Cancel</button></div>}
  </section>;
}
