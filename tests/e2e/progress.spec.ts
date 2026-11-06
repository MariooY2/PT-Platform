import { execFileSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { formatInTimeZone } from 'date-fns-tz';
import { expect, test, type Page } from '@playwright/test';
import { SEED_PASSWORD } from './ui-routes';

// Service client from the live local stack (same pattern as workout.spec.ts).
const status = JSON.parse(
  execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  }),
) as Record<string, string>;
const API_URL = status.API_URL ?? status.api_url;
const SERVICE_KEY =
  status.SERVICE_ROLE_KEY ?? status.service_role_key ?? status.SECRET_KEY ?? status.secret_key;
const admin: SupabaseClient = createClient(API_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TRAINER_A = '11111111-0000-0000-0000-000000000001';
const beirut = (d: Date) => formatInTimeZone(d, 'Asia/Beirut', 'yyyy-MM-dd');
const today = beirut(new Date());
const monthPrefix = today.slice(0, 7); // yyyy-MM of the app's "today"
const tag = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

// A smallest-valid 1×1 PNG.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

let clientId = '';
let clientEmail = '';
const photoPaths: string[] = [];

async function signInUi(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15_000 });
}

test.beforeAll(async () => {
  // A fresh, onboarded client for the mutating tests (A2/A4/A5), linked to Trainer A and past the
  // intake gate — so it never disturbs Client One's seeded screenshots.
  clientEmail = `progressspec-${tag()}@ptplatform.test`;
  const { data: created, error } = await admin.auth.admin.createUser({
    email: clientEmail,
    password: SEED_PASSWORD,
    email_confirm: true,
    app_metadata: { role: 'client' },
    user_metadata: { full_name: 'Progress Client' },
  });
  if (error || !created.user) throw new Error(`createUser failed: ${error?.message}`);
  clientId = created.user.id;
  await admin
    .from('profiles')
    .upsert({ id: clientId, role: 'client', full_name: 'Progress Client' });
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

  // A5: two logged days this month — one completed (done), one skipped (missed) → 1 of 2, 50%.
  await admin.from('workout_logs').insert([
    {
      trainer_id: TRAINER_A,
      client_id: clientId,
      scheduled_date: `${monthPrefix}-03`,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      status: 'completed',
      client_generated_id: crypto.randomUUID(),
    },
    {
      trainer_id: TRAINER_A,
      client_id: clientId,
      scheduled_date: `${monthPrefix}-04`,
      started_at: new Date().toISOString(),
      status: 'skipped',
      client_generated_id: crypto.randomUUID(),
    },
  ]);
});

test.afterAll(async () => {
  if (!clientId) return;
  await admin.from('body_metrics').delete().eq('client_id', clientId);
  await admin.from('progress_photos').delete().eq('client_id', clientId);
  if (photoPaths.length) await admin.storage.from('progress-photos').remove(photoPaths);
  await admin.from('workout_logs').delete().eq('client_id', clientId);
  await admin.from('form_responses').delete().eq('client_id', clientId);
  await admin.from('trainer_clients').delete().eq('client_id', clientId);
  await admin.auth.admin.deleteUser(clientId);
});

test.describe('P1-08 progress', () => {
  test('A2 log weight shows on the Body trend', async ({ page }) => {
    await signInUi(page, clientEmail);
    await page.goto('/client/progress');
    await page.getByRole('tab', { name: 'Body' }).click();

    // Open the Log weight dialog and submit a weight.
    await page.getByRole('button', { name: 'Log weight' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Weight (kg)').fill('73.7');
    await dialog.getByRole('button', { name: 'Log weight' }).click();

    // It lands in body_metrics for this client …
    await expect
      .poll(
        async () =>
          (await admin.from('body_metrics').select('weight_kg').eq('client_id', clientId)).data
            ?.length ?? 0,
      )
      .toBeGreaterThan(0);

    // … and appears on the Body tab (latest weight + measurements table).
    await expect(page.getByText('73.7').first()).toBeVisible();
  });

  test('A3 strength e1RM + PR history', async ({ page }) => {
    // Client One is seeded with a completed Back-squat session (PRs via the server trigger); read-only.
    await signInUi(page, 'client.one@ptplatform.test');
    await page.goto('/client/progress'); // Strength is the default tab

    await expect(page.getByRole('button', { name: /Back squat/ })).toBeVisible();
    await page.getByRole('button', { name: /Back squat/ }).click();

    // The PR history (from personal_records) is shown, with the best e1RM (82.5 × (1+5/30) = 96.25 → 96.3).
    await expect(page.getByText('Personal records')).toBeVisible();
    await expect(page.getByText('Best e1RM')).toBeVisible();
    await expect(page.getByText('96.3', { exact: false }).first()).toBeVisible();
  });

  test('A4 upload progress photo (private)', async ({ page }) => {
    await signInUi(page, clientEmail);
    await page.goto('/client/progress');
    await page.getByRole('tab', { name: 'Photos' }).click();

    // The private-by-default lock note is always shown.
    await expect(page.getByText('Only you and your coach can see these.')).toBeVisible();

    await page.getByLabel('Photo').setInputFiles({
      name: 'front.png',
      mimeType: 'image/png',
      buffer: PNG_1x1,
    });
    await page.getByRole('button', { name: 'Add photo' }).click();

    // The photo shows in the date grid.
    await expect(page.getByRole('img', { name: /Front photo from/ })).toBeVisible({
      timeout: 15_000,
    });

    // It is stored under THIS client's folder in a PRIVATE bucket (never public).
    const { data: rows } = await admin
      .from('progress_photos')
      .select('storage_path, public_consent')
      .eq('client_id', clientId);
    expect(rows?.length ?? 0).toBeGreaterThan(0);
    const path = rows![0].storage_path;
    expect(path.startsWith(`${clientId}/`)).toBe(true);
    expect(rows![0].public_consent).toBe(false);
    photoPaths.push(path);

    const bucket = await admin.storage.getBucket('progress-photos');
    expect(bucket.data?.public).toBe(false);
  });

  test('A5 calendar compliance', async ({ page }) => {
    await signInUi(page, clientEmail);
    await page.goto('/client/progress');
    await page.getByRole('tab', { name: 'Calendar' }).click();

    // One completed + one skipped this month → compliance in words.
    await expect(page.getByText('You did 1 of 2 workouts — 50%')).toBeVisible();
  });
});
