"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NearOwnerAdapter, api, type PublicConfig } from "../data/near-adapter";
import { MockOwnerAdapter } from "../data/mock-adapter";
import type { OwnerAdapter } from "../data/owner-adapter";
import {
  initializeMeteorExtension,
  testnetWalletAccount,
} from "../data/meteor-message";
import {PersistentContractorOwner} from "./contractor-owner";
import { VaultOnboarding } from "./vault-onboarding";

interface Workspace {
  id: string;
  name: string;
  status: "ready" | "unprovisioned" | "vault_verified";
  role: "owner" | "viewer" | "creator";
}
interface IdentityView {
  accountId: string;
  network: "testnet";
  organizations: Workspace[];
  notice: string;
}
function markUnverified(value: boolean) {
  try {
    if (value) localStorage.setItem("nnetics-unverified", "1");
    else localStorage.removeItem("nnetics-unverified");
  } catch {
    /* Storage availability must never prevent clearing private state. */
  }
}
function verificationRequired() {
  try {
    return localStorage.getItem("nnetics-unverified") === "1";
  } catch {
    return true;
  }
}
export function Onboarding({
  renderDashboard,
}: {
  renderDashboard: (adapter: OwnerAdapter) => ReactNode;
}) {
  const [config, setConfig] = useState<PublicConfig | null>(null),
    [who, setWho] = useState<IdentityView | null>(null);
  const [active, setActive] = useState<NearOwnerAdapter | null>(null),
    [demo, setDemo] = useState<MockOwnerAdapter | null>(null);
  const [account, setAccount] = useState(""),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [organizationName, setOrganizationName] = useState("");
  const [selectedDraft, setSelectedDraft] = useState<Workspace | null>(null);
  const epoch = useRef(0),
    pending = useRef<AbortController | null>(null),
    broadcast = useRef<BroadcastChannel | null>(null);
  const revocation = useRef<Promise<unknown>>(Promise.resolve());
  function clearLocal() {
    markUnverified(true);
    epoch.current++;
    pending.current?.abort();
    pending.current = null;
    setWho(null);
    setActive(null);
    setSelectedDraft(null);
    setOrganizationName("");
    setBusy(false);
    sessionStorage.removeItem("nnetics-wallet");
  }
  function lock(
    reason = "Wallet switched. Verify the selected account again.",
    notify = true,
  ) {
    clearLocal();
    setError(reason);
    if (notify) {
      broadcast.current?.postMessage("lock");
      revocation.current = api("logout", {});
      revocation.current.catch(() =>
        setError(
          "Could not revoke the previous session. Check the server connection and click Switch wallet / retry verification again.",
        ),
      );
    }
  }
  async function overview(expected?: string, autoOpen = false) {
    const mine = epoch.current;
    const identity = await api<IdentityView>("identity");
    if (mine !== epoch.current) return;
    if (expected && identity.accountId !== expected)
      throw new Error(
        "The wallet identity changed. Switch wallet and verify again.",
      );
    markUnverified(false);
    setWho(identity);
    if (
      autoOpen &&
      identity.organizations.length === 1 &&
      identity.organizations[0].status === "ready" &&
      config
    )
      setActive(
        new NearOwnerAdapter(
          { ...config, organization: identity.organizations[0].id },
          identity.accountId,
        ),
      );
  }
  useEffect(() => {
    if (new URLSearchParams(location.search).get("mode") === "demo") {
      setDemo(new MockOwnerAdapter());
      return;
    }
    broadcast.current = new BroadcastChannel("nnetics-identity");
    broadcast.current.onmessage = () =>
      lock("Wallet verification changed in another tab. Verify again.", false);
    void api<PublicConfig>("config")
      .then((c) => setConfig(c))
      .catch((e) =>
        setError(
          `Cannot load testnet login configuration: ${e.message}. Check the server and retry.`,
        ),
      );
    return () => {
      pending.current?.abort();
      broadcast.current?.close();
    };
  }, []);
  useEffect(() => {
    if (!config) return;
    if (verificationRequired()) {
      revocation.current = api("logout", {});
      revocation.current.catch(() =>
        setError(
          "Previous wallet verification could not be revoked. Check the server and retry verification.",
        ),
      );
      return;
    }
    void overview(undefined, true).catch(() => {
      /* A new/legacy browser must verify identity first. */
    });
  }, [config]);
  useEffect(() => {
    if (!who) return;
    // Meteor's published injected transport has no account-change subscription.
    // Conservatively lock on leaving the page, including opening wallet UI. Never
    // retain private records while the user switches the extension's account.
    const blur = () =>
      lock("Wallet/page focus changed. Verify your current wallet again.");
    const hidden = () => {
      if (document.hidden) blur();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const refreshIdentity = () => {
      const mine = epoch.current;
      void api<IdentityView>("identity")
        .then((next) => {
          if (mine !== epoch.current) return;
          if (next.accountId !== who.accountId)
            lock("Wallet identity changed. Verify again.", false);
          else setWho(next);
        })
        .catch((e) => {
          if (mine === epoch.current)
            lock(
              `Wallet verification could not be refreshed: ${e instanceof Error ? e.message : "Unknown verification error"}. Sign in again.`,
            );
        })
        .finally(() => {
          if (!stopped && mine === epoch.current)
            timer = setTimeout(refreshIdentity, 10000);
        });
    };
    timer = setTimeout(refreshIdentity, 10000);
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [who?.accountId]);
  async function signIn() {
    if (!config) return;
    const chosen = account.trim();
    try {
      testnetWalletAccount(chosen);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    clearLocal();
    broadcast.current?.postMessage("lock");
    const mine = epoch.current,
      controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    try {
      await revocation.current;
      await api("logout", {});
      if (mine !== epoch.current) return;
      await new NearOwnerAdapter(config).connectMeteor(
        chosen,
        controller.signal,
      );
      if (mine !== epoch.current) return;
      await overview(chosen, true);
    } catch (e) {
      if (mine === epoch.current)
        setError(
          e instanceof Error
            ? e.message
            : "Wallet login failed. Retry with a fresh message.",
        );
    } finally {
      if (mine === epoch.current) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  if (demo) return renderDashboard(demo);
  if (who)
    return (
      <>
        <header className="identity-bar" aria-label="Verified wallet">
          <span>NEAR testnet · Verified wallet: {who.accountId}</span>
          <button className="button secondary" onClick={() => lock()}>
            Switch wallet
          </button>
          {active && (
            <button
              className="button secondary"
              onClick={() => {
                setActive(null);
                setSelectedDraft(null);
              }}
            >
              My organizations
            </button>
          )}
        </header>
        {active ? (
          renderDashboard(active)
        ) : (
          <main className="loading-screen" aria-label="Wallet onboarding">
            <h1>{selectedDraft ? selectedDraft.name : "Your workspace"}</h1>
            <p>Live testnet identity. No simulated records or balances.</p>
            <p>{who.notice}</p>
            {selectedDraft ? <p>Your organization’s saved billing records appear below. Payment controls remain gated.</p> : who.organizations.length === 0 ? (
              <section aria-label="Account record counts">
                <p>Invoices: 0</p>
                <p>Contractors: 0</p>
                <p>Payment history: 0</p>
              </section>
            ) : (
              <p>
                Choose an authorized organization to load its records. Records
                are not combined across organizations.
              </p>
            )}
            <p>
              No vault balance is shown until a vault is linked and verified
              on-chain.
            </p>
            {error && <p role="alert">{error}</p>}
            <h2>Your organizations</h2>
            {who.organizations.length === 0 ? (
              <p>No organizations yet.</p>
            ) : (
              who.organizations.map((org) => (
                <button
                  key={org.id}
                  className="button secondary"
                  onClick={async () => {
                    const mine = epoch.current;
                    setError("");
                    try {
                      if (org.status === "ready" && config) {
                        const adapter = new NearOwnerAdapter(
                          { ...config, organization: org.id },
                          who.accountId,
                        );
                        await adapter.snapshot();
                        if (mine === epoch.current) setActive(adapter);
                      } else {
                        await api(
                          "organization?organization=" +
                            encodeURIComponent(org.id),
                        );
                        if (mine === epoch.current) setSelectedDraft(org);
                      }
                    } catch (e) {
                      if (mine === epoch.current)
                        setError((e as Error).message);
                    }
                  }}
                >
                  {org.name} ·{" "}
                  {org.status === "ready"
                    ? org.role
                    : org.status === "vault_verified"
                      ? "Vault linked; verify current state"
                      : "Vault not provisioned"}
                </button>
              ))
            )}
            {selectedDraft && (
              <><VaultOnboarding key={selectedDraft.id} organization={selectedDraft.id}/><PersistentContractorOwner key={`billing-${selectedDraft.id}`} organization={selectedDraft.id}/></>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const mine = epoch.current;
                setBusy(true);
                setError("");
                try {
                  const created = await api<Workspace>("organizations", {
                    name: organizationName,
                  });
                  if (mine !== epoch.current) return;
                  setSelectedDraft(created);
                  setOrganizationName("");
                  await overview(who.accountId);
                } catch (e) {
                  if (mine === epoch.current) setError((e as Error).message);
                } finally {
                  if (mine === epoch.current) setBusy(false);
                }
              }}
            >
              <label>
                Organization name
                <input
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  maxLength={80}
                  required
                />
              </label>
              <button className="button primary" disabled={busy}>
                Create organization
              </button>
            </form>
          </main>
        )}
      </>
    );
  let accountValid = false;
  try {
    testnetWalletAccount(account.trim());
    accountValid = true;
  } catch {}
  return (
    <main className="loading-screen">
      <h1>Nnetics · NEAR testnet</h1>
      <p>
        Verify any supported, activated testnet wallet. You do not need an
        organization or vault to sign in. Wallet verification grants no
        organization membership or vault ownership.
      </p>
      <p>
        Meteor extension only. Select NEAR testnet and the activated named
        .testnet account or 64-character implicit account shown in your wallet.
        Other wallet connectors are not supported by this onboarding flow.
      </p>
      {error && <p role="alert">{error}</p>}
      <section aria-label="Meteor connection">
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => {
            try {
              initializeMeteorExtension();
              setReady(true);
              setError("");
            } catch (e) {
              setReady(false);
              setError(
                (e as Error).message +
                  " Open this site in the browser profile containing Meteor, enable its site access, unlock it and reconnect.",
              );
            }
          }}
        >
          {ready ? "Recheck Meteor connection" : "Connect to Meteor"}
        </button>
        <p role="status">
          {ready
            ? "Meteor extension initialized. Sign a fresh message to verify the selected account."
            : "Connecting does not sign a message or grant access."}
        </p>
        <label>
          Testnet wallet account ID
          <input
            value={account}
            maxLength={64}
            autoCapitalize="none"
            spellCheck={false}
            onChange={(e) => {
              const next = e.target.value;
              if (who || busy) lock();
              setAccount(next);
            }}
          />
        </label>
        {!accountValid && (
          <p>Enter the activated testnet account ID shown in Meteor.</p>
        )}
        <button
          className="button primary"
          disabled={!config || !ready || !accountValid || busy}
          onClick={() => void signIn()}
        >
          {busy
            ? "Awaiting wallet approval / verifying…"
            : "Sign message to sign in"}
        </button>
        <button
          className="button secondary"
          onClick={() =>
            lock(
              "Previous verification cleared. Select your wallet and verify again.",
            )
          }
        >
          Switch wallet / retry verification
        </button>
        {!config && (
          <button
            className="button secondary"
            onClick={() => location.reload()}
          >
            Reload login configuration
          </button>
        )}
      </section>
      <a className="button secondary" href="/?mode=demo">
        Open explicitly simulated demo
      </a>
    </main>
  );
}
