"use client";
import {ViewMetadata} from "../view-metadata";
import {getUserMessage} from "../../data/user-message";
import {LiveApiError} from "../../data/live-request";
import {OperationFeedback} from "../operation-feedback";
import {ActionButton} from "../action-button";
import {LoadingSkeleton} from "../loading-skeleton";
import { useEffect, useRef, useState } from "react";
import { MockContractorAdapter, PersistentContractorAdapter, parseBill } from "../../data/contractor-adapter";
import type { BillAttachment, BillFields, ContractorBill, ContractorSnapshot } from "../../data/contractor-adapter";
import { currencyConflict } from "../../data/invoice-currency";
import {meteorExtension,signMeteorMessage} from "../../data/meteor-message";
import { amountFromNear } from "../../data/owner-adapter";
import type {BillingPreview} from "../../data/billing-extraction";
import { PortalShell, BillCard, s } from "../demo/portal-ui";
const empty: BillFields = { reference: "", orderId: "", amount: "", asset: "NEAR", recipient: "" };
export default function ContractorPortalEntry(){const [adapter,setAdapter]=useState<MockContractorAdapter|PersistentContractorAdapter|null>(null);useEffect(()=>{setAdapter(new URLSearchParams(location.search).get("mode")==="demo"?new MockContractorAdapter():new PersistentContractorAdapter());},[]);return adapter?<ContractorPortal key={adapter.mode} adapter={adapter}/>:<p>Opening private billing…</p>;}
function ContractorPortal({adapter}:{adapter:MockContractorAdapter|PersistentContractorAdapter}) {
 const persistent=adapter.mode==="persistent",walletAbort=useRef<AbortController|null>(null);
 const [extraction,setExtraction]=useState<BillingPreview|null>(null),[confirmed,setConfirmed]=useState(false),[publicText,setPublicText]=useState(false);
    const [snapshot, setSnapshot] = useState<ContractorSnapshot | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
    const [tab, setTab] = useState("Wallet details"), [body, setBody] = useState(""), [fields, setFields] = useState<BillFields>(empty), [description, setDescription] = useState(""), [attachment, setAttachment] = useState<BillAttachment | null>(null), [edit, setEdit] = useState<ContractorBill | null>(null);
    const [wallet, setWallet] = useState(""), [challenge, setChallenge] = useState("");
    useEffect(()=>{setConfirmed(false);},[body,fields.amount,fields.orderId,fields.recipient,description]);
    const submission = useRef("");
    const current = useRef(""), accessGeneration = useRef(0), sessionReady = useRef(false);
    function clearDraft() { readAbort.current?.abort();walletAbort.current?.abort(); submission.current = ""; setExtraction(null);setConfirmed(false);setPublicText(false);setBody(""); setFields(empty); setDescription(""); setAttachment(null); setEdit(null); setWallet(""); setChallenge(""); }
    const readAbort=useRef<AbortController|null>(null),readRunning=useRef(false),pollPaused=useRef(false);
    const [reading,setReading]=useState(false);
    async function refresh(manual=true) { if(readRunning.current||(!manual&&pollPaused.current))return;
 if (!sessionReady.current)
        return; const controller=new AbortController();readAbort.current=controller;readRunning.current=true;setReading(true);const generation = accessGeneration.current; try {
        const next = await adapter.snapshot(controller.signal);
        if (generation !== accessGeneration.current)
            return;
        if (current.current && current.current !== next.profile.id)
            clearDraft();
        if (!current.current || current.current !== next.profile.id) setTab(next.profile.wallet && !next.profile.pendingWallet ? "My payments" : "Wallet details");
        current.current = next.profile.id;
        pollPaused.current=false;setSnapshot(next);
    }
    catch (e) {
        if (generation !== accessGeneration.current)
            return;
        pollPaused.current=true;
        if(e instanceof LiveApiError&&e.retryable){setLoading(false);setError(e.message);return;}
        accessGeneration.current++;
        sessionReady.current = false;
        setLoading(false);
        setBusy(false);
        setSnapshot(null);
        clearDraft();
        setNotice("");
        setError(e instanceof Error ? e.message : "Private access unavailable.");
    } finally {readRunning.current=false;if(generation===accessGeneration.current)setReading(false);} }
    useEffect(() => { let active = true; async function load() { const generation = ++accessGeneration.current; sessionReady.current = false; setLoading(true); setSnapshot(null); setNotice(""); setError(""); setBusy(false); clearDraft(); try {
        const token = location.hash.slice(1);
        if (token) {
            await adapter.enter(token);
            if (generation !== accessGeneration.current)
                return;
            history.replaceState(null, "", persistent ? "/contractor" : "/contractor?mode=demo");
        }
        if (active && generation === accessGeneration.current) {
            sessionReady.current = true;
            await refresh();
        }
    }
    catch (e) {
        if (active && generation === accessGeneration.current) {
            setSnapshot(null);
            setError(e instanceof Error ? e.message : "Invalid private link.");
        }
    }
    finally {
        if (active && generation === accessGeneration.current)
            setLoading(false);
    } } void load(); const accessEvents=new BroadcastChannel("nnetics-contractor-access");accessEvents.onmessage=event=>{if(event.data?.profileId===current.current&&event.data?.mode===adapter.mode){accessGeneration.current++;sessionReady.current=false;setSnapshot(null);setLoading(false);setBusy(false);clearDraft();setNotice("");setError("Private link revoked or replaced. Ask the owner for a new link.");}}; const timer = setInterval(() => { if (active && sessionReady.current && !document.hidden)
        void refresh(false); }, 2000); const focus = () => { if (active && sessionReady.current)
        void refresh(false); }; const changed = () => { void load(); }; window.addEventListener("focus", focus); window.addEventListener("hashchange", changed); return () => { active = false;readAbort.current?.abort(); accessGeneration.current++; sessionReady.current = false; clearInterval(timer); accessEvents.close(); window.removeEventListener("focus", focus); window.removeEventListener("hashchange", changed); }; }, []);
    async function perform<T>(action: () => Promise<T>, message: string|((result:T)=>string), onSuccess?: (result: T) => void) { const generation = accessGeneration.current; setBusy(true); setError(""); setNotice(""); try {
        const result = await action();
        if (generation !== accessGeneration.current)
            return;
        onSuccess?.(result);
        await refresh();
        if (generation === accessGeneration.current)
            setNotice(typeof message==="function"?message(result):message);
    }
    catch (e) {
        if (generation !== accessGeneration.current)
            return;
        setError(e instanceof Error ? e.message : "Demo action failed.");
        await refresh();
    }
    finally {
        if (generation === accessGeneration.current)
            setBusy(false);
    } }
    useEffect(()=>{if(persistent&&snapshot?.orders.length===1)setFields(f=>({...f,orderId:f.orderId||snapshot.orders[0].id}));},[persistent,snapshot?.orders.length]);
    const order = snapshot?.orders.find(o => o.id === fields.orderId);
    const missing: string[] = [];
    if (!order)
        missing.push("Approved work order");
    try {
        amountFromNear(fields.amount);
    }
    catch {
        missing.push("Positive exact amount");
    }
    if (currencyConflict(body))
        missing.push("Currency conflict: clarify the source currency. Only NEAR on testnet is supported; no conversion was made.");
    if (!body.trim())
        missing.push("Bill text");
    if (!persistent && !description.trim())
        missing.push("Work description");
    const blockingMissing=missing.filter(m=>!persistent || !m.startsWith("Currency conflict"));
    function parse() { try {
        const p = parseBill(body);
        const match = snapshot?.orders.find(o => o.reference === p.orderId);
        setFields(f => ({ ...f, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v)), asset: "NEAR", reference: f.reference, orderId: match?.id || f.orderId }));
        setError("");
        setNotice("Labeled details copied into the preview. Clarify any missing fields below; no AI or wallet instructions are executed.");
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Clarify the bill details.");
    } }
    async function extract(useAI:boolean){if(!(adapter instanceof PersistentContractorAdapter))return;await perform(()=>adapter.extract(body,useAI,publicText),"Review the extracted claims and confirm the payment details.",result=>{
      setExtraction(result);setConfirmed(false);
      const match=snapshot?.orders.filter(o=>o.reference===result.fields.workOrderReference);
      setFields(f=>({...f,amount:result.fields.amount||f.amount,recipient:result.fields.recipient||f.recipient,orderId:match?.length===1?match[0].id:f.orderId,asset:"NEAR"}));
      if(result.fields.description)setDescription(result.fields.description);
    });}
    function answer(b: ContractorBill) { submission.current = crypto.randomUUID(); setExtraction(null);setConfirmed(false);setEdit(b); setFields({ reference: b.reference, orderId: b.orderId, amount: b.amount, asset: b.asset, recipient: b.recipient }); setBody(b.text); setDescription(b.description); setAttachment(b.attachment); setTab("Submit a bill"); setNotice(b.ownerNote); }
    async function submitBill() {
      await perform(() => adapter.command({ action: edit ? "clarify-invoice" : "submit-invoice", submissionId: submission.current || (submission.current = crypto.randomUUID()), ...(edit ? { invoiceId: edit.id } : {}), ...(extraction ? { extractionId: extraction.id, extractionConfirmed: confirmed } : {}), fields, text: body, description: description || (persistent ? body.slice(0, 1000) : ""), ...(attachment ? { attachmentId: attachment.id } : {}) }), result => {
        const bill = result.invoice;
        return persistent && bill?.status === "Needs clarification"
          ? `Saved ${bill.reference}; still needs clarification. Linked work order: ${bill.orderReference || order?.reference || bill.orderId}. ${bill.reasons.join(" ")} Correct this same invoice; no new invoice or order is needed.`
          : "Bill submitted for owner review. No payment was initiated.";
      }, result => {
        if (persistent && edit && result.invoice?.status === "Needs clarification") {
          submission.current = crypto.randomUUID();
          setEdit(result.invoice); setExtraction(null); setConfirmed(false);
          return;
        }
        clearDraft(); setTab("My payments");
      });
    }
    return <PortalShell persistent={persistent}><OperationFeedback active={reading||loading} message="Loading your billing records…"/>{error&&sessionReady.current&&<ActionButton disabled={reading} onClick={()=>void refresh()}>Retry verification</ActionButton>}{loading ? <section aria-busy="true"><h1>Opening your private workspace</h1><p>Checking your private access…</p><LoadingSkeleton/></section> : !snapshot ? <section className={s.card}><h1 className={s.heading}>Private access unavailable</h1><p role="alert">{error?getUserMessage(error):"Open the private invitation link the owner created for you."}</p><p className={s.muted}>Ask the owner for a new link if this one was revoked or expired. Private records are not available.</p></section> : <>
 <ViewMetadata name={tab}/><div className={s.intro}><span className={s.tag}>Contractor workspace</span><h1 className={s.heading}>{snapshot.profile.name} · Billing</h1><p className={s.muted}>Send a clear bill. Follow its review. Keep your wallet details up to date.</p></div>
 <nav className={s.tabs} aria-label="Contractor sections">{(snapshot.profile.wallet && !snapshot.profile.pendingWallet ? ["My payments", "Wallet details", "Submit a bill"] : ["Wallet details", "My payments", "Submit a bill"]).map(t => <ActionButton busy={busy} key={t} className={`${s.tab} ${tab === t ? s.active : ""}`} aria-current={tab === t ? "page" : undefined} onClick={() => { setTab(t); setError(""); setNotice(""); }}>{t === "Submit a bill" ? "Send a bill" : t}</ActionButton>)}</nav>
 {error && <p role="alert" className={`${s.notice} ${s.error}`}>{getUserMessage(error)}</p>}{notice && <p role="status" className={s.notice}>{notice}</p>}
 {tab === "Submit a bill" && <div className={s.grid}><section className={s.card}><h2>{edit ? "Answer the owner’s clarification" : "Bill details"}</h2><p className={s.muted}>Paste your bill in your own words. Use the fields below to confirm the payment details.</p>
 <label htmlFor="bill-text">{persistent ? "What did you do?" : "Bill text"}</label><textarea id="bill-text" aria-describedby="submission-guidance" rows={7} maxLength={24000} value={body} onChange={e => {setBody(e.target.value);setExtraction(null);setConfirmed(false);}} placeholder={'Work order: WO-001\nAmount: 1 NEAR\nOne article delivered for the approved brief.'}/><div className={s.actions}><ActionButton busy={busy} type="button" className={`${s.button} ${s.secondary}`} onClick={parse}>Format labeled details</ActionButton></div>
 {persistent && <><label htmlFor="primary-amount">How much are you requesting?</label><input id="primary-amount" aria-describedby="submission-guidance" inputMode="decimal" value={fields.amount} onChange={e=>setFields({...fields,amount:e.target.value})}/><p>Currency: NEAR · Testnet</p></>} <label htmlFor="work-order">Approved work order</label><select id="work-order" aria-describedby="submission-guidance" disabled={!!edit} value={fields.orderId} onChange={e => setFields({ ...fields, orderId: e.target.value })}><option value="">Choose your approved work order</option>{snapshot.orders.map(o => <option key={o.id} value={o.id}>{o.reference} · {o.title}</option>)}</select>{snapshot.orders.length === 0 && <p className={s.small}>The owner must approve your wallet and work order first.</p>}
<details className="billing-options"><summary>Attachments and extraction (optional)</summary><div className={s.file}><label htmlFor="invoice-upload">Attach an invoice</label><input id="invoice-upload" type="file" accept=".txt,.pdf,.png,.jpg,.jpeg" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (!file)
                return; void perform(async () => { if (file.size > 1048576)
                throw Error("Upload a file up to 1 MB."); const content = file.type === "text/plain" || /\.txt$/i.test(file.name) ? await file.text() : null; if (content && content.length > 24000) throw Error("Text invoices are limited to 24,000 characters. Shorten the text or attach a PDF and enter details manually."); const saved = await adapter.upload(file); return { saved, content }; }, persistent ? "Private attachment saved." : "Attachment saved in this private demo workspace.", ({ saved, content }) => { setAttachment(saved); if (content !== null) setBody(content); }); e.target.value = ""; }}/><p className={s.small}>TXT, PDF, PNG or JPEG · up to 1 MB. TXT fills the bill text. PDFs/images are attachments only; enter their details manually. No OCR; AI extraction accepts entered text only.</p>{attachment && <p>{attachment.name} · {Math.ceil(attachment.size / 1024)} KB</p>}</div>
 {persistent&&<section aria-label="Billing extraction"><p className={s.small}>Optional AI sends only this billing text to OpenRouter / NVIDIA’s free endpoint. Do not include confidential or personal data. Organization records and approved work orders are not added. AI cannot approve work, change wallets or authorize payment.</p><label><input type="checkbox" checked={publicText} onChange={e=>setPublicText(e.target.checked)}/> This text contains no confidential or personal data; send it for AI extraction.</label><div className={s.actions}><ActionButton busy={busy} type="button" disabled={busy||!publicText||!body.trim()} className={s.button} onClick={()=>extract(true)}>Extract with AI · review required</ActionButton><ActionButton busy={busy} type="button" disabled={busy||!body.trim()} className={s.button} onClick={()=>extract(false)}>Extract locally · deterministic</ActionButton></div></section>}
</details>
 <h3 style={{ marginTop: 24 }}>Additional payment details</h3><p>Invoice reference assigned automatically on submission.</p>
 <label htmlFor="bill-description">{persistent ? "Short description (optional)" : "Work description"}</label><input id="bill-description" aria-describedby="submission-guidance" value={description} maxLength={1000} onChange={e => setDescription(e.target.value)}/>
 {!persistent && <><label htmlFor="bill-amount">Amount (as invoiced)</label><input id="bill-amount" aria-describedby="submission-guidance" inputMode="decimal" value={fields.amount} onChange={e => setFields({ ...fields, amount: e.target.value })}/>
 <p>Currency: NEAR · Testnet</p></>}
 <label htmlFor="invoice-wallet">Wallet stated on invoice (optional)</label><input id="invoice-wallet" value={fields.recipient} onChange={e => setFields({ ...fields, recipient: e.target.value })} placeholder="Leave empty to use the approved work order"/><p className={s.small}>This field can flag a mismatch. It cannot change the approved recipient.</p>
 {extraction&&<section aria-label="Extraction confirmation"><p>{extraction.label}</p><dl><dt>Extracted work description</dt><dd>{extraction.fields.description || "Not extracted; confirm manually"}</dd><dt>Extracted amount claim</dt><dd>{extraction.fields.amount || "Missing; enter one exact amount"}</dd><dt>Stated currency</dt><dd>{extraction.fields.currency || "Not stated; clarify if needed. Testnet supports NEAR only."}</dd><dt>Stated work-order reference</dt><dd>{extraction.fields.workOrderReference || "Not stated; select one approved work order"}</dd><dt>Stated wallet claim</dt><dd>{extraction.fields.recipient || "Not stated; the approved work order supplies the fixed recipient"}</dd><dt>Quoted amount evidence</dt><dd><pre className={s.inline}>{extraction.fields.amountEvidence || "No quote; manual confirmation required"}</pre></dd></dl><ul>{extraction.questions.map(q=><li key={q}>{q}</li>)}</ul><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I reviewed the extracted claims and confirmed the fields against the original text.</label></section>}
</section>
 <aside><section className={s.preview} aria-label="Formatted bill preview"><span className={s.tag}>{persistent ? "Formatted preview · Testnet" : "Formatted preview · Demo"}</span><h3>{edit?.reference || "Reference assigned on submission"}</h3><p className={s.muted}>{snapshot.profile.name}</p><div className={s.money}>{fields.amount || "—"} {currencyConflict(body) ? "— currency conflict" : "NEAR"}</div><dl><dt>Work order · selected approved record</dt><dd>{order?.reference || "Select an approved work order"}</dd><dt>Description</dt><dd>{description || (persistent ? body : "") || "Describe the completed work"}</dd><dt>Fixed recipient · supplied from work order</dt><dd className={s.meta}>{order?.recipient || "Select an approved work order"}</dd><dt>Attachment</dt><dd>{attachment?.name || "None"}</dd></dl><p className={s.inline}>{body || "Your bill text will appear here."}</p></section><section className={s.card} style={{ marginTop: 20 }}><h3>{missing.length ? "A few details are missing" : "Ready for owner review"}</h3>{missing.length ? <ul className={s.checklist}>{missing.map(m => <li key={m}>{m}</li>)}</ul> : <p className={s.muted}>The owner still checks the amount, currency and approved work order. Submission never authorizes a transfer.</p>}{order && fields.amount && fields.amount !== order.amount && <p className={s.small}>The owner will review this amount against {order.amount} NEAR.</p>}<div className={s.disabled}>Payment execution and deployment disabled.</div></section> <div id="submission-guidance" className={s.guidance} role="status"><p>{blockingMissing.length ? "Before you submit" : "Ready for owner review"}</p>{blockingMissing.length ? blockingMissing.join(" · ") : "Submission requests review; it does not authorize payment."}</div><div className={s.actions}><ActionButton busy={busy} aria-describedby="submission-guidance" className={s.button} disabled={busy || blockingMissing.length > 0 || (!!extraction&&!confirmed)} onClick={() => void submitBill()}>{edit ? "Send clarification" : persistent && currencyConflict(body) ? "Submit for clarification" : "Submit bill for review"}</ActionButton>{edit && <ActionButton busy={busy} className={`${s.button} ${s.secondary}`} onClick={() => { clearDraft(); setTab("My payments"); }}>Cancel clarification</ActionButton>}</div></aside></div>}
 {tab === "My payments" && <section className={s.card}><div className={s.split}><div><h2>My payments</h2><p className={s.muted}>Your submitted invoices and owner-review status. {persistent ? "These records are saved by your organization. Review approval is not a payment; no Paid state is shown without confirmed chain evidence." : "All records here are simulated."}</p></div><ActionButton busy={busy} className={`${s.button} ${s.secondary}`} onClick={()=>void refresh()}>Refresh status</ActionButton></div>{snapshot.invoices.length === 0 ? <p className={s.empty}>No submitted invoices yet.</p> : snapshot.invoices.map(b => <BillCard key={b.id} bill={b} persistent={persistent}>{b.status === "Needs clarification" && <div className={s.actions}><ActionButton busy={busy} className={s.button} aria-label={`Answer clarification · ${b.reference}`} onClick={() => answer(b)}>Answer clarification</ActionButton></div>}</BillCard>)}</section>}
 {tab === "Wallet details" && <div className={s.grid}><section className={s.card}><h2>Wallet details</h2><span className={s.pill}>{snapshot.profile.wallet ? "Owner-approved wallet" : "Initial wallet not approved"}</span><p className={s.meta}>{snapshot.profile.wallet || "No approved wallet yet"}</p><p className={s.muted}>{persistent ? "Verify wallet control with a NEAR testnet message, then wait for explicit owner approval." : "A new wallet needs simulated verification and explicit owner approval."} Existing approved work orders always retain their original recipient.</p>{snapshot.profile.pendingWallet ? <div className={s.notice}><strong>Awaiting owner approval</strong><p className={s.meta}>{snapshot.profile.pendingWallet.account}</p><p>The current approved wallet remains unchanged until the owner accepts this request.</p></div> : <><label htmlFor="wallet-account">{snapshot.profile.wallet ? "Requested new testnet wallet" : "Initial testnet wallet"}</label><input id="wallet-account" value={wallet} onChange={e => { walletAbort.current?.abort(); setWallet(e.target.value); setChallenge(""); }} placeholder="contractor-demo.testnet"/>{persistent ? <div className={s.actions}><ActionButton busy={busy} className={s.button} disabled={busy||!wallet} onClick={()=>perform(async()=>{
       if(!(adapter instanceof PersistentContractorAdapter))throw Error("Persistent wallet verification required.");
       const controller=new AbortController();walletAbort.current=controller;
       const challenge=await adapter.challenge(wallet);
       if(controller.signal.aborted)throw Error("Wallet changed. Request a fresh message.");
       const signed=await signMeteorMessage(meteorExtension(),{...challenge,nonce:Uint8Array.from(atob(challenge.nonce),c=>c.charCodeAt(0))},120000,controller.signal);
       if(controller.signal.aborted)throw Error("Wallet changed. Request a fresh message.");
       return adapter.proof({...challenge,...signed});
    },"Wallet control verified. Owner approval is still required.")}>Verify wallet and request approval</ActionButton><p className={s.small}>Meteor testnet extension required. This requests an off-chain message only, never a transaction or key installation.</p></div> : <div className={s.actions}><ActionButton busy={busy} className={`${s.button} ${s.secondary}`} disabled={busy || !wallet} onClick={() => perform(() => adapter.command({ action: "wallet-challenge", account: wallet }), "Simulated challenge ready. This does not prove real wallet control.", p => setChallenge(p.challenge || ""))}>Prepare simulated verification</ActionButton>{challenge && <ActionButton busy={busy} className={s.button} disabled={busy} onClick={() => perform(() => adapter.command({ action: "wallet-proof", challenge }), "Simulated wallet request sent to the owner.", () => setChallenge(""))}>Simulate proof and request approval</ActionButton>}</div>}</>}</section><aside className={s.card}><h2>Wallet approval</h2><p className={s.muted}>{persistent ? "The backend verifies the NEP-413 signature and checks the current FullAccess key at a finalized testnet block. Expired, replayed, cross-profile or revoked proofs are rejected." : "This demo does not connect a wallet, sign a message or verify a key on NEAR. The challenge exercises request expiry and replay handling only."}</p><p className={s.muted}>Changing this wallet never edits a work order’s recipient. Ask the owner about existing work if it should be paid differently.</p><div className={s.disabled}>{persistent ? "Wallet verification is available. Payment execution remains disabled." : "Real wallet verification and payment execution are not enabled."}</div></aside></div>}
 </>}</PortalShell>;
}
