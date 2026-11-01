import 'server-only';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { questionSchema, type Question } from './schemas';

type DB = SupabaseClient<Database>;

export interface FormRow {
  id: string;
  kind: 'intake' | 'checkin';
  title: string;
  isDefault: boolean;
  questions: Question[];
}

export interface QueueItem {
  id: string;
  clientId: string;
  clientName: string | null;
  formTitle: string;
  formKind: 'intake' | 'checkin';
  submittedAt: string;
  questions: Question[];
  answers: Record<string, unknown>;
}

export interface ClientResponse {
  id: string;
  formTitle: string;
  formKind: 'intake' | 'checkin';
  questions: Question[];
  answers: Record<string, unknown>;
  submittedAt: string | null;
  coachReply: string | null;
}

const questionsArray = z.array(questionSchema);

/** Stored questions are trusted (written through our schema) but parse defensively anyway. */
function toQuestions(raw: unknown): Question[] {
  const parsed = questionsArray.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

/** Every form the coach owns: the two defaults first, then custom forms by title. */
export async function listForms(
  supabase: DB,
  trainerId: string,
): Promise<{ forms: FormRow[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('forms')
    .select('id, kind, title, is_default, questions')
    .eq('trainer_id', trainerId)
    .order('is_default', { ascending: false })
    .order('title', { ascending: true });
  if (error) return { forms: null, error: error.message };

  const forms: FormRow[] = (data ?? []).map((f) => ({
    id: f.id,
    kind: f.kind,
    title: f.title,
    isDefault: f.is_default,
    questions: toQuestions(f.questions),
  }));
  return { forms, error: null };
}

/** One of the client's own responses, with its form. Returns null when it isn't theirs (→ not-found). */
export async function getResponseForClient(
  supabase: DB,
  clientId: string,
  responseId: string,
): Promise<ClientResponse | null> {
  const { data, error } = await supabase
    .from('form_responses')
    .select(
      'id, answers, submitted_at, coach_reply, form:forms!form_responses_form_id_fkey(title, kind, questions)',
    )
    .eq('id', responseId)
    .eq('client_id', clientId)
    .maybeSingle();
  if (error || !data || !data.form) return null;

  return {
    id: data.id,
    formTitle: data.form.title,
    formKind: data.form.kind,
    questions: toQuestions(data.form.questions),
    answers: (data.answers ?? {}) as Record<string, unknown>,
    submittedAt: data.submitted_at ?? null,
    coachReply: data.coach_reply ?? null,
  };
}

/** The review queue: submitted, not-yet-reviewed responses, oldest first. */
export async function listReviewQueue(
  supabase: DB,
  trainerId: string,
): Promise<{ items: QueueItem[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('form_responses')
    .select(
      'id, client_id, submitted_at, answers, form:forms!form_responses_form_id_fkey(title, kind, questions), profile:profiles!form_responses_client_id_fkey(full_name)',
    )
    .eq('trainer_id', trainerId)
    .not('submitted_at', 'is', null)
    .is('reviewed_at', null)
    .order('submitted_at', { ascending: true });
  if (error) return { items: null, error: error.message };

  const items: QueueItem[] = (data ?? [])
    .filter((r) => r.form && r.submitted_at)
    .map((r) => ({
      id: r.id,
      clientId: r.client_id,
      clientName: r.profile?.full_name ?? null,
      formTitle: r.form!.title,
      formKind: r.form!.kind,
      submittedAt: r.submitted_at as string,
      questions: toQuestions(r.form!.questions),
      answers: (r.answers ?? {}) as Record<string, unknown>,
    }));
  return { items, error: null };
}
