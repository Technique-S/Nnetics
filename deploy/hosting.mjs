import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import http from 'node:http';
export const pins=JSON.parse(fs.readFileSync(new URL('./paid-evidence.json',import.meta.url),'utf8'));
export const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
export const files=['invoices.db','identities.db','contractors.db'];
export function maintenanceServer(){
  return http.createServer((req,res)=>{res.writeHead(req.url==='/api/health'?200:503,{'Content-Type':'application/json','Cache-Control':'no-store','Retry-After':'60'});res.end(JSON.stringify({status:'maintenance',paymentsEnabled:false}));});
}
export function checkEnvironment(env,root='/var/data/nnetics') {
  const origin=new URL(env.NNETICS_APP_ORIGIN||'');
  assert.equal(origin.protocol,'https:','Hosted origin must use HTTPS');
  assert.equal(origin.origin,env.NNETICS_APP_ORIGIN,'Use an exact origin with no path/trailing slash');
  assert.equal(env.NNETICS_NETWORK,'testnet');
  for(const name of ['NNETICS_TRANSACTIONS_AUTHORIZED','NNETICS_PROVISIONING_ENABLED','NNETICS_WORKER_KEY_FILE','NNETICS_SETUP_KEY_FILE','NNETICS_SETUP_KEYCHAIN_CLI','NNETICS_DEPLOYMENT_APPROVED_PLAN_SHA256','OPENROUTER_API_KEY'])
    assert.ok(!env[name],`${name} must be absent/empty for hosted acceptance`);
  assert.ok(['0','1'].includes(env.NNETICS_HOSTED_MAINTENANCE),'Set maintenance to 1 or 0');
  const expected={NNETICS_ORGANIZATION_ID:pins.organization,NNETICS_VAULT_ID:pins.vault,NNETICS_EXPECTED_CODE_HASH:pins.codeHash,NNETICS_WORKER_ID:pins.worker,NNETICS_WORKER_PUBLIC_KEY:pins.publicKey};
  for(const [key,value]of Object.entries(expected))assert.equal(env[key],value,`Unexpected ${key}`);
  const rpc=new URL(env.NNETICS_RPC_URL||'');assert.equal(rpc.protocol,'https:');
  const keys=['NNETICS_DATABASE','NNETICS_IDENTITY_DATABASE','NNETICS_CONTRACTOR_DATABASE'];
  keys.forEach((key,i)=>assert.equal(path.resolve(env[key]||''),path.resolve(root,'live',files[i]),`Unexpected ${key}`));
  assert.equal(path.resolve(env.NNETICS_DEMO_PORTAL_DB||''),path.resolve(root,'demo/contractors.db'));
  return {origin:origin.origin,root,live:path.join(root,'live'),maintenance:env.NNETICS_HOSTED_MAINTENANCE==='1'};
}
export function verifyPaid(file,expected=pins) {
  const db=new DatabaseSync(file,{readOnly:true});
  try {
    assert.equal(Object.values(db.prepare('PRAGMA integrity_check').get())[0],'ok');
    const rows=db.prepare('SELECT * FROM invoices').all();assert.equal(rows.length,1,'Acceptance queue must contain exactly the preserved job');
    const job=rows[0],invoice=JSON.parse(job.payload);
    assert.equal(job.id,expected.id);assert.equal(job.order_id,expected.order);assert.equal(job.state,'paid');assert.equal(job.hash,expected.hash);assert.equal(job.attempt,'1');
    assert.equal(invoice.amount,expected.amount);assert.equal(invoice.recipient,expected.recipient);
    assert.equal(sha(job.payload),expected.payloadSha256);assert.equal(sha(job.signed),expected.signedSha256);
    return {id:job.id,state:job.state,hash:job.hash,attempt:job.attempt};
  }finally{db.close();}
}
