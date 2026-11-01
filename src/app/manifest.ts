import type { MetadataRoute } from 'next';
import { PWA_COLORS } from '@/lib/pwa/colors';

// Phase 1 PWA scope only: a web app manifest so the client app is installable (docs/platform.md §10).
// No service worker / offline / Serwist here — that is Phase 3.
//
// Icons are rendered on demand by src/app/icons/[size]/route.tsx (next/og ImageResponse), so there
// are no binary assets to ship. The `purpose` type only admits a single keyword per entry, so each
// size is listed once for `any` and once for `maskable`.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PT Platform',
    short_name: 'PT',
    description: 'Your training, every day — today’s workout in one tap.',
    start_url: '/client',
    display: 'standalone',
    theme_color: PWA_COLORS.themeColor,
    background_color: PWA_COLORS.backgroundColor,
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
