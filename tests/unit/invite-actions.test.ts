import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- mocks ---------------------------------------------------------------
const getUser = vi.fn();

type Op = { m: string; args: unknown[] };
interface Recorded {
  table: string;
  ops: Op[];
}
const queries: Recorded[] = [];

// Per-test configurable responses for each kind of query the actions run.
const responses = {
  existingSingle: { data: [] as unknown[], error: null as unknown },
  existingImport: { data: [] as { invite_email: string }[], error: null as unknown },
  insert: { data: { invite_token: 'generated-token' } as unknown, error: null as unknown },
  trainer: { data: { business_name: 'Rami Fitness' } as unknown, error: null as unknown },
};

function resolveQuery(q: Recorded) {
  const has = (m: string) => q.ops.some((o) => o.m === m);
  if (q.table === 'trainers') return responses.trainer;
  if (q.table === 'trainer_clients' && has('insert')) return responses.insert;
  if (q.table === 'trainer_clients' && has('in')) return responses.existingImport;
  if (q.table === 'trainer_clients' && has('limit')) return responses.existingSingle;
  return { data: null, error: null };
}

function builder(record: Recorded) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'limit', 'insert', 'single', 'maybeSingle', 'order']) {
    b[m] = (...args: unknown[]) => {
      record.ops.push({ m, args });
      return b;
    };
  }
  // Thenable so `await` at any depth resolves to the configured result.
  b.then = (resolve: (v: unknown) => void) => resolve(resolveQuery(record));
  return b;
}

const supabaseMock = {
  auth: { getUser },
  from: (table: string) => {
    const record: Recorded = { table, ops: [] };
    queries.push(record);
    return builder(record);
  },
};

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => supabaseMock }));
vi.mock('@/lib/supabase/middleware', () => ({
  roleOf: (user: { role?: string } | null) => user?.role ?? null,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const send = vi.fn().mockResolvedValue({ ok: true, id: 'email-id' });
vi.mock('@/lib/email', () => ({
  getEmailProvider: () => ({ name: 'mock', send }),
  renderInviteEmail: vi.fn().mockResolvedValue({ subject: 'S', html: '<p>H</p>', text: 'T' }),
}));

import { createInviteAction, importClientsCsvAction } from '@/features/clients/invite-actions';

const TRAINER = '11111111-0000-0000-0000-000000000001';

function signedInAsTrainer() {
  getUser.mockResolvedValue({ data: { user: { id: TRAINER, role: 'trainer' } } });
}

function insertPayloadFor(table: string): Record<string, unknown> {
  const q = queries.find((x) => x.table === table && x.ops.some((o) => o.m === 'insert'));
  const op = q?.ops.find((o) => o.m === 'insert');
  return (op?.args[0] ?? {}) as Record<string, unknown>;
}

beforeEach(() => {
  queries.length = 0;
  getUser.mockReset();
  send.mockClear();
  responses.existingSingle = { data: [], error: null };
  responses.existingImport = { data: [], error: null };
  responses.insert = { data: { invite_token: 'generated-token' }, error: null };
  responses.trainer = { data: { business_name: 'Rami Fitness' }, error: null };
});

describe('createInviteAction', () => {
  it('rejects a non-trainer session before touching the table', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'x', role: 'client' } } });
    expect(await createInviteAction('maya@example.com', 'link')).toEqual({
      error: 'You need to sign in as a coach.',
    });
    expect(queries).toHaveLength(0);
  });

  it('rejects a malformed email with a specific message', async () => {
    signedInAsTrainer();
    const res = await createInviteAction('nope', 'link');
    expect(res).toEqual({ error: 'Enter a valid email address.' });
  });

  it('creates an invited/invite row with the session trainer_id and a token, never client_id', async () => {
    signedInAsTrainer();
    const res = await createInviteAction('  Maya@Example.com ', 'link');
    expect(res).toEqual({
      ok: true,
      email: 'maya@example.com',
      token: 'generated-token',
      emailed: false,
    });

    const payload = insertPayloadFor('trainer_clients');
    expect(payload.trainer_id).toBe(TRAINER);
    expect(payload.invite_email).toBe('maya@example.com');
    expect(payload.status).toBe('invited');
    expect(payload.source).toBe('invite');
    expect(typeof payload.invite_token).toBe('string');
    expect('client_id' in payload).toBe(false);
    // Link mode never sends an email.
    expect(send).not.toHaveBeenCalled();
  });

  it('returns a specific message for a duplicate email, without inserting', async () => {
    signedInAsTrainer();
    responses.existingSingle = { data: [{ id: 'existing' }], error: null };
    const res = await createInviteAction('maya@example.com', 'link');
    expect(res).toEqual({ error: 'maya@example.com is already on your client list.' });
    expect(queries.some((q) => q.ops.some((o) => o.m === 'insert'))).toBe(false);
  });

  it('sends the invite through the email provider in email mode', async () => {
    signedInAsTrainer();
    const res = await createInviteAction('omar@example.com', 'email');
    expect(res).toMatchObject({ ok: true, emailed: true });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]![0]).toMatchObject({ to: 'omar@example.com', subject: 'S' });
  });
});

describe('importClientsCsvAction', () => {
  it('creates one import row per new email, skips existing, reports invalid', async () => {
    signedInAsTrainer();
    responses.existingImport = { data: [{ invite_email: 'lina@example.com' }], error: null };
    const csv = 'email\nmaya@example.com\nlina@example.com\nnope\n';
    const res = await importClientsCsvAction(csv);
    expect(res).toMatchObject({ ok: true, created: 1, skippedExisting: 1, total: 3 });
    if (!('ok' in res)) return;
    expect(res.invalid.map((r) => r.value)).toEqual(['nope']);

    const payload = insertPayloadFor('trainer_clients');
    // Insert is an array of rows for the import.
    const rows = queries
      .find((q) => q.table === 'trainer_clients' && q.ops.some((o) => o.m === 'insert'))!
      .ops.find((o) => o.m === 'insert')!.args[0] as Record<string, unknown>[];
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.invite_email).toBe('maya@example.com');
    expect(rows[0]!.source).toBe('import');
    expect(rows[0]!.status).toBe('invited');
    expect(rows[0]!.trainer_id).toBe(TRAINER);
    expect('client_id' in rows[0]!).toBe(false);
    void payload;
  });

  it('surfaces a parse error (no email column) as a specific message', async () => {
    signedInAsTrainer();
    const res = await importClientsCsvAction('name\nMaya\n');
    expect(res).toEqual({ error: 'Add an “email” column header, with one client per row.' });
  });
});
