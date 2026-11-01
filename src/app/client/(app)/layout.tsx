import type { ReactNode } from 'react';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shared/nav/app-shell';
import { createClient } from '@/lib/supabase/server';
import { roleOf } from '@/lib/supabase/middleware';
import { resolveIntakeGate } from '@/features/forms/intake';

export default async function ClientLayout({ children }: { children: ReactNode }) {
  // Reads the session in the layout body → force dynamic rendering first (L-002). This gate keeps a
  // new client on their trainer's intake until it is submitted. /client/checkin/[id] lives OUTSIDE
  // this (app) group, so filling the intake never re-enters the gate (no redirect loop).
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && roleOf(user) === 'client') {
    const { redirectTo } = await resolveIntakeGate(supabase, user.id);
    if (redirectTo) redirect(redirectTo);
  }

  return <AppShell variant="client">{children}</AppShell>;
}
