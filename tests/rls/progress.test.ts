import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import type { Database } from '../../src/lib/supabase/types';

const url = inject('supabaseUrl');
const anonKey = inject('supabaseAnonKey');
const serviceKey = inject('supabaseServiceKey');

const PASSWORD = 'Password123!';
const TRAINER_A = '11111111-0000-0000-0000-000000000001';
const TRAINER_B = '22222222-0000-0000-0000-000000000001';
const CLIENT_1 = '33333333-0000-0000-0000-000000000001';
const CLIENT_2 = '44444444-0000-0000-0000-000000000001';

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
const metricIds: string[] = [];
const photoIds: string[] = [];
const paths: string[] = [];

beforeAll(async () => {
  trainerA = await signIn('trainer.a@ptplatform.test');
  trainerB = await signIn('trainer.b@ptplatform.test');
  client1 = await signIn('client.one@ptplatform.test');
  client2 = await signIn('client.two@ptplatform.test');
});
afterAll(async () => {
  if (metricIds.length) await admin.from('body_metrics').delete().in('id', metricIds);
  if (photoIds.length) await admin.from('progress_photos').delete().in('id', photoIds);
  if (paths.length) await admin.storage.from('progress-photos').remove(paths);
});

describe('body_metrics — client owns, trainer reads their clients (A1)', () => {
  it('a client reads their seeded trend; another client and foreign trainer are denied', async () => {
    const own = await client1.from('body_metrics').select('id').eq('client_id', CLIENT_1);
    expect((own.data?.length ?? 0) >= 1).toBe(true);
    expect(
      (await client2.from('body_metrics').select('id').eq('client_id', CLIENT_1)).data,
    ).toEqual([]);
    expect(
      (await trainerA.from('body_metrics').select('id').eq('client_id', CLIENT_1)).data?.length,
    ).toBeGreaterThan(0);
    expect(
      (await trainerB.from('body_metrics').select('id').eq('client_id', CLIENT_1)).data,
    ).toEqual([]);
  });

  it('a client logs their own weight; cannot plant one for another trainer (42501)', async () => {
    const ok = await client1
      .from('body_metrics')
      .insert({ trainer_id: TRAINER_A, client_id: CLIENT_1, weight_kg: 70.4 })
      .select('id')
      .single();
    expect(ok.error).toBeNull();
    metricIds.push(ok.data!.id);

    const bad = await client1
      .from('body_metrics')
      .insert({ trainer_id: TRAINER_B, client_id: CLIENT_1, weight_kg: 70 });
    expect(bad.error?.code).toBe('42501'); // is_client_of(TRAINER_B) is false
  });
});

describe('progress_photos — client owns, trainer reads (A1)', () => {
  it('a client creates their own photo row; another client is denied read; the trainer reads it', async () => {
    const ins = await client1
      .from('progress_photos')
      .insert({
        trainer_id: TRAINER_A,
        client_id: CLIENT_1,
        pose: 'front',
        storage_path: `${CLIENT_1}/front/x.jpg`,
      })
      .select('id')
      .single();
    expect(ins.error).toBeNull();
    photoIds.push(ins.data!.id);

    expect(
      (await client2.from('progress_photos').select('id').eq('id', ins.data!.id)).data,
    ).toEqual([]);
    expect(
      (await trainerA.from('progress_photos').select('id').eq('id', ins.data!.id)).data,
    ).toHaveLength(1);
    expect(
      (await trainerB.from('progress_photos').select('id').eq('id', ins.data!.id)).data,
    ).toEqual([]);
  });
});

describe('progress-photos storage — per-client folder isolation (A1)', () => {
  it('a client writes into their own folder but not another client’s', async () => {
    const body = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });
    const ownPath = `${CLIENT_1}/front/${crypto.randomUUID()}.jpg`;
    const own = await client1.storage.from('progress-photos').upload(ownPath, body);
    expect(own.error).toBeNull();
    paths.push(ownPath);

    const foreign = await client1.storage
      .from('progress-photos')
      .upload(`${CLIENT_2}/front/${crypto.randomUUID()}.jpg`, body);
    expect(foreign.error).not.toBeNull(); // RLS blocks writing into another client's folder
  });
});
