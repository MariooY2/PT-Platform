import { expect, test } from '@playwright/test';
import { signInAs } from './ui-routes';

// P1-13: Phase 1 PWA = manifest + install prompt only (no service worker — that is Phase 3).

test.describe('PWA manifest', () => {
  test('is served with the installable fields (A1)', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.ok()).toBe(true);
    const manifest = (await res.json()) as {
      name: string;
      short_name: string;
      start_url: string;
      display: string;
      theme_color: string;
      background_color: string;
      icons: { src: string; sizes: string; type?: string; purpose?: string }[];
    };

    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe('/client');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);

    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  test('icons resolve as images (A6)', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    const { icons } = (await res.json()) as { icons: { src: string }[] };
    const srcs = [...new Set(icons.map((i) => i.src))];
    expect(srcs.length).toBeGreaterThan(0);
    for (const src of srcs) {
      const iconRes = await request.get(src);
      expect(iconRes.ok(), `icon ${src} should return 2xx`).toBe(true);
      expect(iconRes.headers()['content-type']).toContain('image');
    }
  });
});

test('every page links the manifest and sets theme-color (A2)', async ({ page }) => {
  await page.goto('/login');
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toContain('manifest.webmanifest');
  const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
  expect(themeColor).toMatch(/^#[0-9a-f]{6}$/i);
});

test('install card is dismissible and stays hidden after reload (A3)', async ({ page }) => {
  await signInAs(page, 'client');
  await page.goto('/client');

  const card = page.getByRole('heading', { name: 'Install the app' });
  await expect(card).toBeVisible();

  await page.getByRole('button', { name: 'Dismiss install prompt' }).click();
  await expect(card).toBeHidden();

  await page.reload();
  await expect(card).toBeHidden();
});
