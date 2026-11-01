'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { parseISO } from 'date-fns';
import { ChevronRight, Search, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Toaster } from '@/components/ui/sonner';
import { RelativeDate } from '@/components/format';
import { EmptyState } from '@/components/shared/states';
import {
  clientDisplayName,
  distinctTags,
  filterClients,
  FILTERABLE_STATUSES,
  initials,
  statusLabel,
  type ClientListItem,
  type ClientStatus,
} from '../lib';
import { ClientStatusChip } from './client-status-chip';
import { ClientStatusMenu } from './client-status-menu';
import { InviteClientButton } from './invite-client-button';

function Since({ startDate }: { startDate: string | null }) {
  if (!startDate) return <span className="text-muted-foreground">—</span>;
  return <RelativeDate date={parseISO(startDate)} absolute />;
}

function Tags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge key={tag} variant="outline">
          {tag}
        </Badge>
      ))}
    </div>
  );
}

function ClientIdentity({ item }: { item: ClientListItem }) {
  const name = clientDisplayName(item);
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar>
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <span className="truncate font-medium">{name}</span>
    </span>
  );
}

export function ClientsList({
  items,
  initialQuery = '',
}: {
  items: ClientListItem[];
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState<ClientStatus | 'all'>('all');
  const [tag, setTag] = useState<string>('all');

  const tags = useMemo(() => distinctTags(items), [items]);
  // Tag option values are namespaced so a user tag literally named "all" can't collide with the
  // "all tags" sentinel; the raw tag is recovered before filtering.
  const selectedTag = tag === 'all' ? 'all' : tag.slice(4);
  const filtered = useMemo(
    () => filterClients(items, { q, status, tag: selectedTag }),
    [items, q, status, selectedTag],
  );
  const filtersActive = q.trim() !== '' || status !== 'all' || tag !== 'all';

  function clearFilters() {
    setQ('');
    setStatus('all');
    setTag('all');
  }

  // Nothing exists yet (e.g. a new coach): the empty state, not a no-results state.
  if (items.length === 0) {
    return (
      <>
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Invite your first client to start tracking their training."
          action={<InviteClientButton className="inline-block" />}
        />
        <Toaster />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="client-search" className="sr-only">
            Search clients
          </Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="client-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or email"
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="status-filter" className="sr-only">
            Filter by status
          </Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ClientStatus | 'all')}>
            <SelectTrigger id="status-filter" className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {FILTERABLE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {tags.length > 0 && (
          <div className="grid gap-1.5">
            <Label htmlFor="tag-filter" className="sr-only">
              Filter by tag
            </Label>
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger id="tag-filter" className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t} value={`tag:${t}`}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? 'client' : 'clients'}
          {filtersActive ? ' match' : ''}
        </p>
        {filtersActive && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No clients match these filters"
          description="Try a different search or clear the filters."
          action={
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop: a table. Hidden below md so no horizontal scroll on phones. */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.clientId}>
                    <TableCell className="max-w-xs">
                      <Link
                        href={`/coach/clients/${item.clientId}`}
                        className="rounded-md outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <ClientIdentity item={item} />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ClientStatusChip status={item.status} />
                    </TableCell>
                    <TableCell>
                      <Tags tags={item.tags} />
                    </TableCell>
                    <TableCell>
                      <Since startDate={item.startDate} />
                    </TableCell>
                    <TableCell className="text-right">
                      <ClientStatusMenu
                        clientId={item.clientId}
                        status={item.status}
                        name={clientDisplayName(item)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: stacked rows. */}
          <ul className="flex flex-col gap-2 md:hidden">
            {filtered.map((item) => (
              <li key={item.clientId} className="flex items-center gap-2 rounded-xl border p-3">
                <Link
                  href={`/coach/clients/${item.clientId}`}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Avatar>
                    <AvatarFallback>{initials(clientDisplayName(item))}</AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="truncate font-medium">{clientDisplayName(item)}</span>
                    <span className="flex items-center gap-2">
                      <ClientStatusChip status={item.status} />
                      {item.startDate && (
                        <span className="text-xs text-muted-foreground">
                          Since <Since startDate={item.startDate} />
                        </span>
                      )}
                    </span>
                    {item.tags.length > 0 && <Tags tags={item.tags} />}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
                <ClientStatusMenu
                  clientId={item.clientId}
                  status={item.status}
                  name={clientDisplayName(item)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
      <Toaster />
    </div>
  );
}
