import {test} from "node:test";
import assert from "node:assert/strict";
import {assertSameLiveContext} from "../src/data/config-context.ts";
import type {PublicConfig} from "../src/data/near-adapter.ts";
test("stale browser vault/organization/key/authority cannot display fresh server state under its old target",()=>{
 const config:PublicConfig={network:"testnet",organization:"org",contract:"old.testnet",worker:"worker.testnet",publicKey:"ed25519:public",configured:true,transactionsEnabled:false};
 assertSameLiveContext(config,{...config});
 for(const change of [{contract:"new.testnet"},{organization:"other"},{worker:"other-worker.testnet"},{publicKey:"ed25519:new"},{configured:false},{transactionsEnabled:true},{network:"mainnet"}])assert.throws(()=>assertSameLiveContext(config,{...config,...change} as PublicConfig),/configuration changed/);
});
