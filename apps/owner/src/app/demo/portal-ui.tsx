"use client";
import {BrandMark} from "../brand-mark";
import {AppearanceControl} from "../appearance-control";
import type { ReactNode } from "react";
import type { ContractorBill } from "../../data/contractor-adapter";
import { safeTransactionLink } from "../../data/contractor-adapter";
import s from "./portal.module.css";
export { s };
export function PortalShell({ children, owner = false, persistent = false, embedded = false }: {
    children: ReactNode;
    owner?: boolean;
    persistent?:boolean;
    embedded?:boolean;
}) {
    const Surface = embedded ? "section" : "main";
    return <Surface className={`${s.shell} ${owner ? `owner-billing-surface ${embedded ? "embedded-billing" : ""}` : "contractor-surface"}`}><header className={s.top}><a className={s.brand} href={persistent ? "/" : "/?mode=demo"}><BrandMark/>Nnetics</a><div className="portal-appearance"><AppearanceControl inline/><span className={s.tag}>{persistent ? (owner ? "Owner records" : "Private portal") : owner ? "Owner demo" : "Private portal · demo"}</span></div></header><aside className={s.banner}>{persistent ? "Persistent private records · NEAR testnet. Wallet verification uses a signed message. Payment execution and deployment remain disabled." : "Simulated data · Private link access. Wallet verification and payments in this demo are simulated."}</aside>{children}</Surface>;
}
export function BillCard({ bill, children, persistent=false, organization }: {
    bill: ContractorBill;
    children?: ReactNode;
    persistent?:boolean; organization?:string;
}) {
    const confirmed=persistent&&bill.payment?.confirmed===true&&bill.payment.state==="paid";
    const link = persistent ? safeTransactionLink(confirmed?bill.payment!.transactionUrl:bill.transactionUrl) : null;
    return <article className={s.invoice}><div className={s.split}><div><span className={s.pill} data-status={bill.status}>{confirmed&&<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>}{confirmed?"Paid":persistent && bill.status === "Paid" ? "Payment evidence unavailable" : bill.status}</span><h3>{bill.reference}</h3><p className={s.muted}>{bill.description}</p></div><strong>{bill.amount} {persistent && bill.reasons.some(r=>r.startsWith("Currency conflict")) ? "— currency conflict; no conversion" : bill.asset}</strong></div><p className={s.meta}>Linked work order: <code>{bill.orderReference || bill.orderId || "No work order"}</code></p><p className={s.meta}>Approved wallet at submission: {bill.recipient || "Awaiting wallet approval"}</p>{bill.reasons.map(r => <p key={r} className={s.small}>{r}</p>)}{bill.ownerNote && <p className={s.notice}>Owner: {bill.ownerNote}</p>}{bill.attachment && <p><a className={s.link} href={`${persistent ? "/api/live/contractors" : "/api/demo/contractors"}/attachment/${bill.attachment.id}${organization ? "?organization="+encodeURIComponent(organization) : ""}`}>Download {bill.attachment.name}</a></p>}{bill.payment&&<p className={s.small}>Payment: {confirmed?"Paid":bill.payment.state} · {bill.payment.reason}</p>}{link && (!persistent||confirmed) ? <a className={s.link} href={link} target="_blank" rel="noreferrer">View transaction · {persistent?"confirmed testnet payment":"simulated history record"}</a> : <p className={s.small}>{persistent ? "No transaction available · payment execution disabled" : "Demo / Simulated · no blockchain transaction"}</p>}{bill.text && <details><summary>Original billing text</summary><pre className={s.inline}>{bill.originalText ?? bill.text}</pre>{bill.originalText && bill.originalText !== bill.text && <><p>Latest clarification</p><pre className={s.inline}>{bill.text}</pre></>}</details>}{children}</article>;
}
