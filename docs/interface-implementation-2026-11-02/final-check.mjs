import {chromium} from '../../apps/owner/node_modules/@playwright/test/index.mjs';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});
const results=[];
for(const width of [320,390,768,820,1080,1440]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
 await page.route('**/api/demo/owner-invoices',r=>r.fulfill({json:[]}));
 await page.goto('http://127.0.0.1:3101/?mode=demo');
 await page.getByRole('heading',{name:'Your payment desk',exact:true}).waitFor();
 const overview=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,navHeight:document.querySelector('nav').getBoundingClientRect().height,smallText:[...document.querySelectorAll('main *')].filter(e=>e.children.length===0&&e.textContent.trim()&&e.getBoundingClientRect().width>0&&parseFloat(getComputedStyle(e).fontSize)<12).length,amberColor:getComputedStyle(document.querySelector('.amber')).color,tableColor:getComputedStyle(document.querySelector('th')).color}));
 if(width===390)await page.screenshot({path:new URL('390-overview-final.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
 await page.getByRole('navigation',{name:'Owner dashboard'}).getByRole('button',{name:'Vendors',exact:true}).click();
 const vendors=await page.locator('.vendor-card').evaluateAll(cards=>cards.map(e=>({client:e.clientWidth,scroll:e.scrollWidth})));
 if(width===768)await page.screenshot({path:new URL('768-vendors-final.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
 results.push({width,overview,vendors});
 await page.close();
}
await browser.close();await writeFile(new URL('final-measurements.json',import.meta.url),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
