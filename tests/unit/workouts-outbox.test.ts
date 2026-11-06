import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OutboxDb, type OutboxSetLog } from '@/features/workouts/offline/db';
import {
  deriveSyncState,
  enqueue,
  flush,
  listPending,
  type LogSetResult,
} from '@/features/workouts/offline/outbox';
import type { LogSetInput } from '@/features/workouts/schemas';

function makeInput(clientGeneratedId: string, completed = true): LogSetInput {
  return {
    workoutLogId: '11111111-1111-1111-1111-111111111111',
    workoutExerciseId: '22222222-2222-2222-2222-222222222222',
    setNumber: 1,
    reps: 5,
    weightKg: 80,
    rpe: null,
    completed,
    clientGeneratedId,
  };
}

// A server stand-in with the same guarantee as logSetAction: upsert onConflict client_generated_id, so
// writing the same id twice overwrites one row instead of inserting a duplicate.
function makeServer() {
  const store = new Map<string, LogSetInput>();
  const calls: string[] = [];
  const post = async (input: LogSetInput): Promise<LogSetResult> => {
    calls.push(input.clientGeneratedId);
    store.set(input.clientGeneratedId, input);
    return { ok: true, setLogId: input.clientGeneratedId, prTypes: [] };
  };
  return { post, store, calls };
}

let db: OutboxDb;
beforeEach(() => {
  db = new OutboxDb(`outbox-test-${Math.random().toString(36).slice(2)}`);
});
afterEach(async () => {
  await db.delete();
});

describe('set-log outbox', () => {
  it('outbox flush is idempotent on client_generated_id', async () => {
    const server = makeServer();
    const cgid = 'aaaaaaaa-0000-0000-0000-000000000001';

    await enqueue(db, makeInput(cgid));
    expect(await listPending(db)).toHaveLength(1);

    // First flush posts it and clears it on success.
    await flush(db, server.post);
    expect(await listPending(db)).toHaveLength(0);
    expect(server.store.size).toBe(1);

    // Re-log the same set (an edit) and flush again — a replay through the same id.
    await enqueue(db, makeInput(cgid, false));
    await flush(db, server.post);

    // The server was posted twice, but there is still exactly one set_log for the id (no duplicate).
    expect(server.calls).toHaveLength(2);
    expect(server.store.size).toBe(1);
    expect(await listPending(db)).toHaveLength(0);

    // A further flush with nothing pending does not write again.
    await flush(db, server.post);
    expect(server.calls).toHaveLength(2);
    expect(server.store.size).toBe(1);
  });

  it('keeps and marks failed when the server rejects or the network throws', async () => {
    const cgid1 = 'bbbbbbbb-0000-0000-0000-000000000001';
    const cgid2 = 'bbbbbbbb-0000-0000-0000-000000000002';
    await enqueue(db, makeInput(cgid1));
    await enqueue(db, makeInput(cgid2));

    const post = async (input: LogSetInput): Promise<LogSetResult> => {
      if (input.clientGeneratedId === cgid1) throw new Error('offline'); // a dead connection
      return { error: 'Something went wrong. Try again.' }; // a server rejection
    };

    await flush(db, post);
    const rows = await listPending(db);
    expect(rows).toHaveLength(2); // both kept — nothing is lost
    expect(rows.every((r) => r.status === 'failed')).toBe(true);
    expect(rows.every((r) => r.attempts === 1)).toBe(true);

    // Repeated failure → the warning state.
    await flush(db, post);
    const rows2 = await listPending(db);
    expect(rows2.every((r) => r.attempts === 2)).toBe(true);
    expect(deriveSyncState(rows2)).toBe('failed');
  });

  it('a set re-logged mid-flight is not dropped by the flush', async () => {
    const cgid = 'cccccccc-0000-0000-0000-000000000001';
    await enqueue(db, makeInput(cgid, true));

    // Post succeeds, but between reading the row and deleting it the user re-logs the set (undo).
    const post = async (): Promise<LogSetResult> => {
      await enqueue(db, makeInput(cgid, false)); // bumps seq
      return { ok: true, setLogId: cgid, prTypes: [] };
    };
    await flush(db, post);

    // The newer write is still queued (its seq changed), so the undo will sync on the next flush.
    const rows = await listPending(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.input.completed).toBe(false);
  });

  it('derives the sync state from the real outbox rows', () => {
    const row = (over: Partial<OutboxSetLog>): OutboxSetLog => ({
      clientGeneratedId: 'x',
      input: makeInput('x'),
      status: 'pending',
      attempts: 0,
      seq: 1,
      updatedAt: 0,
      ...over,
    });
    expect(deriveSyncState([])).toBe('idle');
    expect(deriveSyncState([row({})])).toBe('pending');
    expect(deriveSyncState([row({ status: 'failed', attempts: 1 })])).toBe('pending');
    expect(deriveSyncState([row({ status: 'failed', attempts: 2 })])).toBe('failed');
  });
});
