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
import { HabitsManager } from '@/features/habits/components/habits-manager';
import type { TrainerHabit } from '@/features/habits/queries';
import { CheckinScheduleForm } from '@/features/checkins/components/checkin-schedule-form';
import { ClientPrograms } from './client-programs';
import type { ClientProgramItem } from '@/features/programs/types';

export function ClientProfile({
  profile,
  trainerId,
  notes,
  files,
  habits,
  checkinWeekday,
  hasCheckinForm,
  programs,
  initialTab = 'overview',
}: {
  profile: ClientProfileData;
  trainerId: string;
  notes: ClientNote[] | null;
  files: ClientFile[] | null;
  habits: TrainerHabit[] | null;
  checkinWeekday: number | null;
  hasCheckinForm: boolean;
  programs: ClientProgramItem[] | null;
  initialTab?: 'overview' | 'notes' | 'habits' | 'program' | 'checkin';
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
            <TabsTrigger value="program">Program</TabsTrigger>
            <TabsTrigger value="habits">Habits</TabsTrigger>
            <TabsTrigger value="checkin">Check-in</TabsTrigger>
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

        {/* P1-06: the client's assigned program copies. Assigning happens from a template. */}
        <TabsContent value="program" className="pt-4">
          {programs === null ? (
            <DataError description="We couldn’t load programs." />
          ) : (
            <ClientPrograms items={programs} />
          )}
        </TabsContent>

        {/* P1-10 fills this slot: the client's weekly check-in weekday. */}
        <TabsContent value="checkin" className="space-y-4 pt-4">
          <div className="space-y-1">
            <h2 className="text-sm font-medium">Weekly check-in</h2>
            <p className="text-sm text-muted-foreground">
              Set the day each week this client’s check-in becomes due.
            </p>
          </div>
          <CheckinScheduleForm
            clientId={profile.clientId}
            currentWeekday={checkinWeekday}
            hasCheckinForm={hasCheckinForm}
          />
        </TabsContent>

        <TabsContent value="habits" className="pt-4">
          {habits === null ? (
            <DataError description="We couldn’t load habits." />
          ) : (
            <HabitsManager clientId={profile.clientId} habits={habits} />
          )}
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
        Workout log and progress arrive with their features.
      </p>
      <Toaster />
    </div>
  );
}
