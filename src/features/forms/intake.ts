import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

type DB = SupabaseClient<Database>;

/**
 * Decide the intake gate for a signed-in client (called from src/app/client/(app)/layout.tsx).
 *
 * A new client must complete their trainer's default intake before using the app. We find the
 * client's trainer, that trainer's default intake form, and the client's response to it:
 *  - a submitted response  → let them through (returns null);
 *  - an unsubmitted one    → send them to it;
 *  - none yet              → create one (client-insert policy) and send them to it.
 *
 * Every failure path returns null (fail open to Today) so a DB hiccup never locks a client out.
 * Querying existing responses oldest-first keeps the result deterministic if two requests race.
 */
export async function resolveIntakeGate(
  supabase: DB,
  userId: string,
): Promise<{ redirectTo: string | null }> {
  const { data: links, error: linkError } = await supabase
    .from('trainer_clients')
    .select('trainer_id, status')
    .eq('client_id', userId);
  if (linkError || !links || links.length === 0) return { redirectTo: null };

  const link = links.find((l) => l.status === 'active') ?? links[0];

  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('id')
    .eq('trainer_id', link.trainer_id)
    .eq('kind', 'intake')
    .eq('is_default', true)
    .maybeSingle();
  if (formError || !form) return { redirectTo: null };

  const { data: responses, error: respError } = await supabase
    .from('form_responses')
    .select('id, submitted_at')
    .eq('form_id', form.id)
    .eq('client_id', userId)
    .order('created_at', { ascending: true });
  if (respError) return { redirectTo: null };

  if ((responses ?? []).some((r) => r.submitted_at)) return { redirectTo: null };

  const pending = (responses ?? []).find((r) => !r.submitted_at);
  if (pending) return { redirectTo: `/client/checkin/${pending.id}` };

  const { data: created, error: insertError } = await supabase
    .from('form_responses')
    .insert({ form_id: form.id, trainer_id: link.trainer_id, client_id: userId, answers: {} })
    .select('id')
    .single();
  if (insertError || !created) return { redirectTo: null };

  return { redirectTo: `/client/checkin/${created.id}` };
}
