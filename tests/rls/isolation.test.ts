import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, inject, it } from 'vitest';
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

function anon(): DB {
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const admin: DB = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function signIn(email: string): Promise<DB> {
  const client = anon();
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}

let trainerA: DB;
let trainerB: DB;
let client1: DB;

beforeAll(async () => {
  trainerA = await signIn('trainer.a@ptplatform.test');
  trainerB = await signIn('trainer.b@ptplatform.test');
  client1 = await signIn('client.one@ptplatform.test');
});

describe('sign-in', () => {
  it('every seeded account can authenticate', async () => {
    for (const email of [
      'admin@ptplatform.test',
      'trainer.a@ptplatform.test',
      'trainer.b@ptplatform.test',
      'client.one@ptplatform.test',
      'client.two@ptplatform.test',
    ]) {
      const c = anon();
      const { data, error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
      expect(error, email).toBeNull();
      expect(data.user?.email, email).toBe(email);
    }
  });
});

describe('trainer isolation', () => {
  it('Trainer A reads their own client link and profile', async () => {
    const link = await trainerA.from('trainer_clients').select('*').eq('client_id', CLIENT_1);
    expect(link.error).toBeNull();
    expect(link.data).toHaveLength(1);

    const prof = await trainerA.from('profiles').select('*').eq('id', CLIENT_1);
    expect(prof.error).toBeNull();
    expect(prof.data).toHaveLength(1);
  });

  it("Trainer A cannot read Trainer B's client links (select → [])", async () => {
    const res = await trainerA.from('trainer_clients').select('*').eq('trainer_id', TRAINER_B);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it("Trainer A cannot read Trainer B's client's profile (select → [])", async () => {
    const res = await trainerA.from('profiles').select('*').eq('id', CLIENT_2);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it("Trainer A cannot update Trainer B's client link (0 rows, row unchanged)", async () => {
    const res = await trainerA
      .from('trainer_clients')
      .update({ goals: 'hijacked by A' })
      .eq('trainer_id', TRAINER_B)
      .select();
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);

    const check = await admin
      .from('trainer_clients')
      .select('goals')
      .eq('trainer_id', TRAINER_B)
      .eq('client_id', CLIENT_2)
      .single();
    expect(check.data?.goals).not.toBe('hijacked by A');
  });

  it('Trainer A cannot insert a link owned by Trainer B (insert → 42501)', async () => {
    const res = await trainerA.from('trainer_clients').insert({
      trainer_id: TRAINER_B,
      status: 'lead',
      source: 'invite',
    });
    expect(res.error?.code).toBe('42501');
  });
});

describe('client isolation', () => {
  it('Client One reads their own link but not another client’s', async () => {
    const own = await client1.from('trainer_clients').select('*').eq('client_id', CLIENT_1);
    expect(own.error).toBeNull();
    expect(own.data).toHaveLength(1);

    const other = await client1.from('trainer_clients').select('*').eq('client_id', CLIENT_2);
    expect(other.error).toBeNull();
    expect(other.data).toEqual([]);
  });

  it("Client One cannot read another client's profile (select → [])", async () => {
    const res = await client1.from('profiles').select('*').eq('id', CLIENT_2);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it('Client One cannot write coach-authored fields on their link (0 rows)', async () => {
    // Clients have no write policy on trainer_clients (coach-only fields: goals, injuries_notes).
    const res = await client1
      .from('trainer_clients')
      .update({ goals: 'client-set goal' })
      .eq('client_id', CLIENT_1)
      .select();
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it('Client One can update their own profile but not another’s', async () => {
    const ok = await client1
      .from('profiles')
      .update({ phone: '+96170000001' })
      .eq('id', CLIENT_1)
      .select();
    expect(ok.error).toBeNull();
    expect(ok.data).toHaveLength(1);

    const denied = await client1
      .from('profiles')
      .update({ phone: 'nope' })
      .eq('id', CLIENT_2)
      .select();
    expect(denied.error).toBeNull();
    expect(denied.data).toEqual([]);
  });
});

describe('anonymous access', () => {
  it('cannot read private profiles, trainers or links', async () => {
    const a = anon();
    const profiles = await a.from('profiles').select('*');
    expect(profiles.data ?? []).toEqual([]);
    const trainers = await a.from('trainers').select('*');
    expect(trainers.data ?? []).toEqual([]);
    const links = await a.from('trainer_clients').select('*');
    expect(links.data ?? []).toEqual([]);
  });
});
