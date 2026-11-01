'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { roleOf } from '@/lib/supabase/middleware';
import {
  clientIdSchema,
  detailsSchema,
  noteSchema,
  registerFileSchema,
  statusChangeSchema,
  type DetailsInput,
} from './schemas';

export type ActionResult = { ok: true } | { error: string };

const GENERIC_ERROR = 'Something went wrong. Try again.';

/** Resolve the signed-in trainer, or an error result. trainer_id always comes from the session. */
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

function revalidateClient(clientId: string) {
  revalidatePath('/coach/clients');
  revalidatePath(`/coach/clients/${clientId}`);
}

export async function setClientStatusAction(
  clientId: string,
  status: string,
): Promise<ActionResult> {
  const id = clientIdSchema.safeParse(clientId);
  const next = statusChangeSchema.safeParse(status);
  if (!id.success || !next.success) return { error: 'That status change is not allowed.' };

  const { supabase, trainerId, error } = await requireTrainer();
  if (error) return { error };

  const res = await supabase
    .from('trainer_clients')
    .update({ status: next.data })
    .eq('trainer_id', trainerId)
    .eq('client_id', id.data)
    .select('client_id');
  if (res.error) return { error: GENERIC_ERROR };
  if (!res.data?.length) return { error: 'We couldn’t find that client.' };

  revalidateClient(id.data);
  return { ok: true };
}

export async function saveClientDetailsAction(
  clientId: string,
  input: DetailsInput,
): Promise<ActionResult> {
  const id = clientIdSchema.safeParse(clientId);
  if (!id.success) return { error: 'We couldn’t find that client.' };
  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form.' };

  const { supabase, trainerId, error } = await requireTrainer();
  if (error) return { error };

  const res = await supabase
    .from('trainer_clients')
    .update({
      goals: parsed.data.goals || null,
      injuries_notes: parsed.data.injuries || null,
      tags: parsed.data.tags,
    })
    .eq('trainer_id', trainerId)
    .eq('client_id', id.data)
    .select('client_id');
  if (res.error) return { error: GENERIC_ERROR };
  if (!res.data?.length) return { error: 'We couldn’t find that client.' };

  revalidateClient(id.data);
  return { ok: true };
}

export async function addNoteAction(clientId: string, body: string): Promise<ActionResult> {
  const id = clientIdSchema.safeParse(clientId);
  if (!id.success) return { error: 'We couldn’t find that client.' };
  const parsed = noteSchema.safeParse({ body });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Write a note first.' };

  const { supabase, trainerId, error } = await requireTrainer();
  if (error) return { error };

  const res = await supabase
    .from('client_notes')
    .insert({ trainer_id: trainerId, client_id: id.data, body: parsed.data.body });
  if (res.error) return { error: GENERIC_ERROR };

  revalidateClient(id.data);
  return { ok: true };
}

/**
 * The file bytes are uploaded from the browser straight to the private bucket (RLS enforces the
 * trainer/client prefix). This records the metadata row after re-deriving and verifying the prefix
 * from the session — the client never dictates the linkage.
 */
export async function registerClientFileAction(
  clientId: string,
  fileName: string,
  storagePath: string,
): Promise<ActionResult> {
  const id = clientIdSchema.safeParse(clientId);
  if (!id.success) return { error: 'We couldn’t find that client.' };
  const parsed = registerFileSchema.safeParse({ fileName, storagePath });
  if (!parsed.success) return { error: 'That file could not be saved.' };

  const { supabase, trainerId, error } = await requireTrainer();
  if (error) return { error };

  const expectedPrefix = `${trainerId}/${id.data}/`;
  if (!parsed.data.storagePath.startsWith(expectedPrefix)) {
    return { error: 'That file could not be saved.' };
  }

  const res = await supabase.from('client_files').insert({
    trainer_id: trainerId,
    client_id: id.data,
    file_name: parsed.data.fileName,
    storage_path: parsed.data.storagePath,
  });
  if (res.error) return { error: GENERIC_ERROR };

  revalidateClient(id.data);
  return { ok: true };
}
