import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listClientCheckins } from '@/features/checkins/queries';
import { ClientCheckins } from '@/features/checkins/components/client-checkins';

// Under the client (app) intake gate (dynamic layout), so this route renders dynamically too (L-002).
export const instant = false;

export default async function ClientCheckinsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  // Force dynamic rendering before the Supabase session read (L-002).
  await connection();
  const { state } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { due, history, error } = user
    ? await listClientCheckins(supabase, user.id)
    : { due: [], history: [], error: 'no session' };

  return (
    <ClientCheckins
      key={state ?? 'default'}
      due={due}
      history={history}
      hadError={Boolean(error)}
      forcedState={state}
    />
  );
}
