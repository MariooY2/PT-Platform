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

describe('programs — nested-row isolation on workout_exercises + prescribed_sets (A2)', () => {
  const SAMPLE_WEX = 'bbbb0000-0000-0000-0000-000000000003'; // seeded wex under Trainer A's template

  it("Trainer B cannot READ Trainer A's prescribed_sets (→ [])", async () => {
    expect(
      (await trainerB.from('prescribed_sets').select('*').eq('workout_exercise_id', SAMPLE_WEX))
        .data,
    ).toEqual([]);
  });

  it('a foreign client cannot read the template’s nested rows (→ [])', async () => {
    expect((await client1.from('workout_exercises').select('*').eq('id', SAMPLE_WEX)).data).toEqual(
      [],
    );
    expect(
      (await client1.from('prescribed_sets').select('*').eq('workout_exercise_id', SAMPLE_WEX))
        .data,
    ).toEqual([]);
  });

  it('Trainer B cannot INSERT a workout_exercise into Trainer A’s workout (→ 42501)', async () => {
    const ex = await admin.from('exercises').select('id').is('trainer_id', null).limit(1).single();
    const res = await trainerB
      .from('workout_exercises')
      .insert({ program_workout_id: SAMPLE_WORKOUT, exercise_id: ex.data!.id, position: 9 });
    expect(res.error?.code).toBe('42501');
  });

  it('Trainer B cannot INSERT a prescribed_set onto Trainer A’s exercise (→ 42501)', async () => {
    const res = await trainerB
      .from('prescribed_sets')
      .insert({ workout_exercise_id: SAMPLE_WEX, set_number: 9, set_type: 'working', reps_min: 5 });
    expect(res.error?.code).toBe('42501');
  });

  it('Trainer B cannot UPDATE or DELETE Trainer A’s nested rows (RLS → no rows affected)', async () => {
    const upd = await trainerB
      .from('workout_exercises')
      .update({ position: 99 })
      .eq('id', SAMPLE_WEX)
      .select();
    expect(upd.error).toBeNull();
    expect(upd.data).toEqual([]);
    const del = await trainerB
      .from('prescribed_sets')
      .delete()
      .eq('workout_exercise_id', SAMPLE_WEX)
      .select();
    expect(del.error).toBeNull();
    expect(del.data).toEqual([]);
    // The seeded set is still there (deletion was a no-op under RLS).
    expect(
      (await trainerA.from('prescribed_sets').select('id').eq('workout_exercise_id', SAMPLE_WEX))
        .data?.length ?? 0,
    ).toBeGreaterThan(0);
  });
});

describe('programs — editing a client copy never changes the template it came from (A6)', () => {
  let templateId: string, templateSetId: string, copySetId: string;

  it('setup: a template and a client copy, each with its own nested set', async () => {
    const ex = await admin.from('exercises').select('id').is('trainer_id', null).limit(1).single();
    const exerciseId = ex.data!.id;

    async function buildProgram(fields: Record<string, unknown>) {
      const p = await trainerA
        .from('programs')
        .insert({ trainer_id: TRAINER_A, title: 'A6 ' + Math.random(), weeks: 1, ...fields })
        .select()
        .single();
      expect(p.error).toBeNull();
      programIds.push(p.data!.id);
      const w = await trainerA
        .from('program_workouts')
        .insert({ program_id: p.data!.id, week: 1, day: 1, title: 'D1' })
        .select()
        .single();
      const x = await trainerA
        .from('workout_exercises')
        .insert({ program_workout_id: w.data!.id, exercise_id: exerciseId, position: 0 })
        .select()
        .single();
      const s = await trainerA
        .from('prescribed_sets')
        .insert({
          workout_exercise_id: x.data!.id,
          set_number: 1,
          set_type: 'working',
          reps_min: 5,
        })
        .select()
        .single();
      expect(s.error).toBeNull();
      return { programId: p.data!.id, setId: s.data!.id };
    }

    const template = await buildProgram({ is_template: true });
    templateId = template.programId;
    templateSetId = template.setId;
    const copy = await buildProgram({
      is_template: false,
      client_id: CLIENT_1,
      source_program_id: templateId,
    });
    copySetId = copy.setId;
  });

  it('editing the copy’s prescribed set leaves the template’s set byte-for-byte unchanged', async () => {
    const before = await trainerA
      .from('prescribed_sets')
      .select('*')
      .eq('id', templateSetId)
      .single();
    expect(before.data!.reps_min).toBe(5);

    const edit = await trainerA
      .from('prescribed_sets')
      .update({ reps_min: 12, reps_max: 15 })
      .eq('id', copySetId)
      .select()
      .single();
    expect(edit.error).toBeNull();
    expect(edit.data!.reps_min).toBe(12);

    const after = await trainerA
      .from('prescribed_sets')
      .select('*')
      .eq('id', templateSetId)
      .single();
    expect(after.data).toEqual(before.data); // the template row did not move
  });
});

describe('programs — assign by atomic deep copy (P1-06)', () => {
  async function nestedCounts(db: DB, programId: string) {
    const w = await db.from('program_workouts').select('id').eq('program_id', programId);
    const wids = (w.data ?? []).map((r) => r.id);
    const x = wids.length
      ? await db.from('workout_exercises').select('id').in('program_workout_id', wids)
      : { data: [] as { id: string }[] };
    const xids = (x.data ?? []).map((r) => r.id);
    const s = xids.length
      ? await db.from('prescribed_sets').select('id').in('workout_exercise_id', xids)
      : { data: [] as { id: string }[] };
    return { w: wids.length, x: xids.length, s: (s.data ?? []).length };
  }

  it('copy_program_for_client copies all nested rows as one atomic call (A1)', async () => {
    const res = await trainerA.rpc('copy_program_for_client', {
      template_id: SAMPLE_PROGRAM,
      target_client_id: CLIENT_1,
      start_on: '2026-12-07',
    });
    expect(res.error).toBeNull();
    const copyId = res.data as string;
    programIds.push(copyId);

    const prog = await trainerA.from('programs').select('*').eq('id', copyId).single();
    expect(prog.data!.is_template).toBe(false);
    expect(prog.data!.client_id).toBe(CLIENT_1);
    expect(prog.data!.source_program_id).toBe(SAMPLE_PROGRAM);
    expect(prog.data!.start_date).toBe('2026-12-07');

    const t = await nestedCounts(trainerA, SAMPLE_PROGRAM);
    const c = await nestedCounts(trainerA, copyId);
    expect(c).toEqual(t); // identical nested-row counts at every level
    expect(c.w).toBeGreaterThan(0);
  });

  it('copy_program_for_client denies a foreign trainer and a client (A2)', async () => {
    const b = await trainerB.rpc('copy_program_for_client', {
      template_id: SAMPLE_PROGRAM,
      target_client_id: CLIENT_1,
      start_on: '2026-12-07',
    });
    expect(b.error).not.toBeNull(); // CLIENT_1 is not Trainer B's client / B can't read the template

    const c = await client1.rpc('copy_program_for_client', {
      template_id: SAMPLE_PROGRAM,
      target_client_id: CLIENT_1,
      start_on: '2026-12-07',
    });
    expect(c.error).not.toBeNull(); // a client cannot assign
  });
});
