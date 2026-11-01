import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import type { Database } from '../../src/lib/supabase/types';

const url = inject('supabaseUrl');
const anonKey = inject('supabaseAnonKey');
const serviceKey = inject('supabaseServiceKey');

const PASSWORD = 'Password123!';
const TRAINER_A = '11111111-0000-0000-0000-000000000001';
const CLIENT_1 = '33333333-0000-0000-0000-000000000001'; // Trainer A's client
const SAMPLE_PROGRAM = 'bbbb0000-0000-0000-0000-000000000001'; // seeded template (trainer A)
const SAMPLE_WORKOUT = 'bbbb0000-0000-0000-0000-000000000002';

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
const programIds: string[] = [];

beforeAll(async () => {
  trainerA = await signIn('trainer.a@ptplatform.test');
  trainerB = await signIn('trainer.b@ptplatform.test');
  client1 = await signIn('client.one@ptplatform.test');
  client2 = await signIn('client.two@ptplatform.test');
});
afterAll(async () => {
  if (programIds.length) await admin.from('programs').delete().in('id', programIds); // cascades nested rows
});

describe('programs — trainer owns templates + nested rows', () => {
  it('Trainer A reads the seeded template and its nested rows', async () => {
    const p = await trainerA.from('programs').select('*').eq('id', SAMPLE_PROGRAM);
    expect(p.error).toBeNull();
    expect(p.data).toHaveLength(1);
    const w = await trainerA.from('program_workouts').select('*').eq('program_id', SAMPLE_PROGRAM);
    expect(w.data).toHaveLength(1);
    const x = await trainerA
      .from('workout_exercises')
      .select('*')
      .eq('program_workout_id', SAMPLE_WORKOUT);
    expect((x.data?.length ?? 0) >= 1).toBe(true);
    const s = await trainerA
      .from('prescribed_sets')
      .select('*')
      .eq('workout_exercise_id', x.data![0].id);
    expect((s.data?.length ?? 0) >= 1).toBe(true);
  });

  it("Trainer B cannot read Trainer A's template or its nested rows (→ [])", async () => {
    expect((await trainerB.from('programs').select('*').eq('id', SAMPLE_PROGRAM)).data).toEqual([]);
    expect(
      (await trainerB.from('program_workouts').select('*').eq('program_id', SAMPLE_PROGRAM)).data,
    ).toEqual([]);
    expect(
      (
        await trainerB
          .from('workout_exercises')
          .select('*')
          .eq('program_workout_id', SAMPLE_WORKOUT)
      ).data,
    ).toEqual([]);
  });

  it('Trainer B cannot add a workout to Trainer A’s program (can_edit_program → 42501)', async () => {
    const res = await trainerB
      .from('program_workouts')
      .insert({ program_id: SAMPLE_PROGRAM, week: 1, day: 2, title: 'hijack' });
    expect(res.error?.code).toBe('42501');
  });

  it('a client cannot read a template (no client_id link)', async () => {
    expect((await client1.from('programs').select('*').eq('id', SAMPLE_PROGRAM)).data).toEqual([]);
    expect(
      (await client1.from('program_workouts').select('*').eq('program_id', SAMPLE_PROGRAM)).data,
    ).toEqual([]);
  });
});

describe('programs — a client reads only their own assigned copy', () => {
  let copyId: string;
  let copyWorkoutId: string;

  it('setup: Trainer A creates a client copy with a workout', async () => {
    const p = await trainerA
      .from('programs')
      .insert({
        trainer_id: TRAINER_A,
        client_id: CLIENT_1,
        title: 'rls copy',
        is_template: false,
        weeks: 1,
      })
      .select()
      .single();
    expect(p.error).toBeNull();
    copyId = p.data!.id;
    programIds.push(copyId);
    const w = await trainerA
      .from('program_workouts')
      .insert({ program_id: copyId, week: 1, day: 1, title: 'Day 1' })
      .select()
      .single();
    expect(w.error).toBeNull();
    copyWorkoutId = w.data!.id;
  });

  it('the assigned client reads their copy and its workout; another client cannot', async () => {
    const own = await client1.from('programs').select('*').eq('id', copyId);
    expect(own.data).toHaveLength(1);
    const ownW = await client1.from('program_workouts').select('*').eq('id', copyWorkoutId);
    expect(ownW.data).toHaveLength(1);

    expect((await client2.from('programs').select('*').eq('id', copyId)).data).toEqual([]);
    expect(
      (await client2.from('program_workouts').select('*').eq('id', copyWorkoutId)).data,
    ).toEqual([]);
  });

  it('the client cannot edit their copy (read-only; no client edit policy)', async () => {
    const res = await client1
      .from('program_workouts')
      .update({ title: 'client edit' })
      .eq('id', copyWorkoutId)
      .select();
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]); // can_edit_* requires trainer ownership
  });
});
