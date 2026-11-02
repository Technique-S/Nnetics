import { chromium } from '../../apps/owner/node_modules/@playwright/test/index.mjs';
import { writeFile } from 'node:fs/promises';
const out = new URL('./', import.meta.url);
const browser = await chromium.launch({channel:'msedge',headless:true});
const results=[];
const profile={id:'audit',name:'Ada Brooks',generation:1,linkActive:true,wallet:'ada-demo.testnet',walletVersion:1,pendingWallet:null};
const order={id:'audit-order',reference:'WO-ARTICLE',contractorId:'audit',title:'Research article',amount:'2',recipient:'ada-demo.testnet'};
const bill={id:'audit-bill',contractorId:'audit',reference:'CTR-0001-INV-0001',orderId:'audit-order',amount:'2',asset:'NEAR',recipient:'ada-demo.testnet',text:'Research article delivered',description:'Research article',status:'Needs clarification',reasons:[],ownerNote:'Please confirm the delivery date',attachment:null,transactionUrl:null,submittedAt:'2026-11-02T00:00:00Z'};
for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}});
 const page=await context.newPage();
 let ownerFixture=false, contractorFixture=false;
 await page.route('**/api/**', async route=>{
  const url=new URL(route.request().url());
  if(route.request().method()!=='GET') return route.fulfill({status:403,json:{error:'Audit is read-only'}});
  if(url.pathname==='/api/demo/owner-invoices') return route.fulfill({json:[]});
  if(url.pathname==='/api/live/config') return route.fulfill({json:{network:'testnet',configured:false,transactionsEnabled:false}});
  if(url.pathname==='/api/demo/contractors/owner'&&ownerFixture) return route.fulfill({json:{mode:'simulation',profiles:[profile],orders:[order],invoices:[bill]}});
  if(url.pathname==='/api/demo/contractors/contractor'&&contractorFixture) return route.fulfill({json:{mode:'simulation',profile,orders:[order],invoices:[bill]}});
  return route.fulfill({status:401,json:{error:'Audit fixture: no authenticated session'}});
 });
 async function snap(name){
  await page.screenshot({path:new URL(`${width}-${name}.png`,out).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
  results.push({width,name,...await page.evaluate(()=>({title:document.title,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,smallText:[...document.querySelectorAll('body *')].filter(e=>e.children.length===0&&e.textContent.trim()&&e.getBoundingClientRect().width>0&&parseFloat(getComputedStyle(e).fontSize)<11).map(e=>({text:e.textContent.trim().slice(0,90),size:getComputedStyle(e).fontSize})).slice(0,50),overflow:[...document.querySelectorAll('main *,aside *')].filter(e=>{let r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left< -2)&&!e.closest('.table-scroll')&&!e.closest('nav')}).slice(0,12).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,90)}))}))});
 }
 await page.goto('http://127.0.0.1:3101/'); await page.getByRole('heading',{name:'Nnetics · NEAR testnet'}).waitFor(); await snap('login');
 await page.goto('http://127.0.0.1:3101/?mode=demo'); await page.getByRole('heading',{name:'Your payment desk',exact:true}).waitFor(); await snap('overview');
 for(const view of ['Vendors','Work orders','Invoice review','Payment history']){
  await page.getByRole('navigation',{name:'Owner dashboard'}).getByRole('button',{name:new RegExp('^'+view)}).click(); await snap(view.toLowerCase().replaceAll(' ','-'));
  const label={'Vendors':'Manage vendor','Work orders':'New work order','Invoice review':'Add sample invoice'}[view];
  if(label){await page.getByRole('button',{name:label,exact:true}).click();await page.getByRole('dialog').waitFor();await snap(view.toLowerCase().replaceAll(' ','-')+'-dialog');await page.keyboard.press('Escape');}
 }
 await page.goto('http://127.0.0.1:3101/demo/contractors');await page.getByRole('button',{name:'Start contractor demo'}).waitFor();await snap('owner-portal-empty');
 ownerFixture=true;await page.reload();await page.getByRole('heading',{name:'Ada Brooks',exact:true}).waitFor();await snap('owner-portal-populated');
 await page.goto('http://127.0.0.1:3101/contractor');await page.getByRole('heading',{name:'Private access unavailable'}).waitFor();await snap('contractor-unavailable');
 contractorFixture=true;await page.reload();await page.getByRole('heading',{name:'Hello, Ada Brooks.'}).waitFor();await snap('contractor-submit');
 for(const tab of ['My payments','Wallet details']){await page.getByRole('button',{name:tab,exact:true}).click();await snap('contractor-'+tab.toLowerCase().replaceAll(' ','-'));}
 await context.close();
}
await writeFile(new URL('measurements.json',out),JSON.stringify(results,null,2));
await browser.close();
console.log(`Captured ${results.length} read-only states`);
