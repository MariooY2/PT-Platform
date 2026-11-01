'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { roleOf } from '@/lib/supabase/middleware';
import {
  createFormSchema,
  questionSchema,
  saveFormSchema,
  validateAnswers,
  type Question,
} from './schemas';

export type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

const SESSION_EXPIRED = 'Your session expired. Sign in and try again.';
const COACH_ONLY = 'Only coaches can manage forms.';

/** A starter question so a brand-new form is immediately valid and the builder has something to show. */
const STARTER_QUESTIONS: Question[] = [
  { id: 'q1', type: 'text', label: 'New question', required: false },
];

/** Create a custom form owned by the signed-in coach. trainer_id comes from the session. */
export async function createFormAction(input: {
  title: string;
  kind: 'intake' | 'checkin';
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };
  if (roleOf(user) !== 'trainer') return { ok: false, error: COACH_ONLY };

  const parsed = createFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }

  const { data, error } = await supabase
    .from('forms')
    .insert({
      trainer_id: user.id,
      kind: parsed.data.kind,
      title: parsed.data.title,
      is_default: false,
      questions: STARTER_QUESTIONS,
    })
    .select('id')
    .single();

  if (error || !data) return { ok: false, error: 'We couldn’t create this form. Try again.' };

  revalidatePath('/coach/forms');
  return { ok: true, id: data.id };
}

/** Save a form's title and questions. Ownership is enforced by RLS and re-checked for a clean error. */
export async function saveFormAction(
  formId: string,
  input: { title: string; questions: unknown },
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };
  if (roleOf(user) !== 'trainer') return { ok: false, error: COACH_ONLY };

  const parsed = saveFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
  }

  const { data, error } = await supabase
    .from('forms')
    .update({ title: parsed.data.title, questions: parsed.data.questions })
    .eq('id', formId)
    .eq('trainer_id', user.id)
    .select('id');

  if (error) return { ok: false, error: 'We couldn’t save this form. Try again.' };
  if (!data || data.length === 0) return { ok: false, error: 'We couldn’t find that form.' };

  revalidatePath('/coach/forms');
  return { ok: true };
}

/** Delete a custom form. Default forms (intake / weekly check-in) can't be deleted. */
export async function deleteFormAction(formId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };
  if (roleOf(user) !== 'trainer') return { ok: false, error: COACH_ONLY };

  const { data, error } = await supabase
    .from('forms')
    .delete()
    .eq('id', formId)
    .eq('trainer_id', user.id)
    .eq('is_default', false)
    .select('id');

  if (error) return { ok: false, error: 'We couldn’t delete this form. Try again.' };
  if (!data || data.length === 0) {
    return { ok: false, error: 'Default forms can’t be deleted.' };
  }

  revalidatePath('/coach/forms');
  return { ok: true };
}

function parseStoredQuestions(raw: unknown): Question[] {
  const parsed = z.array(questionSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}

/** The client saves a partial (draft) response. Allowed only while unsubmitted (RLS). */
export async function saveAnswersAction(
  responseId: string,
  answers: Record<string, unknown>,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };

  const { data: resp, error: loadError } = await supabase
    .from('form_responses')
    .select('id, form:forms!form_responses_form_id_fkey(questions)')
    .eq('id', responseId)
    .eq('client_id', user.id)
    .maybeSingle();
  if (loadError || !resp) return { ok: false, error: 'We couldn’t find that check-in.' };

  const questions = parseStoredQuestions(resp.form?.questions);
  const result = validateAnswers(questions, answers, 'draft');
  if (!result.ok) return { ok: false, error: 'Check your answers and try again.' };

  const { data, error } = await supabase
    .from('form_responses')
    .update({ answers: result.value })
    .eq('id', responseId)
    .eq('client_id', user.id)
    .select('id');
  if (error || !data || data.length === 0) {
    return { ok: false, error: 'This check-in is already sent.' };
  }
  return { ok: true };
}

/** The client submits a response: validates every required answer, then locks it (submitted_at). */
export async function submitResponseAction(
  responseId: string,
  answers: Record<string, unknown>,
): Promise<ActionResult<{ kind: 'intake' | 'checkin' }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };

  const { data: resp, error: loadError } = await supabase
    .from('form_responses')
    .select('id, submitted_at, form:forms!form_responses_form_id_fkey(kind, questions)')
    .eq('id', responseId)
    .eq('client_id', user.id)
    .maybeSingle();
  if (loadError || !resp || !resp.form)
    return { ok: false, error: 'We couldn’t find that check-in.' };
  if (resp.submitted_at) return { ok: false, error: 'This check-in is already sent.' };

  const questions = parseStoredQuestions(resp.form.questions);
  const result = validateAnswers(questions, answers, 'submit');
  if (!result.ok) return { ok: false, error: 'Answer the required questions before sending.' };

  const { data, error } = await supabase
    .from('form_responses')
    .update({ answers: result.value, submitted_at: new Date().toISOString() })
    .eq('id', responseId)
    .eq('client_id', user.id)
    .select('id');
  if (error || !data || data.length === 0) {
    return { ok: false, error: 'This check-in is already sent.' };
  }

  const kind = resp.form.kind;
  if (kind === 'intake') revalidatePath('/client');
  revalidatePath(`/client/checkin/${responseId}`);
  revalidatePath('/client/checkins');
  return { ok: true, kind };
}

const replySchema = z
  .string()
  .trim()
  .min(1, 'Write a reply first.')
  .max(4000, 'Keep your reply under 4000 characters.');

/** The coach replies to a response, which marks it reviewed and drops it from the queue. */
export async function replyToResponseAction(
  responseId: string,
  reply: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SESSION_EXPIRED };
  if (roleOf(user) !== 'trainer') return { ok: false, error: 'Only coaches can reply.' };

  const parsed = replySchema.safeParse(reply);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Write a reply first.' };
  }

  const { data, error } = await supabase
    .from('form_responses')
    .update({ coach_reply: parsed.data, reviewed_at: new Date().toISOString() })
    .eq('id', responseId)
    .eq('trainer_id', user.id)
    .select('id');
  if (error) return { ok: false, error: 'We couldn’t send your reply. Try again.' };
  if (!data || data.length === 0) return { ok: false, error: 'We couldn’t find that check-in.' };

  revalidatePath('/coach/checkins');
  return { ok: true };
}
