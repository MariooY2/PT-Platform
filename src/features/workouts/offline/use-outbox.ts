'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import type { LogSetInput } from '../schemas';
import { getOutboxDb } from './db';
import {
  deriveSyncState,
  enqueue,
  flush,
  listPending,
  type LogSetResult,
  type SetLogPoster,
  type SyncState,
} from './outbox';

/** How often to retry while anything is still queued (reconnect also triggers an immediate flush). */
const RETRY_INTERVAL_MS = 15_000;

export type SubmitOutcome =
  { kind: 'synced'; result: Extract<LogSetResult, { ok: true }> } | { kind: 'queued' };

/**
 * Routes a set-log write through the IndexedDB outbox and keeps the SyncIndicator state live.
 *
 * `submit` enqueues immediately (so the write survives a reload or a dead connection) and, when online,
 * flushes it straight through `post` (the idempotent `logSetAction`). It returns `synced` with the
 * server's result (for the PR badge) or `queued` when the write is held for a later reconnect. A queued
 * or failed write is never lost and never reverts the UI — that is the point of offline logging.
 *
 * The indicator state comes from a Dexie `liveQuery` subscription, so it reflects the real outbox
 * without the hook poking setState from the effect body. Flushes are serialized through a promise
 * chain and also run on mount (a reload while offline leaves rows behind), on the `online` event, and
 * on an interval while the outbox is non-empty.
 */
export function useSetLogOutbox(post: SetLogPoster): {
  state: SyncState;
  submit: (input: LogSetInput) => Promise<SubmitOutcome>;
} {
  const [state, setState] = useState<SyncState>('idle');
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());

  // Serialize flushes so a stale-delete can't race a concurrent re-log; never rejects.
  const runFlush = useCallback(
    (onResult?: (id: string, result: LogSetResult) => void): Promise<unknown> => {
      const run = chainRef.current
        .then(() => flush(getOutboxDb(), post, onResult))
        .catch(() => undefined);
      chainRef.current = run;
      return run;
    },
    [post],
  );

  const submit = useCallback(
    async (input: LogSetInput): Promise<SubmitOutcome> => {
      await enqueue(getOutboxDb(), input);

      // Offline: hold it for reconnect; the indicator now shows "Saved on this phone".
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return { kind: 'queued' };
      }

      let outcome: SubmitOutcome = { kind: 'queued' };
      await runFlush((id, result) => {
        if (id === input.clientGeneratedId && 'ok' in result) {
          outcome = { kind: 'synced', result };
        }
      });
      return outcome;
    },
    [runFlush],
  );

  useEffect(() => {
    // Live view of the outbox → indicator state. setState only ever fires from this callback.
    const sub = liveQuery(() => listPending(getOutboxDb())).subscribe({
      next: (rows) => setState(deriveSyncState(rows)),
      error: () => {},
    });
    void runFlush(); // drain anything left from a previous (possibly offline) session
    const onOnline = () => void runFlush();
    window.addEventListener('online', onOnline);
    const id = window.setInterval(() => {
      if (typeof navigator === 'undefined' || navigator.onLine) void runFlush();
    }, RETRY_INTERVAL_MS);
    return () => {
      sub.unsubscribe();
      window.removeEventListener('online', onOnline);
      window.clearInterval(id);
    };
  }, [runFlush]);

  return { state, submit };
}
