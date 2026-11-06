'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/lib/supabase/types';
import { createClient } from '@/lib/supabase/server';
import { roleOf } from '@/lib/supabase/middleware';
import { todayFor } from '@/features/habits/lib';
import {
  logBodyMetricSchema,
  photoIdSchema,
  registerPhotoSchema,
  type LogBodyMetricInput,
  type RegisterPhotoInput,
} from './schemas';

export type ActionResult = { ok: true } | { error: string };

const GENERIC_ERROR = 'Something went wrong. Try again.';
const NO_COACH = 'You’re not connected to a coach yet.';
const PROGRESS_PATH = '/client/progress';
export const PROGRESS_BUCKET = 'progress-photos';
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB

type DB = SupabaseClient<Database>;

/**
 * Public Supabase config for the browser storage upload. NEXT_PUBLIC_* are inlined at build time, but
 * the verify/e2e build runs without them (they are injected into the server at runtime), so a browser
 * client built from process.env would be empty. Reading them here (server, at runtime) makes the
 * upload work from a single build in every environment. Both values are public (the anon key).
 */
export async function publicSupabaseConfig(): Promise<{ url: string; anonKey: string }> {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  };
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

/**
 * The client's trainer, pinned from their trainer_clients link (never the browser), so a new row's
 * trainer_id satisfies the table's with-check (`is_client_of(trainer_id)`). Prefers an active/paused
 * link, newest first. Clients normally have exactly one coach.
 */
async function resolveTrainerId(supabase: DB, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('trainer_clients')
    .select('trainer_id, status, created_at')
    .eq('client_id', userId)
    .order('created_at', { ascending: false });
  if (!data?.length) return null;
  const active = data.find((r) => r.status === 'active' || r.status === 'paused');
  return (active ?? data[0]).trainer_id;
}

async function todayForUser(supabase: DB, userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .maybeSingle();
  return todayFor(profile?.timezone);
}

/**
 * Log one body-metric entry for the signed-in client. Zod-validated; client_id and trainer_id come
 * from the session and the trainer link, never the browser. measured_on defaults to the client's today.
 */
export async function logBodyMetricAction(input: LogBodyMetricInput): Promise<ActionResult> {
  const parsed = logBodyMetricSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form.' };

  const { supabase, userId, error } = await requireClient();
  if (error) return { error };

  const trainerId = await resolveTrainerId(supabase, userId);
  if (!trainerId) return { error: NO_COACH };

  const d = parsed.data;
  const measuredOn = d.measuredOn ?? (await todayForUser(supabase, userId));

  const res = await supabase.from('body_metrics').insert({
    trainer_id: trainerId,
    client_id: userId,
    measured_on: measuredOn,
    weight_kg: d.weightKg ?? null,
    body_fat_pct: d.bodyFatPct ?? null,
    waist_cm: d.waistCm ?? null,
    hips_cm: d.hipsCm ?? null,
    chest_cm: d.chestCm ?? null,
    arm_cm: d.armCm ?? null,
    thigh_cm: d.thighCm ?? null,
    notes: d.notes?.length ? d.notes : null,
  });
  if (res.error) return { error: GENERIC_ERROR };

  revalidatePath(PROGRESS_PATH);
  return { ok: true };
}

/**
 * Record a progress photo whose bytes the browser already uploaded to the private bucket under the
 * client's own folder (RLS enforces the prefix on write). This re-derives the prefix from the session,
 * verifies the uploaded object is an image within the size cap (authoritative server-side check, from
 * storage metadata), and only then stores the row with a pinned trainer_id. A failed check removes the
 * orphaned object. The bucket is private; photos are served via signed URLs, never a public URL.
 */
export async function registerProgressPhotoAction(
  input: RegisterPhotoInput,
): Promise<ActionResult> {
  const parsed = registerPhotoSchema.safeParse(input);
  if (!parsed.success) return { error: 'That photo could not be saved.' };

  const { supabase, userId, error } = await requireClient();
  if (error) return { error };

  const { pose, storagePath } = parsed.data;
  const folder = `${userId}/${pose}`;
  if (!storagePath.startsWith(`${folder}/`)) return { error: 'That photo could not be saved.' };

  const trainerId = await resolveTrainerId(supabase, userId);
  if (!trainerId) return { error: NO_COACH };

  // Authoritative server-side validation: list the uploaded object and read its storage metadata.
  const fileName = storagePath.slice(folder.length + 1);
  const { data: listed } = await supabase.storage
    .from(PROGRESS_BUCKET)
    .list(folder, { search: fileName, limit: 1 });
  const obj = listed?.find((o) => o.name === fileName);
  const size = obj?.metadata?.size as number | undefined;
  const mimetype = obj?.metadata?.mimetype as string | undefined;
  if (
    !obj ||
    typeof size !== 'number' ||
    size > MAX_PHOTO_BYTES ||
    !mimetype ||
    !mimetype.startsWith('image/')
  ) {
    await supabase.storage.from(PROGRESS_BUCKET).remove([storagePath]);
    return { error: 'Upload an image under 10 MB.' };
  }

  const takenOn = parsed.data.takenOn ?? (await todayForUser(supabase, userId));
  const res = await supabase.from('progress_photos').insert({
    trainer_id: trainerId,
    client_id: userId,
    pose,
    taken_on: takenOn,
    storage_path: storagePath,
  });
  if (res.error) {
    await supabase.storage.from(PROGRESS_BUCKET).remove([storagePath]);
    return { error: GENERIC_ERROR };
  }

  revalidatePath(PROGRESS_PATH);
  return { ok: true };
}

/** Delete one of the client's own photos (row + the stored object). Reversible-feeling via the UI undo. */
export async function deleteProgressPhotoAction(id: string): Promise<ActionResult> {
  const parsed = photoIdSchema.safeParse(id);
  if (!parsed.success) return { error: 'We couldn’t find that photo.' };

  const { supabase, userId, error } = await requireClient();
  if (error) return { error };

  const { data: row } = await supabase
    .from('progress_photos')
    .select('storage_path')
    .eq('id', parsed.data)
    .eq('client_id', userId)
    .maybeSingle();
  if (!row) return { error: 'We couldn’t find that photo.' };

  await supabase.storage.from(PROGRESS_BUCKET).remove([row.storage_path]);
  const res = await supabase
    .from('progress_photos')
    .delete()
    .eq('id', parsed.data)
    .eq('client_id', userId);
  if (res.error) return { error: GENERIC_ERROR };

  revalidatePath(PROGRESS_PATH);
  return { ok: true };
}
