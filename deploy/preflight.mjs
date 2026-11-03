import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {pins} from './hosting.mjs';
export async function verifyChain(endpoint='https://test.rpc.fastnear.com'){
  assert.equal(new URL(endpoint).protocol,'https:');
  const rpc=async(method,params)=>{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'hosting-read-only',method,params}),signal:AbortSignal.timeout(20000)});assert.ok(response.ok,'RPC unavailable');const body=await response.json();if(body.error)throw Error('RPC verification failed');return body.result;};
  const status=await rpc('status',[]);assert.equal(status.chain_id,'testnet');
  const block=await rpc('block',{finality:'final'}),block_id=block.header.hash;
  const view=async(method_name,args={})=>{const r=await rpc('query',{request_type:'call_function',account_id:pins.vault,method_name,args_base64:Buffer.from(JSON.stringify(args)).toString('base64'),block_id});return JSON.parse(Buffer.from(r.result).toString());};
  const [account,keys,vault,payment]=await Promise.all([rpc('query',{request_type:'view_account',account_id:pins.vault,block_id}),rpc('query',{request_type:'view_access_key_list',account_id:pins.vault,block_id}),view('get_vault'),view('get_payment',{attempt_id:'1'})]);
  assert.equal(account.code_hash,pins.codeHash);assert.equal(keys.keys.length,0);assert.equal(vault.owner,pins.owner);assert.equal(vault.paused,true);assert.equal(vault.agent,null);assert.equal(vault.reserved,'0');assert.equal(String(vault.last_attempt),'1');assert.equal(vault.spent,pins.amount);
  assert.equal(payment.status,'Paid');assert.equal(payment.invoice_id,pins.id);assert.equal(payment.order_id,pins.order);assert.equal(payment.recipient,pins.recipient);assert.equal(payment.amount,pins.amount);
  return {checkedAt:new Date().toISOString(),height:block.header.height,blockHash:block_id,owner:vault.owner,paused:true,workerAuthorization:null,payment:pins.hash,transactionsSent:0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(await verifyChain(),null,2));
