# Payment bootstrap review packet — blocked, not authorization

**Proposed revision:** the user subsequently requested a testnet-only exception,
not execution. PAYMENT_ACCEPTANCE_TESTNET_V2.md/.json now presents that explicit
exception, unchanged transaction actions/ceilings and additional validity/stop
conditions. Original plan/digest and this original disposition remain preserved.
No independent review has occurred. The revision awaits its own explicit digest
approval; requesting/preparing it does not approve the exception or transactions.

## Decision disposition — 3 November 2026, 10:08 WAT

**Recommendation: do not execute the unchanged plan yet.** The technical bootstrap
checks support using this head as an explicitly owner-trusted starting point for
a bounded testnet experiment. No new contract defect was established in this
review. However the unchanged plan expressly says `requires_independent_review:
true`; **no independent review has occurred**. Author checks and accepting a
trusted starting point cannot satisfy that requirement. This is a specific
assurance/approval requirement, not a claim that the checkpoint is fraudulent.

Two actionable off-chain preparation defects were fixed below. Remaining choices
for the owner: (1) keep this plan and obtain a named independent review disposition
covering its exact code/artifact/checkpoint; or (2) explicitly request a revised
testnet-only risk policy that permits author-reviewed bootstrap without independent
review. Option 2 would require a separately disclosed revised plan/digest; it must
not be smuggled into approval of this unchanged document. Neither choice is
authorization to sign now. Production/mainnet use is not recommended under either
this evidence packet or a bounded testnet exception.

Severity below distinguishes **bounded testnet impact** from production exposure.
High means potential wrong accounting/authority or unrecoverable outcome; Medium
means material assurance/availability gap; Low means bounded operational cost.

| ID / category | Severity | Finding and effect on this payment | Disposition |
| --- | --- | --- | --- |
| T1 initial trust assumption | High if malicious anchor; bounded transfer exposure 0.001 NEAR | Current ordered validators are supplied at bootstrap. Valid signatures against that supplied set do not prove it is NEAR's set. A malicious root can undermine later proof-based reconciliation; native-transfer success still requires the contract's approved order. | Canonical hash and complete ordered set corroborated by Intear; owner must expressly trust the exact head/sets. Not fixed by changing hash code. |
| T2 PoS/age assumption | Medium testnet; High for unattended long-term operation | No on-chain maximum-age/weak-subjectivity rule. Old roots/long-range consensus and future loss of current validators can break trust or recovery. | Acceptance collector/preparation guard now rejects future or older-than-24-hour inputs; initialization executor must recheck immediately before signing. Sync before payment and no epoch skipping. Current age was 3.90 hours at recheck. If expired, stop and regenerate/reapprove; no silent checkpoint replacement. This is operational, not a new on-chain guarantee. |
| T3 source independence | Medium; misleading assurance, not a contract exploit | Original Fastnear + near.org archival responses were not two independent operators: Fastnear maintains the legacy endpoints. | Corrected provenance. Intear now corroborates hash + ordered set; dRPC corroborates hash only. Providers may still share hosting/upstreams; node-level independence is not attested. |
| A1 independent review absent | Medium for this testnet experiment; High for production | Nobody independent has reviewed this deployed verifier/packet. Historical author comparison, CI and this author pass do not close that gap. | **Unmet hard requirement of unchanged plan.** Obtain named reviewer verdict for finality/epoch prefix, bootstrap, receipt/replay and accounting, or explicitly revise testnet policy/plan before asking approval. |
| I1 offline set validation | Low direct testnet risk; Medium preparation reliability | Collector previously lacked contract-equivalent duplicate/zero/overflow validator and approval-slot guards. Malformed inputs could be presented as reviewed; contract would still reject them. | **Fixed** in bootstrap-inputs.ts and collector. Saved real evidence passes; negative tests reject malformed sets/slots. No contract/interface change. |
| I2 source/network guard | Low direct risk | Collector previously used correlated endpoints and did not explicitly check both chain IDs/protocols or nonfuture timestamp/distinct epochs. | **Fixed**: separately listed Intear source, both testnet/protocol-88 checks, time/epoch checks. Existing saved payload/transaction plan unchanged. |
| V1 exact VM execution | Medium availability; bounded gas cost | Exact real 20+20 set has not been VM-executed. Existing 128-validator protocol-86/88 fixture measured ~40.864 Tgas; 100-Tgas cap is margin, not proof. | Initialization occurs paused, before funds/agent/unpause. Require finalized stored checkpoint match before proceeding; failure stops, no automatic retry. Exact VM result remains unexecuted, not a passed test. |
| V2 parser/resource bounds | Low for this 7234-byte request; Medium untrusted/general use | Raw size check follows SDK deserialization; pre-parser memory/DoS protection is not claimed. | Only exact bounded reviewed JSON may be submitted. Malformed requests can burn caller gas, not authorize payment. Existing rollback tests retained. |
| R1 callback/unknown recovery | Medium testnet availability | A native transfer can succeed while callback fails. Unknown must remain reserved; recovery requires correct future checkpoint updates/proofs. No timeout/balance-based release. | One durable outbox/job; reconcile before retry. A failed/unknown callback is not a successful acceptance result; stop for proof-based recovery. No owner override added. |
| R2 receipt linkage assumption | Medium assurance | Outcome proof binds receipt outcome, but relies on pinned initiating code creating the native transfer as the first child; it does not independently prove action bytes. | Verify deployed hash, exact attempt marker/recipient/amount, native transfer receipt and terminal record. Known production limitation; no new contrary defect found. Independent reviewer must disposition. |
| C1 protocol/validator bounds | Low current testnet; Medium future recovery | Only protocol 86/88 legacy headers, Ed25519, 128 validators/set and 256 approval slots supported. Future Spice/keys/epoch changes may block repair. | Current 20-validator legacy evidence fits. Refuse drift/new protocol; no silent SDK or contract upgrade. |
| K1 custody/residual funds | Low, intentional | Private file is local and ACL-restricted; worker has no FullAccess/rescue authority. Unspent part of its 0.3 NEAR may remain locked. | Owner accepts bounded gas funding cost. After run pause and revoke agent. Do not grant rescue/owner permissions. |
| P1 transport hash change | Medium availability; fixed before this plan | Meteor changed the provisioning hash; existence alone could not bind it. This could otherwise tempt duplicate creation. | Fixed authenticated same-key/nonce/full-call FINAL-evidence reconciliation with archived original. Actual vault linked and persistent. Owner acceptance transactions use exact CLI outboxes; signer verification rejects modified bytes. |

### Source provenance and what corroboration establishes

Original light-client block and ordered set came from `https://test.rpc.fastnear.com`.
The second archived response came from `https://archival-rpc.testnet.near.org`.
[NEAR's deprecation notice](https://near.org/blog/deprecation-of-near-org-and-pagoda-co-rpc-endpoints)
states Fastnear maintains these legacy endpoints. The earlier label must not be
interpreted as independent-operator review or independent corroboration.

On 3 November at 09:03:58–09:04:00 UTC, additional read-only requests checked the
**same pinned height/hash**, not a newly selected head:

| Source / publicly identified operator | Actual result |
| --- | --- |
| Fastnear public endpoint | Original header, complete current/next data and signatures; canonical matching header hash. |
| near.org archival, Fastnear-maintained | Same canonical hash and complete ordered current set; correlated confirmation only. |
| `https://testnet-rpc.intea.rs` / Intear | Reports testnet, identical canonical hash and byte-for-byte identical ordered 20-validator current set. |
| `https://near-testnet.drpc.org` / dRPC | Reports testnet, identical canonical block hash. Ordered validators returned method-not-available; **no validator-set corroboration claimed**. |

[NEAR's provider list](https://docs.near.org/api/rpc/providers) identifies Fastnear,
Intear and dRPC separately; [Intear's site](https://intea.rs/) describes its RPC
infrastructure. This supports separate service-operator attribution, not proof of
disjoint physical nodes, ownership/upstreams or freedom from collusion. Matching
responses reduce single-source error/equivocation risk. They do not establish an
independent review, genesis-to-head trust, honesty of >2/3 stake, weak-subjectivity
safety, absence of verifier bugs, or exact VM gas/storage success.
Evidence: `artifacts/payment-acceptance/independent-source-checks.json` and original
raw/normalized files. Checkpoint arguments remain exactly the same.

### Review identity and execution evidence

**Independent reviewer: none.** Codex, the implementation author in this chat,
performed the source comparison, evidence corroboration, fixes and test execution.
The official NEAR sources describe their implementation; their authors have not
reviewed Nnetics. CI is execution evidence, not a reviewer. No named third-party
verdict or audit is being represented.

Executed this pass: 21/21 bootstrap-input/age, provisioning, payment-linkage and worker
tests passed; saved real evidence passed the new input guards and normalizer;
canonical plan digest and checkpoint argument equality passed. Exact payload VM
execution and independent review remain unexecuted. TypeScript checking passed.
Transactions stay disabled.

### Unchanged plan for owner decision

`PAYMENT_ACCEPTANCE_TRANSACTIONS.json` is unchanged, digest
`b4b70ad2cfee6722a0fe74e02f549b6cb124b54ab3ab282575d14c17f0f2b63b`.
INV-0002 remains 0.001 NEAR, same linked billing order and Babygoat recipient.
Do not interpret this disposition as approval or as removal of the plan's
`requires_independent_review` field. No transaction has been authorized by this
review request. Fresh protocol/code/balance/key/age/expiry checks still apply.

3 November 2026. This is implementation-author verification, not an independent
security review. No checkpoint, worker account/key or payment transaction was sent.

## Key custody and authority

Generated a dedicated Ed25519 key using the installed pinned SDK, not an external
service. It is at `C:/Users/Kazi/.nnetics/keys/grandtheft-worker/restricted-worker.key`,
outside the repository. Windows ACL inspection confirms only Kazi and SYSTEM have
access. Generation wrote/fsynced an exclusive file; only public metadata was logged.
Public key: `ed25519:J9yFAtkpdgsJ2E3N3MANFFHQf3k9DNkXsBhsJUotHfFA`.
No CLI import or private-key export is required: the existing local worker signer
supports an external key file. Owner setup signatures still use the owner's CLI.

The proposed worker has **zero FullAccess keys**, no contract ownership and one
FunctionCall key: receiver the verified Grandtheft vault, method `execute_payment`
only, lifetime gas allowance **0.27 NEAR**, no attached deposit. The contract also
requires the exact authorized worker account/key, matching approved order/vendor/
recipient/amount, unpaused state, budget/cap/funds and unused invoice/order claims.
Gas allowance is not payout authority. Budget and cap are independently 0.001 NEAR.
After the run, pause and revoke the agent. Residual worker funds are not recoverable
with this restricted key; no FullAccess rescue key or delete-account authority is
included. The residual key cannot pass revoked/paused contract guards.

## Bootstrap evidence actually checked

Evidence collected at 08:51:26 UTC / 09:51:26 WAT. Canonical head:
`Gk91ppKatpsQhi62mK9CE1WKfFMFA7BH1EDt3vBSnnpD`, height **276003652**.
Fastnear testnet and NEAR's archival endpoint agree on that canonical block hash
and complete ordered current validator set. Both current and next sets contain
**20 validators**, below the contract's 128-set bound. Request is **7234 bytes**,
below 128000. Canonical argument SHA-256:
`e38bed03aadd216a2472fb92064cf77ee54aecc86f405f22259c6f6607731027`.

The collector reconstructed the supported legacy inner-lite/header Borsh hash,
matched the canonical block, hashed next validators with V1 tag/fixed Ed25519
encoding and matched next_bp_hash. It reconstructed next-block hash and endorsement
message (tag 0, little-endian height+2), verified every supplied current-prefix
signature, and checked approved stake **485068636219083381968489046251863** exceeds
two thirds of total **605470350102881057467127247937208**. This is approximately
80.1% stake, with missing signatures contributing zero. No input list was sorted.
Future Spice roots, unsupported keys, excessive fields and unsafe numbers are
rejected by the existing normalizer. Raw and normalized evidence is retained in
ignored `artifacts/payment-acceptance/`.

Official references: [NEAR light-client specification](https://nomicon.io/ChainSpec/LightClient.html)
and the exact nearcore/standalone commits already pinned in M1_REVIEW.md and
PROTOCOL_88_REVIEW.md. No SDK/contract change was made for this preparation.

## Requirements and unresolved gate

Initialization is owner-only, requires 1 yoctoNEAR, paused=true, last_attempt=0,
and no existing checkpoint. It cannot reset a head after any payment attempt.
On-chain bootstrap validates bounds, positive unique stakes/keys, next commitment,
nonfuture height/time and distinct epochs. **It does not independently authenticate
the initial current validator set.** Signatures verified against that supplied set
and two-provider agreement cannot remove this initial trust assumption. The owner
must explicitly approve the exact head and ordered sets as the trusted starting
point, with reviewed network selection and checkpoint age/weak-subjectivity policy.

Independent verifier review remains open as recorded in M1_REVIEW.md. A reviewer
must disposition finality/epoch signer-prefix handling, current-set bootstrap
authenticity and age, receipt linkage/replay and callback-failure recovery. Existing
VM/test passes and this author's evidence check do not constitute that verdict.
Exact current bootstrap inputs have not been run in a fresh VM. The proposed
100-Tgas initialization exceeds the previously measured 40.864-Tgas maximum
128-validator bootstrap, but remains a reviewed cap, not a new execution result.

**Gate stays closed.** Do not install a placeholder checkpoint, skip worker signer
checks, declare independent review complete, or interpret general deployment/key
generation permission as payment authorization. The exact plan is reviewable, but
payment approval must wait for explicit review/trust disposition. If that review
requires different code, checkpoint, gas/amounts or expiry, regenerate the digest
and obtain approval for the revised plan. No contract changes are proposed here.

## Exact transaction plan

See PAYMENT_ACCEPTANCE_TRANSACTIONS.json. Digest:
`b4b70ad2cfee6722a0fe74e02f549b6cb124b54ab3ab282575d14c17f0f2b63b`.
This is **not approved**. All exact public keys, receivers, arguments, encoded
payloads, deposits, gas, caps and fixed order expiry are included.

| Transaction | Funding/deposit | Gas cap / maximum upfront fee (NEAR) |
| --- | --- | --- |
| Create worker + restricted AddKey | 0.3 NEAR to worker | 0.010 fee cap |
| Initialize exact checkpoint | 1 yoctoNEAR | 100 Tgas / 0.101 |
| Register Babygoat vendor | 1 yoctoNEAR | 10 Tgas / 0.011 |
| Approve ACCEPTANCE-001 | 1 yoctoNEAR | 10 Tgas / 0.011 |
| Fund payout ledger | 0.001 NEAR | 10 Tgas / 0.011 |
| Set budget | 1 yoctoNEAR | 10 Tgas / 0.011 |
| Set cap | 1 yoctoNEAR | 10 Tgas / 0.011 |
| Authorize exact worker/key | 1 yoctoNEAR | 10 Tgas / 0.011 |
| Unpause | 1 yoctoNEAR | 10 Tgas / 0.011 |
| One execute_payment | zero | 250 Tgas / 0.251, from worker's 0.3 funding |
| Pause afterward | 1 yoctoNEAR | 10 Tgas / 0.011 |
| Revoke agent | 1 yoctoNEAR | 10 Tgas / 0.011 |

Owner deposits total **0.301 NEAR + 9 yoctoNEAR**. Owner maximum fee caps total
**0.210 NEAR**. Retain **0.00264 NEAR** for existing owner storage: total
**0.51364 NEAR + 9 yoctoNEAR**, below observed **0.640533128772182399999999**.
Worker's 0.251 fee cap is included within its 0.3 funding, not added again to
owner deposits. All fee caps round upward at pinned protocol-88 gas/storage prices;
the worker creation includes additional conservative AddKey byte-accounting margin.
Fresh fee preflight is mandatory; unused gas allowances are not claimed as costs.

Additional vault storage funding proposed: **zero**. Existing balance exceeds
current storage stake + operating reserve by **0.62476 NEAR**; measured worst-case
bootstrap storage was 31327 bytes / 0.31327 NEAR. Actual new state delta must be
verified; these are existing-balance bounds, not a fabricated VM result. Halt if
preflight or review requires more funding; do not silently reclassify payout funds.

The job remains held until chain order approval and exactly-one durable linkage
pass. Preserve INV-0002, its immutable billing order and original-text hash. Verify
recipient pre-balance immediately before execution (the current snapshot is not
the acceptance baseline), one native 0.001 receipt, final accounting and independently
confirmed transaction linkage on both screens. Repeat/restart must return the same
terminal job without signing; unknown stays blocked. Then pause and revoke.
