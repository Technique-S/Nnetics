import {test,expect,type Page} from "@playwright/test";

async function tab(page: Page, name: string) {
  const nav=page.getByRole("navigation",{name:"Owner dashboard"});
  if(!await nav.isVisible())await page.getByRole("button",{name:"Toggle navigation"}).click();
  await nav.getByRole("link",{name,exact:true}).click();
  await expect(page.getByRole("heading",{name,exact:true,level:1})).toBeVisible();
}

async function workspace(page: Page, owner: string, vault: string) {
  await page.goto("/?mode=demo");
  await page.getByLabel("Owner name").fill(owner);
  await page.getByRole("button",{name:"Continue"}).click();
  await page.getByLabel("Vault name").fill(vault);
  await page.getByRole("button",{name:"Create demo workspace"}).click();
  await expect(page.getByRole("heading",{name:"Overview",exact:true})).toBeVisible();
}

async function addContractor(page: Page, name: string) {
  await tab(page,"Contractors");
  await page.getByLabel("Contractor name",{exact:true}).fill(name);
  await page.getByRole("button",{name:"Add contractor",exact:true}).click();
  await expect(page.getByRole("heading",{name,exact:true,level:3})).toHaveCount(1);
}

test("a contractor with no linked records can be deleted, with an explicit confirmation",async({page})=>{
  await page.emulateMedia({colorScheme:"light",reducedMotion:"reduce"});
  await workspace(page,"Dana","Dana vault");
  await addContractor(page,"Tia");
  await page.getByText("Contractor actions",{exact:true}).click();
  // The delete action is available and states its consequence.
  await expect(page.getByText(/removed permanently/)).toBeVisible();
  // The confirmation names the contractor and the consequence.
  let confirmation="";
  page.once("dialog",async d=>{ confirmation=d.message(); await d.accept(); });
  await page.getByRole("button",{name:"Delete contractor"}).click();
  await expect(page.getByRole("heading",{name:"Tia",exact:true,level:3})).toHaveCount(0);
  expect(confirmation).toMatch(/Delete Tia\?/);
  expect(confirmation).toMatch(/revoke associated portal access/);
  expect(confirmation).toMatch(/cannot be undone/);
  // The audit record survives the profile.
  await page.getByText("Contractor activity log",{exact:true}).click();
  await expect(page.locator("text=/Tia · deleted/")).toBeVisible();
});

test("a contractor with an active portal link is archived, not deleted",async({page})=>{
  await page.emulateMedia({colorScheme:"light",reducedMotion:"reduce"});
  await workspace(page,"Eli","Eli vault");
  await addContractor(page,"Marcus");
  await page.getByRole("button",{name:"Create private link · Marcus"}).click();
  await page.getByText("Contractor actions",{exact:true}).click();
  // Deletion is unavailable while a portal link is active.
  await expect(page.getByRole("button",{name:"Delete contractor"})).toBeDisabled();
  await expect(page.getByText(/deletion is not available/)).toBeVisible();
  // Archiving is offered and names the contractor.
  page.once("dialog",d=>d.accept());
  await page.getByRole("button",{name:"Archive contractor"}).click();
  await expect(page.getByRole("heading",{name:"Marcus",exact:true,level:3})).toHaveCount(0);
  // The archived contractor stays inspectable.
  await page.getByText(/^Archived contractors \d+$/).click();
  await expect(page.getByRole("heading",{name:"Marcus",exact:true,level:3})).toBeVisible();
  await expect(page.getByText("Archived",{exact:true})).toBeVisible();
  // And it can be restored.
  page.once("dialog",d=>d.accept());
  await page.getByRole("button",{name:/Restore contractor/}).click();
  await expect(page.getByRole("heading",{name:"Marcus",exact:true,level:3})).toBeVisible();
});

test("a demo workspace holds far more than three contractors",async({page})=>{
  await page.emulateMedia({colorScheme:"light",reducedMotion:"reduce"});
  await workspace(page,"Fay","Fay vault");
  await tab(page,"Contractors");
  // The counter no longer shows a three-profile cap.
  await expect(page.getByRole("heading",{name:/Contractors \d+/})).toBeVisible();
  await expect(page.locator("text=/Contractors 0\\/3/")).toHaveCount(0);
  // Twenty-five contractors can be created in one workspace.
  for(let index=1;index<=25;index++){
    await page.getByLabel("Contractor name",{exact:true}).fill(`Writer ${index}`);
    await page.getByRole("button",{name:"Add contractor",exact:true}).click();
    await expect(page.getByRole("heading",{name:`Writer ${index}`,exact:true,level:3})).toBeVisible();
  }
  // One more than the page size, so the list has to page.
  await page.getByLabel("Contractor name",{exact:true}).fill("Writer 26");
  await page.getByRole("button",{name:"Add contractor",exact:true}).click();
  await page.getByRole("button",{name:"Refresh owner records"}).click();
  await expect(page.getByRole("heading",{name:/Contractors 26/})).toBeVisible();
  // The list pages: the first page shows twenty-five and offers the rest.
  await expect(page.getByRole("heading",{name:"Writer 1",exact:true,level:3})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Writer 25",exact:true,level:3})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Writer 26",exact:true,level:3})).toHaveCount(0);
  await expect(page.getByRole("button",{name:/Show 1 more of 26/})).toBeVisible();
  await page.getByRole("button",{name:/Show 1 more of 26/}).click();
  await expect(page.getByRole("heading",{name:"Writer 26",exact:true,level:3})).toBeVisible();
  // Search finds one of them.
  await page.getByLabel("Search contractors").fill("Writer 7");
  await expect(page.getByRole("heading",{name:"Writer 7",exact:true,level:3})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Writer 8",exact:true,level:3})).toHaveCount(0);
});

test("the archived contractor never reaches its portal again",async({page,browser})=>{
  await page.emulateMedia({colorScheme:"light",reducedMotion:"reduce"});
  await workspace(page,"Gus","Gus vault");
  await addContractor(page,"Noor");
  await page.getByRole("button",{name:"Create private link · Noor"}).click();
  const invitation=await page.getByLabel("Private invitation link · shown once").inputValue();
  const ctx=await browser.newContext({baseURL:process.env.NNETICS_BROWSER_BASE_URL||"http://127.0.0.1:3100"});
  try {
    const contractor=await ctx.newPage();
    await contractor.goto(invitation);
    await expect(contractor.getByRole("button",{name:"Wallet details"})).toHaveAttribute("aria-current","page");
    // The owner archives the contractor.
    await page.getByText("Contractor actions",{exact:true}).click();
    page.once("dialog",d=>d.accept());
    await page.getByRole("button",{name:"Archive contractor"}).click();
    await expect(page.getByRole("heading",{name:"Noor",exact:true,level:3})).toHaveCount(0);
    // The old invitation no longer grants access.
    await contractor.reload();
    await expect(contractor.getByText(/revoked|expired|no longer/i)).toBeVisible();
  } finally { await ctx.close(); }
});
