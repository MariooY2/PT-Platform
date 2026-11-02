import { execFileSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';
import { SEED_PASSWORD } from './ui-routes';

// Service client from the live local stack (same pattern as forms.spec.ts / clients.spec.ts).
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
const CLIENT_ONE = '33333333-0000-0000-0000-000000000001';
// Matches playwright.config.ts webServer.env (defaults to this when no real secret is set).
const CRON_SECRET = process.env.CRON_SECRET ?? 'e2e-cron-secret';
const tag = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const createdClientIds: string[] = [];

// Today's weekday (0 = Sun … 6 = Sat) in Asia/Beirut — the app's check-in timezone. A schedule set
// to this weekday is due "today" and so is generated on the current run.
const beirutToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Beirut' }).format(
  new Date(),
);
const TODAY_WEEKDAY = new Date(`${beirutToday}T12:00:00Z`).getUTCDay();

async function createClientFor(fullName: string): Promise<{ id: string; email: string }> {
  const email = `checkinspec-${tag()}@ptplatform.test`;
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

async function defaultCheckinFormId(): Promise<string> {
  const { data } = await admin
    .from('forms')
    .select('id')
    .eq('trainer_id', TRAINER_A)
    .eq('kind', 'checkin')
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
    await admin.from('checkin_schedules').delete().eq('client_id', id);
    await admin.from('trainer_clients').delete().eq('client_id', id);
    await admin.auth.admin.deleteUser(id);
  }
});

test.describe('P1-10 check-in scheduling and due generation', () => {
  test('A1 set client check-in weekday', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    const { id } = await createClientFor('Schedule Target');

    await signInUi(page, 'trainer.a@ptplatform.test');
    await page.goto(`/coach/clients/${id}`);

    // Open the Check-in tab and pick Wednesday (value 3, 0 = Sunday).
    await page.getByRole('tab', { name: 'Check-in' }).click();
    await page.getByLabel('Check-in day').selectOption('3');
    await page.getByRole('button', { name: 'Save check-in day' }).click();
    await expect(page.getByText('Check-in day saved')).toBeVisible();

    // The write landed in checkin_schedules with trainer + client from the session.
    const { data } = await admin
      .from('checkin_schedules')
      .select('trainer_id, weekday, active, form_id')
      .eq('client_id', id)
      .single();
    expect(data?.weekday).toBe(3);
    expect(data?.trainer_id).toBe(TRAINER_A);
    expect(data?.active).toBe(true);
    expect(data?.form_id).toBe(await defaultCheckinFormId());
  });

  test('A2 due generation is idempotent and auth-gated', async ({ request }) => {
    const { id } = await createClientFor('Due Target');
    const formId = await defaultCheckinFormId();
    await admin.from('checkin_schedules').insert({
      trainer_id: TRAINER_A,
      client_id: id,
      form_id: formId,
      weekday: TODAY_WEEKDAY,
      active: true,
    });

    const countFor = async () => {
      const { count } = await admin
        .from('form_responses')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', id);
      return count ?? 0;
    };

    // No secret → refused, nothing created.
    const noAuth = await request.get('/api/cron/checkins');
    expect(noAuth.status()).toBe(401);
    expect(await countFor()).toBe(0);

    // With the secret → one unsubmitted response for the due client.
    const first = await request.get('/api/cron/checkins', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(first.ok()).toBeTruthy();
    expect(await countFor()).toBe(1);

    // Running again the same ISO week is a no-op (idempotent).
    const second = await request.get('/api/cron/checkins', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(second.ok()).toBeTruthy();
    expect(await countFor()).toBe(1);

    // The generated response is unsubmitted and belongs to this client's trainer.
    const { data } = await admin
      .from('form_responses')
      .select('submitted_at, trainer_id, form_id')
      .eq('client_id', id)
      .single();
    expect(data?.submitted_at).toBeNull();
    expect(data?.trainer_id).toBe(TRAINER_A);
    expect(data?.form_id).toBe(formId);
  });

  test('A3 client sees due + history', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    // Seeded Client One has a due check-in (cccc…0001, unsubmitted) and a submitted one (cccc…0002).
    await signInUi(page, 'client.one@ptplatform.test');
    await page.goto('/client/checkins');

    await expect(page.getByRole('heading', { name: 'Due now' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Weekly check-in/ }).first()).toHaveAttribute(
      'href',
      '/client/checkin/cccc0000-0000-0000-0000-000000000001',
    );

    await expect(page.getByRole('heading', { name: 'Past check-ins' })).toBeVisible();
    await expect(
      page.locator('a[href="/client/checkin/cccc0000-0000-0000-0000-000000000002"]'),
    ).toBeVisible();
  });
});
