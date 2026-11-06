import { beforeEach, describe, expect, it, vi } from 'vitest';

// Multi-table Supabase mock (same shape as workouts-actions.test.ts): each table has a FIFO queue of
// results; a chain resolves to the next result for its table. Writes are recorded for assertions.
interface Rec {
  table: string;
  op?: string;
  payload?: Record<string, unknown>;
  eqs: [string, unknown][];
}

const getUser = vi.fn();
let recs: Rec[] = [];
let results: Record<string, Array<{ data: unknown; error: unknown }>> = {};

function take(table: string) {
  return results[table]?.shift() ?? { data: null, error: null };
}

function builder(table: string) {
  const rec: Rec = { table, eqs: [] };
  recs.push(rec);
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.order = () => b;
  b.limit = () => b;
  b.eq = (col: string, val: unknown) => {
    rec.eqs.push([col, val]);
    return b;
  };
  b.maybeSingle = () => Promise.resolve(take(table));
  b.single = () => Promise.resolve(take(table));
  b.insert = (payload: Record<string, unknown>) => {
    rec.op = 'insert';
    rec.payload = payload;
    return b;
  };
  b.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(take(table)).then(resolve, reject);
  return b;
}

const supabaseMock = { auth: { getUser }, from: (table: string) => builder(table) };
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => supabaseMock }));
vi.mock('@/lib/supabase/middleware', () => ({
  roleOf: (user: { role?: string } | null) => user?.role ?? null,
}));
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

import { logBodyMetricAction, registerProgressPhotoAction } from '@/features/progress/actions';

const TRAINER = '11111111-0000-0000-0000-000000000001';
const CLIENT = '33333333-0000-0000-0000-000000000001';

const signedInAsClient = () =>
  getUser.mockResolvedValue({ data: { user: { id: CLIENT, role: 'client' } } });
const signedInAsTrainer = () =>
  getUser.mockResolvedValue({ data: { user: { id: TRAINER, role: 'trainer' } } });

const rec = (table: string) => recs.filter((r) => r.table === table);

beforeEach(() => {
  recs = [];
  results = {};
  getUser.mockReset();
  revalidatePath.mockReset();
});

describe('logBodyMetricAction', () => {
  it('inserts with trainer_id from the link and client_id from the session', async () => {
    signedInAsClient();
    results['trainer_clients'] = [
      { data: [{ trainer_id: TRAINER, status: 'active', created_at: '2026-10-01' }], error: null },
    ];
    results['body_metrics'] = [{ data: null, error: null }];

    const r = await logBodyMetricAction({ weightKg: 70.4, measuredOn: '2026-11-06' });
    expect(r).toEqual({ ok: true });

    const ins = rec('body_metrics')[0];
    expect(ins.op).toBe('insert');
    expect(ins.payload).toMatchObject({
      trainer_id: TRAINER, // from trainer_clients, never the browser
      client_id: CLIENT, // from the session
      measured_on: '2026-11-06',
      weight_kg: 70.4,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/client/progress');
  });

  it('rejects an empty entry (no values) before any write', async () => {
    signedInAsClient();
    const r = await logBodyMetricAction({});
    expect('error' in r).toBe(true);
    expect(rec('body_metrics')).toHaveLength(0);
  });

  it('rejects an out-of-range weight before any write', async () => {
    signedInAsClient();
    const r = await logBodyMetricAction({ weightKg: 999 });
    expect(r).toEqual({ error: 'Enter a weight between 0 and 500 kg.' });
    expect(rec('body_metrics')).toHaveLength(0);
  });

  it('refuses a non-client session', async () => {
    signedInAsTrainer();
    const r = await logBodyMetricAction({ weightKg: 70 });
    expect(r).toEqual({ error: 'You need to sign in as a client.' });
    expect(rec('body_metrics')).toHaveLength(0);
  });

  it('errors when the client has no coach link', async () => {
    signedInAsClient();
    results['trainer_clients'] = [{ data: [], error: null }];
    const r = await logBodyMetricAction({ weightKg: 70 });
    expect(r).toEqual({ error: 'You’re not connected to a coach yet.' });
    expect(rec('body_metrics')).toHaveLength(0);
  });
});

describe('registerProgressPhotoAction — path is re-derived from the session', () => {
  it('rejects a storage path outside the client’s own folder before touching storage', async () => {
    signedInAsClient();
    const r = await registerProgressPhotoAction({
      pose: 'front',
      storagePath: `44444444-0000-0000-0000-000000000001/front/x.jpg`, // another client's folder
    });
    expect(r).toEqual({ error: 'That photo could not be saved.' });
    expect(rec('progress_photos')).toHaveLength(0);
  });

  it('rejects an invalid pose', async () => {
    signedInAsClient();
    const r = await registerProgressPhotoAction({
      pose: 'selfie' as never,
      storagePath: `${CLIENT}/selfie/x.jpg`,
    });
    expect(r).toEqual({ error: 'That photo could not be saved.' });
    expect(rec('progress_photos')).toHaveLength(0);
  });
});
