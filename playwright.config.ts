import { defineConfig, devices } from '@playwright/test';

// Dedicated port so the e2e server never collides with other local dev servers
// (default 3000 is a common choice and may be in use by unrelated processes).
const PORT = process.env.PORT ?? '3100';
const BASE_URL = `http://localhost:${PORT}`;

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
    // Enable the /dev/ui gallery in the production build the e2e runs against.
    env: { ENABLE_DEV_UI: '1' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
