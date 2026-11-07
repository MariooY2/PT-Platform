import { expect, test } from '@playwright/test';

test('landing page renders', async ({ page }) => {
  await page.goto('/');
  // Calibrated marketing landing (UX-01): the hero headline + a sign-up CTA + the wordmark.
  await expect(page.getByRole('heading', { name: /coach more clients/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /start coaching free/i })).toBeVisible();
});
