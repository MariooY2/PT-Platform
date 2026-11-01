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
