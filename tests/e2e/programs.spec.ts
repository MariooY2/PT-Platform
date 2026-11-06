import { makeAdmin } from './supabase-admin';
import { expect, test } from '@playwright/test';
import { signInAs } from './ui-routes';

const admin = makeAdmin();

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

    // Add two exercises via the picker (a superset needs a pair).
    await page.getByRole('combobox', { name: 'Add exercise' }).click();
    await page.getByRole('option', { name: /Back squat/ }).click();
    await page.getByRole('combobox', { name: 'Add exercise' }).click();
    await page.getByRole('option', { name: /Overhead press/ }).click();

    // Quick entry → prescribed sets (A3 integration) on the first exercise.
    const presc = page.getByRole('textbox', { name: /Prescription for/ }).first();
    await presc.fill('3x8-10 RPE8');
    await presc.press('Enter');
    await expect(page.getByText(/3 × 8–10/)).toBeVisible();

    // Superset group (A5): grouping the first exercise with the next pairs them as A1 / A2.
    await page.getByRole('button', { name: 'Superset' }).first().click();
    await expect(page.getByText('A1', { exact: true })).toBeVisible();
    await expect(page.getByText('A2', { exact: true })).toBeVisible();

    // Ungroup clears the whole group (both labels disappear).
    await page.getByRole('button', { name: 'Ungroup' }).first().click();
    await expect(page.getByText('A1', { exact: true })).toHaveCount(0);
    await expect(page.getByText('A2', { exact: true })).toHaveCount(0);

    // Publish.
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();
  });
});
