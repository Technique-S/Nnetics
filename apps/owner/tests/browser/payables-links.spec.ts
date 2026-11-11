import {test,expect} from "@playwright/test";
import {fixtureWorkspace} from "./release-fixture";
import {navigateOwner} from "./navigation-helpers";

test("a foreign Payables deep link cannot select another invoice for approval or payment",async({page,browser})=>{
    await fixtureWorkspace(page);
    const own=await(await page.request.get("/api/demo/contractors/owner")).json();
    const context=await browser.newContext({baseURL:process.env.NNETICS_BROWSER_BASE_URL||"http://127.0.0.1:3100"});
    try{
        const other=await context.newPage();await fixtureWorkspace(other,{text:"Foreign confidential payable"});
        const foreign=await(await other.request.get("/api/demo/contractors/owner")).json();
        await page.goto(`/?mode=demo#Payables/${foreign.invoices[0].id}`);
        const details=page.getByRole("region",{name:"Payable Details"});
        await expect(details.getByRole("alert")).toContainText("unavailable in this workspace");
        await expect(details.getByRole("button",{name:/Approve bill|Authorize simulated payment/})).toHaveCount(0);
        await expect(details).not.toContainText("Foreign confidential payable");
        await page.getByRole("button",{name:`Open payable · ${own.invoices[0].reference}`,exact:true}).click();
        await expect(details.getByRole("heading",{name:own.invoices[0].reference,exact:true})).toBeVisible();
        await page.reload();await expect(details.getByRole("heading",{name:own.invoices[0].reference,exact:true})).toBeVisible();
        for(const legacy of ["Invoices","Payments","Invoice%20review"]){
            await page.goto(`/?mode=demo#${legacy}`);
            await expect(page.getByRole("heading",{name:"Payables",exact:true,level:1})).toBeVisible();
            await expect(page.getByRole("button",{name:`Open payable · ${own.invoices[0].reference}`,exact:true})).toBeVisible();
        }
        await navigateOwner(page,"Overview");
    }finally{await context.close();}
});
