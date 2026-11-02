import type { Page } from '@playwright/test';

// Seeded accounts a route is viewed as. Only `anon` works until auth lands (P0-04);
// signInAs throws for the others so later tasks must implement them, not silently skip.
export type Role = 'anon' | 'coach' | 'coach-empty' | 'client' | 'buyer' | 'admin';

export interface UiRoute {
  path: string;
  as: Role;
  /**
   * Page states to capture + axe-scan, one screenshot each. `default` loads the route plainly;
   * any other state is reached via `?state=<state>` (the screen reads the param to render it).
   */
  states: string[];
}

// Later UI tasks append their routes here; ui.spec.ts iterates route × state × viewport × theme.
// Default-state, URL-reachable screens live here; interaction-driven states (login error, invite
// expired, onboarding step 2/3, slug taken) are captured in auth.spec.ts after driving them.
export const uiRoutes: UiRoute[] = [
  { path: '/dev/ui', as: 'anon', states: ['default'] },
  { path: '/login', as: 'anon', states: ['default'] },
  { path: '/signup', as: 'anon', states: ['default'] },
  { path: '/reset', as: 'anon', states: ['default'] },
  { path: '/invite/seed-invite-token-alpha', as: 'anon', states: ['valid'] },
  { path: '/coach/onboarding', as: 'coach-empty', states: ['step-1'] },
  { path: '/coach', as: 'coach-empty', states: ['setup-checklist'] },
  // P0-05 navigation and layout shells — every destination gets a screenshot + axe scan (A3/A4).
  { path: '/coach/clients', as: 'coach', states: ['default', 'no-results', 'invite-dialog'] },
  { path: '/coach/clients', as: 'coach-empty', states: ['empty'] },
  {
    path: '/coach/clients/33333333-0000-0000-0000-000000000001',
    as: 'coach',
    states: ['default', 'notes-files', 'habits', 'program', 'checkin'],
  },
  { path: '/coach/checkins', as: 'coach', states: ['default', 'empty', 'loading', 'error'] },
  { path: '/coach/messages', as: 'coach-empty', states: ['empty'] },
  { path: '/coach/programs', as: 'coach', states: ['default', 'assign', 'assign-preview'] },
  { path: '/coach/programs', as: 'coach-empty', states: ['empty'] },
  {
    path: '/coach/programs/bbbb0000-0000-0000-0000-000000000001',
    as: 'coach',
    states: ['default', 'assign', 'assign-preview'],
  },
  {
    path: '/coach/exercises',
    as: 'coach',
    states: ['default', 'no-results', 'empty', 'error', 'loading'],
  },
  { path: '/coach/forms', as: 'coach', states: ['default', 'empty', 'loading', 'error'] },
  { path: '/coach/products', as: 'coach-empty', states: ['empty'] },
  { path: '/coach/orders', as: 'coach-empty', states: ['empty'] },
  { path: '/coach/earnings', as: 'coach-empty', states: ['empty'] },
  { path: '/coach/more', as: 'coach-empty', states: ['default'] },
  { path: '/coach/settings', as: 'coach-empty', states: ['default'] },
  { path: '/client', as: 'client', states: ['default', 'install-prompt'] },
  { path: '/client/progress', as: 'client', states: ['empty'] },
  { path: '/client/messages', as: 'client', states: ['empty'] },
  { path: '/client/checkins', as: 'client', states: ['default', 'empty', 'loading', 'error'] },
  // Mobile check-in fill screen (one question per screen) + the submitted reply view (seeded ids).
  {
    path: '/client/checkin/cccc0000-0000-0000-0000-000000000001',
    as: 'client',
    states: ['default'],
  },
  {
    path: '/client/checkin/cccc0000-0000-0000-0000-000000000002',
    as: 'client',
    states: ['default'],
  },
  { path: '/client/billing', as: 'client', states: ['empty'] },
  { path: '/client/more', as: 'client', states: ['default'] },
  { path: '/client/settings', as: 'client', states: ['default'] },
  { path: '/c/demo-coach', as: 'anon', states: ['unpublished-visitor'] },
  { path: '/admin', as: 'admin', states: ['default'] },
  { path: '/admin/orders', as: 'admin', states: ['empty'] },
  { path: '/admin/payments', as: 'admin', states: ['empty'] },
  { path: '/admin/payouts', as: 'admin', states: ['empty'] },
  { path: '/admin/settings', as: 'admin', states: ['default'] },
];

const SEED_ACCOUNT: Partial<Record<Role, string>> = {
  coach: 'trainer.a@ptplatform.test',
  'coach-empty': 'coach.empty@ptplatform.test',
  client: 'client.one@ptplatform.test',
  admin: 'admin@ptplatform.test',
};
export const SEED_PASSWORD = 'Password123!';

export async function signInAs(page: Page, role: Role): Promise<void> {
  if (role === 'anon') return;
  const email = SEED_ACCOUNT[role];
  if (!email) throw new Error(`signInAs: no seeded account for role "${role}".`);
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
}

export const routeSlug = (path: string) =>
  path.replace(/^\//, '').replace(/\//g, '-').replace(/:/g, '') || 'home';
