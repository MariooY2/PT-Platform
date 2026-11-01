import { expect, test } from '@playwright/test';
import { signInAs } from './ui-routes';

// Hardcoded (not imported from the component) so the test catches a divergence from the spec.
const COACH_SIDEBAR_DESTS = [
  '/coach',
  '/coach/clients',
  '/coach/checkins',
  '/coach/messages',
  '/coach/programs',
  '/coach/exercises',
  '/coach/forms',
  '/coach/products',
  '/coach/orders',
  '/coach/earnings',
  '/coach/settings',
];
const COACH_BOTTOM = ['Today', 'Clients', 'Check-ins', 'Messages', 'More'];
const CLIENT_BOTTOM = ['Today', 'Progress', 'Messages', 'More'];
const CLIENT_DESTS = [
  '/client',
  '/client/progress',
  '/client/messages',
  '/client/checkins',
  '/client/billing',
  '/client/settings',
];
const ADMIN_DESTS = [
  '/admin',
  '/admin/orders',
  '/admin/payments',
  '/admin/payouts',
  '/admin/settings',
];

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 360, height: 740 };

test.describe('A1 — every destination reaches its page and marks the current item', () => {
  test('coach sidebar destinations (desktop)', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signInAs(page, 'coach-empty');
    for (const dest of COACH_SIDEBAR_DESTS) {
      await page.goto(dest);
      await expect(page).toHaveURL(new RegExp(`${dest}(\\?|$)`));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator(`a[href="${dest}"][aria-current="page"]`).first()).toBeVisible();
    }
  });

  test('client destinations (phone)', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await signInAs(page, 'client');
    for (const dest of CLIENT_DESTS) {
      await page.goto(dest);
      await expect(page).toHaveURL(new RegExp(`${dest}(\\?|$)`));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
    // Bottom-tab destinations carry aria-current.
    await page.goto('/client/progress');
    await expect(
      page.locator('a[href="/client/progress"][aria-current="page"]').first(),
    ).toBeVisible();
  });

  test('admin destinations (desktop)', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signInAs(page, 'admin');
    for (const dest of ADMIN_DESTS) {
      await page.goto(dest);
      await expect(page).toHaveURL(new RegExp(`${dest}(\\?|$)`));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator(`a[href="${dest}"][aria-current="page"]`).first()).toBeVisible();
    }
  });
});

test.describe('A2 — responsive navigation', () => {
  test('coach: 5 labelled bottom tabs below 768px', async ({ page }) => {
    await signInAs(page, 'coach-empty');
    for (const vp of [PHONE, { width: 767, height: 900 }]) {
      await page.setViewportSize(vp);
      await page.goto('/coach');
      const nav = page.locator('nav:visible');
      await expect(nav).toHaveCount(1);
      await expect(nav.locator('a')).toHaveCount(5);
      for (const label of COACH_BOTTOM) {
        await expect(nav.getByRole('link', { name: label })).toBeVisible();
      }
    }
  });

  test('coach: grouped sidebar at 1024px and above', async ({ page }) => {
    await signInAs(page, 'coach-empty');
    for (const vp of [{ width: 1024, height: 800 }, DESKTOP]) {
      await page.setViewportSize(vp);
      await page.goto('/coach');
      const sidebar = page.locator('nav:visible');
      await expect(sidebar).toHaveCount(1);
      for (const group of ['Coaching', 'Library', 'Store']) {
        await expect(sidebar.getByText(group, { exact: true })).toBeVisible();
      }
      // The bottom bar is hidden on desktop.
      await expect(sidebar.getByRole('link', { name: 'Today' })).toBeVisible();
    }
  });

  test('coach: the More tab is current on its child routes (phone)', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await signInAs(page, 'coach-empty');
    await page.goto('/coach/programs');
    await expect(page.locator('a[href="/coach/more"][aria-current="page"]')).toBeVisible();
  });

  test('client: always 4 labelled bottom tabs in a column of at most 560px', async ({ page }) => {
    await signInAs(page, 'client');
    for (const vp of [PHONE, DESKTOP]) {
      await page.setViewportSize(vp);
      await page.goto('/client');
      const nav = page.locator('nav:visible');
      await expect(nav).toHaveCount(1);
      await expect(nav.locator('a')).toHaveCount(4);
      for (const label of CLIENT_BOTTOM) {
        await expect(nav.getByRole('link', { name: label })).toBeVisible();
      }
      const box = await page.locator('main#main').boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeLessThanOrEqual(560.5);
    }
  });
});

test.describe('A5 — skip link and keyboard access (coach)', () => {
  test('skip link focuses, reveals, and jumps to main content', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await signInAs(page, 'coach-empty');
    await page.goto('/coach');

    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible(); // not-sr-only once focused

    await page.keyboard.press('Enter');
    await expect(page.locator('main#main')).toBeFocused();
  });

  test('a full keyboard pass reaches every sidebar link with a visible focus ring', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await signInAs(page, 'coach-empty');
    await page.goto('/coach');

    await page.keyboard.press('Tab'); // skip link
    for (const dest of COACH_SIDEBAR_DESTS) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return null;
        const s = getComputedStyle(el);
        return {
          href: el.getAttribute('href'),
          outlineStyle: s.outlineStyle,
          outlineWidth: s.outlineWidth,
          boxShadow: s.boxShadow,
        };
      });
      expect(info, `focus should land on a link at step ${dest}`).not.toBeNull();
      expect(info!.href).toBe(dest);
      const hasRing =
        (info!.outlineStyle !== 'none' && parseFloat(info!.outlineWidth) > 0) ||
        (info!.boxShadow !== 'none' && info!.boxShadow !== '');
      expect(hasRing, `link ${dest} must show a visible focus ring`).toBeTruthy();
    }
  });
});
