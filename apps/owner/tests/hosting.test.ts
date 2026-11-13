import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {checkEnvironment,pins,sha,verifyPaid,maintenanceServer} from '../../../deploy/hosting.mjs';
import {exportSnapshot,restoreSnapshot,captureSnapshot} from '../../../deploy/snapshot.mjs';
test('maintenance serves health but blocks wallet, private-data and financial requests',async()=>{
 const server=maintenanceServer();await new Promise<void>(resolve=>{ server.listen(0,'127.0.0.1',resolve); });
 try{const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 for(const route of ['/api/health','/','/api/live/identity','/api/live/login','/api/live/enqueue']){const response=await fetch(base+route,{method:route.includes('login')||route.includes('enqueue')?'POST':'GET'});assert.equal(response.status,route==='/api/health'?200:503);assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),{status:'maintenance',paymentsEnabled:false,ownerTransactionsEnabled:false});}
 }finally{await new Promise<void>((resolve,reject)=>{ server.close(error=>error?reject(error):resolve()); });}
});
test('hosted acceptance rejects non-HTTPS origins, ephemeral paths, changed authority and signing configuration',()=>{
 const root=path.resolve(os.tmpdir(),'hosted-config'),env={NNETICS_APP_ORIGIN:'https://nnetics.example.com',NNETICS_NETWORK:'testnet',NNETICS_HOSTED_MAINTENANCE:'1',NNETICS_ORGANIZATION_ID:pins.organization,NNETICS_VAULT_ID:pins.vault,NNETICS_EXPECTED_CODE_HASH:pins.codeHash,NNETICS_WORKER_ID:pins.worker,NNETICS_WORKER_PUBLIC_KEY:pins.publicKey,NNETICS_RPC_URL:'https://test.rpc.fastnear.com',NNETICS_DATABASE:path.join(root,'live/invoices.db'),NNETICS_IDENTITY_DATABASE:path.join(root,'live/identities.db'),NNETICS_CONTRACTOR_DATABASE:path.join(root,'live/contractors.db'),NNETICS_DEMO_PORTAL_DB:path.join(root,'demo/contractors.db')};
 assert.equal(checkEnvironment(env,root).maintenance,true);
 for(const changed of [{NNETICS_APP_ORIGIN:'http://nnetics.example.com'},{NNETICS_APP_ORIGIN:'https://nnetics.example.com/'},{NNETICS_NETWORK:'mainnet'},{NNETICS_DATABASE:'/tmp/invoices.db'},{NNETICS_VAULT_ID:'other.testnet'},{NNETICS_TRANSACTIONS_AUTHORIZED:'testnet-reviewed'},{NNETICS_OWNER_TRANSACTIONS_AUTHORIZED:'testnet-reviewed'},{NNETICS_PAYMENT_EXECUTION_AUTHORIZED:'testnet-reviewed'},{NNETICS_OWNER_TRANSACTION_PLAN:'/private/scope.json'},{NNETICS_OWNER_TRANSACTION_PLAN_SHA256:'fixture'},{NNETICS_PROVISIONING_ENABLED:'testnet-reviewed'},{NNETICS_WORKER_KEY_FILE:'/secret/key'},{OPENROUTER_API_KEY:'test-only'}])assert.throws(()=>checkEnvironment({...env,...changed},root));
});
test('offline snapshot/restore preserves a Paid job and billing history, clears sessions and refuses overwrite or tampering',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nnetics-hosting-'));
 try{
  const payload=JSON.stringify({amount:pins.amount,recipient:pins.recipient,text:'Original billing text'}),signed='test signed public bytes',expected={...pins,payloadSha256:sha(payload),signedSha256:sha(signed)};
  const sources=Object.fromEntries(['invoices.db','identities.db','contractors.db'].map(name=>[name,path.join(directory,name)]));
  let db=new DatabaseSync(sources['invoices.db']);db.exec('PRAGMA journal_mode=WAL; CREATE TABLE invoices(id TEXT,order_id TEXT,state TEXT,hash TEXT,attempt TEXT,payload TEXT,signed TEXT); CREATE TABLE sessions(token TEXT); INSERT INTO sessions VALUES (\'test-token\')');db.prepare('INSERT INTO invoices VALUES (?,?,?,?,?,?,?)').run(pins.id,pins.order,'paid',pins.hash,'1',payload,signed);db.close();
  db=new DatabaseSync(sources['identities.db']);db.exec("CREATE TABLE identity_sessions(token TEXT); INSERT INTO identity_sessions VALUES ('test-token'); CREATE TABLE identity_organizations(id TEXT); INSERT INTO identity_organizations VALUES ('preserved-org')");db.close();
  db=new DatabaseSync(sources['contractors.db']);db.exec("CREATE TABLE demo_sessions(token TEXT); INSERT INTO demo_sessions VALUES ('test-token'); CREATE TABLE demo_bill_history(bill TEXT,payload TEXT); INSERT INTO demo_bill_history VALUES ('invoice','Original billing text')");db.close();
  db=new DatabaseSync(sources['invoices.db']);db.exec("CREATE TABLE organization_members(account TEXT); INSERT INTO organization_members VALUES ('former-viewer')");db.close();
  db=new DatabaseSync(sources['contractors.db']);db.exec("CREATE TABLE demo_links(revoked INTEGER); INSERT INTO demo_links VALUES (0); CREATE TABLE demo_profiles(id TEXT,payload TEXT); CREATE TABLE demo_orders(recipient TEXT); INSERT INTO demo_orders VALUES ('immutable.testnet')");db.prepare('INSERT INTO demo_profiles VALUES (?,?)').run('contractor',JSON.stringify({generation:3,walletVersion:2,wallet:'former-wallet.testnet',linkActive:true,pendingWallet:{id:'old-request'}}));db.close();
  assert.throws(()=>exportSnapshot({sources,destination:path.join(directory,'refused'),expected}),/Stop every writer/);
  const snapshot=path.join(directory,'snapshot'),restored=path.join(directory,'restored');const manifest=exportSnapshot({sources,destination:snapshot,quiesced:true,expected});assert.equal(manifest.payment.hash,pins.hash);
  restoreSnapshot({source:snapshot,destination:restored,quiesced:true,expected});assert.equal(verifyPaid(path.join(restored,'invoices.db'),expected).state,'paid');
  for(const [file,table]of [['invoices.db','sessions'],['identities.db','identity_sessions'],['contractors.db','demo_sessions']]){db=new DatabaseSync(path.join(restored,file),{readOnly:true});assert.equal((db.prepare(`SELECT count(*) n FROM ${table}`).get() as {n:number}).n,0);db.close();}
  db=new DatabaseSync(path.join(restored,'contractors.db'),{readOnly:true});assert.equal((db.prepare('SELECT payload FROM demo_bill_history').get() as {payload:string}).payload,'Original billing text');db.close();
  db=new DatabaseSync(sources['identities.db'],{readOnly:true});assert.equal((db.prepare('SELECT count(*) n FROM identity_sessions').get() as {n:number}).n,1);db.close(); // originals untouched
  const rollback=path.join(directory,'rollback');restoreSnapshot({source:snapshot,destination:rollback,quiesced:true,expected,rollback:true});verifyPaid(path.join(rollback,'invoices.db'),expected);
  db=new DatabaseSync(path.join(rollback,'invoices.db'),{readOnly:true});assert.equal((db.prepare('SELECT count(*) n FROM organization_members').get() as {n:number}).n,0);db.close();
  db=new DatabaseSync(path.join(rollback,'contractors.db'),{readOnly:true});const profile=JSON.parse((db.prepare('SELECT payload FROM demo_profiles').get() as {payload:string}).payload);assert.equal(profile.linkActive,false);assert.equal(profile.wallet,null);assert.equal(profile.pendingWallet,null);assert.equal(profile.generation,4);assert.equal((db.prepare('SELECT revoked FROM demo_links').get() as {revoked:number}).revoked,1);assert.equal((db.prepare('SELECT recipient FROM demo_orders').get() as {recipient:string}).recipient,'immutable.testnet');assert.equal((db.prepare('SELECT payload FROM demo_bill_history').get() as {payload:string}).payload,'Original billing text');db.close();
  captureSnapshot({sources,destination:path.join(directory,'locked-copy'),expected});
  assert.equal(verifyPaid(path.join(directory,'locked-copy/invoices.db'),expected).state,'paid');
  db=new DatabaseSync(sources['identities.db']);db.exec('BEGIN IMMEDIATE; ROLLBACK');db.close(); // locks released
  assert.throws(()=>restoreSnapshot({source:snapshot,destination:restored,quiesced:true,expected}),/must not exist/);
  const bad=JSON.parse(fs.readFileSync(path.join(snapshot,'manifest.json'),'utf8'));bad.entries[0].file='../outside.db';fs.writeFileSync(path.join(snapshot,'manifest.json'),JSON.stringify(bad));assert.throws(()=>restoreSnapshot({source:snapshot,destination:path.join(directory,'unsafe'),quiesced:true,expected}),/Unexpected/);
  bad.entries[0].file='invoices.db';fs.writeFileSync(path.join(snapshot,'manifest.json'),JSON.stringify(bad));fs.appendFileSync(path.join(snapshot,'invoices.db'),'tampering');assert.throws(()=>restoreSnapshot({source:snapshot,destination:path.join(directory,'bad'),quiesced:true,expected}),/checksum mismatch/);
 }finally{assert.ok(directory.startsWith(path.join(os.tmpdir(),'nnetics-hosting-')));fs.rmSync(directory,{recursive:true,force:true});}
});
