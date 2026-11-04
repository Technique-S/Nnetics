// Read-only UI audit. All authenticated scenarios use intercepted synthetic data.
// No cookies, tokens, databases or wallet providers are imported.
import {chromium} from '../../apps/owner/node_modules/playwright-core/index.mjs';
import {MockOwnerAdapter} from '../../apps/owner/src/data/mock-adapter.ts';
import {mkdir,writeFile} from 'node:fs/promises';
const out=new URL('./evidence/',import.meta.url);await mkdir(out,{recursive:true});
const base='http://localhost:3101';
const browser=await chromium.launch({channel:'msedge',headless:true});
const profile={id:'design-profile',name:'Ada Brooks · audit fixture',wallet:'writer-demo.testnet',walletVersion:1,generation:1,linkActive:true,pendingWallet:null};
const order={id:'design-order',reference:'ARTICLE-001',contractorId:profile.id,title:'One research article',amount:'0.001',recipient:'writer-demo.testnet'};
const bill={id:'design-invoice',reference:'CTR-0042-INV-0001',contractorId:profile.id,orderId:order.id,orderReference:order.reference,amount:'0.001',asset:'NEAR',recipient:order.recipient,text:'Delivered one research article for ARTICLE-001. Requesting 0.001 NEAR.',originalText:'Delivered one research article for ARTICLE-001. Requesting 0.001 NEAR.',description:'One research article',status:'Needs clarification',reasons:['Confirm the work description.'],ownerNote:'Please confirm the delivered article.',attachment:null,transactionUrl:null,submittedAt:'2026-11-04T00:00:00Z'};
const records={mode:'persistent',profiles:[profile],orders:[order],invoices:[bill]};
const results=[];
async function setup({width=1440,height=900,mode='owner',state='normal'}={}){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const snapshot=await new MockOwnerAdapter(0).snapshot();snapshot.mode='testnet';snapshot.protocolVersion=88;snapshot.blockHash='audit-fixture-finalized-block';snapshot.vault.paused=true;snapshot.vault.agent=null;
 snapshot.access={organization:'2d567faa-28c4-4ee7-a19f-designfixture',accountId:'owner-demo.testnet',role:state==='viewer'?'viewer':'owner',vaultOwner:snapshot.vault.owner};
 if(state==='zero-pending')snapshot.payments=snapshot.payments.filter(p=>p.status!=='Pending');
 if(state==='zero-budget'){snapshot.vault.budget='0';snapshot.vault.spent='0';snapshot.vault.reserved='0';snapshot.vault.funded='0';snapshot.payments=[];snapshot.orders=[];snapshot.invoices=[];snapshot.vendors=[];}
 const config={network:'testnet',organization:snapshot.access.organization,contract:'vault.owner-demo.testnet',worker:'worker.owner-demo.testnet',publicKey:'ed25519:fixture',configured:state!=='empty'&&state!=='draft',transactionsEnabled:false};
 await page.route('**/api/**',async route=>{
   const url=new URL(route.request().url()),path=url.pathname.replace('/api/live/','');
   const answer=(json,status=200)=>route.fulfill({json,status});
   if(mode==='public'){
    if(path==='config')return answer(config);
    if(path==='identity')return answer({error:state==='expired'?'Your five-hour session expired. Verify your wallet to continue.':'Sign in to continue.'},401);
   }
   if(path==='config')return answer(config);
   if(path==='identity'){
    if(state==='restoring')await new Promise(r=>setTimeout(r,1800));
    if(state==='rpc-error')return answer({error:'Cannot reach NEAR testnet verification. Your session is retained.',retryable:true},503);
    return answer({accountId:'owner-demo.testnet',network:'testnet',organizations:state==='empty'?[]:[{id:config.organization,name:'Content studio',status:state==='draft'?'unprovisioned':'ready',role:state==='viewer'?'viewer':'owner'}],notice:'Audit fixture · no real account data',session:{idleExpires:Date.now()+18000000,absoluteExpires:Date.now()+18000000,serverTime:Date.now()}});
   }
   if(path==='session'||path==='session/renew')return answer({accountId:'owner-demo.testnet',idleExpires:Date.now()+18000000,absoluteExpires:Date.now()+18000000,serverTime:Date.now()});
   if(path==='snapshot')return answer(snapshot);
   if(path==='organization')return answer({id:config.organization,name:'Content studio'});
   if(path==='provisioning')return answer({configured:false,enabled:false,network:'testnet',requiredFunding:'5',state:undefined,message:'Deployment authorization required.'});
   if(path==='contractors/owner'||url.pathname==='/api/demo/contractors/owner')return answer(state==='portal-error'?{error:'Contractor records unavailable. Retry.'}:records,state==='portal-error'?503:200);
   if(path==='contractors/contractor')return answer(state==='revoked'?{error:'Private link revoked or expired.'}:{mode:'persistent',profile:state==='wallet-pending'?{...profile,pendingWallet:{id:'request-fixture',account:'new-writer-demo.testnet',baseVersion:1,generation:1,simulatedProof:false}}:profile,orders:[order],invoices:[bill,{...bill,id:'second-fixture',reference:'CTR-0042-INV-0002',status:'Submitted',reasons:[],ownerNote:''}]},state==='revoked'?403:200);
   if(url.pathname==='/api/demo/owner-invoices')return answer([]);
   // Any action not explicitly handled above is denied, including logout/signing APIs.
   return answer({error:'Read-only audit fixture: action unavailable.'},403);
 });
 await page.goto(base+(mode==='contractor'?'/contractor':mode==='demo'?'/?mode=demo':mode==='demo-owner'?'/demo/contractors':'/'));
 return {page,context,errors};
}
async function capture(p,name){
 await p.page.evaluate(()=>{window.scrollTo(0,0);let e=document.querySelector('#audit-label');if(!e){e=document.createElement('div');e.id='audit-label';e.textContent='AUDIT FIXTURE · synthetic records · actions blocked';Object.assign(e.style,{position:'fixed',right:'8px',bottom:'8px',zIndex:'9999',background:'#17322b',color:'white',padding:'6px 12px',font:'12px Arial',pointerEvents:'none'});document.body.append(e);}});
 const geometry=await p.page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:innerHeight,heading:[...document.querySelectorAll('h1')].map(e=>({text:e.textContent,y:Math.round(e.getBoundingClientRect().top)})),panel:document.querySelector('.testnet-controls')?.getBoundingClientRect().height??null,stylesheets:document.styleSheets.length,identityOccluded:(()=>{const e=document.querySelector('.identity-bar span');if(!e)return null;const r=e.getBoundingClientRect();return !e.contains(document.elementFromPoint(r.left+5,r.top+5));})()}));
 await p.page.screenshot({path:new URL(name+'.png',out).pathname.slice(1),fullPage:false});
 if(name==='owner-overview-desktop')await p.page.screenshot({path:new URL(name+'-full.png',out).pathname.slice(1),fullPage:true});
 results.push({name,...geometry,errors:p.errors});
}
try{
 for(const [size,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  const p=await setup({width,height});await p.page.getByRole('heading',{name:'Your payment desk',exact:true}).waitFor();await capture(p,'owner-overview-'+size);
  for(const name of ['Vendors','Work orders','Invoice review','Payment history']){await p.page.getByRole('navigation',{name:'Owner dashboard'}).getByRole('button',{name:new RegExp('^'+name)}).click();await capture(p,name.toLowerCase().replaceAll(' ','-')+'-'+size);}
  await p.page.getByRole('button',{name:'Contractor billing',exact:true}).click();await p.page.getByRole('heading',{name:'Contractors and bills',exact:true}).waitFor();await capture(p,'owner-contractor-'+size);await p.context.close();
  const q=await setup({width,height,mode:'contractor'});await q.page.getByRole('heading',{name:'Bill details',exact:true}).waitFor();await capture(q,'contractor-submit-'+size);
  for(const name of ['My payments','Wallet details']){await q.page.getByRole('button',{name,exact:true}).click();await capture(q,'contractor-'+name.toLowerCase().replaceAll(' ','-')+'-'+size);}await q.context.close();
  const s=await setup({width,height,mode:'public'});await s.page.getByRole('button',{name:'Connect to Meteor',exact:true}).waitFor();await capture(s,'signin-'+size);await s.context.close();
 }
 for(const state of ['viewer','zero-pending','zero-budget','empty','draft','rpc-error','restoring']){
  const p=await setup({state});if(state==='restoring'){await p.page.waitForTimeout(150);}else {await p.page.waitForTimeout(650);}
  if(state==='draft')await p.page.getByRole('button',{name:/Content studio/}).click();
  await capture(p,'state-'+state);await p.context.close();
 }
 for(const state of ['revoked','wallet-pending']){const p=await setup({mode:'contractor',state});await p.page.waitForTimeout(450);if(state==='wallet-pending')await p.page.getByRole('button',{name:'Wallet details',exact:true}).click();await capture(p,'contractor-'+state);await p.context.close();}
 const real=await browser.newContext({viewport:{width:1440,height:900}});const page=await real.newPage();let liveConfig;
 await page.route('**/api/**',async route=>{if(route.request().method()!=='GET')return route.abort();return route.continue();});
 await page.goto(base);await page.getByRole('button',{name:'Connect to Meteor',exact:true}).waitFor();
 await page.screenshot({path:new URL('actual-public-signin.png',out).pathname.slice(1)});
 liveConfig=await page.evaluate(()=>fetch('/api/live/config').then(r=>r.json()).then(c=>({network:c.network,transactionsEnabled:c.transactionsEnabled,configured:c.configured})));
 results.push({name:'actual-public-signin',evidence:'Actual running server; isolated browser; no wallet or cookie imported',...liveConfig});await real.close();
 await writeFile(new URL('measurements.json',out),JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({name:r.name,heading:r.heading,panel:r.panel,overflow:r.scrollWidth?r.scrollWidth-r.width:undefined,identityOccluded:r.identityOccluded,errors:r.errors,transactionsEnabled:r.transactionsEnabled})),null,2));
}finally{await browser.close();}
