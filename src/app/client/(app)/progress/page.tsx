import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { todayFor } from '@/features/habits/lib';
import {
  getBodyProgress,
  getCalendarProgress,
  getPhotoProgress,
  getStrengthProgress,
} from '@/features/progress/queries';
import { ProgressScreen } from '@/features/progress/components/progress-screen';
import { PROGRESS_TABS, type ProgressTab } from '@/features/progress/types';

// Under the client (app) intake gate (dynamic layout), so this route renders dynamically too (L-002).
export const instant = false;

const VIEW_STATES = new Set(['empty', 'loading', 'error', 'default']);

export default async function ClientProgressPage({
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
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle();
  const today = todayFor(profile?.timezone);
  const [year, month] = today.split('-').map(Number);

  const [strength, body, photos, calendar] = await Promise.all([
    getStrengthProgress(supabase, user.id, today),
    getBodyProgress(supabase, user.id),
    getPhotoProgress(supabase, user.id),
    getCalendarProgress(supabase, user.id, year, month, today),
  ]);

  const initialTab = (PROGRESS_TABS as readonly string[]).includes(state ?? '')
    ? (state as ProgressTab)
    : 'strength';
  const forcedState = state && VIEW_STATES.has(state) ? state : undefined;

  return (
    <ProgressScreen
      key={state ?? 'default'}
      userId={user.id}
      strength={{ lifts: strength.lifts, error: strength.error }}
      body={{ body: body.body, error: body.error }}
      photos={{ dates: photos.dates, error: photos.error }}
      calendar={{ calendar: calendar.calendar, error: calendar.error }}
      forcedState={forcedState}
      initialTab={initialTab}
    />
  );
}
