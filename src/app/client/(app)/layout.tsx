import type { ReactNode } from 'react';
import { AppShell } from '@/components/shared/nav/app-shell';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return <AppShell variant="client">{children}</AppShell>;
}
