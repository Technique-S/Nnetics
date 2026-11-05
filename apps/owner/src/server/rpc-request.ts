import { AsyncLocalStorage } from 'node:async_hooks';
import { RequestError, safeRead, httpError, READ_BUDGET } from '../data/request-policy.ts';
export const TESTNET_RPC = 'https://rpc.testnet.fastnear.com';
export const TESTNET_FALLBACK = 'https://rpc.testnet.near.org';
interface Scope { signal?: AbortSignal; deadline: number; singleAttempt?: number; providerOffset?:number }
const scope = new AsyncLocalStorage<Scope>();
export function withRpcScope<T>(signal: AbortSignal, singleAttempt: number | undefined, action: () => T, providerOffset=0, budget=READ_BUDGET): T {
  return scope.run({signal,deadline:Date.now()+Math.max(1,Math.min(READ_BUDGET,budget)),singleAttempt,providerOffset}, action);
}
const reads = new Set(['status','block','query','tx','EXPERIMENTAL_tx_status','gas_price','next_light_client_block','EXPERIMENTAL_light_client_block_proof']);
const deniedUntil = new Map<string,number>();
const limitedUntil = new Map<string,number>();
export async function rpcRequest<T>(provider: string, method: string, params: unknown, options:{allowFallback?:boolean}={}): Promise<T> {
  const context = scope.getStore();
  const safe = reads.has(method), denied = new Set<string>();
  const providers = [provider];
  // Only known public testnet providers get a built-in testnet fallback.
  if (options.allowFallback!==false&&[TESTNET_RPC,TESTNET_FALLBACK,'https://test.rpc.fastnear.com'].includes(provider))
    providers.push(provider === TESTNET_FALLBACK ? TESTNET_RPC : TESTNET_FALLBACK);
  let selected = provider;
  try { return await safeRead(async (signal, attempt) => {
    const permitted=providers.filter(p=>(deniedUntil.get(p)??0)<=Date.now());
    const available=permitted.filter(p=>(limitedUntil.get(p)??0)<=Date.now());
    if(!available.length&&permitted.length){const remaining=Math.min(...permitted.map(p=>(limitedUntil.get(p)??0)-Date.now()));throw new RequestError('The provider is rate limiting verification. Retry verification shortly.','rate-limit',true,429,Math.max(0,remaining));}
    if(!available.length)throw new RequestError('Configured providers denied access. Check provider configuration before retrying.','access-denied');
    selected = available[(attempt+(context?.providerOffset??0)) % available.length];
    if (denied.has(selected)) selected = providers.find(p => !denied.has(p)) ?? selected;
    if (denied.has(selected)) throw new RequestError('All configured providers denied access. Check provider configuration.', 'access-denied');
    const response = await fetch(selected, {method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal,cache:'no-store'});
    if (!response.ok) {
      const error = httpError(response.status,response.headers.get('retry-after'));
      if(error.category==='rate-limit'&&error.retryAfterMs>0)limitedUntil.set(selected,Date.now()+error.retryAfterMs);
      if (error.category === 'access-denied') {
        denied.add(selected);
        deniedUntil.set(selected,Date.now()+60_000);
        // A different verified provider may be used, never hammer the denied one.
        if (safe && providers.some(p => !denied.has(p))) throw new RequestError(error.message,error.category,true,error.status);
      }
      throw error;
    }
    const body = await response.json().catch(()=>{throw new RequestError('The provider returned an unreadable RPC response. Retry verification.','invalid-response',true);});
    if(!body || typeof body!=='object')throw new RequestError('The provider returned incomplete RPC evidence. Retry verification.','invalid-response',true);
    if (body.error) {
      const code = body.error.cause?.name ?? body.error.data?.name ?? String(body.error.code);
      const transient = ['TIMEOUT_ERROR','INTERNAL_ERROR','TOO_MANY_REQUESTS','UNKNOWN_BLOCK','UNAVAILABLE_SHARD','UNKNOWN_TRANSACTION','-32603'].includes(code);
      throw new RequestError(`NEAR ${method} could not be verified (${code}). ${transient ? 'Retry verification.' : 'Check the request, network or contract.'}`, 'rpc',transient,0,0,code);
    }
    if (!('result' in body)) throw new RequestError('The provider returned incomplete verification evidence.', 'invalid-response');
    return body.result as T;
  }, {signal:context?.signal,deadline:context?.deadline,
    timeouts:!safe ? [60_000] : context?.singleAttempt ? [context.singleAttempt] : undefined,
    log:event=>console.info(JSON.stringify({operation:method,provider:new URL(selected).origin,...event}))});
  } catch(error) {
    // Next can abort a disconnected request with an ordinary Error. The
    // cancellation is not authoritative evidence that a wallet key was removed.
    if(context?.signal?.aborted)throw new RequestError('Verification was interrupted; retry verification.','cancelled',true);
    throw error;
  }
}
