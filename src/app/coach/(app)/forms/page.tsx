import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listForms } from '@/features/forms/queries';
import { FormsManager } from '@/features/forms/components/forms-manager';

// Reads the session (cookies) + searchParams, so the route renders dynamically (Next 16 cacheComponents).
export const instant = false;

export default async function CoachFormsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  // Force dynamic rendering before any Supabase session read (L-002).
  await connection();
  const { state } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { forms, error } = user
    ? await listForms(supabase, user.id)
    : { forms: null, error: 'no session' };

  return (
    <FormsManager
      key={state ?? 'default'}
      forms={forms ?? []}
      hadError={Boolean(error)}
      forcedState={state}
    />
  );
}
