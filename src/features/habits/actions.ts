'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { roleOf } from '@/lib/supabase/middleware';
import { habitIdSchema, habitInputSchema, type HabitInput } from './schemas';
import { todayFor } from './lib';

export type ActionResult = { ok: true } | { error: string };

const GENERIC_ERROR = 'Something went wrong. Try again.';
const NOT_FOUND = 'We couldn’t find that habit.';

/** Resolve the signed-in coach, or an error result. trainer_id always comes from the session. */
async function requireTrainer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || roleOf(user) !== 'trainer') {
    return { supabase: null, trainerId: null, error: 'You need to sign in as a coach.' } as const;
  }
  return { supabase, trainerId: user.id, error: null } as const;
}

/** Resolve the signed-in client, or an error result. client_id always comes from the session. */
async function requireClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || roleOf(user) !== 'client') {
    return { supabase: null, userId: null, error: 'You need to sign in as a client.' } as const;
  }
  return { supabase, userId: user.id, error: null } as const;
}

function revalidateHabits(clientId: string) {
  revalidatePath(`/coach/clients/${clientId}`);
  revalidatePath('/client');
}

/**
 * Tick (or untick) a habit for the client's own "today". Idempotent by design: ticking UPSERTs on the
 * unique (habit_id, log_date), so a double-tap or a re-tick after reload updates the existing row
 * instead of raising 23505. The log date is derived from the client's timezone on the server, and
 * client_id comes from the session — never from the browser. RLS (`owns_habit`) still rejects a habit
 * that is not this client's.
 */
export async function setHabitTickAction(habitId: string, done: boolean): Promise<ActionResult> {
  const id = habitIdSchema.safeParse(habitId);
  if (!id.success) return { error: NOT_FOUND };

  const { supabase, userId, error } = await requireClient();
  if (error) return { error };

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .maybeSingle();
  const today = todayFor(profile?.timezone);

  if (done) {
    const res = await supabase
      .from('habit_logs')
      .upsert(
        { habit_id: id.data, client_id: userId, log_date: today, value: 1 },
        { onConflict: 'habit_id,log_date' },
      );
    if (res.error) return { error: GENERIC_ERROR };
  } else {
    const res = await supabase
      .from('habit_logs')
      .delete()
      .eq('habit_id', id.data)
      .eq('client_id', userId)
      .eq('log_date', today);
    if (res.error) return { error: GENERIC_ERROR };
  }

  revalidatePath('/client');
  return { ok: true };
}

/** Create a habit for one of the coach's clients. trainer_id is the session; RLS verifies the link. */
export async function createHabitAction(
  clientId: string,
  input: HabitInput,
): Promise<ActionResult> {
  const cid = habitIdSchema.safeParse(clientId);
  if (!cid.success) return { error: 'We couldn’t find that client.' };
  const parsed = habitInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form.' };

  const { supabase, trainerId, error } = await requireTrainer();
  if (error) return { error };

  const res = await supabase
    .from('habits')
    .insert({
      trainer_id: trainerId,
      client_id: cid.data,
      name: parsed.data.name,
      target_value: parsed.data.target ?? null,
      unit: parsed.data.unit ?? null,
    })
    .select('id');
  if (res.error) {
    if (res.error.code === '42501' || res.error.code === '23503') {
      return { error: 'We couldn’t find that client.' };
    }
    return { error: GENERIC_ERROR };
  }

  revalidateHabits(cid.data);
  return { ok: true };
}

/** Edit a habit's name/target/unit, scoped to the session coach. */
export async function updateHabitAction(habitId: string, input: HabitInput): Promise<ActionResult> {
  const id = habitIdSchema.safeParse(habitId);
  if (!id.success) return { error: NOT_FOUND };
  const parsed = habitInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form.' };

  const { supabase, trainerId, error } = await requireTrainer();
  if (error) return { error };

  const res = await supabase
    .from('habits')
    .update({
      name: parsed.data.name,
      target_value: parsed.data.target ?? null,
      unit: parsed.data.unit ?? null,
    })
    .eq('id', id.data)
    .eq('trainer_id', trainerId)
    .select('client_id');
  if (res.error) return { error: GENERIC_ERROR };
  if (!res.data?.length) return { error: NOT_FOUND };

  revalidateHabits(res.data[0].client_id as string);
  return { ok: true };
}

/** Deactivate or reactivate a habit. Deactivating stops it appearing on the client's Today. */
export async function setHabitActiveAction(
  habitId: string,
  active: boolean,
): Promise<ActionResult> {
  const id = habitIdSchema.safeParse(habitId);
  if (!id.success) return { error: NOT_FOUND };

  const { supabase, trainerId, error } = await requireTrainer();
  if (error) return { error };

  const res = await supabase
    .from('habits')
    .update({ active })
    .eq('id', id.data)
    .eq('trainer_id', trainerId)
    .select('client_id');
  if (res.error) return { error: GENERIC_ERROR };
  if (!res.data?.length) return { error: NOT_FOUND };

  revalidateHabits(res.data[0].client_id as string);
  return { ok: true };
}
