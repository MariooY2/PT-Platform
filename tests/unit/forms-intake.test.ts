import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { resolveIntakeGate } from '@/features/forms/intake';

const TRAINER = '11111111-0000-0000-0000-000000000001';
const CLIENT = '33333333-0000-0000-0000-000000000001';

type Result = { data: unknown; error: unknown };

/**
 * Build a Supabase stub that returns a scripted result per table. The chain methods all return the
 * same thenable so `await supabase.from(t)...` resolves to `tables[t]`; maybeSingle/single resolve
 * `singles[t]`; insert records its payload and resolves `singles[t]`.
 */
function makeSupabase(cfg: {
  tables?: Record<string, Result>;
  singles?: Record<string, Result>;
  onInsert?: (table: string, payload: unknown) => void;
}) {
  const from = vi.fn((table: string) => {
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.eq = () => b;
    b.order = () => b;
    b.insert = (payload: unknown) => {
      cfg.onInsert?.(table, payload);
      return b;
    };
    b.maybeSingle = () => Promise.resolve(cfg.singles?.[table] ?? { data: null, error: null });
    b.single = () => Promise.resolve(cfg.singles?.[table] ?? { data: null, error: null });
    b.then = (resolve: (r: Result) => unknown) =>
      resolve(cfg.tables?.[table] ?? { data: [], error: null });
    return b;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from } as any;
}

describe('resolveIntakeGate', () => {
  it('fails open (no redirect) when the client has no trainer link', async () => {
    const supabase = makeSupabase({ tables: { trainer_clients: { data: [], error: null } } });
    expect(await resolveIntakeGate(supabase, CLIENT)).toEqual({ redirectTo: null });
  });

  it('lets a client through once a submitted intake exists', async () => {
    const supabase = makeSupabase({
      tables: {
        trainer_clients: { data: [{ trainer_id: TRAINER, status: 'active' }], error: null },
        form_responses: { data: [{ id: 'r1', submitted_at: '2026-01-01T00:00:00Z' }], error: null },
      },
      singles: { forms: { data: { id: 'intake1' }, error: null } },
    });
    expect(await resolveIntakeGate(supabase, CLIENT)).toEqual({ redirectTo: null });
  });

  it('redirects to an existing unsubmitted response', async () => {
    const supabase = makeSupabase({
      tables: {
        trainer_clients: { data: [{ trainer_id: TRAINER, status: 'active' }], error: null },
        form_responses: { data: [{ id: 'pending1', submitted_at: null }], error: null },
      },
      singles: { forms: { data: { id: 'intake1' }, error: null } },
    });
    expect(await resolveIntakeGate(supabase, CLIENT)).toEqual({
      redirectTo: '/client/checkin/pending1',
    });
  });

  it('creates a response and redirects to it when none exists', async () => {
    const inserts: Array<{ table: string; payload: unknown }> = [];
    const supabase = makeSupabase({
      tables: {
        trainer_clients: { data: [{ trainer_id: TRAINER, status: 'active' }], error: null },
        form_responses: { data: [], error: null },
      },
      singles: {
        forms: { data: { id: 'intake1' }, error: null },
        form_responses: { data: { id: 'created1' }, error: null },
      },
      onInsert: (table, payload) => inserts.push({ table, payload }),
    });
    const r = await resolveIntakeGate(supabase, CLIENT);
    expect(r).toEqual({ redirectTo: '/client/checkin/created1' });
    expect(inserts[0]?.table).toBe('form_responses');
    expect(inserts[0]?.payload).toMatchObject({
      form_id: 'intake1',
      trainer_id: TRAINER,
      client_id: CLIENT,
    });
  });
});
