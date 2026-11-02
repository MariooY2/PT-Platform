import { beforeEach, describe, expect, it, vi } from 'vitest';

// The action imports clients/queries (server-only); shim it so the module loads under Node.
vi.mock('server-only', () => ({}));

const TRAINER = '11111111-0000-0000-0000-000000000001';
const TEMPLATE = 'bbbb0000-0000-0000-0000-000000000001';
const CLIENT_1 = '33333333-0000-0000-0000-000000000001';
const CLIENT_2 = '33333333-0000-0000-0000-000000000002';
const FOREIGN = '33333333-0000-0000-0000-00000000ffff'; // not one of the trainer's clients

const getUser = vi.fn();
const rpc = vi.fn();

// trainer_clients rows returned to listClients(). Two active clients + one paused (not assignable).
const trainerClients: { data: unknown; error: unknown } = {
  data: [
    {
      client_id: CLIENT_1,
      status: 'active',
      tags: [],
      start_date: null,
      invite_email: null,
      profile: { full_name: 'Client One', avatar_path: null },
    },
    {
      client_id: CLIENT_2,
      status: 'active',
      tags: [],
      start_date: null,
      invite_email: null,
      profile: { full_name: 'Client Two', avatar_path: null },
    },
    {
      client_id: '33333333-0000-0000-0000-00000000aaaa',
      status: 'paused',
      tags: [],
      start_date: null,
      invite_email: 'paused@x.test',
      profile: { full_name: 'Paused Pat', avatar_path: null },
    },
  ],
  error: null,
};

function builder() {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = () => b;
  b.not = () => b;
  b.in = () => b;
  b.order = () => b;
  b.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(trainerClients).then(resolve, reject);
  return b;
}

const supabaseMock = {
  auth: { getUser },
  from: () => builder(),
  rpc: (name: string, args: Record<string, unknown>) => rpc(name, args),
};

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => supabaseMock }));
vi.mock('@/lib/supabase/middleware', () => ({
  roleOf: (user: { role?: string } | null) => user?.role ?? null,
}));
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

import { assignClientsAction } from '@/features/programs/actions';

const asTrainer = () =>
  getUser.mockResolvedValue({ data: { user: { id: TRAINER, role: 'trainer' } } });
const asClient = () =>
  getUser.mockResolvedValue({ data: { user: { id: CLIENT_1, role: 'client' } } });

beforeEach(() => {
  getUser.mockReset();
  rpc.mockReset();
  revalidatePath.mockReset();
  rpc.mockResolvedValue({ data: 'new-copy-id', error: null });
});

describe('assignClientsAction', () => {
  it('rejects a malformed client id before any copy runs', async () => {
    asTrainer();
    const res = await assignClientsAction({
      templateId: TEMPLATE,
      clientIds: ['not-a-uuid'],
      startDate: '2027-01-04',
    });
    expect(res).toHaveProperty('error');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects a bad start date before any copy runs', async () => {
    asTrainer();
    const res = await assignClientsAction({
      templateId: TEMPLATE,
      clientIds: [CLIENT_1],
      startDate: '04/01/2027',
    });
    expect(res).toHaveProperty('error');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects a non-trainer session', async () => {
    asClient();
    const res = await assignClientsAction({
      templateId: TEMPLATE,
      clientIds: [CLIENT_1],
      startDate: '2027-01-04',
    });
    expect(res).toHaveProperty('error');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('drops ids that are not the trainer’s active clients, and calls the RPC only for the rest', async () => {
    asTrainer();
    const res = await assignClientsAction({
      templateId: TEMPLATE,
      clientIds: [CLIENT_1, FOREIGN],
      startDate: '2027-01-04',
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('copy_program_for_client', {
      template_id: TEMPLATE,
      target_client_id: CLIENT_1,
      start_on: '2027-01-04',
    });
    expect(res).toEqual({
      ok: true,
      copies: [{ clientId: CLIENT_1, programId: 'new-copy-id', name: 'Client One' }],
      failed: [],
    });
  });

  it('returns an error (no copies) when every id is foreign', async () => {
    asTrainer();
    const res = await assignClientsAction({
      templateId: TEMPLATE,
      clientIds: [FOREIGN],
      startDate: '2027-01-04',
    });
    expect(res).toEqual({ error: 'Pick at least one active client.' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('copies each selected client and revalidates the list + each client page', async () => {
    asTrainer();
    rpc
      .mockResolvedValueOnce({ data: 'copy-1', error: null })
      .mockResolvedValueOnce({ data: 'copy-2', error: null });
    const res = await assignClientsAction({
      templateId: TEMPLATE,
      clientIds: [CLIENT_1, CLIENT_2],
      startDate: '2027-01-04',
    });
    expect(res).toEqual({
      ok: true,
      copies: [
        { clientId: CLIENT_1, programId: 'copy-1', name: 'Client One' },
        { clientId: CLIENT_2, programId: 'copy-2', name: 'Client Two' },
      ],
      failed: [],
    });
    expect(revalidatePath).toHaveBeenCalledWith('/coach/programs');
    expect(revalidatePath).toHaveBeenCalledWith(`/coach/clients/${CLIENT_1}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/coach/clients/${CLIENT_2}`);
  });

  it('reports partial failure: successes in copies, the rest in failed', async () => {
    asTrainer();
    rpc
      .mockResolvedValueOnce({ data: 'copy-1', error: null })
      .mockResolvedValueOnce({ data: null, error: { code: '42501' } });
    const res = await assignClientsAction({
      templateId: TEMPLATE,
      clientIds: [CLIENT_1, CLIENT_2],
      startDate: '2027-01-04',
    });
    expect(res).toEqual({
      ok: true,
      copies: [{ clientId: CLIENT_1, programId: 'copy-1', name: 'Client One' }],
      failed: ['Client Two'],
    });
  });

  it('returns an error when every copy fails', async () => {
    asTrainer();
    rpc.mockResolvedValue({ data: null, error: { code: '42501' } });
    const res = await assignClientsAction({
      templateId: TEMPLATE,
      clientIds: [CLIENT_1],
      startDate: '2027-01-04',
    });
    expect(res).toEqual({ error: 'We couldn’t assign the program. Try again.' });
  });
});
