"use client";

import {useRef, useState} from "react";
import {amountFromNear, formatNear} from "../data/owner-adapter";
import type {ContractorPaymentDraft} from "../data/mock-adapter";
import {ActionButton} from "./action-button";

export type PayContractor = (draft: ContractorPaymentDraft) => Promise<void>;

export function ContractorPaymentForm({id,name,wallet,onPay,limit,blocked}:{
  id:string; name:string; wallet:string; onPay?:PayContractor; limit?:string; blocked?:string;
}) {
  const [draft,setDraft] = useState<ContractorPaymentDraft|null>(null);
  const [error,setError] = useState("");
  const [sent,setSent] = useState(false);
  const [busy,setBusy] = useState(false);
  const locked = useRef(false);
  return <details className="reference-disclosure">
    <summary>Prepare payment</summary>
    {draft ? <section aria-label="Review payment">
      <h4>Review payment</h4>
      <dl className="payment-draft-details">
        <dt>Contractor</dt><dd>{draft.name}</dd>
        <dt>Payout wallet</dt><dd>{draft.recipient}</dd>
        <dt>Amount</dt><dd>{formatNear(draft.amount)} NEAR</dd>
        <dt>Description</dt><dd>{draft.description}</dd>
        <dt>Network</dt><dd>{onPay ? "Local simulation · no funds move" : "NEAR testnet"}</dd>
        <dt>Fees</dt><dd>{onPay ? "No network fee" : "No fee quoted. A reviewed transaction plan is required before signing."}</dd>
        {limit !== undefined && <><dt>Per-payment limit</dt><dd>{formatNear(limit)} NEAR</dd></>}
      </dl>
      {sent ? <p role="status">Simulated attempt recorded. Check History for the outcome.</p> : <>
        {!onPay && <p role="status">{blocked || "Direct payment needs separate approval for the contractor registration, agreement and worker transaction. This draft cannot request a signature or move funds."}</p>}
        {onPay && <ActionButton type="button" className="button primary" busy={busy} disabled={busy} onClick={async () => {
          if (locked.current) return;
          locked.current = true;setBusy(true);setError("");
          try {await onPay(draft);setSent(true);}
          catch (err) {setError(err instanceof Error ? err.message : "Could not record the simulated attempt. Check History.");}
          finally {setBusy(false);locked.current=false;}
        }}>Approve simulated payment</ActionButton>}
        <button type="button" className="text-button" disabled={busy} onClick={() => {setDraft(null);setError("");}}>Edit payment</button>
      </>}
    </section> : <form onSubmit={event=>{
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      try {
        const amount = amountFromNear(String(fields.get("amount")).trim());
        const description = String(fields.get("description")).trim();
        if (!description) throw Error("Enter a short payment description.");
        if (limit !== undefined && BigInt(amount) > BigInt(limit)) throw Error("This amount exceeds the vault’s per-payment limit.");
        setDraft({id:`pay-${crypto.randomUUID()}`,contractorId:id,name,recipient:wallet,amount,description});
        setError("");
      } catch (err) {setError(err instanceof Error ? err.message : "Check the payment details.");}
    }}>
      <label>Amount (NEAR)<input name="amount" inputMode="decimal" required/></label>
      <label>Payment description<input name="description" maxLength={240} required/></label>
      <button className="button primary">Review payment</button>
    </form>}
    {error && <p role="alert">{error}</p>}
  </details>;
}
