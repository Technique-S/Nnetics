import {chromium} from '../../apps/owner/node_modules/playwright-core/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir=new URL('./proposals/',import.meta.url);await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'msedge'}),results=[],issues=[];
try{
 for(const width of [1440,390,320,768,1280]){
  const context=await browser.newContext({viewport:{width,height:width>1000?900:844},reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>issues.push(e.message));page.on('request',r=>{if(/\/api\/|nearblocks|rpc|meteor|openrouter/i.test(r.url()))issues.push('Unexpected external/API request: '+r.url());});
  for(const view of ['signin','onboarding','overview','vendors','orders','invoice','history','vault','settings','contractor','components']){
   await page.goto('http://127.0.0.1:3210/#'+view);await page.waitForFunction(()=>document.querySelector('#main'));
   const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,heading:document.querySelector('h1')?.getBoundingClientRect().top}));
   results.push({width,view,...geometry});assert.ok(geometry.overflow<=1,`${view}/${width} overflow ${geometry.overflow}`);
   if(width===1440||width===390)await page.screenshot({path:new URL(view+'-'+width+'.png',dir).pathname.slice(1)});
  }
  await page.goto('http://127.0.0.1:3210/#overview');
  if(width===1440){
   await page.locator('#toggle-nav').click();assert.ok(await page.locator('.shell').evaluate(e=>e.classList.contains('collapsed')));
   await page.reload();assert.ok(await page.locator('.shell').evaluate(e=>e.classList.contains('collapsed')));
   await page.screenshot({path:new URL('sidebar-collapsed.png',dir).pathname.slice(1)});await page.locator('#toggle-nav').click();
   await page.getByRole('link',{name:'Contractors',exact:true}).click();await page.goBack();assert.equal(new URL(page.url()).hash,'#overview');
  }
  if(width===390){
   await page.locator('#toggle-nav').click();await page.screenshot({path:new URL('sidebar-drawer.png',dir).pathname.slice(1)});
   assert.ok(await page.locator('#main').evaluate(e=>e.inert));await page.keyboard.press('Shift+Tab');assert.equal(await page.locator('.side a').last().evaluate(e=>e===document.activeElement),true);
   await page.keyboard.press('Escape');assert.ok(await page.locator('#toggle-nav').evaluate(e=>e===document.activeElement));assert.equal(await page.locator('#main').evaluate(e=>e.inert),false);
   await page.locator('#toggle-nav').click();await page.getByRole('link',{name:'Contractors',exact:true}).click();assert.equal(await page.locator('#app').evaluate(e=>e.classList.contains('mobile-open')),false);
  }
  await page.goto('http://127.0.0.1:3210/#contractor');await page.getByRole('button',{name:'Preview bill',exact:true}).click();assert.ok(await page.locator('#dialog').isVisible());await page.keyboard.press('Escape');
  for(const tab of ['My payments','Wallet details']){await page.getByRole('button',{name:tab,exact:true}).click();if(width===1440||width===390)await page.screenshot({path:new URL('contractor-'+tab.toLowerCase().replaceAll(' ','-')+'-'+width+'.png',dir).pathname.slice(1)});}
  if(width===1440||width===390){for(const status of ['empty','loading','error','pending','restricted','paid']){await page.goto('http://127.0.0.1:3210/#invoice');await page.locator('#state').selectOption(status);await page.screenshot({path:new URL('invoice-'+status+'-'+width+'.png',dir).pathname.slice(1)});}}
  await context.close();
 }
 const contrast=(a,b)=>{const f=x=>{const rgb=x.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};const x=f(a),y=f(b);return +(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 const contrasts=[['primary ink','17322b','f6f6f2'],['secondary','52635a','ffffff'],['muted','63736b','ffffff'],['button','ffffff','1b6650'],['selection','193b2d','d6e9ca'],['warning','795719','fbf4e5'],['error','9b3e35','fceeea'],['info','315e78','edf4f8']].map(([label,ink,bg])=>({label,ratio:+contrast(ink,bg).toFixed(2)}));for(const c of contrasts)assert.ok(c.ratio>=4.5,c.label);
 assert.deepEqual(issues,[]);await writeFile(new URL('verification.json',dir),JSON.stringify({date:'2026-11-04',scope:'Isolated design prototype only',results,contrasts,checks:['No API/wallet requests','Collapsed preference restored on reload','Back navigation','Mobile drawer focus wrap / Escape / focus restoration','Main inert while drawer open','Drawer closes on navigation','Bill preview dialog / Escape','Reduced motion','No horizontal overflow at 320, 390, 768, 1280, 1440 CSS px'],issues},null,2));console.log(JSON.stringify({samples:results.length,contrasts,issues}));
}finally{await browser.close();}
