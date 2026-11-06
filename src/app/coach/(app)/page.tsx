import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { zonedDateString } from '@/features/checkins/week';
import { getCoachToday } from '@/features/coach-today/queries';
import { CoachToday } from '@/features/coach-today/components/coach-today';

// Reads the session (cookies) + searchParams, so the route renders dynamically (Next 16 cacheComponents).
export const instant = false;

export default async function CoachTodayPage({
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
  if (!user) redirect('/login');

  const { data: trainer } = await supabase
    .from('trainers')
    .select('storefront_published')
    .eq('id', user.id)
    .maybeSingle();
  if (!trainer) redirect('/coach/onboarding');

  const today = zonedDateString(new Date());
  const data = await getCoachToday(supabase, user.id, today);

  return (
    <CoachToday
      key={state ?? 'default'}
      data={data}
      storefrontPublished={trainer.storefront_published}
      forcedState={state}
    />
  );
}
