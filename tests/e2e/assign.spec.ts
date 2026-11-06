import { makeAdmin } from './supabase-admin';
import { expect, test } from '@playwright/test';
import { signInAs } from './ui-routes';

const admin = makeAdmin();

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

    // The copy exists and is an independent client copy of the template. (Retry-safe: a re-run may
    // have created more than one row with this start date; assert on the first.)
    const copy = await admin
      .from('programs')
      .select('is_template, client_id, source_program_id, start_date')
      .eq('start_date', ASSIGN_DATE)
      .eq('client_id', CLIENT_ONE);
    expect(copy.error).toBeNull();
    expect((copy.data ?? []).length).toBeGreaterThan(0);
    expect(copy.data![0].is_template).toBe(false);
    expect(copy.data![0].source_program_id).toBe(SAMPLE_TEMPLATE);
  });

  test('A4 used-by count', async ({ page }) => {
    await signInAs(page, 'coach');
    await page.goto('/coach/programs');
    const card = page.getByRole('listitem').filter({ hasText: 'Sample 3-Day Strength' });
    // The seed assigns the Sample template to Client One, so the count is at least one client.
    await expect(card.getByText(/Used by\s*[1-9]\d*\s*client/)).toBeVisible();
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
    await expect(dialog.getByText('Week 1 preview')).toBeVisible();
    await expect(dialog.getByText('Lower A')).toBeVisible();
    await expect(dialog.getByText('Back squat')).toBeVisible();

    // …and never a logging / player control (that is P1-07).
    await expect(dialog.getByRole('button', { name: /log|finish|rest|timer/i })).toHaveCount(0);
  });
});
