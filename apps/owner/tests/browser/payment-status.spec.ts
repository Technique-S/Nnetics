import {test,expect} from '@playwright/test';
import {MockOwnerAdapter} from '../../src/data/mock-adapter';
import type {Payment} from '../../src/data/owner-adapter';
import {navigateOwner} from './navigation-helpers';
test('existing verified Paid evidence is consistent in overview, invoice details and history despite exhausted eligibility',async({page})=>{
 const snapshot=await new MockOwnerAdapter(0).snapshot(),invoice=snapshot.invoices[0];
 snapshot.mode='testnet';snapshot.protocolVersion=88;snapshot.access={organization:'studio',accountId:snapshot.vault.owner,role:'owner',vaultOwner:snapshot.vault.owner};
 snapshot.vault.paused=true;snapshot.vault.agent=null;
 const hash='1'.repeat(44);
 snapshot.payments=[{attempt_id:'1',invoice_id:invoice.id,order_id:invoice.order_id,recipient:invoice.recipient,amount:invoice.amount,status:'Paid',reference:hash,initiated_at_ns:'1'} as Payment];
 snapshot.queue=[{id:invoice.id,state:'paid',reason:'',hash}];
 await page.route('**/api/live/**',route=>{
  const path=new URL(route.request().url()).pathname.split('/api/live/')[1];
  if(path==='config')return route.fulfill({json:{network:'testnet',organization:'studio',contract:'vault.owner.testnet',worker:'worker.testnet',publicKey:'fixture',configured:true,transactionsEnabled:false}});
  if(path==='identity')return route.fulfill({json:{accountId:snapshot.vault.owner,network:'testnet',organizations:[{id:'studio',status:'ready',role:'owner'}]}});
  if(path==='session')return route.fulfill({json:{accountId:snapshot.vault.owner,idleExpires:Date.now()+18000000,absoluteExpires:Date.now()+18000000}});
  return route.fulfill({json:snapshot});
 });
 await page.goto('/');const card=page.getByRole('button').filter({hasText:invoice.id});await expect(card).toContainText('Paid');await expect(card).not.toContainText('Needs review');await card.click();
 await expect(page.locator('.invoice-detail').getByText('Paid',{exact:true})).toBeVisible();await expect(page.getByText('Payment confirmed',{exact:true})).toBeVisible();
 await navigateOwner(page,'Payment history');await expect(page.getByRole('row').filter({hasText:invoice.id})).toContainText('Paid');await expect(page.getByRole('link',{name:'View transaction',exact:true})).toHaveAttribute('href',`https://testnet.nearblocks.io/txns/${hash}`);
});
