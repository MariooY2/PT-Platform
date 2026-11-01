import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Archivo } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
});

export const metadata: Metadata = {
  title: 'PT Platform',
  description: 'Coaching and program-selling platform for personal trainers.',
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
