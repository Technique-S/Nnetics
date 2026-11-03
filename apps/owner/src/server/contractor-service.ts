import crypto from "node:crypto";
import path from "node:path";
import {PublicKey} from "near-api-js";
import {ContractorRecordStore} from "./contractor-records.ts";
import {identityService,type IdentityAuth} from "./identity.ts";
import {service} from "./service.ts";
import {liveConfig} from "./config.ts";
import {nep413Digest,walletAccount} from "./auth.ts";
import type {ContractorBill,ContractorCommand,OwnerPortalCommand,PortalSnapshot} from "../data/contractor-adapter.ts";
import {extractBilling,sourceQuestions,mentionedOrders,sourceOrderQuestions} from "./billing-extraction.ts";
import {reviewedPayment,importPaymentIntent} from "./contractor-payments.ts";
import {WorkerNearTransport} from "./signer.ts";
import {boundedId} from "./queue.ts";
import type {Payment} from "../data/owner-adapter.ts";

export class ContractorBackend extends ContractorRecordStore {
 readonly identities:IdentityAuth;
 constructor(file:string,identities:IdentityAuth=identityService()) {
  super(file,"persistent");
  this.identities=identities;
  this.db.exec(`CREATE TABLE IF NOT EXISTS contractor_authorities(org TEXT PRIMARY KEY,owner TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS contractor_extractions(id TEXT PRIMARY KEY,profile TEXT NOT NULL,generation INTEGER NOT NULL,session TEXT NOT NULL,text TEXT NOT NULL,payload TEXT NOT NULL,expires INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS contractor_queue_intents(bill TEXT PRIMARY KEY,org TEXT NOT NULL,chain_order TEXT NOT NULL,payload TEXT NOT NULL,state TEXT NOT NULL,UNIQUE(org,chain_order));
   CREATE TABLE IF NOT EXISTS contractor_challenges(nonce TEXT PRIMARY KEY,session TEXT NOT NULL,profile TEXT NOT NULL,generation INTEGER NOT NULL,account TEXT NOT NULL,message TEXT NOT NULL,origin TEXT NOT NULL,expires INTEGER NOT NULL);`);
 }
 private async scope(org:string) {
  if(typeof org!=="string"||!org||org.length>64) throw Error("Select an authorized organization.");
  const linked=this.identities.db.prepare("SELECT vault,owner,payload FROM organization_vaults WHERE organization=?").get(org) as {vault:string;owner:string;payload:string}|undefined;
  const row=this.identities.db.prepare("SELECT creator FROM identity_organizations WHERE id=? AND network='testnet'").get(org) as {creator:string}|undefined;
  let config:ReturnType<typeof liveConfig>|undefined;
  try{config=liveConfig();}catch{/* No vault is required for off-chain billing. */}
  if(config?.configured&&config.organization===org) {
   const s=service(),block=await s.chain.finalized();
   const vault=await s.chain.view<{owner:string}>("get_vault",{},block.hash);
   return {owner:walletAccount(vault.owner),configured:true};
  }
  if(!row) throw Error("Organization access denied.");
  if(linked) {
   const intent=JSON.parse(linked.payload);
   if(!intent.config?.vaultHash||intent.state!=="verified") throw Error("Vault binding needs verification.");
   const block=await this.identities.rpc<{header:{hash:string}}>("block",{finality:"final"});
   const params={block_id:block.header.hash,account_id:linked.vault};
   const [account,state]=await Promise.all([
    this.identities.rpc<{code_hash:string;block_hash:string}>("query",{...params,request_type:"view_account"}),
    this.identities.rpc<{result:number[];block_hash:string}>("query",{...params,request_type:"call_function",method_name:"get_vault",args_base64:"e30="})
   ]);
   const vault=JSON.parse(Buffer.from(state.result).toString("utf8"));
   if(account.block_hash!==params.block_id||state.block_hash!==params.block_id||account.code_hash!==intent.config.vaultHash||vault.owner!==linked.owner||vault.owner!==row.creator) throw Error("Vault ownership or code changed. Billing access is blocked pending review.");
  }
  return {owner:row.creator,configured:false};
 }
 private bind(org:string,owner:string) {
  this.db.prepare("INSERT OR IGNORE INTO contractor_authorities VALUES (?,?)").run(org,owner);
  const row=this.db.prepare("SELECT owner FROM contractor_authorities WHERE org=?").get(org) as {owner:string};
  if(row.owner!==owner) throw Error("Organization ownership changed. Existing private links and records are blocked pending review.");
 }
 async authorizeOwner(token:string,org:string,write=true) {
  const who=await this.identities.authenticate(token),scope=await this.scope(org);
  if(scope.configured) {
   const {access}=await service().auth.authorize(token,write?"owner":"read");
   if(access.organization!==org||access.vaultOwner!==scope.owner) throw Error("Organization access denied.");
  } else if(who.account_id!==scope.owner) throw Error("Organization access denied; only its creator may manage off-chain billing.");
  this.identities.verify(token);this.bind(org,scope.owner);
  return scope;
 }
 async ownerRead(token:string,org:string):Promise<PortalSnapshot> {
  await this.authorizeOwner(token,org,false);
  const snapshot=this.inspect(org);await this.paymentStates(org,snapshot.invoices);this.identities.verify(token);return snapshot;
 }
 private inspect(org:string):PortalSnapshot {
  const profiles=(this.db.prepare("SELECT payload FROM demo_profiles WHERE org=? ORDER BY rowid").all(org) as {payload:string}[]).map(r=>JSON.parse(r.payload));
  const orders=this.rows<import("../data/contractor-adapter.ts").ContractorOrder>("demo_orders",org),invoices=this.rows<ContractorBill>("demo_bills",org);
  for(const bill of invoices){bill.orderReference=orders.find(o=>o.id===bill.orderId)?.reference;bill.reasons=[...new Set([...bill.reasons,...sourceOrderQuestions(bill.text,bill.orderId,orders.filter(o=>o.contractorId===bill.contractorId))])];}
  return {mode:"persistent",profiles,orders,invoices};
 }
 async ownerWrite(token:string,org:string,input:OwnerPortalCommand):Promise<{token?:string;payment?:{state:string;orderId:string};ok?:boolean}> {
  await this.authorizeOwner(token,org);
  if(input.action==="queue-invoice")return this.queueInvoice(token,org,input.invoiceId,input.orderId);
  if(input.action==="approve-wallet") {
   const p=this.profile(input.profileId,org),proof=p.pendingWallet;
   if(!proof||proof.simulatedProof||!proof.publicKey||!proof.verifiedAt||Date.now()-proof.verifiedAt>900000) throw Error("A fresh verified wallet request is required. Reject this stale request so the contractor can verify again.");
   await this.identities.keyBlock({account_id:proof.account,public_key:proof.publicKey});
   this.identities.verify(token);
  }
  this.db.exec("BEGIN IMMEDIATE");
  try{const result=this.ownerMutation(org,input);this.db.exec("COMMIT");return result;}catch(e){this.db.exec("ROLLBACK");throw e;}
 }
 async contractorAccess(session:string) {
  const who=this.contractor(session),scope=await this.scope(who.org);
  this.bind(who.org,scope.owner);
  // Revocation/expiry can happen during RPC latency.
  return this.contractor(session);
 }
 async read(session:string) {const {org}=await this.contractorAccess(session);const snapshot=this.snapshot(session);for(const bill of snapshot.invoices){bill.orderReference=snapshot.orders.find(o=>o.id===bill.orderId)?.reference;bill.reasons=[...new Set([...bill.reasons,...sourceOrderQuestions(bill.text,bill.orderId,snapshot.orders)])];}await this.paymentStates(org,snapshot.invoices);this.contractor(session);return snapshot;}
 async extraction(session:string,input:{text:string;useAI:boolean;publicTextConfirmed:boolean}) {
  const {profile}=await this.contractorAccess(session);
  const recent=this.db.prepare("SELECT count(*) n FROM contractor_extractions WHERE profile=? AND expires>?").get(profile.id,Date.now()) as {n:number};
  if(recent.n>=10)throw Error("Extraction limit reached. Confirm details manually or retry after fifteen minutes.");
  const result=await extractBilling(input.text,{useAI:input.useAI===true,publicTextConfirmed:input.publicTextConfirmed===true,key:process.env.OPENROUTER_API_KEY,model:process.env.NNETICS_AI_MODEL});
  const current=this.contractor(session);if(current.profile.generation!==profile.generation)throw Error("Link changed; extract again.");
  const snapshot=this.snapshot(session),questions=[...sourceQuestions(input.text),...result.fields.questions];
  if(!result.fields.amount)questions.push("How much are you requesting? Enter one exact amount; no work-order allowance was substituted.");
  if(result.fields.currency&&result.fields.currency!=="NEAR")questions.push("The extracted currency is unsupported. Clarify the source; no conversion was made.");
  const mentioned=mentionedOrders(input.text,snapshot.orders);
  if(mentioned.length>1){result.fields.workOrderReference=null;questions.push("The text mentions multiple approved work orders. Which single order covers this bill? Select it explicitly.");}
  const matches=snapshot.orders.filter(o=>o.reference===result.fields.workOrderReference);
  if(matches.length!==1&&snapshot.orders.length!==1)questions.push("Which one approved work order does this bill cover? Select it explicitly.");
  const id=crypto.randomUUID(),payload={id,...result,questions:[...new Set(questions)],source:"contractor-confirmation-required" as const};
  this.db.prepare("INSERT INTO contractor_extractions VALUES (?,?,?,?,?,?,?)").run(id,profile.id,profile.generation,this.identities.hash(session),input.text,JSON.stringify(payload),Date.now()+900000);
  return payload;
 }
 private async queueInvoice(token:string,org:string,billId:string,chainOrderId:string) {
  boundedId(chainOrderId);
  const linked=this.identities.db.prepare("SELECT payload,vault FROM organization_vaults WHERE organization=?").get(org) as {payload:string;vault:string}|undefined;
  const config=liveConfig();
  if(!linked||JSON.parse(linked.payload).state!=="verified"||!config.configured||config.organization!==org||linked.vault!==config.contract)throw Error("Payment linkage gated: provision and verify this organization's vault, then configure its reviewed payment adapter.");
  const s=service();s.queue.bindOrganization(org);
  const {block}=await s.auth.authorize(token,"owner");
  const chain=await s.chain.snapshot(s.queue,block);
  // Read an explicitly selected ID even when it is not in discovery hints yet.
  if(!chain.orders.some(o=>o.id===chainOrderId)) {
   const order=await s.chain.view<import("../data/owner-adapter.ts").WorkOrder|null>("get_order",{order_id:chainOrderId},block.hash);
   if(order){chain.orders.push({...order,id:chainOrderId,title:chainOrderId});const vendor=await s.chain.view<import("../data/owner-adapter.ts").Vendor|null>("get_vendor",{vendor_id:order.vendor_id},block.hash);if(vendor)chain.vendors.push({...vendor,id:order.vendor_id,name:order.vendor_id,role:"Testnet vendor"});}
  }
  await this.authorizeOwner(token,org);
  const snapshot=this.inspect(org),bill=snapshot.invoices.find(b=>b.id===billId),local=snapshot.orders.find(o=>o.id===bill?.orderId);
  if(!bill||!local)throw Error("Invoice access denied.");
  if(bill.status!=="Approved"||bill.reasons.length)throw Error("Resolve billing clarification and obtain owner review before linking or resuming a payment intent.");
  const prior=this.db.prepare("SELECT payload,chain_order FROM contractor_queue_intents WHERE bill=? AND org=?").get(bill.id,org) as {payload:string;chain_order:string}|undefined;
  if(prior&&prior.chain_order!==chainOrderId)throw Error("Invoice already linked to one immutable chain order.");
  // Existing durable intent is immutable, including after the chain order has
  // become Pending/Paid; retry imports the same bytes and never resets the job.
  const invoice=prior?JSON.parse(prior.payload):reviewedPayment(bill,local,chain,chainOrderId);
  const job=importPaymentIntent(this.db,org,bill.id,invoice,s.queue);
  return {payment:{state:job.state,orderId:job.order_id},ok:true};
 }
 private async paymentStates(org:string,bills:ContractorBill[]) {
  for(const bill of bills){
   const intent=this.db.prepare("SELECT chain_order,payload FROM contractor_queue_intents WHERE bill=? AND org=?").get(bill.id,org) as {chain_order:string;payload:string}|undefined;if(!intent)continue;
   bill.payment={state:"blocked",reason:"Payment adapter unavailable; no payment confirmation.",orderId:intent.chain_order,transactionUrl:null,confirmed:false};
   try{
    const config=liveConfig();if(!config.configured||config.organization!==org)continue;
    const s=service();s.queue.bindOrganization(org);const job=s.queue.get(bill.reference);
    if(!job) {bill.payment.reason="Durable linkage prepared; owner must resume the same queue request.";continue;}
    const {reviewed:_,...saved}=job.invoice;
    if(JSON.stringify(saved)!==intent.payload){bill.payment.reason="Queue reference conflict; investigate without retrying payment.";continue;}
    bill.payment.state=job.state==="paid"?"pending":job.state;bill.payment.reason=job.state==="paid"?"Awaiting independent finalized chain and transaction-linkage checks.":job.reason;
    if(job.state!=="paid"||!job.hash||!job.attempt)continue;
    const block=await s.chain.finalized(),payment=await s.chain.view<Payment|null>("get_payment",{attempt_id:job.attempt},block.hash);
    if(payment?.status!=="Paid"||payment.invoice_id!==job.id||payment.order_id!==intent.chain_order||payment.amount!==job.invoice.amount||payment.recipient!==job.invoice.recipient||!(await new WorkerNearTransport(config).confirmsPayment(job.hash,{...payment,attempt_id:job.attempt as Payment["attempt_id"]})))continue;
    bill.payment={...bill.payment,state:"paid",confirmed:true,transactionUrl:`https://testnet.nearblocks.io/txns/${job.hash}`};
   }catch{/* A queue label alone never establishes a confirmed transfer. */}
  }
 }
 async enterVerifiedLink(token:string) {
  const session=this.enter(token);
  try{await this.contractorAccess(session);return session;}catch(e){this.logoutContractor(session);throw e;}
 }
 async walletChallenge(session:string,account:unknown) {
  const {profile}=await this.contractorAccess(session),wallet=walletAccount(account);
  if(profile.pendingWallet) throw Error("Ask the owner to resolve the pending wallet request first.");
  const nonce=crypto.randomBytes(32).toString("base64"),expires=Date.now()+300000,origin=this.identities.config.origin;
  const message=`Nnetics contractor wallet verification\nOrganization/profile: ${profile.id}\nGeneration: ${profile.generation}\nAccount: ${wallet}\nNetwork: testnet\nExpires: ${new Date(expires).toISOString()}\nRequest owner approval of this billing wallet only. No login, transaction or payment authorization.`;
  this.db.prepare("DELETE FROM contractor_challenges WHERE session=? OR expires<=?").run(this.identities.hash(session),Date.now());
  this.db.prepare("INSERT INTO contractor_challenges VALUES (?,?,?,?,?,?,?,?)").run(nonce,this.identities.hash(session),profile.id,profile.generation,wallet,message,origin,expires);
  return {nonce,message,recipient:origin,accountId:wallet};
 }
 async walletProof(session:string,input:Record<string,unknown>) {
  const who=await this.contractorAccess(session);
  const c=this.db.prepare("SELECT * FROM contractor_challenges WHERE nonce=? AND session=? AND profile=? AND generation=? AND expires>?").get(String(input.nonce||""),this.identities.hash(session),who.profile.id,who.profile.generation,Date.now()) as {nonce:string;account:string;message:string;origin:string;expires:number}|undefined;
  if(!c||c.account!==input.accountId||c.origin!==this.identities.config.origin||typeof input.publicKey!=="string"||!input.publicKey.startsWith("ed25519:")||typeof input.signature!=="string") throw Error("Wallet proof expired, mismatched or replayed. Request a fresh message.");
  const sig=Buffer.from(input.signature,"base64");
  if(sig.length!==64||sig.toString("base64")!==input.signature||!PublicKey.fromString(input.publicKey).verify(nep413Digest(c.message,c.nonce,c.origin),sig)) throw Error("Wallet signature verification failed. No approval requested.");
  await this.identities.keyBlock({account_id:c.account,public_key:input.publicKey});
  this.db.exec("BEGIN IMMEDIATE");
  try{
   const {org,profile}=this.contractor(session);
   if(profile.pendingWallet||c.expires<=Date.now()||!this.db.prepare("DELETE FROM contractor_challenges WHERE nonce=? AND generation=? AND expires>?").run(c.nonce,profile.generation,Date.now()).changes) throw Error("Wallet proof superseded, revoked or replayed.");
   profile.pendingWallet={id:crypto.randomUUID(),account:c.account,baseVersion:profile.walletVersion,generation:profile.generation,simulatedProof:false,publicKey:input.publicKey,verifiedAt:Date.now()};
   this.save(org,profile);this.db.exec("COMMIT");return {ok:true};
  }catch(e){this.db.exec("ROLLBACK");throw e;}
 }
 async write(session:string,input:ContractorCommand) {
  await this.contractorAccess(session);
  if(input.action!=="submit-invoice"&&input.action!=="clarify-invoice") throw Error("Unsupported contractor mutation. Use the verified wallet challenge endpoint.");
  if(input.extractionId){
   const {profile}=this.contractor(session),r=this.db.prepare("SELECT text,payload FROM contractor_extractions WHERE id=? AND profile=? AND generation=? AND session=? AND expires>?").get(input.extractionId,profile.id,profile.generation,this.identities.hash(session),Date.now()) as {text:string;payload:string}|undefined;
   // An already committed identical submission remains resumable after preview
   // expiry; the storage-layer fingerprint still rejects changed retries.
   const prior=this.db.prepare("SELECT invoice FROM invoice_submissions WHERE scope=? AND token=?").get(`${this.contractor(session).org}:${profile.id}`,input.submissionId||"");
   if(!prior&&(!r||r.text!==input.text||input.extractionConfirmed!==true))throw Error("Confirm a fresh extraction preview for this exact billing text, or use manual entry.");
  }
  return this.command(session,input);
 }
}
let singleton:ContractorBackend|undefined;
export function contractorService(){return singleton??=new ContractorBackend(path.resolve(/* turbopackIgnore: true */process.env.NNETICS_CONTRACTOR_DATABASE||"../../artifacts/live/contractors.db"));}
