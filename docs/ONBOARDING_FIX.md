# Wallet onboarding fix — 31 October 2026

**Current checkpoint:** both real Meteor identities, empty onboarding, durable
organization return and direct private API denials in both directions passed.
`grandtheft.testnet` sees Grandtheft workspace; `babygoat.testnet` sees its
authorized nnetics-studio. The full 26-case browser suite subsequently passed.
Older pending statements below describe the earlier investigation. No real
viewer/key-removal test, deployment or payment was performed.

Provisioning source was subsequently added, including contract changes identified
before implementation. Its Linux/live acceptance remains pending;
[VAULT_PROVISIONING.md](VAULT_PROVISIONING.md) is current for that continuation.
The original authentication fix below required no contract modification.

Owner acceptance remains incomplete. These local changes have not been pushed.
Any supported, activated NEAR testnet account may verify its identity through
Meteor; test accounts are acceptance fixtures, never an application allowlist.

## Diagnosis

There was no hardcoded owner login allowlist. The login path nevertheless required
the configured organization/vault, and the UI treated a denied organization snapshot
as failed login. This prevented an otherwise valid nonmember from reaching onboarding.
Wallet switching also lacked complete session and private-state invalidation.

The alternate address recorded during earlier login attempts,
`ca421cd2a55bf8c0774b1a971c02716d41d426b977b5fd44e9d7f6370ff1d45e`,
returned UNKNOWN_ACCOUNT at finalized testnet height 275516540. At the same block,
`babygoat.testnet` existed. Evidence was collected at 00:11:33 WAT on 31 October
(23:11:33 UTC on 30 October), protocol 88. A named account and its key-derived
implicit address are distinct accounts. This explains that recorded address's
failure; it does not establish the cause of every unspecified account failure.

## Implemented boundaries

Identity challenges bind the account, testnet, origin, browser generation and
expiry, independently of a vault or organization. Canonical NEP-413 signatures
and a finalized FullAccess key check are required. Challenges expire after five
minutes and are single-use; identity sessions expire after fifteen minutes.
Protected requests recheck the key. Invalid keys invalidate their sessions.

The separate identity SQLite database stores hashed session/browser identifiers
and durable organization metadata. New users see zero invoices, contractors and
payments and can create their own unprovisioned organization. Creator metadata
does not grant on-chain ownership. Returning identities discover only their own
draft organizations and the configured deployed organization if its existing
owner/viewer guards authorize them. Private billing records retain their existing
organization/database binding. Old organization-bound session cookies are ignored.

Switching accounts revokes browser sessions and pending challenges, cancels the
old message request, clears private UI state and requires fresh verification.
Generation checks prevent late proofs from resurrecting access. Other tabs clear
through BroadcastChannel. Local locking prevents failed logout from restoring
private records after reload. Meteor's bridge has no reliable account-change event;
the UI conservatively locks when the authenticated page loses focus or becomes
hidden. This means ordinary tab switching also requires verification again.

Synthetic records remain available only in explicitly labeled demo mode. Live
onboarding never borrows fixture invoices, balances or an existing owner's vault.
Wrong networks, missing Meteor and unactivated accounts have recovery messages.

## Historical provisioning assessment — before the continuation

Self-service vault provisioning is **not implemented**. Organization creation is
implemented as durable private metadata, but its status remains unprovisioned.
Only one developer-configured deployed vault/workspace is currently supported.
No organization creation action deploys, funds, installs keys or grants authority.

The intended product flow is wallet verification, empty dashboard, organization
creation, then the user's own vault provisioning with explicit transaction approval.
Universal provisioning needs a reviewed funding/account-creation design, including
implicit accounts and named accounts that cannot host the proposed subaccount.
A factory or new on-chain registry would require a separately identified contract
design/review; this fix changes no contract. Existing setup approval was consumed
by the earlier paused deployment and cannot authorize new users' transactions.

## Evidence and acceptance

### Real Meteor checkpoint — 31 October

Both `babygoat.testnet` and `grandtheft.testnet` exist at finalized height
275528050, block `2nzdy6XeDKy29BtuStBcHqw53e3BZQ26nez3EyKs5jjd`.
An earlier browser attempt reported unreachable NEAR verification; the local
preview was restarted with outbound RPC access. A fresh Meteor message approval
then verified `babygoat.testnet` and loaded its authorized `nnetics-studio`
workspace, `vault.babygoat.testnet`, and empty invoice/payment history. The vault
was paused with no authorized worker. Refresh showed locked login with no private
records. Evidence: `artifacts/live/babygoat-real-login.png` (local, ignored).

`grandtheft.testnet` also successfully verified through the actual Meteor
extension. Its dashboard showed no organizations, zero invoices/contractors/payment
history and no vault balance or access to `nnetics-studio`. The authorized UI action
created a durable private organization, `Grandtheft workspace`, ID
`e3600323-ad40-43c4-a31d-7d53abc4833e`, creator `grandtheft.testnet`. SQLite metadata
confirmed persistence; the original session subsequently locked on background
verification failure before the created organization was visibly confirmed.

During the initial return test, a subsequent approved login
reported unreachable NEAR verification. Node read-only diagnostics observed an
8.827-second status response, ECONNRESET and UND_ERR_CONNECT_TIMEOUT. PowerShell
and a Node IPv4-first request subsequently succeeded; the preview now runs with
`--dns-result-order=ipv4first`. This is a diagnostic environment adjustment, not
proof that network reliability is resolved. Later fresh approvals recovered
Grandtheft workspace and the original owner's nnetics-studio respectively.
Grandtheft's session was denied `/api/live/snapshot?organization=nnetics-studio`;
the returning babygoat session was denied Grandtheft's organization UUID.
Screenshots include `artifacts/live/grandtheft-real-return.png`,
`grandtheft-owner-access-denied.png` and `babygoat-real-return-organizations.png`.

The client timeout previously allowed only 20 seconds for a multi-read request;
it now allows 90 seconds. Independent status/block reads run concurrently without
relaxing finalized key checks. Heartbeats now schedule the next check only after
completion, and show the actual verification failure while clearing access.
The misleading synthetic-data loading text in a live dashboard was also corrected.
No contract change or deployment transaction was requested or executed.

After these changes, all 41 Node tests and the production build passed. The browser
run had 24 passes and two failures in the new test's ambiguous alert locator (the
framework also supplies an alert element). After targeting the verification alert,
both focused desktop/mobile cases passed. Thus the existing 24 and new two cases
passed across runs; a subsequent full 26-case run also passed. The new
test holds a heartbeat across 30 seconds of simulated time, verifies no overlapping
request, then confirms the concrete error clears protected UI. All browser tests
still use mocked wallet/API responses.

The older statement below that no real login was completed is superseded by the
two actual Meteor authentications above, not by a full acceptance pass.

Executed locally: 42 root tests, 41 application Node tests, 24 desktop/mobile
Playwright tests and the production dashboard build passed. Node identity tests use actual generated Ed25519 signatures,
SQLite and controlled RPC responses. They cover two distinct identities, empty
onboarding, private organization isolation, challenge/session expiry and replay,
removed/restricted keys, switching races and preserved owner/viewer guards.
Browser tests use mocked Meteor/API responses; they cannot prove real wallet login.

An initial new identity test helper passed the wrong arguments to the SDK signing
helper (36 pass, 4 fail); it was corrected before the passing run. A production
build filesystem-tracing warning was corrected and the build rerun successfully.

The two-account real Meteor identity/isolation checkpoint subsequently passed;
full live vault/payment acceptance remains incomplete.
The second account was needed solely to test fresh-user behavior and isolation;
users never need to register an account with the developer before signing in.
No new transaction, deployment, Rust/sandbox run, Linux CI run or independent
security review is claimed by these checks. Contractor and payment feature work
remains paused pending onboarding acceptance.
