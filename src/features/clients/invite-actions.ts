'use server';

import { revalidatePath } from 'next/cache';
import { getEmailProvider, renderInviteEmail } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';
import { roleOf } from '@/lib/supabase/middleware';
import { inviteEmailSchema, parseInviteCsv, type InvalidInviteRow } from './invite-schemas';

const GENERIC_ERROR = 'Something went wrong. Try again.';

export interface CreateInviteSuccess {
  ok: true;
  /** The normalized email the invite is bound to. */
  email: string;
  /** The unique token; the browser builds the share link `${origin}/invite/${token}` from it. */
  token: string;
  /** Whether an email was actually sent (always false for the copy-link tab). */
  emailed: boolean;
}

export type CreateInviteResult = CreateInviteSuccess | { error: string };

export interface ImportSummary {
  ok: true;
  created: number;
  /** Emails already invited/linked for this coach, skipped without error. */
  skippedExisting: number;
  /** Repeated emails within the uploaded file. */
  duplicatesInFile: number;
  invalid: InvalidInviteRow[];
  total: number;
}

export type ImportResult = ImportSummary | { error: string };

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

function inviteUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  return `${base}/invite/${token}`;
}

/**
 * Create one invite row for the coach. The row is written through the session client, so RLS pins
 * `trainer_id = auth.uid()` and the column grants (D-010/D-014) make it impossible to set `client_id`
 * from here — the link stays an 'invited' row until the client accepts. `invite_expires_at` is left
 * for the DB default (see NEEDS-SCHEMA in the task hand-back). When `mode` is 'email', the invite is
 * also sent through the email provider (the mock logs it locally).
 */
export async function createInviteAction(
  rawEmail: string,
  mode: 'link' | 'email',
): Promise<CreateInviteResult> {
  const parsed = inviteEmailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Enter a valid email address.' };
  }
  const email = parsed.data;

  const { supabase, trainerId, error } = await requireTrainer();
  if (error) return { error };

  // Specific, non-crashing message for a repeat invite (no unique constraint on invite_email).
  const existing = await supabase
    .from('trainer_clients')
    .select('id')
    .eq('trainer_id', trainerId)
    .eq('invite_email', email)
    .limit(1);
  if (existing.error) return { error: GENERIC_ERROR };
  if (existing.data.length > 0) {
    return { error: `${email} is already on your client list.` };
  }

  const token = crypto.randomUUID();
  const insert = await supabase
    .from('trainer_clients')
    .insert({
      trainer_id: trainerId,
      invite_email: email,
      invite_token: token,
      status: 'invited',
      source: 'invite',
    })
    .select('invite_token')
    .single();
  if (insert.error || !insert.data) return { error: GENERIC_ERROR };

  let emailed = false;
  if (mode === 'email') {
    emailed = await sendInviteEmail(supabase, trainerId, email, token);
  }

  revalidatePath('/coach/clients');
  return { ok: true, email, token: insert.data.invite_token ?? token, emailed };
}

/**
 * Import a CSV of client emails. Parsing is server-side (papaparse, Zod per row, a row cap). Every
 * created row is 'invited'/source 'import' with its own token; `client_id` is never set. Invalid rows
 * are reported by line; emails already on the coach's list are skipped (not errors). No email is sent
 * on import (bulk messaging is out of scope).
 */
export async function importClientsCsvAction(csvText: string): Promise<ImportResult> {
  const { supabase, trainerId, error } = await requireTrainer();
  if (error) return { error };

  const outcome = parseInviteCsv(csvText);
  if (!outcome.ok) return { error: outcome.error };
  const { valid, invalid, duplicatesInFile, total } = outcome.parsed;

  if (valid.length === 0) {
    return { ok: true, created: 0, skippedExisting: 0, duplicatesInFile, invalid, total };
  }

  const emails = valid.map((r) => r.email);
  const existing = await supabase
    .from('trainer_clients')
    .select('invite_email')
    .eq('trainer_id', trainerId)
    .in('invite_email', emails);
  if (existing.error) return { error: GENERIC_ERROR };

  const already = new Set(
    (existing.data ?? []).map((r) => r.invite_email).filter((e): e is string => Boolean(e)),
  );
  const toInsert = valid.filter((r) => !already.has(r.email));

  if (toInsert.length > 0) {
    const rows = toInsert.map((r) => ({
      trainer_id: trainerId,
      invite_email: r.email,
      invite_token: crypto.randomUUID(),
      goals: r.goals || null,
      status: 'invited' as const,
      source: 'import' as const,
    }));
    const insert = await supabase.from('trainer_clients').insert(rows);
    if (insert.error) return { error: GENERIC_ERROR };
  }

  revalidatePath('/coach/clients');
  return {
    ok: true,
    created: toInsert.length,
    skippedExisting: valid.length - toInsert.length,
    duplicatesInFile,
    invalid,
    total,
  };
}

type SessionClient = NonNullable<Awaited<ReturnType<typeof requireTrainer>>['supabase']>;

async function sendInviteEmail(
  supabase: SessionClient,
  trainerId: string,
  email: string,
  token: string,
): Promise<boolean> {
  const { data: trainer } = await supabase
    .from('trainers')
    .select('business_name')
    .eq('id', trainerId)
    .maybeSingle();
  const coachName = trainer?.business_name?.trim() || 'Your coach';

  const message = await renderInviteEmail({ coachName, inviteUrl: inviteUrl(token) });
  const result = await getEmailProvider().send({ to: email, ...message });
  return result.ok;
}
