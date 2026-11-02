import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import type { Database } from '../../src/lib/supabase/types';

const url = inject('supabaseUrl');
const anonKey = inject('supabaseAnonKey');
const serviceKey = inject('supabaseServiceKey');

const PASSWORD = 'Password123!';
const TRAINER_A = '11111111-0000-0000-0000-000000000001';
const CLIENT_1 = '33333333-0000-0000-0000-000000000001'; // Trainer A's client
const SEEDED_LOG = 'dddd0000-0000-0000-0000-000000000001'; // Client One's completed back-squat log

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
let backSquatId: string;
const logIds: string[] = [];

beforeAll(async () => {
  trainerA = await signIn('trainer.a@ptplatform.test');
  trainerB = await signIn('trainer.b@ptplatform.test');
  client1 = await signIn('client.one@ptplatform.test');
  client2 = await signIn('client.two@ptplatform.test');
  const ex = await admin
    .from('exercises')
    .select('id')
    .is('trainer_id', null)
    .eq('name', 'Back squat')
    .single();
  backSquatId = ex.data!.id;
});
afterAll(async () => {
  if (logIds.length) await admin.from('workout_logs').delete().in('id', logIds); // cascades set_logs
});

async function newLog(db: DB): Promise<string> {
  const cgid = crypto.randomUUID();
  const { data, error } = await db
    .from('workout_logs')
    .insert({ trainer_id: TRAINER_A, client_id: CLIENT_1, client_generated_id: cgid })
    .select('id')
    .single();
  if (error) throw new Error(`newLog failed: ${error.message}`);
  logIds.push(data!.id);
  return data!.id;
}

describe('workout_logs / set_logs — ownership + trainer read (A1)', () => {
  it('a client owns its logs; another client and trainer are denied', async () => {
    // Client One reads the seeded log; Client Two cannot; Trainer A (their coach) can; Trainer B cannot.
    expect(
      (await client1.from('workout_logs').select('id').eq('id', SEEDED_LOG)).data,
    ).toHaveLength(1);
    expect((await client2.from('workout_logs').select('id').eq('id', SEEDED_LOG)).data).toEqual([]);
    expect(
      (await trainerA.from('workout_logs').select('id').eq('id', SEEDED_LOG)).data,
    ).toHaveLength(1);
    expect((await trainerB.from('workout_logs').select('id').eq('id', SEEDED_LOG)).data).toEqual(
      [],
    );

    // The seeded set_logs follow the same rule.
    expect(
      (await client1.from('set_logs').select('id').eq('workout_log_id', SEEDED_LOG)).data?.length ??
        0,
    ).toBeGreaterThan(0);
    expect(
      (await client2.from('set_logs').select('id').eq('workout_log_id', SEEDED_LOG)).data,
    ).toEqual([]);
    expect(
      (await trainerB.from('set_logs').select('id').eq('workout_log_id', SEEDED_LOG)).data,
    ).toEqual([]);
  });

  it('a client cannot create a log for a trainer who is not theirs (trainer_id pinned → 42501)', async () => {
    const res = await client1.from('workout_logs').insert({
      trainer_id: '22222222-0000-0000-0000-000000000001', // Trainer B — not Client One's coach
      client_id: CLIENT_1,
      client_generated_id: crypto.randomUUID(),
    });
    expect(res.error?.code).toBe('42501');
  });
});

describe('set_logs — idempotency (A2)', () => {
  it('a repeated client_generated_id does not duplicate', async () => {
    const logId = await newLog(client1);
    const cgid = crypto.randomUUID();
    const row = {
      workout_log_id: logId,
      exercise_id: backSquatId,
      set_number: 1,
      reps: 5,
      weight_kg: 60,
      completed: true,
      client_generated_id: cgid,
    };
    const first = await client1.from('set_logs').insert(row);
    expect(first.error).toBeNull();
    const second = await client1.from('set_logs').insert(row); // same client_generated_id
    expect(second.error?.code).toBe('23505'); // unique violation — the on-conflict write relies on this
    expect(
      (await client1.from('set_logs').select('id').eq('client_generated_id', cgid)).data,
    ).toHaveLength(1);
  });
});

describe('personal_records — server-side PR on a heavier set (A6)', () => {
  it('a heavier set records a PR (Epley e1RM), and the client cannot write PRs directly', async () => {
    const logId = await newLog(client1);
    // The seed already set Back-squat max_weight to 82.5; a 100 kg set beats it.
    const ins = await client1.from('set_logs').insert({
      workout_log_id: logId,
      exercise_id: backSquatId,
      set_number: 1,
      reps: 5,
      weight_kg: 100,
      completed: true,
      client_generated_id: crypto.randomUUID(),
    });
    expect(ins.error).toBeNull();

    const pr = await client1
      .from('personal_records')
      .select('type, value')
      .eq('client_id', CLIENT_1)
      .eq('exercise_id', backSquatId);
    const byType = Object.fromEntries((pr.data ?? []).map((r) => [r.type, Number(r.value)]));
    expect(byType.max_weight).toBe(100);
    expect(byType.e1rm).toBeCloseTo(100 * (1 + 5 / 30), 1); // Epley ≈ 116.67

    // A client cannot write a PR directly (only the security-definer trigger does).
    const direct = await client1
      .from('personal_records')
      .insert({ client_id: CLIENT_1, exercise_id: backSquatId, type: 'max_weight', value: 999 });
    expect(direct.error?.code).toBe('42501');
  });
});

describe('exercises — a client reads their trainer’s custom exercises (P1-06 follow-up)', () => {
  it('a client can read a custom exercise owned by their trainer', async () => {
    const custom = await trainerA
      .from('exercises')
      .insert({
        trainer_id: TRAINER_A,
        name: `WL custom ${Math.random()}`,
        primary_muscle: 'chest',
      })
      .select('id')
      .single();
    expect(custom.error).toBeNull();
    const seen = await client1.from('exercises').select('id').eq('id', custom.data!.id);
    expect(seen.data).toHaveLength(1);
    // Client Two (not Trainer A's client) cannot.
    expect((await client2.from('exercises').select('id').eq('id', custom.data!.id)).data).toEqual(
      [],
    );
    await admin.from('exercises').delete().eq('id', custom.data!.id);
  });
});
