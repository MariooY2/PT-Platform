import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the server Supabase client, the role helper and Next's cache so the actions run in node.
const getUser = vi.fn();

type Result = { data: unknown; error: unknown };
const arrayResults: Record<string, Result> = {};
const singleResults: Record<string, Result> = {};
const calls: Array<{
  table: string;
  insert?: unknown;
  update?: unknown;
  deleted?: boolean;
  eqs: [string, unknown][];
}> = [];

function builder(table: string) {
  const rec = { table, eqs: [] as [string, unknown][] };
  calls.push(rec);
  const b: Record<string, unknown> = {};
  b.insert = (p: unknown) => {
    (rec as { insert?: unknown }).insert = p;
    return b;
  };
  b.update = (p: unknown) => {
    (rec as { update?: unknown }).update = p;
    return b;
  };
  b.delete = () => {
    (rec as { deleted?: boolean }).deleted = true;
    return b;
  };
  b.eq = (c: string, v: unknown) => {
    rec.eqs.push([c, v]);
    return b;
  };
  b.order = () => b;
  b.select = () => b;
  b.maybeSingle = () => Promise.resolve(singleResults[table] ?? { data: null, error: null });
  b.single = () => Promise.resolve(singleResults[table] ?? { data: null, error: null });
  b.then = (resolve: (r: Result) => unknown) =>
    resolve(arrayResults[table] ?? { data: [], error: null });
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
  createFormAction,
  deleteFormAction,
  replyToResponseAction,
  saveFormAction,
  submitResponseAction,
} from '@/features/forms/actions';

const TRAINER = '11111111-0000-0000-0000-000000000001';
const CLIENT = '33333333-0000-0000-0000-000000000001';

const asTrainer = () =>
  getUser.mockResolvedValue({ data: { user: { id: TRAINER, role: 'trainer' } } });
const asClient = () =>
  getUser.mockResolvedValue({ data: { user: { id: CLIENT, role: 'client' } } });

beforeEach(() => {
  calls.length = 0;
  for (const k of Object.keys(arrayResults)) delete arrayResults[k];
  for (const k of Object.keys(singleResults)) delete singleResults[k];
  getUser.mockReset();
  revalidatePath.mockReset();
});

describe('createFormAction', () => {
  it('rejects a non-trainer', async () => {
    asClient();
    expect(await createFormAction({ title: 'Mine', kind: 'checkin' })).toEqual({
      ok: false,
      error: 'Only coaches can manage forms.',
    });
    expect(calls).toHaveLength(0);
  });

  it('inserts a form with the session trainer_id and a starter question', async () => {
    asTrainer();
    singleResults['forms'] = { data: { id: 'f1' }, error: null };
    const r = await createFormAction({ title: 'Monthly review', kind: 'checkin' });
    expect(r).toEqual({ ok: true, id: 'f1' });
    const insert = calls[0]?.insert as Record<string, unknown>;
    expect(insert.trainer_id).toBe(TRAINER);
    expect(insert.kind).toBe('checkin');
    expect(insert.is_default).toBe(false);
    expect(Array.isArray(insert.questions)).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith('/coach/forms');
  });
});

describe('saveFormAction', () => {
  it('rejects an invalid questions payload before writing', async () => {
    asTrainer();
    const r = await saveFormAction('f1', { title: 'Intake', questions: [] });
    expect(r.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('writes title + questions scoped to the session trainer', async () => {
    asTrainer();
    arrayResults['forms'] = { data: [{ id: 'f1' }], error: null };
    const r = await saveFormAction('f1', {
      title: 'Intake',
      questions: [{ id: 'q1', type: 'text', label: 'Name', required: true }],
    });
    expect(r).toEqual({ ok: true });
    expect(calls[0]?.update).toMatchObject({ title: 'Intake' });
    expect(calls[0]?.eqs).toContainEqual(['trainer_id', TRAINER]);
  });

  it('reports when no row matched (wrong owner)', async () => {
    asTrainer();
    arrayResults['forms'] = { data: [], error: null };
    const r = await saveFormAction('f1', {
      title: 'Intake',
      questions: [{ id: 'q1', type: 'text', label: 'Name', required: true }],
    });
    expect(r).toEqual({ ok: false, error: 'We couldn’t find that form.' });
  });
});

describe('deleteFormAction', () => {
  it('refuses to delete a default form (no matching non-default row)', async () => {
    asTrainer();
    arrayResults['forms'] = { data: [], error: null };
    const r = await deleteFormAction('f1');
    expect(r).toEqual({ ok: false, error: 'Default forms can’t be deleted.' });
    expect(calls[0]?.eqs).toContainEqual(['is_default', false]);
  });
});

describe('submitResponseAction', () => {
  it('flags missing required answers and does not submit', async () => {
    asClient();
    singleResults['form_responses'] = {
      data: {
        id: 'r1',
        submitted_at: null,
        form: {
          kind: 'intake',
          questions: [{ id: 'goals', type: 'long_text', label: 'Goals', required: true }],
        },
      },
      error: null,
    };
    const r = await submitResponseAction('r1', {});
    expect(r).toEqual({ ok: false, error: 'Answer the required questions before sending.' });
    // only the load happened, no update
    expect(calls.filter((c) => c.update)).toHaveLength(0);
  });

  it('submits a valid intake and reports its kind', async () => {
    asClient();
    singleResults['form_responses'] = {
      data: {
        id: 'r1',
        submitted_at: null,
        form: {
          kind: 'intake',
          questions: [{ id: 'goals', type: 'long_text', label: 'Goals', required: true }],
        },
      },
      error: null,
    };
    arrayResults['form_responses'] = { data: [{ id: 'r1' }], error: null };
    const r = await submitResponseAction('r1', { goals: 'get strong' });
    expect(r).toEqual({ ok: true, kind: 'intake' });
    const update = calls.find((c) => c.update)?.update as Record<string, unknown>;
    expect(update.submitted_at).toBeTypeOf('string');
    expect(update.answers).toEqual({ goals: 'get strong' });
    expect(revalidatePath).toHaveBeenCalledWith('/client');
  });

  it('refuses to re-submit an already submitted response', async () => {
    asClient();
    singleResults['form_responses'] = {
      data: {
        id: 'r1',
        submitted_at: '2026-01-01T00:00:00Z',
        form: { kind: 'checkin', questions: [] },
      },
      error: null,
    };
    const r = await submitResponseAction('r1', {});
    expect(r).toEqual({ ok: false, error: 'This check-in is already sent.' });
  });
});

describe('replyToResponseAction', () => {
  it('rejects an empty reply', async () => {
    asTrainer();
    const r = await replyToResponseAction('r1', '   ');
    expect(r).toEqual({ ok: false, error: 'Write a reply first.' });
    expect(calls).toHaveLength(0);
  });

  it('writes the reply + reviewed_at scoped to the session trainer', async () => {
    asTrainer();
    arrayResults['form_responses'] = { data: [{ id: 'r1' }], error: null };
    const r = await replyToResponseAction('r1', 'Nice work this week.');
    expect(r).toEqual({ ok: true });
    const update = calls[0]?.update as Record<string, unknown>;
    expect(update.coach_reply).toBe('Nice work this week.');
    expect(update.reviewed_at).toBeTypeOf('string');
    expect(calls[0]?.eqs).toContainEqual(['trainer_id', TRAINER]);
    expect(revalidatePath).toHaveBeenCalledWith('/coach/checkins');
  });
});
