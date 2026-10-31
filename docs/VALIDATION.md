# Validation record — through 31 October 2026

**The integration build passed automated Linux checks on protocols 86 and 88. Milestone 1 and live-payment acceptance remain incomplete.** Independent security review remains open; no audited or production-ready verifier claim is made.

## 31 October — fresh-user provisioning continuation

**Approved publication checkpoint:** commit `100fa5fa246f83d8bbe2641a97b03685b3c83c14`
was pushed to `codex/nnetics-live-integration` on 31 October. Linux runs started:
[owner integration](https://github.com/Technique-S/Nnetics/actions/runs/41215648701),
[payment core](https://github.com/Technique-S/Nnetics/actions/runs/41215648664), and
[vault provisioning](https://github.com/Technique-S/Nnetics/actions/runs/41215648629).
Owner integration completed with a browser-test failure: type checking, all 49
Node tests and the production build passed; 26 of 28 Playwright cases passed.
Both failures were the same cancellation-test race on desktop/mobile: the test
rejected the cancelled first wallet request before the asynchronous second
challenge had registered its replacement request. The local test now waits for
the second wallet request before rejecting it. Six repeated targeted executions
and the full 28-case browser suite passed locally after this test-only fix.
Linux verification of this correction requires a separately approved follow-up
push. Payment-core and provisioning matrix results are still pending at this
checkpoint. Publication approval excludes signing, deployment, activation and
payments; provisioning remains disabled.

**Real Meteor identity checkpoint passed:** `babygoat.testnet` and
`grandtheft.testnet` authenticated. Grandtheft started with zero records and no
organizations, created its private organization, and recovered it on a fresh
login. Its verified session was denied the original owner's private snapshot.
The returning babygoat wallet recovered only its nnetics-studio workspace/list
and was denied Grandtheft's organization API. Refresh/lost focus cleared private
records and required verification. Real viewer/key-removal/ownership-rotation
transactions were not executed. This is not independent security review.

**Executed after the local provisioning changes:** 42 root tests, 49 application
Node tests, 28 desktop/mobile Playwright tests, and the production Next.js /
TypeScript build passed. Rust formatting and the new shell script syntax passed.
Node provisioning tests use real SQLite persistence and Borsh hashes with
controlled RPC results. Browser provisioning tests mock wallet/API responses;
they confirm transaction details and signing gates, not real deployment.

**Written, not executed:** three additional vault unit tests, three factory unit
tests and four provisioning sandbox tests. Native Windows WASM build attempts
failed in the host linker before producing a new artifact. New Rust unit/sandbox
execution and the protocol-86/88 Linux provisioning workflow are now pending CI
results. Earlier Linux results do not validate the added constructor or factory.

Local source now includes Create vault, deterministic requests, durable pre-wallet
hashes, fixed-byte retry/reconciliation, guarded initialization and unique vault
links only after conclusive finalized owner/code/receipt verification. New vaults
start paused, without keys, worker or payment funds. Payment controls stay gated.
Callback/refund failure and unavailable historical outcomes remain blocked; no
administrator claim/override was added. See [VAULT_PROVISIONING.md](VAULT_PROVISIONING.md).

No new public-network transaction, deployment, activation or payment occurred.
The unsigned factory-plan generator is written/tested, but a concrete
deployment digest cannot be approved until Linux supplies reviewed artifacts and
a fresh funder/key/balance/protocol/storage-price preflight. Full vault onboarding,
Milestone 1 review and live-payment acceptance remain incomplete.

## Earlier 31 October authentication checkpoint — historical

**Real-wallet update:** `babygoat.testnet` and `grandtheft.testnet` both authenticated
through Meteor. The latter received empty onboarding and created its own durable
unprovisioned organization. Real return/switch testing remains incomplete because
RPC connectivity failed during background verification and a return login. The
local timeout/overlapping-heartbeat fixes pass 41 Node tests and the production
build. The browser run passed 24 existing cases; two new cases initially failed
on an ambiguous test locator, then both passed after fixing the locator. No full
26-case rerun, provisioning deployment or acceptance pass is claimed. See the
checkpoint and network evidence in [ONBOARDING_FIX.md](ONBOARDING_FIX.md).

Local execution: **42 root tests, 41 application Node tests, 24 Playwright tests
(desktop/mobile), and the production Next.js/TypeScript build passed.** Browser
tests mock Meteor and the API. Identity tests use generated real Ed25519 signatures
and SQLite with controlled RPC responses. They cover empty onboarding, private
organization creation/isolation, replay/expiry, key invalidation, switching and
preserved deployed owner/viewer guards. These are automated regression results,
not real-wallet acceptance or independent security review.

The login/configuration coupling and switch-session gaps were fixed locally.
Self-service vault provisioning remains missing. Neither two-account real Meteor
login nor a new Rust/sandbox/Linux run was executed. No new transaction/deployment
or push occurred. [ONBOARDING_FIX.md](ONBOARDING_FIX.md) records the actual diagnosis,
initial test/build failures corrected, authoritative account-read evidence and
remaining limitations. Earlier dated results below remain historical.

## Owner onboarding acceptance check — blocked

**30 October approved paused setup — executed:** all four transactions in plan
`2c2bfe94fbfac359b08a8b2880b4433384c055d6852e52ac70f8aee92de20a43` are FINAL/success.
The fresh vault, worker and vendor were funded with 6 / 1 / 0.1 testnet NEAR and
the exact keys; the pinned WASM was deployed and initialized. At finalized height
275379556, vault owner is `babygoat.testnet`, paused true, agent null, payment
funded/spent/reserved/uncommitted balances zero and last attempt zero. Deployed
code hash matches the tested artifact. No payment, unpause, worker activation or
checkpoint was performed. The four-transaction approval is consumed; transaction
and setup switches remain blank. [Setup evidence and transaction links](BABYGOAT_TESTNET_PLAN.md)
record the exact results and remaining independent-review/bootstrap limitations.

The npm CLI 0.30.1 secure keychain was found outside the agent session's PATH.
No owner key was exported: each exact approved owner transaction was signed offline
and cryptographically verified before broadcast, proving CLI signer control. This
is not a real Meteor login or organization-role acceptance. Public organization/vault
configuration is now active locally and the real Brave page enables message login;
no real NEP-413 challenge was signed. Self-service organization creation/provisioning,
viewer/outsider journeys and contractor implementation remain incomplete.

For the setup signer change, **36 application Node tests** and strict TypeScript
passed. The first new verifier test run had 35 pass / 1 fail due to SDK decoded
signature data having a plain variant shape; this was corrected before any setup
signing, then all 36 passed. A focused exact-byte/signature regression also passed
after formatting. No Rust/sandbox/Linux/production build or new browser-suite run
was performed for this script change. Browser configuration/initialization was
checked directly in the user's real Brave tab. No new GitHub push occurred.

**Configuration-blocker refresh, 30 October 01:54:30 WAT:** finalized testnet
height 275377603 / protocol 88 confirms the planned vault, worker and vendor still
do not exist. `babygoat.testnet` has about 9.99983 testnet NEAR; its originally
supplied FullAccess key remains registered alongside two additional FullAccess
keys. No key origin/control is inferred. The unsigned four-step plan digest and
tested WASM hash still match. Application configuration was not activated, and no
key, signature, account, deployment or payment was created by this read-only check.
See [BABYGOAT_TESTNET_PLAN.md](BABYGOAT_TESTNET_PLAN.md). No test rerun is claimed.

**30 October Meteor connection-button repair:** reproduced in the running dev
app: the old button was natively disabled by missing configuration/empty account,
not covered by another element. No browser console warnings/errors were captured.
Connection initialization is now a separate enabled action; message login keeps
its configuration/account checks and wallet-approval step. The page reports exact
missing configuration names plus retry instructions, or a missing-extension
recovery action. The actual Brave app tab successfully initialized the real Meteor
extension dispatcher; the in-app browser correctly reported Meteor unavailable.
Neither check requested a signature or transaction. Successful initialization is
not real-wallet login or owner acceptance. Current missing settings are organization,
vault, worker and worker public key. No configuration guard was bypassed.

The additional controlled browser case checks an ordinary unobstructed click,
initialization with incomplete configuration, configuration recovery, a pending
testnet `sign_message` request without any login call, and rejection/decline recovery.
**Executed for this repair:** all **35 application Node tests**, strict TypeScript
and **18 Edge desktop/mobile browser cases** passed, none skipped. The browser
suite ran against the existing dev server. Its first run had **4 failed / 14 passed**:
two new assertions failed on each viewport because Next dev adds its own alert
element and Strict Mode repeats the initial configuration read. The alert query
was scoped to the Meteor panel and retry verification now checks a new read
rather than assuming exactly one initial read. The complete rerun passed 18/18.
No production build was run over the user's active dev output; root/Rust/sandbox/CI
and public-network message login were not rerun for this UI repair. Final real
Brave initialization evidence is saved in ignored
`artifacts/live/meteor-connection-fix.png`. The dev server remains running.

**30 October Meteor continuation:** the user confirms the Meteor **browser
extension** shows `babygoat.testnet` and 10 testnet NEAR. This is user-reported
wallet UI evidence, not a verified application session. A local extension-only
NEP-413 message-login bridge is implemented without adding the stock Meteor SDK
or requesting an on-chain access key. Meteor transaction signing remains
unimplemented and explicitly blocked. Current configuration still prevents login
before a reviewed deployed vault exists; self-service onboarding is absent.
See [METEOR_WALLET_COMPATIBILITY.md](METEOR_WALLET_COMPATIBILITY.md) for protocol
provenance, dependency findings and remaining steps. No real-wallet signature,
public-network transaction, contract change or push occurred in this continuation.

**Executed for this continuation:** 42 root Node tests, **35 application Node
tests**, strict TypeScript, production build and **16 Edge desktop/mobile browser
cases** passed, with zero failed or skipped tests. Four new transport tests cover
testnet-only messages, request correlation, wrong/malformed identities, conflicting
metadata, cancellation, timeout, extension errors and concurrent requests. One new
browser case executes on both viewports and verifies controlled extension/API
wiring plus the Meteor transaction block after reload. The browser login response
is a fixture with a dummy signature; real cryptographic authentication is covered
by the existing server tests using generated local keys. These tests do not prove
interoperability with the installed Meteor extension or independent security review.
No Rust, sandbox or new Linux CI run was performed for these TypeScript changes.

**Latest owner selection:** the user supplied CLI-created `babygoat.testnet` and
public key `ed25519:EcXpsAWQyN6hCN6BmPKiYPWWRNZWHZMVBtvGZDwAdzwo`.
Finalized testnet height 275367689 confirms the exact sole FullAccess key and
10 testnet NEAR balance. Proposed vault/worker/vendor names are absent at height 275367808. [BABYGOAT_TESTNET_PLAN.md](BABYGOAT_TESTNET_PLAN.md) records the updated
unsigned plan; it is not authorized. Prior-owner plans are superseded, and the
previously created account is untouched. No signatures/public mutations or test
reruns were made for this selection. Wallet control and owner acceptance remain open.

[OWNER_ONBOARDING_ACCEPTANCE.md](OWNER_ONBOARDING_ACCEPTANCE.md) records the actual
acceptance matrix and finalized testnet preflight. Self-service organization
creation, wallet-to-workspace discovery and onboarding vault provisioning are not
implemented; the app still requires developer configuration and a deployed vault.
The earlier `tobylou.testnet` account and implicit-address mismatch are historical;
the selected `babygoat.testnet` public key now matches finalized account state.
No real-wallet signature/session/role journey was executed or accepted.

Re-executed locally for this check: **31 application tests, 14 Edge browser cases
and production build with TypeScript**, all passed. Controlled fixtures are not
real-wallet acceptance. The gateway now explicitly labels developer setup as
required. The two unsigned setup candidates in [OWNER_TESTNET_PLAN.md](OWNER_TESTNET_PLAN.md)
are blocked by wallet mismatch, not approved for execution. No signing, funding,
key removal, deployment or push was performed. Contract sources remain unchanged.
The contractor portal is explicitly deferred until owner acceptance passes; its
requirements, including immutable existing order recipients, are documented.

On 30 October (Africa/Lagos), the user chose the current wallet for a new testnet
owner. A name-availability read and pinned official CLI source check prepared a
public-key-only faucet request for `nnetics-tobylou.testnet`; it is not submitted.
The old-owner candidates are retired. [NEW_OWNER_ACCOUNT_PLAN.md](NEW_OWNER_ACCOUNT_PLAN.md)
contains the exact request and distinct future deployment plan; neither is
authorized. Wallet control, real acceptance and the contractor gate remain open.

**Subsequent explicitly approved execution, 30 October WAT:** the exact sponsor
request was submitted once. Transaction
[`GhDXFy8C9wBUaSVjXSM6GK6vN3L4VbUjAiK8bLA4Fg5b`](https://testnet.nearblocks.io/txns/GhDXFy8C9wBUaSVjXSM6GK6vN3L4VbUjAiK8bLA4Fg5b)
was confirmed FINAL/successful. Finalized height 275366543 showed
`nnetics-tobylou.testnet` with 10 testnet NEAR, no code and exactly the approved
FullAccess key. The sponsor signer was `testnet`; no user-wallet signature or funds
were used. Raw response, durable attempt marker and finalized account/key/transaction
confirmation are retained under ignored `artifacts/live/`. This consumes only the
one sponsor-request approval. Vault deployment, key changes, further funding,
wallet proof and payments remain unauthorized. Owner acceptance remains blocked
by unverified wallet control and missing self-service organization/provisioning.
No new tests were run for this read-only reconciliation/documentation step.

## Local wallet and organization authorization continuation

The application owner-ID allowlist is removed. Verified NEP-413 identity sessions
are distinct from organization membership and on-chain vault ownership. All
protected requests recheck the finalized wallet key and vault owner; explicit
organization viewers cannot mutate data or initiate owner transactions. Full
configuration, upgrade behavior and contract impact are in
[ORGANIZATION_ACCESS.md](ORGANIZATION_ACCESS.md). No Rust/ABI changes were needed.

Executed locally on Windows/Node 24: **42 root tests, 31 application tests, strict
TypeScript, production dashboard build and 14 desktop/mobile Edge browser
executions**, all passed. The six wallet/organization tests cover actual local
Ed25519 signatures and SQLite, nonce replay/concurrency/expiry, account/origin/org
binding, current key permission/removal, uninvited wallets, read-only grants,
revocation, owner changes, legacy-session invalidation without payment-claim loss,
all application mutation routes and block-pinned snapshots. Browser live-mode
cases use controlled HTTP responses; they do not establish real wallet acceptance.
The first typecheck/build failed on unbranded test fixture amount/account strings;
the fixture now uses the existing structured-invoice validator and subsequent
typecheck/build passed.

These changes are local and not pushed. No new Linux run, Rust unit/sandbox rerun,
real-user wallet signature, public transaction or deployment is claimed here.
The prior Linux evidence below applies to its exact source commits. Production
Rust source is unchanged. Independent review, trusted bootstrap and real-payment
acceptance remain incomplete. No on-chain member spending or owner-rotation
permission was added.

## Approved integration push and Linux execution

Commit `80d253d41d63bdd782abf7d66a2036dc07793e0b` was pushed to
`codex/nnetics-live-integration` with explicit user approval. Completed execution:

| Run                                                                                            | Executed result                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Contract matrix 40947353192](https://github.com/Technique-S/Nnetics/actions/runs/40947353192) | Both nearcore 2.13.0 / protocol 86 and 2.14.0-rc.5 / protocol 88 passed. Each: 41 root TypeScript, 36 Rust unit, 15 sandbox tests, five WASM builds, Clippy and formatting. Runtime protocol asserted. Finished 20:24:06 UTC / 20:22:50 UTC. |
| [Owner 40947353242](https://github.com/Technique-S/Nnetics/actions/runs/40947353242)           | Ubuntu 24.04, Node 24.22.1: 26 Node tests, strict TypeScript, production build and 12 Chromium browser executions passed.                                                                                                                    |

Both production WASMs retain the SHA-256 below. Downloaded manifests, logs, actual
receipt proofs and VM measurements are in ignored `artifacts/github/40947353192/`.
See [PROTOCOL_88_REVIEW.md](PROTOCOL_88_REVIEW.md) for pinned official-source
comparison, measured gas/storage and unresolved trust assumptions. Maximum tested
88 update used 62.567 Tgas; repair at most 31.124 Tgas. Late gas/storage failures
preserved the full compared payment/claim/ledger/audit state. This synthetic bounded
workload and passing tests do not replace independent security review.

The follow-up parser guard rejects non-null future Spice commitments, and a shared
signing gate accepts only tested protocols 86/88. Locally executed: 42 root tests,
26 application tests, strict TypeScript, production build and 12 desktop/mobile
browser executions passed. The follow-up is commit
`30bafa3c4432bc27fa10418b8b73446dbb45c65b`. Its completed Linux execution:

| Run                                                                                            | Executed result                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Contract matrix 40949948285](https://github.com/Technique-S/Nnetics/actions/runs/40949948285) | Protocols 86 and 88 both passed: 42 root tests, 36 Rust unit tests, 15 sandbox tests per runtime, five WASM builds, Clippy and formatting. Jobs completed 20:41:20 UTC / 20:40:14 UTC. |
| [Owner 40949948396](https://github.com/Technique-S/Nnetics/actions/runs/40949948396)           | 26 application tests, strict TypeScript, production build and 12 Chromium browser executions passed.                                                                                   |

No tests are skipped in these suites. Logs/manifests/proofs are retained under
ignored `artifacts/github/40949948285/`; owner log is
`artifacts/owner-linux-40949948396.log`. Transaction flags remain disabled; no
public-network signing occurred. Passing controlled tests does not complete the
real testnet workflow or independent security review.

## Integration baseline and local evidence

Inspected renamed source and retrieved [Linux run 40901797197](https://github.com/Technique-S/Nnetics/actions/runs/40901797197),
commit `7d194e49c53c80884097a49ac113a1a509c4d654`, completed at 15:36:26 UTC:
41 root TypeScript, 36 Rust unit and 15 sandbox tests passed, with no skipped/ignored
tests. Production/four fault WASMs, Clippy and formatting passed. The downloaded
production artifact is 420,841 bytes, SHA-256
`1dd4f6971b13303661b29c6757a353c873368848490bdce2cd86a9cc360459f8`;
it is retained as `artifacts/vault.wasm`. This supersedes older artifact hashes for
deployment preparation; it is not a deployment authorization. Windows and Linux
build hashes differ, so cross-platform bit-for-bit reproducibility is not claimed.

Executed locally for the integration: **41 root tests, 26 application Node tests,
strict TypeScript (including setup scripts), production dashboard build and 12
desktop/mobile browser executions**, all passed. Application tests exercise actual
SQLite persistence, duplicate/order constraints, exclusive worker locking,
lost acknowledgements, identical-byte unknown recovery, prepare-gap interruption,
callback-unknown/final statuses, transaction linkage and NEP-413 expiry/replay/key
ownership rejection. A marker vector comes from actual renamed Rust sandbox
output. Controlled transports/browser HTTP fixtures are used; these are not
public-network acceptance tests or an independent audit.

Read-only RPC preflight reported **testnet protocol 88**; the deprecated NEAR endpoint
also returned a deprecation/429 error, and the app default was switched to the
documented FASTNEAR testnet endpoint. The locally written contract CI matrix adds
nearcore `2.14.0-rc.5` / protocol 88 alongside the preserved `2.13.0` / protocol 86
baseline. Both runtime paths assert the reported protocol; the completed executions
are recorded above. Production Rust sources are unchanged.

Browser failures during development: a demo-title hydration mismatch and an overly
exact error-text locator. A stable title/named error assertion fixed these; all 12
subsequent executions passed with a clean runner exit using a separately managed
local server. Earlier runner-cleanup limitations remain historical below.

Unmet acceptance: activated owner testnet account and named setup/sponsor plan,
reviewed pre-payment checkpoint, independent verifier review, real wallet challenge
and owner transactions, recipient balance delta/transaction-link proof, real restart
journey, and transaction authorization. Local configuration based on a withdrawn
account hint was cleared; the supplied implicit account remains inactive and no account was created. Dedicated generated role keys
are outside Git and unused. Dependency audit reports 10 low-severity transitive
elliptic/secp256k1 advisories; no unsupported forced downgrade was applied.

See [LIVE_INTEGRATION.md](LIVE_INTEGRATION.md). No public-network transaction was
signed or sent. AI extraction remains deliberately unimplemented until the manual
invoice workflow passes acceptance. No current integration changes have been pushed.

## Historical local rename result — superseded by Linux run above

The product rename updates package identifiers, verification environment variables,
the `NNETICS_TRANSFER_V1` receipt marker and the `nnetics:repair:v1:` storage-key
namespace. Use a fresh vault for this build: upgrading an existing vault would
require an explicitly reviewed migration, and earlier markers cannot be used as
repair evidence by this build. No public deployment exists. The Linux results and
WASM checksums below describe the earlier source commits, not the renamed build.
Rust unit and sandbox execution was pending at this local rename stage; the later
Linux run recorded above executed both successfully on protocol 86.

Executed locally after the rename: 41 reference-policy tests and 11 owner-adapter
tests passed; all eight desktop/mobile browser scenarios passed with explicit
Nnetics title/branding assertions. The browser runner hung during local server
cleanup after reporting all eight scenarios successful and was interrupted; a clean
runner exit is not claimed. The owner production build and strict TypeScript
checks, both Rust format checks, locked sandbox manifest resolution and the locked
offline production WASM build passed. Renamed WASM SHA-256:
`fc53f50fa7f684bee78b788a47a50f12a29b5955f870ac1b2797a7de846ed3fd`.
Native Rust unit/sandbox tests were not executed on this Windows host. The user
authorized pushing the renamed dashboard branch; deployment remains disabled.

## Bounded review continuation — latest result

[Run 40877809725](https://github.com/Technique-S/Nnetics/actions/runs/40877809725), commit
629a7c17d9e471a4e90024e3477204182beba26c, completed successfully at 13:07:50 UTC.
**Executed: 41 TypeScript tests, 36 Rust unit tests and 15 sandbox tests**, all passed,
with no ignored/filtered tests. Five WASM builds, production Clippy and both Rust
format checks also passed. The following older results remain historical evidence;
this continuation supersedes their test counts and artifact checksum.

[M1_REVIEW.md](M1_REVIEW.md) records the pinned official comparison, epoch commitment
hardening, six additional unit regressions, maximum VM workload, failed/superseded
runs and unresolved assumptions. It is an implementation-author review, not an
independent audit. The public contract signatures and serialized state layouts remain
unchanged; new fault behavior is restricted to existing test-only artifacts.

The VM exercised 128 validators, 256 approval slots, six 64-sibling repair paths and
exactly 128,000 request bytes together at explicit 300 Tgas prepaid function-call gas.
Measured total gas: bootstrap 40.864 Tgas, head transition at most 62.568 Tgas,
repair at most 31.125 Tgas. Added storage: bootstrap 31,327 bytes, repair 287 bytes
for success / 231 for failure. Existing numerical bounds were retained for this
measured workload; this is not a formal upper bound for every possible input shape.

Late gas exhaustion after terminal collection writes and the late storage-funding
guard after a 1 MB write left reservations, claims, payment/order state and audit
records unchanged in both success/failure cases. Retrying the identical proof on
production code then finalized safely and replay rejected. The repair storage test
hits the contract guard, not protocol LackBalanceForState; the existing callback
matrix separately exercises protocol storage failures.

Latest production WASM: **421,118 bytes**, SHA-256
2fc8ed792bf63a27db049a8c90e222bccd1e208fa9a7535ff3c997139b4e5540.
Evidence is retained in artifacts/github/40877809725/payment-core-40877809725-1/20261029T125923Z-40877809725-1-3925/,
including verifier-bounds.json and run.json. The tested WASM is copied to
artifacts/vault.wasm. No deployment or public-network signing occurred.

The bounded review and requested VM benchmarks are complete. Independent security
review, trustworthy bootstrap/network selection, PoS weak-subjectivity assumptions,
upgrade credentials and legacy attempts without pre-payment anchors remain outside
what passing tests establish. Overall acceptance remains explicitly false. No extra
environment access is needed. Milestone 2 work is a separate, local mock UI and does
not alter or authorize this core.

## Actual successful execution

[GitHub Actions run 40867146834](https://github.com/Technique-S/Nnetics/actions/runs/40867146834) tested commit d515974d64656caa62666b97b4d5fce494340166. It finished successfully at 11:48:20 UTC on 29 October 2026. Environment: Ubuntu 24.04 x86_64, Node 24.22.1, Rust/Cargo 1.93.0, near-sdk 5.29.1, near-workspaces 0.23.0, near-sandbox 0.3.12 / nearcore 2.13.0 (protocol 86).

| Check                       | Written                                            | Executed in this run    | Result                                                |
| --------------------------- | -------------------------------------------------- | ----------------------- | ----------------------------------------------------- |
| TypeScript reference policy | 34 tests                                           | 34                      | Passed                                                |
| RPC proof normalization     | 7 tests                                            | 7                       | Passed                                                |
| Rust SDK unit tests         | 30: 13 original + 17 proof/finality cases          | 30                      | Passed; 0 failed, ignored or filtered; 1.43 seconds   |
| Rust sandbox tests          | 14 top-level tests with additional case matrices   | 14                      | Passed; 0 failed, ignored or filtered; 195.80 seconds |
| Production WASM             | Default features                                   | Built                   | Passed                                                |
| Callback fault WASMs        | Record/finalize × gas/storage                      | All four built          | Passed                                                |
| Production Clippy           | WASM release library, -D warnings                  | Executed                | Passed                                                |
| Rust formatting             | Both crates                                        | Executed                | Passed                                                |
| Evidence retention          | Stage logs, manifest, WASM, receipt proofs/results | Uploaded and downloaded | Passed                                                |

There are no written-but-unexecuted Rust test cases in the current suite. This does not establish coverage of every possible consensus/resource condition.

The tested production WASM is 421,025 bytes, SHA-256:
e97f89494906baf07a818102aa58c343c1f8279ca6be72d4bfbc9f8af5f0b78f

This checksum matches both final Linux runs. The successful run's manifest records source/configuration/lockfile hashes, all stage exit codes and nonzero Rust test counts. A subsequent documentation-only commit does not change the verified source.

## Recipient balances and repair evidence

The normal successful payment increased the recipient from 100000000000000000000000000 to 102000000000000000000000000 yoctoNEAR: exactly **2 NEAR**. The final payment is Paid, spent is 2 NEAR, reserved is zero and last_attempt is 1. The full PAYMENT_EVIDENCE record is in logs/sandbox-tests.log.

The historical-proof matrix executed all four cases:

| Lost result callback     | Native transfer | Exact recipient delta | Repaired status | Final reserved / spent | Repair gas burned |
| ------------------------ | --------------- | --------------------- | --------------- | ---------------------- | ----------------- |
| Gas exhaustion           | Success         | 1 NEAR                | Paid            | 0 / 1 NEAR             | 5,072,292,929,148 |
| Gas exhaustion           | Failure         | 0                     | Failed          | 0 / 0                  | 5,190,522,132,805 |
| Protocol storage failure | Success         | 1 NEAR                | Paid            | 0 / 1 NEAR             | 5,072,341,471,752 |
| Protocol storage failure | Failure         | 0                     | Failed          | 0 / 0                  | 5,186,041,151,479 |

Each case kept the reservation while the outcome was unknown, verified actual node-generated inclusion proofs under signed head updates, rejected tampering, repaired through an unprivileged account while paused/revoked, and rejected replay. Balance deltas were captured before recipient-signed calls consumed gas. Raw proof bundles and final payment/vault/audit records are retained in evidence/. These gas measurements are for the exercised sandbox proofs, not maximum-size proofs or validator sets.

All 12 core sandbox tests also passed: exact payment and duplicate guards; concurrent same-order, shared-invoice and budget competition; amount/recipient/cap/budget/funding checks; pause, vendor/order/agent revocation and expiry; account/key/deposit/private-callback restrictions; real failed transfers and safe retry; bounded retries and immutable order IDs; storage/liquidity rejection with state rollback; callback gas/storage fault matrix and durable-evidence reconciliation; unknown client outcomes resolved by views without resubmission.

The two additional sandbox tests passed the four historical-proof cases above and frozen checkpoint authority. Unit tests passed expiry boundaries, signer/predecessor and stale callback checks, in-flight revocation, immutable recipients, hashes compared with official near-primitives types, signed quorum/epoch transitions, invalid signatures/truncated approvals, stale heads, unknown/tampered/unrelated/stale/replayed evidence, consumed receipt rejection, ambiguous initiating receipts and immutable bootstrap.

## Execution failures and corrections

| Run / commit                                                                             | Actual result and correction                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [40862869517](https://github.com/Technique-S/Nnetics/actions/runs/40862869517) / 9206f07 | TypeScript 41 passed; Rust unit compilation failed on eight test hash conversions and one mock context field. Zero Rust tests executed. Fixed in 7125f38.                                                                                              |
| [40863230050](https://github.com/Technique-S/Nnetics/actions/runs/40863230050) / 7125f38 | Rust unit 29 passed, 1 failed. Official-type comparison detected a real validator public-key length-prefix mismatch. Corrected consensus encoding in 919be5b; preserved the comparison assertion.                                                      |
| [40863676284](https://github.com/Technique-S/Nnetics/actions/runs/40863676284) / 919be5b | Rust unit 30 passed; sandbox 0 passed, 14 failed during setup: finite worker-key allowance was below the sandbox upfront gas check. Raised only the ephemeral test key allowance to 100 NEAR in 47e059f; method restriction unchanged.                 |
| [40864788315](https://github.com/Technique-S/Nnetics/actions/runs/40864788315) / 47e059f | Rust unit 30 passed; sandbox 0 passed, 14 failed at the setup rejection probe with an opaque WASM trap. Missing --cfg near selected off-chain SDK fallbacks. Corrected target flags and added a compile-time guard in d2ec5a7.                         |
| [40865934492](https://github.com/Technique-S/Nnetics/actions/runs/40865934492) / d2ec5a7 | Rust unit 30 passed; sandbox 13 passed, 1 failed. Real proof/callback matrices passed. Storage-shortfall fixture accidentally reset the deployed code hash. Fixed in d515974 by preserving current account fields and checking unchanged code/storage. |
| [40867146834](https://github.com/Technique-S/Nnetics/actions/runs/40867146834) / d515974 | All checks passed: TypeScript 41, Rust unit 30, sandbox 14, five WASM builds, Clippy and formatting.                                                                                                                                                   |

**Artifacts built before d2ec5a7 must not be deployed.** Compilation and structural WASM validation did not detect the missing SDK on-chain configuration; sandbox execution did. The corrected .cargo/config.toml applies --cfg near to WASM builds, matching [official cargo-near behavior](https://github.com/near/cargo-near).

Earlier Windows native unit compilation failed before executing tests because dlltool.exe was unavailable. That environment failure is superseded by the Linux execution above. Additional local checks executed: Bash/report syntax; synthetic report failures for zero tests/missing stages (exit 80); configured WASM build with panic_utf8, sha256 and ed25519_verify host imports; a deliberately misconfigured WASM check rejected by the explicit --cfg near compile guard (exit 101, artifacts/local-checks/missing-near-cfg.log). These checks are separate from the Linux test counts.

## Reproduction and retained evidence

Run bash scripts/check-core.sh from the repository root on Linux x86_64 with Node 24 and rustup. Ubuntu prerequisites: build-essential, pkg-config, libssl-dev, clang and cmake. rust-toolchain.toml pins Rust 1.93.0, formatter, Clippy and the WASM target. Both Cargo lockfiles are committed; preserve near-sdk-env 0.1.6 and near-sys 0.2.14 compatibility pins.

The workflow .github/workflows/payment-core.yml uses Ubuntu 24.04 and pinned official action commits. It runs the script, which rejects sandbox binary overrides, builds fault variants in separate target directories and uses only fresh local nodes with synthetic accounts. No wallet, faucet, deployment credentials or public RPC is needed. Ambient Rust flag overrides cannot silently omit --cfg near: the contract compilation guard rejects them.

Every run gets a fresh artifacts/runs/ directory. Missing stages, zero-test Rust summaries or failed report generation fail verification. Actions uploads logs, checksums, the production WASM and available public sandbox proof/result bundles even on failure. The manifest deliberately leaves milestone_1_accepted false for review; a green workflow is not an automatic security approval.

All completed-run artifacts were downloaded to ignored artifacts/github/<run-id>/. The successful evidence is in artifacts/github/40867146834/payment-core-40867146834-1/20261029T114033Z-40867146834-1-2953/. The tested production WASM is also copied to ignored artifacts/vault.wasm. GitHub artifacts expire after 14 days; the local downloaded copies remain available.

## Preserved contract and repair authority

The pre-continuation source, tests, validation report and WASM are preserved under ignored .tools/m1-baseline/. Original contract source SHA-256: b0321c1c2f7b80479ed0119f9cdccacd20ba5bfe3862e4b04609aa0b0d202c40. The original WASM was 290,318 bytes, SHA-256 917e6b59fa879582421593e8d9d4c849048ae87ae11faa53a9fe6273ab172654; it predates the corrected build configuration.

Vault, WorkOrder, Payment, status variants and collection prefixes retain their serialized layouts. Proof state uses separate versioned prefixes. Source layouts were compared; sandbox fault-code replacement also exercised shared serialized state, but no generic legacy migration was implemented or claimed.

[HISTORICAL_REPAIR.md](HISTORICAL_REPAIR.md) defines authoritative evidence: a one-time pre-payment trust anchor; subsequently verified signed finality/ancestry; finalized initiating and exact native-transfer receipt proofs; exact attempt/marker/recipient/child linkage; permanent receipt consumption. Anyone may relay heads or submit valid repair proofs. Unknown, invalid, unfinalized, stale, replayed or ambiguous evidence cannot release reservations. No owner outcome flag, timeout release or balance heuristic is accepted.

## Remaining limitations and access

No additional environment access is needed. The user supplied [Technique-S/Nnetics](https://github.com/Technique-S/Nnetics), explicitly authorized pushing, and completed GitHub authentication. Branch pushes, Ubuntu execution and artifact retrieval succeeded. No public-network transaction was signed or deployment performed.

Independent review remains necessary for the trusted bootstrap, consensus encoding/protocol assumptions and resource guarantees. The initial run exercised a small real validator set; the latest bounded-review runs additionally benchmarked synthetic 128-validator/256-approval/64-sibling/128,000-byte inputs in the VM. That finite workload is not a formal worst-case guarantee for every JSON shape or future gas schedule. The verifier supports bounded Ed25519/legacy header encodings, tested on protocols 86 and 88, and requires timely authenticated synchronization under normal PoS/light-client assumptions, including weak subjectivity. Unsupported evidence fails closed and can leave an attempt blocked.

Old attempts lacking an initiation marker or pre-payment checkpoint remain blocked; the owner cannot install a post-incident trust root or use a migration escape hatch. Resolving such legacy history requires a separately reviewed design. Public-network provisioning, transactions and deployment still require separate approval.

Automated payment-core acceptance checks are now satisfied, including retained exact balances and real proof repair/rejection. Overall Milestone 1 acceptance remains incomplete while the stated consensus/resource review is outstanding. UI, worker, AI extraction and testnet demonstration remain outside this milestone.
