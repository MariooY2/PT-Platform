'use client';

import Link from 'next/link';
import { Dumbbell } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/states';
import { StatusChip } from '@/components/shared/status-chip';
import { RelativeDate } from '@/components/format';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { NewProgramDialog } from './new-program-dialog';
import type { ProgramListItem } from '../types';

function Grid({ items, kind }: { items: ProgramListItem[]; kind: 'template' | 'copy' }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title={kind === 'template' ? 'No templates yet' : 'No client programs yet'}
        description={
          kind === 'template'
            ? 'Use New program to start a blank program, or duplicate the sample.'
            : 'Programs you assign to clients appear here.'
        }
      />
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
      {items.map((p) => (
        <li key={p.id}>
          <Link
            href={`/coach/programs/${p.id}`}
            className="flex min-h-20 flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">{p.title}</span>
              <StatusChip tone={p.status === 'published' ? 'success' : 'neutral'}>
                {p.status}
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
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ProgramsList({ items }: { items: ProgramListItem[] }) {
  const templates = items.filter((p) => p.is_template);
  const copies = items.filter((p) => !p.is_template);
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
          <Grid items={templates} kind="template" />
        </TabsContent>
        <TabsContent value="copies" className="pt-4">
          <Grid items={copies} kind="copy" />
        </TabsContent>
      </Tabs>
      <Toaster />
    </div>
  );
}
