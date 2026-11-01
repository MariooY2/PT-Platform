import { beforeEach, describe, expect, it, vi } from 'vitest';

// Records one query chain against a table, and is itself awaitable (resolves to `writeResult`) so both
// `await from().upsert(...)` and `await from().delete().eq()...` work without a terminal `.select()`.
interface Rec {
  table: string;
  op?: string;
  payload?: Record<string, unknown>;
  opts?: Record<string, unknown>;
  eqs: [string, unknown][];
}

const getUser = vi.fn();
let recs: Rec[] = [];
let profileResult: { data: unknown; error: unknown } = {
  data: { timezone: 'Asia/Beirut' },
  error: null,
};
let writeResult: { data: unknown; error: unknown } = {
  data: [{ id: 'h', client_id: '33333333-0000-0000-0000-000000000001' }],
  error: null,
};

function builder(table: string) {
  const rec: Rec = { table, eqs: [] };
  recs.push(rec);
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.order = () => b;
  b.eq = (col: string, val: unknown) => {
    rec.eqs.push([col, val]);
    return b;
  };
  b.maybeSingle = () => Promise.resolve(profileResult);
  b.insert = (payload: Record<string, unknown>) => {
    rec.op = 'insert';
    rec.payload = payload;
    return b;
  };
  b.update = (payload: Record<string, unknown>) => {
    rec.op = 'update';
    rec.payload = payload;
    return b;
  };
  b.upsert = (payload: Record<string, unknown>, opts: Record<string, unknown>) => {
    rec.op = 'upsert';
    rec.payload = payload;
    rec.opts = opts;
    return b;
  };
  b.delete = () => {
    rec.op = 'delete';
    return b;
  };
  b.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(writeResult).then(resolve, reject);
  return b;
}

const supabaseMock = {
  auth: { getUser },
  from: (table: string) => builder(table),
};

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => supabaseMock }));
vi.mock('@/lib/supabase/middleware', () => ({
  roleOf: (user: { role?: string } | null) => user?.role ?? null,
}));
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

import {
  createHabitAction,
  setHabitActiveAction,
  setHabitTickAction,
  updateHabitAction,
} from '@/features/habits/actions';

const TRAINER = '11111111-0000-0000-0000-000000000001';
const CLIENT = '33333333-0000-0000-0000-000000000001';
const HABIT = '55555555-0000-0000-0000-000000000001';

const signedInAsClient = () =>
  getUser.mockResolvedValue({ data: { user: { id: CLIENT, role: 'client' } } });
const signedInAsTrainer = () =>
  getUser.mockResolvedValue({ data: { user: { id: TRAINER, role: 'trainer' } } });

const logs = () => recs.find((r) => r.table === 'habit_logs');
const habits = () => recs.find((r) => r.table === 'habits');

beforeEach(() => {
  recs = [];
  profileResult = { data: { timezone: 'Asia/Beirut' }, error: null };
  writeResult = { data: [{ id: 'h', client_id: CLIENT }], error: null };
  getUser.mockReset();
  revalidatePath.mockReset();
});

describe('setHabitTickAction (the upsert path)', () => {
  it('upserts on (habit_id, log_date) with the session client_id and a valid date', async () => {
    signedInAsClient();
    const r = await setHabitTickAction(HABIT, true);
    expect(r).toEqual({ ok: true });

    const rec = logs()!;
    expect(rec.op).toBe('upsert');
    expect(rec.opts).toEqual({ onConflict: 'habit_id,log_date' });
    expect(rec.payload).toMatchObject({ habit_id: HABIT, client_id: CLIENT, value: 1 });
    // client_id is the session user, not an argument passed in.
    expect(rec.payload!.client_id).toBe(CLIENT);
    expect(rec.payload!.log_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(revalidatePath).toHaveBeenCalledWith('/client');
  });

  it('is idempotent: re-ticking upserts again and never throws', async () => {
    signedInAsClient();
    expect(await setHabitTickAction(HABIT, true)).toEqual({ ok: true });
    recs = [];
    expect(await setHabitTickAction(HABIT, true)).toEqual({ ok: true });
    expect(logs()!.op).toBe('upsert');
  });

  it('unticking deletes the (habit_id, log_date) row scoped to the session client', async () => {
    signedInAsClient();
    const r = await setHabitTickAction(HABIT, false);
    expect(r).toEqual({ ok: true });
    const rec = logs()!;
    expect(rec.op).toBe('delete');
    expect(rec.eqs).toContainEqual(['habit_id', HABIT]);
    expect(rec.eqs).toContainEqual(['client_id', CLIENT]);
    expect(rec.eqs.some(([c]) => c === 'log_date')).toBe(true);
  });

  it('rejects a non-client session before any write', async () => {
    signedInAsTrainer();
    expect(await setHabitTickAction(HABIT, true)).toEqual({
      error: 'You need to sign in as a client.',
    });
    expect(logs()).toBeUndefined();
  });

  it('surfaces a server error (e.g. RLS 42501) without throwing', async () => {
    signedInAsClient();
    writeResult = { data: null, error: { code: '42501' } };
    expect(await setHabitTickAction(HABIT, true)).toEqual({
      error: 'Something went wrong. Try again.',
    });
  });
});

describe('createHabitAction', () => {
  it('inserts with trainer_id from the session and the parsed target/unit', async () => {
    signedInAsTrainer();
    const r = await createHabitAction(CLIENT, { name: '8k steps', target: '8000', unit: 'steps' });
    expect(r).toEqual({ ok: true });
    const rec = habits()!;
    expect(rec.op).toBe('insert');
    expect(rec.payload).toEqual({
      trainer_id: TRAINER,
      client_id: CLIENT,
      name: '8k steps',
      target_value: 8000,
      unit: 'steps',
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/coach/clients/${CLIENT}`);
  });

  it('stores nulls when target and unit are blank', async () => {
    signedInAsTrainer();
    await createHabitAction(CLIENT, { name: 'Sleep 8h', target: '', unit: '' });
    expect(habits()!.payload).toMatchObject({ target_value: null, unit: null });
  });

  it('rejects an empty name before touching the db', async () => {
    signedInAsTrainer();
    expect(await createHabitAction(CLIENT, { name: '  ' })).toEqual({ error: 'Name the habit.' });
    expect(habits()).toBeUndefined();
  });

  it('maps an RLS denial to a not-found message', async () => {
    signedInAsTrainer();
    writeResult = { data: null, error: { code: '42501' } };
    expect(await createHabitAction(CLIENT, { name: 'Steps' })).toEqual({
      error: 'We couldn’t find that client.',
    });
  });
});

describe('updateHabitAction / setHabitActiveAction', () => {
  it('updates scoped to id + session trainer', async () => {
    signedInAsTrainer();
    const r = await updateHabitAction(HABIT, { name: 'Water', target: '2', unit: 'L' });
    expect(r).toEqual({ ok: true });
    const rec = habits()!;
    expect(rec.op).toBe('update');
    expect(rec.payload).toEqual({ name: 'Water', target_value: 2, unit: 'L' });
    expect(rec.eqs).toContainEqual(['id', HABIT]);
    expect(rec.eqs).toContainEqual(['trainer_id', TRAINER]);
  });

  it('reports not-found when no row matched (wrong trainer)', async () => {
    signedInAsTrainer();
    writeResult = { data: [], error: null };
    expect(await updateHabitAction(HABIT, { name: 'Water' })).toEqual({
      error: 'We couldn’t find that habit.',
    });
  });

  it('deactivates a habit scoped to the session trainer', async () => {
    signedInAsTrainer();
    const r = await setHabitActiveAction(HABIT, false);
    expect(r).toEqual({ ok: true });
    const rec = habits()!;
    expect(rec.op).toBe('update');
    expect(rec.payload).toEqual({ active: false });
    expect(rec.eqs).toContainEqual(['trainer_id', TRAINER]);
  });
});
