import type { ReactNode } from 'react';
import { AppShell } from '@/components/shared/nav/app-shell';

export default function CoachLayout({ children }: { children: ReactNode }) {
  return <AppShell variant="coach">{children}</AppShell>;
}
