import test from "node:test";
import assert from "node:assert/strict";
import {safeRead, wait, RequestError, httpError} from "../src/data/request-policy.ts";
import {getUserMessage} from "../src/data/user-message.ts";
import {api,LiveApiError} from "../src/data/live-request.ts";
import {rpcRequest,withRpcScope} from "../src/server/rpc-request.ts";

test("retry notification does not create extra attempts and preserves rate-limit exhaustion", async () => {
  let calls=0,notifications=0,time=0;
  await assert.rejects(safeRead(async()=>{calls++;throw httpError(429,"2");},{
    now:()=>time,random:()=>0,sleep:async ms=>{assert.ok(ms>=2000);time+=ms;},
    onRetry:()=>{notifications++;},
  }),e=>e instanceof RequestError&&e.category==="rate-limit");
  assert.equal(calls,4);assert.equal(notifications,4);
});

test("Retry-After survives exhaustion and blocks a fresh read from immediately hitting the same endpoint",async()=>{
  const original=globalThis.fetch;let calls=0;
  try {
    globalThis.fetch=async()=>{calls++;return Response.json({error:"Rate limited"},{status:429,headers:{"Retry-After":"3600"}});};
    for(let i=0;i<2;i++)await assert.rejects(api('cooldown-fixture',undefined,undefined,Date.now()+50),e=>e instanceof LiveApiError&&e.status===429&&e.retryAfterMs>0);
    assert.equal(calls,1);
    calls=0;
    for(let i=0;i<2;i++)await assert.rejects(withRpcScope(new AbortController().signal,15000,()=>rpcRequest('https://rate-limit.fixture.test','status',[])),e=>e instanceof RequestError&&e.category==='rate-limit'&&e.retryAfterMs>0);
    assert.equal(calls,1);
  }finally{globalThis.fetch=original;}
});

test("timeout exhaustion stays distinct from rate limits and does not overlap requests",async()=>{
  const keepAlive=setTimeout(()=>{},1000);let active=0,maximum=0;
  try {
    await assert.rejects(safeRead(async signal=>{
      active++;maximum=Math.max(maximum,active);
      try {await wait(100,signal);}finally{active--;}
    },{timeouts:[3,5],sleep:async()=>{}}),e=>e instanceof RequestError&&e.category==="timeout"&&/timed out/.test(e.message));
    assert.equal(maximum,1);assert.equal(active,0);
  }finally{clearTimeout(keepAlive);}
});

test("public failure messages keep execution gates separate from connectivity and unknown transfers",()=>{
  const cases=[
    ["Signing is disabled pending specific testnet authorization", "Owner transactions are disabled"],
    ["Meteor supports message login only", "not supported"],
    ["The contract rejected the recorded transaction", "contract rejected"],
    ["Provider denied access", "provider denied access"],
    ["HTTP 429", "limiting requests"],
    ["The network request timed out", "network request timed out"],
    ["Meteor returned a different network or action.", "Switch your wallet to the network"],
    ["Your message was accepted. RPC unavailable; retry without wallet signature", "without signing again"],
    ["recovery checkpoint is expired", "Payments are blocked"],
    ["Transaction outcome unknown", "payment result isn't confirmed"],
  ];
  for(const [input,expected]of cases)assert.ok(getUserMessage(input).includes(expected),input);
});
