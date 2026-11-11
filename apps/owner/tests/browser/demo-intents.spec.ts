import {test,expect} from "@playwright/test";
import type {Page} from "@playwright/test";
const origin=process.env.NNETICS_BROWSER_BASE_URL||"http://127.0.0.1:3100";
const near=(value:number)=>(BigInt(value)*10n**24n).toString();

test("unlinked contractor bill → simulated intent settlement, refresh and failure recovery",async({page,browser},testInfo)=>{
    test.setTimeout(120_000);
    const post=async(path:string,data:unknown)=>{
        const response=await page.request.post(path,{data,headers:{Origin:origin}});
        expect(response.ok(),await response.text()).toBeTruthy();return response.json();
    };
    // Blank organization and simulated funds; no wallet provider or API key.
    await post("/api/demo/workspace/start",{});
    await post("/api/demo/workspace/create",{profileName:"Demo Owner",vaultName:"Intents Studio"});
    await post("/api/demo/workspace/fund",{amount:near(10)});
    await page.goto("/demo/contractors");
    const start=page.getByRole("button",{name:"Start contractor demo"});
    if(await start.isVisible())await start.click();
    await page.getByLabel("Contractor name",{exact:true}).fill("Intents Designer");
    await page.getByRole("button",{name:"Add contractor",exact:true}).click();
    await page.getByRole("button",{name:"Create private link · Intents Designer",exact:true}).click();
    const link=await page.getByLabel("Private invitation link · shown once").inputValue();
    const context=await browser.newContext({baseURL:origin,viewport:page.viewportSize()!});const contractor=await context.newPage();
    await contractor.goto(link);
    await contractor.getByRole("textbox",{name:/testnet wallet/}).fill("intents-designer.testnet");
    await contractor.getByRole("button",{name:"Prepare simulated verification",exact:true}).click();
    await contractor.getByRole("button",{name:"Simulate proof and request approval",exact:true}).click();
    await page.getByRole("button",{name:"Refresh owner records"}).click();
    await page.getByRole("button",{name:"Approve wallet · Intents Designer",exact:true}).click();
    async function submit(description:string){
        await contractor.getByRole("button",{name:"Send a bill",exact:true}).click();
        await expect(contractor.getByLabel("Work order (optional)",{exact:true})).toHaveValue("");
        await expect(contractor.locator("#invoice-wallet")).toHaveCount(0);
        await contractor.getByLabel("Bill text",{exact:true}).fill(`${description}. Amount: 1 NEAR.`);
        await contractor.getByLabel("Work description",{exact:true}).fill(description);
        await contractor.getByLabel("Amount (as invoiced)").fill("1");
        await contractor.getByRole("button",{name:"Submit bill for review",exact:true}).click();
        const data=await (await contractor.request.get("/api/demo/contractors/contractor")).json();
        await page.getByRole("button",{name:"Refresh owner records"}).click();
        const bill=data.invoices.find((b:{description:string})=>b.description===description);
        await page.getByRole("button",{name:`Approve bill · ${bill.reference}`,exact:true}).click();
        return {bill,card:page.locator("article").filter({has:page.getByRole("heading",{name:bill.reference,exact:true})})};
    }
    async function quote(card:ReturnType<Page["locator"]>,outcome="success"){
        await card.getByText("Simulated NEAR Intents",{exact:true}).click();
        await card.getByLabel("Funding asset and network").selectOption("usdc-ethereum");
        await card.getByLabel("Simulation outcome").selectOption(outcome);
        await card.getByRole("button",{name:"Preview simulated quote",exact:true}).click();
        await expect(card.getByText("Mock Emerald Solver",{exact:true})).toBeVisible();
        await expect(card.getByText("4.01 USDC · Ethereum",{exact:true})).toBeVisible();
        await card.getByRole("checkbox").check();
        await card.getByRole("button",{name:"Authorize simulated payment",exact:true}).click();
        await card.getByRole("button",{name:"Execute simulated payment",exact:true}).click();
    }
    const first=await submit("Design milestone");await quote(first.card);
    await expect(first.card.getByRole("status").filter({hasText:"COMPLETED"})).toBeVisible({timeout:15_000});
    await expect(first.card.getByText("Paid",{exact:true})).toBeVisible();
    await page.reload();
    await first.card.getByText("Simulated NEAR Intents",{exact:true}).click();
    await expect(first.card.getByRole("status").filter({hasText:"COMPLETED"})).toBeVisible();
    await first.card.getByText(/Payment audit history/).click();
    await expect(first.card.getByText("EXECUTING",{exact:true})).toBeVisible();
    await expect(page.locator('a[href*="nearblocks"], a[href*="explorer"]')).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
    await page.screenshot({path:testInfo.outputPath("simulated-intents.png"),fullPage:true});
    const balance=await (await page.request.get("/api/demo/workspace/state")).json();
    expect(balance.vault.spent).toBe("1002500000000000000000000");expect(balance.vault.reserved).toBe("0");
    const second=await submit("Recovery milestone");await quote(second.card,"failure");
    await expect(second.card.getByRole("status").filter({hasText:"FAILED"})).toBeVisible({timeout:15_000});
    await expect(second.card.getByText("Approved",{exact:true})).toBeVisible();
    await second.card.getByLabel("Simulation outcome").selectOption("success");
    await second.card.getByRole("button",{name:"Preview simulated quote",exact:true}).click();
    await second.card.getByRole("checkbox").check();
    await second.card.getByRole("button",{name:"Authorize simulated payment",exact:true}).click();
    await second.card.getByRole("button",{name:"Execute simulated payment",exact:true}).click();
    await expect(second.card.getByRole("status").filter({hasText:"COMPLETED"})).toBeVisible({timeout:15_000});
    await contractor.getByRole("button",{name:"Refresh status",exact:true}).click();
    await expect(contractor.getByText("Paid",{exact:true})).toHaveCount(2);
    await context.close();
});
