import crypto from "node:crypto";
import path from "node:path";
import {PublicKey} from "near-api-js";
import {ContractorRecordStore} from "./contractor-records.ts";
import {identityService,type IdentityAuth} from "./identity.ts";
import {service} from "./service.ts";
import {liveConfig} from "./config.ts";
import {nep413Digest,walletAccount} from "./auth.ts";
import type {ContractorBill,ContractorCommand,OwnerPortalCommand,PortalSnapshot} from "../data/contractor-adapter.ts";

export class ContractorBackend extends ContractorRecordStore {
 readonly identities:IdentityAuth;
 constructor(file:string,identities:IdentityAuth=identityService()) {
  super(file,"persistent");
  this.identities=identities;
  this.db.exec(`CREATE TABLE IF NOT EXISTS contractor_authorities(org TEXT PRIMARY KEY,owner TEXT NOT NULL);
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
  return this.inspect(org);
 }
 private inspect(org:string):PortalSnapshot {
  const profiles=(this.db.prepare("SELECT payload FROM demo_profiles WHERE org=? ORDER BY rowid").all(org) as {payload:string}[]).map(r=>JSON.parse(r.payload));
  return {mode:"persistent",profiles,orders:this.rows("demo_orders",org),invoices:this.rows("demo_bills",org)};
 }
 async ownerWrite(token:string,org:string,input:OwnerPortalCommand) {
  await this.authorizeOwner(token,org);
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
 async read(session:string) {await this.contractorAccess(session);return this.snapshot(session);}
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
  return this.command(session,input);
 }
}
let singleton:ContractorBackend|undefined;
export function contractorService(){return singleton??=new ContractorBackend(path.resolve(/* turbopackIgnore: true */process.env.NNETICS_CONTRACTOR_DATABASE||"../../artifacts/live/contractors.db"));}
