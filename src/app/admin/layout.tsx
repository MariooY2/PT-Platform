import type { ReactNode } from 'react';
import { AppShell } from '@/components/shared/nav/app-shell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AppShell variant="admin">{children}</AppShell>;
}
