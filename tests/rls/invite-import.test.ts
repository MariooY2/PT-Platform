import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import type { Database } from '../../src/lib/supabase/types';

// P1-02: a coach creates invite/import rows on trainer_clients, but never sets client_id
// (D-010/D-014 column privileges), and a coach sees only their own invite rows.

const url = inject('supabaseUrl');
const anonKey = inject('supabaseAnonKey');
const serviceKey = inject('supabaseServiceKey');

const PASSWORD = 'Password123!';
const TRAINER_A = '11111111-0000-0000-0000-000000000001';
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
  const c = anon();
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return c;
}

const probe = `p1-02-${Date.now()}`;
const emailImport = `${probe}-import@ptplatform.test`;
const emailLink = `${probe}-link@ptplatform.test`;
const createdIds: string[] = [];

let trainerA: DB;
let trainerB: DB;

beforeAll(async () => {
  trainerA = await signIn('trainer.a@ptplatform.test');
  trainerB = await signIn('trainer.b@ptplatform.test');
});

afterAll(async () => {
  if (createdIds.length) await admin.from('trainer_clients').delete().in('id', createdIds);
  await admin.from('trainer_clients').delete().in('invite_email', [emailImport, emailLink]);
});

describe('invite + import row creation (P1-02)', () => {
  it('a coach creates an import row (invited/import) with their own trainer_id', async () => {
    const res = await trainerA
      .from('trainer_clients')
      .insert({
        trainer_id: TRAINER_A,
        invite_email: emailImport,
        invite_token: `${probe}-tok-import`,
        status: 'invited',
        source: 'import',
      })
      .select('id, client_id, status, source');
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    expect(res.data?.[0]?.client_id).toBeNull();
    expect(res.data?.[0]?.status).toBe('invited');
    expect(res.data?.[0]?.source).toBe('import');
    if (res.data?.[0]?.id) createdIds.push(res.data[0].id);
  });

  it('a coach creates a link invite (invited/invite) with a unique token', async () => {
    const res = await trainerA
      .from('trainer_clients')
      .insert({
        trainer_id: TRAINER_A,
        invite_email: emailLink,
        invite_token: `${probe}-tok-link`,
        status: 'invited',
        source: 'invite',
      })
      .select('id, invite_token');
    expect(res.error).toBeNull();
    expect(res.data?.[0]?.invite_token).toBe(`${probe}-tok-link`);
    if (res.data?.[0]?.id) createdIds.push(res.data[0].id);
  });

  it('a coach CANNOT set client_id when creating an import row (42501, no row)', async () => {
    // The column grant (migration 025837) excludes client_id: setting it is a hard permission error,
    // so an import can never link an arbitrary client — it only ever makes lead/invited rows.
    const res = await trainerA.from('trainer_clients').insert({
      trainer_id: TRAINER_A,
      client_id: CLIENT_2,
      invite_email: `${probe}-evil@ptplatform.test`,
      invite_token: `${probe}-tok-evil`,
      status: 'invited',
      source: 'import',
    });
    expect(res.error?.code).toBe('42501');

    const check = await admin
      .from('trainer_clients')
      .select('id')
      .eq('invite_token', `${probe}-tok-evil`);
    expect(check.data).toEqual([]);
  });

  it('the invite_token is globally unique (23505 on a duplicate)', async () => {
    const res = await trainerA.from('trainer_clients').insert({
      trainer_id: TRAINER_A,
      invite_email: `${probe}-dup@ptplatform.test`,
      invite_token: `${probe}-tok-link`, // same token as the link invite above
      status: 'invited',
      source: 'invite',
    });
    expect(res.error?.code).toBe('23505');
  });

  it('Trainer B cannot see Trainer A’s invite/import rows (select → [])', async () => {
    const res = await trainerB
      .from('trainer_clients')
      .select('id')
      .in('invite_email', [emailImport, emailLink]);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it('an anonymous visitor cannot read invite rows (select → [])', async () => {
    const res = await anon().from('trainer_clients').select('id').eq('invite_email', emailImport);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });
});
