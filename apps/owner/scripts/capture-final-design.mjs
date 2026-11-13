import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const phase = process.argv[2];
if (!["before", "after"].includes(phase)) throw new Error("Pass before or after.");
const origin = process.env.NNETICS_BROWSER_BASE_URL ?? "http://127.0.0.1:3100";
const directory = fileURLToPath(new URL(`../../../docs/design-review/final-design/${phase}/`, import.meta.url));
await mkdir(directory, { recursive: true });
const browser = await chromium.launch(process.platform === "win32" ? { channel: "msedge" } : {});
const widths = phase === "before" ? [1440, 375] : [1440, 768, 375];
const report = {};
const visit = (page, url) => page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
const heading = (page, name) => page.getByRole("heading", { name, exact: true, level: 1 });
const button = (page, name) => page.getByRole("button", { name, exact: true });

try {
  for (const width of widths) {
    const settings = { baseURL: origin, viewport: { width, height: width === 1440 ? 1000 : 844 }, reducedMotion: "reduce" };
    const owner = await browser.newContext(settings);
    const guest = await browser.newContext(settings);
    const page = await owner.newPage();
    const portal = await guest.newPage();
    report[width] = { captures: [], errors: [], overflow: [] };
    const save = async (name, target = page) => {
      await target.evaluate(() => document.fonts.ready);
      if (await target.evaluate(() => document.documentElement.scrollWidth > innerWidth)) report[width].overflow.push(name);
      const overlay = name.startsWith("assistant-") || name === "mobile-more";
      if (!overlay) await target.evaluate(() => window.scrollTo(0, 0));
      await target.screenshot({ path: `${directory}${width}-${name}.png`, fullPage: !overlay, animations: "disabled", mask: [target.getByLabel("Private invitation link · shown once")] });
      report[width].captures.push(name);
      console.log(width, name);
    };
    const open = async name => {
      await visit(page, `/?mode=demo#${encodeURIComponent(name)}`);
      await heading(page, name).waitFor();
      if (name === "Contractors") await page.getByLabel("Search contractors").waitFor();
      if (name === "Invoices") await page.getByLabel("Filter invoices").waitFor();
      if (name === "Payments") await page.getByRole("heading", {name: /Ready to pay/}).waitFor();
    };
    const check = async (label, run) => {
      try { await run(); } catch (error) {
        report[width].errors.push({ label, message: error.message.split("\n")[0] });
        console.error(width, label, error.message);
      }
    };
    page.setDefaultTimeout(15000);
    portal.setDefaultTimeout(15000);
    await check("entry and setup", async () => {
      await visit(page, "/");
      await heading(page, "Sign in").waitFor();
      await save("entry");
    });
    await check("setup", async () => {
      await visit(page, "/?mode=demo");
      await page.getByLabel("Owner name").fill("Alex Morgan");
      await save("setup-workspace");
      await button(page, "Continue").click();
      await page.getByLabel("Vault name").fill("Studio operations");
      await save("setup-vault");
      await button(page, "Create demo workspace").click();
      await heading(page, "Overview").waitFor();
      await save("overview-empty");
    });
    await check("owner destinations", async () => {
      for (const [name, file] of [["Contractors", "contractors"], ["Invoices", "invoices"], ["Payments", "payments"], ["Activity", "activity"], ["Vault & Controls", "vault"], ["Settings", "settings"]]) {
        await open(name);
        await save(`${file}-empty`);
      }
      if (width === 375) {
        await button(page, "More").click();
        await save("mobile-more");
        await page.getByRole("dialog", { name: "More destinations" }).getByRole("button", { name: "Close navigation" }).click();
      }
    });
    await check("assistant empty and unavailable", async () => {
      await open("Overview");
      await page.getByRole("button", { name: /Ask Nnetics/ }).click();
      await page.getByRole("dialog", {name: "Ask Nnetics demo assistant"}).waitFor();
      await save("assistant-empty");
      await page.route("**/api/agent", async route => {
        await new Promise(resolve => { setTimeout(resolve, 2000); });
        await route.fulfill({ status: 503, json: { error: "The assistant provider is unavailable. Try again in a moment." } });
      });
      await page.getByLabel("Message the demo assistant").fill("What is my vault balance?");
      await button(page, "Send").click();
      if (phase === "after") {
        await page.getByText("Waiting for Nnetics…").waitFor();
        await save("assistant-pending");
      }
      await page.getByText(/assistant provider is unavailable/).waitFor();
      await save("assistant-unavailable");
      await page.unroute("**/api/agent");
      await page.keyboard.press("Escape");
    });
    await check("workspace loading and retry", async () => {
      const state = "**/api/demo/workspace/state";
      await page.route(state, async route => {
        await new Promise(resolve => { setTimeout(resolve, 1600); });
        await route.fulfill({ status: 503, json: { error: "Workspace temporarily unavailable." } });
      });
      await visit(page, "/?mode=demo");
      await heading(page, "Opening your payment desk").waitFor();
      await save("workspace-loading");
      await button(page, "Retry loading").waitFor();
      await save("workspace-retry");
      await page.unroute(state);
      await page.reload({ waitUntil: "domcontentloaded" });
      await heading(page, "Overview").waitFor();
    });
    await check("owner records and private portal", async () => {
      await open("Vault & Controls");
      await page.locator('input[name="amount"]').fill("12.5");
      await button(page, "Fund vault").click();
      await page.getByText(/Funded the Demo Wallet with 12.5 NEAR/).waitFor();
      await button(page, "Pause the demo vault").click();
      await button(page, "Resume the demo vault").waitFor();
      await save("vault-paused");
      await button(page, "Resume the demo vault").click();
      await open("Contractors");
      await page.getByLabel("Contractor name", { exact: true }).fill("Maya Rivera");
      await button(page, "Add contractor").click();
      await button(page, "Create private link · Maya Rivera").click();
      const invitation = await page.getByLabel("Private invitation link · shown once").inputValue();
      await save("contractors-populated");
      await visit(portal, invitation);
      await heading(portal, "Maya Rivera · Billing").waitFor();
      await save("portal-wallet", portal);
      await portal.getByRole("textbox", { name: /testnet wallet/ }).fill("maya-design.testnet");
      await button(portal, "Prepare simulated verification").click();
      await save("portal-wallet-confirmation", portal);
      await button(portal, "Simulate proof and request approval").click();
      await portal.getByText("Awaiting owner approval", { exact: true }).waitFor();
      await save("portal-wallet-pending", portal);
      await button(page, "Refresh owner records").click();
      await button(page, "Approve wallet · Maya Rivera").click();
      await page.getByText("Billing agreement for optional bills", { exact: true }).click();
      await page.getByLabel("Work order reference · Maya Rivera").fill("STUDIO-07");
      await page.getByLabel("Work description · Maya Rivera").fill("Editorial illustrations");
      await page.getByLabel("Amount · Maya Rivera").fill("2.5");
      await button(page, "Approve work order · Maya Rivera").click();
      await page.getByText("Saved billing agreements", { exact: true }).click();
      await page.getByText("STUDIO-07 · Editorial illustrations", { exact: true }).waitFor();
      await save("work-order");
      await portal.reload();
      await button(portal, "Send a bill").click();
      await portal.getByLabel("Bill text", { exact: true }).fill("Work order: STUDIO-07\nAmount: 2.5 NEAR\nIllustrations delivered.");
      await button(portal, "Format labeled details").click();
      await portal.getByLabel("Work description", { exact: true }).fill("Editorial illustrations delivered");
      await save("portal-submit", portal);
      await button(portal, "Submit bill for review").click();
      await portal.getByText("In review", { exact: true }).waitFor();
      await save("portal-invoices", portal);
      await open(phase === "before" ? "Contractors" : "Invoices");
      await page.getByRole("button", { name: /^Approve bill ·/ }).first().waitFor();
      if (phase === "after") {
        await page.getByLabel("Filter invoices").selectOption("In review");
        await page.getByRole("button", {name: /^Approve bill ·/}).first().waitFor();
        await page.getByLabel("Search invoices").fill("no matching record");
        await page.getByText("No invoices match these filters.").waitFor();
        await save("invoices-no-results");
        await page.getByLabel("Search invoices").fill("");
        await page.getByLabel("Filter invoices").selectOption("");
      }
      await save("invoice-review");
      await page.getByRole("button", { name: /^Approve bill ·/ }).first().click();
      await open("Invoices");
      await page.locator('[data-status="Approved"]').first().waitFor();
      await save("invoices-populated");
      await open("Payments");
      await page.getByText("Prepare payment", { exact: true }).first().click();
      await page.getByLabel("Amount (NEAR)", { exact: true }).fill("2.5");
      await page.getByLabel("Payment description").fill("Editorial illustrations");
      await button(page, "Review payment").click();
      await save("payment-review");
      await button(page, "Prepare simulated payment").click();
      await button(page, "Confirm and simulate payment").waitFor();
      await save("payment-confirmation");
      await button(page, "Confirm and simulate payment").click();
      if (phase === "after") {
        await page.getByText(/confirmation accepted.*pending/i).waitFor();
        await save("payment-pending");
      }
      await page.getByText(/Simulated payment recorded/).waitFor();
      await save("payment-success");
      await open("Activity");
      await page.getByRole("link", { name: "View receipt" }).first().waitFor();
      await save("activity-populated");
      await page.getByRole("link", { name: "View receipt" }).first().click();
      await page.getByRole("button", { name: "Copy receipt" }).first().waitFor();
      await save("receipt");
      if (phase === "after") {
        const downloaded = page.waitForEvent("download");
        await page.getByRole("link", {name: "Download receipt"}).first().click();
        const receipt = await downloaded;
        if (!/^nnetics-receipt-\d+\.txt$/.test(receipt.suggestedFilename())) throw new Error("Receipt export filename was unexpected.");
      }
      await open("Overview");
      await save("overview-populated");
      if (phase === "after") {
        await open("Settings");
        await page.getByLabel("Simulated settlement outcome").selectOption("failure");
        await page.getByText(/Set to failure/).waitFor();
        await open("Payments");
        await page.getByText("Prepare payment", {exact: true}).first().click();
        await page.getByLabel("Amount (NEAR)", {exact: true}).fill("1");
        await page.getByLabel("Payment description").fill("Simulated failure check");
        await button(page, "Review payment").click();
        await button(page, "Prepare simulated payment").click();
        await button(page, "Confirm and simulate payment").click();
        await page.getByText(/Simulation failed. Check the payment record/).waitFor();
        await save("payment-failed");
      }
      await open("Contractors");
      await page.getByRole("heading", { name: "Maya Rivera", exact: true }).waitFor();
      page.once("dialog", dialog => dialog.accept());
      await button(page, "Revoke access · Maya Rivera").click();
      await portal.reload();
      await heading(portal, "Private access unavailable").waitFor();
      await save("portal-revoked", portal);
    });
    await check("standalone and fallback", async () => {
      const standalone = await browser.newContext(settings);
      try {
        const sample = await standalone.newPage();
        await visit(sample, "/demo/contractors");
        await heading(sample, "Contractors and bills").waitFor();
        await sample.getByText(/No contractors yet|Start an empty demo workspace|Contractor records unavailable/).first().waitFor();
        await save("standalone-contractors", sample);
        await visit(sample, "/final-design-missing-page");
        await heading(sample, "Page not found").waitFor();
        await save("not-found", sample);
      } finally { await standalone.close(); }
    });
    await check("dark overview", async () => {
      await page.evaluate(() => localStorage.setItem("nnetics-appearance", "dark"));
      await open("Overview");
      await page.reload({waitUntil: "domcontentloaded"});
      await heading(page, "Overview").waitFor();
      await page.locator('html[data-theme="dark"]').waitFor({state: "attached"});
      await save("overview-dark");
    });
    await owner.close();
    await guest.close();
  }
} finally {
  await browser.close();
  await writeFile(`${directory}results.json`, JSON.stringify(report, null, 2));
}
if (Object.values(report).some(result => result.errors.length)) process.exitCode = 1;
