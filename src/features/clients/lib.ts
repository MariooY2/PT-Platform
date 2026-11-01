import type { Database } from '@/lib/supabase/types';
import type { StatusTone } from '@/components/shared/status-chip';

export type ClientStatus = Database['public']['Enums']['client_status'];

/** A linked client as the list and profile consume it (flattened from the join). */
export interface ClientListItem {
  clientId: string;
  name: string | null;
  email: string | null;
  avatarPath: string | null;
  status: ClientStatus;
  tags: string[];
  startDate: string | null;
}

export const STATUS_LABEL: Record<ClientStatus, string> = {
  lead: 'Lead',
  invited: 'Invited',
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
};

const STATUS_TONE: Record<ClientStatus, StatusTone> = {
  lead: 'neutral',
  invited: 'info',
  active: 'success',
  paused: 'warning',
  archived: 'neutral',
};

export function statusLabel(status: ClientStatus): string {
  return STATUS_LABEL[status];
}

export function statusTone(status: ClientStatus): StatusTone {
  return STATUS_TONE[status];
}

/** The statuses a coach can filter the list by (linked clients only). */
export const FILTERABLE_STATUSES = [
  'active',
  'paused',
  'archived',
] as const satisfies ClientStatus[];

/** A fallback label when the client's profile is not readable (e.g. an archived client). */
export function clientDisplayName(item: Pick<ClientListItem, 'name' | 'email'>): string {
  return item.name?.trim() || item.email?.trim() || 'Unnamed client';
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** The status transitions offered in the row/profile "…" menu, per current status. */
export function nextStatusActions(
  status: ClientStatus,
): Array<{ label: string; status: Exclude<ClientStatus, 'lead' | 'invited'> }> {
  switch (status) {
    case 'active':
      return [
        { label: 'Pause', status: 'paused' },
        { label: 'Archive', status: 'archived' },
      ];
    case 'paused':
      return [
        { label: 'Reactivate', status: 'active' },
        { label: 'Archive', status: 'archived' },
      ];
    case 'archived':
      return [{ label: 'Reactivate', status: 'active' }];
    default:
      return [];
  }
}

/** Every distinct tag across the list, sorted, for the Tag filter. */
export function distinctTags(items: ClientListItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) for (const tag of item.tags) set.add(tag);
  return [...set].sort((a, b) => a.localeCompare(b));
}

export interface ClientFilter {
  q?: string;
  status?: ClientStatus | 'all';
  tag?: string | 'all';
}

/** In-memory filter: a coach's list is tens of rows, so search + filter run client-side. */
export function filterClients(items: ClientListItem[], filter: ClientFilter): ClientListItem[] {
  const q = filter.q?.trim().toLowerCase() ?? '';
  const status = filter.status ?? 'all';
  const tag = filter.tag ?? 'all';
  return items.filter((item) => {
    if (status !== 'all' && item.status !== status) return false;
    if (tag !== 'all' && !item.tags.includes(tag)) return false;
    if (q) {
      const haystack = `${item.name ?? ''} ${item.email ?? ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
