"use client";

import {useEffect, useRef, useState} from "react";
import {amountFromNear, formatNear} from "../data/owner-adapter";
import type {ContractorPaymentDraft} from "../data/mock-adapter";
import {ActionButton} from "./action-button";

export type PayContractor = (draft: ContractorPaymentDraft) => Promise<void>;

export interface ContractorPaymentPreset {
  amount?: string;
  description?: string;
}

// A prepared payment: the amount is validated, reserved in the demo ledger and
// waiting for the owner's explicit confirmation. The secret binds that
// confirmation to this exact attempt and is single-use.
export interface PaymentPreparation {
  id: string;
  reference: string;
  contractor: string;
  recipient: string;
  amount: string;
  fee: string;
  total: string;
  description: string;
  confirmationSecret: string;
}

export type PrepareContractorPayment = (draft: ContractorPaymentDraft) => Promise<PaymentPreparation>;
export type ConfirmContractorPayment = (prepared: PaymentPreparation) => Promise<void>;
export type CancelContractorPayment = (prepared: PaymentPreparation) => Promise<void>;

export function ContractorPaymentForm({id,name,wallet,onPrepare,onConfirm,onCancel,limit,blocked,fee,preset,scrollAnchor}:{
  id:string; name:string; wallet:string;
  onPrepare?:PrepareContractorPayment;
  onConfirm?:ConfirmContractorPayment;
  onCancel?:CancelContractorPayment;
  limit?:string; blocked?:string;
  // fee: the simulated demo fee (yoctoNEAR). Quoted on the review screen and
  // always included in the total debit the owner sees before approving.
  fee?:string;
  // preset: a prefilled draft, e.g. prepared by the Ask Nnetics demo assistant.
  preset?: ContractorPaymentPreset;
  scrollAnchor?: boolean;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [initial] = useState<ContractorPaymentPreset | undefined>(preset
    ? {amount: preset.amount, description: preset.description}
    : undefined);
  const [draft,setDraft] = useState<ContractorPaymentDraft|null>(() => {
    if (!initial?.amount) return null;
    try {
      return {id:`pay-${crypto.randomUUID()}`,contractorId:id,name,recipient:wallet,amount:amountFromNear(String(initial.amount)).toString(),description:String(initial.description ?? "").slice(0,240)};
    } catch {return null;}
  });
  // A preset arriving after mount (assistant intent) opens the review directly.
  const lastPreset = useRef<ContractorPaymentPreset | undefined>(undefined);
  useEffect(() => {
    if (preset === lastPreset.current) return;
    lastPreset.current = preset;
    if (!preset?.amount || !onPrepare) return;
    try {
      setDraft({id:`pay-${crypto.randomUUID()}`,contractorId:id,name,recipient:wallet,amount:amountFromNear(String(preset.amount)).toString(),description:String(preset.description ?? "").slice(0,240)});
      if (detailsRef.current) detailsRef.current.open = true;
      detailsRef.current?.scrollIntoView({block: "center"});
    } catch {/* An unparsable preset never blocks manual entries. */}
  }, [preset, id, name, wallet, onPrepare]);
  const [error,setError] = useState("");
  const [prepared,setPrepared] = useState<PaymentPreparation|null>(null);
  const [confirmed,setConfirmed] = useState(false);
  const [busy,setBusy] = useState(false);
  const locked = useRef(false);
  const total = (amount: string) => (BigInt(amount) + BigInt(fee ?? "0")).toString();
  async function once(body: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError("");
    try { await body(); }
    catch (err) { setError(err instanceof Error ? err.message : "The simulated request failed. No payment was executed."); }
    finally { setBusy(false); locked.current = false; }
  }
  return <details className="reference-disclosure" ref={detailsRef}>
    <summary>Prepare payment</summary>
    {prepared ? <section aria-label="Confirm simulated payment">
      <h4>Confirm simulated payment</h4>
      <dl className="payment-draft-details">
        <dt>Contractor</dt><dd>{prepared.contractor}</dd>
        <dt>Payout wallet</dt><dd>{prepared.recipient}</dd>
        <dt>Amount</dt><dd>{formatNear(prepared.amount)} NEAR</dd>
        {fee !== undefined && <><dt>Simulated demo fee</dt><dd>{formatNear(prepared.fee)} NEAR</dd></>}
        <dt>Total debit from the demo vault</dt><dd>{formatNear(prepared.total)} NEAR · simulated funds only</dd>
        <dt>Description</dt><dd>{prepared.description}</dd>
        <dt>Reference</dt><dd>{prepared.reference}</dd>
        <dt>Reserved now</dt><dd>{formatNear(prepared.total)} NEAR is held until this payment settles or is cancelled</dd>
      </dl>
      {confirmed ? <p role="status">Simulated payment recorded. Check Activity for the completed transaction and its receipt.</p> : <>
        <p role="status">This payment is prepared and its amount is reserved. Confirm to run the simulation.</p>
        <ActionButton type="button" className="button primary" busy={busy} disabled={busy || !onConfirm} onClick={() => void once(async () => {
          if (!onConfirm) return;
          await onConfirm(prepared);
          setConfirmed(true);
        })}>Confirm and simulate payment</ActionButton>
        {onCancel && <button type="button" className="text-button" disabled={busy} onClick={() => void once(async () => {
          await onCancel(prepared);
          setPrepared(null);
        })}>Cancel and release the reservation</button>}
      </>}
    </section> : draft ? <section aria-label="Review payment">
      <h4>Review payment</h4>
      <dl className="payment-draft-details">
        <dt>Contractor</dt><dd>{draft.name}</dd>
        <dt>Payout wallet</dt><dd>{draft.recipient}</dd>
        <dt>Amount</dt><dd>{formatNear(draft.amount)} NEAR</dd>
        {fee !== undefined && <><dt>Simulated demo fee</dt><dd>{formatNear(fee)} NEAR</dd>
          <dt>Total debit from the demo vault</dt><dd>{formatNear(total(draft.amount))} NEAR · simulated funds only</dd></>}
        <dt>Description</dt><dd>{draft.description}</dd>
        <dt>Network</dt><dd>{onPrepare ? "Local simulation · no funds move" : "NEAR testnet"}</dd>
        <dt>Fees</dt><dd>{fee !== undefined ? "Only the simulated demo fee; no network fee." : onPrepare ? "No network fee" : "No fee quoted. A reviewed transaction plan is required before signing."}</dd>
        {limit !== undefined && <><dt>Per-payment limit</dt><dd>{formatNear(limit)} NEAR</dd></>}
      </dl>
      {onPrepare ? <ActionButton type="button" className="button primary" busy={busy} disabled={busy} onClick={() => void once(async () => {
        const preparedPayment = await onPrepare(draft);
        setPrepared(preparedPayment);
      })}>Prepare simulated payment</ActionButton> : <p role="status">{blocked || "Direct payment needs separate approval for the contractor registration, agreement and worker transaction. This draft cannot request a signature or move funds."}</p>}
      <button type="button" className="text-button" disabled={busy} onClick={() => {setDraft(null);setError("");}}>Edit payment</button>
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
