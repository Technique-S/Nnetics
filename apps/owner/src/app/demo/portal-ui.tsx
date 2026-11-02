"use client";
import type { ReactNode } from "react";
import type { ContractorBill } from "../../data/contractor-adapter";
import { safeTransactionLink } from "../../data/contractor-adapter";
import s from "./portal.module.css";
export { s };
export function PortalShell({ children, owner = false, persistent = false }: {
    children: ReactNode;
    owner?: boolean;
    persistent?:boolean;
}) {
    return <main className={s.shell}><header className={s.top}><a className={s.brand} href={persistent ? "/" : "/?mode=demo"}>Nnetics<span style={{ color: '#8baf73' }}> ↗</span></a><span className={s.tag}>{persistent ? (owner ? "OWNER RECORDS" : "PRIVATE CONTRACTOR") : owner ? "OWNER DEMO" : "CONTRACTOR DEMO"}</span></header><aside className={s.banner}>{persistent ? "Persistent private records · NEAR testnet. Wallet verification uses a signed message. Payment execution and deployment remain disabled." : "Simulated data · Private-link demo · Wallet proof is simulated. No live deployment, signing or payment execution."}</aside>{children}</main>;
}
export function BillCard({ bill, children, persistent=false, organization }: {
    bill: ContractorBill;
    children?: ReactNode;
    persistent?:boolean; organization?:string;
}) {
    const link = safeTransactionLink(bill.transactionUrl);
    return <article className={s.invoice}><div className={s.split}><div><span className={s.pill}>{persistent && bill.status === "Paid" ? "Payment evidence unavailable" : bill.status}</span><h3>{bill.reference}</h3><p className={s.muted}>{bill.description}</p></div><strong>{bill.amount} {persistent && bill.reasons.some(r=>r.startsWith("Currency conflict")) ? "— currency conflict; no conversion" : bill.asset}</strong></div><p className={s.meta}>Recipient fixed by work order: {bill.recipient}</p>{bill.reasons.map(r => <p key={r} className={s.small}>{r}</p>)}{bill.ownerNote && <p className={s.notice}>Owner: {bill.ownerNote}</p>}{bill.attachment && <p><a className={s.link} href={`${persistent ? "/api/live/contractors" : "/api/demo/contractors"}/attachment/${bill.attachment.id}${organization ? "?organization="+encodeURIComponent(organization) : ""}`}>Download {bill.attachment.name}</a></p>}{link && !persistent ? <a className={s.link} href={link} target="_blank" rel="noreferrer">View transaction · simulated history record</a> : <p className={s.small}>No transaction available · payment execution disabled</p>}{persistent && <details><summary>Original billing text</summary><pre className={s.inline}>{bill.originalText ?? bill.text}</pre>{bill.originalText && bill.originalText !== bill.text && <><p>Latest clarification</p><pre className={s.inline}>{bill.text}</pre></>}</details>}{children}</article>;
}
