import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import type { Database } from '../../src/lib/supabase/types';

const url = inject('supabaseUrl');
const anonKey = inject('supabaseAnonKey');
const serviceKey = inject('supabaseServiceKey');

const PASSWORD = 'Password123!';
const TRAINER_A = '11111111-0000-0000-0000-000000000001';
const CLIENT_1 = '33333333-0000-0000-0000-000000000001'; // Trainer A's client
const CLIENT_2 = '44444444-0000-0000-0000-000000000001'; // Trainer B's client

type DB = SupabaseClient<Database>;
const anon = (): DB =>
  createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const admin: DB = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function signIn(email: string): Promise<DB> {
  const c = anon();
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return c;
}

let trainerA: DB, trainerB: DB, client1: DB, client2: DB;
let intakeFormId: string;
const responseIds: string[] = [];

beforeAll(async () => {
  trainerA = await signIn('trainer.a@ptplatform.test');
  trainerB = await signIn('trainer.b@ptplatform.test');
  client1 = await signIn('client.one@ptplatform.test');
  client2 = await signIn('client.two@ptplatform.test');
  const f = await admin
    .from('forms')
    .select('id')
    .eq('trainer_id', TRAINER_A)
    .eq('kind', 'intake')
    .eq('is_default', true)
    .single();
  intakeFormId = f.data!.id;
});
afterAll(async () => {
  if (responseIds.length) await admin.from('form_responses').delete().in('id', responseIds);
});

describe('default forms', () => {
  it('every seeded trainer has a default intake + weekly check-in (trigger)', async () => {
    const res = await admin
      .from('forms')
      .select('trainer_id, kind, is_default')
      .eq('is_default', true);
    expect(res.error).toBeNull();
    for (const t of [
      TRAINER_A,
      '22222222-0000-0000-0000-000000000001',
      '55555555-0000-0000-0000-000000000001',
    ]) {
      const kinds = (res.data ?? [])
        .filter((f) => f.trainer_id === t)
        .map((f) => f.kind)
        .sort();
      expect(kinds, t).toEqual(['checkin', 'intake']);
    }
  });
});

describe('forms RLS', () => {
  it('a client reads their trainer’s forms but not another trainer’s', async () => {
    const own = await client1.from('forms').select('id').eq('trainer_id', TRAINER_A);
    expect(own.error).toBeNull();
    expect((own.data?.length ?? 0) >= 2).toBe(true);

    const other = await client2.from('forms').select('id').eq('trainer_id', TRAINER_A);
    expect(other.error).toBeNull();
    expect(other.data).toEqual([]);
  });

  it('a trainer cannot read another trainer’s forms', async () => {
    const res = await trainerB.from('forms').select('id').eq('trainer_id', TRAINER_A);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });
});

describe('form_responses — client fills, submit locks, coach fields guarded', () => {
  it('the client creates an unsubmitted response for their trainer’s intake', async () => {
    const res = await client1
      .from('form_responses')
      .insert({ form_id: intakeFormId, trainer_id: TRAINER_A, client_id: CLIENT_1, answers: {} })
      .select();
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    if (res.data?.[0]?.id) responseIds.push(res.data[0].id);
  });

  it('a different client cannot create a response for that trainer (is_client_of → 42501)', async () => {
    const res = await client2
      .from('form_responses')
      .insert({ form_id: intakeFormId, trainer_id: TRAINER_A, client_id: CLIENT_2, answers: {} });
    expect(res.error?.code).toBe('42501');
  });

  it('the client can edit answers while unsubmitted but cannot set coach_reply (guard preserves it)', async () => {
    const res = await client1
      .from('form_responses')
      .update({ answers: { goals: 'get strong' }, coach_reply: 'faked by client' })
      .eq('id', responseIds[0])
      .select();
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    const check = await admin
      .from('form_responses')
      .select('answers, coach_reply')
      .eq('id', responseIds[0])
      .single();
    expect((check.data?.answers as Record<string, unknown>).goals).toBe('get strong');
    expect(check.data?.coach_reply).toBeNull(); // guard kept the client out of the coach field
  });

  it('after submit the client can no longer update the response (submitted_at lock)', async () => {
    const submit = await client1
      .from('form_responses')
      .update({ submitted_at: new Date().toISOString() })
      .eq('id', responseIds[0])
      .select();
    expect(submit.error).toBeNull();
    expect(submit.data).toHaveLength(1);

    const again = await client1
      .from('form_responses')
      .update({ answers: { goals: 'changed after submit' } })
      .eq('id', responseIds[0])
      .select();
    expect(again.error).toBeNull();
    expect(again.data).toEqual([]); // using (submitted_at is null) now blocks it
  });

  it('the trainer reads the response and replies; another trainer cannot read it', async () => {
    const reply = await trainerA
      .from('form_responses')
      .update({ coach_reply: 'nice work', reviewed_at: new Date().toISOString() })
      .eq('id', responseIds[0])
      .select();
    expect(reply.error).toBeNull();
    expect(reply.data).toHaveLength(1);

    const other = await trainerB.from('form_responses').select('id').eq('id', responseIds[0]);
    expect(other.error).toBeNull();
    expect(other.data).toEqual([]);
  });
});
