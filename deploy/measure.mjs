// Production-server measurement with disposable SYNTHETIC records only.
// Never reads/copies the live databases, wallet keys, or user invitation links.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
const app=path.resolve(import.meta.dirname,'../apps/owner'),stateRoot=process.env.NNETICS_MEASURE_STATE_ROOT||os.tmpdir(),root=fs.mkdtempSync(path.join(stateRoot,'nnetics-measure-'));
const server=net.createServer();await new Promise(resolve=>{ server.listen(0,'127.0.0.1',resolve); });
const port=server.address().port;await new Promise(resolve=>{ server.close(resolve); });
const base=`http://127.0.0.1:${port}`,duration=Number(process.env.NNETICS_MEASURE_SECONDS||30)*1000;
assert.ok(duration>=10000&&duration<=300000);
let child,timer;const samples=[],latencies=[];
const env={...process.env,NODE_ENV:'production',NODE_OPTIONS:'',NEXT_TELEMETRY_DISABLED:'1',NNETICS_BUILD_DIRECTORY:process.env.NNETICS_MEASURE_BUILD_DIRECTORY||'.next',NNETICS_APP_ORIGIN:base,NNETICS_NETWORK:'testnet',NNETICS_ORGANIZATION_ID:'',NNETICS_VAULT_ID:'unconfigured.testnet',NNETICS_WORKER_ID:'unconfigured-worker.testnet',NNETICS_WORKER_PUBLIC_KEY:'',NNETICS_EXPECTED_CODE_HASH:'',NNETICS_DATABASE:path.join(root,'invoices.db'),NNETICS_IDENTITY_DATABASE:path.join(root,'identities.db'),NNETICS_CONTRACTOR_DATABASE:path.join(root,'contractors.db'),NNETICS_DEMO_PORTAL_DB:path.join(root,'demo.db')};
for(const key of ['NNETICS_TRANSACTIONS_AUTHORIZED','NNETICS_OWNER_TRANSACTIONS_AUTHORIZED','NNETICS_PAYMENT_EXECUTION_AUTHORIZED','NNETICS_OWNER_TRANSACTION_PLAN','NNETICS_OWNER_TRANSACTION_PLAN_SHA256','NNETICS_PROVISIONING_ENABLED','NNETICS_WORKER_KEY_FILE','NNETICS_SETUP_KEY_FILE','NNETICS_SETUP_KEYCHAIN_CLI','NNETICS_DEPLOYMENT_APPROVED_PLAN_SHA256','OPENROUTER_API_KEY'])env[key]='';
const sleep=ms=>new Promise(resolve=>{ setTimeout(resolve,ms); });
function sample(){
 if(!child||child.exitCode!==null)return;
 if(process.platform==='linux'){
  const status=fs.readFileSync(`/proc/${child.pid}/status`,'utf8'),read=key=>Number(status.match(new RegExp(`^${key}:\\s+(\\d+)`,'m'))?.[1]||0)*1024;
  samples.push({rss:read('VmRSS'),peak:read('VmHWM')});
 }else if(process.platform==='win32'){
  const output=execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${child.pid} | Select-Object WorkingSet64,PeakWorkingSet64,PrivateMemorySize64 | ConvertTo-Json -Compress`],{encoding:'utf8',windowsHide:true});
  const stats=JSON.parse(output);samples.push({rss:stats.WorkingSet64,peak:stats.PeakWorkingSet64,private:stats.PrivateMemorySize64});
 }
}
async function start(){
 child=spawn(process.execPath,['--dns-result-order=ipv4first','node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:app,env,stdio:'ignore',windowsHide:true});
 let ready=false;
 for(let i=0;i<150;i++){if(child.exitCode!==null)throw Error('Isolated production server exited');try{if((await fetch(base+'/api/live/config')).ok){ready=true;break;}}catch{}await sleep(200);}
 assert.ok(ready,'Production server did not become ready');sample();
}
async function stop(){if(!child||child.exitCode!==null)return;const processToStop=child;await new Promise(resolve=>{processToStop.once('exit',resolve);processToStop.kill('SIGTERM');});child=undefined;}
function actor(){const jar=new Map();return {jar};}
async function request(actor,url,body){
 const before=performance.now(),response=await fetch(base+url,{method:body===undefined?'GET':'POST',headers:{Origin:base,Cookie:[...actor.jar].map(([k,v])=>`${k}=${v}`).join(';'),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});
 for(const item of response.headers.getSetCookie()){const [name,value]=item.split(';')[0].split('=');actor.jar.set(name,value);}
 latencies.push(performance.now()-before);if(!response.ok)throw Error(`Synthetic benchmark HTTP ${response.status} at ${url}`);return response.json();
}
try{
 await start();timer=setInterval(sample,process.platform==='win32'?2500:250);
 const owner=actor();await request(owner,'/api/demo/contractors/owner/start',{});const contractors=[];
 for(let i=0;i<3;i++){
  await request(owner,'/api/demo/contractors/owner',{action:'create-profile',name:`Synthetic writer ${i+1}`});
  const profile=(await request(owner,'/api/demo/contractors/owner')).profiles[i];
  const link=await request(owner,'/api/demo/contractors/owner',{action:'issue-link',profileId:profile.id}),person=actor();await request(person,'/api/demo/contractors/enter',{token:link.token});
  const account=`synthetic-${i+1}.testnet`,proof=await request(person,'/api/demo/contractors/contractor',{action:'wallet-challenge',account});await request(person,'/api/demo/contractors/contractor',{action:'wallet-proof',challenge:proof.challenge});
  const pending=(await request(person,'/api/demo/contractors/contractor')).profile.pendingWallet;
  await request(owner,'/api/demo/contractors/owner',{action:'approve-wallet',profileId:profile.id,requestId:pending.id});
  await request(owner,'/api/demo/contractors/owner',{action:'create-order',profileId:profile.id,reference:`MEASURE-${i+1}`,title:'Synthetic benchmark only',amount:'0.001'});
  const order=(await request(person,'/api/demo/contractors/contractor')).orders[0];
  const input={action:'submit-invoice',submissionId:`synthetic-request-${i+1}`,fields:{orderId:order.id,amount:'0.001',asset:'NEAR',recipient:account},text:`Synthetic delivery for MEASURE-${i+1}. Requesting 0.001 NEAR on testnet.`,description:'Synthetic benchmark only'};
  const invoice=(await request(person,'/api/demo/contractors/contractor',input)).invoice;
  // Exercise the actual multipart handler at the supported one-MiB file bound.
  const pdf=new Uint8Array(1048576);pdf.set(Buffer.from('%PDF-1.4\nSynthetic benchmark only\n'));
  const form=new FormData();form.set('file',new Blob([pdf],{type:'application/pdf'}),'synthetic.pdf');
  const upload=await fetch(base+'/api/demo/contractors/upload',{method:'POST',headers:{Origin:base,Cookie:[...person.jar].map(([k,v])=>`${k}=${v}`).join(';')},body:form});assert.equal(upload.status,200);await upload.json();
  contractors.push({person,link:link.token,profileId:profile.id,input,invoiceId:invoice.id});
 }
 const loaded=Date.now();let rounds=0;
 do{await Promise.all([request(owner,'/api/demo/contractors/owner'),...contractors.map(c=>request(c.person,'/api/demo/contractors/contractor'))]);rounds++;await sleep(50);}while(Date.now()-loaded<duration);
 sample();clearInterval(timer);timer=undefined;await stop();await start();
 const restored=await request(owner,'/api/demo/contractors/owner');assert.equal(restored.profiles.length,3);assert.equal(restored.invoices.length,3);
 for(const c of contractors){const snapshot=await request(c.person,'/api/demo/contractors/contractor');assert.equal(snapshot.invoices.length,1);assert.equal(snapshot.invoices[0].id,c.invoiceId);const replies=await Promise.all([request(c.person,'/api/demo/contractors/contractor',c.input),request(c.person,'/api/demo/contractors/contractor',c.input)]);assert.ok(replies.every(r=>r.invoice.id===c.invoiceId));}
 const fresh=actor();await request(fresh,'/api/demo/contractors/enter',{token:contractors[0].link});assert.equal((await request(fresh,'/api/demo/contractors/contractor')).invoices[0].id,contractors[0].invoiceId);
 await request(owner,'/api/demo/contractors/owner',{action:'revoke-link',profileId:contractors[0].profileId});
 await assert.rejects(()=>request(fresh,'/api/demo/contractors/contractor'),/403/);
 const toMiB=bytes=>Math.round(bytes/1048576*100)/100,sorted=latencies.sort((a,b)=>a-b);
 const cgroup=process.env.NNETICS_MEASURE_CGROUP==='1'?{peakMiB:toMiB(Number(fs.readFileSync('/sys/fs/cgroup/memory.peak','utf8'))),limitMiB:toMiB(Number(fs.readFileSync('/sys/fs/cgroup/memory.max','utf8')))}:null;
 const report={measuredAt:new Date().toISOString(),runtime:process.version,platform:process.platform,productionNext:true,fixtureOnly:true,workload:{contractors:3,invoices:3,concurrentReaders:4,maxUploadBytes:1048576,durationSeconds:Math.round((Date.now()-loaded)/1000),rounds},memory:{samples:samples.length,peakProcessRssMiB:toMiB(Math.max(...samples.map(s=>s.peak))),maxSampledRssMiB:toMiB(Math.max(...samples.map(s=>s.rss))),cgroup},latency:{requests:sorted.length,p95Milliseconds:Math.round(sorted[Math.floor(sorted.length*.95)])},restart:{ownerSession:true,contractorSessions:true,privateLink:true,invoices:true,duplicateSubmissionBlocked:true,revocation:true},liveMeteor:false,transactionsSent:0};
 if(process.env.NNETICS_MEASURE_OUTPUT)fs.writeFileSync(process.env.NNETICS_MEASURE_OUTPUT,JSON.stringify(report,null,2),{mode:0o600});
 console.log(JSON.stringify(report,null,2));
 if(cgroup)assert.ok(cgroup.peakMiB<cgroup.limitMiB*.8,'Less than 20% memory headroom under this defined load');
}finally{if(timer)clearInterval(timer);await stop();assert.ok(root.startsWith(path.join(stateRoot,'nnetics-measure-')));fs.rmSync(root,{recursive:true,force:true});}
