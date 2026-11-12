import fs from 'node:fs';
const base='http://127.0.0.1:3100',cookies=new Map(),history=[],results=[];
async function req(path,body){const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{origin:base,cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(120000)});for(const c of r.headers.getSetCookie()){const p=c.split(';')[0],i=p.indexOf('=');cookies.set(p.slice(0,i),p.slice(i+1));}const b=await r.json();if(!r.ok)throw Error(JSON.stringify({status:r.status,code:b.code,error:b.error}));return b;}
async function ask(label,message){const key=crypto.randomUUID();try{const b=await req('/api/agent',{message,idempotencyKey:key,conversationHistory:history.slice(-5)});if(b.provider!=='openrouter'||b.toolCalls<1||b.modelCalls<2)throw Error('Missing real tool continuation');history.push({user:message,assistant:b.reply});results.push({label,passed:true,model:b.model,modelCalls:b.modelCalls,toolCalls:b.toolCalls,reply:b.reply});console.log(JSON.stringify(results.at(-1)));return b;}catch(e){results.push({label,passed:false,error:e.message});throw e;}}
async function confirm(b){const card=b.actions.find(x=>x.action.kind==='confirm-contractor-lifecycle');if(!card)throw Error('No server confirmation card');return req('/api/demo/contractors/owner/confirm-lifecycle',card.action);}
try{
await req('/api/demo/workspace/start',{});await req('/api/demo/workspace/create',{profileName:'V31 acceptance',vaultName:'Real model acceptance'});await req('/api/demo/contractors/owner/start',{});
const name='Acceptance Marcus '+Date.now().toString(36);const made=await req('/api/demo/contractors/owner',{action:'create-profile',name});const id=made.profileId;
await ask('edit',`Rename contractor ${name} (ID ${id}) to ${name} Williams.`);
await ask('wallet and contextual identity',`Does the contractor you just renamed have a wallet configured? Retrieve their actual wallet status.`);
const invitation=await ask('invitation',`Generate a portal invitation for ${name} Williams (ID ${id}).`);
const delivery=invitation.actions.find(x=>x.action.kind==='reveal-contractor-invitation');if(!delivery)throw Error('No secure invitation control');await req('/api/demo/contractors/owner/reveal-invitation',{reference:delivery.action.reference});
await confirm(await ask('revoke invitation',`Revoke portal access for ${name} Williams (ID ${id}). Prepare the confirmation card.`));
await confirm(await ask('archive',`Archive ${name} Williams (ID ${id}). Prepare the confirmation card.`));
await confirm(await ask('restore',`Restore ${name} Williams (ID ${id}).`));
const link=await req('/api/demo/contractors/owner',{action:'issue-link',profileId:id});await req('/api/demo/contractors/enter',{token:link.token});const challenge=await req('/api/demo/contractors/contractor',{action:'wallet-challenge',account:'acceptance-marcus.testnet'});await req('/api/demo/contractors/contractor',{action:'wallet-proof',challenge:challenge.challenge});
await ask('pending wallet request',`Retrieve the pending wallet change request for contractor ID ${id}, including old and proposed recipient.`);
await confirm(await ask('wallet decision',`Approve the pending wallet request for contractor ID ${id}. Prepare the exact request confirmation card; do not execute before confirmation.`));
const eligible=await req('/api/demo/contractors/owner',{action:'create-profile',name:'Acceptance eligible deletion'});
await confirm(await ask('eligible deletion',`Permanently delete contractor ID ${eligible.profileId}, named Acceptance eligible deletion. Prepare the confirmation card.`));
console.log('ACCEPTANCE_COMPLETED');
}catch(e){console.log('ACCEPTANCE_STOPPED '+e.message);}finally{fs.writeFileSync('artifacts/v31-real-model-2026-11-12.json',JSON.stringify({results,completed:results.length===9&&results.every(r=>r.passed)},null,2));}
