# Wallet identity and session behavior

Current local policy, 3 November 2026. This describes the implementation, not an
independent security review. Deployment and payment execution remain disabled.

## Final limits

The user's later five-hour instruction supersedes the earlier 30-minute idle /
eight-hour absolute proposal and the previous fixed 15/60-minute implementations.

| Item | Limit / behavior |
| --- | --- |
| Identity session | Five hours from server-recorded sign-in |
| Idle expiry | No earlier inactivity logout; bounded by the same five-hour deadline |
| Active refresh | Rechecks the on-chain key; cannot move the original five-hour deadline |
| Optional selected-wallet proof | Same account keeps its deadline; a different account is signed out and needs separate login |
| Explicit logout / verified account change | Revokes the previous browser generation immediately |
| Login / optional wallet-check challenge | Five minutes, one use, browser/generation/origin/network/purpose bound |
| Meteor approval wait | Four minutes; timeout never establishes identity |
| Read-only verification RPC | 20-second per-request timeout; failures deny access without extending a session |
| Client API request | 90-second bound; cancellable when its context becomes obsolete |
| Identity heartbeat | Non-overlapping, every 30 seconds; does not renew lifetime |
| Foreground activity refresh | Trusted pointer/key activity, at most once per minute; no passive/background renewal |

The HttpOnly identity cookie is SameSite=Strict, scoped to `/api/live`, Secure for
HTTPS, and limited to the remaining absolute lifetime. Local HTTP development at
127.0.0.1 cannot use a Secure cookie. The longer-lived browser cookie is only a
browser identifier; it is not authentication. Server deadlines remain authoritative
even if a cookie lingers or the browser clock is incorrect. Client privacy expiry
uses the remaining lifetime reported by the server rather than assuming matching
wall clocks. Expired sessions cannot be revived by renewal or delayed responses.

Old sessions without an authenticated creation/absolute deadline require a fresh
proof. Existing earlier deadlines are never silently extended beyond five hours
from their recorded creation. No billing, invitation, queue or contract migration
is performed by the identity-table migration.

## Why Grandtheft was being logged out

The old authenticated-page effect called `logout` on every window blur and hidden
event. It cleared local records, broadcast a lock, and advanced the browser's
server-side session generation. The real Grandtheft screen previously displayed
“Wallet/page focus changed. Verify your current wallet again.” This was an
intentional client logout, not evidence of changed vault ownership or an early
five-hour cookie expiry. Earlier versions also deleted a valid session on any RPC
failure; transient failures are now distinguished from conclusive key invalidation.

The old identity refresh repeated several RPC reads and configured-vault discovery
every ten seconds. Refresh now uses the lighter session endpoint every thirty
seconds. Organization mutations and vault reads still independently verify current
authorization and on-chain ownership; a global identity never grants an owner role.

A regression test also reproduced reload-triggered visibility changes after
`pagehide`. Those are no longer treated as wallet switching for an already verified,
focused tab's reload. New navigation documents restore a valid saved session silently. BFCache restoration
first masks cached views and verifies the saved session silently, without a signature.

During the new real one-button test, the server accepted Grandtheft's proof and
created a five-hour session, but the user reported the button still said “Awaiting
Meteor approval.” That label formerly covered the entire post-signature load.
Focus/epoch changes could also leave an operation's busy state set. Progress now
separates wallet approval, signature checking and workspace loading; suspension
cancels obsolete requests and clears busy state. A known verified identity is
shown without granting a workspace, and a failed workspace load can be retried
using the saved session without requesting another signature. The final real-wallet
retest of this UI correction must be recorded separately from automated results.

## Persistent login and wallet selection

Focus loss, tab switching, browser return, ordinary navigation and refresh do not
request signatures, sign out, or discard an authenticated session. The persistent
HttpOnly cookie and server-side session restore the same signed-in account across
tabs and browser process restarts until the original five-hour deadline. Browser
privacy settings that delete cookies can prevent restoration. Silent session checks
run on return and every thirty seconds; active renewal cannot extend the deadline.
Transient verification/RPC failures retain the session while protected records and
actions are blocked until verification succeeds. No failed check is treated as a
wallet-account switch. Expiry, explicit sign-out/disconnect and conclusively invalid
keys revoke access. Logout broadcasts a lock so other tabs discard cached records.

Meteor's pinned injected transport has no reliable passive selected-account event.
Changing the account selected in the wallet, without a verifiable application event,
does not change the signed-in account or its permissions. The app clearly displays
its signed-in account and explains this limitation. The application cannot claim
immediate detection of every wallet-UI selection. It does not invent account-change
events or treat focus, transport responses or failures as identity.

Use **Switch wallet** to revoke the current session and authenticate another account.
An optional **Check selected Meteor account** action can request a NEP-413 proof;
it is never called by navigation or background handlers. Same-account proof retains
the existing deadline. A valid different-account proof atomically revokes the old
browser generation and sessions, broadcasts a lock, and clears protected views.
It deliberately creates **no session for the new account**: separate explicit login
is required. Cancelling or failing an optional check leaves the original session
bound to its original account. No permissions silently follow wallet selection.

Fresh session/key and organization membership/on-chain owner checks still guard
protected requests and sensitive financial actions. A connection, selected account
name or background response never creates an organization role. Financial execution
remains globally disabled; the existing paid job is unchanged and the vault remains
paused with worker authorization revoked.

## One-button sign-in

“Connect to Meteor” initializes the extension and requests one NEP-413 off-chain
message for the account chosen in Meteor. It does not request a transaction,
install an access key or transfer funds. No account-name input is required; a
collapsed named-account fallback remains available. Discovery nonces are distinct
from resume nonces. The server verifies the returned account's current testnet
key and signature before creating any session. Neither the wallet's connection
nor its reported identity alone can grant membership, approve work or authorize
payments. An unknown/replayed/expired/cross-browser/purpose-mismatched challenge
fails closed. A supplied public key must actually belong to the reported account.

Source inspected: official `@meteorwallet/sdk` 1.0.24 types retained under
`.tools/meteor-compatibility/sdk/package/src/ported_common/dapp/`, and the
[Meteor SDK repository](https://github.com/Meteor-Wallet/meteor_wallet_sdk).
The existing NEP-413 digest/signature implementation is preserved. No SDK upgrade
or wallet key-installing login action was introduced. A later attempt to refresh
the official NEP page was blocked by network timeouts; that did not justify a
change to the working cryptographic implementation.

## Refresh and local instance

Initial load shows a restoring-session screen until the saved cookie and authorized
workspace have been checked; a slow check must not look like disconnection. The
current separate instance is http://localhost:3101. Its runtime origin is configured
explicitly, and its host cookies are separate from 127.0.0.1. An initial login at a
new origin is required once; this does not reset an existing origin's session.

## Acceptance evidence

Executed: 92 Node tests and 55 browser cases passed, with one deliberately skipped
mobile duplicate of the desktop browser-restart test. Production build and final
TypeScript passed. See the latest `VALIDATION.md` entry for failures and limits. Mocked
wallet/RPC browser tests, including a real test-browser process restart with mocked
server responses, are not real Meteor acceptance. The user confirmed the final Grandtheft login/workspace/refresh sequence works on
localhost:3101. Earlier Paid contractor checks remain historical evidence. A final
real Meteor browser-process restart and actual two-account switch retest remain
unverified. No five-hour real-wallet wall-clock observation
is claimed. This implementation and its tests are not an independent security review.
