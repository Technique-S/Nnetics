import {test} from "node:test";
import assert from "node:assert/strict";
import {validateBootstrapSets,validateBootstrapAge} from "../src/server/bootstrap-inputs.ts";
test("acceptance bootstrap age rejects future/stale timestamps without changing the trusted anchor",()=>{
 const day=24n*3600n*1000000000n;
 validateBootstrapAge("1",day+1n);
 assert.throws(()=>validateBootstrapAge("1",day+2n));
 assert.throws(()=>validateBootstrapAge("2",1n));
 assert.throws(()=>validateBootstrapAge("bad",1n));
});
const v={validator_stake_struct_version:"V1",account_id:"validator.testnet",public_key:"ed25519:11111111111111111111111111111111",stake:"10"};
test("bootstrap collection rejects duplicate/zero/overflow/unsupported sets and malformed approval slots",()=>{
 validateBootstrapSets([v],[v],[null]);
 for(const set of [[],[v,v],[{...v,stake:"0"}],[{...v,stake:"-1"}],[{...v,stake:(1n<<128n).toString()}],[{...v,stake:((1n<<128n)-1n).toString()},{...v,account_id:"other.testnet"}],[{...v,public_key:"secp256k1:bad"}],[{...v,account_id:"bad..testnet"}],Array(129).fill(v)])assert.throws(()=>validateBootstrapSets(set,[v],[]));
 for(const approvals of [Array(257).fill(null),[false],["secp256k1:bad"]])assert.throws(()=>validateBootstrapSets([v],[v],approvals));
});
