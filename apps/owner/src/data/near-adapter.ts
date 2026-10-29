import { Buffer } from "buffer";
import { account, uint } from "./owner-adapter";
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
  owner: string;
  worker: string;
  publicKey: string;
  configured: boolean;
  transactionsEnabled: boolean;
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch("/api/live/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
  });
  const result = await r.json();
  if (!r.ok) throw new Error(result.error || "Testnet service unavailable.");
  return result as T;
}
export class NearOwnerAdapter implements OwnerAdapter {
  readonly mode = "testnet" as const;
  readonly deploymentEnabled = false as const;
  private selector: WalletSelector | null = null;
  private listeners = new Set<() => void>();
  constructor(readonly config: PublicConfig) {}
  async wallet() {
    if (!this.selector) {
      const [{ setupWalletSelector }, { setupNightly }] = await Promise.all([
        import("@near-wallet-selector/core"),
        import("@near-wallet-selector/nightly"),
      ]);
      this.selector = await setupWalletSelector({
        network: "testnet",
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
    if (!accounts.some((a) => a.accountId === this.config.owner))
      throw new Error(
        `Select owner ${this.config.owner} in Nightly with testnet enabled.`,
      );
    const challenge = await api<{
      nonce: string;
      message: string;
      recipient: string;
    }>("challenge", {});
    const signature = await wallet.signMessage({
      ...challenge,
      nonce: Buffer.from(challenge.nonce, "base64"),
    });
    if (!signature)
      throw new Error("The wallet did not return a signed owner challenge.");
    await api("login", { ...signature, nonce: challenge.nonce });
  }
  snapshot() {
    return api<OwnerSnapshot>("snapshot");
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
    if (state.protocolVersion !== 86)
      throw new Error(
        `Protocol ${state.protocolVersion} requires compatibility review before signing.`,
      );
    const wallet = await this.wallet();
    if (
      !(await wallet.getAccounts()).some(
        (a) => a.accountId === this.config.owner,
      )
    )
      throw new Error("Connect the configured owner wallet.");
    const { actionCreators } = await import("@near-wallet-selector/core");
    await wallet.signAndSendTransaction({
      signerId: this.config.owner,
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
    await api("logout", {});
    await (await this.wallet()).signOut();
    location.href = "/?mode=testnet";
  }
  workerIdentity() {
    return {
      account_id: account(this.config.worker),
      public_key: this.config.publicKey,
    };
  }
}
