import { execFileSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { signInAs } from './ui-routes';

const CARD = '[data-testid="exercise-card"]';

// Service client from the live local stack, to clean up exercises the tests create.
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

test.describe('P1-04 exercise library (as coach)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, 'coach');
    await page.goto('/coach/exercises');
    await expect(page.getByRole('heading', { level: 1, name: 'Exercises' })).toBeVisible();
    await expect(page.locator(CARD).first()).toBeVisible();
  });

  test.afterAll(async () => {
    await admin.from('exercises').delete().like('name', 'E2E custom%');
  });

  test('A4 — instant search narrows the library', async ({ page }) => {
    const before = await page.locator(CARD).count();
    expect(before).toBeGreaterThan(10);

    await page.getByRole('searchbox', { name: 'Search exercises' }).fill('bench');
    await expect(page.getByText('Barbell bench press', { exact: true })).toBeVisible();
    await expect(page.getByText('Pull-up', { exact: true })).toHaveCount(0);
    expect(await page.locator(CARD).count()).toBeLessThan(before);
  });

  test('A4 — the muscle filter narrows the library', async ({ page }) => {
    const before = await page.locator(CARD).count();
    await page.getByRole('combobox', { name: 'Filter by muscle' }).click();
    await page.getByRole('option', { name: 'Lats' }).click();
    const after = await page.locator(CARD).count();
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
    await expect(page.getByText('Lat pulldown', { exact: true })).toBeVisible();
  });

  test('A5 — a coach creates a custom exercise and finds it under My exercises', async ({
    page,
  }) => {
    const name = `E2E custom ${Date.now()}`;
    await page.getByRole('button', { name: 'New exercise' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Name').fill(name);
    await dialog.getByRole('button', { name: 'Add exercise' }).click();

    await expect(dialog).toBeHidden();
    await page.getByRole('button', { name: 'My exercises' }).click();
    await page.getByRole('searchbox', { name: 'Search exercises' }).fill(name);
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  });

  test('A5 — invalid input is rejected server-side with a specific message', async ({ page }) => {
    await page.getByRole('button', { name: 'New exercise' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Leave Name empty on purpose.
    await dialog.getByRole('button', { name: 'Add exercise' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Enter an exercise name.');
    await expect(dialog).toBeVisible();
  });

  test('A6 — exercise detail shows video, instructions, muscles and equipment', async ({
    page,
  }) => {
    await page.getByText('Barbell bench press', { exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Video' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Muscles' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Equipment' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Instructions' })).toBeVisible();
    await expect(dialog.getByText('Chest', { exact: true })).toBeVisible();
  });

  test('no-results state is reachable via ?state=no-results and clears', async ({ page }) => {
    await page.goto('/coach/exercises?state=no-results');
    await expect(page.getByText('No exercises match these filters')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.locator(CARD).first()).toBeVisible();
  });

  test('A6 — a custom exercise with a video shows the embedded player', async ({ page }) => {
    const name = `E2E custom video ${Date.now()}`;
    await page.getByRole('button', { name: 'New exercise' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Name').fill(name);
    await dialog
      .getByLabel('Video link (optional)')
      .fill('https://youtube.com/watch?v=dQw4w9WgXcQ');
    await dialog.getByRole('button', { name: 'Add exercise' }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: 'My exercises' }).click();
    await page.getByRole('searchbox', { name: 'Search exercises' }).fill(name);
    await page.getByText(name, { exact: true }).click();

    const detail = page.getByRole('dialog');
    await expect(detail.locator('iframe[src*="youtube-nocookie"]')).toBeVisible();
  });
});
