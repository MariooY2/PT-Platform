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
export const uiRoutes: UiRoute[] = [{ path: '/dev/ui', as: 'anon', states: ['default'] }];

export async function signInAs(_page: Page, role: Role): Promise<void> {
  if (role === 'anon') return;
  throw new Error(`signInAs: role "${role}" is not implemented yet (auth arrives in P0-04).`);
}

export const routeSlug = (path: string) =>
  path.replace(/^\//, '').replace(/\//g, '-').replace(/:/g, '') || 'home';
