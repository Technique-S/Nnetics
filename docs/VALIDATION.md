# Validation record — through 2 November 2026

### Push preparation and read-only checkpoint — 2 November, 15:39 UTC

The user explicitly authorized pushing all recent changes. Publication covers
the persistent/demo contractor source, tests, documentation, setup plans and
the separately prepared synthetic interface audit; it grants no deployment or
payment authority. Prior "local/unpushed" notes below describe their original
execution checkpoints. Local databases, credentials, outboxes, disposable test
keys and generated acceptance artifacts remain ignored and excluded.

Read-only FastNEAR finalized height **275918730**, block
`7i1hawnVpd2kQ5QKd83FHDh5FvR9VQbH414Zrm9zpftt`: original transaction remains
UNKNOWN_TRANSACTION, old key nonce **275527848000002**, balance
**11999868762049999999999999 yoctoNEAR**, factory and customer targets absent.
Validity remains **86400 blocks** and canonical reference hash remains
`GNSR9Np2gfHsUuajUJTk4h7EWJ9xxYbfiVGvCpS47B1y`. **42,669 blocks** remain to
first conservative expired height 275961399. No replacement preparation,
signing or broadcast. Monitor remains active. Full ignored evidence:
`artifacts/local-checks/transaction-watch-1793633962574.json`.

### Scheduled read-only checkpoint — 2 November, 11:58 UTC

Finalized testnet height **275895545**, block
`7LnC1F45gza29TswrmNjikHaoowuGn9o2kPH4ZDtVkFv`: original hash remains
UNKNOWN_TRANSACTION; old FullAccess nonce **275527848000002**, balance
**11999868762049999999999999 yoctoNEAR** and absent factory/customer targets
are unchanged. Protocol 88, validity **86400 blocks** and canonical reference
275874998 hash `GNSR9Np2gfHsUuajUJTk4h7EWJ9xxYbfiVGvCpS47B1y` are unchanged.
**65,854 blocks** remain to first conservative expired height 275961399.
Original outbox preserved; no replacement preparation/signing/broadcast.
Monitor retained with no actionable change. Full ignored local evidence:
`artifacts/local-checks/transaction-watch-1793620698154.json`.

## 2 November — persistent private contractor backend

Implemented actual HTTP/SQLite storage behind existing verified owner identity
and organization authorization. Default `/contractor` uses the persistent adapter;
demo now requires `?mode=demo`. No demo data migration, contract change, transaction
signing, deployment, worker activation, payment or GitHub push occurred. See
[PERSISTENT_CONTRACTOR_PORTAL.md](PERSISTENT_CONTRACTOR_PORTAL.md) for exact use,
authorization, storage, states, parsing and limitations.

### Actually executed locally

| Check | Result |
| --- | --- |
| Node regression suite | **69/69 passed**, including six new backend cases: real Ed25519/NEP-413 verification, replay/expiry/key removal, organization/contractor isolation, immediate revocation, restart, source preservation, wallet changes, linked-owner changes and demo/database separation |
| Production build and TypeScript | Passed, including the nested persistent contractor API route |
| Desktop/mobile regression suite | **42/42 passed** after persistent adapter integration; demo URLs were made explicit |
| Actual app-process restart acceptance | **Passed** via `npm run test:contractor-acceptance`; production Next.js stopped and restarted with the same database files |

The restart run created an authorized contractor profile/link, verified a signed
wallet request, approved its wallet/work order, submitted through its private link
using only work text and requested amount, and rendered the same invoice in the
owner panel. Before/after restart, the profile, approved wallet, immutable order,
original whitespace-preserving text, invoice ID/reference and **Under review**
state persisted in actual HTTP reads and owner/contractor browser views. Retry
returned the same invoice; a different claim on its order failed. A foreign-currency
source remained **Needs clarification**, could not be approved, and subsequent
clarification preserved the original source/reference. Unrelated organization
reads and revoked capabilities were denied. No Paid state or transaction link
was fabricated.

Final restart artifact directory:
`artifacts/contractor-acceptance/1793619889823/` — `result.json` reports passed,
with `owner-before-restart.png`, `owner-after-restart.png`,
`contractor-after-restart.png` and process logs. Its first invoice reference is
`CTR-0001-INV-0001`, status Under review, transaction URL null.
The harness uses disposable wallet keys and a controlled HTTPS RPC upstream;
actual SQLite, HTTP, application process, browser views and cryptographic checks
are exercised. **Real Meteor extension/public-testnet contractor acceptance was
not executed**, and no real user message signature was requested. Earlier real
two-wallet owner acceptance is preserved separately.

Initial failures, corrected: Node strip-only execution rejected new TypeScript
parameter properties (replaced with explicit fields); one test accidentally reused
an idempotency key for a different order (the guard correctly rejected it; fixed
fixture key); the first two restart harness attempts reused an owner browser with
stale verification state after focus/restart. The harness now closes that owner
context and establishes a fresh signed owner session after restart, preserving the
existing logout/session guards. These attempts are not counted as passing runs.

**Extraction: deterministic labeled parsing only. No AI provider, AI extraction,
OCR or mocked AI output.** Live billing work orders remain off-chain records;
contract work-order linkage, live payment evidence reconciliation and production
deployment/security acceptance remain incomplete. No persistent API can mark an
invoice Paid or initiate a transfer. Payment execution and provisioning gates
remain unchanged; local passing tests do not complete Milestone 1.

### Separate deployment reconciliation

Read-only FastNEAR checkpoint at approximately 11:38 UTC: finalized height
**275893381**, block `79eb2r7bnhd7PMkKLRXZjoepdErLcMr76XHzmkRGVrxJ`.
Original infrastructure hash remains UNKNOWN_TRANSACTION; old key nonce
275527848000002 and balance 11999868762049999999999999 yoctoNEAR are unchanged.
Factory/customer targets remain absent; validity is still 86400 blocks. First
conservative expired height remains **275961399** (68,018 blocks away). Original
outbox/conditional approvals and recurring read-only monitor remain intact.
No replacement was prepared, signed or broadcast. Full ignored evidence:
`artifacts/local-checks/transaction-watch-1793619501028.json`.

### Scheduled read-only checkpoint — 2 November, 11:14 UTC

Finalized testnet height **275890945**, block
`51pR6SCmEZaG6r5aMbjGRLcxTFcYH2QK4UCJj2tibbQG`: original hash still
UNKNOWN_TRANSACTION; old FullAccess key nonce **275527848000002** and balance
**11999868762049999999999999 yoctoNEAR** unchanged. Factory and customer target
remain absent. Protocol 88, validity **86400 blocks** and canonical reference
hash `GNSR9Np2gfHsUuajUJTk4h7EWJ9xxYbfiVGvCpS47B1y` at 275874998 are unchanged.
**70,454 blocks** remain to first conservative expired height 275961399.
Original outbox preserved; no replacement preparation, signing or broadcast.
Monitor retained with no actionable change. Full ignored local evidence:
`artifacts/local-checks/transaction-watch-1793618092851.json`.

## 2 November — automatic invoice references and fixed testnet currency

Contractor and owner-entered invoice forms no longer request an invoice number.
Successful server submission allocates a durable contractor-specific sequence
and stores the invoice/reference/idempotency claim atomically. Exact retries
return the saved record; changed payloads under an existing submission key fail,
and different submissions cannot claim the same approved work order. Clarification
preserves the invoice ID/reference. Owner entry applies the same allocator in its
authorized organization queue (live) or isolated persistent demo queue (mock).
Saved references appear through existing invoice/detail/history rendering.

Both forms display **Currency: NEAR · Testnet**. Server submission enforces NEAR
and rejects recognized conflicting source currencies before persisting an invoice;
the contractor preview flags the conflict instead of presenting the amount as
converted NEAR. No conversion, contract change, deployment, signing, payment or
GitHub push occurred. The original deployment outbox and reconciliation gate are
unchanged; earlier real-wallet acceptance evidence is preserved.

Actually executed locally: **63/63 Node tests passed**, including four new cases
for permanent/idempotent sequences, source-currency rejection, restart behavior
and independent concurrent SQLite writers. The first expanded Node run exposed
a constructor WAL lock race; installing `busy_timeout` before WAL setup fixed it.
The final production build and its TypeScript check passed. An earlier build
failed on unbranded account/amount values in the new test fixture; fixture values
now use the existing validated constructors.

A subsequent expansion of recognized currency codes initially matched ordinary
lowercase words such as “all” as ISO codes (**55/63 Node tests passed**). ISO codes
now require uppercase outside explicit currency/amount labels, while common
unambiguous codes and currency names remain case-insensitive. Ordinary invoice
prose is retained in the regression fixture; the corrected Node run passed **63/63**.

Initial browser run: **38/42 passed**. New currency tests needed to bring the
contractor tab to the foreground/wait for the approved work order and locate the
owner error inside the active dialog. Those test synchronization/locator fixes
are in place; the final full rerun passed **42/42 desktop/mobile browser tests**.
After broadening currency-code coverage and correcting the persistence banner,
the follow-up full run passed **41/42**: the desktop isolation test read the first
contractor's still-displayed link before the second link response completed.
The test now waits for a different link and asserts “Hello, Designer.” before
checking that contractor's empty records. No authorization guard was changed.
The corrected full invite/review/isolation journey then passed **2/2 targeted
desktop/mobile executions**. Thus all 42 browser scenarios have executed
successfully; the last full invocation was 41/42 followed by that 2/2 rerun,
not a claimed fresh 42/42 invocation. The final build/typecheck and Node 63/63
results above are for the final application source. Manual browser inspection
confirmed the removed reference input, automatic-reference explanation and fixed
currency label; screenshot: `artifacts/contractor-auto-reference-preview.png`.
These are mock/local integration results, not real-wallet or payment acceptance.

### Scheduled read-only checkpoint — 2 November, 10:38 UTC

Finalized testnet height **275887114**, block
`HKdE8CF4xnR6R2qPXXma8vksSwQthKjEqtEUJf55g7AM`: original hash remains
UNKNOWN_TRANSACTION; old FullAccess nonce **275527848000002**, owner balance
**11999868762049999999999999 yoctoNEAR**, and absent factory/customer targets
are unchanged. Protocol 88 still reports validity **86400 blocks**, and reference
275874998 retains canonical hash `GNSR9Np2gfHsUuajUJTk4h7EWJ9xxYbfiVGvCpS47B1y`.
**74,285 blocks** remain to first conservative expired height 275961399.
Original outbox preserved; no replacement prepared, signed or broadcast.
Monitor retained; no actionable change. Full ignored local evidence:
`artifacts/local-checks/transaction-watch-1793615899116.json`.

### User-requested read-only checkpoint — 2 November, 10:27 UTC

Finalized testnet height **275885969**, block
`EkaCen8fmZjanahbQVo4GqscxB6JaaXPqZtc9kjykEYN`: original transaction
still UNKNOWN_TRANSACTION; old key nonce **275527848000002** and owner balance
**11999868762049999999999999 yoctoNEAR** unchanged. Factory and customer target
both remain absent. Protocol 88, validity 86400 and canonical reference hash
remain unchanged. **75,430 blocks** remain to first conservative expired height
275961399. No replacement preparation/signing/broadcast; original outbox retained.
Full ignored local evidence:
`artifacts/local-checks/transaction-watch-1793615232595.json`.

### Scheduled read-only checkpoint — 2 November, 10:07 UTC

FastNEAR testnet finalized height **275884057**, block
`GGJun5Tz6ywkTtGpCFLwWVU8m7j8aWEBCiNXqgHUY2Fq`, still precedes
the first conservative expired height **275961399** (77,342 blocks remain).
Protocol 88 still reports transaction validity **86400 blocks**; canonical
reference height 275874998 still hashes to
`GNSR9Np2gfHsUuajUJTk4h7EWJ9xxYbfiVGvCpS47B1y`.
Original transaction remains UNKNOWN_TRANSACTION. At that same finalized block,
the old FullAccess key nonce remains **275527848000002**, Grandtheft's balance
remains **11999868762049999999999999 yoctoNEAR**, and both factory and customer
vault remain absent. No replacement preparation, signing or broadcast occurred;
the original outbox is preserved. Monitor remains active with no actionable
change. Full local RPC evidence:
`artifacts/local-checks/transaction-watch-1793614035755.json` (ignored).

## 2 November — contractor mock portal, separate from live acceptance

The user explicitly authorized this mock implementation while the original
infrastructure transaction stays under read-only monitoring. The new portal is
available at `/demo/contractors` for demo owners and private `/contractor#…`
capabilities for contractors, with typed HTTP mock adapters and a separate
durable SQLite store. All screens label simulated data and simulated wallet
proof. No real wallet receives synthetic records. No chain client/signer or
payment/deployment method exists in this adapter/API. Contract code/interface,
live owner/organization guards and approved transaction plans are unchanged.

Implemented and exercised: owner-created profiles/private links; initial
simulated wallet request and owner approval; immutable approved work orders;
text-first bills, bounded TXT/PDF/PNG/JPEG attachments, formatted preview and
missing-detail clarification; mismatch review without rule overrides; contractor
invoice/status views; owner-requested clarification and corrected resubmission;
owner-approved wallet changes affecting only future orders; link replacement /
revocation invalidating sessions and pending wallet approvals. Binary uploads
are attachment-only; no OCR/AI or live contractor proof was added. See
[CONTRACTOR_PORTAL.md](CONTRACTOR_PORTAL.md) for limits and reproduction.

### Actually executed locally on Windows

| Check | Final result |
| --- | --- |
| Owner application `npm test` | **59 passed, zero failures**: prior 49 plus 10 contractor domain/security cases |
| Type checking / production build | Passed; final build emitted no tracing warning |
| Full desktop/mobile `npm run test:browser` | **38 passed, zero failures**, including 10 new contractor executions and prior 28 owner/onboarding cases |
| Domain restart/duplicate/isolation tests | Executed: durable invoice claims and revocation survive SQLite restart; unrelated owners/contractors denied |
| Browser race / access tests | Executed: concurrent submissions yield exactly one accepted invoice; invalid fragment changes and delayed old responses cannot revive access |
| Live flags | `NNETICS_PROVISIONING_ENABLED` and `NNETICS_TRANSACTIONS_AUTHORIZED` remain disabled |

Initial targeted browser run: **4/8 passed**. Two failures per viewport exposed
an unhandled same-page URL-fragment invitation switch and a test locator collision
with Next's route announcer. The switch now clears/fences private state before
exchange, and failed exchanges invalidate prior server sessions; the locator was
scoped to the actual error. The next full run passed **36/38**, exposing a loading
state that never completed when revoked access incremented the response
generation during initial refresh. The error path now explicitly exits loading
and remains denied. A delayed-snapshot regression was added. The final full
**38/38** run passed after that fix. These failures were not suppressed or counted
as passing attempts. The initial build's broad filesystem-tracing warning was
resolved by the same explicit dynamic-path tracing annotation used elsewhere.

The paid-history link case is a controlled display fixture with an allowlisted
testnet explorer URL, clearly labeled simulated; it is **not** a real transaction
or payout result. New submitted demo invoices have no transaction. All real
contractor signatures, live payment reconciliation and production invitation
deployment remain **unimplemented/unverified**. Prior real two-wallet owner
checks are preserved, not rerun or replaced by mock results. No Rust changes or
new Rust/Linux executions were needed for this portal; `c655800` CI results below
remain historical evidence for those exact contract artifacts only. Passing these
tests is not independent security review and does not complete Milestone 1 or
live onboarding.

The existing `nnetics-transaction-expiry` heartbeat was inspected and retained.
An additional read-only checkpoint while the browser suite ran returned finalized
height **275883550**, block `DQzqwPEbYxHFo2DtT3RnNYDMbsHVqdXgMtkJQEnkJqLH`,
and UNKNOWN_TRANSACTION for the original recorded hash. It is below the expiry
gate. No signing, deployment, top-up, payment, authority change or GitHub push
occurred. Portal source, tests and documentation remain local/unpushed.

## 2 November — funded, Meteor verified, factory wallet policy blocked

**Read-only watch requested and scheduled:** the user instructed continued
checks until confirmation or conclusive expiry, then continuation under existing
conditional approvals. A thread heartbeat `nnetics-transaction-expiry` is ACTIVE,
every 30 minutes, quiet while the state is unchanged; it surfaces confirmation,
expiry, failure or required user action and pauses after conclusive resolution
and resumed reconciliation. It does not authorize extra transactions or bypass
the owner-run signing handoff.

Latest read-only checkpoint: finalized height **275880026**, block
`Dkpdkn7L4DmLzSmZsCLR4J6JYjxuowkh3QU6Rk6wgqdp`, timestamp
`1793611699405285506` ns. Original hash remains UNKNOWN_TRANSACTION; old key nonce
275527848000002, owner balance 11.999868762049999999999999 NEAR and absent factory
are unchanged. Canonical block 275874998 returned hash
`GNSR9Np2gfHsUuajUJTk4h7EWJ9xxYbfiVGvCpS47B1y`, timestamp
`1793608767828873875` ns. Across 5028 blocks the observed mean is
**0.5830502012 seconds/block**. There are **81373 blocks** to the first conservative
expired height **275961399**. Estimated remaining wait: **13h 10m 45s**, suggesting
**2 November around 23:39 WAT (Africa/Lagos)**. This is an observed-rate estimate,
not a clock-time expiry guarantee. Finalized height strictly greater than
275961398 and the subsequent hash/nonce/balance/target/reference/validity checks
remain authoritative. No signature or submission occurred in this checkpoint.

**CLI follow-up:** user confirmed Grandtheft is available in the local CLI.
The user subsequently **approved the conditional CLI amendment** digest below.
Post-approval finalized height **275876528**, block
`6tVfCF8EUkbb7aqWC9E2g2M6y3hHmhxtubBC7D3Hyq6i`, still precedes the expiry gate;
old key nonce 275527848000002 and balance 11.999868762049999999999999 NEAR are
unchanged, factory absent. Both approved JSON digests were recomputed successfully.
No replacement was signed or submitted. Approval is retained, but does not waive
conclusive-resolution/expiry conditions. No further approval is needed for the
same exact amendment once those conditions are satisfied.

Read-only official CLI help and secure-keychain public-key lookup returned
`ed25519:6vkGFeDZ2Z8M6mfubE4mYQpdr2d3M7eULrHWuonseBhZ`; no secret export or
signing occurred. This differs from the Meteor proof key. A separate
[owner-run handoff amendment](CLI_FACTORY_HANDOFF_PLAN.md), digest
`bca85c64ac11e4a0a14808d290980c47db89353fa2450930f34022291cc91ae8`, preserves
the exact original action list but changes infrastructure key-control proof to
verified CLI signing. It requires explicit approval and conclusive resolution
before replacement signing. Protocol config reports validity period **86400
blocks**; original reference 275874998 gives a conservative finalized expiry gate
**above 275961398**. Latest observed finalized height 275876027 was below it.
No replacement transaction was prepared/signed. The CLI template has help-checked
action syntax only; full signing/broadcast remains unexecuted.

Finalized preflight height **275873788**, block
`8rDvxVmMwnofRKseBpvybzNV4GrH5qbsEK2y1QoX724Y`, confirmed:
Babygoat **9.878461305613026399999998 NEAR**, Grandtheft
**11.999868762049999999999999 NEAR**. Grandtheft alone covers the unchanged
approved plan's **11.6346437084553175 NEAR** combined upfront requirement.
The separate Babygoat-to-Grandtheft transfer proposal is unnecessary and was
**not executed**. Both targets remain absent; testnet protocol 88 / nearcore
2.14.0-rc.5 and all relevant observed fee/storage parameters match the plan.
The older official RPC returned a deprecation/-429 error, so reads used the
already configured FastNEAR endpoint. No application RPC code was changed.

The local app was restarted. The first fresh Meteor message was not verified
because the server's restricted process could not reach RPC. A read-only Node
probe with network access passed, and the server was restarted with that access.
No signature check or authentication rule was weakened. A new user-approved
NEP-413 message **successfully authenticated Grandtheft** with FullAccess key
`ed25519:4zTXZ9GfZztRiT3QazNKF9aoKYnxfpxwTKbh6A2L8qZX`.
The real UI returned only Grandtheft workspace with zero invoices, contractors
and payments and no linked vault. Previous two-wallet isolation results remain
preserved; no new reverse-switch test is claimed in this continuation.

The existing application bridge handles only the bounded small customer call.
A separate local, exact-plan factory review tool was added at
`apps/owner/scripts/factory-wallet-review.mjs`. It is not a generic payment or
organization authorization path: pinned digest/artifact/signer/three actions,
fresh verified public identity metadata, finalized key/network/funding/fee/target
preflight, localhost-only review, exact origin/body checks and an exclusive fsynced
outbox before the wallet request; no server signing/broadcasting or key export.
Syntax check and actual **read-only live preflight** passed at height 275874557.
These do not establish independent security review or successful wallet support.
No contract source changed; no new Linux CI was run for this local tool.

The tool prepared exactly the approved CreateAccount / 6.3324 NEAR Transfer /
pinned DeployContract transaction, receiver `v.grandtheft.testnet`:

- Original transaction hash: `HafBR1uMZJFfN3U1v7x72s1LQiFCDkPoE6KqS5dhBSyk`.
- Nonce: `275527848000003`; prepared against finalized height **275874998**.
- Exact bytes/hash/public key are retained in ignored local artifact
  `artifacts/live/approved-factory-infrastructure.json`; never replace/delete it
  merely to obtain a fresh nonce.
- The user reported Meteor's **Contract deployment blocked** protection: apps
  cannot submit this DeployContract action. This is a real wallet-policy failure,
  not a contract rejection or gas/storage failure. The review UI timed out without
  an authoritative success response. Its server was stopped; do not retry this
  unsupported deployment through the app or disable the wallet protection.

The first FINAL lookup timed out. A subsequent `tx` lookup with `wait_until:NONE`
returned **UNKNOWN_TRANSACTION**. At finalized height **275875473**, block
`3bc5MnKeS64uTyW1qJtVZewnq7F1SzeRknsELZvZp5ou`, Grandtheft's balance is still
`11999868762049999999999999` yoctoNEAR, key nonce still `275527848000002`, and
factory is absent. **Observed on-chain cost: zero** at that checkpoint. This is
not a finalized failed transaction/refund, nor proof that a not-yet-expired signed
transaction could never arrive later. Unknown outcome remains blocked; no fresh
transaction was generated or submitted. An owner-run CLI path must reconcile or
reuse the original exact transaction, or conclusively establish expiry before
preparing any replacement. No CLI signing was attempted. Installed official CLI
version was read-only confirmed as **near-cli-rs 0.30.1**; the user's available
Grandtheft CLI public key still needs confirmation. Never request private keys
or seed phrases. A changed signing-key/proof condition requires explicit review.

| Area | Actual status |
| --- | --- |
| CI | `c655800` core/provisioning protocols 86/88 and owner passes preserved |
| Funding / approved action scope | Passed; no consolidation transfer needed |
| Current real Meteor identity | Grandtheft login passed; its saved empty workspace returned |
| Factory deployment | Wallet-policy blocked; unknown hash, absent target, no observed cost |
| Customer provisioning / owner verification / linking | Not executed; factory absent |
| Live refresh/resume / interruption recovery | Not passed; infrastructure outbox preserved, no fresh retry; customer recovery still unexecuted |

There is **no confirmed deployment transaction link**. The
[attempted hash lookup](https://testnet.nearblocks.io/txns/HafBR1uMZJFfN3U1v7x72s1LQiFCDkPoE6KqS5dhBSyk)
is an unknown attempt, not execution evidence. No worker activation, checkpoint,
payment, unpause or GitHub push occurred. All documentation and the local review
tool remain unpushed. Milestone 1 and full onboarding remain incomplete.

## 1 November 2026 — funded continuation preflight, no execution

**Existing-balance alternative:** after the user reported an unresponsive faucet,
the two owner wallets were queried together at finalized height 275771829, block
`2ruRBWBX33LPpjuVzLeKqFPEcR9M4rtjbb9Uzod8A1CU`. Babygoat has
`5878461305613026399999998` yoctoNEAR; Grandtheft remains at
`6999868762049999999999999`. Combined liquid funds suffice. A separate
[unsigned 4.64-NEAR transfer proposal](EXISTING_BALANCE_TOPUP_PLAN.md) would move
funds only from Babygoat's owner wallet to Grandtheft, with at most 0.00025 NEAR
upfront fee allowance. It would leave Babygoat about 1.2382 NEAR and fund the
unchanged provisioning plan. Digest:
`00cf57533b4c52f4401c664881e4107594d579c827ea55f359ef257f0f7aea9e`.
It requires **separate approval** because the original approval excluded top-ups.
No transfer has executed. This does not resolve the current browser debugger /
fresh Meteor proof blocker. No working application/contract code changes.

The user reported funding and instructed execution within approved plan digest
`0f569790060daca8ffb0f51a8aebd9c5ae80b94e1cde253ec1db32f99cabfa6a`.
The digest and both local artifact SHA-256 hashes were rechecked and are unchanged.
No working application or contract code was changed.

FastNEAR finalized height **275771283**, block
`7doapANajxEB95Rrhcx74E5rngcyy1axJhJVzmnbghXP`, reported testnet protocol 88,
nearcore `2.14.0-rc.5`, commit
`b7b4737cab46f17a6daa2ed694d7aebbd204363a`. The storage price, block gas price,
minimum receipt purchase price and relevant action fee parameters match the
approved plan. Both proposed factory and vault accounts are absent. Both listed
Grandtheft FullAccess keys remain present (the first key nonce advanced to
`275527848000002`; no inference is made about the purpose of that transaction).

Grandtheft balance is now **6999868762049999999999999** yoctoNEAR
(**6.999868762049999999999999 NEAR**), locked zero, storage 264 bytes. The official
`https://rpc.testnet.near.org` independently confirmed the same amount at finalized
height **275771459**, block
`CHtpjzKqqESeTEdgMhNtwMYGYqMWtiZPQW21yVrQRwQt`.
Required deposits and both upfront fee allowances remain
**11.6346437084553175 NEAR**. The current shortfall is
**4.634774946405317500000001 NEAR** (rounded incoming amount 4.64 NEAR at the
same parameters). No funding transaction was supplied/verified in this continuation.
The user has been asked for its public hash/link or recipient to resolve the
mismatch. Do not assume the reported top-up reached this account.

The local production server was not running; it was restarted on localhost:3100
without a code/build change. Brave inventory was reachable, but opening/binding
the acceptance tab timed out and then returned **Debugger unattached**. Therefore
the current Meteor account/network and fresh wallet-control proof are **not
verified**. No login or transaction-signing request was sent to Meteor.

| Area | Result in this continuation |
| --- | --- |
| CI | Previously confirmed `c655800` owner/core/provisioning passes remain valid; no code change or new rerun |
| Two real-wallet checks | Earlier passes preserved; not represented as fresh execution |
| Plan/artifacts/network/target preflight | Passed; exact approved actions remain unchanged |
| Funding and current Meteor identity | Blocked: insufficient finalized funds and browser debugger unavailable |
| Live provisioning / initialized owner / organization link | Not executed; no new transaction links or deployment costs |
| Live refresh/resume / interruption recovery | Not executed; controlled-test passes remain distinct |

Conditional transaction approval is retained, but its funding and fresh-wallet
conditions must pass before either transaction is signed. No faucet/top-up,
deployment, payment, authority activation or GitHub push occurred. The approved
JSON remains immutable. Live onboarding acceptance and Milestone 1 stay incomplete.

**The integration build passed automated Linux checks on protocols 86 and 88. Milestone 1 and live-payment acceptance remain incomplete.** Independent security review remains open; no audited or production-ready verifier claim is made.

## 31 October — fresh-user provisioning continuation

### Approved receipt-test rerun — `c655800`

Commit `c6558002ee848e909b74ad499560292e4045999f` was pushed with explicit
publication/CI approval. It changes provisioning tests and documentation only;
contract source is unchanged from `07181a0`. Initial status checks failed with
TLS/DNS errors. Connectivity subsequently recovered: all three workflows
completed successfully. No working code was changed to address network failures.

| Executed Linux workflow | Actual result |
| --- | --- |
| [Core](https://github.com/Technique-S/Nnetics/actions/runs/41239039000) | Protocols 86/88 passed; production build and strict Clippy |
| [Provisioning](https://github.com/Technique-S/Nnetics/actions/runs/41239039050) | Per protocol: 39 vault unit, 15 core sandbox, 6 factory unit, **4 provisioning sandbox**, zero failures; production build/Clippy |
| [Owner](https://github.com/Technique-S/Nnetics/actions/runs/41239039001) | Typecheck, **49 Node tests**, production build and **28 browser cases passed** |

Provisioning jobs `124648850647` (88) and `124648850799` (86) explicitly log
39/15/6/4 passing counts and identical production hashes. The corrected exact
funding/refund receipt checks and unchanged duplicate balances **executed and
passed on both protocols**. These are local sandbox and controlled browser/RPC
tests, not real-network provisioning or independent security review.

Retained provisioning artifact IDs: `13057545176` (protocol 88, archive digest
`36fb81e20affdc25a30c4dc1c63b9fc83b2e719371f3a69096ca567aa53c0330`) and
`13057275680` (protocol 86, archive digest
`0da38f643d9a6d12b75cbf2251250b9fc2789d054fa92594b2535f17c7ae5712`).

The earlier successful protocol-88 run's artifacts were downloaded and hashed
locally. Factory: 629144 bytes, SHA-256
`8475786608c34a68317d2ada08cd3dd2e65ff23dc176e2377ac54db5b4f52bbb`;
vault: 427238 bytes, SHA-256
`dc4cf64736110a33cce94531e2e00ba4510bcebbbb240bee6ecdacacf778560f`.
The earlier proposed factory deposit was 6.8324 NEAR, including a discretionary
0.5 NEAR reserve. The [itemized, reduced unsigned plan](FRESH_USER_TESTNET_PLAN.md)
removes that reserve while retaining the 4096-byte storage allowance and fixed
5-NEAR customer deposit. Deposits become **11.3324 NEAR**, with payment funds zero.
The exact-storage boundary has not been newly measured in the VM; further
reductions are not proposed. Contract code and application behavior are unchanged.

### Refreshed funding preflight and separate live acceptance status

Finalized height **275659894**, block
`AHXCpUGBqkpHLJ4gbXyB2ETqCg9oMPTMTFsdAgaNQXEG`: protocol 88;
Grandtheft **9999913398562499999999999** yoctoNEAR, locked zero,
storage 264 bytes; two existing FullAccess keys; `v.grandtheft.testnet` absent.
Storage byte price `10000000000000000000`, block gas price `100000000`, minimum
receipt gas purchase price `1000000000`. Pinned official nearcore commit
`b7b4737cab46f17a6daa2ed694d7aebbd204363a`,
[cost formula](https://github.com/near/nearcore/blob/b7b4737cab46f17a6daa2ed694d7aebbd204363a/runtime/runtime/src/config.rs#L483),
was inspected before calculating upfront allowances. The signer buys receipt gas
at the minimum price even when the block price is lower; do not use 250 Tgas times
block price alone. The account-creation charge is covered within that purchase,
not an extra 0.014 NEAR on top. The pinned verifier's <=770-byte storage exemption
applies to Grandtheft's unchanged 264-byte account.

Combined upfront fee allowance: **0.3022437084553175 NEAR**. Reduced deposits plus
both allowances: **11.6346437084553175 NEAR**. No execution refund credit assumed.
Refreshed shortfall: **1.634730309892817500000001 NEAR**; a rounded incoming
**1.64 testnet NEAR** covers it at these parameters. This is not an actual final
fee claim; final burned/refunded values require execution evidence. The app's
generic 5.1 NEAR minimum does not fully estimate protocol-88 prepaid fees; the
transaction plan uses the larger computed requirement. No application edit was
made; pricing/balance checks must pass immediately before execution.

Machine-readable plan: [FRESH_USER_TESTNET_PLAN.json](FRESH_USER_TESTNET_PLAN.json),
digest `0f569790060daca8ffb0f51a8aebd9c5ae80b94e1cde253ec1db32f99cabfa6a`.
It proposes exactly two testnet transactions, excludes top-up/faucet actions and
requires fresh Meteor proof of one listed on-chain key, funding and explicit
approval before execution. No new signing, deployment or provisioning transaction
has occurred; **no new transaction links exist**.

**Conditional approval received:** the user approved the above digest and its
two transactions, subject to funding, fresh Meteor proof and unchanged preflight.
Top-up/faucet actions remain excluded. A post-approval finalized balance check at
height **275662458**, block `4p1rYsThzY1FDJUnKuR39opKW2oLiGzSGWxx5e28qXmP`,
returned the same `9999913398562499999999999` yoctoNEAR. The account remains
unfunded for the complete plan, so no signing/deployment was attempted. Approval
is retained; no repeat deployment approval is needed if its conditions and exact
plan remain satisfied. A changed price/action/hash/scope requires review.

| Acceptance area | Actual live result |
| --- | --- |
| Two-wallet login / organization isolation / reverse switching | Earlier real Meteor passes preserved; neither identity, organization nor session rules changed |
| Provisioning / finalized owner / link | **Not executed live**; blocked on funding, explicit transaction approval and confirmed signing transport |
| Refresh / interruption recovery of dispatched provisioning | **Not executed live**; controlled tests and sandbox lost-response/duplicate tests passed |
| Cancellation | Controlled browser cases passed; live cancellation during provisioning remains unverified |

After authorization, cancel before signing, then dispatch only one customer create
transaction, interrupt its return and reconcile its recorded hash after fresh
login/refresh. Unknown outcomes stay blocked; do not send an extra duplicate or
fault transaction. Confirm finalized pinned code, no keys, expected owner/state
before the unique organization link. Callback/refund failure recovery, independent
verifier review and bootstrap trust remain unresolved. Payment controls stay
disabled. Full onboarding and Milestone 1 remain incomplete.

### Earlier review and repair — 31 October, approximately 21:00 WAT

Approved fix commit `07181a0174fedf5e16a011723ffa8586a70f3dfc` was pushed.
Replacement runs: [owner](https://github.com/Technique-S/Nnetics/actions/runs/41237147471),
[core](https://github.com/Technique-S/Nnetics/actions/runs/41237147470),
[provisioning](https://github.com/Technique-S/Nnetics/actions/runs/41237147482).
Owner and core workflows passed. The provisioning workflow compiled production
factory WASM, passed strict production Clippy and **six factory unit tests per
runtime**, then executed all four new sandbox cases. **Protocol 88 passed all
four; protocol 86 failed all four** at native-balance equality assertions. The
overall matrix failed; this is not full provisioning acceptance. No signing/deployment approval is implied by
publication approval.

On protocol 86 the initialized vault balance was
`5000022042370816800000000` yoctoNEAR (callback-fault build:
`5000022044197335200000000`) after the 5-NEAR transfer. The failed-init case's
factory changed from `9995409801278984000000000` to
`9996190423024709300000000` yoctoNEAR. NEAR credits contract execution rewards;
the protocol-86 tests incorrectly required balances to exclude them. Protocol 88
passed those original equality assertions; no identical reward behavior is
assumed across runtimes. See the official
[nearcore gas guide](https://near.github.io/nearcore/architecture/how/gas.html).
The local test correction checks successful receipt-linked Transfer actions for
exactly 5 NEAR to the vault/refunded owner, excludes system gas-refund receipts,
checks native balances within a separate sub-0.01-NEAR reward/fee envelope, and
requires a duplicate create request to leave the existing vault balance exactly
unchanged. Failed initialization must still remove the account/code, return a
successful exact 5-NEAR refund receipt, and preserve zero payout accounting.
Rust formatting passed. This correction has **not** run in Linux yet and requires
another approved push. Factory contract source is unchanged from `07181a0`.
Protocol-88 production artifact SHA-256 hashes from the passed job:
factory `8475786608c34a68317d2ada08cd3dd2e65ff23dc176e2377ac54db5b4f52bbb`;
vault `dc4cf64736110a33cce94531e2e00ba4510bcebbbb240bee6ecdacacf778560f`.
These are not deployment authorization or independent security review.

The completed [payment-core matrix](https://github.com/Technique-S/Nnetics/actions/runs/41216056809)
for `9d557ad` passed on both nearcore 2.13.0 / protocol 86 and 2.14.0-rc.5 /
protocol 88: **39 Rust unit tests and 15 sandbox tests per runtime**, production
WASM build and strict Clippy. This includes the three added initializer unit
tests. It does not validate the factory.

The [provisioning matrix](https://github.com/Technique-S/Nnetics/actions/runs/41216056725)
failed on both runtimes during factory host compilation with E0283: redundant
`.into()` on the two generic `Promise::function_call` method-name arguments.
Factory unit tests and the four new provisioning sandbox tests **did not execute**.
The local fix passes string literals directly. The same logs exposed deprecated
unbounded `promise_result`, which would fail production Clippy; it is replaced
with `promise_result_checked(0, 0)`, matching the pinned initializer's empty result.
Unexpected response bytes panic and leave the outcome blocked rather than
confirming creation or sending an incorrect refund. Three additional callback
unit tests were written (six factory tests total). Rust formatting passed; a
local factory test attempt failed in `getrandom` before contract compilation
because Windows `dlltool.exe` was unavailable. No factory pass is claimed.
The compile/callback fix subsequently passed as described above. Only the new
balance/receipt test correction is pending rerun.

**Current real browser observations:** babygoat authenticated, loaded only
`nnetics-studio`, and showed the initialized paused legacy vault owned by
`babygoat.testnet` at finalized block
`6cveB4tXWwVMT9NYUfD7AJwDpDzenMB5CaNBRoNGAkNw`, with no worker/payment funds.
Switch wallet immediately removed private records and required a fresh proof.
After the user approved Meteor, grandtheft returned only to Grandtheft workspace,
with zero invoices/contractors/payments and no fabricated vault balance. Its
request for `/api/live/snapshot?organization=nnetics-studio` was denied.
Navigating away cleared access; fresh user-approved verification restored its
saved organization. The original fresh-empty account and organization creation
remain the earlier real-wallet checkpoint, not newly
executed cases in this review. No new fresh identity was manufactured.
The reverse switch was then re-executed: user-approved babygoat login recovered
only nnetics-studio, and its request for Grandtheft organization
`e3600323-ad40-43c4-a31d-7d53abc4833e` was denied. Its finalized legacy-vault read
used block `EeXq7is4iSvgA6Byn7QRXnRApbo2hcs2pLzRm3XM26J4`.
Selecting Grandtheft workspace exposed the real Create vault review screen.
Clicking Create vault returned: "Create vault is not configured: deploy and
review the factory and vault artifacts first. No transaction was requested."
The organization stayed unprovisioned and payment controls remained unavailable.

Read-only finalized preflight at height **275646175**, block
`HaQgYN4Jx5DtCUPGxZfDkagduLm7M8ALsrZYzuVmKSBN`: testnet protocol 88,
storage byte price `10000000000000000000` yoctoNEAR;
grandtheft balance `9999913398562499999999999` yoctoNEAR and two FullAccess
keys; proposed infrastructure candidate `v.grandtheft.testnet` absent.
This is a candidate, not an approved funder/key/deployment plan. An exact
funding amount and approval digest require the successfully tested factory WASM.
No signing, deployment or provisioning transaction was executed; there are no
new transaction links. Factory callback/refund failure recovery remains blocked.
Real cancellation/interruption/no-duplicate vault acceptance is still unverified;
the passing Node/browser cases use controlled RPC/wallet responses.

**Follow-up Linux owner result:** approved commit
`9d557adef4dcbbba5bbdc77a1e544b79c804e675` was pushed. Its
[owner workflow](https://github.com/Technique-S/Nnetics/actions/runs/41216056691)
passed type checking, 49 Node tests, the production build and all 28 desktop/mobile
browser cases, including both previously failing cancellation cases.
The preceding Rust runs were cancelled by workflow concurrency after the push;
they are not passing results. Replacement
[payment-core](https://github.com/Technique-S/Nnetics/actions/runs/41216056809) and
[provisioning](https://github.com/Technique-S/Nnetics/actions/runs/41216056725)
protocol-86/88 matrices were still in progress at that checkpoint; the completed
results and factory failure are recorded above. This result update
is local until a subsequent approved publication. No deployment was performed.

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

**Initial pre-CI checkpoint (superseded above):** three additional vault unit tests,
three factory unit tests and four provisioning sandbox tests were written.
Native Windows WASM build attempts
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
