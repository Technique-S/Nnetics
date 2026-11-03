# Nnetics hosted MVP preparation

Prepared 3 November 2026 (Africa/Lagos). **Not deployed. No push, paid hosting
resource, database upload, wallet signature or payment is authorized by this file.**
The existing one-payment acceptance is complete; its transaction evidence stays
unchanged. Independent contract security review has not occurred. The prior
review exception was limited to that consumed testnet payment, not future payouts.

## Recommended service and budget

Use one **Render native Node web service**, Frankfurt, `0.5c-512mb` (0.5 CPU / 512 MB),
Node **24.22.1**, and a **1 GB persistent disk mounted at `/var/data`**. Deploy
from the repository root using `render.yaml`; leave automatic deploys and previews
off. Native Node avoids introducing a container build requirement. Existing package
versions and npm lockfile are retained; this is not a database/contract rewrite.

| Item | Monthly USD estimate |
| --- | ---: |
| Hobby workspace | $0 |
| One 0.5c-512mb web service | $7 |
| 1 GB persistent disk | $0.25 |
| Payment worker | $0: not provisioned or running |
| Render subdomain and managed TLS | $0 |
| Base estimate | **$7.25/month**, before tax/overages |

The 512 MB tier passed the bounded Linux workload below. The 1c-2g alternative is
$25/month plus the same disk, **$25.25/month**, an $18/month increase. Start with the
smaller tier for this three-contractor testnet MVP, monitor actual Render memory,
and require a separate approved upgrade if sustained usage exceeds 70% or an OOM
occurs. This is not a long-term capacity guarantee. Off-provider encrypted backups,
optional future domain registration, traffic and build-minute overages are extra.
No paid RPC, AI service, custom domain or paid workspace upgrade is required. Confirm
the actual Render checkout; these USD amounts exclude taxes/overages.

Official sources checked on 3 November 2026:
[pricing](https://render.com/pricing),
[compute names/specifications](https://render.com/docs/compute-plans),
[Render's $25-per-1c-2g example](https://render.com/articles/fly-io-vs-vercel),
[persistent disks](https://render.com/docs/disks),
[TLS](https://render.com/docs/tls),
[SSH and file transfer](https://render.com/docs/ssh),
[Blueprint fields](https://render.com/docs/blueprint-spec),
[Node version configuration](https://render.com/docs/node-version), and
[Node 24.22.1 security release](https://nodejs.org/en/blog/release/v24.22.1).
The text-rendered live pricing page omitted its detailed compute table; the
official article corroborates $25, while the smaller alternative remains a
checkout-confirmed estimate. Disk pricing is $0.25/GB/month. Free services without
a disk are unsuitable for these records.

## Actual runtime/storage requirements

The app is a Next.js 16.4.3 Node server, not a static site or Edge function. Its
Node `node:sqlite` stores use WAL, FULL synchronization and local filesystem
locking. Do not substitute an ephemeral filesystem, shared network filesystem,
read replica, or multiple independently copied queues. No Redis/Postgres migration
is prepared. There are three authoritative files:

| Local source | Hosted destination | Contents |
| --- | --- | --- |
| artifacts/live/grandtheft-payments.db | /var/data/nnetics/live/invoices.db | Durable claims/jobs, paid hash, signed public transaction bytes, audit/registry |
| artifacts/live/identities.db | /var/data/nnetics/live/identities.db | Organizations, vault bindings, provisioning progress and wallet sessions |
| artifacts/live/contractors.db | /var/data/nnetics/live/contractors.db | Profiles, hashed invitations, wallet approvals, work orders, original billing text, uploads, history and queue intents |

Uploads are BLOBs in the contractor database; there is no external upload directory
to lose. Synthetic persistent portal data is separate at
`/var/data/nnetics/demo/contractors.db`; local demo data is not imported. Ordinary
dashboard demo fixtures remain explicitly simulated.

Render's disk can be attached to only one instance/service and only at runtime.
Keep `numInstances: 1`; disk-backed deploys have downtime. Build/pre-deploy commands
cannot import the disk, and a separate Render worker or cron service cannot read
it. The current payment worker needs the SAME local queue and exclusive process
lock, Node 24, its restricted external key file, a reviewed checkpoint, and explicit
transaction authorization. It must stay **stopped with no key uploaded**. Future
hosting of an active worker needs a separately reviewed same-host process design
or durable shared-database migration; simply adding another Render service is wrong.
No owner/factory private keys are required by the web server.

## Configuration

`render.yaml` contains the exact public account IDs, code hash, worker public key,
organization and absolute database paths. The public worker key conveys no signing
capability. `deploy/paid-evidence.json` pins the existing payment, not an owner
allowlist: app authorization still derives current identity/membership/on-chain
ownership. The hosted launcher restricts this initial migration to that verified
workspace; it does not change ordinary wallet login or grant owner permissions.

| Variable | Required hosted value/purpose |
| --- | --- |
| NODE_VERSION | 24.22.1; pinned security patch, Linux runtime check passed; final release checks required |
| NODE_ENV / NEXT_TELEMETRY_DISABLED | production / 1 |
| PORT | Supplied by Render; launcher binds 0.0.0.0 on that port |
| NNETICS_HOSTED_MAINTENANCE | **1 initially**; change to 0 only after import/preflight/approval |
| NNETICS_APP_ORIGIN | Exact allocated `https://HOST` origin, no trailing slash/path; the only Blueprint prompt |
| NNETICS_NETWORK | testnet |
| NNETICS_ORGANIZATION_ID | e3600323-ad40-43c4-a31d-7d53abc4833e |
| NNETICS_VAULT_ID | v-848e8ad68232ad34834d145f81c1641e899926aa.v.grandtheft.testnet |
| NNETICS_EXPECTED_CODE_HASH | Fpxm2eovD9cdo5ik6yZURyQEWTbruj6GKJi2XA6UBArJ |
| NNETICS_WORKER_ID | worker.grandtheft.testnet |
| NNETICS_WORKER_PUBLIC_KEY | ed25519:J9yFAtkpdgsJ2E3N3MANFFHQf3k9DNkXsBhsJUotHfFA |
| NNETICS_RPC_URL | https://test.rpc.fastnear.com |
| NNETICS_DATABASE / IDENTITY_DATABASE / CONTRACTOR_DATABASE | The three absolute paths above; full names begin NNETICS_ |
| NNETICS_DEMO_PORTAL_DB | /var/data/nnetics/demo/contractors.db |
| NNETICS_VENDOR_IDS / NNETICS_ORDER_IDS | babygoat-acceptance / ACCEPTANCE-001; discovery hints only |
| NNETICS_TRANSACTIONS_AUTHORIZED | Empty; hosted launcher rejects any nonempty value |
| NNETICS_PROVISIONING_ENABLED | Empty; new chain provisioning remains disabled |

Keep `NNETICS_WORKER_KEY_FILE`, `NNETICS_SETUP_KEY_FILE`,
`NNETICS_SETUP_KEYCHAIN_CLI`, `NNETICS_DEPLOYMENT_APPROVED_PLAN_SHA256` and
`OPENROUTER_API_KEY` absent/empty. The launcher rejects them. Leave factory signing
and deployment settings unconfigured; the existing verified binding is imported.
No AI provider is needed: deterministic extraction remains labeled accordingly.
Never upload `.env.local`, credentials, `.tools`, arbitrary artifacts or whole local
folders to the repository or public static files. No NEXT_PUBLIC_ credentials.

Build: `cd apps/owner && npm ci --include=dev && npm run build`. Build-time
TypeScript/types are needed even with NODE_ENV=production; do not omit development
dependencies before compilation. No npm dependency version changes are prepared.
Start: `node deploy/start.mjs` from repository root. The launcher validates HTTPS,
testnet, exact pins, persistent paths, an actual Linux /var/data mount and disabled
signing/provisioning flags. In
maintenance it serves health=200 and everything else=503, without loading Next,
wallet auth, private data or a worker. In app mode it requires the imported files
and provenance manifest, verifies the unchanged single Paid job and fresh chain
code/owner/no-keys/paused/revoked/Paid evidence, then starts only Next. A mismatch
or RPC outage at boot prevents startup; it never enables or repairs anything.
`/api/health` is liveness, not a claim that RPC, payment eligibility or private data
access currently works. Runtime RPC failures retain bounded sessions and deny
sensitive access, as described in SESSION_SECURITY.md.

## HTTPS, sessions and wallet URLs

Use only the allocated onrender.com HTTPS address for the initial rollout. A custom
domain can follow in a separate configuration change. Render terminates TLS and redirects HTTP to HTTPS. Internal
HTTP to the Node process is expected. Configure the HTTPS origin explicitly;
never infer it from arbitrary Host/X-Forwarded-Host headers. Do not add a CDN cache
to `/api/*` or contractor/private pages. APIs send no-store; preserve the existing
CSP, no-referrer and frame restrictions. HSTS/edge header behavior must be checked
on the actual domain before acceptance; no preload/subdomain commitment is made.

Wallet identity cookies are HttpOnly, Secure on this configured HTTPS origin,
SameSite=Strict, Path=/api/live and persistent until the original five-hour
deadline. There is no early idle expiry or focus-triggered signature. Silent
checks cannot extend five hours. Local cookies/proofs are not reusable at the
hosted origin. Migration deliberately clears sessions/challenges in the COPIES,
without changing original local sessions or billing records. Subsequent hosted
restarts preserve valid hosted sessions in SQLite. Meteor's passive-switch
limitation and displayed signed-in identity remain unchanged; permissions never
follow wallet selection silently.

| Purpose | URL / configuration |
| --- | --- |
| Owner entry | https://HOST/ |
| Contractor entry | https://HOST/contractor#PRIVATE_TOKEN |
| NEP-413 recipient (owner and contractor) | https://HOST exactly |
| Sign-in verification API | POST https://HOST/api/live/login; same-origin JSON only |
| Liveness | https://HOST/api/health |

Meteor's current injected message flow returns a response to the page. It has **no
OAuth redirect/callback route to register**, and no new callback endpoint is
invented. The user may need to allow the extension on the hosted site through its
normal wallet UI. A future redirect wallet needs its own reviewed callback setup.
Do not activate Nightly/financial methods as part of hosting. Existing invitation
tokens remain hashed and valid until expiry/revocation; change only the origin of
an existing link privately, or let its owner create a replacement and revoke the
old one. Do not publish tokens, log URL fragments or put them in a deployment file.

## Private migration, backup and recovery

The prepared tool is `deploy/snapshot.mjs`. It uses SQLite VACUUM INTO to include
committed WAL contents, integrity-checks each database, clears login/proof sessions
in the copies, pins the unchanged Paid payload/signed-byte hashes, includes an
allowlist of payment receipt reports, writes checksums, and atomically installs a
new directory. It refuses overwrite, incomplete stores, unexpected manifest paths,
checksum mismatch and changed payment evidence. It does not sign or broadcast.
Do **not** copy a running `.db` alone, discard its WAL, rebuild the queue from
invoice numbers, or mark a job queued to make a migration succeed.

All three stores must represent the same cutover. **Stop EVERY local app instance
and worker writing these databases before exporting**; a per-file online backup is
not a cross-database transaction. `--quiesced` is an operator assertion, not a way
for the tool to stop processes. Do not assert it while another tab/server or worker
is writing. This real export is deferred until a coordinated cutover; fixture
export/restore has been exercised locally. Keep the local originals untouched.

From the local repo root, with every writer stopped:

```powershell
node deploy/snapshot.mjs export artifacts/live artifacts/hosting-cutover-YYYYMMDD --quiesced
Get-FileHash artifacts/hosting-cutover-YYYYMMDD/manifest.json -Algorithm SHA256
```

The bundle is **private application data**. Transfer it over authenticated SSH/SFTP
to a temporary private location on the RUNNING maintenance service (not an
ephemeral shell/one-off instance, which cannot access its disk); compare the manifest
SHA256 out of band to the local value before restoring. Checksums detect corruption,
not an attacker who can replace the bundle AND manifest. Use Render's current
service-specific SSH/SFTP connection details; its exact host/service ID is unknown
until creation. Do not embed a token/password or use a public download URL.

In that maintenance service's repository-root shell:

```sh
node deploy/snapshot.mjs restore /PRIVATE/UPLOADED/BUNDLE /var/data/nnetics/live --quiesced
node deploy/preflight.mjs
```

Review the returned pins and manifest, then set maintenance=0 and restart only
after hosted deployment is authorized. A failed import leaves a staging directory
and never overwrites a live directory. Investigate failure; do not weaken the
checks. Retain the encrypted local bundle and selected payment receipts off-host.
Restrict filesystem/backup access to operators; private billing text can contain
personal data. Unix files use 0600/directories 0700; on Windows also enforce private
NTFS ACLs or an encrypted user-controlled location (Unix modes are insufficient).

For later application backups: enter maintenance, ensure Next and every worker
has stopped, then run `node deploy/snapshot.mjs backup /var/data/nnetics/live
/var/data/nnetics/backups/NEW_UNIQUE_NAME --quiesced` on ONE shell line. Export an
encrypted copy off-provider daily and before deploys, keep seven daily copies plus
the pre-deploy copy, and alert on failed backups or disk >70%. Automation/off-site
credentials are not configured yet. Render's daily disk snapshots are supplemental;
do not rely on a filesystem snapshot alone for SQLite/cross-store recovery. Aim
for <=24h recovery point, but this is not achieved until scheduling/off-site restore
checks run. Manual backups require maintenance downtime with the current design.

Recovery is an operator maintenance operation: verify a trusted bundle, preserve
the failed data directory as evidence, restore to a NEW directory and change paths
only in a separately reviewed plan. Never roll back only the payment DB or restore
an older pre-payment queue to regain eligibility. Reconcile with final chain state
before reopening. A code rollback does not roll back the disk; schema compatibility
must be checked. No automatic down-migration/recovery signing is prepared.

## Hosted acceptance checklist (not yet executed)

- [ ] Approve source commit/push, run Linux hosted-readiness CI on pinned Node
  24.22.1, inspect build/dependency results; create only the approved paid service.
- [ ] Verify the actual allocated domain, DNS if custom, TLS/HTTP redirect,
  security headers and exact runtime origin. Maintenance health=200, other paths
  503, no private records visible.
- [ ] Stop local writers, export/transfer a private bundle, compare its manifest,
  restore all three stores, check SQLite integrity and preserved profiles/history,
  queue linkage and immutable INV-0002 original text/order/recipient/amount.
- [ ] Run fresh read-only preflight: pinned code, Grandtheft owner, no vault keys,
  paused=true, agent=null, reserved=0, last_attempt=1, payment Paid for Babygoat.
  This is not a new checkpoint review or authorization for another payment.
- [ ] In an authorized rollout, set maintenance=0. Confirm no worker process,
  no signing key files/env vars and empty transaction/provisioning flags.
- [ ] Grandtheft signs one hosted-origin off-chain login; sees only its records.
  Babygoat's account sees only its authorized workspace/contractor link. Test an
  unrelated account, a viewer, revoked link and wrong-network failure.
- [ ] On both owner/contractor screens, INV-0002 is Paid only after chain evidence
  checks succeed, amount 0.001 NEAR, recipient Babygoat, order ACCEPTANCE-001,
  transaction [6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1](https://testnet.nearblocks.io/txns/6nV9YHQxUWLX6yYcPpTEUHyLxoC1K3UEWguSdFzQefR1).
  Do not create/queue/pay a replacement acceptance bill.
- [ ] Refresh/navigation/tabs/browser restart preserve the original five-hour
  session; explicit logout/expiry revoke it. Temporary RPC outage hides protected
  access without destroying the session. Verified account change clears prior
  records, never transfers permissions; passive Meteor selection remains limited.
- [ ] Restart/redeploy the SAME single instance and verify profiles, uploads,
  statuses and exactly one unchanged Paid job persist. No payment worker is run.
- [ ] Rehearse restore on an isolated private data copy, verify off-site backup
  and monitoring arrangements, and recheck paused/revoked chain state. Record
  actual timestamps/results separately from fixtures before calling it accepted.

## Access/actions needed from the owner

1. A Render account/workspace with billing enabled and confirmation of the
   **approximately $25.25/month plus tax/overages** configuration; no resource has
   been created. Prefer Hobby workspace unless you deliberately choose otherwise.
2. Connect the Render GitHub app to **Technique-S/Nnetics only**, granting source
   read access through Render's normal UI. No password/token/private key in chat.
   The prepared changes are local; authorize an exact reviewed commit push and
   Linux readiness CI before selecting that commit for deployment.
3. Use the actual assigned Render HTTPS address initially; no custom-domain/DNS
   access is needed for this rollout. Confirm that exact origin before wallet tests.
4. Authorize the specific hosted rollout, private record transfer and cutover
   window. Provide operator access through Render's normal scoped account/SSH
   mechanism or perform the supplied commands yourself. Do not share recovery
   phrases or NEAR owner/worker keys; none are needed for hosting.
5. Approve off-chain Meteor login messages on the hosted domain for acceptance.
   Arrange a private encrypted off-site backup destination/operator and schedule.

No approval here includes unpause, worker authorization, key installation, factory
deployment, funding, additional testnet payment or mainnet. Stop on any changed
payment evidence, owner/code/state mismatch, ambiguous transfer outcome or unsafe
storage configuration. Keep maintenance enabled and investigate.


## Actual local preparation results

On 3 November 2026, Windows Node 24.18.0 executed **95/95 backend tests**, including
three new hosting cases: safe environment validation, maintenance HTTP behavior,
and offline SQLite export/restore preservation with session clearing, tamper/path
rejection and overwrite protection. Production build and TypeScript passed using
`node deploy/check-build.mjs`; its separate .next-hosting output preserved the
running app's .next directory. The helper restores Next's generated next-env file.
The official Render JSON Schema validated render.yaml. These are local results,
not a deployed acceptance pass or independent security review.

An initial build failed TypeScript's inferred required evidenceRoot argument; the
optional API annotation was corrected. A subsequent inline node -e build invocation
failed during worker startup because its arguments propagated into NODE_OPTIONS;
the committed file-based/spawn launcher then built successfully. Initial YAML
validation exposed unquoted off values parsed as booleans by YAML 1.1; quoting the
strings made official-schema validation pass. These failures were preparation/tool
issues; no private records or on-chain state were changed to resolve them.

The production dependency audit completed with **10 low, 0 moderate/high/critical**
findings, one root advisory in elliptic propagated through legacy wallet-selector
packages. The offered remediation includes a major-version downgrade; it was not
applied blindly. See [the advisory](https://github.com/advisories/GHSA-848j-6mx2-7j84)
and artifacts/hosting-preparation/dependency-audit.json. Severity counts do not prove
non-exploitability. Existing CSP uses unsafe-inline/unsafe-eval, and application
rate limiting/off-provider automated backups have not been implemented; managed
TLS/DDoS protection is not a substitute for those controls. Treat this as a bounded
testnet MVP, not an independently reviewed production payment service.

Render and Node official documentation identify 24.22.1 as the current security
release. Its official portable-binary download timed out here before checksum
verification, so **no local 24.22.1 execution is claimed**. The prepared
.github/workflows/hosted-readiness.yml runs Node 24.22.1 on Ubuntu 24.04 after an
authorized push/PR or manual dispatch. That exact Linux result, live disk mount,
launcher/SSH import, HTTPS/Meteor acceptance and resource/memory observations are
still unexecuted. Docker/WSL are unavailable locally; neither is required by the
native Render design. No Render account access was available for a service-side
validation. Do not open maintenance mode until those deployment gates pass.

Fresh read-only chain preflight at 2026-11-03T17:05:13.038Z, height 276076842,
verified pinned code, no vault keys, Grandtheft owner, paused=true, agent=null,
spent=0.001, reserved=0, last_attempt=1 and the existing Paid record. A separate
read-only database/evidence check verified the exact single Paid job and seven
selected receipt/report files; no source database was changed by these tools.
Evidence and logs are under artifacts/hosting-preparation/. No real multi-store
export was taken while the local apps remained active; coordinated cutover is
required for a consistent real snapshot. Fixture backups passed, and real source
records and payment evidence were preserved in place. Nothing was pushed, uploaded
to hosting, deployed, signed or paid.


## Pre-rollout checks requested after preparation

The initial rollout uses the **assigned Render HTTPS address**, not a custom domain.
The smallest disk-compatible paid service is 0.5c-512mb, officially listed at $7/month,
plus $0.25 for 1 GB of disk: **$7.25/month**. The proposed 1c-2g configuration is
**$25.25/month** with the same disk: an $18/month difference before taxes/overages.
Current official pricing was checked again on 3 November 2026 at
https://render.com/pricing?trk=article-ssr-frontend-pulse_little-text-block .
A minimum price is not a capacity verdict; keep the current 2 GB Blueprint until
pinned Linux measurements establish whether the smaller tier has headroom.

`deploy/measure.mjs` launches the built production Next server with disposable
synthetic databases and all signing/AI/provisioning settings empty. It exercises
one owner and three contractors, three invoices, three 1 MiB multipart uploads,
four concurrent readers, and duplicate retries. It restarts that same service,
checks existing owner/contractor sessions and invoice records, re-enters an existing
private link, verifies duplicate retries return the same invoice, and verifies
revocation. It never reads real invitation tokens or the live databases. Reported
measurements exclude a browser process. Synthetic session results are not Meteor
wallet acceptance and do not measure live RPC latency.

The executed Windows Node 24.18.0 run reported **197.86 MiB peak process working
set**, 1,288 measured requests and 29 ms p95 request latency over approximately 33
seconds including restart. It is a bounded synthetic result, not a Linux memory
limit, long-term soak or production traffic guarantee. It does not alone qualify
512 MB. The Linux CI workflow now repeats production measurements under Docker
limits of **512 MiB / 0.5 CPU** and **2 GiB / 1 CPU**, with swap disabled, Node
24.22.1, a bind-mounted fixture disk and cgroup peak accounting. It records OOM/exit
status and requires at least 20% cgroup memory headroom for a tier to qualify.
The larger-tier failure fails CI; a smaller-tier failure remains an explicit result
rather than pretending it passed. Only metrics JSON is uploaded, never databases,
logs containing private links, live files or credentials. After authorized push,
inspect those artifacts before selecting the final tier and presenting rollout
approval. No Linux result exists yet for the unpublished commit.

A private, NTFS-ACL-restricted backup was actually captured at
`artifacts/private-hosting/pre-rollout-20261103`, with a separate restore rehearsal.
Both are ignored by Git. The capture method briefly acquires and verifies SQLite
write-exclusion locks on ALL three source stores before copying; source transactions
are rolled back without changing rows. It is an alternative to taking a backup
with every service stopped, not permission to leave two writable deployments after
cutover. Live source-to-restored persistent-table digests, original text, uploads,
authority/queue links and the unchanged Paid job matched. Auth sessions/challenges
were deliberately cleared in copies, as required for a new origin. Backup manifest
SHA256: **16cd29fa4e14fe3700e7637265dc48e41b36620fca8a53cb7aecc80e3b4a5947**.
Run `node deploy/verify-migration.mjs artifacts/live RESTORED_DIRECTORY REPORT_PATH`
for the private content-digest comparison; no raw rows or tokens are printed.

That backup is a rehearsal/rollback asset, not a freeze of future local activity.
At authorized cutover, stop local record writers, make a fresh complete capture,
verify/transfer it privately and compare its fresh manifest; do not open both local
and hosted copies for writes. If data changed after this rehearsal, use the new
snapshot and repeat comparisons. Never publish bundles, SQL dumps or invitation
URLs. Off-provider encrypted backup scheduling still needs an operator/destination.

An actual restart of localhost:3101 preserved the Grandtheft session rows/deadline
and the existing Paid job. The user then confirmed: "it does no wallet signature
was required on refresh." This is **user-confirmed real Meteor service-restart
acceptance**, separate from fixture memory/restart tests. Actual Render disk/service
restart and hosted-origin wallet acceptance still require the approved rollout.

Current local regression checks: **96 backend tests passed**, and the complete
browser suite passed **89 cases, 1 intentionally skipped mobile duplicate**. The
first alternate-port browser run exposed a hardcoded 3100 base URL in contractor
tests; corrected it to respect NNETICS_BROWSER_BASE_URL and reran the full suite.
This was a test setup issue, not a relaxation of currency or access rules. An
initial synthetic upload used invalid PDF bytes and was correctly rejected; the
benchmark now supplies the required PDF header. No application checks were weakened.

### Exact rollback procedure

Prefer a code-only rollback to a previously vetted, schema-compatible release;
the persistent disk is not rolled back with code. Keep worker/signing disabled and
maintenance=1 throughout. If a database restore is required, first retain the whole
current directory and its WAL files privately, verify a trusted post-payment bundle,
and restore into a NEW sibling directory. Never overwrite the live files or restore
only one database. Reconcile any records newer than the backup before reopening.
On the running Linux maintenance service, with every writer stopped, the planned
commands are:

```sh
node deploy/snapshot.mjs rollback /PRIVATE/TRUSTED/BUNDLE /var/data/nnetics/restore-UNIQUE --quiesced
# Check manifest SHA256 out of band, verify expected Paid job, and inspect integrity.
# The next two moves use fixed sibling directories on the same persistent mount.
test ! -e /var/data/nnetics/quarantine-UNIQUE
mv /var/data/nnetics/live /var/data/nnetics/quarantine-UNIQUE
mv /var/data/nnetics/restore-UNIQUE /var/data/nnetics/live
node deploy/preflight.mjs
```

Execute each step only after the preceding step succeeds. If the second move
fails, leave maintenance enabled and move quarantine-UNIQUE back to live only if
live is absent. Do not delete the held directory. The launcher then rechecks the
single Paid job and final chain state before app mode can start. Failure or
ambiguity leaves maintenance on. A restored snapshot clears old sessions, so users
sign in once; ordinary service restarts do not. The local restore rehearsal passed;
these Render rollback moves have not been executed and are not authorization.


## Executed Linux results and final 512 MB candidate

[Hosted readiness run 41712048423](https://github.com/Technique-S/Nnetics/actions/runs/41712048423)
for commit eb3cb7b1607f80dd3e166e8a4921df10af8cbce4 **passed** on Ubuntu with
Node **24.22.1**: 96 backend tests, production build/TypeScript, constrained memory
runs and restart checks. The earlier notes saying Linux was unavailable/pending
are historical preparation stages, superseded by this run after explicit push/CI
approval. No hosted service or payment was created by that approval.

| Resource limit | Peak server RSS | Peak charged cgroup memory | OOM / exit |
| --- | ---: | ---: | --- |
| 512 MiB, 0.5 CPU, no swap | 173.47 MiB | 150.10 MiB | No / 0 |
| 2048 MiB, 1 CPU, no swap | 249.38 MiB | 284.11 MiB | No / 0 |

Both runs used the production Next build and Node 24.22.1, a mounted fixture disk,
three contractors/invoices, 1 MiB uploads and four concurrent readers for about
one minute. They completed 4,388 / 4,428 measured requests respectively (5 ms p95
fixture HTTP latency). RSS counts shared resident pages differently from charged
cgroup usage; both are reported, not treated as interchangeable. Allocator/GC
behavior also varies with available memory. These are bounded synthetic runs,
not real Render metrics, live RPC load, many-organizations capacity or a soak.
Docker image digest: node@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c.

The smaller tier meets the stated 20% headroom requirement and is the final
proposed configuration at **$7.25/month**. render.yaml now selects 0.5c-512mb.
Host startup settings, pinned payment, absent keys and disabled transaction/worker
flags are unchanged. Use the assigned HTTPS address initially. In maintenance,
a temporary https://deployment-pending.invalid origin can be used until the exact
Render URL is allocated; replace it with the actual assigned URL and verify it
before maintenance=0 or any wallet login. It is not a callback address to publish.

The separate [owner CI 41712048351](https://github.com/Technique-S/Nnetics/actions/runs/41712048351)
passed Node tests/build but failed two desktop/mobile browser cancellation cases
(87 passed, 1 skipped). The test treated the busy button as proof that Meteor's
first request was registered; on faster Linux it could cancel the HTTP challenge
before any wallet request existed, leaving one total request instead of two. The
test now waits for the first actual wallet request before editing the account.
Twenty local repeated cases passed. No application auth behavior was weakened.
The follow-up release needs an authorized push and fresh owner CI before rollout.
Payment core and vault provisioning CI on the first commit both passed; they are
sandbox verification, not public deployment or independent security review.

Rollback review found a separate access risk: restoring an old database could
resurrect a link, viewer grant or approved wallet revoked after that snapshot.
The new **rollback** mode explicitly revokes restored invitations, clears viewer
grants and resets contractor wallet approvals/pending requests and generations.
It keeps immutable order recipients, original invoice history and the exact Paid
job unchanged. Owners must issue fresh links and approve contractor wallets again
after a rollback; this does **not** happen on ordinary restarts or initial migration.
A real private-copy rollback rehearsal and expanded fixture tests passed. The
source/live databases were not modified by it. Final local tests/build passed.

Publish the reviewed follow-up commit and require its CI results before accepting
the release. Actual Render import, assigned-domain login and disk redeploy checks
remain rollout acceptance, not already executed. Hosting approval never authorizes
another payment, worker activation, unpause, new keys or checkpoint installation.
