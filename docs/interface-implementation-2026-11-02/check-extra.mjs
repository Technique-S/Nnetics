import { chromium } from '../../apps/owner/node_modules/@playwright/test/index.mjs';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const out=new URL('./',import.meta.url), results=[];
for(const width of [320,768,820,1440,390]){
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.route('**/api/**',route=>{
  const u=new URL(route.request().url());
  if(route.request().method()!=='GET')return route.fulfill({status:403,json:{error:'Audit is read-only'}});
  if(u.pathname.endsWith('/owner-invoices'))return route.fulfill({json:[]});
  if(u.pathname.endsWith('/config'))return route.fulfill({json:{network:'testnet',configured:false,transactionsEnabled:false}});
  if(u.pathname.endsWith('/identity'))return route.fulfill({json:{accountId:'audit.testnet',network:'testnet',notice:'Synthetic audit fixture',organizations:[{id:'audit',name:'Audit studio',status:'unprovisioned',role:'creator'}]}});
  if(u.pathname.endsWith('/organization'))return route.fulfill({json:{}});
  if(u.pathname.endsWith('/provisioning'))return route.fulfill({json:{configured:true,enabled:false,network:'testnet',state:'prepared',owner:'audit.testnet',vault:'audit-vault.testnet',factory:'audit-factory.testnet',planDigest:'a'.repeat(64),vaultCodeHash:'b'.repeat(44),factoryCodeHash:'c'.repeat(44),transaction:{args:{request_id:'audit-request'}},message:'Synthetic prepared state; signing disabled'}});
  return route.fulfill({status:401,json:{error:'Audit fixture'}});
 });
 async function snap(name){await page.screenshot({path:new URL(`${width}-${name}.png`,out).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});results.push({width,name,...await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,checkbox:[...document.querySelectorAll('input[type=checkbox]')].map(e=>({width:e.getBoundingClientRect().width,display:getComputedStyle(e).display})),over:[...document.querySelectorAll('.vendor-card')].map(e=>({client:e.clientWidth,scroll:e.scrollWidth}))}))});}
 if([320,768,820].includes(width)){
  await page.goto('http://127.0.0.1:3101/?mode=demo');await page.getByRole('heading',{name:'Your payment desk',exact:true}).waitFor();await page.getByRole('navigation',{name:'Owner dashboard'}).getByRole('button',{name:'Vendors',exact:true}).click();await page.waitForTimeout(200);await snap('vendors-breakpoint');
 }else{
  await page.goto('http://127.0.0.1:3101/');await page.getByRole('heading',{name:'Your workspace',exact:true}).waitFor();await snap('organizations');
  await page.getByRole('button',{name:'Audit studio · Vault not provisioned',exact:true}).click();await page.getByText('audit-vault.testnet',{exact:true}).waitFor();await snap('vault-prepared');
 }
 await page.close();
}
const lum=h=>{let a=h.match(/\w\w/g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*a[0]+.7152*a[1]+.0722*a[2]};
const pairs=[['amber badge','785820','fcf5e3'],['table heading','64726b','fafbf7'],['footnote','64726b','ffffff'],['preview dt','64726b','fffdf8'],['primary button','ffffff','1b6650']];
const contrast=pairs.map(([name,fg,bg])=>({name,fg,bg,ratio:((Math.max(lum(fg),lum(bg))+.05)/(Math.min(lum(fg),lum(bg))+.05)).toFixed(2)}));
await writeFile(new URL('extra-measurements.json',out),JSON.stringify({results,contrast},null,2));await browser.close();console.log(JSON.stringify({results,contrast}));
