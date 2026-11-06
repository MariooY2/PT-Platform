import Dexie, { type Table } from 'dexie';
import type { LogSetInput } from '../schemas';

/**
 * One queued set-log write, waiting to reach the server. Keyed by `clientGeneratedId` so re-logging the
 * same set (edit / undo) overwrites its own row rather than stacking — the same id the server upserts
 * on, so a flush (or a replay) never creates a duplicate set_log (P1-07 idempotency).
 *
 * `seq` is a per-row version bumped on every enqueue. The flush captures it before posting and only
 * deletes the row if it is still the one it posted; a concurrent re-log (new `seq`) is kept for the
 * next flush instead of being silently dropped.
 */
export interface OutboxSetLog {
  clientGeneratedId: string;
  input: LogSetInput;
  status: 'pending' | 'failed';
  attempts: number;
  seq: number;
  updatedAt: number;
}

export class OutboxDb extends Dexie {
  // Primary key is clientGeneratedId; the whole payload rides along in `input`.
  setLogOutbox!: Table<OutboxSetLog, string>;

  constructor(name = 'pt-offline') {
    super(name);
    this.version(1).stores({ setLogOutbox: 'clientGeneratedId, status' });
  }
}

// Lazily created so importing this module during SSR (the player is a client component but still renders
// on the server) never touches indexedDB. The browser and the unit tests (fake-indexeddb) construct it
// on first use.
let singleton: OutboxDb | null = null;
export function getOutboxDb(): OutboxDb {
  if (!singleton) singleton = new OutboxDb();
  return singleton;
}
