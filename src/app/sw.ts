/// <reference lib="webworker" />
import { NetworkFirst, Serwist, type PrecacheEntry, type RuntimeCaching } from 'serwist';

// The precache manifest (the app shell) is injected here at build time by @serwist/next. This file is
// only compiled into public/sw.js when NEXT_PUBLIC_ENABLE_SW=1 (see next.config.ts); the default dev /
// e2e build never runs it, so the existing Playwright suite is unaffected.
type SwScope = ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};
// Cast rather than redeclare `self` (lib.dom already types it) so typecheck stays clean.
const sw = self as unknown as SwScope;

// Runtime cache: the current week's workout pages only, GET navigations, same-origin.
// Never POSTs (server actions carry a `Next-Action` header and use POST), never /api, never auth,
// never cross-origin (Supabase) — so no authenticated writes or secrets are ever cached.
const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ request, url, sameOrigin }) =>
      sameOrigin &&
      request.method === 'GET' &&
      !request.headers.has('Next-Action') &&
      !url.pathname.startsWith('/api') &&
      !url.pathname.startsWith('/auth') &&
      (url.pathname === '/client' || url.pathname.startsWith('/client/workout')),
    handler: new NetworkFirst({
      cacheName: 'workout-pages',
      networkTimeoutSeconds: 10,
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: sw.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

serwist.addEventListeners();
