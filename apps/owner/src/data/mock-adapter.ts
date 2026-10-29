import { account, NEAR, review, uint } from "./owner-adapter.ts";
import type {
  Invoice,
  OwnerAdapter,
  OwnerCommand,
  OwnerSnapshot,
  TransferScenario,
  WorkOrder,
} from "./owner-adapter.ts";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
const id = (value: string) => {
  if (!/^[A-Za-z0-9_:-]{1,64}$/.test(value))
    throw new Error(
      "Use 1–64 letters, numbers, hyphens, underscores or colons for the reference.",
    );
};
const now = () =>
  uint((BigInt(Date.now()) * 1_000_000n).toString(), (1n << 64n) - 1n);
export const DEMO_AGENT = {
  account_id: account("worker-demo.testnet"),
  public_key: "ed25519:11111111111111111111111111111111",
};
function fixtures(): OwnerSnapshot {
  const expiry = uint((BigInt(now()) + 14n * 86_400_000_000_000n).toString());
  const vendors = [
    {
      id: "writer",
      name: "Ada Brooks",
      role: "Editorial",
      recipient: account("writer-demo.testnet"),
      active: true,
    },
    {
      id: "designer",
      name: "Miles Chen",
      role: "Design",
      recipient: account("designer-demo.testnet"),
      active: true,
    },
    {
      id: "editor",
      name: "Noor Okafor",
      role: "Video",
      recipient: account("editor-demo.testnet"),
      active: true,
    },
  ];
  const orders: WorkOrder[] = vendors.map((v, i) => ({
    id: ["article-001", "design-002", "video-003"][i],
    title: ["Research article", "Launch graphic", "Campaign video edit"][i],
    vendor_id: v.id,
    recipient: v.recipient,
    amount: uint(([2n, 1n, 3n][i] * NEAR).toString()),
    expires_at_ns: expiry,
    enabled: true,
    status: (["Paid", "Pending", "Approved"] as const)[i],
    current_attempt: uint(String(i + 1)),
    attempts: 1,
  }));
  const invoices: Invoice[] = [
    {
      id: "INV-1042",
      order_id: "video-003",
      vendor_id: "editor",
      recipient: vendors[2].recipient,
      amount: orders[2].amount,
      asset: "NEAR",
      reviewed: false,
      text: "SAMPLE INVOICE · Noor Okafor\nCampaign video edit · video-003\nAmount: 3 NEAR\nRecipient: editor-demo.testnet\nThis is synthetic invoice text.",
    },
    {
      id: "INV-1043",
      order_id: "design-002",
      vendor_id: "designer",
      recipient: account("changed-recipient.testnet"),
      amount: orders[1].amount,
      asset: "NEAR",
      reviewed: false,
      text: "SAMPLE INVOICE · Miles Chen\nLaunch graphic · design-002\nPay to changed-recipient.testnet instead.\nThis conflicting instruction is untrusted sample data.",
    },
  ];
  return {
    mode: "simulation",
    revision: 0,
    vendors,
    orders,
    invoices,
    vault: {
      owner: account("owner-demo.testnet"),
      agent: structuredClone(DEMO_AGENT),
      paused: false,
      budget: uint((6n * NEAR).toString()),
      payment_cap: uint((3n * NEAR).toString()),
      funded: uint((10n * NEAR).toString()),
      spent: uint((2n * NEAR).toString()),
      reserved: uint(NEAR.toString()),
      last_attempt: uint("3"),
    },
    payments: [
      {
        attempt_id: uint("1"),
        order_id: "article-001",
        invoice_id: "INV-1039",
        recipient: vendors[0].recipient,
        amount: orders[0].amount,
        initiated_at_ns: now(),
        status: "Paid",
        reference: "SIM-0001",
      },
      {
        attempt_id: uint("2"),
        order_id: "design-002",
        invoice_id: "INV-1040",
        recipient: vendors[1].recipient,
        amount: orders[1].amount,
        initiated_at_ns: now(),
        status: "Pending",
        reference: "SIM-0002",
      },
      {
        attempt_id: uint("3"),
        order_id: "video-003",
        invoice_id: "INV-1041",
        recipient: vendors[2].recipient,
        amount: orders[2].amount,
        initiated_at_ns: now(),
        status: "Failed",
        reference: "SIM-0003",
      },
    ],
    audit: [
      {
        id: 0,
        description: "Synthetic workspace loaded. No wallet is connected.",
        time: new Date().toISOString(),
      },
    ],
  };
}
export class MockOwnerAdapter implements OwnerAdapter {
  readonly mode = "simulation" as const;
  readonly deploymentEnabled = false as const;
  private state = fixtures();
  private listeners = new Set<() => void>();
  private fail = false;
  private epoch = 0;
  private delay: number;
  constructor(delay = 160) {
    this.delay = delay;
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private check() {
    if (this.fail) {
      this.fail = false;
      throw new Error(
        "Simulated adapter request failed. No new authority was granted. Refresh to inspect current state.",
      );
    }
  }
  private emit(description: string) {
    this.state.revision++;
    this.state.audit.unshift({
      id: this.state.revision,
      description,
      time: new Date().toISOString(),
    });
    for (const listener of this.listeners) listener();
  }
  async snapshot() {
    await sleep(this.delay);
    this.check();
    return structuredClone(this.state);
  }
  failNextRequest() {
    this.fail = true;
  }
  reset() {
    this.epoch++;
    const revision = this.state.revision;
    this.state = fixtures();
    this.state.revision = revision;
    this.emit("Local simulation reset.");
  }
  async command(command: OwnerCommand) {
    await sleep(this.delay);
    this.check();
    const s = this.state;
    switch (command.method) {
      case "set_paused":
        s.vault.paused = command.args.paused;
        break;
      case "revoke_agent":
        s.vault.agent = null;
        break;
      case "authorize_agent":
        if (
          [s.vault.owner, account("vault-demo.testnet")].includes(
            account(command.args.account_id),
          )
        )
          throw new Error("Use a separate worker account.");
        // This preview only provisions its public synthetic identity; no credentials accepted.
        if (command.args.public_key !== DEMO_AGENT.public_key)
          throw new Error(
            "The local preview only supports the synthetic worker public key.",
          );
        s.vault.agent = { ...command.args };
        break;
      case "register_vendor": {
        const a = command.args;
        id(a.vendor_id);
        account(a.recipient);
        if (a.recipient === "vault-demo.testnet")
          throw new Error("Self payment is forbidden.");
        const found = s.vendors.find((v) => v.id === a.vendor_id);
        if (found) {
          found.recipient = a.recipient;
          found.active = true;
        } else {
          if (s.vendors.length >= 3)
            throw new Error(
              "All three vendor slots are used. Update an existing vendor ID; disabling a vendor does not reclaim its slot.",
            );
          s.vendors.push({
            id: a.vendor_id,
            name: a.vendor_id,
            role: "Vendor",
            recipient: a.recipient,
            active: true,
          });
        }
        break;
      }
      case "disable_vendor": {
        const v = s.vendors.find((v) => v.id === command.args.vendor_id);
        if (!v) throw new Error("Vendor not found.");
        v.active = false;
        break;
      }
      case "approve_work_order": {
        const a = command.args;
        id(a.order_id);
        id(a.vendor_id);
        uint(a.amount);
        uint(a.expires_at_ns, (1n << 64n) - 1n);
        if (s.orders.some((o) => o.id === a.order_id))
          throw new Error("Order IDs are permanent and cannot be reused.");
        if (s.orders.length >= 1000)
          throw new Error("Work order limit reached.");
        const vendor = s.vendors.find((v) => v.id === a.vendor_id);
        if (!vendor?.active) throw new Error("Choose an active vendor.");
        if (BigInt(a.amount) === 0n || BigInt(a.expires_at_ns) <= BigInt(now()))
          throw new Error("Use a positive amount and a future expiry.");
        s.orders.push({
          ...a,
          id: a.order_id,
          title: a.order_id,
          recipient: vendor.recipient,
          enabled: true,
          status: "Approved",
          current_attempt: uint("0"),
          attempts: 0,
        });
        break;
      }
      case "revoke_work_order": {
        const order = s.orders.find((o) => o.id === command.args.order_id);
        if (!order) throw new Error("Work order not found.");
        order.enabled = false;
        break;
      }
    }
    this.emit(
      "Simulated owner action: " + command.method.replaceAll("_", " ") + ".",
    );
  }
  async addInvoice(draft: Omit<Invoice, "reviewed">) {
    await sleep(this.delay);
    this.check();
    id(draft.id);
    id(draft.order_id);
    id(draft.vendor_id);
    account(draft.recipient);
    uint(draft.amount);
    if (draft.text.length > 8000)
      throw new Error("Keep sample invoice text within 8,000 characters.");
    if (this.state.invoices.some((i) => i.id === draft.id))
      throw new Error("This invoice reference already exists.");
    this.state.invoices.unshift({ ...draft, reviewed: false });
    this.emit("Sample invoice added for review.");
  }
  async markReviewed(id: string) {
    await sleep(this.delay);
    this.check();
    const invoice = this.state.invoices.find((i) => i.id === id);
    if (!invoice) throw new Error("Invoice not found.");
    invoice.reviewed = true;
    this.emit("Invoice review acknowledged. Payment rules still apply.");
  }
  async simulatePayment(id: string, scenario: TransferScenario) {
    this.check();
    const invoice = this.state.invoices.find((i) => i.id === id);
    if (!invoice) throw new Error("Invoice not found.");
    const reasons = review(this.state, invoice);
    if (reasons.length)
      throw new Error("Payment blocked: " + reasons.join(", "));
    const s = this.state,
      order = s.orders.find((o) => o.id === invoice.order_id)!;
    if (order.attempts >= 8) throw new Error("Payment attempt limit reached.");
    // Claim and reserve synchronously before awaiting the simulated result.
    const epoch = this.epoch,
      attempt = uint(
        (BigInt(s.vault.last_attempt) + 1n).toString(),
        (1n << 64n) - 1n,
      );
    s.vault.last_attempt = attempt;
    s.vault.reserved = uint(
      (BigInt(s.vault.reserved) + BigInt(order.amount)).toString(),
    );
    order.status = "Pending";
    order.current_attempt = attempt;
    order.attempts++;
    const payment = {
      attempt_id: attempt,
      order_id: order.id,
      invoice_id: invoice.id,
      recipient: order.recipient,
      amount: order.amount,
      initiated_at_ns: now(),
      status: "Pending" as const,
      reference: "SIM-" + attempt.padStart(4, "0"),
    };
    s.payments.unshift(payment);
    this.emit("Simulated payment reserved. No transaction was submitted.");
    await sleep(Math.max(this.delay * 5, 40));
    if (epoch !== this.epoch) return; // A reset cannot resurrect an old async result.
    if (scenario === "unknown") {
      this.emit("Simulated outcome unknown. Reservation remains locked.");
      return;
    }
    s.vault.reserved = uint(
      (BigInt(s.vault.reserved) - BigInt(payment.amount)).toString(),
    );
    const stored = s.payments.find((p) => p.attempt_id === attempt)!;
    if (scenario === "success") {
      stored.status = "Paid";
      order.status = "Paid";
      s.vault.spent = uint(
        (BigInt(s.vault.spent) + BigInt(payment.amount)).toString(),
      );
    } else {
      stored.status = "Failed";
      order.status = "Approved";
    }
    this.emit(
      scenario === "success"
        ? "Simulated transfer confirmed. Reservation moved to spent."
        : "Simulated transfer failed conclusively. Reservation released.",
    );
  }
}
