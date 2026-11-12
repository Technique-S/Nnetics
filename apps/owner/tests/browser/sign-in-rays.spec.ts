import {test, expect} from '@playwright/test';

for (const theme of ['light', 'dark'] as const) {
  for (const reduced of [false, true]) {
    test(`${theme}: sign-in rays are visible immediately, reduced motion=${reduced}`, async ({page}, info) => {
      test.setTimeout(90_000);
      await page.route('**/api/live/config', route => route.fulfill({json: {
        network: 'testnet', wallet: 'meteor', configured: false,
        configurationValid: true, transactionsEnabled: false, paymentExecutionEnabled: false,
      }}));
      await page.route('**/api/live/identity', route => route.fulfill({status: 401, json: {error: 'Signed out'}}));
      await page.emulateMedia({colorScheme: theme, reducedMotion: reduced ? 'reduce' : 'no-preference'});
      await page.goto('/');
      await expect(page.getByRole('heading', {name: 'Sign in', exact: true})).toBeVisible({timeout: 30_000});
      const background = page.locator('[data-signin-light-rays]');
      await expect(background).toHaveCSS('pointer-events', 'none');
      const rays = background.locator('[data-light-ray]');
      await expect(rays).toHaveCount(5);
      await expect(rays.first()).toHaveAttribute('data-static', String(reduced));
      expect(await rays.first().evaluate(el => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.05);
      const connect = page.getByRole('button', {name: 'Connect to Meteor', exact: true});
      expect(await connect.evaluate(el => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      })).toBeTruthy();
      await expect(page.locator('.demo-smooth-cursor')).toHaveCount(0);
      await page.screenshot({path: `artifacts/magic-ui/${info.project.name}-signin-${theme}-${reduced ? 'static' : 'animated'}.png`, fullPage: true, animations: 'disabled'});
      await expect(page.getByRole('link', {name: 'Try demo'})).toHaveAttribute('href', '/?mode=demo');

    });
  }
}
