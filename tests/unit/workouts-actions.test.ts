import { beforeEach, describe, expect, it, vi } from 'vitest';
import { todayFor } from '@/features/habits/lib';

// Multi-table Supabase mock. Each table has a FIFO queue of results; a query chain resolves to the
// next result for its table (via .single/.maybeSingle or by awaiting). Every chain is recorded so a
// test can assert the write op, its on-conflict option, payload, and the ORDER of table access.
interface Rec {
  table: string;
  op?: string;
  payload?: Record<string, unknown>;
  opts?: Record<string, unknown>;
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
  b.not = () => b;
  b.in = () => b;
  b.neq = () => b;
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

import { finishWorkoutAction, logSetAction, startWorkoutAction } from '@/features/workouts/actions';

const TRAINER = '11111111-0000-0000-0000-000000000001';
const CLIENT = '33333333-0000-0000-0000-000000000001';
const PROGRAM = 'bbbb0000-0000-0000-0000-000000000011';
const PW = 'bbbb0000-0000-0000-0000-000000000012';
const WEX = 'bbbb0000-0000-0000-0000-000000000013';
const LOG = 'dddd0000-0000-0000-0000-000000000099';
const CGID = 'eeee0000-0000-0000-0000-000000000001';

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

describe('logSetAction — idempotent on-conflict write (never read-then-insert)', () => {
  const input = {
    workoutLogId: LOG,
    workoutExerciseId: WEX,
    setNumber: 1,
    reps: 5,
    weightKg: 80,
    rpe: 8,
    completed: true,
    clientGeneratedId: CGID,
  };

  it('derives the exercise server-side and upserts on client_generated_id', async () => {
    signedInAsClient();
    results['workout_exercises'] = [{ data: { exercise_id: 'ex-1' }, error: null }];
    results['set_logs'] = [{ data: { id: 'sl-1' }, error: null }];
    results['personal_records'] = [{ data: [{ type: 'e1rm' }], error: null }];

    const r = await logSetAction(input);
    expect(r).toEqual({ ok: true, setLogId: 'sl-1', prTypes: ['e1rm'] });

    const setLogRecs = rec('set_logs');
    expect(setLogRecs).toHaveLength(1); // exactly one set_logs interaction …
    expect(setLogRecs[0].op).toBe('upsert'); // … and it is the upsert (no prior select)
    expect(setLogRecs[0].opts).toEqual({ onConflict: 'client_generated_id' });
    expect(setLogRecs[0].payload).toMatchObject({
      workout_log_id: LOG,
      workout_exercise_id: WEX,
      exercise_id: 'ex-1', // from workout_exercises, not the browser
      set_number: 1,
      reps: 5,
      weight_kg: 80,
      rpe: 8,
      completed: true,
      client_generated_id: CGID,
    });
  });

  it('rejects an out-of-range rpe before any write', async () => {
    signedInAsClient();
    const r = await logSetAction({ ...input, rpe: 12 });
    expect('error' in r).toBe(true);
    expect(rec('set_logs')).toHaveLength(0);
  });

  it('rejects a non-client session before any write', async () => {
    signedInAsTrainer();
    const r = await logSetAction(input);
    expect(r).toEqual({ error: 'You need to sign in as a client.' });
    expect(rec('set_logs')).toHaveLength(0);
    expect(rec('workout_exercises')).toHaveLength(0);
  });
});

describe('startWorkoutAction — pins trainer from the program, idempotent', () => {
  const copyToday = () => {
    const today = todayFor('Asia/Beirut');
    return {
      id: PROGRAM,
      title: 'Sample 3-Day Strength',
      trainer_id: TRAINER,
      start_date: today,
      program_workouts: [{ id: PW, week: 1, day: 1 }],
    };
  };

  it('resumes an existing log for the same workout + date', async () => {
    signedInAsClient();
    results['profiles'] = [{ data: { timezone: 'Asia/Beirut' }, error: null }];
    results['programs'] = [{ data: [copyToday()], error: null }];
    results['workout_logs'] = [{ data: [{ id: 'existing-log' }], error: null }];

    const r = await startWorkoutAction({ programWorkoutId: PW, clientGeneratedId: CGID });
    expect(r).toEqual({ ok: true, logId: 'existing-log' });
    expect(rec('workout_logs').some((x) => x.op === 'upsert')).toBe(false); // resumed, not created
  });

  it('creates a log with trainer_id from the program and upserts on client_generated_id', async () => {
    signedInAsClient();
    results['profiles'] = [{ data: { timezone: 'Asia/Beirut' }, error: null }];
    results['programs'] = [{ data: [copyToday()], error: null }];
    results['workout_logs'] = [
      { data: [], error: null }, // no existing log
      { data: { id: 'new-log' }, error: null }, // the upsert
    ];

    const r = await startWorkoutAction({ programWorkoutId: PW, clientGeneratedId: CGID });
    expect(r).toEqual({ ok: true, logId: 'new-log' });

    const upsert = rec('workout_logs').find((x) => x.op === 'upsert')!;
    expect(upsert.opts).toEqual({ onConflict: 'client_generated_id' });
    expect(upsert.payload).toMatchObject({
      client_id: CLIENT,
      trainer_id: TRAINER, // from the program, never the browser
      assignment_id: PROGRAM,
      program_workout_id: PW,
      status: 'in_progress',
      client_generated_id: CGID,
    });
  });

  it('refuses a workout that is not scheduled today', async () => {
    signedInAsClient();
    results['profiles'] = [{ data: { timezone: 'Asia/Beirut' }, error: null }];
    results['programs'] = [{ data: [], error: null }]; // nothing scheduled
    const r = await startWorkoutAction({ programWorkoutId: PW, clientGeneratedId: CGID });
    expect(r).toEqual({ error: 'That workout isn’t scheduled for today.' });
  });
});

describe('finishWorkoutAction', () => {
  it('marks the log completed with the session RPE, scoped to id + session client', async () => {
    signedInAsClient();
    results['workout_logs'] = [{ data: [{ id: LOG }], error: null }];

    const r = await finishWorkoutAction({ workoutLogId: LOG, sessionRpe: 8 });
    expect(r).toEqual({ ok: true });

    const upd = rec('workout_logs')[0];
    expect(upd.op).toBe('update');
    expect(upd.payload).toMatchObject({ status: 'completed', session_rpe: 8 });
    expect(upd.payload!.completed_at).toEqual(expect.any(String));
    expect(upd.eqs).toContainEqual(['id', LOG]);
    expect(upd.eqs).toContainEqual(['client_id', CLIENT]);
  });

  it('reports not-found when no row matched', async () => {
    signedInAsClient();
    results['workout_logs'] = [{ data: [], error: null }];
    const r = await finishWorkoutAction({ workoutLogId: LOG, sessionRpe: 8 });
    expect(r).toEqual({ error: 'We couldn’t find that workout.' });
  });
});
