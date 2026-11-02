"use client";
import { useEffect, useRef, useState } from "react";
import { MockContractorAdapter, PersistentContractorAdapter, parseBill } from "../../data/contractor-adapter";
import type { BillAttachment, BillFields, ContractorBill, ContractorSnapshot } from "../../data/contractor-adapter";
import { currencyConflict } from "../../data/invoice-currency";
import {meteorExtension,signMeteorMessage} from "../../data/meteor-message";
import { amountFromNear } from "../../data/owner-adapter";
import { PortalShell, BillCard, s } from "../demo/portal-ui";
const empty: BillFields = { reference: "", orderId: "", amount: "", asset: "NEAR", recipient: "" };
export default function ContractorPortalEntry(){const [adapter,setAdapter]=useState<MockContractorAdapter|PersistentContractorAdapter|null>(null);useEffect(()=>{setAdapter(new URLSearchParams(location.search).get("mode")==="demo"?new MockContractorAdapter():new PersistentContractorAdapter());},[]);return adapter?<ContractorPortal key={adapter.mode} adapter={adapter}/>:<p>Opening private billing…</p>;}
function ContractorPortal({adapter}:{adapter:MockContractorAdapter|PersistentContractorAdapter}) {
 const persistent=adapter.mode==="persistent",walletAbort=useRef<AbortController|null>(null);
    const [snapshot, setSnapshot] = useState<ContractorSnapshot | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
    const [tab, setTab] = useState("Submit a bill"), [body, setBody] = useState(""), [fields, setFields] = useState<BillFields>(empty), [description, setDescription] = useState(""), [attachment, setAttachment] = useState<BillAttachment | null>(null), [edit, setEdit] = useState<ContractorBill | null>(null);
    const [wallet, setWallet] = useState(""), [challenge, setChallenge] = useState("");
    const submission = useRef("");
    const current = useRef(""), accessGeneration = useRef(0), sessionReady = useRef(false);
    function clearDraft() { walletAbort.current?.abort(); submission.current = ""; setBody(""); setFields(empty); setDescription(""); setAttachment(null); setEdit(null); setWallet(""); setChallenge(""); }
    async function refresh() { if (!sessionReady.current)
        return; const generation = accessGeneration.current; try {
        const next = await adapter.snapshot();
        if (generation !== accessGeneration.current)
            return;
        if (current.current && current.current !== next.profile.id)
            clearDraft();
        current.current = next.profile.id;
        setSnapshot(next);
    }
    catch (e) {
        if (generation !== accessGeneration.current)
            return;
        accessGeneration.current++;
        sessionReady.current = false;
        setLoading(false);
        setBusy(false);
        setSnapshot(null);
        clearDraft();
        setNotice("");
        setError(e instanceof Error ? e.message : "Private access unavailable.");
    } }
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
        void refresh(); }, 2000); const focus = () => { if (active && sessionReady.current)
        void refresh(); }; const changed = () => { void load(); }; window.addEventListener("focus", focus); window.addEventListener("hashchange", changed); return () => { active = false; accessGeneration.current++; sessionReady.current = false; clearInterval(timer); accessEvents.close(); window.removeEventListener("focus", focus); window.removeEventListener("hashchange", changed); }; }, []);
    async function perform<T>(action: () => Promise<T>, message: string, onSuccess?: (result: T) => void) { const generation = accessGeneration.current; setBusy(true); setError(""); setNotice(""); try {
        const result = await action();
        if (generation !== accessGeneration.current)
            return;
        onSuccess?.(result);
        await refresh();
        if (generation === accessGeneration.current)
            setNotice(message);
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
    function answer(b: ContractorBill) { submission.current = crypto.randomUUID(); setEdit(b); setFields({ reference: b.reference, orderId: b.orderId, amount: b.amount, asset: b.asset, recipient: b.recipient }); setBody(b.text); setDescription(b.description); setAttachment(b.attachment); setTab("Submit a bill"); setNotice(b.ownerNote); }
    return <PortalShell persistent={persistent}>{loading ? <p>Opening your private workspace…</p> : !snapshot ? <section className={s.card}><h1 className={s.heading}>Private access unavailable</h1><p role="alert">{error || "Open the private invitation link the owner created for you."}</p><p className={s.muted}>Ask the owner for a new link if this one was revoked or expired. Private records are not available.</p></section> : <>
 <div className={s.intro}><span className={s.tag}>CONTRACTOR WORKSPACE</span><h1 className={s.heading}>Hello, {snapshot.profile.name}.</h1><p className={s.muted}>Send a clear bill. Follow its review. Keep your wallet details up to date.</p></div>
 <nav className={s.tabs} aria-label="Contractor sections">{["Submit a bill", "My payments", "Wallet details"].map(t => <button key={t} className={`${s.tab} ${tab === t ? s.active : ""}`} aria-current={tab === t ? "page" : undefined} onClick={() => { setTab(t); setError(""); setNotice(""); }}>{t}</button>)}</nav>
 {error && <p role="alert" className={`${s.notice} ${s.error}`}>{error}</p>}{notice && <p role="status" className={s.notice}>{notice}</p>}
 {tab === "Submit a bill" && <div className={s.grid}><section className={s.card}><h2>{edit ? "Answer the owner’s clarification" : "Start with the work you did."}</h2><p className={s.muted}>Paste your bill in your own words. Use the fields below to confirm the payment details.</p>
 <label htmlFor="bill-text">{persistent ? "What did you do?" : "Bill text"}</label><textarea id="bill-text" rows={7} maxLength={24000} value={body} onChange={e => setBody(e.target.value)} placeholder={'Work order: WO-001\nAmount: 1 NEAR\nOne article delivered for the approved brief.'}/><div className={s.actions}><button type="button" className={`${s.button} ${s.secondary}`} onClick={parse}>Format labeled details</button></div>
 {persistent && <><label htmlFor="primary-amount">How much are you requesting?</label><input id="primary-amount" inputMode="decimal" value={fields.amount} onChange={e=>setFields({...fields,amount:e.target.value})}/><p>Currency: NEAR · Testnet</p></>}<div className={s.file}><label htmlFor="invoice-upload">Attach an invoice</label><input id="invoice-upload" type="file" accept=".txt,.pdf,.png,.jpg,.jpeg" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (!file)
                return; void perform(async () => { if (file.size > 1048576)
                throw Error("Upload a file up to 1 MB."); const content = file.type === "text/plain" || /\.txt$/i.test(file.name) ? await file.text() : null; if (content && content.length > 24000) throw Error("Text invoices are limited to 24,000 characters. Shorten the text or attach a PDF and enter details manually."); const saved = await adapter.upload(file); return { saved, content }; }, persistent ? "Private attachment saved." : "Attachment saved in this private demo workspace.", ({ saved, content }) => { setAttachment(saved); if (content !== null) setBody(content); }); e.target.value = ""; }}/><p className={s.small}>TXT, PDF, PNG or JPEG · up to 1 MB. TXT fills the bill text. PDFs/images are attachments only; enter their details manually. No OCR or AI extraction.</p>{attachment && <p>{attachment.name} · {Math.ceil(attachment.size / 1024)} KB</p>}</div>
 <h3 style={{ marginTop: 28 }}>Clarify the payment details</h3><p>Invoice reference assigned automatically on submission.</p>
 <label htmlFor="work-order">Approved work order</label><select id="work-order" disabled={!!edit} value={fields.orderId} onChange={e => setFields({ ...fields, orderId: e.target.value })}><option value="">Choose your approved work order</option>{snapshot.orders.map(o => <option key={o.id} value={o.id}>{o.reference} · {o.title}</option>)}</select>{snapshot.orders.length === 0 && <p className={s.small}>The owner must approve your wallet and work order first.</p>}
 <label htmlFor="bill-description">{persistent ? "Short description (optional)" : "Work description"}</label><input id="bill-description" value={description} maxLength={1000} onChange={e => setDescription(e.target.value)}/>
 {!persistent && <><label htmlFor="bill-amount">Amount (as invoiced)</label><input id="bill-amount" value={fields.amount} onChange={e => setFields({ ...fields, amount: e.target.value })}/>
 <p>Currency: NEAR · Testnet</p></>}
 <label htmlFor="invoice-wallet">Wallet stated on invoice (optional)</label><input id="invoice-wallet" value={fields.recipient} onChange={e => setFields({ ...fields, recipient: e.target.value })} placeholder="Leave empty to use the approved work order"/><p className={s.small}>This field can flag a mismatch. It cannot change the approved recipient.</p>
 <div className={s.actions}><button className={s.button} disabled={busy || blockingMissing.length > 0} onClick={() => perform(() => adapter.command({ action: edit ? "clarify-invoice" : "submit-invoice", submissionId: submission.current || (submission.current = crypto.randomUUID()), ...(edit ? { invoiceId: edit.id } : {}), fields, text: body, description: description || (persistent ? body.slice(0,1000) : ""), ...(attachment ? { attachmentId: attachment.id } : {}) }), "Bill submitted for owner review. No payment was initiated.", () => { clearDraft(); setTab("My payments"); })}>{edit ? "Send clarification" : persistent && currencyConflict(body) ? "Submit for clarification" : "Submit bill for review"}</button>{edit && <button className={`${s.button} ${s.secondary}`} onClick={() => { clearDraft(); setTab("My payments"); }}>Cancel clarification</button>}</div></section>
 <aside><section className={s.preview} aria-label="Formatted bill preview"><span className={s.tag}>{persistent ? "FORMATTED PREVIEW · TESTNET" : "FORMATTED PREVIEW · DEMO"}</span><h3>{edit?.reference || "Reference assigned on submission"}</h3><p className={s.muted}>{snapshot.profile.name}</p><div className={s.money}>{fields.amount || "—"} {currencyConflict(body) ? "— currency conflict" : "NEAR"}</div><dl><dt>Work order</dt><dd>{order?.reference || "Needs clarification"}</dd><dt>Description</dt><dd>{description || (persistent ? body : "") || "Needs clarification"}</dd><dt>Fixed recipient</dt><dd className={s.meta}>{order?.recipient || "Select an approved work order"}</dd><dt>Attachment</dt><dd>{attachment?.name || "None"}</dd></dl><p className={s.inline}>{body || "Your bill text will appear here."}</p></section><section className={s.card} style={{ marginTop: 20 }}><h3>{missing.length ? "A few details are missing" : "Ready for owner review"}</h3>{missing.length ? <ul className={s.checklist}>{missing.map(m => <li key={m}>{m}</li>)}</ul> : <p className={s.muted}>The owner still checks the amount, currency and approved work order. Submission never authorizes a transfer.</p>}{order && fields.amount && fields.amount !== order.amount && <p className={s.small}>The owner will review this amount against {order.amount} NEAR.</p>}<div className={s.disabled}>Payment execution and deployment disabled.</div></section></aside></div>}
 {tab === "My payments" && <section className={s.card}><div className={s.split}><div><h2>My payments</h2><p className={s.muted}>Your submitted invoices and owner-review status. {persistent ? "These records are saved by your organization. Review approval is not a payment; no Paid state is shown without confirmed chain evidence." : "All records here are simulated."}</p></div><button className={`${s.button} ${s.secondary}`} onClick={refresh}>Refresh status</button></div>{snapshot.invoices.length === 0 ? <p className={s.empty}>No submitted invoices yet.</p> : snapshot.invoices.map(b => <BillCard key={b.id} bill={b} persistent={persistent}>{b.status === "Needs clarification" && <div className={s.actions}><button className={s.button} onClick={() => answer(b)}>Answer clarification · {b.reference}</button></div>}</BillCard>)}</section>}
 {tab === "Wallet details" && <div className={s.grid}><section className={s.card}><h2>Wallet details</h2><span className={s.pill}>{snapshot.profile.wallet ? "Owner-approved wallet" : "Initial wallet not approved"}</span><p className={s.meta}>{snapshot.profile.wallet || "No approved wallet yet"}</p><p className={s.muted}>{persistent ? "Verify wallet control with a NEAR testnet message, then wait for explicit owner approval." : "A new wallet needs simulated verification and explicit owner approval."} Existing approved work orders always retain their original recipient.</p>{snapshot.profile.pendingWallet ? <div className={s.notice}><strong>Awaiting owner approval</strong><p className={s.meta}>{snapshot.profile.pendingWallet.account}</p><p>The current approved wallet remains unchanged until the owner accepts this request.</p></div> : <><label htmlFor="wallet-account">{snapshot.profile.wallet ? "Requested new testnet wallet" : "Initial testnet wallet"}</label><input id="wallet-account" value={wallet} onChange={e => { walletAbort.current?.abort(); setWallet(e.target.value); setChallenge(""); }} placeholder="contractor-demo.testnet"/>{persistent ? <div className={s.actions}><button className={s.button} disabled={busy||!wallet} onClick={()=>perform(async()=>{
       if(!(adapter instanceof PersistentContractorAdapter))throw Error("Persistent wallet verification required.");
       const controller=new AbortController();walletAbort.current=controller;
       const challenge=await adapter.challenge(wallet);
       if(controller.signal.aborted)throw Error("Wallet changed. Request a fresh message.");
       const signed=await signMeteorMessage(meteorExtension(),{...challenge,nonce:Uint8Array.from(atob(challenge.nonce),c=>c.charCodeAt(0))},120000,controller.signal);
       if(controller.signal.aborted)throw Error("Wallet changed. Request a fresh message.");
       return adapter.proof({...challenge,...signed});
    },"Wallet control verified. Owner approval is still required.")}>Verify wallet and request approval</button><p className={s.small}>Meteor testnet extension required. This requests an off-chain message only, never a transaction or key installation.</p></div> : <div className={s.actions}><button className={`${s.button} ${s.secondary}`} disabled={busy || !wallet} onClick={() => perform(() => adapter.command({ action: "wallet-challenge", account: wallet }), "Simulated challenge ready. This does not prove real wallet control.", p => setChallenge(p.challenge || ""))}>Prepare simulated verification</button>{challenge && <button className={s.button} disabled={busy} onClick={() => perform(() => adapter.command({ action: "wallet-proof", challenge }), "Simulated wallet request sent to the owner.", () => setChallenge(""))}>Simulate proof and request approval</button>}</div>}</>}</section><aside className={s.card}><h2>Approval, without surprises.</h2><p className={s.muted}>{persistent ? "The backend verifies the NEP-413 signature and checks the current FullAccess key at a finalized testnet block. Expired, replayed, cross-profile or revoked proofs are rejected." : "This demo does not connect a wallet, sign a message or verify a key on NEAR. The challenge exercises request expiry and replay handling only."}</p><p className={s.muted}>Changing this wallet never edits a work order’s recipient. Ask the owner about existing work if it should be paid differently.</p><div className={s.disabled}>{persistent ? "Wallet verification is available. Payment execution remains disabled." : "Real wallet verification and payment execution are not enabled."}</div></aside></div>}
 </>}</PortalShell>;
}
