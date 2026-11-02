import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ErrorState } from '@/components/shared/states';
import { PageHeader } from '@/components/shared/page-header';
import { listPrograms } from '@/features/programs/queries';
import { ProgramsList } from '@/features/programs/components/programs-list';

export const instant = false;

export default async function CoachProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  // Reads the session; force dynamic before the Supabase read (Next 16 cacheComponents, L-002).
  await connection();
  const { state } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <PageHeader title="Programs" />
        <ErrorState description="Sign in again to see your programs." />
      </div>
    );
  }

  const { items, error } = await listPrograms(supabase, user.id);
  if (error || !items) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <PageHeader title="Programs" />
        <ErrorState description="We couldn’t load your programs." />
      </div>
    );
  }

  return <ProgramsList items={items} initialState={state} />;
}
