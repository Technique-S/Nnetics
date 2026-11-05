import type {Page} from '@playwright/test';
export async function navigateOwner(page:Page,name:string){
 // These assertions test authorization/navigation state, including a paused fake clock.
 // Respect reduced motion so drawer animation does not wait on that fake clock.
 await page.emulateMedia({reducedMotion:'reduce'});
 const destination=page.getByRole('navigation',{name:'Owner dashboard'}).locator(`a[href="#${encodeURIComponent(name)}"]`);
 if(!await destination.isVisible())await page.getByRole('button',{name:'Toggle navigation',exact:true}).click();
 await destination.click();
}
export async function openAccountMenu(page:Page){
 const menu=page.locator('details.account-menu');
 if(await menu.count()&&!await menu.evaluate(e=>(e as HTMLDetailsElement).open))await menu.locator(':scope > summary').click();
}
