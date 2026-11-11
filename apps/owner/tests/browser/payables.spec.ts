import {test,expect} from "@playwright/test";
import {fixtureWorkspace} from "./release-fixture";
import {navigateOwner} from "./navigation-helpers";

test("Payables retains invoice context through approval, authorization, settlement and refresh",async({page},info)=>{
    test.setTimeout(100_000);
    await fixtureWorkspace(page);
    await page.evaluate(async()=>{const r=await fetch("/api/demo/workspace/fund",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:"10000000000000000000000000"})});if(!r.ok)throw Error("Demo funding failed");});
    const records=await (await page.request.get("/api/demo/contractors/owner")).json(),bill=records.invoices[0];
    await navigateOwner(page,"Payables");
    const nav=page.locator('nav[aria-label="Owner dashboard"]');
    expect(await nav.locator("a").allTextContents()).toEqual(["Overview","Contractors","Payables","Activity","Vault & Controls"]);
    const statuses=page.getByRole("group",{name:"Payable status"});
    await statuses.getByRole("button",{name:/^Awaiting Approval/}).click();
    await page.getByRole("button",{name:`Open payable · ${bill.reference}`,exact:true}).click();
    const details=page.getByRole("region",{name:"Payable Details"});
    const facts=details.locator(".payable-facts");
    await expect(facts.locator('dt:text-is("Contractor") + dd')).toHaveText("Action contractor");
    await expect(facts.locator('dt:text-is("Originally requested") + dd')).toHaveText("3 NEAR");
    await expect(facts.locator('dt:text-is("Approved amount") + dd')).toHaveText("Awaiting approval");
    await expect(facts.locator('dt:text-is("Approved by") + dd')).toHaveText("Not recorded");
    await details.getByRole("button",{name:`Approve bill · ${bill.reference}`,exact:true}).click();
    await expect(facts.locator('dt:text-is("Approved amount") + dd')).toHaveText("3 NEAR");
    await expect(facts.locator('dt:text-is("Approval time") + dd')).not.toHaveText("Not recorded");
    // Approval moves the row out of this filter while the same detail remains open.
    await expect(page.getByText(/selected payable stays open/)).toBeVisible();
    await statuses.getByRole("button",{name:/^Ready to Pay/}).click();
    await details.getByText("Simulated NEAR Intents",{exact:true}).click();
    await details.getByRole("button",{name:"Preview simulated quote",exact:true}).click();
    const summary=details.getByRole("region",{name:"Payment confirmation summary"});
    await expect(summary).toContainText(bill.reference);await expect(summary).toContainText("Action contractor");await expect(summary).toContainText("Action work");await expect(summary).toContainText("editor-demo.testnet");await expect(summary).toContainText("Budget and spending eligibility");
    await expect(details.getByRole("button",{name:"Authorize simulated payment",exact:true})).toBeDisabled();
    await details.getByRole("checkbox").check();await details.getByRole("button",{name:"Authorize simulated payment",exact:true}).click();
    await expect(facts.locator('dt:text-is("Payment execution") + dd')).toContainText("reserved");
    await details.getByRole("button",{name:"Execute simulated payment",exact:true}).click();
    await expect(facts.locator('dt:text-is("Remaining payable") + dd')).toHaveText("0 NEAR",{timeout:15_000});
    await statuses.getByRole("button",{name:/^Paid/}).click();
    await expect(page.getByRole("button",{name:`Open payable · ${bill.reference}`,exact:true})).toHaveCount(1);
    await details.getByText("Original billing text",{exact:true}).click();await expect(details.locator("pre")).toContainText("Action work delivered");
    await details.getByText("Invoice audit timeline",{exact:true}).click();await expect(details.getByText("approve",{exact:true})).toBeVisible();
    expect(page.url()).toContain(`#Payables/${bill.id}`);
    await page.screenshot({path:info.outputPath("payables-paid.png"),fullPage:true});
    await page.reload();await expect(details).toContainText(bill.reference);await expect(details.locator('dt:text-is("Remaining payable") + dd')).toHaveText("0 NEAR");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    // Old invoice/payment links retain access to the same authoritative payable.
    for(const hash of ["Invoices","Payments","Invoice%20review"]){await page.goto(`/?mode=demo#${hash}`);await expect(page.getByRole("heading",{name:"Payables",exact:true,level:1})).toBeVisible();await expect(page.getByRole("button",{name:`Open payable · ${bill.reference}`,exact:true})).toBeVisible();}
    await expect(page.locator('a[href*="nearblocks"],a[href*="explorer"]')).toHaveCount(0);
});

test("Payables searches invoice and contractor without duplicating payment attempts",async({page})=>{
    await fixtureWorkspace(page);const snapshot=await(await page.request.get("/api/demo/contractors/owner")).json(),bill=snapshot.invoices[0];
    await navigateOwner(page,"Payables");const search=page.getByRole("searchbox",{name:"Search payables"});
    await search.fill(bill.reference);await expect(page.getByRole("button",{name:`Open payable · ${bill.reference}`,exact:true})).toHaveCount(1);
    await search.fill("Action contractor");await expect(page.getByRole("button",{name:`Open payable · ${bill.reference}`,exact:true})).toHaveCount(1);
    await search.fill("no matching contractor");await expect(page.getByText("No payables match these filters.")).toBeVisible();
    await expect(page.getByRole("region",{name:"Payable Details"})).toContainText(bill.reference);
});
