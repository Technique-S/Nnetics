// Compares private database contents by digest; never prints rows, tokens or text.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {files,sha,verifyPaid} from './hosting.mjs';
const ephemeral=new Set(['sessions','challenges','identity_sessions','identity_challenges','identity_browsers','demo_sessions','demo_owners','demo_wallet_proofs','contractor_challenges','contractor_extractions']);
const quote=name=>'"'+name.replaceAll('"','""')+'"';
function summary(file){
 const db=new DatabaseSync(file,{readOnly:true});
 try{
  assert.equal(Object.values(db.prepare('PRAGMA integrity_check').get())[0],'ok');
  const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  return tables.filter(t=>!ephemeral.has(t.name)).map(t=>{
   const rows=db.prepare('SELECT * FROM '+quote(t.name)).all().map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,value instanceof Uint8Array?{bytes:value.byteLength,sha256:sha(value)}:value])));
   return {table:t.name,rows:rows.length,sha256:sha(rows.map(row=>sha(JSON.stringify(row))).sort().join('\n'))};
  });
 }finally{db.close();}
}
export function verifyMigration(source,destination){
 const stores=files.map(file=>{
  const original=path.join(source,file==='invoices.db'?'grandtheft-payments.db':file),copy=path.join(destination,file),before=summary(original),after=summary(copy);
  assert.deepEqual(after,before,`Persistent data mismatch in ${file}; do not roll out`);
  return {file,tables:before.length,rows:before.reduce((n,t)=>n+t.rows,0),persistentDataMatches:true};
 });
 const payment=verifyPaid(path.join(destination,'invoices.db'));
 return {checkedAt:new Date().toISOString(),stores,payment,sessionsDeliberatelyClearedForNewOrigin:true,transactionsSent:0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [source,destination,output]=process.argv.slice(2),result=verifyMigration(source,destination);
 if(output)fs.writeFileSync(output,JSON.stringify(result,null,2),{mode:0o600});
 console.log('All persistent tables, original billing/attachments, authority bindings and the single Paid job match. No rows or tokens printed.');
}
