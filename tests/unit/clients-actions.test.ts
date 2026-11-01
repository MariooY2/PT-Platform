import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the server Supabase client, the role helper and Next's cache so the actions run in node.
const getUser = vi.fn();
const calls: { table?: string; update?: unknown; insert?: unknown; eqs: [string, unknown][] } = {
  eqs: [],
};
let selectResult: { data: unknown; error: unknown } = { data: [{ client_id: 'c' }], error: null };
let insertResult: { error: unknown } = { error: null };

function builder() {
  const b: Record<string, unknown> = {};
  b.update = (payload: unknown) => {
    calls.update = payload;
    return b;
  };
  b.insert = (payload: unknown) => {
    calls.insert = payload;
    return Promise.resolve(insertResult);
  };
  b.eq = (col: string, val: unknown) => {
    calls.eqs.push([col, val]);
    return b;
  };
  b.select = () => Promise.resolve(selectResult);
  return b;
}

const supabaseMock = {
  auth: { getUser },
  from: (table: string) => {
    calls.table = table;
    return builder();
  },
};

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => supabaseMock }));
vi.mock('@/lib/supabase/middleware', () => ({
  roleOf: (user: { role?: string } | null) => user?.role ?? null,
}));
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

import {
  addNoteAction,
  registerClientFileAction,
  saveClientDetailsAction,
  setClientStatusAction,
} from '@/features/clients/actions';

const TRAINER = '11111111-0000-0000-0000-000000000001';
const CLIENT = '33333333-0000-0000-0000-000000000001';

function signedInAsTrainer() {
  getUser.mockResolvedValue({ data: { user: { id: TRAINER, role: 'trainer' } } });
}

beforeEach(() => {
  calls.table = undefined;
  calls.update = undefined;
  calls.insert = undefined;
  calls.eqs = [];
  selectResult = { data: [{ client_id: CLIENT }], error: null };
  insertResult = { error: null };
  getUser.mockReset();
  revalidatePath.mockReset();
});

describe('setClientStatusAction', () => {
  it('rejects a status outside the allowed set before touching the db', async () => {
    signedInAsTrainer();
    expect(await setClientStatusAction(CLIENT, 'invited')).toEqual({
      error: 'That status change is not allowed.',
    });
    expect(calls.table).toBeUndefined();
  });

  it('rejects a non-trainer session', async () => {
    getUser.mockResolvedValue({ data: { user: { id: CLIENT, role: 'client' } } });
    expect(await setClientStatusAction(CLIENT, 'paused')).toEqual({
      error: 'You need to sign in as a coach.',
    });
  });

  it('writes status scoped to the session trainer + client and revalidates', async () => {
    signedInAsTrainer();
    const r = await setClientStatusAction(CLIENT, 'archived');
    expect(r).toEqual({ ok: true });
    expect(calls.table).toBe('trainer_clients');
    expect(calls.update).toEqual({ status: 'archived' });
    expect(calls.eqs).toContainEqual(['trainer_id', TRAINER]);
    expect(calls.eqs).toContainEqual(['client_id', CLIENT]);
    expect(revalidatePath).toHaveBeenCalledWith('/coach/clients');
    expect(revalidatePath).toHaveBeenCalledWith(`/coach/clients/${CLIENT}`);
  });

  it('reports when no row matched (wrong trainer)', async () => {
    signedInAsTrainer();
    selectResult = { data: [], error: null };
    expect(await setClientStatusAction(CLIENT, 'paused')).toEqual({
      error: 'We couldn’t find that client.',
    });
  });
});

describe('saveClientDetailsAction', () => {
  it('persists goals/injuries/parsed tags for the session trainer', async () => {
    signedInAsTrainer();
    const r = await saveClientDetailsAction(CLIENT, {
      goals: 'Get strong',
      injuries: '',
      tags: 'strength, strength, mobility',
    });
    expect(r).toEqual({ ok: true });
    expect(calls.update).toEqual({
      goals: 'Get strong',
      injuries_notes: null,
      tags: ['strength', 'mobility'],
    });
  });
});

describe('addNoteAction', () => {
  it('rejects an empty note', async () => {
    signedInAsTrainer();
    expect(await addNoteAction(CLIENT, '   ')).toEqual({ error: 'Write a note first.' });
    expect(calls.insert).toBeUndefined();
  });

  it('inserts a note with the session trainer_id', async () => {
    signedInAsTrainer();
    const r = await addNoteAction(CLIENT, 'Progressing well');
    expect(r).toEqual({ ok: true });
    expect(calls.table).toBe('client_notes');
    expect(calls.insert).toEqual({
      trainer_id: TRAINER,
      client_id: CLIENT,
      body: 'Progressing well',
    });
  });
});

describe('registerClientFileAction', () => {
  it('refuses a storage path that is not under the session trainer/client prefix', async () => {
    signedInAsTrainer();
    const evil = `22222222-0000-0000-0000-000000000001/${CLIENT}/hack.pdf`;
    expect(await registerClientFileAction(CLIENT, 'hack.pdf', evil)).toEqual({
      error: 'That file could not be saved.',
    });
    expect(calls.insert).toBeUndefined();
  });

  it('records metadata when the prefix matches the session', async () => {
    signedInAsTrainer();
    const path = `${TRAINER}/${CLIENT}/plan.pdf`;
    const r = await registerClientFileAction(CLIENT, 'plan.pdf', path);
    expect(r).toEqual({ ok: true });
    expect(calls.table).toBe('client_files');
    expect(calls.insert).toEqual({
      trainer_id: TRAINER,
      client_id: CLIENT,
      file_name: 'plan.pdf',
      storage_path: path,
    });
  });
});
