import { execFileSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { signInAs } from './ui-routes';

const status = JSON.parse(
  execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  }),
) as Record<string, string>;
const admin: SupabaseClient = createClient(
  status.API_URL ?? status.api_url,
  status.SERVICE_ROLE_KEY ?? status.service_role_key ?? status.SECRET_KEY ?? status.secret_key,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

test.describe('P1-05 program builder (as coach)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'coach');
    await page.goto('/coach/programs');
    await expect(page.getByRole('heading', { level: 1, name: 'Programs' })).toBeVisible();
  });

  test.afterAll(async () => {
    await admin.from('programs').delete().like('title', 'E2E prog%');
  });

  test('the seeded sample template is listed', async ({ page }) => {
    await expect(page.getByText('Sample 3-Day Strength')).toBeVisible();
  });

  test('A3/A4/A5 — create, add a workout + exercise, quick-entry, superset, publish', async ({
    page,
  }) => {
    const name = `E2E prog ${Date.now()}`;
    await page.getByRole('button', { name: 'New program' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name').fill(name);
    await dialog.getByRole('button', { name: 'Create program' }).click();

    // Navigated to the builder.
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(page.getByText('Template', { exact: true })).toBeVisible(); // template/copy header (A5)

    // Add a workout on Monday, then open it.
    await page
      .locator('div', { hasText: /^Mon/ })
      .getByRole('button', { name: 'Add' })
      .first()
      .click();
    await page
      .getByRole('button', { name: /New workout/ })
      .first()
      .click();

    // Add an exercise via the picker.
    await page.getByRole('combobox', { name: 'Add exercise' }).click();
    await page.getByRole('option', { name: /Back squat/ }).click();

    // Quick entry → prescribed sets (A3 integration).
    const presc = page.getByRole('textbox', { name: /Prescription for/ });
    await presc.fill('3x8-10 RPE8');
    await presc.press('Enter');
    await expect(page.getByText(/3 × 8–10/)).toBeVisible();

    // Superset group (A5).
    await page.getByRole('button', { name: 'Superset' }).click();
    await expect(page.getByText('A1', { exact: true })).toBeVisible();

    // Publish.
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();
  });
});
