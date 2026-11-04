"use client";
import {LoadingSkeleton} from "./loading-skeleton";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NearOwnerAdapter, LiveApiError, checkMeteorIdentity, api, type PublicConfig } from "../data/near-adapter";
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
  session?: {idleExpires:number;absoluteExpires:number;serverTime?:number};
}
function markUnverified(value: boolean) {
  try {
    if (value) localStorage.setItem("nnetics-signout-required", "1");
    else localStorage.removeItem("nnetics-signout-required");
  } catch {
    /* Storage availability must never prevent clearing private state. */
  }
}
function verificationRequired() {
  try {
    return localStorage.getItem("nnetics-signout-required") === "1";
  } catch {
    return true;
  }
}
export function Onboarding({
  renderDashboard,
}: {
  renderDashboard: (adapter: OwnerAdapter, name?: string) => ReactNode;
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
  const [verificationIssue, setVerificationIssue] = useState("");
  const [restoreAvailable, setRestoreAvailable] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [walletNotice,setWalletNotice]=useState("");
  const [loginStage,setLoginStage]=useState("");
  const lastRenewal=useRef(0),renewing=useRef(false);
  const identityRef=useRef<IdentityView|null>(null);identityRef.current=who;
  const epoch = useRef(0),
    pending = useRef<AbortController | null>(null),
    broadcast = useRef<BroadcastChannel | null>(null);
  const revocation = useRef<Promise<unknown>>(Promise.resolve());
  function clearLocal(revokeBrowser=true) {
    if(revokeBrowser)markUnverified(true);
    setWalletNotice("");
    epoch.current++;
    pending.current?.abort();
    pending.current = null;
    setWho(null);
    setVerificationIssue("");
    setRestoreAvailable(false);
    setActive(null);
    setSelectedDraft(null);
    setOrganizationName("");
    setBusy(false);
    setLoginStage("");
    sessionStorage.removeItem("nnetics-wallet");
    localStorage.removeItem("nnetics-wallet");
  }
  function lock(
    reason = "Wallet switched. Verify the selected account again.",
    notify = true,
  ) {
    clearLocal(notify);
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
  async function overview(expected?: string, autoOpen = false, signal?:AbortSignal) {
    const mine = epoch.current;
    const fresh=await api<PublicConfig>("config",undefined,signal);
    const identity = await api<IdentityView>("identity",undefined,signal);
    if (mine !== epoch.current) return;
    if (expected && identity.accountId !== expected)
      throw new Error(
        "The wallet identity changed. Switch wallet and verify again.",
      );
    markUnverified(false);lastRenewal.current=Date.now();
    setVerificationIssue("");
    setRestoreAvailable(false);
    setWho(identity);
    if(autoOpen && fresh.configured && identity.organizations.some(o=>o.id===fresh.organization && o.status==='ready'))
      setActive(new NearOwnerAdapter(fresh,identity.accountId));
  }
  useEffect(() => {
    if (new URLSearchParams(location.search).get("mode") === "demo") {
      setRestoring(false);
      setDemo(new MockOwnerAdapter());
      return;
    }
    broadcast.current = new BroadcastChannel("nnetics-identity");
    broadcast.current.onmessage = event=>{
      if(event.data==='lock')lock('The authenticated session was signed out or changed in another tab. Sign in to continue.',false);
    };
    let cachedAccount:string|undefined;
    const pagehide=(event:PageTransitionEvent)=>{
      if(!event.persisted || !identityRef.current)return;
      cachedAccount=identityRef.current.accountId;
      epoch.current++;pending.current?.abort();pending.current=null;setBusy(false);
      setActive(null);setSelectedDraft(null);setWho({accountId:cachedAccount,network:'testnet',organizations:[],notice:''});
      setVerificationIssue('Refreshing the saved session…');
    };
    const pageshow=(event:PageTransitionEvent)=>{
      if(!event.persisted||!cachedAccount)return;
      void overview(cachedAccount,true).catch(e=>{
        if(e instanceof LiveApiError&&e.retryable)setVerificationIssue(e.message);
        else lock((e as Error).message,false);
      });
    };
    window.addEventListener('pagehide',pagehide);window.addEventListener('pageshow',pageshow);
    // Obsolete per-tab proof markers are not credentials or logout requests.
    sessionStorage.removeItem('nnetics-foreground-required');sessionStorage.removeItem('nnetics-verified-document');
    void api<PublicConfig>("config")
      .then((c) => setConfig(c))
      .catch((e) => {
        setRestoring(false);setError(
          `Cannot load testnet login configuration: ${e.message}. Check the server and retry.`,
        );
      });
    return () => {
      pending.current?.abort();
      broadcast.current?.close();
      window.removeEventListener('pagehide',pagehide);window.removeEventListener('pageshow',pageshow);
    };
  }, []);
  useEffect(() => {
    if (!config) return;
    if (verificationRequired()) {
      setRestoring(false);
      revocation.current = api("logout", {});
      revocation.current.catch(() =>
        setError(
          "Previous wallet verification could not be revoked. Check the server and retry verification.",
        ),
      );
      return;
    }
    void restoreSession().catch((e) => {
      if (e instanceof LiveApiError && e.retryable) {
        setRestoreAvailable(true);
        setError("Saved-session verification is temporarily unavailable. Retry it before signing another message.");
      }
      else setError(e instanceof Error ? e.message : "Your session could not be restored. Sign in again.");
    }).finally(()=>setRestoring(false));
  }, [config]);
  async function restoreSession() { await overview(undefined,true); }
  useEffect(() => {
    if(!who)return;
    let stopped=false,running=false,lastCheck=0,timer:ReturnType<typeof setTimeout>;
    const failure=(e:unknown)=>{
      if(e instanceof LiveApiError && e.retryable)setVerificationIssue(e.message+' Private records and actions are blocked until silent verification succeeds; your session is retained.');
      else lock(e instanceof Error?e.message:'Session verification failed. Sign in again.');
    };
    const refresh=async()=>{
      if(stopped||running)return;running=true;clearTimeout(timer);const mine=epoch.current;
      try{const next=await api<{accountId:string;idleExpires:number;absoluteExpires:number;serverTime?:number}>('session');if(mine!==epoch.current)return;
        if(next.accountId!==who.accountId)lock('The authenticated account changed in another tab. Sign in to continue.',false);
        else {setVerificationIssue('');setWho(previous=>previous?{...previous,session:next}:previous);}
      }catch(e){if(mine===epoch.current)failure(e);}
      finally{running=false;lastCheck=Date.now();if(!stopped&&mine===epoch.current)timer=setTimeout(refresh,30000);}
    };
    const returned=()=>{if(!document.hidden&&Date.now()-lastCheck>3000)void refresh();};
    timer=setTimeout(refresh,30000);
    window.addEventListener('focus',returned);document.addEventListener('visibilitychange',returned);
    const activity=(e:Event)=>{
      if(!e.isTrusted||document.hidden||!document.hasFocus()||renewing.current||Date.now()-lastRenewal.current<60000)return;
      renewing.current=true;const mine=epoch.current;
      void api<{accountId:string;idleExpires:number;absoluteExpires:number;serverTime?:number}>('session/renew',{active:true}).then(next=>{
        if(mine!==epoch.current)return;
        if(next.accountId!==who.accountId)lock('The authenticated account changed. Sign in again.',false);
        else {lastRenewal.current=Date.now();setVerificationIssue('');setWho(previous=>previous?{...previous,session:next}:previous);}
      }).catch(e=>{if(mine===epoch.current)failure(e);}).finally(()=>{renewing.current=false;});
    };
    window.addEventListener('pointerdown',activity);window.addEventListener('keydown',activity);
    return()=>{stopped=true;clearTimeout(timer);window.removeEventListener('focus',returned);document.removeEventListener('visibilitychange',returned);window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);};
  },[who?.accountId]);
  useEffect(()=>{
    const limits=who?.session;if(!limits)return;
    const duration=Math.min(limits.idleExpires,limits.absoluteExpires)-(limits.serverTime??Date.now());
    if(!Number.isFinite(duration))return;
    const mine=epoch.current,timer=setTimeout(()=>{if(mine===epoch.current)lock('Your five-hour session has expired. Verify your wallet again; no payment is requested.');},Math.max(0,duration));
    return()=>clearTimeout(timer);
  },[who?.accountId,who?.session]);
  async function checkSelectedWallet() {
    if(busy)return;const mine=epoch.current,controller=new AbortController();pending.current=controller;setBusy(true);setWalletNotice('');
    try {
      initializeMeteorExtension();const next=await checkMeteorIdentity(controller.signal);
      if(mine!==epoch.current)return;
      if(next.accountChanged){
        markUnverified(true);broadcast.current?.postMessage('lock');clearLocal(false);
        setError('Meteor verified a different account ('+next.accountId+'). The previous session was signed out. Connect to Meteor to authenticate the new account; no permissions were transferred.');
      }else setWalletNotice('Meteor confirmed '+next.accountId+'. Your existing session and five-hour deadline are unchanged.');
    }catch(e){if(mine===epoch.current)setWalletNotice('The wallet check was inconclusive. Your session remains tied to '+who?.accountId+'. '+(e as Error).message);}
    finally{if(mine===epoch.current){pending.current=null;setBusy(false);}}
  }
  function showVerifiedLoading(accountId:string) {
    markUnverified(false);
    // A known verified identity can be shown immediately; no organization,
    // records, owner role or payment controls are inferred from it.
    setWho({accountId,network:'testnet',organizations:[],notice:''});
    setVerificationIssue('Wallet verified. Loading your authorized workspace…');
  }
  async function signIn(discover=false) {
    if (!config) return;
    const chosen = discover ? undefined : account.trim();
    try {
      if(chosen!==undefined)testnetWalletAccount(chosen);
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
    setLoginStage("Connecting to Meteor…");
    setError("");
    let signedIn=false;
    try {
      initializeMeteorExtension();setReady(true);
      await revocation.current;
      await api("logout", {});
      if (mine !== epoch.current) return;
      markUnverified(false);
      const verifiedAccount=await new NearOwnerAdapter(config).connectMeteor(
        chosen,
        controller.signal,
        message=>{if(mine===epoch.current)setLoginStage(message);},
      );
      if (mine !== epoch.current) return;
      signedIn=true;markUnverified(false);
      if(mine!==epoch.current)return;
      showVerifiedLoading(verifiedAccount);
      await overview(verifiedAccount, true,controller.signal);
    } catch (e) {
      if (mine === epoch.current) {
        if(signedIn)setRestoreAvailable(true);
        if(signedIn)setVerificationIssue(`Your message was accepted. Workspace loading could not finish: ${(e as Error).message}. Retry verification without another wallet signature.`);
        setError(
          e instanceof Error
            ? (signedIn?"Your message was accepted. Workspace loading could not finish; retry the saved session. ":"")+e.message + (e.message.includes("Meteor extension")?" Open this site in the browser profile containing Meteor, enable its site access, unlock it and retry.":"")
            : "Wallet login failed. Retry with a fresh message.",
        );
      }
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
          <span>Signed in as {who.accountId} · NEAR testnet</span>
          <details className="account-menu"><summary>Account & organizations</summary><div className="account-menu-actions">
          <button className="button secondary" onClick={() => lock()}>
            Switch wallet
          </button>
          <button className="button secondary" onClick={()=>lock("You signed out. Verify a wallet to sign in again.")}>Sign out</button>
          <button className="button secondary" disabled={busy} onClick={()=>void checkSelectedWallet()}>Check selected Meteor account (optional)</button>
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
          <details className="wallet-session-notice"><summary>About this wallet session</summary><p>This session belongs to {who.accountId}. Meteor does not reliably report selection changes. Use Switch wallet to sign in as another account.</p></details></div></details>
        </header>

        {walletNotice && <p role="status">{walletNotice}</p>}
        {verificationIssue ? (
            <main className="loading-screen">
              <h1>{busy?'Loading your workspace':'Verification temporarily unavailable'}</h1>
              <p role="alert">{verificationIssue}</p>
              <button className="button" disabled={busy} onClick={() => void overview(who.accountId).catch(e => {
                if(e instanceof LiveApiError && e.retryable) setVerificationIssue(e.message);
                else lock((e as Error).message);
              })}>Retry verification</button>
            </main>
          ) : active ? renderDashboard(active, who.organizations.find(o=>o.id===active.config.organization)?.name) : (
          <main className="loading-screen onboarding-surface" aria-label="Wallet onboarding">
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
                        const fresh=await api<PublicConfig>("config");
                        if(!fresh.configured||fresh.organization!==org.id)throw Error("Workspace configuration changed. Reload login configuration before opening this vault.");
                        const adapter = new NearOwnerAdapter(
                          fresh,
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
              <><VaultOnboarding key={selectedDraft.id} organization={selectedDraft.id}/><PersistentContractorOwner key={`billing-${selectedDraft.id}`} organization={selectedDraft.id} embedded/></>
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
  if(restoring)return <main className="loading-screen" aria-busy="true"><h1>Restoring your saved session</h1><p>Checking the saved session and authorized workspace. No wallet signature is needed for a valid session.</p><LoadingSkeleton/></main>;
  let accountValid = false;
  try {
    testnetWalletAccount(account.trim());
    accountValid = true;
  } catch {}
  return (
    <main className="loading-screen signin-surface">
      <a className="entry-brand" href="/">Nnetics<span>.</span></a><span className="entry-network">NEAR testnet</span>
      <h1>Nnetics · NEAR testnet</h1>
      <p>
        Verify any supported, activated testnet wallet. You do not need an
        organization or vault to sign in. Wallet verification grants no
        organization membership or vault ownership.
      </p>
      <details><summary>Supported wallets and networks</summary>      <p>
        Meteor extension only. Select NEAR testnet and the activated named
        .testnet account or 64-character implicit account shown in your wallet.
        Other wallet connectors are not supported by this onboarding flow.
      </p></details>
      {error && <p role="alert">{error}</p>}
      {restoreAvailable && <button className="button secondary" onClick={() => {
        setError("");
        void restoreSession().catch(e => {
          setError((e as Error).message);
          if (!(e instanceof LiveApiError && e.retryable)) setRestoreAvailable(false);
        });
      }}>Retry saved session</button>}
      <section aria-label="Meteor connection">
        <button
          className="button primary"
          disabled={!config || busy}
          onClick={() => void signIn(true)}
        >
          {busy ? loginStage||"Connecting…" : "Connect to Meteor"}
        </button>
        <p role="status">
          {busy ? loginStage : ready
            ? "Meteor is available. Connect opens an off-chain identity message for the account selected in your wallet. No transaction, funds or keys."
            : "Connect opens an off-chain sign-in message in Meteor. No transaction, funds or access keys are requested."}
        </p>
        <details>
          <summary>Use a specific testnet account (optional)</summary>
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
          disabled={!config || !accountValid || busy}
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
        </details>
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
