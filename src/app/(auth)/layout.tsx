import type { ReactNode } from 'react';
import { Wordmark } from '@/components/shared/brand';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[400px] flex-col justify-center gap-8 p-6">
      <div className="flex justify-center">
        <Wordmark textClassName="text-2xl" />
      </div>
      {/* Form controls sit on a card so input borders meet the 3:1 non-text contrast floor (D-012). */}
      <div className="rounded-xl border bg-card p-6">{children}</div>
    </main>
  );
}
