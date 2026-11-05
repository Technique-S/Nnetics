import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {ownerAttempt} from '../src/server/owner-attempt.ts';
import type {OrganizationService} from '../src/server/organization-api.ts';

test('historical owner attempts remain reconcilable with new signing gates disabled; only verified evidence releases them',async()=>{
  const db=new DatabaseSync(':memory:');let unknown=true, wrong=false;
  const hash='1'.repeat(44),publicKey='ed25519:mock';
  const s={queue:{db},auth:{authorize:async()=>({access:{organization:'org',accountId:'owner.testnet'},block:{hash:'block'}}),verify:()=>({public_key:publicKey})},chain:{config:{contract:'vault.testnet'},rpc:async(method:string)=>{
    if(method==='query')return {nonce:12};
    if(unknown)throw new TypeError('lost response');
    return {final_execution_status:'FINAL',transaction:{hash,signer_id:'owner.testnet',receiver_id:wrong?'other.testnet':'vault.testnet',public_key:publicKey,nonce:13,actions:[{FunctionCall:{method_name:'deposit',deposit:'100',args:'e30='}}]},status:{SuccessValue:''}};
  }}} as unknown as OrganizationService;
  try {
    const attempt={id:'historical-attempt',method:'deposit',args:{},publicKey,nonceFloor:'12',deposit:'100',state:'unknown',hash:''};
    db.exec('CREATE TABLE owner_wallet_attempts (scope TEXT PRIMARY KEY,payload TEXT NOT NULL)');db.prepare('INSERT INTO owner_wallet_attempts VALUES (?,?)').run('org:owner.testnet',JSON.stringify(attempt));
    const results=await Promise.all([ownerAttempt(s,'session'),ownerAttempt(s,'session')]);assert.ok(results.every(r=>r.id===attempt.id));
    // A new service invocation reads the durable record rather than creating another.
    assert.equal((await ownerAttempt(s,'session'))?.id,attempt.id);
    await ownerAttempt(s,'session',{action:'hash',id:attempt.id,hash});
    await assert.rejects(ownerAttempt(s,'session'),/lost response/);
    await assert.rejects(ownerAttempt(s,'session',{action:'reserve',method:'deposit',args:{},deposit:'100'}),/disabled/);
    unknown=false;wrong=true;await assert.rejects(ownerAttempt(s,'session'),/differs/);
    wrong=false;const confirmed=await ownerAttempt(s,'session');assert.equal(confirmed.state,'confirmed');
    assert.equal(await ownerAttempt(s,'session'),null);
    assert.equal((db.prepare('SELECT count(*) AS n FROM owner_wallet_history').get() as {n:number}).n,1);
  }finally{db.close();}
});

test('wallet rejection releases only the matching pre-submission record',async()=>{
  const db=new DatabaseSync(':memory:');
  const s={queue:{db},auth:{authorize:async()=>({access:{organization:'org',accountId:'owner.testnet'},block:{hash:'block'}}),verify:()=>({public_key:'public'})},chain:{rpc:async()=>({nonce:1})}} as unknown as OrganizationService;
  try {
    const attempt={id:'historical-rejected',method:'deposit',args:{},publicKey:'public',nonceFloor:'1',deposit:'10',state:'unknown',hash:''};
    db.exec('CREATE TABLE owner_wallet_attempts (scope TEXT PRIMARY KEY,payload TEXT NOT NULL)');db.prepare('INSERT INTO owner_wallet_attempts VALUES (?,?)').run('org:owner.testnet',JSON.stringify(attempt));
    await assert.rejects(ownerAttempt(s,'session',{action:'rejected',id:'different'}));
    await ownerAttempt(s,'session',{action:'rejected',id:attempt.id});
    assert.equal(await ownerAttempt(s,'session'),null);
  }finally{db.close();}
});
