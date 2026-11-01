import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import type { Database } from '../../src/lib/supabase/types';
import { EQUIPMENT, EXERCISE_CATEGORIES, MUSCLES } from '../../src/features/exercises/taxonomy';

const url = inject('supabaseUrl');
const anonKey = inject('supabaseAnonKey');
const serviceKey = inject('supabaseServiceKey');

const PASSWORD = 'Password123!';
const TRAINER_A = '11111111-0000-0000-0000-000000000001';
const TRAINER_B = '22222222-0000-0000-0000-000000000001';

type DB = SupabaseClient<Database>;
function anon(): DB {
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
const admin: DB = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function signIn(email: string): Promise<DB> {
  const c = anon();
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return c;
}

let trainerA: DB;
let trainerB: DB;
const createdIds: string[] = [];

beforeAll(async () => {
  trainerA = await signIn('trainer.a@ptplatform.test');
  trainerB = await signIn('trainer.b@ptplatform.test');
});
afterAll(async () => {
  if (createdIds.length) await admin.from('exercises').delete().in('id', createdIds);
});

describe('global exercise seed', () => {
  it('seeds ~150 global exercises (trainer_id null)', async () => {
    const res = await trainerA
      .from('exercises')
      .select('id', { count: 'exact', head: true })
      .is('trainer_id', null);
    expect(res.error).toBeNull();
    expect(res.count ?? 0).toBeGreaterThanOrEqual(140);
    expect(res.count ?? 0).toBeLessThanOrEqual(170);
  });

  it('every seeded value is within the taxonomy (so filters line up)', async () => {
    const res = await trainerA
      .from('exercises')
      .select('primary_muscle, secondary_muscles, equipment, category')
      .is('trainer_id', null);
    expect(res.error).toBeNull();
    const muscles = new Set<string>(MUSCLES);
    const equip = new Set<string>(EQUIPMENT);
    const cats = new Set<string>(EXERCISE_CATEGORIES);
    for (const row of res.data ?? []) {
      expect(muscles.has(row.primary_muscle), `primary_muscle ${row.primary_muscle}`).toBe(true);
      expect(cats.has(row.category), `category ${row.category}`).toBe(true);
      if (row.equipment) expect(equip.has(row.equipment), `equipment ${row.equipment}`).toBe(true);
      for (const m of row.secondary_muscles ?? [])
        expect(muscles.has(m), `secondary ${m}`).toBe(true);
    }
  });
});

describe('exercises RLS', () => {
  it('a trainer reads the global library', async () => {
    const res = await trainerA.from('exercises').select('id').is('trainer_id', null).limit(1);
    expect(res.error).toBeNull();
    expect(res.data?.length).toBe(1);
  });

  it('a trainer can create their own exercise and read it back', async () => {
    const res = await trainerA
      .from('exercises')
      .insert({ trainer_id: TRAINER_A, name: 'rls-probe custom', primary_muscle: 'chest' })
      .select();
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    if (res.data?.[0]?.id) createdIds.push(res.data[0].id);
  });

  it('a trainer cannot create a global (trainer_id null) exercise (42501)', async () => {
    const res = await trainerA
      .from('exercises')
      .insert({ trainer_id: null, name: 'sneaky global', primary_muscle: 'chest' });
    expect(res.error?.code).toBe('42501');
  });

  it('a trainer cannot create an exercise owned by another trainer (42501)', async () => {
    const res = await trainerA
      .from('exercises')
      .insert({ trainer_id: TRAINER_B, name: 'sneaky other', primary_muscle: 'chest' });
    expect(res.error?.code).toBe('42501');
  });

  it("Trainer B cannot see Trainer A's private exercise (select → [])", async () => {
    const res = await trainerB
      .from('exercises')
      .select('*')
      .eq('trainer_id', TRAINER_A)
      .eq('name', 'rls-probe custom');
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it('a trainer cannot mutate a global exercise (0 rows, unchanged)', async () => {
    const one = await admin
      .from('exercises')
      .select('id, name')
      .is('trainer_id', null)
      .limit(1)
      .single();
    const res = await trainerA
      .from('exercises')
      .update({ name: 'hijacked global' })
      .eq('id', one.data!.id)
      .select();
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
    const check = await admin.from('exercises').select('name').eq('id', one.data!.id).single();
    expect(check.data?.name).toBe(one.data!.name);
  });
});
