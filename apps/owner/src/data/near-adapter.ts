import { Buffer } from "buffer";
import { account, uint } from "./owner-adapter";
import { assertTestedProtocol } from "./protocol";
import {assertSameLiveContext} from "./config-context";
import {
  meteorExtension,
  signMeteorMessage,
  testnetWalletAccount,
} from "./meteor-message";
import type {
  Invoice,
  OwnerAdapter,
  OwnerCommand,
  OwnerSnapshot,
  TransferScenario,
} from "./owner-adapter";
import type {
  WalletSelector,
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
}
export class LiveApiError extends Error {
  constructor(message: string, readonly retryable = false, readonly status = 0) { super(message); }
}
export async function api<T>(path: string, body?: unknown, signal?:AbortSignal): Promise<T> {
  const r = await fetch("/api/live/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
    keepalive: path === "logout",
    // A verified snapshot performs several finalized RPC reads. Give the server
    // time to finish its bounded reads rather than timing out after one RPC.
    signal: signal?AbortSignal.any([signal,AbortSignal.timeout(90000)]):AbortSignal.timeout(90000),
  }).catch(() => { throw new LiveApiError("Testnet verification connection timed out or is unavailable. Retry verification.", true); });
  const result = await r.json().catch(() => {
    // A proxy/restart can return HTML instead of JSON. This is not evidence that
    // a signing key/session was revoked. Status 0 also prevents replaying a login
    // whose upstream outcome could already have committed.
    throw new LiveApiError("The testnet service returned an unreadable response. Retry verification; private actions remain blocked.",true);
  });
  if (!r.ok) throw new LiveApiError(result.error || "Testnet service unavailable.", result.retryable === true, r.status);
  return result as T;
}
// Explicit, optional action only. No automatic focus/navigation caller.
export async function checkMeteorIdentity(signal?: AbortSignal) {
  const challenge=await api<{nonce:string;message:string;recipient:string}>("session/challenge",{});
  // The pinned official SignMessage input makes accountId optional. Omitting it
  // lets Meteor select the current identity instead of forcing the old account.
  const signature=await signMeteorMessage(meteorExtension(),{
    message:challenge.message,recipient:challenge.recipient,nonce:Buffer.from(challenge.nonce,"base64"),
  },240_000,signal);
  if(signal?.aborted)throw Error("Wallet verification cancelled. Verify again.");
  return api<{accountId:string;accountChanged:boolean;authenticationRequired?:boolean}>("session/resume",{...signature,nonce:challenge.nonce});
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
      this.selector = await setupWalletSelector({
        network: this.config.network,
        modules: [setupNightly()],
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
    try {
      await api("login", proof,signal);
    } catch (e) {
      // Only an explicit pre-session verification failure may reuse this proof.
      // A lost/ambiguous HTTP response is not permission to replay a login.
      if (!(e instanceof LiveApiError) || !e.retryable || e.status !== 503) throw e;
      await new Promise(resolve => setTimeout(resolve, 750));
      if (signal?.aborted) throw new Error("Wallet account changed. Verify again.");
      await api("login", proof,signal);
    }
    this.messageOnlyMeteor = true;
    sessionStorage.setItem("nnetics-wallet", "meteor");
    localStorage.setItem("nnetics-wallet", "meteor"); // connector hint only; never authority
    stage?.(`Signed in as ${signature.accountId}. Loading your workspace…`);
    return signature.accountId;
  }
  async snapshot() {
    assertSameLiveContext(this.config,await api<PublicConfig>("config"));
    const state = await api<OwnerSnapshot>(
      "snapshot?organization=" + encodeURIComponent(this.config.organization),
    );
    assertSameLiveContext(this.config,await api<PublicConfig>("config"));
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
  async call(method: string, args: object, deposit = "1") {
    if (!this.config.transactionsEnabled)
      throw new Error(
        "Signing is disabled pending specific testnet authorization and review.",
      );
    const state = await this.snapshot(); // Verify chain, deployment code and owner before wallet opens.
    if (
      state.access?.role !== "owner" ||
      state.access.organization !== this.config.organization ||
      state.access.accountId !== state.vault.owner
    )
      throw new Error(
        "Current on-chain vault ownership is required for owner actions.",
      );
    assertTestedProtocol(state.protocolVersion);
    if (this.messageOnlyMeteor)
      throw new Error(
        "Meteor supports message login only in this build. Its transaction connector still requires implementation and review; no transaction was requested.",
      );
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
    await wallet.signAndSendTransaction({
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
    });
    // Wallet return status is not authoritative confirmation. Refresh finalized reads.
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
