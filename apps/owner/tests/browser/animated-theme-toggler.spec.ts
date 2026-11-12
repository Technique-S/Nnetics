import {test, expect, type Page} from '@playwright/test';
import {navigateOwner} from './navigation-helpers';

const control = (page: Page) => page.getByRole('switch', {name: 'Dark mode'}).filter({visible: true}).first();
const settled = (page: Page) => expect(page.locator('html')).not.toHaveAttribute('data-magicui-theme-vt', 'active');

test('settings, account menu and layout controls stay synchronized through rapid clicks', async ({page}, info) => {
  await page.emulateMedia({colorScheme: 'light'});
  await page.goto('/?mode=demo');
  await page.getByLabel('Owner name').fill('Theme verification');
  await page.getByRole('button', {name: 'Continue', exact: true}).click();
  await page.getByLabel('Vault name').fill('Theme verification vault');
  await page.getByRole('button', {name: 'Create demo workspace'}).click();
  await expect(page.getByRole('heading', {name: 'Overview', exact: true})).toBeVisible();
  await navigateOwner(page, 'Settings');
  await expect(page.getByRole('heading', {name: 'Appearance', exact: true})).toBeVisible();
  await page.emulateMedia({reducedMotion: 'no-preference'});
  const settingsControl = page.locator('section').filter({has: page.getByRole('heading', {name: 'Appearance', exact: true})}).getByRole('switch');
  await settingsControl.evaluate(element => {
    const button = element as HTMLButtonElement;
    button.click(); button.click(); button.click();
  });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await settled(page);
  for (const button of await page.locator('.theme-control').all()) await expect(button).toHaveAttribute('aria-checked', 'true');
  await settingsControl.click();
  await settled(page);
  for (const button of await page.locator('.theme-control').all()) await expect(button).toHaveAttribute('aria-checked', 'false');
  await page.screenshot({path: `artifacts/theme-toggler/${info.project.name}-settings.png`, fullPage: true});
});

test('500ms circular reveal starts at the button, spans the viewport and survives repeated switching', async ({page}, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // The signed-out identity probe intentionally returns 400; watch hydration
  // diagnostics here, and uncaught runtime errors through pageerror above.
  page.on('console', message => {
    if (message.type() === 'error' && /hydration|hydrated|did not match|server rendered/i.test(message.text())) errors.push(message.text());
  });
  await page.emulateMedia({colorScheme: 'light', reducedMotion: 'no-preference'});
  await page.goto('/');
  await expect(page.getByRole('heading', {name: 'Sign in', exact: true})).toBeVisible();
  await expect(control(page)).toBeEnabled();
  const box = await control(page).boundingBox();
  expect(box).not.toBeNull();
  await page.evaluate(() => {
    const animate = Element.prototype.animate;
    const records: {frames: PropertyIndexedKeyframes | Keyframe[] | null; options?: number | KeyframeAnimationOptions}[] = [];
    Object.assign(window, {themeAnimations: records});
    Element.prototype.animate = function(frames, options) {
      if (typeof options === 'object' && options.pseudoElement === '::view-transition-new(root)') records.push({frames, options});
      return animate.call(this, frames, options);
    };
  });
  for (const theme of ['dark', 'light', 'dark', 'light']) {
    await control(page).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await settled(page);
    await expect(control(page)).toHaveAttribute('aria-checked', String(theme === 'dark'));
  }
  const records = await page.evaluate(() => (window as unknown as {themeAnimations: {frames: {clipPath: string[]}; options: KeyframeAnimationOptions}[]}).themeAnimations);
  expect(records).toHaveLength(4);
  expect(records[0].options.duration).toBe(500);
  const [from, to] = records[0].frames.clipPath;
  const viewport = page.viewportSize()!;
  const origin = `at ${((box!.x + box!.width / 2) / viewport.width) * 100}% ${((box!.y + box!.height / 2) / viewport.height) * 100}%`;
  expect(from).toBe(`circle(0% ${origin})`);
  const radiusPercent = Number(to.match(/circle\(([\d.]+)%/)![1]);
  const radius = radiusPercent / 100 * Math.hypot(viewport.width, viewport.height) / Math.SQRT2;
  const x = box!.x + box!.width / 2, y = box!.y + box!.height / 2;
  expect(radius).toBeGreaterThanOrEqual(Math.hypot(Math.max(x, viewport.width - x), Math.max(y, viewport.height - y)) - 0.001);
  await control(page).focus();
  await page.keyboard.press('Space');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await settled(page);
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Sign in', exact: true})).toBeVisible();
  await expect(control(page)).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => localStorage.getItem('nnetics-appearance'))).toBe('dark');
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({path: `artifacts/theme-toggler/${info.project.name}-dark.png`, fullPage: true});
  await control(page).click();
  await settled(page);
  await page.screenshot({path: `artifacts/theme-toggler/${info.project.name}-light.png`, fullPage: true});
  expect(errors).toEqual([]);
});

for (const fallback of ['unsupported', 'reduced-motion', 'transition-error'] as const) {
  test(`${fallback}: immediate theme changes remain synchronized and persist`, async ({page}) => {
    await page.emulateMedia({colorScheme: 'light', reducedMotion: fallback === 'reduced-motion' ? 'reduce' : 'no-preference'});
    await page.addInitScript(mode => {
      if (mode === 'unsupported') Object.defineProperty(document, 'startViewTransition', {value: undefined});
      else Object.defineProperty(document, 'startViewTransition', {value: () => { throw Error('Transition must fall back'); }});
    }, fallback);
    await page.goto('/?mode=demo');
    await expect(page.getByLabel('Owner name')).toBeVisible();
    await expect(control(page)).toBeEnabled();
    for (const theme of ['dark', 'light', 'dark']) {
      await control(page).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await settled(page);
    }
    await page.reload();
    await expect(page.getByLabel('Owner name')).toBeVisible();
    await expect(control(page)).toHaveAttribute('aria-checked', 'true');
  });
}
