import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { makeAdmin } from './supabase-admin';
import { formatInTimeZone } from 'date-fns-tz';
import { expect, test, type Page } from '@playwright/test';
import { SEED_PASSWORD } from './ui-routes';

// P3-05 offline logging: a set logged offline is held in the IndexedDB outbox and syncs on reconnect
// through the idempotent logSetAction, so exactly one set_log lands. Service-worker registration is
// gated OFF for this build (NEXT_PUBLIC_ENABLE_SW is unset), so A3 is a build-artifact + gate assertion.

const admin = makeAdmin();

const TRAINER_A = '11111111-0000-0000-0000-000000000001';
const today = formatInTimeZone(new Date(), 'Asia/Beirut', 'yyyy-MM-dd');
const tag = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

let clientId = '';
let clientEmail = '';
let copyId = '';

async function signInUi(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15_000 });
}

// A fresh onboarded client with a workout scheduled today (mirrors workout.spec; never touches the
// seeded Client One whose /client screenshot ui.spec captures).
test.beforeAll(async () => {
  const ex = await admin
    .from('exercises')
    .select('id')
    .is('trainer_id', null)
    .eq('name', 'Back squat')
    .single();
  const backSquatId = ex.data!.id;

  clientEmail = `offlinespec-${tag()}@ptplatform.test`;
  const { data: created, error } = await admin.auth.admin.createUser({
    email: clientEmail,
    password: SEED_PASSWORD,
    email_confirm: true,
    app_metadata: { role: 'client' },
    user_metadata: { full_name: 'Offline Client' },
  });
  if (error || !created.user) throw new Error(`createUser failed: ${error?.message}`);
  clientId = created.user.id;
  await admin
    .from('profiles')
    .upsert({ id: clientId, role: 'client', full_name: 'Offline Client' });
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

  const prog = await admin
    .from('programs')
    .insert({
      trainer_id: TRAINER_A,
      client_id: clientId,
      title: 'Offline Strength',
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
  const wex = await admin
    .from('workout_exercises')
    .insert({
      program_workout_id: pw.data!.id,
      exercise_id: backSquatId,
      position: 0,
      rest_seconds: 90,
    })
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
});

test.afterAll(async () => {
  if (clientId) {
    await admin.from('workout_logs').delete().eq('client_id', clientId);
    await admin.from('personal_records').delete().eq('client_id', clientId);
    if (copyId) await admin.from('programs').delete().eq('id', copyId);
    await admin.from('form_responses').delete().eq('client_id', clientId);
    await admin.from('trainer_clients').delete().eq('client_id', clientId);
    await admin.auth.admin.deleteUser(clientId);
  }
});

test.beforeEach(async () => {
  await admin.from('workout_logs').delete().eq('client_id', clientId).eq('scheduled_date', today);
});

test('A2 offline set syncs on reconnect', async ({ page, context }) => {
  await signInUi(page, clientEmail);
  await page.goto('/client');
  await page.getByRole('button', { name: 'Start workout' }).click();
  await page.waitForURL(/\/client\/workout\//, { timeout: 15_000 });
  const logId = page.url().split('/client/workout/')[1]!;

  // Let the player fully load online first (otherwise going offline can race the initial render).
  await expect(page.getByRole('button', { name: 'Log set 1' })).toBeVisible({ timeout: 15_000 });

  // Go offline, then log a set. It is saved locally and the indicator says so.
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Log set 1' }).click();
  await expect(page.getByRole('button', { name: 'Set 1 logged' })).toBeVisible();
  await expect(page.getByText('Saved on this phone')).toBeVisible();

  // Nothing reached the server while offline.
  const offlineCount =
    (await admin.from('set_logs').select('id').eq('workout_log_id', logId)).data?.length ?? 0;
  expect(offlineCount).toBe(0);

  // Reconnect → the outbox flushes → exactly one set_log (idempotent upsert, never a duplicate).
  await context.setOffline(false);
  await expect
    .poll(
      async () =>
        (await admin.from('set_logs').select('id').eq('workout_log_id', logId)).data?.length ?? 0,
      { timeout: 20_000 },
    )
    .toBe(1);
  await expect(page.getByText('Saved on this phone')).toBeHidden();
});

test('A3 service worker registers', async ({ page, request }) => {
  // Build-artifact assertions: the SW source precaches the shell and is wired, gated off by default.
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const sw = readFileSync(`${root}src/app/sw.ts`, 'utf8');
  expect(sw).toContain('Serwist');
  expect(sw).toContain('__SW_MANIFEST'); // precache the app shell
  expect(sw).toContain('runtimeCaching'); // runtime-cache the current week's workout GET pages

  const config = readFileSync(`${root}next.config.ts`, 'utf8');
  expect(config).toContain('@serwist/next');
  expect(config).toContain('NEXT_PUBLIC_ENABLE_SW'); // the opt-in gate

  // The gate is OFF in this build, so no service worker ships — proving the existing suite is unaffected.
  const res = await request.get('/sw.js');
  expect(res.status()).toBe(404);
  await page.goto('/login');
  const controller = await page.evaluate(
    () => !!('serviceWorker' in navigator && navigator.serviceWorker.controller),
  );
  expect(controller).toBe(false);
});
