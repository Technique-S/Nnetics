// Shared transport policy. Only explicitly safe operations may use retries.
export function readTimeouts(value?:string) {
  const defaults=[15_000,25_000,40_000,60_000];
  if(!value)return defaults;
  const values=value.split(',').map(Number);
  if(values.length!==4||values.some((n,i)=>!Number.isInteger(n)||n<1||n>120000||(i>0&&n<values[i-1])))
    throw Error('Configure four increasing read timeouts in milliseconds (maximum 120000 each).');
  return values;
}
// Public build-time configuration keeps browser and server attempt policy aligned.
export const READ_TIMEOUTS = readTimeouts(process.env.NEXT_PUBLIC_NNETICS_READ_TIMEOUTS_MS);
export const READ_BUDGET = 180_000;
export class RequestError extends Error {
  networkCode?:string;
  readonly category:string;readonly retryable:boolean;readonly status:number;readonly retryAfterMs:number;readonly rpcCode?:string;readonly verificationUnavailable:boolean;
  constructor(message: string, category: string, retryable = false, status = 0, retryAfterMs = 0, rpcCode?: string, verificationUnavailable = false) {
    super(message);Object.assign(this,{category,retryable,status,retryAfterMs,rpcCode,verificationUnavailable});
    this.category=category;this.retryable=retryable;this.status=status;this.retryAfterMs=retryAfterMs;this.verificationUnavailable=verificationUnavailable;
  }
}
export function retryAfter(value: string | null, now = Date.now()) {
  if (!value) return 0;
  const seconds = Number(value);
  return Math.max(0, Number.isFinite(seconds) ? seconds * 1000 : (Date.parse(value) || now) - now);
}
export function classify(error: unknown): RequestError {
  if (error instanceof RequestError) return error;
  if (error instanceof Error && error.name === 'TimeoutError') return new RequestError('Verification timed out. Retry verification.', 'timeout', true);
  if (error instanceof TypeError) {
    const code=(error.cause as {code?:string}|undefined)?.code;
    const category=code?.includes('CERT')||code?.includes('TLS') ? 'tls' : code==='ENOTFOUND'||code==='EAI_AGAIN' ? 'dns' : 'connection';
    const failure=new RequestError(category==='tls' ? 'The provider TLS connection could not be verified. Check provider configuration.' : 'The verification connection was interrupted. Retry verification.', category,category!=='tls');
    failure.networkCode=code;return failure;
  }
  return new RequestError(error instanceof Error ? error.message : 'Verification could not finish.', 'definitive');
}
export function httpError(status: number, after: string | null) {
  const transient = [408, 429, 500, 502, 503, 504].includes(status);
  return new RequestError(status === 401 || status === 403
    ? 'The provider denied access. Check provider permissions or configuration.'
    : status === 429 ? 'The provider is rate limiting verification. Retry shortly.'
    : `Verification service returned HTTP ${status}. Retry verification or check configuration.`,
    status === 401 || status === 403 ? 'access-denied' : status === 429 ? 'rate-limit' : 'http', transient, status, retryAfter(after));
}
export async function wait(ms: number, signal?: AbortSignal) {
  signal?.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal?.reason); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, {once:true});
  });
}
export interface RetryOptions {
  signal?: AbortSignal; deadline?: number; timeouts?: number[];
  onRetry?: (failure:RequestError) => void;
  random?: () => number; now?: () => number;
  sleep?: typeof wait;
  log?: (event: {attempt:number;duration:number;category:string;status?:number;rpcCode?:string;networkCode?:string}) => void;
}
export async function safeRead<T>(request: (signal: AbortSignal, attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const now = options.now ?? Date.now, deadline = options.deadline ?? now() + READ_BUDGET;
  const timeouts = options.timeouts ?? READ_TIMEOUTS;
  let last: RequestError | undefined;
  for (let i = 0; i < timeouts.length; i++) {
    options.signal?.throwIfAborted();
    const remaining = deadline - now();
    if (remaining <= 0) break;
    const start = now(), timer = AbortSignal.timeout(Math.max(1, Math.floor(Math.min(timeouts[i], remaining))));
    const signal = options.signal ? AbortSignal.any([options.signal, timer]) : timer;
    try {
      const result = await request(signal, i);
      signal.throwIfAborted();
      options.log?.({attempt:i+1,duration:now()-start,category:'success'});
      return result;
    } catch (error) {
      options.signal?.throwIfAborted();
      const failure = classify(timer.aborted ? timer.reason : error);
      last = failure;
      options.log?.({attempt:i+1,duration:now()-start,category:failure.category,status:failure.status,rpcCode:failure.rpcCode,networkCode:failure.networkCode});
      if (!failure.retryable) throw failure;
      options.onRetry?.(failure);
      if (i === timeouts.length - 1) { if (timeouts.length === 1) throw failure; break; }
      const delay = Math.max(failure.retryAfterMs, Math.min(8000, 1000 * 2 ** i) * (0.5 + (options.random ?? Math.random)()));
      if (delay >= deadline - now()) break;
      await (options.sleep ?? wait)(delay, options.signal);
    }
  }
  const message=last?.category==='rate-limit'?'The provider is rate limiting verification. Retry verification shortly.':last?.category==='timeout'?'The network request timed out. Retry verification.':'Verification could not finish within the waiting limit. Retry verification.';
  throw new RequestError(message, last?.category==='rate-limit'||last?.category==='timeout'?last.category:'budget', true, last?.status, last?.retryAfterMs??0, last?.rpcCode);
}
