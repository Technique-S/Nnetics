"use client";
import {DemoButton} from "../components/demo/demo-button";
import {DemoScroll} from "../components/demo/demo-scroll";

import {billingAsset,NEAR_ASSET} from "../data/billing-assets";
import {useEffect,useRef,useState,type ReactNode} from "react";
import type {ContractorBill,PortalSnapshot} from "../data/contractor-adapter";
import type {DemoWsPayment} from "../data/demo-workspace-adapter";
import {PAYABLE_FILTERS,matchesPayable,projectPayables,type Payable,type PayableFilter} from "../data/payables";
import {RecordSearch} from "./record-search";

export function PayableFacts({item}:{item:Payable}) {
    const date=(value:string|null)=>value?new Date(value).toLocaleString():"Not recorded";
    return <dl className="payable-facts">
        <dt>Invoice number</dt><dd>{item.invoiceNumber}</dd>
        <dt>Contractor</dt><dd>{item.contractor}</dd>
        <dt>Payment purpose</dt><dd>{item.description}</dd>
        <dt>Originally requested</dt><dd>{item.requestedAmount} {item.requestedCurrency}</dd>
        <dt>Approved amount</dt><dd>{item.approvedAmount===null?"Awaiting approval":`${item.approvedAmount} ${item.approvedCurrency}`}</dd>
        <dt>Approval adjustment</dt><dd>{item.adjustmentReason??"No approval adjustment recorded"}</dd>
        <dt>Remaining payable</dt><dd>{item.approvedAmount===null?"Not yet approved":`${item.remainingAmount} ${item.approvedCurrency}`}</dd>
        <dt>Original invoice reference</dt><dd>{item.bill.sourceReference??item.invoiceNumber}</dd>
        <dt>Work order</dt><dd>{item.bill.orderReference||item.bill.orderId||"No work order"}</dd>
        <dt>Preferred payout</dt><dd>{billingAsset(item.bill.payoutAsset??NEAR_ASSET)?.symbol??"Unsupported asset"} · {billingAsset(item.bill.payoutAsset??NEAR_ASSET)?.chain??"Network unavailable"}</dd><dt>Payout asset identifier</dt><dd>{item.bill.payoutAsset??NEAR_ASSET}</dd><dt>Approved recipient wallet</dt><dd>{item.recipient??"Wallet approval required"}</dd>
        {item.recordedRecipient&&item.recordedRecipient!==item.recipient&&<><dt>Previously recorded recipient</dt><dd>{item.recordedRecipient}</dd></>}
        <dt>Invoice approval</dt><dd>{item.approvalStatus}</dd>
        <dt>Approved by</dt><dd>{item.approver??"Not recorded"}</dd>
        <dt>Approval time</dt><dd>{date(item.approvedAt)}</dd>
        <dt>Payment execution</dt><dd>{item.paymentStatus}</dd>
        {item.bill.amendments?.map(a=><div key={a.id} className="payable-amendment"><dt>Approval amendment · {a.state}</dt><dd>{a.oldAmount} to {a.amount} {a.asset} · {a.reason} · {a.actor??"Actor not recorded"} · {date(a.at)}<br/>Contractor acknowledgment: {date(a.acknowledgedAt??null)}<br/>Fresh approval: {date(a.approvedAt??null)}<br/>Payment authorization: {date(a.authorizedAt??null)}</dd></div>)}<dt>Due date</dt><dd>{date(item.bill.dueAt??null)}</dd>
    </dl>;
}

export function PayablesPanel({snapshot,payments=[],contractorId,renderDetails}:{snapshot:PortalSnapshot;payments?:readonly DemoWsPayment[];contractorId?:string;renderDetails:(bill:ContractorBill,details?:ReactNode)=>ReactNode}) {
    const [filter,setFilter]=useState<PayableFilter>("All"),[query,setQuery]=useState(""),[selectedId,setSelectedId]=useState(()=>{try{return typeof location==="undefined"?"":decodeURIComponent(location.hash.replace(/^#/,"")).split("/")[1]??"";}catch{return "";}});
    const detail=useRef<HTMLElement>(null);
    const items=projectPayables(snapshot,payments).filter(item=>!contractorId||item.bill.contractorId===contractorId);
    const visible=items.filter(item=>matchesPayable(item,filter,query));
    const selected=selectedId?items.find(item=>item.id===selectedId):visible[0]??items[0];
    useEffect(()=>{
        const resolve=()=>{try{
            const suffix=decodeURIComponent(location.hash.replace(/^#/,"")).split("/")[1];
            if(suffix){const invoice=items.find(p=>p.id===suffix||p.invoiceNumber===suffix);const payment=payments.find(p=>p.id===suffix||p.reference===suffix);setSelectedId(invoice?.id??payment?.billId??(payment?"__standalone__":suffix));}
        }catch{/* A malformed old deep link never grants access to a record. */}};
        resolve();window.addEventListener("hashchange",resolve);return()=>window.removeEventListener("hashchange",resolve);
    },[snapshot.invoices,payments]);
    useEffect(()=>{if(!selectedId&&selected)setSelectedId(selected.id);},[selectedId,selected?.id]);
    function open(item:Payable){setSelectedId(item.id);history.replaceState(null,"",`#Payables/${encodeURIComponent(item.id)}`);if(innerWidth<900)requestAnimationFrame(()=>detail.current?.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth"}));}
    return <section className="panel unified-payables" aria-label="Payables workspace">
        <RecordSearch label="Search payables" query={query} onQuery={setQuery} onReset={query||filter!=="All"?()=>{setQuery("");setFilter("All");}:undefined}/>
        <div className="payable-filters" role="group" aria-label="Payable status">{PAYABLE_FILTERS.map(value=><DemoButton key={value} type="button" className="payable-filter" aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value}<span>{items.filter(item=>matchesPayable(item,value)).length}</span></DemoButton>)}</div>
        <p className="record-count" role="status">{visible.length} of {items.length} payables</p>
        <div className="payables-layout">
            <DemoScroll className="payables-list" aria-label="Payable records">
                {!visible.length&&<p className="empty">{items.length?"No payables match these filters.":"Contractor invoices will appear here for review and payment."}</p>}
                {visible.map(item=><button type="button" key={item.id} className="payable-row" data-selected={selected?.id===item.id} aria-pressed={selected?.id===item.id} aria-label={`Open payable · ${item.invoiceNumber}`} onClick={()=>open(item)}>
                    <span className="payable-row-heading"><strong>{item.invoiceNumber}</strong><span className="badge" data-status={item.stage}>{item.stage}</span></span>
                    <span>{item.contractor}</span><span className="payable-purpose">{item.description}</span>
                    <span className="payable-row-amount">Requested: {item.requestedAmount} {item.requestedCurrency}<br/>Approved: {item.approvedAmount===null?"Awaiting approval":`${item.approvedAmount} ${item.approvedCurrency}`}{item.failed&&<span>Last payment attempt failed</span>}</span>
                </button>)}
            </DemoScroll>
            <section ref={detail} className="payable-details" aria-label="Payable Details" tabIndex={-1}>
                {selected?<><h2>Payable Details</h2><p className="muted">Review the original request, approval and payment in one place.</p>
                    {!visible.some(item=>item.id===selected.id)&&<p className="payable-context-note">The selected payable stays open while its status changes or you filter the list.</p>}
                    <div className="payable-summary"><h3>{selected.invoiceNumber}</h3><p><strong>{selected.contractor}</strong> · {selected.description}</p><dl className="payable-summary-amounts"><dt>Originally requested</dt><dd>{selected.requestedAmount} {selected.requestedCurrency}</dd><dt>Approved amount</dt><dd>{selected.approvedAmount===null?"Awaiting approval":`${selected.approvedAmount} ${selected.approvedCurrency}`}</dd></dl><span className="badge">{selected.stage} · {selected.paymentStatus}</span></div>
                    {selected.blockers.length>0&&selected.stage!=="Paid"&&<section className="payable-eligibility" aria-label="Payment eligibility"><h3>Before payment</h3><ul>{selected.blockers.map(reason=><li key={reason}>{reason}</li>)}</ul></section>}
                    {renderDetails(selected.bill,<><PayableFacts item={selected}/><details className="reference-disclosure"><summary>Invoice audit timeline</summary><ol className="payable-timeline"><li>Submitted · {new Date(selected.bill.submittedAt).toLocaleString()}</li>{(selected.bill.reviewEvents??[]).map((event,index)=><li key={`${event.at}-${index}`}><strong>{event.action}</strong> · {new Date(event.at).toLocaleString()} · {event.by??"User identity not recorded"}{event.note&&<p>{event.note}</p>}</li>)}</ol>{!selected.bill.reviewEvents?.length&&<p>Historical review identities and timestamps were not recorded for this invoice.</p>}</details></>)}
                </>:<p className="empty" role={selectedId&&selectedId!=="__standalone__"?"alert":undefined}>{selectedId==="__standalone__"?"This payment has no invoice. Its record is available under Other payments.":selectedId?"That payable is unavailable in this workspace. Select an authorized record from the list.":"Select a payable to review its request, approval and payment details."}</p>}
            </section>
        </div>
    </section>;
}
