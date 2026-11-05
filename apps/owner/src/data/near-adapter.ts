import { walletTransport, type WalletOperation } from "./wallet-transport";
import { walletResult } from "./wallet-result";
import { Buffer } from "buffer";
import { account, uint } from "./owner-adapter";
import { assertTestedProtocol } from "./protocol";
import {assertSameLiveContext} from "./config-context";
import {
  meteorExtension,
  signMeteorMessage,
  testnetWalletAccount,
  requestMeteorOwnerTransaction,
} from "./meteor-message";
import type {OwnerTransactionReview} from './owner-transaction';
import type {
  Invoice,
  OwnerAdapter,
  OwnerCommand,
  OwnerSnapshot,
  TransferScenario,
} from "./owner-adapter";
import type {
  WalletSelector,
  WalletModuleFactory,
  InjectedWallet,
} from "@near-wallet-selector/core";

export interface PublicConfig {
  network: "testnet";
  contract: string;
  organization: string;
  worker: string;
  publicKey: string;
  configured: boolean;
  missingConfiguration?: string[];
  transactionsEnabled: boolean;
  ownerTransactionsEnabled?:boolean;
  paymentExecutionEnabled?:boolean;
  ownerTransactionRestriction?:{id:string;planHash:string;owner:string;contract:string;method:string;args?:Record<string,unknown>;deposit:string;gas:string;operational?:boolean}|null;
  ownerTransactionReason?:string;
}
export { api, LiveApiError } from "./live-request";
import { api, LiveApiError } from "./live-request";
// Explicit, optional action only. No automatic focus/navigation caller.
export async function checkMeteorIdentity(signal?: AbortSignal) {
  const challenge=await api<{nonce:string;message:string;recipient:string}>("session/challenge",{},signal);
  // The pinned official SignMessage input makes accountId optional. Omitting it
  // lets Meteor select the current identity instead of forcing the old account.
  const signature=await signMeteorMessage(meteorExtension(),{
    message:challenge.message,recipient:challenge.recipient,nonce:Buffer.from(challenge.nonce,"base64"),
  },240_000,signal);
  if(signal?.aborted)throw Error("Wallet verification cancelled. Verify again.");
  return api<{accountId:string;accountChanged:boolean;authenticationRequired?:boolean}>("session/resume",{...signature,nonce:challenge.nonce},signal);
}
export class NearOwnerAdapter implements OwnerAdapter {
  readonly mode = "testnet" as const;
  readonly deploymentEnabled = false as const;
  private selector: WalletSelector | null = null;
  private listeners = new Set<() => void>();
  private messageOnlyMeteor =
    typeof window !== "undefined" &&
    (sessionStorage.getItem("nnetics-wallet") ?? localStorage.getItem("nnetics-wallet")) !== "nightly";
  constructor(
    readonly config: PublicConfig,
    readonly expectedAccount?: string,
  ) {}
  async wallet() {
    if (!this.selector) {
      const [{ setupWalletSelector }, { setupNightly }] = await Promise.all([
        import("@near-wallet-selector/core"),
        import("@near-wallet-selector/nightly"),
      ]);
      const nightly:WalletModuleFactory<InjectedWallet>=async options=>{
        const module=await setupNightly()(options);
        if(!module)return null;
        return {...module,init:context=>module.init({...context,provider:walletTransport(()=>this.walletOperation)})};
      };
      this.selector = await setupWalletSelector({
        network: {networkId:"testnet",nodeUrl:"https://rpc.testnet.fastnear.com",helperUrl:"https://helper.testnet.near.org",indexerUrl:"https://test.api.fastnear.com/v0",explorerUrl:"https://testnet.nearblocks.io"},
        modules: [nightly],
      });
    }
    return this.selector.wallet<InjectedWallet>("nightly");
  }
  async connect() {
    if (!this.config.configured)
      throw new Error(
        "Configure a fresh testnet vault and accounts first. No contract has been deployed by this app.",
      );
    const wallet = await this.wallet();
    await wallet.signIn({ contractId: this.config.contract });
    const accounts = await wallet.getAccounts();
    const selected = accounts[0];
    if (!selected) throw new Error("Select a testnet wallet account.");
    const challenge = await api<{
      nonce: string;
      message: string;
      recipient: string;
    }>("challenge", {
      accountId: selected.accountId,
      organization: this.config.organization,
    });
    const signature = await wallet.signMessage({
      ...challenge,
      nonce: Buffer.from(challenge.nonce, "base64"),
    });
    if (!signature)
      throw new Error("The wallet did not return a signed login challenge.");
    if (signature.accountId !== selected.accountId)
      throw new Error("Wallet account changed during login. Try again.");
    await api("login", {
      ...signature,
      nonce: challenge.nonce,
      organization: this.config.organization,
    });
    this.messageOnlyMeteor = false;
    sessionStorage.setItem("nnetics-wallet", "nightly");
    localStorage.setItem("nnetics-wallet", "nightly");
  }
  async connectMeteor(accountId?: string, signal?: AbortSignal, stage?:(message:string)=>void) {
    if (this.config.network !== "testnet")
      throw new Error(
        "Switch Meteor to NEAR testnet before verifying your identity.",
      );
    if(accountId!==undefined)testnetWalletAccount(accountId);
    const extension = meteorExtension();
    stage?.("Preparing the testnet sign-in message…");
    const challenge = await api<{
      nonce: string;
      message: string;
      recipient: string;
    }>("challenge", accountId===undefined?{discover:true}:{accountId},signal);
    stage?.("Approve the off-chain message in Meteor…");
    const signature = await signMeteorMessage(
      extension,
      {
        ...(accountId===undefined?{}:{accountId}),
        message: challenge.message,
        recipient: challenge.recipient,
        nonce: Buffer.from(challenge.nonce, "base64"),
      },
      240_000,
      signal,
    );
    if (signal?.aborted)
      throw new Error("Wallet account changed. Verify again.");
    const proof = {
      ...signature,
      nonce: challenge.nonce,
    };
    stage?.("Checking your signed proof on NEAR testnet…");
    await api("login", proof,signal); // Server retries only pre-session safe RPC reads.
    this.messageOnlyMeteor = true;
    sessionStorage.setItem("nnetics-wallet", "meteor");
    localStorage.setItem("nnetics-wallet", "meteor"); // connector hint only; never authority
    stage?.(`Signed in as ${signature.accountId}. Loading your workspace…`);
    return signature.accountId;
  }
  async snapshot(signal?: AbortSignal, deadline=Date.now()+180000) {
    signal=signal?AbortSignal.any([signal,this.reads.signal]):this.reads.signal;
    assertSameLiveContext(this.config,await api<PublicConfig>("config",undefined,signal,deadline));
    const state = await api<OwnerSnapshot>(
      "snapshot?organization=" + encodeURIComponent(this.config.organization), undefined, signal, deadline,
    );
    assertSameLiveContext(this.config,await api<PublicConfig>("config",undefined,signal,deadline));
    if (
      this.expectedAccount &&
      state.access?.accountId !== this.expectedAccount
    )
      throw new Error(
        "Wallet account changed. Clear this workspace and verify again.",
      );
    return state;
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    const timer = setInterval(listener, 10000);
    return () => {
      clearInterval(timer);
      this.listeners.delete(listener);
    };
  }
  emit() {
    for (const f of this.listeners) f();
  }
  private walletOperation?:WalletOperation;
  private calling = false;
  private reads = new AbortController();
  stage = "";
  lastOwnerAttempt:{id:string;hash:string;state:string;reportedHash?:string;reportedHashes?:string[];manualReviewRequired?:boolean}|null=null;
  reviewTransaction?: (review:OwnerTransactionReview)=>Promise<boolean>;
  activate() { if(this.reads.signal.aborted)this.reads=new AbortController(); }
  cancel() { this.reads.abort(); }
  async pendingOwnerAttempt(deadline=Date.now()+180000) { const result=await api<NonNullable<NearOwnerAdapter["lastOwnerAttempt"]>|null>("owner-attempt",undefined,this.reads.signal,deadline);this.lastOwnerAttempt=result;return result; }
  async cancelUnsubmittedOwnerReview() {
    const pending=await this.pendingOwnerAttempt();
    if(!pending||pending.state!=='prepared')throw Error('No unsubmitted review can be cancelled. Reconcile the recorded transaction instead.');
    await api('owner-attempt',{action:'rejected',id:pending.id},this.reads.signal);
    this.lastOwnerAttempt=null;
  }
  async checkOwnerAttempt(hash?:string,deadline=Date.now()+180000) {
    try {
    let result=await this.pendingOwnerAttempt(deadline);
    const recoveryKey="nnetics-owner-attempt:"+this.config.organization+":"+this.expectedAccount;
    if(!hash && result && !result.hash) {
      try {const saved=JSON.parse(localStorage.getItem(recoveryKey)||"null");if(saved?.id===result.id)hash=saved.hash;}catch{}
    }
    if(hash && result && ['unknown','manual_review'].includes(result.state)) {
      // A recovered Meteor ID is evidence, never a replacement for prepared bytes.
      await api("owner-attempt",{action:result.hash&&result.hash!==hash?'reported':'hash',id:result.id,hash},this.reads.signal,deadline);
      result=await this.pendingOwnerAttempt(deadline);
    }
    if(result?.manualReviewRequired||result?.state==='manual_review')throw Error('Conflicting wallet transaction evidence. Manual review required. Do not sign a replacement.');
    if(result && result.state!=="confirmed" && result.state!=="failed") throw Error("We couldn’t confirm this transaction yet. Check its status before trying again.");
    if(result?.state==="confirmed"||result?.state==="failed")localStorage.removeItem(recoveryKey);
    return result;
    } catch(error) {
      if(error instanceof LiveApiError && error.retryable)throw Error("We couldn’t confirm this transaction yet. Check its status before trying again.");
      throw error;
    }
  }
  async call(method: string, args: object, deposit = "1") {
    if(this.calling)throw Error("An owner request is already active.");
    this.calling=true;
    this.stage="Preparing funding request…";
    try { await this.callOnce(method,args,deposit); } finally {this.calling=false;this.walletOperation=undefined;this.stage="";}
  }
  private async callOnce(method: string, args: object, deposit: string) {
    const deadline=Date.now()+180000;
    if (!this.config.transactionsEnabled || this.config.ownerTransactionsEnabled===false)
      throw new Error(
        "Signing is disabled pending specific testnet authorization and review.",
      );
    const state = await this.snapshot(undefined,deadline); // Verify chain, deployment code and owner before wallet opens.
    if (
      state.access?.role !== "owner" ||
      state.access.organization !== this.config.organization ||
      state.access.accountId !== state.vault.owner
    )
      throw new Error(
        "Current on-chain vault ownership is required for owner actions.",
      );
    assertTestedProtocol(state.protocolVersion);
    if (this.messageOnlyMeteor) return this.callMeteor(method,args,deposit,deadline,state);
    const wallet = await this.wallet();
    if (
      !(await wallet.getAccounts()).some(
        (a) => a.accountId === state.access!.accountId,
      )
    )
      throw new Error(
        "Wallet differs from the verified session. Authenticate again.",
      );
    const { actionCreators } = await import("@near-wallet-selector/core");
    this.reads.signal.throwIfAborted();
    const attempt=await api<{id:string;publicKey:string;nonceFloor:string}>("owner-attempt",{action:"reserve",method,args,deposit},this.reads.signal,deadline);
    this.reads.signal.throwIfAborted();
    this.stage="Waiting for wallet approval…";
    this.walletOperation={signal:this.reads.signal,deadline,stage:message=>{this.stage=message;},record:async signed=>{
      const tx=signed.transaction,call=tx.actions[0]?.functionCall;
      if(tx.signerId!==state.access!.accountId||tx.receiverId!==this.config.contract||tx.publicKey.toString()!==attempt.publicKey||BigInt(tx.nonce)<=BigInt(attempt.nonceFloor)||tx.actions.length!==1||!call||call.methodName!==method||String(call.deposit)!==deposit||Buffer.from(call.args).toString()!==JSON.stringify(args))
        throw Error("Signed owner transaction differs from the reviewed request. No broadcast sent.");
      const {baseEncode}=await import("near-api-js");
      this.stage="Checking the approved transaction on the network…";
      const hash=baseEncode(new Uint8Array(await crypto.subtle.digest("SHA-256",new Uint8Array(tx.encode()))));
      try {localStorage.setItem("nnetics-owner-attempt:"+this.config.organization+":"+state.access!.accountId,JSON.stringify({id:attempt.id,hash}));}catch{}
      await api("owner-attempt",{action:"hash",id:attempt.id,hash},this.reads.signal,deadline);
    }};
    try { await walletResult(wallet.signAndSendTransaction({
      signerId: state.access.accountId,
      receiverId: this.config.contract,
      actions: [
        actionCreators.functionCall(
          method,
          args,
          100_000_000_000_000n,
          BigInt(deposit),
        ),
      ],
    }),this.reads.signal,Math.min(120000,deadline-Date.now())); } catch(error) {
      const code=(error as {code?:number|string}).code;
      if(code===4001 || code==='USER_REJECTED' || code==='USER_REJECTED_REQUEST') {
        await api("owner-attempt",{action:"rejected",id:attempt.id},this.reads.signal);
        throw Error("Wallet request was rejected. Review the details before trying again.");
      }
      throw Error("We couldn’t confirm this transaction yet. Check its status before trying again.");
    }
    this.stage="Checking transaction status…";
    const verified=await this.checkOwnerAttempt(undefined,deadline);
    if(verified?.state==="failed")throw Error("The contract rejected the recorded transaction. Review its details before trying again.");
    this.emit();
  }
  private async callMeteor(method:string,args:object,deposit:string,deadline:number,state:OwnerSnapshot) {
    meteorExtension(); // Capability check before reserving a durable request.
    if(!this.reviewTransaction)throw Error('Open the owner transaction review before signing.');
    const signal=this.reads.signal;
    const attempt=await api<OwnerTransactionReview>('owner-attempt',{action:'reserve',transport:'meteor',method,args,deposit},signal,deadline);
    this.lastOwnerAttempt={...attempt,state:'prepared'};
    if(!await this.reviewTransaction(attempt)){
      await api('owner-attempt',{action:'rejected',id:attempt.id},signal,deadline);
      this.lastOwnerAttempt=null;
      throw Error('Wallet review cancelled. No transaction requested.');
    }
    if(Date.now()>=attempt.expires)throw Error('Owner transaction review expired. Cancel the unsubmitted review before preparing again.');
    this.stage='Verify the selected Meteor signing account…';
    // Financial-action proof only. Never called by dashboard navigation/refresh.
    const proofSignal=AbortSignal.any([signal,AbortSignal.timeout(Math.max(1,Math.min(deadline,attempt.expires)-Date.now()))]);
    let selected:Awaited<ReturnType<typeof checkMeteorIdentity>>;
    try {selected=await checkMeteorIdentity(proofSignal);}catch(error){if(Date.now()>=Math.min(deadline,attempt.expires))throw Error('Owner transaction review expired. Cancel the unsubmitted review before preparing again.');throw error;}
    if(selected.accountChanged||selected.accountId!==state.access!.accountId){window.dispatchEvent(new Event('nnetics-wallet-mismatch'));throw Error('Wallet differs from the verified session. Switch wallet and authenticate again.');}
    // Decode and hash independently before handing exact bytes to sign-and-send.
    const {Transaction,baseEncode}=await import('near-api-js');
    const raw=Buffer.from(attempt.unsigned,'base64'),tx=Transaction.decode(raw),call=tx.actions[0]?.functionCall;
    if(attempt.network!=='testnet'||attempt.organization!==this.config.organization||attempt.owner!==state.access!.accountId||attempt.contract!==this.config.contract||tx.signerId!==attempt.owner||tx.receiverId!==attempt.contract||tx.actions.length!==1||!call||call.methodName!==method||String(call.deposit)!==deposit||String(call.gas)!==attempt.gas||Buffer.from(call.args).toString()!==JSON.stringify(args)||baseEncode(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)))!==attempt.hash)throw Error('Prepared owner transaction differs from review. No wallet transaction requested.');
    this.lastOwnerAttempt={...attempt,state:'unknown'};
    const dispatched=await api<{id:string;hash:string;state:string}|null>('owner-attempt',{action:'dispatch',id:attempt.id},signal,deadline);
    if(dispatched?.id!==attempt.id||dispatched.hash!==attempt.hash||dispatched.state!=='unknown')throw Error('Owner transaction outcome is unknown. Check its recorded transaction status; do not sign a replacement.');
    this.stage='Waiting for wallet transaction approval…';
    try {
      const hash=await requestMeteorOwnerTransaction(meteorExtension(),attempt.unsigned,Math.max(1,Math.min(120000,deadline-Date.now())),signal);
      if(hash&&hash!==attempt.hash){
        this.lastOwnerAttempt=await api<NonNullable<NearOwnerAdapter["lastOwnerAttempt"]>>('owner-attempt',{action:'reported',id:attempt.id,hash},signal,deadline);
        if(this.lastOwnerAttempt.manualReviewRequired)throw Error('Wallet returned a different transaction. Manual review required.');
        // Read-only reconciliation verifies the bounded reference change. Never sign again.
      }
    }catch(error){
      if(/different transaction/.test((error as Error).message))throw Error('Wallet returned a different transaction. Its outcome is unknown; manual review of both transaction IDs is required.');
      if(/cancelled, failed or disconnected/.test((error as Error).message))throw Error('Meteor rejected or closed the transaction request. Its submission outcome is unknown. Check the recorded transaction status before signing again.');
      if(/timed out/.test((error as Error).message))throw Error('Meteor transaction approval timed out. Its submission outcome is unknown. Check the recorded transaction status before signing again.');
      throw Error('Owner transaction outcome is unknown. Check its recorded transaction status; do not sign a replacement.');
    }
    this.stage='Checking transaction status…';
    const verified=await this.checkOwnerAttempt(undefined,deadline);
    if(verified?.state==='failed')throw Error('The contract rejected the recorded transaction.');
    this.emit();
  }
  async command(command: OwnerCommand) {
    // Register discovery hints before redirect; never treat them as authority.
    if (command.method === "register_vendor")
      await api("registry", { kind: "vendor", id: command.args.vendor_id });
    if (command.method === "approve_work_order")
      await api("registry", { kind: "order", id: command.args.order_id });
    await this.call(command.method, command.args);
  }
  async fund(method: "deposit" | "fund_storage", amount: string) {
    await this.call(method, {}, uint(amount));
  }
  async advanceRepairHead(update:object) { await this.call('advance_repair_head',{update},'0'); }
  async limits(method: "set_budget" | "set_payment_cap", value: string) {
    await this.call(
      method,
      method === "set_budget"
        ? { budget: uint(value) }
        : { payment_cap: uint(value) },
    );
  }
  async reconcile(attempt: string) {
    await this.call(
      "reconcile_payment",
      { attempt_id: uint(attempt, (1n << 64n) - 1n) },
      "0",
    );
  }
  async addInvoice(draft: Omit<Invoice, "reviewed">) {
    await api("invoices", draft);
    this.emit();
  }
  async markReviewed(id: string) {
    await api("review", { id });
    this.emit();
  }
  async enqueueInvoice(id: string) {
    await api("enqueue", { id });
    this.emit();
  }
  async simulatePayment(_id: string, _scenario: TransferScenario) {
    throw new Error(
      "Testnet transfers cannot be simulated. Queue a structured invoice instead.",
    );
  }
  reset() {
    throw new Error("Testnet state cannot be reset from the dashboard.");
  }
  failNextRequest() {
    throw new Error("Fault injection is available only in demo mode.");
  }
  async disconnect() {
    this.cancel();
    localStorage.setItem("nnetics-signout-required", "1");
    const channel = new BroadcastChannel("nnetics-identity");
    channel.postMessage("lock");channel.close();
    await api("logout", {});
    if (!this.messageOnlyMeteor) await (await this.wallet()).signOut();
    sessionStorage.removeItem("nnetics-wallet");
    localStorage.removeItem("nnetics-wallet");
    location.href = "/?mode=testnet";
  }
  workerIdentity() {
    return {
      account_id: account(this.config.worker),
      public_key: this.config.publicKey,
    };
  }
}
