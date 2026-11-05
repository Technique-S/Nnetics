import {test} from 'node:test';import assert from 'node:assert/strict';
import {invoiceDisplayStatus,paymentDisplayStatus} from '../src/data/payment-status.ts';
import type {OwnerSnapshot,Invoice,Payment} from '../src/data/owner-adapter.ts';
test('Paid status requires matching contract and durable job evidence; current pause/limits cannot relabel an existing payment',()=>{
 const invoice={id:'other-invoice',order_id:'order',recipient:'recipient.testnet',amount:'100',reviewed:true} as Invoice;
 const p={invoice_id:invoice.id,order_id:invoice.order_id,recipient:invoice.recipient,amount:invoice.amount,status:'Paid',reference:'1'.repeat(44)} as Payment;
 const s={mode:'testnet',invoices:[invoice],payments:[p],queue:[{id:invoice.id,state:'paid',hash:p.reference}],vault:{paused:true}} as OwnerSnapshot;
 assert.equal(invoiceDisplayStatus(s,invoice),'Paid');assert.equal(paymentDisplayStatus(s,p),'Paid');
 for(const state of ['queued','submitted','blocked']){s.queue![0].state=state;assert.equal(invoiceDisplayStatus(s,invoice),'Pending');}
 s.queue![0].state='paid';s.queue![0].hash='2'.repeat(44);assert.equal(invoiceDisplayStatus(s,invoice),'Pending');s.queue![0].hash=p.reference;
 assert.equal(paymentDisplayStatus(s,{...p,amount:'101' as Payment['amount']}),'Pending');
});
