import {expect, type Page} from "@playwright/test";

export async function fixtureWorkspace(page: Page, options: {submitInvoice?: boolean; text?: string; amount?: string} = {}) {
  await page.goto("/?mode=demo");
  await page.getByLabel("Owner name").fill("Action acceptance");
  await page.getByRole("button",{name:"Continue",exact:true}).click();
  await page.getByLabel("Vault name").fill("Action vault");
  await page.getByRole("button",{name:"Create demo workspace"}).click();
  await expect(page.getByRole("heading",{name:"Overview",exact:true})).toBeVisible();
  return page.evaluate(async ({submitInvoice, text, amount}) => {
    const post = async (path: string, data: unknown) => {
      const response=await fetch("/api/demo/contractors/"+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
      const result=await response.json();
      if(!response.ok)throw Error(result.error);
      return result;
    };
    const created=await post("owner",{action:"create-profile",name:"Action contractor"});
    const link=await post("owner",{action:"issue-link",profileId:created.profileId});
    await post("enter",{token:link.token});
    const proof=await post("contractor",{action:"wallet-challenge",account:"editor-demo.testnet"});
    await post("contractor",{action:"wallet-proof",challenge:proof.challenge});
    const records=await (await fetch("/api/demo/contractors/owner")).json();
    const profile=records.profiles[0];
    await post("owner",{action:"approve-wallet",profileId:profile.id,requestId:profile.pendingWallet.id});
    await post("owner",{action:"create-order",profileId:profile.id,reference:"ACTION-WO",title:"Action work",amount:"3"});
    const owner=await (await fetch("/api/demo/contractors/owner")).json();
    if(submitInvoice) await post("contractor",{action:"submit-invoice",submissionId:crypto.randomUUID(),fields:{orderId:owner.orders[0].id,amount,asset:"NEAR",recipient:""},text,description:"Action work"});
    return {profileId:profile.id as string, orderId:owner.orders[0].id as string};
  }, {submitInvoice: options.submitInvoice !== false, text: options.text ?? "Action work delivered", amount: options.amount ?? "3"});
}

