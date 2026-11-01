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
let client1: DB;
let adminUser: DB;
const createdNoteIds: string[] = [];
const createdFileIds: string[] = [];
const uploadedPaths: string[] = [];

beforeAll(async () => {
  trainerA = await signIn('trainer.a@ptplatform.test');
  trainerB = await signIn('trainer.b@ptplatform.test');
  client1 = await signIn('client.one@ptplatform.test');
  adminUser = await signIn('admin@ptplatform.test');
});

afterAll(async () => {
  if (createdNoteIds.length) await admin.from('client_notes').delete().in('id', createdNoteIds);
  if (createdFileIds.length) await admin.from('client_files').delete().in('id', createdFileIds);
  if (uploadedPaths.length) await admin.storage.from('client-files').remove(uploadedPaths);
});

describe('client_notes (trainer-only)', () => {
  it('Trainer A creates and reads a note for their client', async () => {
    const res = await trainerA
      .from('client_notes')
      .insert({ trainer_id: TRAINER_A, client_id: CLIENT_1, body: 'rls-probe note' })
      .select();
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    if (res.data?.[0]?.id) createdNoteIds.push(res.data[0].id);

    const read = await trainerA.from('client_notes').select('*').eq('client_id', CLIENT_1);
    expect(read.error).toBeNull();
    expect(read.data?.some((n) => n.body === 'rls-probe note')).toBe(true);
  });

  it('Trainer B cannot read Trainer A’s notes (select → [])', async () => {
    const res = await trainerB.from('client_notes').select('*').eq('client_id', CLIENT_1);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it('Trainer B cannot insert a note for a client they are not linked to (42501)', async () => {
    const res = await trainerB
      .from('client_notes')
      .insert({ trainer_id: TRAINER_B, client_id: CLIENT_1, body: 'hijack' });
    expect(res.error?.code).toBe('42501');
  });

  it('The client cannot read notes about themselves (select → [])', async () => {
    const res = await client1.from('client_notes').select('*').eq('client_id', CLIENT_1);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it('D-019: the note stays readable to the coach when the client is archived', async () => {
    await admin
      .from('trainer_clients')
      .update({ status: 'archived' })
      .eq('trainer_id', TRAINER_A)
      .eq('client_id', CLIENT_1);
    try {
      const res = await trainerA.from('client_notes').select('*').eq('client_id', CLIENT_1);
      expect(res.error).toBeNull();
      expect(res.data?.some((n) => n.body === 'rls-probe note')).toBe(true);
    } finally {
      await admin
        .from('trainer_clients')
        .update({ status: 'active' })
        .eq('trainer_id', TRAINER_A)
        .eq('client_id', CLIENT_1);
    }
  });

  it('an admin reads any note (is_admin)', async () => {
    const res = await adminUser.from('client_notes').select('id').eq('client_id', CLIENT_1);
    expect(res.error).toBeNull();
    expect((res.data?.length ?? 0) >= 1).toBe(true);
  });
});

describe('client_files (trainer-only)', () => {
  it('Trainer A creates and reads a file row for their client', async () => {
    const res = await trainerA
      .from('client_files')
      .insert({
        trainer_id: TRAINER_A,
        client_id: CLIENT_1,
        storage_path: `${TRAINER_A}/${CLIENT_1}/probe.txt`,
        file_name: 'probe.txt',
      })
      .select();
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    if (res.data?.[0]?.id) createdFileIds.push(res.data[0].id);
  });

  it('Trainer B cannot read Trainer A’s file rows (select → [])', async () => {
    const res = await trainerB.from('client_files').select('*').eq('client_id', CLIENT_1);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it('The client cannot read their own file rows (select → [])', async () => {
    const res = await client1.from('client_files').select('*').eq('client_id', CLIENT_1);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });
});

describe('client-files storage bucket (private, path-scoped)', () => {
  const blob = () => new Blob(['probe']);

  it('Trainer A can upload under their own trainer/client prefix', async () => {
    const path = `${TRAINER_A}/${CLIENT_1}/probe-${Date.now()}.txt`;
    const res = await trainerA.storage.from('client-files').upload(path, blob());
    expect(res.error).toBeNull();
    if (!res.error) uploadedPaths.push(path);
  });

  it('Trainer B cannot upload under Trainer A’s prefix (denied)', async () => {
    const path = `${TRAINER_A}/${CLIENT_1}/evil-${Date.now()}.txt`;
    const res = await trainerB.storage.from('client-files').upload(path, blob());
    expect(res.error).not.toBeNull();
  });

  it('Trainer A cannot upload for a client they are not linked to (denied)', async () => {
    const path = `${TRAINER_A}/${CLIENT_2}/evil-${Date.now()}.txt`;
    const res = await trainerA.storage.from('client-files').upload(path, blob());
    expect(res.error).not.toBeNull();
  });

  it('The client cannot read the bucket via list under the prefix (denied or empty)', async () => {
    const res = await client1.storage.from('client-files').list(`${TRAINER_A}/${CLIENT_1}`);
    // Either an error or an empty listing — never another user's objects.
    expect(res.error ? true : (res.data?.length ?? 0) === 0).toBe(true);
  });
});

describe('D-020: trainer reads a linked client profile at any status', () => {
  it('the coach still reads an archived client’s profile (not just active/paused)', async () => {
    await admin
      .from('trainer_clients')
      .update({ status: 'archived' })
      .eq('trainer_id', TRAINER_A)
      .eq('client_id', CLIENT_1);
    try {
      const res = await trainerA.from('profiles').select('id, full_name').eq('id', CLIENT_1);
      expect(res.error).toBeNull();
      expect(res.data).toHaveLength(1);
    } finally {
      await admin
        .from('trainer_clients')
        .update({ status: 'active' })
        .eq('trainer_id', TRAINER_A)
        .eq('client_id', CLIENT_1);
    }
  });

  it('a trainer still cannot read a profile they have no link to', async () => {
    const res = await trainerA.from('profiles').select('id').eq('id', CLIENT_2);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });
});
