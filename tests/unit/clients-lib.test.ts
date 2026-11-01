import { describe, expect, it } from 'vitest';
import {
  clientDisplayName,
  distinctTags,
  filterClients,
  initials,
  nextStatusActions,
  statusLabel,
  statusTone,
  type ClientListItem,
} from '@/features/clients/lib';

const item = (over: Partial<ClientListItem>): ClientListItem => ({
  clientId: crypto.randomUUID(),
  name: 'Jane Doe',
  email: 'jane@example.com',
  avatarPath: null,
  status: 'active',
  tags: [],
  startDate: '2026-01-01',
  ...over,
});

describe('status mapping', () => {
  it('maps every status to a label and a tone', () => {
    expect(statusLabel('active')).toBe('Active');
    expect(statusLabel('paused')).toBe('Paused');
    expect(statusLabel('archived')).toBe('Archived');
    expect(statusTone('active')).toBe('success');
    expect(statusTone('paused')).toBe('warning');
    expect(statusTone('archived')).toBe('neutral');
  });
});

describe('nextStatusActions', () => {
  it('offers Pause/Archive for active', () => {
    expect(nextStatusActions('active')).toEqual([
      { label: 'Pause', status: 'paused' },
      { label: 'Archive', status: 'archived' },
    ]);
  });
  it('offers Reactivate/Archive for paused', () => {
    expect(nextStatusActions('paused').map((a) => a.status)).toEqual(['active', 'archived']);
  });
  it('offers only Reactivate for archived', () => {
    expect(nextStatusActions('archived')).toEqual([{ label: 'Reactivate', status: 'active' }]);
  });
  it('offers nothing for pre-link statuses', () => {
    expect(nextStatusActions('lead')).toEqual([]);
    expect(nextStatusActions('invited')).toEqual([]);
  });
});

describe('clientDisplayName / initials', () => {
  it('prefers the name, then email, then a fallback', () => {
    expect(clientDisplayName({ name: 'Jane Doe', email: 'x@y.z' })).toBe('Jane Doe');
    expect(clientDisplayName({ name: null, email: 'x@y.z' })).toBe('x@y.z');
    expect(clientDisplayName({ name: '  ', email: null })).toBe('Unnamed client');
  });
  it('computes initials', () => {
    expect(initials('Jane Doe')).toBe('JD');
    expect(initials('Cher')).toBe('CH');
    expect(initials('   ')).toBe('?');
  });
});

describe('distinctTags', () => {
  it('collects and sorts unique tags', () => {
    const list = [item({ tags: ['strength', 'mobility'] }), item({ tags: ['mobility', 'rehab'] })];
    expect(distinctTags(list)).toEqual(['mobility', 'rehab', 'strength']);
  });
});

describe('filterClients', () => {
  const list = [
    item({ name: 'Alice Smith', email: 'alice@gym.test', status: 'active', tags: ['strength'] }),
    item({ name: 'Bob Jones', email: 'bob@gym.test', status: 'paused', tags: ['rehab'] }),
    item({ name: 'Cara Lin', email: 'cara@gym.test', status: 'archived', tags: ['strength'] }),
  ];

  it('returns all with no filter', () => {
    expect(filterClients(list, {})).toHaveLength(3);
  });
  it('filters by status', () => {
    expect(filterClients(list, { status: 'active' }).map((c) => c.name)).toEqual(['Alice Smith']);
  });
  it('filters by tag', () => {
    expect(filterClients(list, { tag: 'strength' }).map((c) => c.name)).toEqual([
      'Alice Smith',
      'Cara Lin',
    ]);
  });
  it('searches by name (case-insensitive)', () => {
    expect(filterClients(list, { q: 'bob' }).map((c) => c.name)).toEqual(['Bob Jones']);
  });
  it('searches by email', () => {
    expect(filterClients(list, { q: 'cara@gym' }).map((c) => c.name)).toEqual(['Cara Lin']);
  });
  it('returns nothing for a non-matching search (no-results state)', () => {
    expect(filterClients(list, { q: 'zzz-no-match' })).toEqual([]);
  });
  it('combines filters', () => {
    expect(filterClients(list, { status: 'archived', tag: 'strength' }).map((c) => c.name)).toEqual(
      ['Cara Lin'],
    );
  });
});
