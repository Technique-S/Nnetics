# Meteor extension compatibility — 30 October 2026

**2 November real result:** fresh Grandtheft NEP-413 login passed again.
A separate exact-plan local infrastructure review requested CreateAccount,
6.3324 NEAR Transfer and pinned DeployContract to `v.grandtheft.testnet`.
Meteor blocked it with **Contract deployment blocked** (apps cannot deploy code).
The app transport request timed out; RPC subsequently reported the recorded hash
as unknown, with unchanged balance/nonce and absent target at finalized height
275875473. Do not disable this wallet protection or treat SDK documentation as
proof that this wallet version permits DeployContract. The review server is
stopped, outbox preserved, no fresh retry. Factory setup needs an owner-run
supported deployment path; the customer's later `create_vault` is a FunctionCall,
but its live wallet support remains unverified. See [VALIDATION.md](VALIDATION.md).

**31 October update:** real NEP-413 login passed for `babygoat.testnet` and
`grandtheft.testnet`, including returning organization discovery and private API
denial in both directions. Slow RPC exposed a short aggregate timeout and
overlapping heartbeats; those were fixed. The local preview uses IPv4-first DNS,
but unavailable verification still denies access.

A separate local provisioning bridge now uses SDK 1.0.24's published `sign`
transport for one server-prepared, browser-validated factory transaction. It
installs no keys and treats wallet outcomes as untrusted hints. This bridge has
controlled tests only; no real deployment was requested. Generic Meteor payment
signing stays blocked. See [VAULT_PROVISIONING.md](VAULT_PROVISIONING.md).
Earlier compatibility statements below are historical.

**Paused setup subsequently completed:** the user authorized the four planned
testnet setup transactions; all are FINAL. Verified vault/worker/code configuration
is now active and Brave's message-login button is enabled for the entered
`babygoat.testnet` account. The configuration blocker described below is historical.
CLI signing proves setup key control; no Meteor message was signed or application
session established during setup. The next real-wallet step needs the user's
message approval. Transaction signing through Meteor remains unimplemented/blocked.
See [BABYGOAT_TESTNET_PLAN.md](BABYGOAT_TESTNET_PLAN.md) for execution evidence.

The user confirms Meteor's **browser extension** displays `babygoat.testnet`
with **10 testnet NEAR**. This resolves the reported balance/network-display
problem in that wallet. It is user-reported UI evidence, not a Nnetics login,
cryptographic proof of wallet control or owner acceptance result.

## Local implementation

### Connection button repair

The running dev app was reproduced in the browser on 30 October. The former
single button had native `disabled=true`, `pointer-events:auto` and no covering
element at its center. There were no captured console warnings/errors. Its click
handler existed in source, but could not run while disabled: both missing vault
configuration and an empty account field disabled it before extension detection.

The gateway now separates **Connect to Meteor** (local injected-transport
initialization) from **Sign message to sign in** (wallet approval and server
verification). Connection initialization is clickable without vault configuration
or an account ID. Missing-extension errors give profile/site-access/unlock/retry
instructions. The public config response reports only the names of missing required
settings; the page lists them with an edit/restart/retry recovery action. Invalid
configuration and failed config requests also expose their error and retry action.
These diagnostics do not weaken login or vault ownership checks.
The previously borderless account input is also explicitly outlined and laid out
below its label so an empty required field is visible.

**Real browser result:** in the user's existing Brave app tab, clicking Connect
initialized the actual Meteor extension dispatcher and changed the UI to
“Meteor extension initialized.” No console warnings/errors were captured. In the
in-app browser, where Meteor was absent, the same click reached the explicit
extension recovery error. No signing or transaction action was sent by either
initialization check. Initialization does not prove account control, wallet
approval, a NEP-413 signature, an application session or organization access.

The actual running configuration still lacks `NNETICS_ORGANIZATION_ID`,
`NNETICS_VAULT_ID`, `NNETICS_WORKER_ID` and `NNETICS_WORKER_PUBLIC_KEY`. Message
login remains blocked until reviewed provisioning/configuration is available;
configuration retry cannot deploy or fund a vault. No environment values were
filled merely to enable the button. The actual wallet approval prompt remains
untested. A controlled browser test separately exercises a testnet `sign_message`
request, verifies no login occurs while approval is pending and verifies decline
returns to a retryable state.

This repair executed 35 application Node tests, strict TypeScript and 18 Edge
desktop/mobile browser cases successfully. The first browser run exposed two
dev-mode test assumptions on each viewport; those assertions were corrected and
the full suite passed on rerun. See [VALIDATION.md](VALIDATION.md) for the exact
failure distinctions. The user's dev server was retained; no new production,
Rust, sandbox or Linux build/test run is claimed for this repair.

The gateway now accepts a testnet account ID and offers Meteor **message login**.
`apps/owner/src/data/meteor-message.ts` implements only the injected extension
transport for NEP-413 `sign_message`, based on the published SDK 1.0.24 protocol.
It does not invoke the SDK's `login`, create/store a key, open a website popup,
request transactions or export any wallet secret. No new dependency was installed.

Requests use a random ID, fixed `testnet` network, the server's 32-byte challenge
nonce/message/recipient and the entered account. The account is not an owner
allowlist. Unknown request IDs are ignored; mismatched accounts, networks/actions
when supplied, malformed results, cancellation, timeouts and extension failure
fail closed. The extension has no documented listener-removal API in this pinned
interface, so one dispatcher per injected object removes completed requests from
its map. Only one pending request is allowed per extension object.

The transport's response shape is **not authority**. The existing server verifies
the actual signature, single-use/expiring challenge and finalized FullAccess key.
Organization membership and finalized vault ownership are checked separately on
protected requests. Page scripts could forge an extension object; they cannot
produce a valid wallet signature through that object alone. Application origin
integrity remains a prerequisite, as with other injected wallets.

Meteor sessions cannot silently fall back to Nightly for transactions after a
page reload in the same tab. **Meteor transaction signing remains unimplemented
and blocked**, even if the application's transaction flag is enabled. Nightly's
existing path remains available, but its installed testnet UI was not verified.
Do not represent this as a complete replacement of the live payment connector.

## Why the stock connector was not enabled

Inspected published packages:

- [`@near-wallet-selector/meteor-wallet` 10.1.4](https://www.npmjs.com/package/@near-wallet-selector/meteor-wallet/v/10.1.4)
  pins [`@meteorwallet/sdk` 1.0.24](https://www.npmjs.com/package/@meteorwallet/sdk/v/1.0.24).
  Its `signIn` calls `requestSignIn`, which creates a local access key and requests
  contract access authorization. That is unsuitable for a message-only login.
- SDK 1.0.24's `MeteorWallet.ts` supports `signMessage` independently of sign-in.
  `MeteorPostMessenger.ts` uses `meteorCom.addMessageDataListener` and
  `sendMessageData` when an extension is present. The new bridge follows that
  extension protocol exclusively; real installed-extension interoperability is
  still unexecuted.
- The earlier isolated dependency trial reported **12 low and 5 high advisories**,
  including `nanoid` 5.1.5 and `query-string`'s `decode-uri-component` dependency.
  This is evidence about the proposed dependency graph, not a new audit of the
  current application. The earlier application baseline was 10 low advisories.
- Blind overrides were rejected: `query-string` 10 exports a default object while
  SDK 1.0.24 imports named `stringify`; the newer decoder also changes module
  format. Latest SDK 3.24.1 still declares the problematic older dependency pins;
  changing SDK major versions is not a demonstrated compatibility fix.
- The inspected SDK's web-popup message listener does not check event origin or
  source, and its sign-in path logs its newly generated access key. Neither path
  is used by the extension-only bridge. These are source observations, not an
  independent security assessment or a claim about every Meteor version.

Inspected SDK distribution SHA-256:

- ESM `dist/index.js`: `3489c69e527ebc51981ed416b07dff5a563099df9bd66ac22640841e81fe66bb`
- CJS `dist/index.cjs`: `4a7c0bbae820d12ccfa1dbf7186d5e2289c237e29476b193ea23fb4d7c72ee97`

The tarballs/source and earlier audit are retained in ignored
`.tools/meteor-compatibility/` and `artifacts/meteor-dependency-audit.json`.
Reference: official [Meteor public repository](https://github.com/Meteor-Wallet/meteor-public)
and the final [NEP-413 specification](https://github.com/near/NEPs/blob/master/neps/nep-0413.md).

## Remaining steps

1. Real installed-extension message interoperability and server verification have
   not run. The earlier browser-control failure was overcome for this button
   check: the actual Brave tab initializes Meteor successfully. Browser/extension
   versions remain unrecorded; no additional seed import or private-key disclosure
   is needed.
2. Current login still needs a configured organization and deployed reviewed vault.
   Identity-before-organization, self-service organization creation/discovery and
   onboarding provisioning are missing. Both live login buttons remain disabled
   in the current unconfigured environment. Do not bypass code/owner checks to
   force a wallet test.
3. Implement/review a separate Meteor transaction path with explicit account,
   network, receiver/actions, nonce and finalized-result verification before using
   it for owner actions. Login approval must never authorize this path implicitly.
4. Resolve the recorded deployment-review findings, refresh the exact unsigned
   setup plan and obtain specific transaction approval before any signing or
   deployment. The existing plan has not been approved.
5. Real owner/viewer/outsider and key-removal acceptance still require separate
   test identities and approved destructive probes. The frozen contract has no
   owner-rotation method. Contractor work remains gated on owner acceptance.

Local controlled tests are recorded separately in [VALIDATION.md](VALIDATION.md).
No real-wallet message or public transaction was requested for this implementation.
