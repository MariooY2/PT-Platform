import { makeAdmin } from './supabase-admin';
import { formatInTimeZone } from 'date-fns-tz';
import { expect, test, type Page } from '@playwright/test';
import { SEED_PASSWORD } from './ui-routes';

// Service client from the live local stack (same pattern as habits.spec.ts / clients.spec.ts).
const admin = makeAdmin();

const TRAINER_A = '11111111-0000-0000-0000-000000000001';
const today = formatInTimeZone(new Date(), 'Asia/Beirut', 'yyyy-MM-dd'); // the app's "today" (profile TZ)
const tag = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

let clientId = '';
let clientEmail = '';
let copyId = '';
let pwId = '';
let backSquatId = '';

async function signInUi(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15_000 });
}

test.beforeAll(async () => {
  const ex = await admin
    .from('exercises')
    .select('id')
    .is('trainer_id', null)
    .eq('name', 'Back squat')
    .single();
  backSquatId = ex.data!.id;

  // A fresh, onboarded client for the mutating tests (A4/A5/A7), so they never flip Client One's
  // seeded "/client default" (scheduled) state that ui.spec screenshots.
  clientEmail = `workoutspec-${tag()}@ptplatform.test`;
  const { data: created, error } = await admin.auth.admin.createUser({
    email: clientEmail,
    password: SEED_PASSWORD,
    email_confirm: true,
    app_metadata: { role: 'client' },
    user_metadata: { full_name: 'Workout Client' },
  });
  if (error || !created.user) throw new Error(`createUser failed: ${error?.message}`);
  clientId = created.user.id;
  await admin
    .from('profiles')
    .upsert({ id: clientId, role: 'client', full_name: 'Workout Client' });
  await admin.from('trainer_clients').insert({
    trainer_id: TRAINER_A,
    client_id: clientId,
    status: 'active',
    source: 'invite',
    start_date: today,
  });
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
      client_id: clientId,
      answers: {},
      submitted_at: new Date().toISOString(),
    });

  // Assigned program copy starting today → week 1 / day 1 is scheduled for today. Back squat with a
  // 90 s rest and a 5-rep × 80 kg prescription.
  const prog = await admin
    .from('programs')
    .insert({
      trainer_id: TRAINER_A,
      client_id: clientId,
      title: 'Spec Strength',
      weeks: 4,
      is_template: false,
      start_date: today,
      status: 'published',
    })
    .select('id')
    .single();
  copyId = prog.data!.id;
  const pw = await admin
    .from('program_workouts')
    .insert({ program_id: copyId, week: 1, day: 1, title: 'Lower A', position: 0 })
    .select('id')
    .single();
  pwId = pw.data!.id;
  const wex = await admin
    .from('workout_exercises')
    .insert({ program_workout_id: pwId, exercise_id: backSquatId, position: 0, rest_seconds: 90 })
    .select('id')
    .single();
  await admin.from('prescribed_sets').insert({
    workout_exercise_id: wex.data!.id,
    set_number: 1,
    set_type: 'working',
    reps_min: 5,
    reps_max: 5,
    weight_kg: 80,
  });

  // A prior completed session for Back squat (a week ago) → "previous performance" has real data.
  const priorLog = await admin
    .from('workout_logs')
    .insert({
      trainer_id: TRAINER_A,
      client_id: clientId,
      assignment_id: copyId,
      program_workout_id: pwId,
      scheduled_date: formatInTimeZone(
        new Date(Date.now() - 7 * 86_400_000),
        'Asia/Beirut',
        'yyyy-MM-dd',
      ),
      status: 'completed',
      started_at: new Date(Date.now() - 7 * 86_400_000).toISOString(),
      completed_at: new Date(Date.now() - 7 * 86_400_000 + 45 * 60_000).toISOString(),
      session_rpe: 8,
      client_generated_id: crypto.randomUUID(),
    })
    .select('id')
    .single();
  await admin.from('set_logs').insert({
    workout_log_id: priorLog.data!.id,
    exercise_id: backSquatId,
    set_number: 1,
    reps: 8,
    weight_kg: 72.5,
    completed: true,
    client_generated_id: crypto.randomUUID(),
  });
});

test.afterAll(async () => {
  if (clientId) {
    await admin.from('workout_logs').delete().eq('client_id', clientId); // cascades set_logs
    await admin.from('personal_records').delete().eq('client_id', clientId);
    if (copyId) await admin.from('programs').delete().eq('id', copyId); // cascades workouts/sets
    await admin.from('form_responses').delete().eq('client_id', clientId);
    await admin.from('trainer_clients').delete().eq('client_id', clientId);
    await admin.auth.admin.deleteUser(clientId);
  }
});

// Each mutating test starts from a clean "scheduled" today: remove any of the fresh client's logs for
// today, keeping the week-ago prior log that drives "previous performance".
test.beforeEach(async () => {
  await admin.from('workout_logs').delete().eq('client_id', clientId).eq('scheduled_date', today);
});

test.describe('P1-07 workout player', () => {
  test('A3 Today shows today’s workout', async ({ page }) => {
    // Client One is seeded with a day-1 workout scheduled today; read-only (no mutation).
    await signInUi(page, 'client.one@ptplatform.test');
    await page.goto('/client');
    await expect(page.getByText('Week 1 · Day 1')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start workout' })).toBeVisible();
  });

  test('A4 log a set, rest timer starts', async ({ page }) => {
    await signInUi(page, clientEmail);
    await page.goto('/client');
    await page.getByRole('button', { name: 'Start workout' }).click();
    await page.waitForURL(/\/client\/workout\//, { timeout: 15_000 });
    const logId = page.url().split('/client/workout/')[1];

    // Prefilled from the prescription: 5 reps, 80 kg.
    await expect(page.getByLabel('Set 1 reps')).toHaveValue('5');
    await expect(page.getByLabel('Set 1 weight in kilograms')).toHaveValue(/80/);

    // Completing the set logs it and starts the rest timer.
    await page.getByRole('button', { name: 'Log set 1' }).click();
    await expect(page.getByRole('button', { name: 'Set 1 logged' })).toBeVisible();
    await expect(page.getByRole('timer')).toBeVisible();

    // Exactly one set_log landed for this log.
    await expect
      .poll(
        async () =>
          (await admin.from('set_logs').select('id').eq('workout_log_id', logId)).data?.length ?? 0,
      )
      .toBe(1);
  });

  test('A5 previous performance', async ({ page }) => {
    await signInUi(page, clientEmail);
    await page.goto('/client');
    await page.getByRole('button', { name: 'Start workout' }).click();
    await page.waitForURL(/\/client\/workout\//, { timeout: 15_000 });
    // Last time for set 1 was 72.5 kg × 8, shown under the inputs.
    await expect(page.getByText(/72\.5.*×.*8/)).toBeVisible();
  });

  test('A7 finish with session RPE', async ({ page }) => {
    await signInUi(page, clientEmail);
    await page.goto('/client');
    await page.getByRole('button', { name: 'Start workout' }).click();
    await page.waitForURL(/\/client\/workout\//, { timeout: 15_000 });
    const logId = page.url().split('/client/workout/')[1];

    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: '8', exact: true }).click(); // session RPE
    await page.getByRole('button', { name: 'Save and finish' }).click();

    await page.waitForURL((u) => u.pathname === '/client', { timeout: 15_000 });
    await expect(page.getByText('Completed today')).toBeVisible();

    const log = await admin
      .from('workout_logs')
      .select('status, session_rpe')
      .eq('id', logId)
      .single();
    expect(log.data?.status).toBe('completed');
    expect(Number(log.data?.session_rpe)).toBe(8);
  });
});
