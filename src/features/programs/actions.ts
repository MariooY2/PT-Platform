'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { roleOf } from '@/lib/supabase/middleware';
import type { Database } from '@/lib/supabase/types';
import { parseNewProgram } from './schemas';

export type ActionResult = { ok: true; id?: string } | { error: string };

const GENERIC = 'Something went wrong. Try again.';

type TrainerCtx =
  | { ok: false; error: string }
  | { ok: true; supabase: SupabaseClient<Database>; trainerId: string };

async function requireTrainer(): Promise<TrainerCtx> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || roleOf(user) !== 'trainer')
    return { ok: false, error: 'Sign in as a coach to do that.' };
  return { ok: true, supabase, trainerId: user.id };
}

/** Create a blank template program owned by the session trainer. */
export async function createProgramAction(formData: FormData): Promise<ActionResult> {
  const parsed = parseNewProgram(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the program details.' };
  }
  const auth = await requireTrainer();
  if (!auth.ok) return { error: auth.error };

  const { data, error } = await auth.supabase
    .from('programs')
    .insert({
      trainer_id: auth.trainerId,
      title: parsed.data.title,
      weeks: parsed.data.weeks,
      is_template: true,
      status: 'draft',
    })
    .select('id')
    .single();
  if (error || !data) return { error: GENERIC };

  revalidatePath('/coach/programs');
  return { ok: true, id: data.id };
}
