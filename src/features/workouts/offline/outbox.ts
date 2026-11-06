import type { LogSetInput } from '../schemas';
import type { OutboxDb, OutboxSetLog } from './db';

/** What `logSetAction` resolves to. Kept structural so this module never imports the server action
 * (which pulls server-only code and would break the node unit tests). */
export type LogSetResult = { ok: true; setLogId: string; prTypes: string[] } | { error: string };

/** Posts one queued set to the server. In the app this is bound to the idempotent `logSetAction`. */
export type SetLogPoster = (input: LogSetInput) => Promise<LogSetResult>;

export type SyncState = 'idle' | 'pending' | 'failed';

/** A row is "repeatedly failed" (→ the warning indicator) once it has missed this many flushes. */
const FAILED_THRESHOLD = 2;

export interface FlushSummary {
  synced: string[];
  failed: string[];
}

/**
 * Enqueue a set-log write. Idempotent on clientGeneratedId: logging, editing or undoing the same set
 * overwrites its one row and bumps `seq`, so the outbox holds at most one pending write per set.
 */
export async function enqueue(db: OutboxDb, input: LogSetInput): Promise<void> {
  const existing = await db.setLogOutbox.get(input.clientGeneratedId);
  await db.setLogOutbox.put({
    clientGeneratedId: input.clientGeneratedId,
    input,
    status: 'pending',
    attempts: 0,
    seq: (existing?.seq ?? 0) + 1,
    updatedAt: Date.now(),
  });
}

/** Everything still waiting to sync (pending + failed are both "in the outbox"). */
export function listPending(db: OutboxDb): Promise<OutboxSetLog[]> {
  return db.setLogOutbox.toArray();
}

/** Derive the SyncIndicator state from the real outbox rows. */
export function deriveSyncState(rows: OutboxSetLog[]): SyncState {
  if (rows.length === 0) return 'idle';
  if (rows.some((r) => r.status === 'failed' && r.attempts >= FAILED_THRESHOLD)) return 'failed';
  return 'pending';
}

/**
 * Post every queued set through `post`. On success the row is removed (guarded so a set re-logged
 * mid-flight is kept, not dropped). On any failure — a server rejection or a thrown/offline fetch — the
 * row is kept and marked failed so the next reconnect retries it. Because `post` is the idempotent
 * upsert-on-client_generated_id, a double flush or a server retry never writes the set twice.
 *
 * `onResult` fires per attempted row (success or server rejection) so the player can read the server's
 * PR decision for a set it just logged. It does not fire for thrown/offline attempts.
 */
export async function flush(
  db: OutboxDb,
  post: SetLogPoster,
  onResult?: (clientGeneratedId: string, result: LogSetResult) => void,
): Promise<FlushSummary> {
  const summary: FlushSummary = { synced: [], failed: [] };
  const rows = await listPending(db);

  for (const row of rows) {
    let result: LogSetResult;
    try {
      result = await post(row.input);
    } catch {
      // Offline / network error: keep the row, mark it failed, retry on the next flush.
      await markFailed(db, row);
      summary.failed.push(row.clientGeneratedId);
      continue;
    }

    if ('ok' in result) {
      // Delete only if this is still the row we posted (no re-log happened meanwhile).
      await db.transaction('rw', db.setLogOutbox, async () => {
        const current = await db.setLogOutbox.get(row.clientGeneratedId);
        if (current && current.seq === row.seq) await db.setLogOutbox.delete(row.clientGeneratedId);
      });
      summary.synced.push(row.clientGeneratedId);
    } else {
      await markFailed(db, row);
      summary.failed.push(row.clientGeneratedId);
    }
    onResult?.(row.clientGeneratedId, result);
  }

  return summary;
}

async function markFailed(db: OutboxDb, row: OutboxSetLog): Promise<void> {
  await db.setLogOutbox
    .where('clientGeneratedId')
    .equals(row.clientGeneratedId)
    .modify((r) => {
      // Skip if a newer enqueue replaced the row we read (its seq moved on).
      if (r.seq !== row.seq) return;
      r.status = 'failed';
      r.attempts += 1;
      r.updatedAt = Date.now();
    });
}
