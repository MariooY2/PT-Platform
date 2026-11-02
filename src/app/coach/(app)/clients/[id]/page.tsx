import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { clientIdSchema } from '@/features/clients/schemas';
import { getClientForTrainer, listFiles, listNotes } from '@/features/clients/queries';
import { listHabitsForTrainer } from '@/features/habits/queries';
import {
  defaultCheckinFormId,
  getClientSchedule,
  getTrainerDefaultCheckinWeekday,
} from '@/features/checkins/queries';
import { listClientPrograms } from '@/features/programs/queries';
import { ClientProfile } from '@/features/clients/components/client-profile';

// Reads params/searchParams + the session (cookies): a blocking dynamic route, not prerendered.
export const instant = false;

export default async function CoachClientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  // Force dynamic rendering before the Supabase session read (Next 16 cacheComponents), so the
  // prerender pass never runs the client's internal Date.now().
  await connection();
  const [{ id }, { state }] = await Promise.all([params, searchParams]);

  // An unknown or malformed id, or a client this trainer is not linked to, is a 404 — no existence
  // leak (checked before rendering, so the response is a real not-found).
  if (!clientIdSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const profile = await getClientForTrainer(supabase, user.id, id);
  if (!profile) notFound();

  const [
    notesRes,
    filesRes,
    habitsRes,
    schedule,
    checkinFormId,
    trainerDefaultWeekday,
    programsRes,
  ] = await Promise.all([
    listNotes(supabase, user.id, id),
    listFiles(supabase, user.id, id),
    listHabitsForTrainer(supabase, user.id, id),
    getClientSchedule(supabase, user.id, id),
    defaultCheckinFormId(supabase, user.id),
    getTrainerDefaultCheckinWeekday(supabase, user.id),
    listClientPrograms(supabase, user.id, id),
  ]);

  const initialTab =
    state === 'notes-files'
      ? 'notes'
      : state === 'habits'
        ? 'habits'
        : state === 'checkin'
          ? 'checkin'
          : state === 'program'
            ? 'program'
            : 'overview';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <ClientProfile
        profile={profile}
        trainerId={user.id}
        notes={notesRes.notes}
        files={filesRes.files}
        habits={habitsRes.items}
        checkinWeekday={schedule?.weekday ?? trainerDefaultWeekday}
        hasCheckinForm={checkinFormId !== null}
        programs={programsRes.items}
        initialTab={initialTab}
      />
    </div>
  );
}
