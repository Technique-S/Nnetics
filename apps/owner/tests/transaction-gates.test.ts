import {test} from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {configureOwnerScope} from './fixtures/owner-scope.ts';
import {transactionCapabilities,requireOwnerTransactions,assertOwnerScope,assertOwnerScopeInput,paymentExecutionEnabled} from '../src/server/transaction-gates.ts';
import {WorkerNearTransport} from '../src/server/signer.ts';
import {liveConfig} from '../src/server/config.ts';
import {provisioningConfig} from '../src/server/provisioning.ts';
test('owner and payment gates are independent, fail closed and never inherit the legacy flag',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-gates-')),scope=configureOwnerScope(directory);
 try {
  const enabled=transactionCapabilities();assert.equal(enabled.ownerTransactionsEnabled,true);assert.equal(enabled.transactionsEnabled,true);assert.equal(enabled.paymentExecutionEnabled,false);
  const worker=new WorkerNearTransport(liveConfig());let reads=0;worker.rpc.finalized=async()=>{reads++;throw Error('must not read chain or load key');};
  await assert.rejects(worker.prepare({order_id:'order',invoice_id:'invoice',recipient:'vendor.testnet',amount:'1'}),/not authorized/);await assert.rejects(worker.broadcast('never-decode'),/authorization required/);assert.equal(reads,0);
  process.env.NNETICS_OWNER_TRANSACTIONS_AUTHORIZED='';process.env.NNETICS_PAYMENT_EXECUTION_AUTHORIZED='testnet-reviewed';assert.equal(transactionCapabilities().ownerTransactionsEnabled,false);assert.equal(paymentExecutionEnabled(),true);assert.throws(()=>requireOwnerTransactions(),/disabled/);
  process.env.NNETICS_PAYMENT_EXECUTION_AUTHORIZED='';process.env.NNETICS_TRANSACTIONS_AUTHORIZED='testnet-reviewed';assert.equal(transactionCapabilities().transactionsEnabled,false);assert.equal(paymentExecutionEnabled(),false);
  for(const value of ['true','1','TESTNET-REVIEWED','']){process.env.NNETICS_OWNER_TRANSACTIONS_AUTHORIZED=value;process.env.NNETICS_PAYMENT_EXECUTION_AUTHORIZED=value;assert.equal(transactionCapabilities().transactionsEnabled,false);assert.equal(paymentExecutionEnabled(),false);}
  process.env.NNETICS_OWNER_TRANSACTIONS_AUTHORIZED='testnet-reviewed';delete process.env.NNETICS_OWNER_TRANSACTION_PLAN;assert.throws(()=>requireOwnerTransactions(),/hash-verified/);process.env.NNETICS_OWNER_TRANSACTION_PLAN=scope.file;process.env.NNETICS_OWNER_TRANSACTION_PLAN_SHA256='0'.repeat(64);assert.throws(()=>requireOwnerTransactions(),/hash-verified/);
 }finally{scope.close();fs.rmSync(directory,{recursive:true,force:true});}
});
test('owner-only configuration cannot start a worker; incomplete worker configuration also fails closed',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-worker-gate-')),scope=configureOwnerScope(directory);
 try {
  const env={...process.env,NNETICS_NETWORK:'testnet',NNETICS_ORGANIZATION_ID:'org',NNETICS_VAULT_ID:'vault.testnet',NNETICS_WORKER_ID:'worker.testnet',NNETICS_WORKER_PUBLIC_KEY:'fixture-public',NNETICS_EXPECTED_CODE_HASH:'1'.repeat(32),NNETICS_WORKER_KEY_FILE:'',NNETICS_RPC_URL:'https://never-contact.fixture.invalid',NNETICS_PAYMENT_EXECUTION_AUTHORIZED:''};
  const stopped=spawnSync(process.execPath,['src/server/worker-cli.ts','--once'],{env,encoding:'utf8',timeout:15000});assert.notEqual(stopped.status,0);assert.match(stopped.stderr,/Worker disabled/);
  const missing=spawnSync(process.execPath,['src/server/worker-cli.ts','--once'],{env:{...env,NNETICS_PAYMENT_EXECUTION_AUTHORIZED:'testnet-reviewed',NNETICS_VAULT_ID:''},encoding:'utf8',timeout:15000});assert.notEqual(missing.status,0);assert.match(missing.stderr,/Complete testnet configuration/);
 }finally{scope.close();fs.rmSync(directory,{recursive:true,force:true});}
});
test('scope configuration and operation shape reject all changes to the acceptance action',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-scope-gate-')),f=configureOwnerScope(directory);
 try {
  const scope=requireOwnerTransactions(),input={action:'reserve',transport:'meteor',method:'fund_storage',args:{},deposit:'1000000000000000000'};
  assert.doesNotThrow(()=>assertOwnerScopeInput(scope,input));
  for(const change of [{method:'deposit'},{method:'set_budget'},{method:'set_paused',args:{paused:false}},{method:'authorize_agent'},{args:{unexpected:true}},{args:[]},{deposit:'1'},{deposit:1000000000000000000},{gas:'200000000000000'},{actions:[{},{}]},{signerId:'other.testnet'},{contract:'other.testnet'},{receiverId:'other.testnet'},{network:'mainnet'},{organization:'other'},{transport:'nightly'}])assert.throws(()=>assertOwnerScopeInput(scope,{...input,...change}),/scope/);
  const config={network:'testnet',organization:'org',contract:'vault.testnet',codeHash:'1'.repeat(32)};
  assert.doesNotThrow(()=>assertOwnerScope(scope,config,'owner.testnet'));
  for(const change of [{network:'mainnet'},{organization:'other'},{contract:'other.testnet'},{codeHash:'2'.repeat(32)}])assert.throws(()=>assertOwnerScope(scope,{...config,...change},'owner.testnet'),/scope/);
  assert.throws(()=>assertOwnerScope(scope,config,'other.testnet'),/scope/);
  f.plan.transactions[0].actions.push({...f.plan.transactions[0].actions[0]});f.save();assert.throws(()=>requireOwnerTransactions(),/hash-verified/);
 }finally{f.close();fs.rmSync(directory,{recursive:true,force:true});}
});
test('provisioning retains its own independent permission boundary',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-provisioning-gates-')),scope=configureOwnerScope(directory),previous=process.env.NNETICS_PROVISIONING_ENABLED;
 try{process.env.NNETICS_PROVISIONING_ENABLED='';process.env.NNETICS_PAYMENT_EXECUTION_AUTHORIZED='testnet-reviewed';assert.equal(provisioningConfig().enabled,false);process.env.NNETICS_PROVISIONING_ENABLED='testnet-reviewed';process.env.NNETICS_OWNER_TRANSACTIONS_AUTHORIZED='';process.env.NNETICS_PAYMENT_EXECUTION_AUTHORIZED='';assert.equal(provisioningConfig().enabled,true);assert.equal(transactionCapabilities().ownerTransactionsEnabled,false);assert.equal(paymentExecutionEnabled(),false);}
 finally{if(previous===undefined)delete process.env.NNETICS_PROVISIONING_ENABLED;else process.env.NNETICS_PROVISIONING_ENABLED=previous;scope.close();fs.rmSync(directory,{recursive:true,force:true});}
});
