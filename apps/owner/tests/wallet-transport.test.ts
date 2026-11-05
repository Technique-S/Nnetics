import {test} from 'node:test';
import assert from 'node:assert/strict';
import {walletTransport,type WalletOperation} from '../src/data/wallet-transport.ts';
type Signed=Parameters<ReturnType<typeof walletTransport>['sendTransaction']>[0];
// Deliberately not a signed transaction. Tests exercise ordering and exclusion
// with fake bytes; they never import a signer or contact the network.
const fake={encode:()=>new Uint8Array([1,2,3])} as unknown as Signed;
test('wallet provider durably records before one broadcast; lost response never broadcasts twice',async()=>{
  const original=globalThis.fetch;let saved=false,broadcasts=0;
  const operation:WalletOperation={signal:new AbortController().signal,deadline:Date.now()+180000,record:async()=>{saved=true;}};
  try {
    globalThis.fetch=async(_,init)=>{assert.equal(saved,true);assert.equal(JSON.parse(String(init?.body)).method,'send_tx');broadcasts++;throw new TypeError('lost response');};
    await assert.rejects(walletTransport(()=>operation).sendTransaction(fake),/lost response/);
    assert.equal(broadcasts,1);assert.equal(saved,true);
  }finally{globalThis.fetch=original;}
});
test('failed hash persistence, expired waiting budget and wallet switch all block broadcast',async()=>{
  const original=globalThis.fetch;let broadcasts=0;
  try {
    globalThis.fetch=async()=>{broadcasts++;throw Error('must not submit');};
    let operation:WalletOperation|undefined={signal:new AbortController().signal,deadline:Date.now()+180000,record:async()=>{throw new TypeError('record lost');}};
    const provider=walletTransport(()=>operation);
    await assert.rejects(provider.sendTransaction(fake),/record lost/);
    operation={signal:new AbortController().signal,deadline:Date.now()-1,record:async()=>{}};
    await assert.rejects(provider.sendTransaction(fake),/Check its status/);
    operation={signal:new AbortController().signal,deadline:Date.now()+180000,record:async()=>{operation=undefined;}};
    await assert.rejects(provider.sendTransaction(fake),/superseded/);
    await assert.rejects(provider.sendTransaction(fake),/No reviewed/);
    assert.equal(broadcasts,0);
  }finally{globalThis.fetch=original;}
});
test('wallet read retries use a testnet fallback and retain the exact query',async()=>{
  const original=globalThis.fetch;const calls:string[]=[];
  try {
    globalThis.fetch=async(url,init)=>{calls.push(String(url));assert.deepEqual(JSON.parse(String(init?.body)).params,{finality:'final'});return calls.length===1?new Response('',{status:503}):Response.json({result:{header:{hash:'final'}}});};
    const result=await walletTransport(()=>undefined).block({finality:'final'});
    assert.equal(result.header.hash,'final');assert.deepEqual(calls,['https://rpc.testnet.fastnear.com','https://rpc.testnet.near.org']);
  }finally{globalThis.fetch=original;}
});
test('late wallet signature is recorded after context switching but cannot broadcast',async()=>{
  const original=globalThis.fetch;let records=0,broadcasts=0;
  let operation:WalletOperation|undefined={signal:new AbortController().signal,deadline:Date.now()+180000,record:async()=>{records++;}};
  const provider=walletTransport(()=>operation);
  try {
    globalThis.fetch=async(_,init)=>{if(JSON.parse(String(init?.body)).method==='send_tx')broadcasts++;return Response.json({result:{header:{hash:'block'}}});};
    await provider.block({finality:'final'});operation=undefined;
    await assert.rejects(provider.sendTransaction(fake),/superseded/);
    assert.equal(records,1);assert.equal(broadcasts,0);
  }finally{globalThis.fetch=original;}
});
