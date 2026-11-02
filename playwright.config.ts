import { execFileSync } from 'node:child_process';
import { defineConfig, devices } from '@playwright/test';

// Dedicated port so the e2e server never collides with other local dev servers
// (default 3000 is a common choice and may be in use by unrelated processes).
const PORT = process.env.PORT ?? '3100';
const BASE_URL = `http://localhost:${PORT}`;

// The e2e server (`next start`) reads these at runtime (server/middleware); no .env file is committed.
// Pulled from the live local Supabase stack so the app can talk to it during e2e.
function supabaseEnv(): Record<string, string> {
  try {
    const s = JSON.parse(
      execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
        encoding: 'utf8',
        shell: process.platform === 'win32',
      }),
    ) as Record<string, string>;
    return {
      NEXT_PUBLIC_SUPABASE_URL: s.API_URL ?? s.api_url ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: s.ANON_KEY ?? s.anon_key ?? s.PUBLISHABLE_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: s.SERVICE_ROLE_KEY ?? s.service_role_key ?? s.SECRET_KEY ?? '',
    };
  } catch {
    return {};
  }
}

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Enable the /dev/ui gallery and give the server the local Supabase connection. CRON_SECRET lets
    // the check-in due-generation route (P1-10) authenticate during e2e; the real production secret
    // is provisioned by the human (parked in approvals.md).
    env: {
      ENABLE_DEV_UI: '1',
      NEXT_PUBLIC_SITE_URL: BASE_URL,
      CRON_SECRET: process.env.CRON_SECRET ?? 'e2e-cron-secret',
      ...supabaseEnv(),
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
