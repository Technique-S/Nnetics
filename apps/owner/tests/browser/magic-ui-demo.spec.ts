import {test, expect, type Page} from '@playwright/test';
import {navigateOwner} from './navigation-helpers';

const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(({page}) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
});
test.afterEach(({page}) => expect(runtimeErrors.get(page)).toEqual([]));

async function setup(page: Page) {
  await page.goto('/?mode=demo');
  await expect(page.getByLabel('Owner name')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-demo-ui', 'true');
  await page.getByLabel('Owner name').fill('Magic UI verification');
  await page.getByRole('button', {name: 'Continue', exact: true}).click();
  await page.getByLabel('Vault name').fill('Magic UI demo vault');
  await page.getByRole('button', {name: 'Create demo workspace'}).click();
  await expect(page.getByRole('heading', {name: 'Overview', exact: true})).toBeVisible();
}

for (const viewport of [{name: 'desktop', width: 1440, height: 1080}, {name: 'tablet', width: 820, height: 1180}, {name: 'mobile', width: 390, height: 844}]) {
  test(`${viewport.name}: demo routes in both themes preserve layout, amounts and controls`, async ({page}) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({colorScheme: 'light', reducedMotion: 'reduce'});
    await page.goto('/?mode=demo');
    await expect(page.getByLabel('Owner name')).toBeVisible();
    await expect(page.locator('[data-demo-entry-rays]')).toHaveCount(1);
    await expect(page.locator('.demo-entry-rays')).toHaveCSS('pointer-events', 'none');
    await expect(page.locator('.demo-smooth-cursor')).toHaveCount(0);
    await page.screenshot({path: `artifacts/magic-ui/${viewport.name}-entry.png`, fullPage: true});
    await setup(page);
    await expect(page.locator('[data-demo-entry-rays]')).toHaveCount(0);
    for (const theme of ['light', 'dark'] as const) {
      await page.emulateMedia({colorScheme: theme, reducedMotion: 'reduce'});
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await navigateOwner(page, 'Overview');
      const navContrast = await page.locator('#owner-navigation a[aria-current="page"]').evaluate(el => {
        const style = getComputedStyle(el);
        const luminance = (color: string) => {
          const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(c => {
            const v = c / 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          });
          return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
        };
        const a = luminance(style.color), b = luminance(style.backgroundColor);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      });
      expect(navContrast).toBeGreaterThanOrEqual(4.5);
      await expect(page.locator('[data-magic-bento]')).toHaveCount(1);
      expect(await page.locator('.demo-magic-card').count()).toBeGreaterThan(5);
      for (const count of await page.locator('.demo-count').all()) await expect(count).toHaveText((await count.getAttribute('data-count'))!);
      await expect(page.locator('.amount .demo-count')).toHaveCount(0);
      await expect(page.locator('.overview-balance .amount.large')).toContainText('0');
      for (const route of ['Overview', 'Contractors', 'Payables', 'Activity', 'Vault & Controls', 'Settings']) {
        await navigateOwner(page, route);
        await expect(page.getByRole('heading', {name: route, exact: true})).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({path: `artifacts/magic-ui/${viewport.name}-${theme}-${route.replaceAll(/[^a-z]/gi, '').toLowerCase()}.png`, fullPage: true});
      }
    }
  });
}

test('cursor stays operational over dialogs, preserves editing and disables for reduced motion', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await setup(page);
  await page.mouse.move(400, 300);
  await expect(page.locator('html')).toHaveAttribute('data-smooth-cursor', 'true');
  await expect(page.locator('.demo-smooth-cursor')).toHaveCSS('pointer-events', 'none');
  expect(await page.locator('.demo-smooth-cursor').evaluate(el => el.matches(':popover-open'))).toBeTruthy();
  await page.getByRole('button', {name: 'Ask Nnetics', exact: true}).click();
  const input = page.getByLabel('Message the demo assistant');
  await input.hover();
  await expect(page.locator('html')).not.toHaveAttribute('data-smooth-cursor', 'true');
  await expect(input).toHaveCSS('cursor', 'text');
  await input.fill('Selection remains native');
  await input.selectText();
  await page.getByRole('heading', {name: 'Ask Nnetics', exact: true}).hover();
  await expect(page.locator('html')).toHaveAttribute('data-smooth-cursor', 'true');
  expect(await page.locator('.demo-smooth-cursor').evaluate(el => el.matches(':popover-open'))).toBeTruthy();
  await page.emulateMedia({reducedMotion: 'reduce'});
  await expect(page.locator('.demo-smooth-cursor')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-smooth-cursor', 'true');
});

test('new activity keeps chronological keys and exact smallest-unit amounts without replaying history', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await setup(page);
  const fund = (amount: string) => page.evaluate(async value => {
    const response = await fetch('/api/demo/workspace/fund', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({amount: value})});
    if (!response.ok) throw Error('Demo funding failed');
  }, amount);
  await fund('1');
  await page.getByRole('button', {name: 'Refresh workspace', exact: true}).click();
  await expect(page.locator('.overview-balance .amount.large')).toHaveText('0.000000000000000000000001 NEAR');
  const records = page.locator('.overview-list-item');
  await expect(records).toHaveCount(1);
  const original = await records.first().elementHandle();
  await fund('20');
  await page.getByRole('button', {name: 'Refresh workspace', exact: true}).click();
  await expect(records).toHaveCount(2);
  await expect(records.first().locator('.amount')).toHaveText('0.00000000000000000000002 NEAR');
  await expect(records.nth(1).locator('.amount')).toHaveText('0.000000000000000000000001 NEAR');
  expect(await original!.evaluate(el => el.isConnected)).toBeTruthy();
  await expect(page.locator('.overview-balance .amount.large')).toHaveText('0.000000000000000000000021 NEAR');
  await expect(page.locator('.amount .demo-count')).toHaveCount(0);
});

test('assistant content is accessible immediately; monetary replies remain static; scroll edges yield to focus', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await setup(page);
  let response = 'Your workspace is ready to explore.';
  await page.route('**/api/agent', route => route.fulfill({json: {reply: response, mode: 'demo', actions: []}}));
  await page.getByRole('button', {name: 'Ask Nnetics', exact: true}).click();
  const input = page.getByLabel('Message the demo assistant');
  await input.fill('Help me explore');
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  await expect(page.getByText(response, {exact: true})).toBeAttached();
  await expect(page.locator('.ask-nnetics-assistant').last()).toContainText(response);
  response = 'Available balance: 0.000000000000000000000001 NEAR. Approval is required.';
  await input.fill('Read my balance');
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  const reply = page.locator('.ask-nnetics-assistant').last();
  await expect(reply).toContainText(response);
  await expect(reply.locator('[data-magic-typing]')).toHaveCount(0);
  response = 'contractor-demo.testnet';
  await input.fill('Show the recipient');
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  await expect(page.locator('.ask-nnetics-assistant').last()).toContainText(response);
  await expect(page.locator('.ask-nnetics-assistant').last().locator('[data-magic-typing]')).toHaveCount(0);
  for (let i = 0; i < 5; i++) {
    response = 'Details remain readable. '.repeat(25);
    await input.fill(`Explain ${i}`);
    await page.getByRole('button', {name: 'Send', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Send', exact: true})).not.toHaveAttribute('aria-busy', 'true');
  }
  const log = page.getByRole('log', {name: 'Conversation'});
  expect(await log.evaluate(el => el.scrollHeight > el.clientHeight)).toBeTruthy();
  await expect(page.locator('.ask-nnetics-panel .demo-scroll-edge')).not.toHaveCount(0);
  await log.focus();
  await expect(page.locator('.ask-nnetics-panel .demo-scroll-edges')).toHaveCSS('visibility', 'hidden');
});

test('signed-out live pages do not receive any demo effects', async ({page}) => {
  for (const route of ['/', '/contractor']) {
    await page.goto(route);
    await expect(page.getByRole('heading', {name: route === '/' ? 'Sign in' : 'Private access unavailable', exact: true})).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-demo-ui', 'true');
    await expect(page.locator('.demo-magic-button,.demo-smooth-cursor,[data-demo-entry-rays],[data-magic-bento]')).toHaveCount(0);
  }
});

test('touch devices retain their native pointer', async ({browser, baseURL}) => {
  const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, reducedMotion: 'no-preference'});
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/?mode=demo`);
    await expect(page.getByLabel('Owner name')).toBeVisible();
    await expect(page.locator('.demo-smooth-cursor')).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-smooth-cursor', 'true');
  } finally {await context.close();}
});
