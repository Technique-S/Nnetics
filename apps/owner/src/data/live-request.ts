import { classify, httpError, RequestError, safeRead, READ_TIMEOUTS, READ_BUDGET, wait } from './request-policy.ts';
export class LiveApiError extends Error {
  readonly retryable:boolean; readonly status:number; readonly retryAfterMs:number;
  constructor(message: string, retryable = false, status = 0, retryAfterMs=0) { super(message); this.retryable=retryable;this.status=status;this.retryAfterMs=retryAfterMs; }
}
// A completed rate-limited read must not be hammered by another heartbeat/click.
const readCooldowns=new Map<string,number>();
export async function api<T>(path: string, body?: unknown, signal?: AbortSignal, deadline=Date.now()+READ_BUDGET, onRetry?:()=>void): Promise<T> {
  // Writes (including dispatch/login) are one-shot. A timeout never replays them.
  const read = body === undefined;
  const request = async (attemptSignal: AbortSignal, attempt: number) => {
    const response = await fetch('/api/live/' + path, {
      method:read?'GET':'POST',credentials:'same-origin',cache:'no-store',keepalive:path==='logout',
      headers:read?{'x-nnetics-read-timeout':String(READ_TIMEOUTS[attempt]),'x-nnetics-read-attempt':String(attempt), 'x-nnetics-budget':String(Math.max(1,deadline-Date.now()))}:{'Content-Type':'application/json','x-nnetics-budget':String(Math.max(1,deadline-Date.now()))},
      body:read?undefined:JSON.stringify(body),signal:attemptSignal,
    });
    const result = await response.json().catch(() => {throw response.ok ? new RequestError('The service returned an unreadable response. Retry verification.', 'invalid-response',true) : httpError(response.status,response.headers.get('retry-after'));});
    if (!response.ok) {
      const error = httpError(response.status,response.headers.get('retry-after'));
      throw new RequestError(result.error || error.message,error.category,result.automaticRetry === false ? false : result.retryable === true || error.retryable,response.status,error.retryAfterMs,undefined,result.verificationUnavailable===true);
    }
    return result as T;
  };
  try {
    const operation=path.split('?')[0],remaining=(readCooldowns.get(operation)??0)-Date.now();
    if(read&&remaining>0){
      if(remaining>=deadline-Date.now())throw new RequestError('The provider is rate limiting verification. Retry verification shortly.','rate-limit',true,429,remaining);
      const limit=AbortSignal.timeout(Math.max(1,deadline-Date.now()));
      await wait(remaining,signal?AbortSignal.any([signal,limit]):limit);
    }
    if (read) return await safeRead(request,{signal,deadline,onRetry,log:event=>console.info(JSON.stringify({operation:path.split('?')[0],provider:'application',...event}))});
    if(deadline<=Date.now())throw new RequestError('Verification could not finish within the waiting limit. Retry verification.','budget',true);
    const limit=AbortSignal.timeout(Math.max(1,deadline-Date.now()));
    return await request(signal?AbortSignal.any([signal,limit]):limit,0);
  } catch (error) {
    signal?.throwIfAborted();
    const failure=classify(error);
    if(read&&failure.status===429&&failure.retryAfterMs>0)readCooldowns.set(path.split('?')[0],Date.now()+failure.retryAfterMs);
    throw new LiveApiError(failure.message,failure.retryable || failure.verificationUnavailable,failure.status,failure.retryAfterMs);
  }
}
