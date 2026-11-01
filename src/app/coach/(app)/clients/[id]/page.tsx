import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ListSkeleton } from '@/components/shared/states';
import { createClient } from '@/lib/supabase/server';
import { clientIdSchema } from '@/features/clients/schemas';
import { getClientForTrainer, listFiles, listNotes } from '@/features/clients/queries';
import { ClientProfile } from '@/features/clients/components/client-profile';

export default async function CoachClientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  const [{ id }, { state }] = await Promise.all([params, searchParams]);
  const initialTab = state === 'notes-files' ? 'notes' : 'overview';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <ProfileData clientId={id} initialTab={initialTab} />
      </Suspense>
    </div>
  );
}

async function ProfileData({
  clientId,
  initialTab,
}: {
  clientId: string;
  initialTab: 'overview' | 'notes';
}) {
  // An unknown or malformed id, or a client this trainer is not linked to, is a 404 — no existence leak.
  if (!clientIdSchema.safeParse(clientId).success) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const profile = await getClientForTrainer(supabase, user.id, clientId);
  if (!profile) notFound();

  const [notesRes, filesRes] = await Promise.all([
    listNotes(supabase, user.id, clientId),
    listFiles(supabase, user.id, clientId),
  ]);

  return (
    <ClientProfile
      profile={profile}
      trainerId={user.id}
      notes={notesRes.notes}
      files={filesRes.files}
      initialTab={initialTab}
    />
  );
}
