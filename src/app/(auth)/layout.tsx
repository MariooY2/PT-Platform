import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[400px] flex-col justify-center gap-8 p-6">
      <div className="text-center">
        <span className="text-2xl font-bold">PT Platform</span>
      </div>
      {children}
    </main>
  );
}
