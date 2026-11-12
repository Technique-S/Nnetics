import {SignInRays} from "../components/sign-in-rays";
import {BrandMark, WorkspacePreview} from "./brand-mark";
import {ActionButton} from "./action-button";
import {AppearanceControl} from "./appearance-control";
import {OperationFeedback} from "./operation-feedback";
import {getProgressMessage,getUserMessage} from "../data/user-message";

export interface SignInScreenProps {
  configReady: boolean;
  restoreAvailable: boolean;
  busy: boolean;
  checkingSaved: boolean;
  loginStage: string;
  loginAttempted: boolean;
  error: string;
  onReloadConfiguration: () => void;
  onRestore: () => void;
  onConnect: () => void;
  onCancel: () => void;
}

export function SignInScreen({
  configReady,
  restoreAvailable,
  busy,
  checkingSaved,
  loginStage,
  loginAttempted,
  error,
  onReloadConfiguration,
  onRestore,
  onConnect,
  onCancel,
}: SignInScreenProps) {
  return (
    <main className="signin-screen">
      <SignInRays/>
      <header className="entry-header">
        <a className="entry-brand-link" href="/" aria-label="Nnetics home"><BrandMark/>Nnetics</a>
        <AppearanceControl inline />
      </header>
      <div className="signin-content">
        <div className="signin-intro">
          <p className="signin-display">Your work agreements deserve more than a DM.</p>
          <p className="signin-lede">Manage contractors, document agreements, and make payments with verifiable onchain records. Hire with confidence. Pay with proof.</p>
          <a className="button primary signin-demo" href="/?mode=demo">Try demo <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></a>
          <p className="signin-demo-note">Simulated funds only. No account or wallet needed.</p>
        </div>
        <WorkspacePreview/>
        <section className="signin-card">
          <div><h1>Sign in</h1>
          <p>Connect your Meteor wallet to open a NEAR testnet workspace.</p>
          {error && <p role="alert">{getUserMessage(error)}</p>}</div>

          <section className="signin-connection" aria-label="Meteor connection">
            {!configReady ? (
              <ActionButton className="button primary" onClick={onReloadConfiguration}>Reload connection</ActionButton>
            ) : restoreAvailable ? (
              <ActionButton className="button primary" pending={busy || checkingSaved} pendingLabel="Checking your saved session…" state={error ? "error" : "idle"} retryLabel="Continue to workspace" onClick={onRestore}>Continue to workspace</ActionButton>
            ) : (
              <ActionButton className="button primary" pending={busy} pendingLabel={getProgressMessage(loginStage)} state={error && loginAttempted ? "error" : "idle"} retryLabel="Try again" onClick={onConnect}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path>
                  <path d="M16 3H4a2 2 0 0 0-2 2v2"></path>
                  <circle cx="16" cy="14" r="1"></circle>
                </svg>
                <span>Connect to Meteor</span>
              </ActionButton>
            )}
            {busy && <ActionButton className="button secondary" onClick={onCancel}>Cancel sign-in</ActionButton>}
            <OperationFeedback active={busy} message={loginStage} />
          </section>
        </section>
      </div>

      <footer className="signin-footer"><span>@MDBcertified</span><span>NEAR testnet</span></footer>
    </main>
  );
}
