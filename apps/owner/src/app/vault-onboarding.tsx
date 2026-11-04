"use client";
import { useEffect, useState } from "react";
import { verifyVaultTransaction } from "../data/vault-transaction";
import { api } from "../data/near-adapter";
import {
  meteorExtension,
  requestMeteorVaultCreation,
} from "../data/meteor-message";

interface Progress {
  configured: boolean;
  enabled: boolean;
  network: string;
  requiredFunding: string;
  feeNotice: string;
  reviewNotice: string;
  owner?: string;
  vault?: string;
  factory?: string;
  state?: string;
  hash?: string;
  planDigest?: string;
  message?: string;
  finalizedBlock?: string;
  vaultCodeHash?: string;
  factoryCodeHash?: string;
  unsigned?: string;
  transaction?: {
    signer: string;
    receiver: string;
    method: string;
    args: { request_id: string };
    deposit: string;
    gas: string;
  };
}
export function VaultOnboarding({ organization }: { organization: string }) {
  const [progress, setProgress] = useState<Progress | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reviewed, setReviewed] = useState(false);
  const [walletHash,setWalletHash]=useState("");
  useEffect(() => {
    let current = true;
    void api<Progress>(
      "provisioning?organization=" + encodeURIComponent(organization),
    )
      .then((p) => {
        if (current) setProgress(p);
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [organization]);
  async function run(action: "prepare" | "reconcile" | "dispatch" | "retry") {
    setBusy(true);
    setError("");
    try {
      const p = await api<Progress>("provisioning/" + action, {
        organization,
        digest: progress?.planDigest,
        ...(action==="reconcile"&&walletHash.trim()?{transactionHash:walletHash.trim()}:{}),
      });
      setProgress(p);
      if (action === "retry") setReviewed(false);
      if (action === "dispatch") {
        const unsigned = await verifyVaultTransaction(p);
        // Losing focus clears authenticated records. The durable outbox survives
        // that logout/unmount and a browser restart; wallet return data cannot link it.
        await requestMeteorVaultCreation(meteorExtension(), unsigned);
        setProgress(
          await api<Progress>("provisioning/reconcile", { organization }),
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Create vault" className="vault-onboarding">
      <ol className="provisioning-steps" aria-label="Vault setup progress"><li aria-current={!progress?.state || progress.state === "prepared" ? "step" : undefined}>Review</li><li aria-current={progress?.state === "awaiting_chain" ? "step" : undefined}>Wallet approval</li><li aria-current={progress?.state === "verified" ? "step" : undefined}>Verify on chain</li></ol>
      <h2>
        {progress?.state === "verified" ? "Verified vault" : "Create vault"}
      </h2>
      <p>
        NEAR testnet only. The owner is your verified wallet. No organization or
        vault authority is inferred from connecting Meteor.
      </p>
      <p>
        {progress?.feeNotice ||
          "Vault storage/operating funding: 5 testnet NEAR, plus transaction fees. No payment ledger funding."}
      </p>
      <p>
        {progress?.reviewNotice ||
          "Independent contract review and historical-proof bootstrap remain unresolved. Payments stay disabled."}
      </p>
      {!progress?.configured && (
        <p role="status">
          Factory deployment and pinned artifact configuration require review
          and approval before wallet requests can be enabled.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {progress?.vault && (
        <>
          <dl>
            <dt>Network</dt>
            <dd>testnet</dd>
            <dt>Owner</dt>
            <dd>{progress.owner}</dd>
            <dt>Vault</dt>
            <dd>{progress.vault}</dd>
            <dt>Factory / transaction receiver</dt>
            <dd>{progress.factory}</dd>
            <dt>Method</dt>
            <dd>create_vault</dd>
            <dt>Request</dt>
            <dd>{progress.transaction?.args.request_id}</dd>
            <dt>Attached funding</dt>
            <dd>5 testnet NEAR</dd>
            <dt>Prepaid gas</dt>
            <dd>250 Tgas (fees additional)</dd>
            <dt>State</dt>
            <dd>{progress.state}</dd>
          </dl>
          <details className="verification-details"><summary>Artifact verification details</summary><dl>            <dt>Vault code hash</dt>
            <dd>{progress.vaultCodeHash}</dd>
            <dt>Factory code hash</dt>
            <dd>{progress.factoryCodeHash}</dd>
            <dt>Plan SHA-256</dt>
            <dd>{progress.planDigest}</dd>
</dl></details>
          <p>
            Creation installs no access keys. Initialization binds this owner
            and starts paused, without a worker or funded payment ledger. These
            locked contracts have no upgrade key.
          </p>
          {progress.hash && (
            <p>
              Recorded transaction:{" "}
              <a
                href={`https://testnet.nearblocks.io/txns/${progress.hash}`}
                target="_blank"
                rel="noreferrer"
              >
                {progress.hash}
              </a>
            </p>
          )}
          <p role="status">{progress.message}</p>
          {progress.finalizedBlock && (
            <p>Verified at finalized block {progress.finalizedBlock}</p>
          )}
        </>
      )}
      {!progress?.state && (
        <button
          className="button primary"
          disabled={busy}
          onClick={() => void run("prepare")}
        >
          Create vault
        </button>
      )}
      {progress?.state &&
        progress.state !== "verified" &&
        progress.state !== "failed" && (
          <>
            <label>
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              I reviewed the network, owner, funding, immutable code and
              transaction details.
            </label>
            <button
              className="button primary"
              disabled={busy || !reviewed || !progress.enabled}
              onClick={() => void run("dispatch")}
            >
              {progress.hash
                ? "Reconcile and retry identical transaction"
                : "Request Meteor approval"}
            </button>
            {!progress.enabled && (
              <p>
                Deployment signing is disabled pending review and specific
                testnet transaction authorization.
              </p>
            )}
          </>
        )}
      {progress?.hash && (
        <div>
        {progress.state==="awaiting_chain"&&<label>Wallet transaction hash (only if different)<input value={walletHash} onChange={e=>setWalletHash(e.target.value)} /><span>Read-only verification of the same approved signer, key, nonce and call. Does not send or retry a transaction.</span></label>}
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => void run("reconcile")}
        >
          Resume / reconcile provisioning
        </button>
        </div>
      )}
      {progress?.state === "failed" && (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => void run("retry")}
        >
          Review retry of same vault
        </button>
      )}
      <p>
        Payment controls remain unavailable. Wallet cancellation or interruption
        does not erase the recorded intent or create a second vault.
      </p>
    </section>
  );
}
