# Funding RPC diagnosis — 4 November 2026

## Finding and evidence limits

The original funding failure could **not** be reproduced as a live provider outage. No original request trace identifying a failed endpoint, RPC method, code and duration was available in the repository or local provisioning record. It would be inaccurate to claim that the old FastNear hostname, dRPC, CORS, a wallet rejection or a contract caused that particular incident.

Read-only checks ran from this Windows machine, rather than the earlier checking environment. At 10:16:46 UTC (11:16:46 Lagos), the following requests succeeded. Durations are milliseconds, including response parsing. The account query was `query`, `request_type=view_account`, `account_id=grandtheft.testnet`, `finality=final`.

| Endpoint | `status` | Account `query` | HTTP / RPC error | CORS preflight |
|---|---:|---:|---|---|
| `https://test.rpc.fastnear.com` | 693 | 220 | 200 / none | 200, origin `*` |
| `https://rpc.testnet.fastnear.com` | 638 | 261 | 200 / none | 200, origin `*` |
| `https://rpc.testnet.near.org` | 3611 | 3279 | 200 / none | 200, origin `*` |
| `https://near-testnet.drpc.org` | 588 | 226 | 200 / none | 204, exact requesting origin |

DNS resolution succeeded for every hostname. HTTPS requests completed without DNS or TLS errors. These results establish connectivity for this process at that time, not continuous service availability, browser-extension connectivity or the cause of an earlier failure. dRPC's earlier HTTP 403 remains valid evidence for that other environment; it is not configured as a fallback here. No rate limiting was observed, and provider quotas were not inferred from these probes.

The actual configured vault's read-only funding preflight also succeeded on the documented FastNear endpoint: `status` 791 ms, finalized `block` 227 ms, account/code `query` 237 ms, and `get_vault` `query` 353 ms; 1618 ms total, protocol 88. The local provisioning record was already `verified`; it was inspected without changing it. No funding, provisioning dispatch, signing or broadcast was performed against the live system.

The repeatable command is `node scripts/rpc-diagnose.ts` from `apps/owner`. It performs only DNS, `status`, account `query`, and HTTP OPTIONS checks, with a 25-second diagnostic cap. The machine-readable evidence is [network.json](rpc-diagnosis-2026-11-04/network.json).

## Confirmed implementation defects

1. Backend identity, provisioning and vault reads used separate request implementations and fixed 20-second timeouts. A snapshot makes multiple sequential finalized reads; the browser had a separate 90-second timeout. There was no coordinated action deadline or transient-read recovery.
2. Provisioning and vault RPC failures generally became HTTP 400, regardless of whether the cause was HTTP 429/503, timeout, contract rejection or invalid input. Identity verification treated many unrelated provider errors alike. Transport diagnostics did not consistently record provider, method, actual error code and elapsed time.
3. Dashboard refresh errors cleared snapshots, selections and dialogs. Session-verification error rendering unmounted the workspace, losing child form state even though the session itself could still be valid. Polling could start another retry cycle after a terminal wait-budget error.
4. The active environment and backend defaults used the legacy FastNear hostname. The pinned wallet-selector testnet preset also defaults to that hostname. FastNear documents `https://rpc.testnet.fastnear.com` in its [RPC reference](https://docs.fastnear.com/rpc). The old hostname responded successfully in these checks, so it is not labeled an outage.
5. The browser CSP omitted the documented hostname. Switching the wallet RPC to that endpoint without updating CSP would cause a browser policy failure. The allowlist now includes it; the browser regression exercises this policy.
6. Direct owner funding used Nightly's combined sign-and-send method without a durable app attempt guard or a pre-broadcast hash record. An ambiguous wallet response could leave the user able to request another transaction. The pinned Nightly implementation signs internally and then invokes the selector provider's `sendTransaction`; the wrapper now records the exact hash at that boundary.

These defects explain why temporary or unrelated failures had poor recovery and misleading presentation. They do not establish the root cause of the original untraced incident.

## Implemented policy and affected flows

- Four safe-read attempts, initially 15, 25, 40 and 60 seconds. `NEXT_PUBLIC_NNETICS_READ_TIMEOUTS_MS` configures four increasing build-time values; browser and server use the same build. The deadline remains 180 seconds, including requests and backoff. Individual attempts are clamped to the remaining budget.
- Exponential delay starting at one second, with 0.5–1.5 jitter; `Retry-After` seconds and HTTP dates take precedence. A delay that cannot fit stops the operation instead of ignoring the provider's requested wait.
- Timeouts, connection interruptions, HTTP 408/429/500/502/503/504 and named transient NEAR errors can retry. Invalid parameters, permissions, wrong network, wallet rejection, TLS validation failures and contract errors do not. Unknown transaction status permits reads only.
- The documented FastNear testnet RPC is primary; the verified NEAR testnet RPC is the read fallback. Arbitrary configured providers do not silently gain a fallback. HTTP 401/403 providers are quarantined for 60 seconds; a denied provider is not repeatedly selected within an operation.
- Persistent contractor workspace reads also use the shared API layer, preserve inputs on transient failures, pause automatic polling after exhaustion and expose manual verification retry.

Browser GETs own their retries. Attempt timeout, provider offset and remaining deadline propagate to the API, where safe RPC reads get one attempt per GET. Browser POSTs never replay. Their safe backend RPC reads can retry inside the shared server deadline. Worker RPC writes also receive only one attempt.
- The wallet provider uses the same safe-read policy for account/key and block reads. Submission uses one `send_tx` request with the already signed bytes, without failover or replay. The wallet wait is bounded; a late signature cannot broadcast under an expired or switched context.
- Workspace loading, snapshot refresh, provisioning preflight and transaction verification show one continuous loading state. After ten seconds they announce: “This process is taking longer than expected. We’re still trying.” Wallet approval has its own message. Duplicate actions are synchronously guarded as well as disabled in the UI.
- Wallet/organization changes, sign-out and disposal cancel read work and reject stale results. Overlapping refreshes are suppressed. A failed dashboard wait pauses automatic refresh until manual retry. Temporary provider errors preserve valid sessions, their existing expiry limits, data and form inputs; private views remain hidden and inert when the existing session-verification rules require blocking access.
- Logs contain operation, provider, attempt, duration, HTTP status and RPC/network error category/code. They exclude RPC parameters, private keys, signatures, cookies, tokens and invoice content. Frontend logging names the API path without its query string.

## Transaction safety and recovery

Backend records and wallet operations are deliberately separate. No write is automatically retried. Existing invoice queue claims, payment reservations, provisioning outbox, conclusively failed/refunded retry rules and contract behavior remain in place.

Direct owner operations now reserve a durable SQLite attempt before opening the wallet. A second tab or repeated click cannot reserve another active attempt. The wallet wrapper validates the signed transaction against the reviewed signer, receiver, key, nonce floor, method, arguments and deposit. It persists its exact hash before any broadcast. If that persistence fails, it does not broadcast. A local record containing only the attempt ID and public hash aids recovery when a signature returns late or the recording response is lost.

Read-only reconciliation checks that same hash and transaction context. Only a verified final success or failure releases the active exclusion, retaining terminal history. Explicit wallet rejection before submission can release the matching hashless attempt. An uncertain response cannot release it. If the hash is unavailable, the user can supply the existing wallet transaction hash; there is no automatic replacement signature or transfer.

Provisioning continues to use its durable pre-recorded hash, nonce and deterministic vault. The UI offers status reconciliation for an existing hash instead of reopening signing. A new attempt remains gated on the existing conclusive failure/refund checks and explicit review.

Unknown outcomes show: “We couldn’t confirm this transaction yet. Check its status before trying again.” Ending the wait does not cancel a submitted transaction. Contract rejection and verified success have separate explanations.

## Verification and limitations

Unit tests cover slow-success recovery, transient errors, increasing deadlines, jitter, `Retry-After`, definitive failures, attempt/deadline exhaustion, cancellation and stale results, one-shot backend writes, provider fallback, session preservation, durable duplicate exclusion, exact transaction matching, hash-before-broadcast ordering and late wallet results. Wallet tests use fake bytes and mocked transports; no signer or live submission is invoked by the new tests.

Browser regressions exercise continuous loading and its ten-second message, retained funding inputs through retry, switching wallets while a read is pending, and the documented endpoint's CSP allowance. Existing authorization, configuration drift, sign-out and expiry checks are also run at desktop and mobile sizes. Final command results are recorded in the task's completion message.

Remaining limitations:

- The original failure's exact endpoint/method/code/duration cannot be recovered without its browser or server trace. New diagnostics make subsequent failures attributable; no outage is fabricated from current success or a previous 403.
- Meteor remains message-only for direct vault-owner funding in this build; its separate provisioning connector is unchanged in authority. This task does not implement or authorize a new Meteor funding connector. That definitive connector restriction must not be described as an RPC outage.
- Browser tests use mocked wallet and API responses. Live signing/submission and browser-extension-internal RPC configuration were not exercised. An already open wallet prompt cannot be forcibly closed through the pinned wallet API; superseded results cannot trigger a broadcast.
- This repository's hosted launcher runs a persistent Next Node process and declares no shorter per-request hosting timeout. External proxy/platform limits are not specified here. Hosting limits shorter than the policy can still interrupt a request; the app retains the attempt and treats its outcome as unknown.
- A signed but unconfirmed transaction with no accessible hash stays blocked for recovery/manual review. Clearing storage or dismissing the wait is not evidence that it was cancelled.
