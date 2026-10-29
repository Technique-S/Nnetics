"use client";
import { useState } from "react";
import { NearOwnerAdapter, api } from "../data/near-adapter";
import { amountFromNear } from "../data/owner-adapter";
import type { OwnerSnapshot } from "../data/owner-adapter";
export function TestnetControls({
  adapter,
  snapshot,
  run,
}: {
  adapter: NearOwnerAdapter;
  snapshot: OwnerSnapshot;
  run: (
    key: string,
    action: () => Promise<void>,
    message?: string,
  ) => Promise<void>;
}) {
  const [amount, setAmount] = useState("0.1"),
    [target, setTarget] = useState<
      "deposit" | "fund_storage" | "set_budget" | "set_payment_cap"
    >("deposit");
  const [attempt, setAttempt] = useState("");
  const [importId, setImportId] = useState(""),
    [kind, setKind] = useState<"vendor" | "order">("order");
  return (
    <section
      className="panel testnet-controls"
      aria-label="Testnet owner controls"
    >
      <h3>Testnet wallet & funding</h3>
      <p>
        Owner {snapshot.vault.owner} · vault {adapter.config.contract}. Each
        action opens your wallet. Funds for storage and payments have separate
        ledgers.
      </p>
      <p className="mono">Finalized block: {snapshot.blockHash}</p>
      <p>
        Deployment requires separate authorization. Historical verifier
        independent review, bootstrap trust, weak subjectivity and upgrade-key
        custody remain unresolved. Unknown outcomes stay reserved.
      </p>
      <label>
        Action{" "}
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value as typeof target)}
        >
          <option value="deposit">Fund payment ledger</option>
          <option value="fund_storage">Fund storage/operating reserve</option>
          <option value="set_budget">Set total budget</option>
          <option value="set_payment_cap">Set payment cap</option>
        </select>
      </label>
      <label>
        Amount (NEAR){" "}
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
        />
      </label>
      <button
        className="button secondary"
        onClick={() =>
          void run(
            "fund",
            () =>
              target === "deposit" || target === "fund_storage"
                ? adapter.fund(target, amountFromNear(amount))
                : adapter.limits(target, amountFromNear(amount)),
            "Wallet request submitted; refresh finalized state to confirm.",
          )
        }
      >
        Review owner transaction in wallet
      </button>
      <label>
        Recorded attempt ID{" "}
        <input
          value={attempt}
          onChange={(e) => setAttempt(e.target.value)}
          inputMode="numeric"
        />
      </label>
      <button
        className="button secondary"
        onClick={() => void run("reconcile", () => adapter.reconcile(attempt))}
      >
        Reconcile recorded outcome
      </button>
      <button
        className="text-button"
        onClick={() => void run("disconnect", () => adapter.disconnect())}
      >
        Disconnect owner wallet
      </button>
      <p>
        The frozen contract has no vendor/order enumeration. Import existing
        references to discover them; all displayed authority is re-read from the
        contract.
      </p>
      <label>
        Reference type{" "}
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
        >
          <option value="order">Work order</option>
          <option value="vendor">Vendor</option>
        </select>
      </label>
      <label>
        Existing reference{" "}
        <input
          value={importId}
          onChange={(e) => setImportId(e.target.value)}
          maxLength={64}
        />
      </label>
      <button
        className="button secondary"
        onClick={() =>
          void run("import", async () => {
            await api("registry", { kind, id: importId });
          })
        }
      >
        Import existing reference
      </button>
      {snapshot.queue?.length ? (
        <ul>
          {snapshot.queue.map((j) => (
            <li key={j.id}>
              <strong>{j.id}</strong> — {j.state}: {j.reason}
              {j.hash && (
                <>
                  {" "}
                  ·{" "}
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://testnet.nearblocks.io/txns/${encodeURIComponent(j.hash)}`}
                  >
                    Transaction
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No durable invoices yet.</p>
      )}
    </section>
  );
}
