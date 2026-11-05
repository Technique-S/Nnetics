import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeRead,RequestError,httpError,retryAfter,wait,READ_TIMEOUTS} from '../src/data/request-policy.ts';
import {api,LiveApiError} from '../src/data/live-request.ts';
import {rpcRequest,TESTNET_RPC,TESTNET_FALLBACK,withRpcScope} from '../src/server/rpc-request.ts';
import {walletResult} from '../src/data/wallet-result.ts';

test('slow first read times out, longer second attempt succeeds',async()=>{
  const keepAlive=setTimeout(()=>{},1000);let attempts=0;
  try {const result=await safeRead(async signal=>{attempts++;await wait(attempts===1?30:5,signal);return 'verified';},{timeouts:[10,50],sleep:async()=>{}});
  assert.equal(result,'verified');assert.equal(attempts,2);}finally{clearTimeout(keepAlive);}
});
test('transient recovery uses increasing defaults and Retry-After with bounded jitter',async()=>{
  let time=0,calls=0;const delays:number[]=[];
  assert.deepEqual(READ_TIMEOUTS,[15000,25000,40000,60000]);
  const result=await safeRead(async()=>{if(++calls<3)throw httpError(calls===1?429:503,calls===1?'3':null);return 'ok';},
    {now:()=>time,random:()=>0,sleep:async ms=>{delays.push(ms);time+=ms;}});
  assert.equal(result,'ok');assert.deepEqual(delays,[3000,1000]);
  assert.equal(retryAfter(new Date(10000).toUTCString(),0),10000);
});
test('definitive permissions/input/contract errors stop immediately',async()=>{
  for(const failure of [httpError(403,null),httpError(400,null),new RequestError('Contract rejected','rpc',false,0,0,'CONTRACT_EXECUTION_ERROR')]){
    let calls=0;await assert.rejects(safeRead(async()=>{calls++;throw failure;}),e=>e===failure);assert.equal(calls,1);
  }
});
test('budget includes delays, honors attempt cap and does not shorten Retry-After',async()=>{
  let calls=0,time=0;
  await assert.rejects(safeRead(async()=>{calls++;time+=14000;throw httpError(429,'200');},{now:()=>time,deadline:180000,sleep:async()=>assert.fail('must not sleep beyond budget')}),e=>e instanceof RequestError&&e.category==='rate-limit');
  assert.equal(calls,1);
  calls=0;
  await assert.rejects(safeRead(async()=>{calls++;throw new TypeError('connection');},{sleep:async()=>{}}),/waiting limit/);assert.equal(calls,4);
});
test('wallet/organization change aborts retry sleep and ignores stale successful results',async()=>{
  const controller=new AbortController();let calls=0;
  await assert.rejects(safeRead(async()=>{calls++;throw new TypeError('offline');},{signal:controller.signal,sleep:async()=>{controller.abort();}}),e=>(e as Error).name==='AbortError');assert.equal(calls,1);
  const next=new AbortController();await assert.rejects(safeRead(async()=>{next.abort();return 'stale';},{signal:next.signal}),e=>(e as Error).name==='AbortError');
});
test('writes with ambiguous responses are never replayed; safe reads recover',async()=>{
  const original=globalThis.fetch;let calls=0;
  try {
    globalThis.fetch=async()=>{calls++;throw new TypeError('lost response');};
    for(const path of ['provisioning/dispatch','invoices','enqueue','owner-attempt','login']){
      calls=0;await assert.rejects(api(path,{}),LiveApiError);assert.equal(calls,1);
    }
    calls=0;globalThis.fetch=async()=>{calls++;return calls===1?new Response('{}',{status:503}):Response.json({verified:true});};
    assert.deepEqual(await api('snapshot'),{verified:true});assert.equal(calls,2);
  } finally {globalThis.fetch=original;}
});
test('provider denial stops immediately while preserving the distinction from session rejection',async()=>{
  const original=globalThis.fetch;let calls=0;
  try {
    globalThis.fetch=async()=>{calls++;return Response.json({error:'Provider denied access',verificationUnavailable:true,automaticRetry:false},{status:400});};
    await assert.rejects(api('session'),e=>e instanceof LiveApiError&&e.retryable&&e.message.includes('Provider denied'));assert.equal(calls,1);
    globalThis.fetch=async()=>Response.json({error:'Session expired',automaticRetry:false},{status:400});
    await assert.rejects(api('session'),e=>e instanceof LiveApiError&&!e.retryable);
  }finally{globalThis.fetch=original;}
});
test('RPC retries cannot broadcast; fallback preserves the exact read parameters',async()=>{
  const original=globalThis.fetch;const calls:{url:string;method:string;params:unknown}[]=[];
  try {
    globalThis.fetch=async(url,init)=>{const body=JSON.parse(String(init?.body));calls.push({url:String(url),method:body.method,params:body.params});return calls.length===1?new Response('',{status:403}):Response.json({result:{chain_id:'testnet'}});};
    assert.deepEqual(await rpcRequest(TESTNET_RPC,'status',[]),{chain_id:'testnet'});
    assert.deepEqual(calls.map(c=>c.url),[TESTNET_RPC,TESTNET_FALLBACK]);
    calls.length=0;globalThis.fetch=async()=>{calls.push({url:'',method:'send_tx',params:[]});throw new TypeError('lost');};
    await assert.rejects(rpcRequest(TESTNET_RPC,'send_tx',{signed_tx_base64:'mock-only'}));assert.equal(calls.length,1);
  }finally{globalThis.fetch=original;}
});
test('browser GET attempts select fallback without nested backend retry loops',async()=>{
  const original=globalThis.fetch;let calls=0;
  try {globalThis.fetch=async url=>{calls++;assert.equal(url,TESTNET_FALLBACK);return new Response('',{status:503});};
    await assert.rejects(withRpcScope(new AbortController().signal,15000,()=>rpcRequest(TESTNET_RPC,'status',[]),1));assert.equal(calls,1);
  }finally{globalThis.fetch=original;}
});
test('ambiguous wallet waiting stops without restarting the wallet request; late hash remains recoverable',async()=>{
  let prompts=0,resolve!:(value:{hash:string})=>void;
  const pending=(()=>{prompts++;return new Promise<{hash:string}>(done=>{resolve=done;});})();
  let saved='';const recorded=pending.then(result=>{saved=result.hash;return result;});
  await assert.rejects(walletResult(recorded,new AbortController().signal,5),/Check its status/);
  assert.equal(prompts,1);resolve({hash:'existing-hash'});await recorded;assert.equal(saved,'existing-hash');
});
