import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { makeAdmin } from './supabase-admin';
import { expect, test, type Page } from '@playwright/test';
import { SEED_PASSWORD } from './ui-routes';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
async function axeClean(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(r.violations, JSON.stringify(r.violations, null, 2)).toEqual([]);
}

// Service client from the live local stack (same pattern as tests/rls/global-setup.ts).
const admin = makeAdmin();

const TRAINER_A = '11111111-0000-0000-0000-000000000001';
const EVIDENCE = join(process.cwd(), '.harness', 'evidence', 'ui');
const tag = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

async function shot(page: Page, slug: string, name: string) {
  const dir = join(EVIDENCE, slug);
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, name), fullPage: true });
}

async function signInUi(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

async function createInvite(email: string, token: string, expiresAtIso: string) {
  await admin.from('trainer_clients').insert({
    trainer_id: TRAINER_A,
    invite_email: email,
    invite_token: token,
    status: 'invited',
    source: 'invite',
    invite_expires_at: expiresAtIso,
  });
}

// Remove everything the suite created so test:rls's seeded counts stay stable across runs.
test.afterAll(async () => {
  await admin.from('trainer_clients').delete().like('invite_email', '%e2e-%');
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) {
    if (u.email && u.email.includes('e2e-')) await admin.auth.admin.deleteUser(u.id);
  }
});

test('A1: coach signs up, completes onboarding, lands on /coach', async ({ page }) => {
  const email = `coach-${tag()}@ptplatform.test`;
  const slug = `coach-${tag()}`;

  await page.goto('/signup');
  await page.locator('#fullName').fill('New Coach');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Create coach account' }).click();

  await page.waitForURL('**/coach/onboarding**', { timeout: 15_000 });
  await page.locator('#businessName').fill('New Coach Gym');
  await page.locator('#slug').fill(slug);
  await page.locator('#slug').blur();
  await expect(page.getByText('That address is available.')).toBeVisible(); // let layout settle
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your look' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your money' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish setup' }).click();

  await page.waitForURL((u) => u.pathname === '/coach', { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Get set up' })).toBeVisible();
});

test('A2: invite link → client signup → /client, trainer_clients active and linked', async ({
  page,
}) => {
  const email = `client-${tag()}@ptplatform.test`;
  const token = `tok-${tag()}`;
  await createInvite(email, token, new Date(Date.now() + 14 * 864e5).toISOString());

  await page.goto(`/invite/${token}`);
  await expect(page.getByRole('heading', { name: /invited you/i })).toBeVisible();
  await page.locator('#fullName').fill('Invited Client');
  await page.locator('#password').fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Join' }).click();

  await page.waitForURL((u) => u.pathname === '/client', { timeout: 15_000 });

  const { data: link } = await admin
    .from('trainer_clients')
    .select('status, client_id, invite_token')
    .eq('invite_email', email)
    .single();
  expect(link?.status).toBe('active');
  expect(link?.client_id).toBeTruthy();
  expect(link?.invite_token).toBeNull(); // consumed
});

test('A3: role-based redirects', async ({ page }) => {
  // signed-out → protected area → /login?next=
  await page.context().clearCookies();
  await page.goto('/client');
  await page.waitForURL('**/login**', { timeout: 15_000 });
  expect(new URL(page.url()).searchParams.get('next')).toBe('/client');

  // client visiting /coach → /client
  await signInUi(page, 'client.one@ptplatform.test');
  await page.waitForURL((u) => u.pathname === '/client', { timeout: 15_000 });
  await page.goto('/coach');
  await page.waitForURL((u) => u.pathname === '/client', { timeout: 15_000 });

  // trainer visiting /admin → /coach
  await signInUi(page, 'trainer.a@ptplatform.test');
  await page.waitForURL((u) => u.pathname === '/coach', { timeout: 15_000 });
  await page.goto('/admin');
  await page.waitForURL((u) => u.pathname === '/coach', { timeout: 15_000 });
});

test('A4: expired and reused invites are rejected', async ({ page }) => {
  // expired
  const expiredEmail = `expired-${tag()}@ptplatform.test`;
  const expiredToken = `exp-${tag()}`;
  await createInvite(expiredEmail, expiredToken, new Date(Date.now() - 864e5).toISOString());
  await page.goto(`/invite/${expiredToken}`);
  await expect(page.getByRole('heading', { name: /expired/i })).toBeVisible();
  await expect(page.getByLabel('Your name')).toHaveCount(0);

  // reused: consume a valid invite, then reopen
  const reuseEmail = `reuse-${tag()}@ptplatform.test`;
  const reuseToken = `reuse-${tag()}`;
  await createInvite(reuseEmail, reuseToken, new Date(Date.now() + 14 * 864e5).toISOString());
  await page.context().clearCookies();
  await page.goto(`/invite/${reuseToken}`);
  await page.locator('#fullName').fill('Reuse Client');
  await page.locator('#password').fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Join' }).click();
  await page.waitForURL((u) => u.pathname === '/client', { timeout: 15_000 });

  await page.context().clearCookies();
  await page.goto(`/invite/${reuseToken}`);
  await expect(page.getByRole('heading', { name: /expired/i })).toBeVisible();
});

// Interaction-driven states for the ui-reviewer (A6), captured + axe-scanned in both themes, both widths.
for (const theme of ['light', 'dark'] as const) {
  test(`state screenshots (${theme}): login error, onboarding steps, slug taken, invite expired`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme });

    for (const w of [360, 1280]) {
      await page.context().clearCookies();
      await page.setViewportSize({ width: w, height: 800 });

      // login error
      await page.goto('/login');
      await page.locator('#email').fill('nobody@ptplatform.test');
      await page.locator('#password').fill('wrongpassword');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByText('Email or password is wrong.')).toBeVisible();
      await shot(page, 'login', `error-${w}-${theme}.png`);
      await axeClean(page);

      // onboarding steps (coach-empty already onboarded; wizard still renders)
      await signInUi(page, 'coach.empty@ptplatform.test');
      await page.waitForURL((u) => u.pathname === '/coach', { timeout: 15_000 });

      await page.goto('/coach/onboarding?step=1');
      await page.locator('#slug').fill('trainer-alpha'); // taken
      await page.locator('#slug').blur();
      await expect(page.getByText(/taken/i)).toBeVisible();
      await shot(page, 'coach-onboarding', `slug-taken-${w}-${theme}.png`);
      await axeClean(page);

      await page.goto('/coach/onboarding?step=2');
      await expect(page.getByRole('heading', { name: 'Your look' })).toBeVisible();
      await shot(page, 'coach-onboarding', `step-2-${w}-${theme}.png`);
      await page.goto('/coach/onboarding?step=3');
      await expect(page.getByRole('heading', { name: 'Your money' })).toBeVisible();
      await shot(page, 'coach-onboarding', `step-3-${w}-${theme}.png`);

      // invite expired
      const email = `shot-${tag()}@ptplatform.test`;
      const token = `shot-${tag()}`;
      await createInvite(email, token, new Date(Date.now() - 864e5).toISOString());
      await page.context().clearCookies();
      await page.goto(`/invite/${token}`);
      await expect(page.getByRole('heading', { name: /expired/i })).toBeVisible();
      await shot(page, 'invite-expired', `expired-${w}-${theme}.png`);
      await axeClean(page);
    }
  });
}
