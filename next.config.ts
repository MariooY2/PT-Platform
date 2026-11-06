import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
};

// Service worker (Phase 3 offline, docs/platform.md §10). Gated OFF by default: the SW is only built
// and registered when NEXT_PUBLIC_ENABLE_SW=1 at build time. The dev and Playwright/e2e builds do not
// set it, so they are byte-for-byte unaffected and the existing suite can't regress. Vercel sets the
// flag in production (queued for the human in .harness/approvals.md).
//
// Note: @serwist/next integrates via webpack; to actually emit public/sw.js the flagged build must run
// `next build --webpack` (Next 16 defaults to Turbopack, which @serwist/next does not support yet).
const enableSw = process.env.NEXT_PUBLIC_ENABLE_SW === '1';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: !enableSw,
  // Register from the generated entry only when enabled; keeps registration out of the default build.
  register: enableSw,
});

// When disabled, hand back the plain config untouched (no webpack key injected at all).
export default enableSw ? withSerwist(nextConfig) : nextConfig;
