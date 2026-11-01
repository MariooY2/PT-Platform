import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Archivo } from 'next/font/google';
import './globals.css';
import { PWA_COLORS } from '@/lib/pwa/colors';
import { ThemeProvider } from '@/components/theme-provider';

const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
});

export const metadata: Metadata = {
  title: 'PT Platform',
  description: 'Coaching and program-selling platform for personal trainers.',
  // Links the web app manifest served by src/app/manifest.ts (Phase 1 PWA, docs/platform.md §10).
  manifest: '/manifest.webmanifest',
};

// Next moved theme-color to the viewport export (metadata.themeColor warns). This renders the
// document <meta name="theme-color">; the colour mirrors --primary (light) via src/lib/pwa/colors.ts.
export const viewport: Viewport = {
  themeColor: PWA_COLORS.themeColor,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={archivo.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
