import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import type { Database } from '../../src/lib/supabase/types';

const url = inject('supabaseUrl');
const anonKey = inject('supabaseAnonKey');
const serviceKey = inject('supabaseServiceKey');

const PASSWORD = 'Password123!';
const TRAINER_A = '11111111-0000-0000-0000-000000000001';
const TRAINER_B = '22222222-0000-0000-0000-000000000001';
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
const habitIds: string[] = [];

beforeAll(async () => {
  trainerA = await signIn('trainer.a@ptplatform.test');
  trainerB = await signIn('trainer.b@ptplatform.test');
  client1 = await signIn('client.one@ptplatform.test');
  client2 = await signIn('client.two@ptplatform.test');
});
afterAll(async () => {
  if (habitIds.length) await admin.from('habits').delete().in('id', habitIds); // cascades logs
});

describe('habits', () => {
  it('Trainer A creates a habit for their client; the client reads it', async () => {
    const res = await trainerA
      .from('habits')
      .insert({ trainer_id: TRAINER_A, client_id: CLIENT_1, name: 'rls 8k steps', unit: 'steps' })
      .select();
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    if (res.data?.[0]?.id) habitIds.push(res.data[0].id);

    const read = await client1.from('habits').select('*').eq('client_id', CLIENT_1);
    expect(read.error).toBeNull();
    expect(read.data?.some((h) => h.name === 'rls 8k steps')).toBe(true);
  });

  it('Trainer B cannot create a habit for a client that is not theirs (42501)', async () => {
    const res = await trainerB
      .from('habits')
      .insert({ trainer_id: TRAINER_B, client_id: CLIENT_1, name: 'hijack' });
    expect(res.error?.code).toBe('42501');
  });

  it('another client cannot read this client’s habits (select → [])', async () => {
    const res = await client2.from('habits').select('*').eq('client_id', CLIENT_1);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });
});

describe('habit_logs', () => {
  const today = new Date().toISOString().slice(0, 10);

  it('the client logs their own habit; another client cannot log against it (owns_habit)', async () => {
    const ok = await client1
      .from('habit_logs')
      .insert({ habit_id: habitIds[0], client_id: CLIENT_1, log_date: today, value: 1 });
    expect(ok.error).toBeNull();

    const bad = await client2
      .from('habit_logs')
      .insert({ habit_id: habitIds[0], client_id: CLIENT_2, log_date: today, value: 1 });
    expect(bad.error?.code).toBe('42501');
  });

  it('re-inserting the same (habit_id, log_date) raises the unique violation the app upserts over', async () => {
    const dup = await client1
      .from('habit_logs')
      .insert({ habit_id: habitIds[0], client_id: CLIENT_1, log_date: today, value: 1 });
    expect(dup.error?.code).toBe('23505');
  });

  it('the trainer reads their client’s logs; another trainer cannot', async () => {
    const a = await trainerA.from('habit_logs').select('*').eq('habit_id', habitIds[0]);
    expect(a.error).toBeNull();
    expect((a.data?.length ?? 0) >= 1).toBe(true);

    const b = await trainerB.from('habit_logs').select('*').eq('habit_id', habitIds[0]);
    expect(b.error).toBeNull();
    expect(b.data).toEqual([]);
  });
});
