import {review,type OwnerSnapshot,type Invoice,type Payment} from './owner-adapter.ts';
export function paymentDisplayStatus(s:OwnerSnapshot,p:Payment):string {
 if(p.status!=='Paid')return p.status;
 if(s.mode==='simulation')return 'Paid';
 const invoice=s.invoices.find(i=>i.id===p.invoice_id);
 const job=s.queue?.find(j=>j.id===p.invoice_id);
 return invoice&&invoice.order_id===p.order_id&&invoice.recipient===p.recipient&&invoice.amount===p.amount&&job?.state==='paid'&&job.hash===p.reference&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(p.reference)?'Paid':'Pending';
}
export function invoiceDisplayStatus(s:OwnerSnapshot,i:Invoice):string {
 const payment=[...s.payments].reverse().find(p=>p.invoice_id===i.id&&p.order_id===i.order_id&&p.recipient===i.recipient&&p.amount===i.amount);
 if(payment)return paymentDisplayStatus(s,payment);
 const job=s.queue?.find(j=>j.id===i.id);
 if(job&&['queued','prepared','submitted','blocked'].includes(job.state))return 'Pending';
 if(job?.state==='failed')return 'Failed';
 return review(s,i).length?'Needs review':s.mode==='testnet'?'Ready for worker':'Ready to simulate';
}
