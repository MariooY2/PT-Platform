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

const SAMPLE_TEMPLATE = 'bbbb0000-0000-0000-0000-000000000001'; // Trainer A's seeded template
const CLIENT_ONE = '33333333-0000-0000-0000-000000000001';
const ASSIGN_DATE = '2027-01-04'; // a distinctive start date so cleanup never touches the seed copy

test.describe('P1-06 assign a template by deep copy (as coach)', () => {
  test.afterAll(async () => {
    // Deleting the program cascades its workouts → exercises → sets.
    await admin.from('programs').delete().eq('start_date', ASSIGN_DATE);
  });

  test('A3 assign a template to clients', async ({ page }) => {
    await signInAs(page, 'coach');
    await page.goto('/coach/programs');
    await expect(page.getByRole('heading', { level: 1, name: 'Programs' })).toBeVisible();

    // Open the Assign dialog on the Sample template card.
    const card = page.getByRole('listitem').filter({ hasText: 'Sample 3-Day Strength' });
    await card.getByRole('button', { name: 'Assign' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Assign Sample 3-Day Strength')).toBeVisible();

    // Step 1: pick Client One.
    await dialog.getByRole('checkbox', { name: 'Assign to Client One' }).click();
    await dialog.getByRole('button', { name: 'Next' }).click();

    // Step 2: set a start date and assign.
    await dialog.locator('#assign-start-date').fill(ASSIGN_DATE);
    await dialog.getByRole('button', { name: 'Assign program' }).click();

    await expect(page.getByText('Program assigned to Client One.')).toBeVisible();

    // The copy exists and is an independent client copy of the template.
    const copy = await admin
      .from('programs')
      .select('is_template, client_id, source_program_id, start_date')
      .eq('start_date', ASSIGN_DATE)
      .eq('client_id', CLIENT_ONE)
      .single();
    expect(copy.error).toBeNull();
    expect(copy.data!.is_template).toBe(false);
    expect(copy.data!.source_program_id).toBe(SAMPLE_TEMPLATE);
  });

  test('A4 used-by count', async ({ page }) => {
    await signInAs(page, 'coach');
    await page.goto('/coach/programs');
    const card = page.getByRole('listitem').filter({ hasText: 'Sample 3-Day Strength' });
    // The seed assigns the Sample template to Client One, so the count is at least one client.
    await expect(card.getByText(/Used by\s*\d+\s*client/)).toBeVisible();
  });

  test('A5 assign preview', async ({ page }) => {
    await signInAs(page, 'coach');
    await page.goto('/coach/programs');
    const card = page.getByRole('listitem').filter({ hasText: 'Sample 3-Day Strength' });
    await card.getByRole('button', { name: 'Assign' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('checkbox', { name: 'Assign to Client One' }).click();
    await dialog.getByRole('button', { name: 'Next' }).click();

    // The read-only week-1 preview shows the template's week-1 workout and exercises…
    const preview = dialog.getByLabel('Week 1 preview');
    await expect(preview.getByText('Lower A')).toBeVisible();
    await expect(preview.getByText('Back squat')).toBeVisible();

    // …and never a logging / player control (that is P1-07).
    await expect(preview.getByRole('button', { name: /log|finish|rest|timer|start/i })).toHaveCount(
      0,
    );
  });
});
