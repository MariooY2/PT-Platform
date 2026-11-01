import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadProgram } from '@/features/programs/queries';
import { ProgramBuilder } from '@/features/programs/components/program-builder';

export const instant = false;

export default async function ProgramBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  // Force dynamic before the Supabase session read (Next 16 cacheComponents, L-002).
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const program = await loadProgram(supabase, id);
  if (!program) notFound();

  // Exercises for the picker: the global library + this coach's own (RLS scopes it).
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, primary_muscle')
    .eq('is_archived', false)
    .order('name');

  return <ProgramBuilder program={program} exercises={exercises ?? []} />;
}
