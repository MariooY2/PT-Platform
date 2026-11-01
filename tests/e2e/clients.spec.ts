import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';
import { SEED_PASSWORD } from './ui-routes';

// Service client from the live local stack (same pattern as auth.spec.ts / global-setup.ts).
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
const BUCKET = 'client-files';
const tag = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const createdClientIds: string[] = [];

async function createClientFor(
  fullName: string,
  opts: { status: 'active' | 'paused' | 'archived'; tags?: string[] } = { status: 'active' },
): Promise<string> {
  const email = `clientsspec-${tag()}@ptplatform.test`;
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
  // The handle_new_user trigger makes the profile; upsert to be sure the name is set.
  await admin.from('profiles').upsert({ id, role: 'client', full_name: fullName });
  await admin.from('trainer_clients').insert({
    trainer_id: TRAINER_A,
    client_id: id,
    status: opts.status,
    source: 'invite',
    start_date: new Date().toISOString().slice(0, 10),
    tags: opts.tags ?? null,
  });
  return id;
}

async function signInUi(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15_000 });
}

async function setStatusFilter(page: Page, label: string) {
  await page.getByLabel('Filter by status').click();
  await page.getByRole('option', { name: label }).click();
}

let activeId = '';
let pausedId = '';
let archiveTargetId = '';

test.beforeAll(async () => {
  activeId = await createClientFor('Dana Active', { status: 'active', tags: ['e2e-strength'] });
  pausedId = await createClientFor('Yuki Paused', { status: 'paused' });
  archiveTargetId = await createClientFor('Quinn Archive', { status: 'active' });
});

test.afterAll(async () => {
  for (const id of createdClientIds) {
    const { data: objects } = await admin.storage.from(BUCKET).list(`${TRAINER_A}/${id}`);
    if (objects?.length) {
      await admin.storage.from(BUCKET).remove(objects.map((o) => `${TRAINER_A}/${id}/${o.name}`));
    }
    await admin.from('client_notes').delete().eq('client_id', id);
    await admin.from('client_files').delete().eq('client_id', id);
    await admin.from('trainer_clients').delete().eq('client_id', id);
    await admin.auth.admin.deleteUser(id);
  }
});

test.describe('P1-01 clients', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('A3: the list shows only the coach’s clients and filters + searches', async ({ page }) => {
    await signInUi(page, 'trainer.a@ptplatform.test');
    await page.goto('/coach/clients');

    // Own clients are listed (seeded + ephemeral); another trainer's client is not.
    await expect(page.getByRole('link', { name: /Client One/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Dana Active/ })).toBeVisible();
    await expect(page.getByText('Client Two')).toHaveCount(0);

    // Search narrows by name.
    await page.getByLabel('Search clients').fill('Dana');
    await expect(page.getByRole('link', { name: /Dana Active/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Client One/ })).toHaveCount(0);

    // A non-matching search shows the no-results state.
    await page.getByLabel('Search clients').fill('zzz-no-match-xyz');
    await expect(page.getByText('No clients match these filters')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).first().click();

    // Status filter narrows to paused clients.
    await setStatusFilter(page, 'Paused');
    await expect(page.getByRole('link', { name: /Yuki Paused/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Dana Active/ })).toHaveCount(0);

    // Tag filter narrows to a tag.
    await page.getByRole('button', { name: 'Clear filters' }).first().click();
    await page.getByLabel('Filter by tag').click();
    await page.getByRole('option', { name: 'e2e-strength' }).click();
    await expect(page.getByRole('link', { name: /Dana Active/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Yuki Paused/ })).toHaveCount(0);
  });

  test('A4: the Overview edits goals, injuries and tags and persists after reload', async ({
    page,
  }) => {
    await signInUi(page, 'trainer.a@ptplatform.test');
    await page.goto(`/coach/clients/${activeId}`);

    await page.getByLabel('Goals').fill('Squat 100 kg by spring');
    await page.getByLabel('Injuries and limitations').fill('Left knee — avoid deep lunges');
    await page.getByLabel('Tags').fill('strength, online');
    await page.getByRole('button', { name: 'Save details' }).click();
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByLabel('Goals')).toHaveValue('Squat 100 kg by spring');
    await expect(page.getByLabel('Injuries and limitations')).toHaveValue(
      'Left knee — avoid deep lunges',
    );
    await expect(page.getByLabel('Tags')).toHaveValue('strength, online');
  });

  test('A5: Notes & files adds a private note and uploads a retrievable file', async ({ page }) => {
    await signInUi(page, 'trainer.a@ptplatform.test');
    await page.goto(`/coach/clients/${activeId}?state=notes-files`);

    await expect(page.getByText('Only you can see notes')).toBeVisible();

    // Add a private note.
    await page.getByLabel('Add a note').fill('clientsspec-note: progressing well');
    await page.getByRole('button', { name: 'Add note' }).click();
    await expect(page.getByText('clientsspec-note: progressing well')).toBeVisible();

    // Upload a file via the private bucket, then confirm it is listed and retrievable.
    const dir = mkdtempSync(join(tmpdir(), 'clientsspec-'));
    const filePath = join(dir, 'training-plan.txt');
    writeFileSync(filePath, 'hello from the e2e suite');
    await page.getByLabel('Upload a file').setInputFiles(filePath);
    await page.getByRole('button', { name: 'Upload file' }).click();

    await expect(page.getByText('training-plan.txt')).toBeVisible();
    const link = page.getByRole('link', { name: 'Download' });
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toBeTruthy();
    const res = await page.request.get(href!);
    expect(res.status()).toBe(200);
  });

  test('A6: another trainer cannot open this client (not found, no leak)', async ({ page }) => {
    await signInUi(page, 'trainer.b@ptplatform.test');
    const resp = await page.goto(`/coach/clients/${CLIENT_ONE}`);
    expect(resp?.status()).toBe(404);
    await expect(page.getByText(/could not be found/i)).toBeVisible();
    await expect(page.getByText('Client One')).toHaveCount(0);
  });

  test('A10: the "…" menu archives a client; the Status filter reflects it and it persists', async ({
    page,
  }) => {
    await signInUi(page, 'trainer.a@ptplatform.test');
    await page.goto('/coach/clients');

    await page.getByRole('button', { name: 'Actions for Quinn Archive' }).click();
    await page.getByRole('menuitem', { name: 'Archive' }).click();
    await expect(page.getByText('Quinn Archive archived')).toBeVisible();

    // The write landed on trainer_clients.status.
    const { data } = await admin
      .from('trainer_clients')
      .select('status')
      .eq('trainer_id', TRAINER_A)
      .eq('client_id', archiveTargetId)
      .single();
    expect(data?.status).toBe('archived');

    // Filtering by Archived surfaces an archived row; filtering by Active hides it.
    await setStatusFilter(page, 'Archived');
    await expect(page.locator('table').getByText('Archived')).toBeVisible();
    await setStatusFilter(page, 'Active');
    await expect(page.locator('table').getByText('Archived')).toHaveCount(0);

    // Persists after a full reload.
    await page.reload();
    await setStatusFilter(page, 'Archived');
    await expect(page.locator('table').getByText('Archived')).toBeVisible();
  });
});
