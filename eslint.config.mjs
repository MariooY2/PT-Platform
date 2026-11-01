import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  // App code is linted; harness-owned and generated paths are not.
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'node_modules/**',
    'next-env.d.ts',
    '.harness/**',
    '.claude/**',
    '.github/**',
    'scripts/**',
    'docs/**',
    'tasks/**',
    'supabase/**',
  ]),
  ...nextVitals,
  ...nextTs,
]);

export default eslintConfig;
