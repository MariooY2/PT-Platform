import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { routeSlug, signInAs, uiRoutes } from './ui-routes';

const THEMES = ['light', 'dark'] as const;
const VIEWPORTS = [
  { label: '360', width: 360, height: 740 },
  { label: '1280', width: 1280, height: 800 },
];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const EVIDENCE_ROOT = join(process.cwd(), '.harness', 'evidence', 'ui');

async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

for (const route of uiRoutes) {
  const slug = routeSlug(route.path);
  test.describe(`${route.path}`, () => {
    // Capture + axe-scan each state × viewport × theme separately. A non-default state is reached by
    // the `?state=<state>` query param (screens read it); `default` loads the route plainly.
    for (const state of route.states) {
      for (const theme of THEMES) {
        for (const vp of VIEWPORTS) {
          test(`${state} · ${vp.label} · ${theme}`, async ({ page }) => {
            await page.emulateMedia({ colorScheme: theme });
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await signInAs(page, route.as);
            const url =
              state === 'default' ? route.path : `${route.path}?state=${encodeURIComponent(state)}`;
            await page.goto(url);
            await settle(page);

            const dir = join(EVIDENCE_ROOT, slug);
            mkdirSync(dir, { recursive: true });
            // The app shell uses an inner scroll region (`#main`), so the document itself doesn't
            // scroll and `fullPage` would capture only the viewport. Grow the viewport to the content
            // height to capture everything, then restore the real viewport before axe runs (so
            // target-size and friends are judged at the actual 360/1280 layout).
            const contentHeight = await page.evaluate(
              () =>
                document.getElementById('main')?.scrollHeight ??
                document.documentElement.scrollHeight,
            );
            await page.setViewportSize({
              width: vp.width,
              height: Math.max(vp.height, Math.ceil(contentHeight) + 64),
            });
            await page.screenshot({
              path: join(dir, `${state}-${vp.label}-${theme}.png`),
              fullPage: true,
            });
            await page.setViewportSize({ width: vp.width, height: vp.height });

            const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
            expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
          });
        }
      }
    }
  });
}

test('num utilities use tabular figures (equal width for 000 and 111)', async ({ page }) => {
  await page.goto('/dev/ui');
  await settle(page);
  const zeros = await page.getByTestId('tnum-zeros').boundingBox();
  const ones = await page.getByTestId('tnum-ones').boundingBox();
  expect(zeros).not.toBeNull();
  expect(ones).not.toBeNull();
  expect(Math.abs(zeros!.width - ones!.width)).toBeLessThan(0.5);
});

test('dialog is accessible and returns focus to its trigger on close', async ({ page }) => {
  await page.goto('/dev/ui');
  await settle(page);
  const trigger = page.getByRole('button', { name: 'Open dialog' });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
