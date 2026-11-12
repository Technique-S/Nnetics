import type {Page} from '@playwright/test';
import {MockOwnerAdapter} from '../../src/data/mock-adapter.ts';

export const fixtureRecipient='full-approved-recipient-for-readability.testnet';
export const fixtureSource='Website accessibility review delivered. Invoice amount: 3.125 NEAR. Recipient: '+fixtureRecipient+'. Original invoice text remains available for owner review.';

// Every API request is intercepted. No cookie, invitation capability, wallet,
// approval, payment or on-chain operation reaches a real service in these tests.
export async function cultFixture(page:Page,{owner=false,initialized=false}={}) {
 const forbidden:string[]=[];let creates=0,failCreate=false,unavailable=false;
 let gate:Promise<void>|undefined,portalGate:Promise<void>|undefined;
 const raw={mode:'simulation',initialized,revision:0,profile:{name:'UI fixture',vaultName:'UI fixture vault',createdAt:'2026-11-11T09:00:00Z'},vault:{funded:'0',spent:'0',reserved:'0',limit:'',available:'0',paused:false},payments:[],history:[],receipts:[],scenario:'success'};
 const profile={id:'cult-profile',name:'Example contractor',wallet:fixtureRecipient,pendingWallet:null,linkActive:true,generation:1,walletVersion:1,archived:false,archivedAt:null,deletable:false};
 const invoice={id:'cult-invoice',reference:'CTR-0001-INV-0001',contractorId:profile.id,orderId:'cult-order',orderReference:'UI-REVIEW',amount:'3.125',asset:'NEAR',recipient:fixtureRecipient,text:fixtureSource,originalText:fixtureSource,description:'Website accessibility review',status:'Approved',reasons:[],ownerNote:'Reviewed fixture; no payment is initiated.',attachment:null,transactionUrl:null,submittedAt:'2026-11-11T09:00:00Z',amendments:[]};
 const records={mode:'persistent',profiles:[profile],orders:[],invoices:[invoice],archivedProfiles:[],events:[]};
 const snapshot=await new MockOwnerAdapter(0).snapshot();snapshot.mode='testnet';snapshot.protocolVersion=88;
 snapshot.access={organization:'ui-studio',accountId:'owner-fixture.testnet',role:'owner',vaultOwner:snapshot.vault.owner};
 snapshot.vendors=[];snapshot.orders=[];snapshot.invoices=[];snapshot.payments=[];snapshot.queue=[];
 await page.route('**/api/**',async route=>{
  const req=route.request(),p=new URL(req.url()).pathname;
  const reply=(json:unknown,status=200)=>route.fulfill({status,json});
  if(req.method()!=='GET') {
   if(p==='/api/demo/workspace/start')return reply(raw);
   if(p==='/api/demo/workspace/create') {
    creates++;await gate;
    if(failCreate)return reply({error:'Fixture workspace unavailable'},503);
    const input=req.postDataJSON();raw.initialized=true;raw.revision++;
    raw.profile={...raw.profile,name:input.profileName,vaultName:input.vaultName};return reply(raw);
   }
   if(p==='/api/demo/contractors/owner/start')return reply({});
   forbidden.push(p);return reply({error:'Mutation blocked by presentation fixture'},403);
  }
  if(p==='/api/demo/workspace/state')return reply(raw);
  if(p==='/api/demo/assistant')return reply({configured:false,model:null,provider:null});
  if(p==='/api/live/config')return reply({network:'testnet',configured:owner,organization:'ui-studio',contract:'vault.fixture.testnet',worker:'worker.fixture.testnet',transactionsEnabled:false,ownerTransactionsEnabled:false,paymentExecutionEnabled:false});
  if(p==='/api/live/identity')return owner?reply({accountId:'owner-fixture.testnet',network:'testnet',organizations:[{id:'ui-studio',name:'Fixture studio',status:'ready',role:'owner'}],notice:''}):reply({error:'Wallet verification required.'},400);
  if(p==='/api/live/snapshot')return reply(snapshot);
  if(p.includes('/contractors/owner'))return reply(owner?records:{mode:'simulation',profiles:[],orders:[],invoices:[],archivedProfiles:[],events:[]});
  if(p.endsWith('/contractors/contractor')){await portalGate;return unavailable?reply({error:'Fixture access revoked'},403):reply({mode:p.includes('/live/')?'persistent':'simulation',profile,orders:[],invoices:[invoice]});}
  if(p==='/api/live/session'||p==='/api/live/session/renew')return reply({accountId:'owner-fixture.testnet',idleExpires:Date.now()+18000000,absoluteExpires:Date.now()+18000000});
  return reply({});
 });
 const allowedOrigin=new URL(process.env.NNETICS_BROWSER_BASE_URL||'http://127.0.0.1:3100').origin;
 await page.route('**/*',route=>new URL(route.request().url()).origin===allowedOrigin?route.fallback():route.abort());
 return {forbidden,creates:()=>creates,failCreate:(value:boolean)=>{failCreate=value;},revoke:()=>{unavailable=true;},holdCreate:()=>{let release!:()=>void;gate=new Promise<void>(r=>{release=r;});return ()=>{gate=undefined;release();};},holdPortal:()=>{let release!:()=>void;portalGate=new Promise<void>(r=>{release=r;});return ()=>{portalGate=undefined;release();};}};
}
