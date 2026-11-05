import type {InjectedWallet,WalletBehaviourOptions} from '@near-wallet-selector/core';
import {Buffer} from 'buffer';
import {safeRead,httpError,RequestError,READ_BUDGET,classify} from './request-policy.ts';
type Provider=WalletBehaviourOptions<InjectedWallet>['provider'];
export interface WalletOperation {
  signal:AbortSignal; deadline:number;
  stage?:(message:string)=>void;
  // Must persist the exact hash before allowing any broadcast.
  record:(transaction:Parameters<Provider['sendTransaction']>[0])=>Promise<void>;
}
const endpoints=['https://rpc.testnet.fastnear.com','https://rpc.testnet.near.org'];
export function walletTransport(current:()=>WalletOperation|undefined):Provider {
  let lastOperation:WalletOperation|undefined;
  const deniedUntil=new Map<string,number>();
  const request=async<T>(endpoint:string,method:string,params:unknown,signal:AbortSignal):Promise<T>=>{
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal});
    if(!response.ok)throw httpError(response.status,response.headers.get('retry-after'));
    const body=await response.json();
    if(body.error){const code=body.error.cause?.name??String(body.error.code);throw new RequestError(`Wallet network verification returned ${code}.`,'rpc',['TIMEOUT_ERROR','INTERNAL_ERROR','-32603','UNKNOWN_BLOCK'].includes(code),0,0,code);}
    if(!('result' in body))throw new RequestError('Incomplete wallet network verification.','invalid-response');
    return body.result as T;
  };
  const read=<T>(method:string,params:unknown)=>{
    const operation=current(),deadline=operation?.deadline??Date.now()+READ_BUDGET;
    if(operation)lastOperation=operation;
    operation?.stage?.('Preparing wallet transaction…');
    const denied=new Set<string>();let provider=endpoints[0];
    return safeRead<T>((signal,attempt)=>{
      const available=endpoints.filter(p=>(deniedUntil.get(p)??0)<=Date.now());
      if(!available.length)throw new RequestError('Wallet RPC providers denied access. Check provider configuration.','access-denied');
      provider=available[attempt%available.length];
      if(denied.has(provider))provider=endpoints.find(p=>!denied.has(p))??provider;
      if(denied.has(provider))throw new RequestError('Wallet RPC providers denied access. Check provider configuration.','access-denied');
      return request<T>(provider,method,params,signal).catch(error=>{
        if(error instanceof RequestError&&error.category==='access-denied'){
          denied.add(provider);
          deniedUntil.set(provider,Date.now()+60000);
          if(denied.size<endpoints.length)throw new RequestError(error.message,error.category,true,error.status);
        }
        throw error;
      });
    },{signal:operation?.signal,deadline,log:event=>console.info(JSON.stringify({operation:'wallet:'+method,provider,...event}))}).then(result=>{
      if(operation && current()!==operation)throw Error('Wallet operation was superseded.');
      operation?.stage?.('Waiting for wallet approval…');
      return result;
    });
  };
  return {
    query:params=>read('query',params),
    viewAccessKey:({accountId,publicKey})=>read('query',{request_type:'view_access_key',account_id:accountId,public_key:publicKey,finality:'final'}),
    block:reference=>read('block',reference),
    sendTransaction:async signed=>{
      const operation=current()??lastOperation;
      if(!operation)throw Error('No reviewed owner transaction is active.');
      // A wallet can return a signature after waiting was stopped. Retain its
      // hash, but never broadcast that late result under a superseded context.
      await operation.record(signed);
      operation.signal.throwIfAborted();
      if(current()!==operation)throw Error('Wallet operation was superseded. Check the recorded transaction status.');
      if(Date.now()>=operation.deadline)throw Error('We couldn’t confirm this transaction yet. Check its status before trying again.');
      const signal=AbortSignal.any([operation.signal,AbortSignal.timeout(Math.max(1,Math.min(60000,operation.deadline-Date.now())))]);
      // One broadcast only. A timeout leaves the persisted hash for read-only recovery.
      const start=Date.now();
      try {
        const result=await request<Awaited<ReturnType<Provider['sendTransaction']>>>(endpoints[0],'send_tx',{signed_tx_base64:Buffer.from(signed.encode()).toString('base64'),wait_until:'FINAL'},signal);
        console.info(JSON.stringify({operation:'wallet:send_tx',provider:endpoints[0],attempt:1,duration:Date.now()-start,category:'success'}));
        return result;
      } catch(error) {
        const failure=classify(error);
        console.info(JSON.stringify({operation:'wallet:send_tx',provider:endpoints[0],attempt:1,duration:Date.now()-start,category:failure.category,status:failure.status,rpcCode:failure.rpcCode}));
        throw error;
      }
    },
  };
}
