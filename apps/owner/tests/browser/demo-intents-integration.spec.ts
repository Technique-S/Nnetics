import {test,expect,type Page,type Locator} from "@playwright/test";
import {navigateOwner} from "./navigation-helpers";
const origin=process.env.NNETICS_BROWSER_BASE_URL||"http://127.0.0.1:3100";

async function workspace(page:Page) {
    await page.goto("/?mode=demo");
    await page.getByLabel("Owner name").fill("Integration Owner");
    await page.getByRole("button",{name:"Continue",exact:true}).click();
    await page.getByLabel("Vault name").fill("Integrated Studio");
    await page.getByRole("button",{name:"Create demo workspace",exact:true}).click();
    await expect(page.getByRole("heading",{name:"Overview",exact:true})).toBeVisible();
    await navigateOwner(page,"Vault & Controls");
    await page.locator('input[name="amount"]').fill("10");
    await page.getByRole("button",{name:"Fund vault",exact:true}).click();
    await expect(page.getByText(/Funded the Demo Wallet with 10 NEAR/)).toBeVisible();
    await navigateOwner(page,"Contractors");
    await expect(page.getByLabel("Contractor name",{exact:true})).toBeVisible();
}

test("main Demo Mode integrates unlinked billing, intent payment, balances, history and refund recovery",async({page,browser},info)=>{
    test.setTimeout(150_000);
    await page.emulateMedia({reducedMotion:"reduce"});await workspace(page);
    await page.getByLabel("Contractor name",{exact:true}).fill("Integrated Designer");
    await page.getByRole("button",{name:"Add contractor",exact:true}).click();
    await page.getByRole("button",{name:"Create private link · Integrated Designer",exact:true}).click();
    const invitation=await page.getByLabel("Private invitation link · shown once").inputValue();
    const context=await browser.newContext({baseURL:origin,viewport:page.viewportSize()!});
    try {
        const contractor=await context.newPage();await contractor.goto(invitation);
        // Billing can precede initial wallet approval and never collects a destination.
        await contractor.getByRole("button",{name:"Send a bill",exact:true}).click();
        await expect(contractor.getByLabel("Work order (optional)",{exact:true})).toHaveValue("");
        await expect(contractor.locator("#invoice-wallet")).toHaveCount(0);
        async function submit(description:string) {
            await contractor.getByRole("button",{name:"Send a bill",exact:true}).click();
            await contractor.getByLabel("Bill text",{exact:true}).fill(`${description}. Amount: 1 NEAR.`);
            await contractor.getByLabel("Work description",{exact:true}).fill(description);
            await contractor.getByLabel("Amount (as invoiced)").fill("1");
            await contractor.getByRole("button",{name:"Submit bill for review",exact:true}).click();
            const data=await (await contractor.request.get("/api/demo/contractors/contractor")).json();
            const bill=data.invoices.find((b:{description:string})=>b.description===description);
            await navigateOwner(page,"Invoices");
            await page.getByRole("button",{name:"Refresh workspace",exact:true}).click();
            await page.getByRole("button",{name:`Open payable · ${bill.reference}`,exact:true}).click();
            await expect(page.getByRole("heading",{name:bill.reference,exact:true})).toBeVisible();
            const card=page.getByRole("region",{name:"Payable Details"});
            await card.getByText("View details",{exact:true}).click();await expect(card).toContainText("No work order");
            await card.getByRole("button",{name:`Approve bill · ${bill.reference}`,exact:true}).click();
            return {bill,card};
        }
        const first=await submit("Integrated design");
        await first.card.getByText("Simulated NEAR Intents",{exact:true}).click();
        await first.card.getByRole("button",{name:"Preview simulated quote",exact:true}).click();
        await expect(first.card.getByRole("alert")).toContainText("Approved recipient wallet required");
        await contractor.getByRole("button",{name:"Wallet details",exact:true}).click();
        await contractor.getByRole("textbox",{name:/testnet wallet/}).fill("integrated-designer.testnet");
        await contractor.getByRole("button",{name:"Prepare simulated verification",exact:true}).click();
        await contractor.getByRole("button",{name:"Simulate proof and request approval",exact:true}).click();
        await navigateOwner(page,"Contractors");
        await page.getByRole("button",{name:"Approve wallet · Integrated Designer",exact:true}).click();
        await navigateOwner(page,"Payments");

        await expect(page.getByRole("heading",{name:"Payables",exact:true,level:1})).toBeVisible();
        async function pay(card:Locator,outcome="success",open=true) {
            if(open)await card.getByText("Simulated NEAR Intents",{exact:true}).click();
            await card.getByLabel("Funding asset and network").selectOption("usdc-ethereum");await card.getByLabel("Simulation outcome").selectOption(outcome);
            await card.getByRole("button",{name:"Preview simulated quote",exact:true}).click();
            await expect(card.getByText("4.01 USDC · Ethereum",{exact:true})).toBeVisible();
            await expect(card.getByText("integrated-designer.testnet · version 1",{exact:true})).toBeVisible();
            await card.getByRole("checkbox").check();
            await card.getByRole("button",{name:"Authorize simulated payment",exact:true}).click();
            await card.getByRole("button",{name:"Execute simulated payment",exact:true}).click();
        }
        await pay(first.card);
        await expect(first.card.getByRole("status").filter({hasText:"COMPLETED"})).toBeVisible({timeout:15_000});
        await expect(first.card.locator(".payable-summary")).toContainText("Paid");
        await first.card.getByText(/Payment audit history/).click();
        await expect(first.card.getByText("EXECUTING",{exact:true})).toBeVisible();
        await page.screenshot({path:info.outputPath("main-invoice-intents.png"),fullPage:true});
        await navigateOwner(page,"Overview");
        await expect(page.locator(".overview-paid")).toContainText("1 NEAR");
        await expect(page.locator(".overview-paid")).toContainText("1 confirmed payout");
        const balance=await (await page.request.get("/api/demo/workspace/state")).json();
        expect(balance.vault.spent).toBe("1002500000000000000000000");expect(balance.vault.reserved).toBe("0");
        await navigateOwner(page,"Payments");
        await expect(page.getByRole("region",{name:"Payable Details"})).toContainText("Paid");
        await navigateOwner(page,"Activity");
        const audits=page.getByRole("region",{name:"Audit events"});
        await expect(audits).toContainText("Simulated NEAR Intents");await expect(audits).toContainText("COMPLETED");
        await page.reload();await expect(audits).toContainText("COMPLETED");
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
        await expect(page.locator('a[href*="nearblocks"],a[href*="explorer"]')).toHaveCount(0);
        // Both failures leave the invoice approved and funds recoverable.
        for(const scenario of ["failure","refund"]) {
            const next=await submit(`Integrated ${scenario}`);await pay(next.card,scenario);
            await expect(next.card.getByRole("status").filter({hasText:scenario==="refund"?"REFUNDED":"FAILED"})).toBeVisible({timeout:15_000});
            await expect(next.card.locator(".payable-summary")).toContainText("Ready to Pay");
            const state=await (await page.request.get("/api/demo/workspace/state")).json();
            expect(state.vault.reserved).toBe("0");
            await pay(next.card,"success",false);
            await expect(next.card.getByRole("status").filter({hasText:"COMPLETED"})).toBeVisible({timeout:15_000});
        }
        await contractor.getByRole("button",{name:"My payments",exact:true}).click();
        await contractor.getByRole("button",{name:"Refresh status",exact:true}).click();
        await expect(contractor.getByText("Paid",{exact:true})).toHaveCount(3);
        expect(page.url()).not.toContain("/demo/contractors");
    }finally{await context.close();}
});

test("existing Ask Nnetics interface previews an integrated demo invoice through its configured provider",async({page},info)=>{
    test.skip(process.env.NNETICS_RUN_REAL_MODEL_ACCEPTANCE!=="1","External-provider acceptance requires explicit opt-in; controlled-provider regressions run without credentials.");
    test.skip(info.project.name!=="desktop","One configured-provider check covers the model path.");
    test.setTimeout(150_000);
    const status=await (await page.request.get("/api/agent")).json();
    test.skip(!status.provider?.configured,"Existing AI provider configuration is required; controlled-provider tests cover authorization without credentials.");
    await workspace(page);
    const post=async(path:string,data:unknown)=>{
        const response=await page.request.post(path,{data,headers:{Origin:origin}});
        expect(response.ok(),await response.text()).toBeTruthy();return response.json();
    };
    const profile=await post("/api/demo/contractors/owner",{action:"create-profile",name:"Assistant Designer"});
    const link=await post("/api/demo/contractors/owner",{action:"issue-link",profileId:profile.profileId});
    // Only fixture setup uses API calls; Ask Nnetics uses its real existing UI and route.
    await post("/api/demo/contractors/enter",{token:link.token});
    const challenge=await post("/api/demo/contractors/contractor",{action:"wallet-challenge",account:"assistant-designer.testnet"});
    await post("/api/demo/contractors/contractor",{action:"wallet-proof",challenge:challenge.challenge});
    const portal=await (await page.request.get("/api/demo/contractors/owner")).json();
    await post("/api/demo/contractors/owner",{action:"approve-wallet",profileId:profile.profileId,requestId:portal.profiles[0].pendingWallet.id});
    const {invoice}=await post("/api/demo/contractors/contractor",{action:"submit-invoice",submissionId:crypto.randomUUID(),fields:{orderId:"",amount:"1",asset:"NEAR"},text:"Design delivered for 1 NEAR",description:"Assistant design"});
    await post("/api/demo/contractors/owner",{action:"review-invoice",invoiceId:invoice.id,decision:"approve",note:""});
    await page.getByRole("button",{name:"Ask Nnetics",exact:true}).click();
    const panel=page.getByRole("dialog",{name:"Ask Nnetics demo assistant"});
    await panel.getByLabel("Message the demo assistant").fill(`Check eligibility and preview a simulated USDC Ethereum intent for invoice ID ${invoice.id}. Show source amount, fee and recipient. Do not authorize or pay.`);
    const completed=page.waitForResponse(r=>r.url().endsWith("/api/agent")&&r.request().method()==="POST",{timeout:100_000});
    await panel.getByRole("button",{name:"Send",exact:true}).click();
    const response=await completed,body=await response.json();expect(response.status(),body.error||body.reply).toBe(200);
    await expect(panel.locator(".ask-nnetics-assistant").last()).toContainText("4.01");
    await expect(panel.locator(".ask-nnetics-assistant").last()).toContainText("assistant-designer.testnet");
    await panel.getByRole("button",{name:"View payables",exact:true}).click();
    if(await panel.isVisible())await panel.getByRole("button",{name:"Close the demo assistant"}).click();
    await expect(page.getByRole("button",{name:`Open payable · ${invoice.reference}`,exact:true})).toBeVisible();
    const state=await (await page.request.get("/api/demo/workspace/state")).json();
    expect(state.payments).toHaveLength(0);expect(state.vault.reserved).toBe("0");
});
