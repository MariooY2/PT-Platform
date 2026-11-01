'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { roleOf } from '@/lib/supabase/middleware';
import { parseExerciseForm } from './schemas';

export type CreateExerciseState =
  { ok: true; name: string } | { ok: false; error: string } | undefined;

/**
 * Create a custom exercise owned by the signed-in coach. `trainer_id` is taken from the session, never
 * the browser; RLS additionally rejects any other value (docs/security.md §6). Global exercises stay
 * read-only — only the seed (service role) writes `trainer_id = null` rows.
 */
export async function createExerciseAction(
  _prev: CreateExerciseState,
  formData: FormData,
): Promise<CreateExerciseState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Your session expired. Sign in and try again.' };
  if (roleOf(user) !== 'trainer') {
    return { ok: false, error: 'Only coaches can add exercises.' };
  }

  const parsed = parseExerciseForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }
  const v = parsed.data;

  const { error } = await supabase.from('exercises').insert({
    trainer_id: user.id, // from the session — never trusted from the client
    name: v.name,
    primary_muscle: v.primaryMuscle,
    secondary_muscles: v.secondaryMuscles,
    equipment: v.equipment ?? null,
    category: v.category,
    video_url: v.videoUrl || null,
    instructions: v.instructions || null,
  });

  if (error) {
    if (error.code === '23503') {
      return { ok: false, error: 'Finish setting up your coaching profile first.' };
    }
    return { ok: false, error: 'We couldn’t save this exercise. Try again.' };
  }

  revalidatePath('/coach/exercises');
  return { ok: true, name: v.name };
}
