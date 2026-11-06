"use client";
import {getUserMessage} from "../data/user-message";
import {AppearanceControl} from "./appearance-control";
import {ActionButton} from "./action-button";
import {OperationFeedback} from "./operation-feedback";
import {LoadingSkeleton} from "./loading-skeleton";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NearOwnerAdapter, LiveApiError, checkMeteorIdentity, api, type PublicConfig } from "../data/near-adapter";
import { MockOwnerAdapter } from "../data/mock-adapter";
import type { OwnerAdapter } from "../data/owner-adapter";
import {
  initializeMeteorExtension,
  testnetWalletAccount,
} from "../data/meteor-message";
import { VaultOnboarding } from "./vault-onboarding";
import { SignInScreen } from "./sign-in-screen";

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
  renderDashboard: (adapter: OwnerAdapter, name?: string, accountActions?: ReactNode) => ReactNode;
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
  const [loginAttempted,setLoginAttempted]=useState(false);
  const [checkingSaved,setCheckingSaved]=useState(false);
  const [sessionChecking,setSessionChecking]=useState(false);
  const workspaceReady=useRef(false);
  const selection=useRef(0),selectionAbort=useRef<AbortController|null>(null);
  const activeRef=useRef(active);activeRef.current=active;
  const draftRef=useRef(selectedDraft);draftRef.current=selectedDraft;
  const lastRenewal=useRef(0),renewing=useRef(false);
  const identityRef=useRef<IdentityView|null>(null);identityRef.current=who;
  const epoch = useRef(0),
    overviewAbort=useRef<AbortController|null>(null),
    pending = useRef<AbortController | null>(null),
    broadcast = useRef<BroadcastChannel | null>(null);
  const revocation = useRef<Promise<unknown>>(Promise.resolve());
  function clearLocal(revokeBrowser=true) {
    if(revokeBrowser)markUnverified(true);
    setWalletNotice("");
    epoch.current++;
    overviewAbort.current?.abort();
    pending.current?.abort();
    pending.current = null;
    selection.current++;selectionAbort.current?.abort();activeRef.current?.cancel();
    workspaceReady.current=false;
    setWho(null);
    setVerificationIssue("");
    setRestoreAvailable(false);
    setActive(null);
    setSelectedDraft(null);
    setOrganizationName("");
    setBusy(false);setCheckingSaved(false);setSessionChecking(false);renewing.current=false;
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
    overviewAbort.current?.abort();
    const controller=new AbortController();overviewAbort.current=controller;
    signal=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
    try {
    const mine = epoch.current, deadline=Date.now()+180000;
    const fresh=await api<PublicConfig>("config",undefined,signal,deadline);
    const identity = await api<IdentityView>("identity",undefined,signal,deadline);
    if (mine !== epoch.current) return;
    if (expected && identity.accountId !== expected)
      throw new Error(
        "The wallet identity changed. Switch wallet and verify again.",
      );
    const previous=activeRef.current;
    if(previous&&(!fresh.configured||previous.config.contract!==fresh.contract||previous.config.organization!==fresh.organization||!identity.organizations.some(o=>o.id===previous.config.organization&&o.status==='ready'))){previous.cancel();setActive(null);setSelectedDraft(null);}
    if(draftRef.current&&!identity.organizations.some(o=>o.id===draftRef.current!.id))setSelectedDraft(null);
    markUnverified(false);lastRenewal.current=Date.now();
    setVerificationIssue("");
    setRestoreAvailable(false);
    workspaceReady.current=true;
    setWho(identity);
    if(autoOpen && fresh.configured && identity.organizations.some(o=>o.id===fresh.organization && o.status==='ready'))
      setActive(new NearOwnerAdapter(fresh,identity.accountId));
    } catch(error) {if(signal.aborted)return;throw error;}
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
    const mismatchedWallet=()=>{markUnverified(true);broadcast.current?.postMessage('lock');lock('The selected signing account changed. Authenticate that wallet separately; no permissions were transferred.',false);};
    window.addEventListener('nnetics-wallet-mismatch',mismatchedWallet);
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
      selectionAbort.current?.abort();
      overviewAbort.current?.abort();
      pending.current?.abort();
      broadcast.current?.close();
      window.removeEventListener('pagehide',pagehide);window.removeEventListener('pageshow',pageshow);
      window.removeEventListener('nnetics-wallet-mismatch',mismatchedWallet);
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
    const controller=new AbortController();
    let stopped=false,running=false,lastCheck=0,timer:ReturnType<typeof setTimeout>;
    const failure=(e:unknown)=>{
      if(e instanceof LiveApiError && e.retryable)setVerificationIssue(e.message+' Private records and actions are blocked until silent verification succeeds; your session is retained.');
      else lock(e instanceof Error?e.message:'Session verification failed. Sign in again.');
    };
    const refresh=async()=>{
      if(stopped||running)return;if(renewing.current){timer=setTimeout(refresh,30000);return;}running=true;setSessionChecking(true);clearTimeout(timer);const mine=epoch.current;
      try{const next=await api<{accountId:string;idleExpires:number;absoluteExpires:number;serverTime?:number}>('session',undefined,controller.signal,undefined,()=>{if(!stopped&&mine===epoch.current)setVerificationIssue('Temporary network problem. Checking your saved session; existing records are retained.');});if(mine!==epoch.current)return;
        if(next.accountId!==who.accountId)lock('The authenticated account changed in another tab. Sign in to continue.',false);
        else {setVerificationIssue('');setWho(previous=>previous?{...previous,session:next}:previous);}
      }catch(e){if(!stopped&&mine===epoch.current)failure(e);}
      finally{running=false;if(!stopped&&mine===epoch.current)setSessionChecking(false);lastCheck=Date.now();if(!stopped&&mine===epoch.current)timer=setTimeout(refresh,30000);}
    };
    const returned=()=>{if(!document.hidden&&Date.now()-lastCheck>3000)void refresh();};
    timer=setTimeout(refresh,30000);
    window.addEventListener('focus',returned);document.addEventListener('visibilitychange',returned);
    const activity=(e:Event)=>{
      if(!e.isTrusted||document.hidden||!document.hasFocus()||renewing.current||running||Date.now()-lastRenewal.current<60000)return;
      renewing.current=true;lastRenewal.current=Date.now();const mine=epoch.current;
      void api<{accountId:string;idleExpires:number;absoluteExpires:number;serverTime?:number}>('session/renew',{active:true},controller.signal).then(next=>{
        if(mine!==epoch.current)return;
        if(next.accountId!==who.accountId)lock('The authenticated account changed. Sign in again.',false);
        else {lastRenewal.current=Date.now();setVerificationIssue('');setWho(previous=>previous?{...previous,session:next}:previous);}
      }).catch(e=>{if(!stopped&&mine===epoch.current)failure(e);}).finally(()=>{if(mine===epoch.current)renewing.current=false;});
    };
    window.addEventListener('pointerdown',activity);window.addEventListener('keydown',activity);
    return()=>{stopped=true;controller.abort();clearTimeout(timer);window.removeEventListener('focus',returned);document.removeEventListener('visibilitychange',returned);window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);};
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
  const accountActions = who && <>
    <ActionButton className="button secondary" onClick={() => lock()}>Switch wallet</ActionButton>
    <ActionButton className="button secondary" onClick={()=>lock("You signed out. Verify a wallet to sign in again.")}>Sign out</ActionButton>
    <ActionButton className="button secondary" disabled={busy} onClick={()=>void checkSelectedWallet()}>Check selected Meteor account (optional)</ActionButton>
    {active && <ActionButton className="button secondary" onClick={()=>{setActive(null);setSelectedDraft(null);}}>My organizations</ActionButton>}
  </>;
  if (demo) return renderDashboard(demo);
  if (who)
    return (
      <>
        <header className="identity-bar" aria-label="Verified wallet">
          <span>Signed in as {who.accountId} · NEAR testnet</span>
          <details className="account-menu"><summary>Account & organizations</summary><div className="account-menu-actions"><AppearanceControl inline/>
          {accountActions}
          <details className="wallet-session-notice"><summary>About this wallet session</summary><p>This session belongs to {who.accountId}. Meteor does not reliably report selection changes. Use Switch wallet to sign in as another account.</p></details></div></details>
        </header>

        <OperationFeedback active={busy||checkingSaved||(sessionChecking&&!!verificationIssue)} message={busy?loginStage:"Checking your saved session…"} />
        {walletNotice && <p role="status">{walletNotice}</p>}
        {verificationIssue && (
            <section className="loading-screen" aria-label="Session verification">
              <h2>{busy||checkingSaved||sessionChecking?'Loading your workspace':'Verification temporarily unavailable'}</h2>
              <p role="alert">{busy?"Your wallet was verified. Loading your authorized workspace…":sessionChecking||checkingSaved?"Checking your saved session. Existing records are retained; changes are temporarily unavailable.":getUserMessage(verificationIssue)}</p>
              <ActionButton className="button" disabled={busy||sessionChecking||checkingSaved} onClick={() => {
                const mine=epoch.current;setCheckingSaved(true);
                void overview(who.accountId).catch(e => {
                  if(mine!==epoch.current)return;
                  if(e instanceof LiveApiError && e.retryable) setVerificationIssue(e.message);
                  else lock((e as Error).message);
                }).finally(()=>{if(mine===epoch.current)setCheckingSaved(false);});
              }}>Retry verification</ActionButton>
            </section>
          )}
        {active ? <div hidden={!!verificationIssue&&!workspaceReady.current} inert={!!verificationIssue}>{renderDashboard(active, who.organizations.find(o=>o.id===active.config.organization)?.name,accountActions)}</div> : (
          <main hidden={!!verificationIssue&&!workspaceReady.current} inert={!!verificationIssue} className="loading-screen onboarding-surface" aria-label="Wallet onboarding">
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
            {error && <p role="alert">{getUserMessage(error)}</p>}
            <h2>Your organizations</h2>
            {who.organizations.length === 0 ? (
              <p>No organizations yet.</p>
            ) : (
              who.organizations.map((org) => (
                <ActionButton
                  key={org.id}
                  className="button secondary"
                  onClick={async () => {
                    const mine = epoch.current, chosen=++selection.current;
                    selectionAbort.current?.abort();activeRef.current?.cancel();
                    const controller=new AbortController();selectionAbort.current=controller;
                    setActive(null);setSelectedDraft(null);
                    setError("");
                    try {
                      if (org.status === "ready" && config) {
                        const fresh=await api<PublicConfig>("config",undefined,controller.signal);
                        if(!fresh.configured||fresh.organization!==org.id)throw Error("Workspace configuration changed. Reload login configuration before opening this vault.");
                        const adapter = new NearOwnerAdapter(
                          fresh,
                          who.accountId,
                        );
                        await adapter.snapshot(controller.signal);
                        if (mine === epoch.current && chosen===selection.current && !controller.signal.aborted) setActive(adapter);
                      } else {
                        await api(
                          "organization?organization=" +
                            encodeURIComponent(org.id), undefined, controller.signal,
                        );
                        if (mine === epoch.current && chosen===selection.current && !controller.signal.aborted) setSelectedDraft(org);
                      }
                    } catch (e) {
                      if (mine === epoch.current && chosen===selection.current && !controller.signal.aborted)
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
                </ActionButton>
              ))
            )}
            {selectedDraft && (
              <VaultOnboarding key={selectedDraft.id} organization={selectedDraft.id}/>
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
              <ActionButton className="button primary" disabled={busy}>
                Create organization
              </ActionButton>
            </form>
          </main>
        )}
      </>
    );
  if(restoring)return <main className="loading-screen" aria-busy="true"><h1>Restoring your saved session</h1><p>Checking the saved session and authorized workspace. No wallet signature is needed for a valid session.</p><OperationFeedback active message="Checking your saved session…"/><LoadingSkeleton/></main>;
  let accountValid = false;
  try {testnetWalletAccount(account.trim());accountValid=true;}catch{}
  return <SignInScreen
    configReady={!!config}
    restoreAvailable={restoreAvailable}
    busy={busy}
    checkingSaved={checkingSaved}
    loginStage={loginStage}
    loginAttempted={loginAttempted}
    error={error}
    account={account}
    accountValid={accountValid}
    onReloadConfiguration={() => location.reload()}
    onRestore={() => {
      setError("");setCheckingSaved(true);
      void restoreSession().catch(e => {
        setError((e as Error).message);
        if(!(e instanceof LiveApiError && e.retryable)) setRestoreAvailable(false);
      }).finally(() => setCheckingSaved(false));
    }}
    onConnect={() => { setLoginAttempted(true); void signIn(!account.trim()); }}
    onCancel={() => lock("Sign-in cancelled. You can connect again when ready.")}
    onAccountChange={(value) => { if(who||busy)lock(); setAccount(value); }}
    onUseDifferentWallet={() => { setAccount(""); lock("Choose a different wallet in Meteor, then connect again."); }}
  />;
}
