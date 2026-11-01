'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { HOME_FOR, roleOf } from '@/lib/supabase/middleware';
import { acceptInviteSchema, signInSchema, signUpSchema, slugSchema } from './schemas';

export type FormState = { error?: string } | undefined;

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: 'Email or password is wrong.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: 'Email or password is wrong.' };

  const next = String(formData.get('next') ?? '');
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = roleOf(user);
  redirect(next && next.startsWith('/') ? next : role ? HOME_FOR[role] : '/');
}

export async function signUpCoachAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form.' };
  const { fullName, email, password } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role: 'trainer' },
  });
  if (error || !data.user) {
    return { error: 'We couldn’t create your account. That email may already be in use.' };
  }
  // Role is server-set here (service key) — never from a client field. The trigger may have defaulted
  // the profile to 'client' (app_metadata lands after the row insert), so set it explicitly.
  await admin
    .from('profiles')
    .update({ role: 'trainer', full_name: fullName })
    .eq('id', data.user.id);

  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) redirect('/login');
  redirect('/coach/onboarding');
}

export async function acceptInviteAction(
  token: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = acceptInviteSchema.safeParse({
    fullName: formData.get('fullName'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form.' };
  const { fullName, password } = parsed.data;

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
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role: 'client' },
  });
  if (error || !data.user) {
    return { error: 'We couldn’t create your account. You may already have one — try signing in.' };
  }
  await admin
    .from('profiles')
    .update({ role: 'client', full_name: fullName })
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
  await supabase.auth.signInWithPassword({ email: invite.invite_email, password });
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

  // Suggest a free alternative.
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
  const email = String(formData.get('email') ?? '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email.' };
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  // Always report success — never reveal whether an account exists.
  return { sent: true };
}

export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<{ error?: string; sent?: boolean } | undefined> {
  const email = String(formData.get('email') ?? '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter a valid email.' };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email);
  return { sent: true };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
