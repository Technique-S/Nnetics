"use client";
import { useState } from "react";
export function AgentInvitation({reference,contractorName}:{reference:string;contractorName?:string}) {
  const [url,setUrl]=useState("");
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);
  async function reveal(copy=false) {
    setBusy(true);setStatus("");
    try {
      const response=await fetch("/api/demo/contractors/owner/reveal-invitation",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reference})});
      const data=await response.json();
      if(!response.ok) {setUrl("");throw Error(data.error || "Invitation unavailable.");}
      const invitation=new URL(data.path,window.location.origin).href;
      setUrl(invitation);
      if(copy) {try {await navigator.clipboard.writeText(invitation);setStatus("Invitation copied.");}catch{setStatus("Select and copy the invitation below.");}}
    } catch(error) {setStatus(error instanceof Error ? error.message : "Invitation unavailable.");}
    finally {setBusy(false);}
  }
  return <section className="agent-confirmation" aria-label="Private contractor invitation">
    <h3>Portal invitation · {contractorName}</h3>
    <p>Private access expires in seven days. Anyone with this link can access this contractor’s demo records. Delivery is available for ten minutes.</p>
    <div className="ask-nnetics-actions"><button type="button" className="button secondary" disabled={busy} onClick={()=>void reveal()}>Show invitation</button><button type="button" className="button secondary" disabled={busy} onClick={()=>void reveal(true)}>Copy invitation</button></div>
    {url && <label>Private invitation<input aria-label="Private invitation URL" readOnly value={url} onFocus={event=>event.currentTarget.select()}/></label>}
    <p role="status">{busy ? "Verifying access…" : status}</p>
  </section>;
}
