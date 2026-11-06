import { makeAdmin } from './supabase-admin';
import { expect, test, type Page } from '@playwright/test';
import { SEED_PASSWORD } from './ui-routes';

// Service client from the live local stack (same pattern as clients.spec.ts).
const admin = makeAdmin();

const TRAINER_A = '11111111-0000-0000-0000-000000000001';
const tag = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

let clientId = '';
let clientEmail = '';

async function createActiveClient(fullName: string): Promise<{ id: string; email: string }> {
  const email = `habitsspec-${tag()}@ptplatform.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
    app_metadata: { role: 'client' },
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const id = data.user.id;
  await admin.from('profiles').upsert({ id, role: 'client', full_name: fullName });
  await admin.from('trainer_clients').insert({
    trainer_id: TRAINER_A,
    client_id: id,
    status: 'active',
    source: 'invite',
    start_date: new Date().toISOString().slice(0, 10),
  });
  // Mark the intake submitted so the P1-03 intake gate lets this client reach /client (Today).
  const { data: intake } = await admin
    .from('forms')
    .select('id')
    .eq('trainer_id', TRAINER_A)
    .eq('kind', 'intake')
    .eq('is_default', true)
    .single();
  if (intake)
    await admin.from('form_responses').insert({
      form_id: intake.id,
      trainer_id: TRAINER_A,
      client_id: id,
      answers: {},
      submitted_at: new Date().toISOString(),
    });
  return { id, email };
}

async function seedHabit(name: string, unit: string | null = null): Promise<string> {
  const { data, error } = await admin
    .from('habits')
    .insert({ trainer_id: TRAINER_A, client_id: clientId, name, unit })
    .select('id')
    .single();
  if (error || !data) throw new Error(`seedHabit failed: ${error?.message}`);
  return data.id;
}

async function signInUi(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15_000 });
}

test.beforeAll(async () => {
  const c = await createActiveClient('Habit Client');
  clientId = c.id;
  clientEmail = c.email;
});

test.afterAll(async () => {
  await admin.from('habits').delete().eq('client_id', clientId); // cascades habit_logs
  await admin.from('trainer_clients').delete().eq('client_id', clientId);
  await admin.auth.admin.deleteUser(clientId);
});

test.describe('P1-09 habits', () => {
  test('A5: a coach adds a habit that appears on the client’s Today, then deactivates it', async ({
    page,
  }) => {
    await signInUi(page, 'trainer.a@ptplatform.test');
    await page.goto(`/coach/clients/${clientId}?state=habits`);

    await page.getByRole('button', { name: 'Add habit' }).first().click();
    await page.getByLabel('Name').fill('E2E Pushups');
    await page.getByLabel('Target (optional)').fill('20');
    await page.getByLabel('Unit (optional)').fill('reps');
    await page.getByRole('button', { name: 'Save habit' }).click();
    await expect(page.getByText('Habit saved.')).toBeVisible();
    await expect(page.getByText('E2E Pushups')).toBeVisible();

    // The client sees the active habit on Today.
    await signInUi(page, clientEmail);
    await page.goto('/client');
    await expect(page.getByRole('button', { name: /E2E Pushups/ })).toBeVisible();

    // The coach deactivates it.
    await signInUi(page, 'trainer.a@ptplatform.test');
    await page.goto(`/coach/clients/${clientId}?state=habits`);
    await page.getByRole('button', { name: 'Actions for E2E Pushups' }).click();
    await page.getByRole('menuitem', { name: 'Deactivate habit' }).click();
    await expect(page.getByText('Habit deactivated.')).toBeVisible();

    // It no longer appears on the client’s Today.
    await signInUi(page, clientEmail);
    await page.goto('/client');
    await expect(page.getByRole('button', { name: /E2E Pushups/ })).toHaveCount(0);
  });

  test('A3: ticking a habit is optimistic and persists after reload', async ({ page }) => {
    const habitId = await seedHabit('E2E Water', 'glasses');
    await signInUi(page, clientEmail);
    await page.goto('/client');

    const logCount = async () =>
      (
        await admin
          .from('habit_logs')
          .select('id')
          .eq('habit_id', habitId)
          .eq('client_id', clientId)
      ).data?.length ?? 0;

    const row = page.getByRole('button', { name: /E2E Water/ });
    await expect(row).toHaveAttribute('aria-pressed', 'false');
    await row.click();
    await expect(row).toHaveAttribute('aria-pressed', 'true');

    // The tick lands in habit_logs for today (poll: the server action settles after the optimistic flip).
    await expect.poll(logCount).toBe(1);

    // Persists across a full reload.
    await page.reload();
    await expect(page.getByRole('button', { name: /E2E Water/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('A4: re-ticking never raises a unique violation (idempotent upsert)', async ({ page }) => {
    const habitId = await seedHabit('E2E Sleep');
    await signInUi(page, clientEmail);
    await page.goto('/client');

    const logCount = async () =>
      (
        await admin
          .from('habit_logs')
          .select('id')
          .eq('habit_id', habitId)
          .eq('client_id', clientId)
      ).data?.length ?? 0;

    const row = page.getByRole('button', { name: /E2E Sleep/ });
    // Tick → untick → tick again, letting each round-trip settle. The upsert (re-tick) path must
    // never surface a unique violation, and no round-trip may error.
    await row.click();
    await expect(row).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(logCount).toBe(1);

    await row.click();
    await expect(row).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(logCount).toBe(0);

    await row.click();
    await expect(row).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(logCount).toBe(1);

    await expect(page.getByText('Something went wrong. Try again.')).toHaveCount(0);

    // After reload the server state is still a single ticked row (no duplicate / no 23505).
    await page.reload();
    await expect(page.getByRole('button', { name: /E2E Sleep/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
