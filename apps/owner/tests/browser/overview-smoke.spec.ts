import {test,expect} from '@playwright/test';
test('fresh demo setup lands on Overview', async ({page}, info) => {
  await page.goto('/?mode=demo');
  await expect(page.getByRole('heading',{name:'Try the Nnetics demo',exact:true})).toBeVisible();
  await page.getByLabel('Owner name').fill('Alex');
  await page.getByRole('button',{name:'Continue'}).click();
  await page.getByLabel('Vault name').fill('Team budget');
  await page.getByRole('button',{name:'Create demo workspace'}).click();
  await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
  await expect(page.locator('.app-shell.demo-shell')).toBeVisible();
  // restyled demo rail: brand mark + six destinations
  const nav=page.locator('nav[aria-label="Owner dashboard"]');
  if(!await nav.isVisible()) await page.getByRole('button',{name:'Toggle navigation'}).click(); // mobile drawer
  await expect(page.locator('.demo-shell .brand-mark')).toBeVisible();
  if(await page.locator('.navigation-backdrop').isVisible()) { await page.keyboard.press('Escape'); }
  // collapsed rail keeps all six destinations
  const railLinks=page.locator('nav[aria-label="Owner dashboard"] a');
  await expect(railLinks).toHaveCount(5);
  if(info.project.name==='desktop'){
    await page.getByRole('button',{name:'Toggle navigation'}).click(); // collapse
    await expect(railLinks).toHaveCount(5);
    await page.getByRole('button',{name:'Toggle navigation'}).click(); // expand back
  }
  await expect(page.getByText('Demo · simulated funds · no wallets, keys or tokens involved')).toBeVisible();
  // right column / empty states
  await expect(page.getByRole('heading',{name:'Available vault balance',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Needs attention',exact:true})).toBeVisible();
  await expect(page.getByText(/There are no available demo funds/)).toBeVisible();
  await expect(page.getByRole('heading',{name:'Total paid',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Recent activity',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Confirmed payouts over time',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Payment status',exact:true})).toBeVisible();
  // donut + legend + dark hero (Siohioma right rail)
  await expect(page.locator('.payment-status-donut')).toBeVisible();
  const legendItems=page.locator('.payment-status-legend li');
  await expect(legendItems).toHaveCount(3);
  await expect(legendItems.first()).toContainText('Paid');
  await expect(page.locator('.overview-attention').getByRole('heading',{name:'Needs attention',exact:true})).toBeVisible();
  for (const title of ['Reserved funds','Pending invoices','Active contractors','Quick actions']) {
    await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  }
  await expect(page.getByRole('button',{name:'Fund the vault',exact:true})).toBeVisible();
});

test('funded demo overview (mobile viewport)', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/?mode=demo');
  await page.getByLabel('Owner name').fill('Alex');
  await page.getByRole('button',{name:'Continue'}).click();
  await page.getByLabel('Vault name').fill('Team budget');
  await page.getByRole('button',{name:'Create demo workspace'}).click();
  // drawer navigation is the nav path on phones
  await page.getByRole('button',{name:'Toggle navigation'}).click();
  await page.getByRole('navigation',{name:'Owner dashboard'}).getByRole('link',{name:'Contractors',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Contractors',exact:true})).toBeVisible();
  // fund vault
  await page.goto('/?mode=demo#Vault');
  // On vault page find fund input: labels
  await page.locator('input[name="amount"]').fill('5');
  await page.getByRole('button',{name:'Fund vault'}).click();
  await page.goto('/?mode=demo#Overview');
  await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
  await expect(page.locator('.overview-balance .payment-workspace-amount')).toHaveText('5 NEAR');
  await expect(page.getByRole('button',{name:'Add contractor'})).toBeVisible();
});

test('dark theme demo overview after setup', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('nnetics-appearance','dark'));
  await page.goto('/?mode=demo');
  await page.getByLabel('Owner name').fill('Alex');
  await page.getByRole('button',{name:'Continue'}).click();
  await page.getByLabel('Vault name').fill('Team budget');
  await page.getByRole('button',{name:'Create demo workspace'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(page.getByRole('heading',{name:'Overview',exact:true})).toBeVisible();
  // banner, donut and legend survive Jade Night
  await expect(page.getByText('Demo · simulated funds · no wallets, keys or tokens involved')).toBeVisible();
  await expect(page.locator('.payment-status-donut')).toBeVisible();
  await expect(page.locator('.payment-status-legend li')).toHaveCount(3);
  await expect(page.getByRole('button',{name:'Fund the vault',exact:true})).toBeVisible();
});
