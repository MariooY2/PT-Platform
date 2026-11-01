'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { HOME_FOR, roleOf } from '@/lib/supabase/middleware';
import { acceptInviteSchema, signInSchema, signUpSchema, slugSchema } from './schemas';

export type FormState = { error?: string; values?: Record<string, string> } | undefined;

const emailSchema = z.string().email('Enter a valid email.');

// Only same-origin absolute paths are a safe redirect target (no //host, no scheme, no backslash).
function safeNext(raw: unknown): string | null {
  const next = typeof raw === 'string' ? raw : '';
  if (
    next.startsWith('/') &&
    !next.startsWith('//') &&
    !next.includes('\\') &&
    !next.includes('://')
  ) {
    return next;
  }
  return null;
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '');
  const parsed = signInSchema.safeParse({ email, password: formData.get('password') });
  if (!parsed.success) return { error: 'Email or password is wrong.', values: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: 'Email or password is wrong.', values: { email } };

  const next = safeNext(formData.get('next'));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = roleOf(user);
  redirect(next ?? (role ? HOME_FOR[role] : '/'));
}

export async function signUpCoachAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const fullName = String(formData.get('fullName') ?? '');
  const email = String(formData.get('email') ?? '');
  const parsed = signUpSchema.safeParse({ fullName, email, password: formData.get('password') });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Check the form.',
      values: { fullName, email },
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
    app_metadata: { role: 'trainer' },
  });
  if (error || !data.user) {
    return {
      error: 'We couldn’t create your account. That email may already be in use.',
      values: { fullName, email },
    };
  }
  // Role is server-set here (service key), never from a client field. The trigger may default the
  // profile to 'client' (app_metadata lands after the row insert), so set it explicitly.
  await admin
    .from('profiles')
    .update({ role: 'trainer', full_name: parsed.data.fullName })
    .eq('id', data.user.id);

  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signInErr) redirect('/login');
  redirect('/coach/onboarding');
}

export async function acceptInviteAction(
  token: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const fullName = String(formData.get('fullName') ?? '');
  const parsed = acceptInviteSchema.safeParse({ fullName, password: formData.get('password') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form.', values: { fullName } };
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: invite } = await admin
    .from('trainer_clients')
    .select('invite_email, client_id, status, invite_expires_at')
    .eq('invite_token', token)
    .maybeSingle();

  if (
    !invite ||
    invite.client_id ||
    invite.status !== 'invited' ||
    !invite.invite_email ||
    !invite.invite_expires_at ||
    invite.invite_expires_at < nowIso
  ) {
    return { error: 'This invite is no longer valid. Ask your coach for a new link.' };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: invite.invite_email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
    app_metadata: { role: 'client' },
  });
  if (error || !data.user) {
    return {
      error: 'We couldn’t create your account. You may already have one — try signing in.',
      values: { fullName },
    };
  }
  await admin
    .from('profiles')
    .update({ role: 'client', full_name: parsed.data.fullName })
    .eq('id', data.user.id);

  // Consume the invite once: only succeeds if still unused and unexpired. Null the token so it can't reuse.
  const { data: linked } = await admin
    .from('trainer_clients')
    .update({ client_id: data.user.id, status: 'active', invite_token: null, start_date: nowIso })
    .eq('invite_token', token)
    .is('client_id', null)
    .gt('invite_expires_at', nowIso)
    .select('id');

  if (!linked || linked.length !== 1) {
    await admin.auth.admin.deleteUser(data.user.id); // roll back the orphaned user
    return { error: 'This invite is no longer valid. Ask your coach for a new link.' };
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({
    email: invite.invite_email,
    password: parsed.data.password,
  });
  redirect('/client');
}

export async function checkSlugAction(
  raw: string,
): Promise<{ available: boolean; message?: string; suggestion?: string }> {
  const parsed = slugSchema.safeParse(raw);
  if (!parsed.success) return { available: false, message: parsed.error.issues[0]?.message };

  const admin = createAdminClient();
  const { data } = await admin.from('trainers').select('id').eq('slug', parsed.data).maybeSingle();
  if (!data) return { available: true };

  for (let i = 2; i < 12; i++) {
    const candidate = `${parsed.data}-${i}`;
    const { data: taken } = await admin
      .from('trainers')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!taken)
      return { available: false, message: 'That address is taken.', suggestion: candidate };
  }
  return { available: false, message: 'That address is taken.' };
}

export async function requestMagicLinkAction(
  _prev: FormState,
  formData: FormData,
): Promise<{ error?: string; sent?: boolean } | undefined> {
  const parsed = emailSchema.safeParse(formData.get('email'));
  if (!parsed.success) return { error: 'Enter a valid email.' };
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({ email: parsed.data, options: { shouldCreateUser: false } });
  return { sent: true }; // never reveal whether an account exists
}

export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<{ error?: string; sent?: boolean } | undefined> {
  const parsed = emailSchema.safeParse(formData.get('email'));
  if (!parsed.success) return { error: 'Enter a valid email.' };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data);
  return { sent: true };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
