import { makeAdmin } from './supabase-admin';
import { expect, test, type Page } from '@playwright/test';
import { SEED_PASSWORD } from './ui-routes';

// Service client from the live local stack (same pattern as clients.spec.ts / global-setup.ts).
const admin = makeAdmin();

const TRAINER_A = '11111111-0000-0000-0000-000000000001';
const tag = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const createdClientIds: string[] = [];
const createdFormIds: string[] = [];

/** A fresh client linked to Trainer Alpha, with no intake response yet. */
async function createClientFor(fullName: string): Promise<{ id: string; email: string }> {
  const email = `formsspec-${tag()}@ptplatform.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
    app_metadata: { role: 'client' },
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const id = data.user.id;
  createdClientIds.push(id);
  await admin.from('profiles').upsert({ id, role: 'client', full_name: fullName });
  await admin.from('trainer_clients').insert({
    trainer_id: TRAINER_A,
    client_id: id,
    status: 'active',
    source: 'invite',
    start_date: new Date().toISOString().slice(0, 10),
  });
  return { id, email };
}

async function defaultIntakeId(): Promise<string> {
  const { data } = await admin
    .from('forms')
    .select('id')
    .eq('trainer_id', TRAINER_A)
    .eq('kind', 'intake')
    .eq('is_default', true)
    .single();
  return data!.id as string;
}

async function signInUi(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15_000 });
}

test.afterAll(async () => {
  for (const id of createdClientIds) {
    await admin.from('form_responses').delete().eq('client_id', id);
    await admin.from('trainer_clients').delete().eq('client_id', id);
    await admin.auth.admin.deleteUser(id);
  }
  if (createdFormIds.length) await admin.from('forms').delete().in('id', createdFormIds);
});

test.describe('P1-03 forms, intake, check-ins', () => {
  test('A3: a coach builds a form of each question type, reorders, removes and previews', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await signInUi(page, 'trainer.a@ptplatform.test');
    await page.goto('/coach/forms');

    // Start a clean custom form and wait for it to load (its title is "New form", not "Intake").
    await page.getByRole('button', { name: 'New form' }).click();
    await expect(page.getByLabel('Form title')).toHaveValue('New form', { timeout: 10_000 });

    // Add one question of each type.
    for (const type of [
      'Short text',
      'Long text',
      'Number',
      'Scale (1–10)',
      'Choice',
      'Yes / no',
      'Photo',
      'Weight',
    ]) {
      await page.getByRole('button', { name: 'Add question' }).click();
      await page.getByRole('menuitem', { name: type, exact: true }).click();
    }

    // The starter question + eight added = nine labels.
    const labels = page.getByPlaceholder('Question label');
    await expect(labels).toHaveCount(9);

    // Give the first question a label, then move it down and remove it.
    await labels.first().fill('Your main goal');
    await page.getByRole('button', { name: 'Move question 1 down' }).click();
    await page.getByRole('button', { name: 'Remove question 1' }).click();
    await expect(labels).toHaveCount(8);

    // Autosave reports success.
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });

    // Preview opens the client phone view.
    await page.getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByText('Exactly what your client sees on their phone.')).toBeVisible();

    // Track the created form for cleanup.
    const { data } = await admin
      .from('forms')
      .select('id')
      .eq('trainer_id', TRAINER_A)
      .eq('is_default', false);
    for (const f of data ?? []) if (!createdFormIds.includes(f.id)) createdFormIds.push(f.id);
  });

  test('A4: a new client is sent to the intake and lands on Today after submitting', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const { email } = await createClientFor('Intake Newcomer');
    await signInUi(page, email);

    // The (app) gate redirects to the intake.
    await page.waitForURL(/\/client\/checkin\//, { timeout: 15_000 });

    // Step through the default intake (goals, experience, injuries, days, weight).
    await page.getByRole('textbox').fill('Build strength and stay healthy');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByRole('button', { name: 'Intermediate' }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByRole('button', { name: 'Next' }).click(); // injuries (optional)

    await page.getByRole('textbox').fill('3');
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByRole('button', { name: 'Send check-in' }).click();

    // Lands on Today and is no longer redirected.
    await page.waitForURL((u) => u.pathname === '/client', { timeout: 15_000 });
    await page.goto('/client');
    await expect(page).toHaveURL(/\/client$/);
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  });

  test('A5: the review queue is oldest-first; replying marks it reviewed and drops it', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const older = await createClientFor('Queue Older');
    const newer = await createClientFor('Queue Newer');
    const intakeId = await defaultIntakeId();

    // Two submitted, unreviewed responses — an older one and a newer one; the queue is oldest-first.
    const { data: olderResp } = await admin
      .from('form_responses')
      .insert({
        form_id: intakeId,
        trainer_id: TRAINER_A,
        client_id: older.id,
        answers: { goals: 'Lose fat', days: 4 },
        submitted_at: new Date(Date.now() - 6 * 86_400_000).toISOString(),
      })
      .select('id')
      .single();
    const responseId = olderResp!.id as string;
    await admin.from('form_responses').insert({
      form_id: intakeId,
      trainer_id: TRAINER_A,
      client_id: newer.id,
      answers: { goals: 'Gain muscle' },
      submitted_at: new Date().toISOString(),
    });

    await signInUi(page, 'trainer.a@ptplatform.test');
    await page.goto('/coach/checkins');

    // Oldest-unreviewed first: the 6-days-old card precedes the just-now card.
    const queueCards = page.getByRole('button', { name: /Queue (Older|Newer)/ });
    await expect(queueCards.first()).toContainText('Queue Older');

    await page.getByRole('button', { name: /Queue Older/ }).click();
    await page.getByLabel('Your reply').fill('Great start — keep it up this week.');
    await page.getByRole('button', { name: 'Send reply' }).click();
    await expect(page.getByText('Reply sent.')).toBeVisible();

    // The replied item left the queue; the newer one is still waiting.
    await expect(page.getByRole('button', { name: /Queue Older/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Queue Newer/ })).toBeVisible();

    // The write landed: coach_reply + reviewed_at set.
    const { data: after } = await admin
      .from('form_responses')
      .select('coach_reply, reviewed_at')
      .eq('id', responseId)
      .single();
    expect(after?.coach_reply).toBe('Great start — keep it up this week.');
    expect(after?.reviewed_at).not.toBeNull();
  });
});
