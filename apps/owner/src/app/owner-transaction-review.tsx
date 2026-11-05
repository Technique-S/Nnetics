"use client";
import {useEffect,useRef,useState} from 'react';
import {NearOwnerAdapter} from '../data/near-adapter';
import {formatNear} from '../data/owner-adapter';
import type {OwnerTransactionReview as Review} from '../data/owner-transaction';
export function OwnerTransactionReview({adapter}:{adapter:NearOwnerAdapter}) {
 const [review,setReview]=useState<Review|null>(null),answer=useRef<((yes:boolean)=>void)|null>(null),dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{adapter.reviewTransaction=value=>new Promise<boolean>(resolve=>{answer.current=resolve;setReview(value);});return()=>{adapter.reviewTransaction=undefined;answer.current?.(false);answer.current=null;};},[adapter]);
 useEffect(()=>{if(review)dialog.current?.showModal();},[review]);
 if(!review)return null;
 const finish=(yes:boolean)=>{answer.current?.(yes);answer.current=null;setReview(null);};
 return <dialog ref={dialog} className="modal" aria-modal="true" aria-labelledby="owner-transaction-title" onCancel={event=>{event.preventDefault();finish(false);}} style={{overflowWrap:'anywhere'}}><h2 id="owner-transaction-title">Review owner transaction</h2>
 <p>Network: NEAR testnet · Signed in as {review.owner}</p><dl><dt>Organization</dt><dd>{review.organization}</dd><dt>Contract / recipient</dt><dd className="mono">{review.contract}</dd><dt>Action</dt><dd>{review.method.replaceAll('_',' ')}</dd><dt>Attached deposit</dt><dd>{formatNear(review.deposit)} NEAR</dd><dt>Fee allowance</dt><dd>{formatNear(review.maxFee)} NEAR · unused gas is refunded. Stop if Meteor quotes more.</dd><dt>Review expires</dt><dd>{new Date(review.expires).toLocaleTimeString()}</dd></dl>
 <p>{review.method==='advance_repair_head'?'Advances authenticated security evidence from the existing trust root. It does not enable payments.':['deposit','fund_storage'].includes(review.method)?(review.method==='deposit'?'Adds payment funds; it does not enable payments.':'Adds storage reserve; it does not add payment funds.'):'Changes only the permission or limit specified below; it does not send a contractor payment.'}</p>
 {review.paymentRecipient&&<p>Payment recipient: <span className="mono">{review.paymentRecipient}</span> · {formatNear(review.paymentAmount!)} NEAR. This owner action does not initiate a new contractor transfer.</p>}
 {Object.entries(review.args).map(([key,value])=><p key={key}>{key.replaceAll('_',' ')}: {['budget','payment_cap','amount'].includes(key)?formatNear(String(value))+' NEAR':value&&typeof value==='object'?'Exact reviewed arguments are shown in Details.':String(value)}</p>)}
 <button className="text-button" onClick={()=>void navigator.clipboard.writeText(review.contract)}>Copy full contract</button><details><summary>Details</summary><p>Transaction ID: {review.hash}</p><p>Gas limit: {review.gas}</p><pre>{JSON.stringify(review.args,null,2)}</pre></details><p>Approval lets Meteor sign and submit this transaction. A missing response stays blocked until its recorded transaction is resolved. Never submit a replacement for an unknown outcome.</p>
 <div className="actions"><button className="button secondary" onClick={()=>finish(false)}>Cancel review</button><button className="button primary" onClick={()=>finish(true)}>Continue to Meteor</button></div></dialog>;
}
