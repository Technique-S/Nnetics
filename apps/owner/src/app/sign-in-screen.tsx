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
  account: string;
  accountValid: boolean;
  onReloadConfiguration: () => void;
  onRestore: () => void;
  onConnect: () => void;
  onCancel: () => void;
  onAccountChange: (value: string) => void;
  onUseDifferentWallet: () => void;
}

export function SignInScreen({
  configReady,
  restoreAvailable,
  busy,
  checkingSaved,
  loginStage,
  loginAttempted,
  error,
  account,
  accountValid,
  onReloadConfiguration,
  onRestore,
  onConnect,
  onCancel,
  onAccountChange,
  onUseDifferentWallet,
}: SignInScreenProps) {
  return (
    <main className="signin-screen">
      <div className="signin-art" aria-hidden="true">
        <svg className="signin-art-item signin-art-tl" viewBox="0 0 200 200" fill="none">
          <path d="M100 0L115 65L171 29L143 88L200 100L143 112L171 171L115 135L100 200L85 135L29 171L57 112L0 100L57 88L29 29L85 65Z" />
        </svg>

        <svg className="signin-art-item signin-art-planet" viewBox="0 0 160 120" fill="none">
          <circle cx="80" cy="60" r="32" />
          <path d="M52 50C56 36 68 28 82 28C96 28 108 38 112 50C100 48 70 46 52 50Z" />
          <ellipse cx="80" cy="60" rx="66" ry="18" strokeWidth="3" strokeLinecap="round" strokeDasharray="160 20" transform="rotate(-22 80 60)" />
        </svg>

        <svg className="signin-art-item signin-art-bl" viewBox="0 0 200 200" fill="none">
          <path d="M100 0L118 70L185 45L145 100L185 155L118 130L100 200L82 130L15 155L55 100L15 45L82 70Z" />
        </svg>

        <svg className="signin-art-item signin-art-tr" viewBox="0 0 200 200" fill="none">
          <circle cx="150" cy="50" r="15" />
          <g strokeWidth="4" strokeLinecap="round">
            <line x1="150" y1="10" x2="150" y2="25" />
            <line x1="150" y1="75" x2="150" y2="90" />
            <line x1="110" y1="50" x2="125" y2="50" />
            <line x1="175" y1="50" x2="190" y2="50" />
            <line x1="122" y1="22" x2="133" y2="33" />
            <line x1="167" y1="67" x2="178" y2="78" />
            <line x1="122" y1="78" x2="133" y2="67" />
            <line x1="167" y1="33" x2="178" y2="22" />
          </g>
        </svg>

        <svg className="signin-art-item signin-art-lime-star" viewBox="0 0 50 50" fill="none">
          <path d="M25 0C25 13.8 13.8 25 0 25C13.8 25 25 36.2 25 50C25 36.2 36.2 25 50 25C36.2 25 25 13.8 25 0Z" />
        </svg>

        <svg className="signin-art-item signin-art-pencil" viewBox="0 0 220 180" fill="none">
          <path d="M210 110C210 145 170 160 145 130C125 105 135 60 170 55C195 50 210 75 210 110Z" />
          <circle cx="165" cy="100" r="14" />
          <path d="M40 95C70 100 110 120 145 130L165 145L150 160C120 145 80 120 40 95Z" opacity="0.6" />
          <polygon points="35,92 20,86 42,80" />
          <polygon points="42,80 20,86 46,98 56,92" />
          <path d="M175 140L190 152C195 156 193 164 186 167C180 170 174 167 170 162L158 152Z" />
        </svg>

        <svg className="signin-art-item signin-art-br" viewBox="0 0 200 200" fill="none">
          <path d="M100 0L125 60L190 40L155 98L200 140L135 145L120 200L85 150L20 175L50 115L0 80L65 65Z" />
        </svg>
      </div>

      <div className="signin-appearance">
        <AppearanceControl inline />
      </div>

      <div className="signin-content">
        <a className="signin-logo" href="/" aria-label="Nnetics home">
          <svg className="signin-logo-badge" viewBox="0 0 64 64" aria-hidden="true">
            <rect className="signin-logo-tile" width="64" height="64" rx="14" />
            <path className="signin-logo-letter" d="M16 46V18h6l17 21V18h6v28h-6L22 25v21Z" />
            <circle className="signin-logo-dot" cx="50" cy="49" r="4" />
          </svg>
          <span className="signin-wordmark">Nnetics</span>
          <span className="signin-pill">NEAR testnet</span>
        </a>

        <section className="signin-card">
          <h1 className="signin-title">Sign in</h1>
          <p className="signin-subtitle">Connect your wallet</p>
          <p>Verify any supported, activated testnet wallet. You do not need an organization or vault to sign in. Wallet verification grants no organization membership or vault ownership.</p>
          <details className="signin-disclosure"><summary>Supported wallets and networks</summary><p>Meteor extension only. Select NEAR testnet and an activated account. Other connectors are not supported by this sign-in flow.</p></details>
          {error && <p role="alert">{getUserMessage(error)}</p>}

          <section className="signin-connection" aria-label="Meteor connection">
            {!configReady ? (
              <ActionButton className="button primary" onClick={onReloadConfiguration}>Reload connection</ActionButton>
            ) : restoreAvailable ? (
              <ActionButton className="button primary" pending={busy || checkingSaved} pendingLabel="Checking your saved session…" state={error ? "error" : "idle"} retryLabel="Continue to workspace" onClick={onRestore}>Continue to workspace</ActionButton>
            ) : (
              <ActionButton className="button primary" pending={busy} pendingLabel={getProgressMessage(loginStage)} disabled={!!account.trim() && !accountValid} state={error && loginAttempted ? "error" : "idle"} retryLabel="Try again" onClick={onConnect}>
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
            {!busy && <p>Connect opens an off-chain sign-in message in Meteor. No transaction, funds or access keys are requested.</p>}

            <details className="signin-disclosure"><summary>Use a specific testnet account (optional)</summary>
              <label>Testnet wallet account ID
                <input value={account} maxLength={64} autoCapitalize="none" spellCheck={false} onChange={e => onAccountChange(e.target.value)} />
              </label>
              {!accountValid && <p>Enter the activated account ID shown in Meteor.</p>}
              <ActionButton className="button secondary" onClick={onUseDifferentWallet}>Use a different wallet</ActionButton>
            </details>
          </section>
        </section>

        <a className="button secondary signin-demo" href="/?mode=demo">Open explicitly simulated demo</a>
      </div>

      <footer className="signin-footer">
        <span>@MDBcertified</span>
        <span aria-hidden="true"> · </span>
        <a href="#" className="signin-footer-link" aria-disabled="true" onClick={e => e.preventDefault()}>Privacy Policy</a>
        <span aria-hidden="true"> · </span>
        <a href="#" className="signin-footer-link" aria-disabled="true" onClick={e => e.preventDefault()}>Terms of Service</a>
      </footer>
    </main>
  );
}
