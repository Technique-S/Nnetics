// Local verification only. Does not read credentials, sign or broadcast.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Transaction,baseEncode,createTransaction,actions,PublicKey,baseDecode} from 'near-api-js';
import {verifySetupSignature} from './setup-signature.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const digest=b=>crypto.createHash('sha256').update(b).digest();
const p=load('artifacts/live/approved-factory-cli-infrastructure.json');
const plan=load('docs/CLI_FACTORY_HANDOFF_PLAN.json');
const approved='bca85c64ac11e4a0a14808d290980c47db89353fa2450930f34022291cc91ae8';
if(plan.digest!==approved||digest(JSON.stringify(plan.plan)).toString('hex')!==approved||p.amendment_digest!==approved)throw Error('Approval mismatch');
const wasm=fs.readFileSync(path.join(root,'artifacts/github/07181a0-provisioning-88/provisioning/factory.wasm'));
if(wasm.length!==plan.plan.actions[2].code_bytes||digest(wasm).toString('hex')!==plan.plan.actions[2].code_sha256)throw Error('Artifact mismatch');
const expected=createTransaction(plan.plan.signer,PublicKey.fromString(plan.plan.public_key),plan.plan.receiver,BigInt(p.nonce),[actions.createAccount(),actions.transfer(BigInt(plan.plan.actions[1].deposit)),actions.deployContract(wasm)],baseDecode(p.finalized_block));
const unsigned=Buffer.from(p.unsigned,'base64');
if(!Buffer.from(expected.encode()).equals(unsigned)||!Buffer.from(Transaction.decode(unsigned).encode()).equals(unsigned)||digest(unsigned).toString('hex')!==p.unsigned_sha256||baseEncode(digest(unsigned))!==p.hash)throw Error('Prepared bytes differ');
const saved=load('artifacts/live/approved-factory-cli-infrastructure.cli-signed.json');
if(typeof saved.signed_transaction_as_base64!=='string')throw Error('Unexpected signed-file format; do not broadcast');
const verified=verifySetupSignature(expected,saved.signed_transaction_as_base64);
const file=path.join(root,'artifacts/live/approved-factory-cli-infrastructure.verified.json');
const fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify({amendment_digest:approved,verified_at:new Date().toISOString(),signer:p.signer,public_key:p.public_key,nonce:p.nonce,hash:verified.hash,signed:verified.signed},null,2));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
console.log(JSON.stringify({signature_verified:true,hash:verified.hash,signer:p.signer,public_key:p.public_key,nonce:p.nonce,broadcast:false}));
