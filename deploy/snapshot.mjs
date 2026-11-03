// Private offline migration/backup. Never signs, broadcasts, or changes a job state.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {files,pins,sha,verifyPaid} from './hosting.mjs';
const scrub={
  'invoices.db':['sessions','challenges'],
  'identities.db':['identity_sessions','identity_challenges','identity_browsers'],
  'contractors.db':['demo_sessions','demo_owners','demo_wallet_proofs','contractor_challenges','contractor_extractions'],
};
// Only known public-chain receipts/reports; no key files, logs or arbitrary trees.
export const evidenceFiles=[
  'v3-results-summary.json','v3-contained-final-state.json','v3-app-and-worker-restart.json',
  'v3-outbox/execute_payment.full-receipts.json',
  'v3-outbox/execute_payment.result.json','v3-outbox/pause-after-payment.result.json',
  'v3-outbox/revoke_agent.result.json',
];
function integrity(file){const db=new DatabaseSync(file,{readOnly:true});try{assert.equal(Object.values(db.prepare('PRAGMA integrity_check').get())[0],'ok');}finally{db.close();}}
function stageFor(destination){
  const target=path.resolve(destination);assert.ok(!fs.existsSync(target),'Destination must not exist; never overwrite live databases');
  fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});
  return {target,stage:fs.mkdtempSync(target+'.staging-')};
}
// Briefly exclude writes to every store without shutting down unrelated local apps.
// Each lock is verified through a separate connection before any snapshot begins.
// No source transaction is committed; originals, including sessions, are unchanged.
export function captureSnapshot(options){
  const locks=[];
  try{
    for(const file of files){const db=new DatabaseSync(options.sources[file]),entry={db,started:false};locks.push(entry);db.exec('PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');entry.started=true;}
    for(const file of files){const probe=new DatabaseSync(options.sources[file]);try{assert.throws(()=>probe.exec('BEGIN IMMEDIATE'),/locked|busy/);}finally{probe.close();}}
    return exportSnapshot({...options,quiesced:true});
  }finally{for(const {db,started} of locks.reverse()){try{if(started)db.exec('ROLLBACK');}finally{db.close();}}}
}
/** @param {{sources:Record<string,string>,destination:string,evidenceRoot?:string,quiesced?:boolean,expected?:typeof pins}} options */
export function exportSnapshot({sources,destination,evidenceRoot,quiesced=false,expected=pins}){
  assert.equal(quiesced,true,'Stop every writer and worker before snapshotting all three stores');
  assert.deepEqual(Object.keys(sources).sort(),[...files].sort());
  verifyPaid(sources['invoices.db'],expected);
  const {target,stage}=stageFor(destination),entries=[];
  for(const file of files){
    const output=path.join(stage,file),source=new DatabaseSync(sources[file],{readOnly:true});
    try{source.prepare('VACUUM INTO ?').run(output);}finally{source.close();}
    const copy=new DatabaseSync(output);
    try{copy.exec('PRAGMA journal_mode=DELETE; BEGIN IMMEDIATE');for(const table of scrub[file])if(copy.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))copy.exec(`DELETE FROM ${table}`);copy.exec('COMMIT');}finally{copy.close();}
    integrity(output);fs.chmodSync(output,0o600);entries.push({file,sha256:sha(fs.readFileSync(output))});
  }
  const payment=verifyPaid(path.join(stage,'invoices.db'),expected);
  if(evidenceRoot){for(const file of evidenceFiles){const source=path.join(evidenceRoot,file);assert.ok(fs.statSync(source).isFile(),'Missing payment evidence');const output=path.join(stage,'evidence',file);fs.mkdirSync(path.dirname(output),{recursive:true,mode:0o700});fs.copyFileSync(source,output,fs.constants.COPYFILE_EXCL);fs.chmodSync(output,0o600);entries.push({file:'evidence/'+file,sha256:sha(fs.readFileSync(output))});}}
  const manifest={version:1,createdAt:new Date().toISOString(),quiesced:true,credentialsIncluded:false,sessionsCleared:true,payment,entries};
  fs.writeFileSync(path.join(stage,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600,flag:'wx'});fs.renameSync(stage,target);return manifest;
}
export function restoreSnapshot({source,destination,quiesced=false,expected=pins}){
  assert.equal(quiesced,true,'Maintenance mode and all workers stopped are required');
  const root=path.resolve(source),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
  assert.equal(manifest.version,1);assert.equal(manifest.sessionsCleared,true);assert.equal(manifest.quiesced,true);
  const allowed=new Set([...files,...evidenceFiles.map(f=>'evidence/'+f)]),seen=new Set();
  for(const entry of manifest.entries){assert.ok(allowed.has(entry.file)&&!seen.has(entry.file),'Unexpected/duplicate snapshot file');seen.add(entry.file);const file=path.join(root,entry.file);assert.equal(fs.lstatSync(file).isSymbolicLink(),false);assert.equal(sha(fs.readFileSync(file)),entry.sha256,'Snapshot checksum mismatch');}
  for(const file of files){assert.ok(seen.has(file),'Incomplete database set');integrity(path.join(root,file));}
  verifyPaid(path.join(root,'invoices.db'),expected);
  const {target,stage}=stageFor(destination);
  for(const entry of manifest.entries){const output=path.join(stage,entry.file);fs.mkdirSync(path.dirname(output),{recursive:true,mode:0o700});fs.copyFileSync(path.join(root,entry.file),output,fs.constants.COPYFILE_EXCL);fs.chmodSync(output,0o600);}
  fs.copyFileSync(path.join(root,'manifest.json'),path.join(stage,'manifest.json'),fs.constants.COPYFILE_EXCL);
  fs.renameSync(stage,target);return manifest;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const [mode,source,destination,confirmation]=process.argv.slice(2);
  assert.equal(confirmation,mode==='capture'?'--lock-writers':'--quiesced','Explicit offline/maintenance or lock confirmation required');
  if(mode==='capture')captureSnapshot({sources:{'invoices.db':path.join(source,'grandtheft-payments.db'),'identities.db':path.join(source,'identities.db'),'contractors.db':path.join(source,'contractors.db')},destination,evidenceRoot:path.resolve(source,'../payment-acceptance')});
  else if(mode==='export'||mode==='backup')exportSnapshot({sources:{'invoices.db':path.join(source,mode==='export'?'grandtheft-payments.db':'invoices.db'),'identities.db':path.join(source,'identities.db'),'contractors.db':path.join(source,'contractors.db')},destination,evidenceRoot:mode==='export'?path.resolve(source,'../payment-acceptance'):path.join(source,'evidence'),quiesced:true});
  else if(mode==='restore')restoreSnapshot({source,destination,quiesced:true});
  else throw Error('Use: node deploy/snapshot.mjs export|backup|restore SOURCE NEW_DESTINATION --quiesced');
  console.log('Private snapshot verified; existing payment state preserved. No transactions sent.');
}
