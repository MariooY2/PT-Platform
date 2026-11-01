import type { Page } from '@playwright/test';

// Seeded accounts a route is viewed as. Only `anon` works until auth lands (P0-04);
// signInAs throws for the others so later tasks must implement them, not silently skip.
export type Role = 'anon' | 'coach' | 'coach-empty' | 'client' | 'buyer' | 'admin';

export interface UiRoute {
  path: string;
  as: Role;
  /** Page states reachable for this route; each is captured + axe-scanned. */
  states: string[];
}

// Later UI tasks append their routes here; the screenshot + axe suite iterates them.
export const uiRoutes: UiRoute[] = [{ path: '/dev/ui', as: 'anon', states: ['default'] }];

export async function signInAs(_page: Page, role: Role): Promise<void> {
  if (role === 'anon') return;
  throw new Error(`signInAs: role "${role}" is not implemented yet (auth arrives in P0-04).`);
}

export const routeSlug = (path: string) =>
  path.replace(/^\//, '').replace(/\//g, '-').replace(/:/g, '') || 'home';
