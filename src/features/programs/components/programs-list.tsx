'use client';

import Link from 'next/link';
import { Dumbbell } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/states';
import { StatusChip } from '@/components/shared/status-chip';
import { RelativeDate } from '@/components/format';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { NewProgramDialog } from './new-program-dialog';
import { AssignDialog } from './assign-dialog';
import type { ProgramListItem } from '../types';

function ProgramCardBody({ p }: { p: ProgramListItem }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{p.title}</span>
        <StatusChip tone={p.status === 'published' ? 'success' : 'neutral'}>
          {p.status === 'published' ? 'Published' : 'Draft'}
        </StatusChip>
      </div>
      <span className="text-sm text-muted-foreground">
        <span className="num">{p.weeks}</span> {p.weeks === 1 ? 'week' : 'weeks'} ·{' '}
        <span className="num">{p.workout_count}</span>{' '}
        {p.workout_count === 1 ? 'workout' : 'workouts'}
      </span>
      <span className="text-xs text-muted-foreground">
        Updated <RelativeDate date={p.updated_at} />
      </span>
    </>
  );
}

function TemplateCard({ p, autoOpen }: { p: ProgramListItem; autoOpen?: 1 | 2 }) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <Link
        href={`/coach/programs/${p.id}`}
        className="flex flex-col gap-2 rounded-md outline-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ProgramCardBody p={p} />
      </Link>
      <div className="flex items-center justify-between gap-2 border-t pt-2">
        <span className="text-xs text-muted-foreground">
          Used by <span className="num">{p.used_by}</span> {p.used_by === 1 ? 'client' : 'clients'}
        </span>
        <AssignDialog
          templateId={p.id}
          templateTitle={p.title}
          autoOpenStep={autoOpen}
          trigger={
            <Button type="button" variant="outline" size="default">
              Assign
            </Button>
          }
        />
      </div>
    </li>
  );
}

function CopyCard({ p }: { p: ProgramListItem }) {
  return (
    <li>
      <Link
        href={`/coach/programs/${p.id}`}
        className="flex min-h-20 flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ProgramCardBody p={p} />
      </Link>
    </li>
  );
}

function TemplateGrid({ items, autoOpen }: { items: ProgramListItem[]; autoOpen?: 1 | 2 }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="No templates yet"
        description="Use New program to start building your first template."
      />
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
      {items.map((p, i) => (
        <TemplateCard key={p.id} p={p} autoOpen={i === 0 ? autoOpen : undefined} />
      ))}
    </ul>
  );
}

function CopyGrid({ items }: { items: ProgramListItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="No client programs yet"
        description="Programs you assign to clients appear here."
      />
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
      {items.map((p) => (
        <CopyCard key={p.id} p={p} />
      ))}
    </ul>
  );
}

export function ProgramsList({
  items,
  initialState,
}: {
  items: ProgramListItem[];
  initialState?: string;
}) {
  const templates = items.filter((p) => p.is_template);
  const copies = items.filter((p) => !p.is_template);
  // ?state=assign / assign-preview opens the first template's Assign dialog (for screenshots).
  const autoOpen =
    initialState === 'assign' ? 1 : initialState === 'assign-preview' ? 2 : undefined;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Programs"
        description="Your templates and the programs you've assigned to clients."
        action={<NewProgramDialog />}
      />
      <Tabs defaultValue="templates">
        <TabsList className="w-max">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="copies">Client copies</TabsTrigger>
        </TabsList>
        <TabsContent value="templates" className="pt-4">
          <TemplateGrid items={templates} autoOpen={autoOpen} />
        </TabsContent>
        <TabsContent value="copies" className="pt-4">
          <CopyGrid items={copies} />
        </TabsContent>
      </Tabs>
      <Toaster />
    </div>
  );
}
