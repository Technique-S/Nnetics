// Read-only diagnostic. Never import a signer, wallet, session, or worker.
import {lookup} from 'node:dns/promises';
const providers=['https://test.rpc.fastnear.com','https://rpc.testnet.fastnear.com','https://rpc.testnet.near.org','https://near-testnet.drpc.org'];
const origin='http://127.0.0.1:3100';
const results=await Promise.all(providers.map(async provider=>{
  const checks:object[]=[];
  const dnsStart=Date.now();
  try {const addresses=await lookup(new URL(provider).hostname,{all:true});checks.push({operation:'dns',ok:true,addresses,duration:Date.now()-dnsStart});}
  catch(error){checks.push({operation:'dns',ok:false,code:(error as {code?:string}).code,duration:Date.now()-dnsStart});}
  for(const [method,params] of [['status',[]],['query',{request_type:'view_account',account_id:'grandtheft.testnet',finality:'final'}]] as const){
    const start=Date.now();
    try {
      const response=await fetch(provider,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({jsonrpc:'2.0',id:'read-only-diagnosis',method,params}),signal:AbortSignal.timeout(25000)});
      const body=await response.json().catch(()=>null);
      checks.push({operation:method,http:response.status,rpcError:body?.error??null,chain:body?.result?.chain_id,accountFound:method==='query'?!!body?.result?.amount:undefined,duration:Date.now()-start,cors:response.headers.get('access-control-allow-origin'),retryAfter:response.headers.get('retry-after')});
    }catch(error){checks.push({operation:method,error:(error as Error).message,code:(error as {cause?:{code?:string}}).cause?.code,duration:Date.now()-start});}
  }
  const start=Date.now();
  try {const response=await fetch(provider,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'},signal:AbortSignal.timeout(25000)});checks.push({operation:'cors-preflight',http:response.status,allowOrigin:response.headers.get('access-control-allow-origin'),allowMethods:response.headers.get('access-control-allow-methods'),allowHeaders:response.headers.get('access-control-allow-headers'),duration:Date.now()-start});}
  catch(error){checks.push({operation:'cors-preflight',error:(error as Error).message,duration:Date.now()-start});}
  return {provider,checks};
}));
console.log(JSON.stringify({checkedAt:new Date().toISOString(),location:'local Windows Node process; browser/extension results may differ',results},null,2));
