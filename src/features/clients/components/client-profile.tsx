'use client';

import Link from 'next/link';
import { parseISO } from 'date-fns';
import { ChevronLeft } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { RelativeDate } from '@/components/format';
import { clientDisplayName, initials } from '../lib';
import type { ClientFile, ClientNote, ClientProfile as ClientProfileData } from '../queries';
import { ClientStatusChip } from './client-status-chip';
import { ClientStatusMenu } from './client-status-menu';
import { DetailsForm } from './details-form';
import { DataError } from './data-error';
import { NotesPanel } from './notes-panel';
import { FilesPanel } from './files-panel';

export function ClientProfile({
  profile,
  trainerId,
  notes,
  files,
  initialTab = 'overview',
}: {
  profile: ClientProfileData;
  trainerId: string;
  notes: ClientNote[] | null;
  files: ClientFile[] | null;
  initialTab?: 'overview' | 'notes';
}) {
  const name = clientDisplayName(profile);

  return (
    <div className="space-y-6">
      <Link
        href="/coach/clients"
        className="inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Clients
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <Avatar size="lg">
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="truncate text-2xl font-bold">{name}</h1>
          <div className="flex items-center gap-2">
            <ClientStatusChip status={profile.status} />
            {profile.startDate && (
              <span className="text-sm text-muted-foreground">
                Since <RelativeDate date={parseISO(profile.startDate)} absolute />
              </span>
            )}
          </div>
        </div>
        <ClientStatusMenu clientId={profile.clientId} status={profile.status} name={name} />
      </div>

      <Tabs defaultValue={initialTab}>
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="notes">Notes &amp; files</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="pt-4">
          <DetailsForm
            clientId={profile.clientId}
            goals={profile.goals}
            injuries={profile.injuries}
            tags={profile.tags}
          />
        </TabsContent>

        <TabsContent value="notes" className="space-y-8 pt-4">
          {notes === null ? (
            <DataError description="We couldn’t load notes." />
          ) : (
            <NotesPanel clientId={profile.clientId} notes={notes} />
          )}
          {files === null ? (
            <DataError description="We couldn’t load files." />
          ) : (
            <FilesPanel clientId={profile.clientId} trainerId={trainerId} files={files} />
          )}
        </TabsContent>
      </Tabs>
      <p className="text-xs text-muted-foreground">
        Program, workout log, progress and check-ins arrive with their features.
      </p>
      <Toaster />
    </div>
  );
}
