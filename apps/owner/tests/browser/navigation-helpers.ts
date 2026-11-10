import type {Page} from '@playwright/test';
// The destinations the workspace offers now. The names the older suites used
// still resolve, so those links keep pointing at the same place.
const current: Record<string,string> = {
  Vault:'Vault & Controls',
  Receipts:'Activity',
  History:'Activity',
  'Payment history':'Activity',
  Recovery:'Activity',
  'Invoice review':'Invoices',
  Vendors:'Contractors',
  'Work orders':'Contractors',
  Access:'Settings',
};
export async function navigateOwner(page:Page,name:string){
  // These assertions test authorization/navigation state, including a paused fake clock.
  // Respect reduced motion so drawer animation does not wait on that fake clock.
  await page.emulateMedia({reducedMotion:'reduce'});
  const target=current[name]??name;
  if(target==='Settings'){
    // Settings is a utility destination, not a primary one.
    await openAccountMenu(page);
    await page.getByRole('link',{name:'Settings',exact:true}).first().click();
    return;
  }
  const destination=page.getByRole('navigation',{name:'Owner dashboard'}).locator(`a[href="#${encodeURIComponent(target)}"]`);
  if(!await destination.isVisible())await page.getByRole('button',{name:'Toggle navigation',exact:true}).click();
  await destination.click();
}
export async function openAccountMenu(page:Page){
  const menu=page.locator('details.account-menu');
  if(await menu.count()&&!await menu.evaluate(e=>(e as HTMLDetailsElement).open))await menu.locator(':scope > summary').click();
}
