import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';
import { SEED_PASSWORD } from './ui-routes';

// Service client from the live local stack (same pattern as clients.spec.ts).
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
const run = `invitespec-${Date.now()}`;
const emails = {
  link: `${run}-link@ptplatform.test`,
  dup: `${run}-dup@ptplatform.test`,
  email: `${run}-email@ptplatform.test`,
  csvA: `${run}-csv-a@ptplatform.test`,
  csvB: `${run}-csv-b@ptplatform.test`,
};

async function signInUi(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15_000 });
}

test.afterAll(async () => {
  await admin.from('trainer_clients').delete().in('invite_email', Object.values(emails));
});

test.describe('P1-02 invite clients', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('A1: the copy-link tab creates an invited row with a unique token', async ({ page }) => {
    await signInUi(page, 'trainer.a@ptplatform.test');
    await page.goto('/coach/clients');

    await page.getByRole('button', { name: 'Invite client' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Client email').fill(emails.link);
    await dialog.getByRole('button', { name: 'Create invite link' }).click();

    const linkField = page.locator('#invite-link');
    await expect(linkField).toBeVisible();
    const url = await linkField.inputValue();
    expect(url).toContain('/invite/');
    const token = url.split('/invite/')[1]!;
    expect(token.length).toBeGreaterThan(10);

    // The row exists, is 'invited'/'invite', has the token, and is NOT linked to a client.
    const { data } = await admin
      .from('trainer_clients')
      .select('status, source, client_id, invite_token')
      .eq('trainer_id', TRAINER_A)
      .eq('invite_email', emails.link)
      .single();
    expect(data?.status).toBe('invited');
    expect(data?.source).toBe('invite');
    expect(data?.client_id).toBeNull();
    expect(data?.invite_token).toBe(token);

    // A WhatsApp share is offered alongside the link.
    await expect(page.getByRole('link', { name: 'Share on WhatsApp' })).toBeVisible();
  });

  test('A4: inviting the same email again shows a specific message, not a crash', async ({
    page,
  }) => {
    await signInUi(page, 'trainer.a@ptplatform.test');
    await page.goto('/coach/clients');
    await page.getByRole('button', { name: 'Invite client' }).click();
    const dialog = page.getByRole('dialog');

    // Create once (self-contained — no dependency on another test's ordering).
    await dialog.getByLabel('Client email').fill(emails.dup);
    await dialog.getByRole('button', { name: 'Create invite link' }).click();
    await expect(page.locator('#invite-link')).toBeVisible();

    // Create another with the same email → a specific, non-crashing message.
    await dialog.getByRole('button', { name: 'Create another link' }).click();
    await dialog.getByLabel('Client email').fill(emails.dup);
    await dialog.getByRole('button', { name: 'Create invite link' }).click();
    await expect(dialog.getByText(/already on your client list/i)).toBeVisible();
  });

  test('A3: the email tab sends the invite through the provider (mock)', async ({ page }) => {
    await signInUi(page, 'trainer.a@ptplatform.test');
    await page.goto('/coach/clients');
    await page.getByRole('button', { name: 'Invite client' }).click();
    const dialog = page.getByRole('dialog');

    await dialog.getByRole('tab', { name: 'Email' }).click();
    await dialog.getByLabel('Client email').fill(emails.email);
    await dialog.getByRole('button', { name: 'Send invite' }).click();

    await expect(dialog.getByText(/Invite sent to/i)).toBeVisible();

    const { data } = await admin
      .from('trainer_clients')
      .select('status, source, client_id')
      .eq('trainer_id', TRAINER_A)
      .eq('invite_email', emails.email)
      .single();
    expect(data?.status).toBe('invited');
    expect(data?.source).toBe('invite');
    expect(data?.client_id).toBeNull();
  });

  test('A2: importing a CSV creates import rows, reports invalid, ignores client_id', async ({
    page,
  }) => {
    await signInUi(page, 'trainer.a@ptplatform.test');
    await page.goto('/coach/clients');
    await page.getByRole('button', { name: 'Invite client' }).click();
    const dialog = page.getByRole('dialog');

    await dialog.getByRole('tab', { name: 'Import' }).click();

    // A real-world CSV: extra columns (name, client_id), a goals column, a duplicate, an invalid row.
    const csv = [
      'email,name,goals,client_id',
      `${emails.csvA},Maya,Get strong,44444444-0000-0000-0000-000000000001`,
      `${emails.csvB},Omar,,`,
      `${emails.csvA},Maya again,,`, // in-file duplicate
      'not-an-email,Bad,,',
    ].join('\n');
    const dir = mkdtempSync(join(tmpdir(), 'invitespec-'));
    const file = join(dir, 'clients.csv');
    writeFileSync(file, csv);

    await dialog.locator('#csv-file').setInputFiles(file);

    await expect(dialog.getByText(/Invited 2 clients/i)).toBeVisible();
    await expect(dialog.getByText(/1 row couldn’t be read/i)).toBeVisible();

    // Both valid rows are 'import'/'invited' and, crucially, NOT linked to the client_id in the file.
    const { data } = await admin
      .from('trainer_clients')
      .select('invite_email, status, source, client_id, goals')
      .eq('trainer_id', TRAINER_A)
      .in('invite_email', [emails.csvA, emails.csvB]);
    expect(data).toHaveLength(2);
    for (const row of data ?? []) {
      expect(row.status).toBe('invited');
      expect(row.source).toBe('import');
      expect(row.client_id).toBeNull(); // the client_id column was ignored
    }
    const maya = data?.find((r) => r.invite_email === emails.csvA);
    expect(maya?.goals).toBe('Get strong');
  });
});
