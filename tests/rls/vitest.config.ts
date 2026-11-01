import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Config lives under tests/rls so edits don't touch the fingerprint's root config patterns.
// Root is pinned to the repo so include/globalSetup paths are repo-relative.
export default defineConfig({
  root: fileURLToPath(new URL('../..', import.meta.url)),
  test: {
    include: ['tests/rls/**/*.test.ts'],
    globalSetup: ['tests/rls/global-setup.ts'],
    fileParallelism: false,
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
