'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StrengthTab } from './strength-tab';
import { BodyTab } from './body-tab';
import { PhotosTab } from './photos-tab';
import { CalendarTab } from './calendar-tab';
import type {
  BodyProgress,
  CalendarProgress,
  PhotoDate,
  ProgressTab,
  StrengthLift,
} from '../types';

/**
 * The Progress screen: four tabs over the client's own data. `forcedState` (empty/loading/error) is a
 * test/gallery hook routed to every tab's own state machine; `initialTab` makes a single tab reachable
 * by URL for screenshots. All data is read server-side and RLS-scoped; this component only renders it.
 */
export function ProgressScreen({
  userId,
  strength,
  body,
  photos,
  calendar,
  forcedState,
  initialTab = 'strength',
}: {
  userId: string;
  strength: { lifts: StrengthLift[]; error: boolean };
  body: { body: BodyProgress; error: boolean };
  photos: { dates: PhotoDate[]; error: boolean };
  calendar: { calendar: CalendarProgress; error: boolean };
  forcedState?: string;
  initialTab?: ProgressTab;
}) {
  return (
    <div className="mx-auto w-full max-w-[560px] space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Progress"
        description="Your strength, body, photos and workout calendar."
      />

      <Tabs defaultValue={initialTab} className="gap-6">
        <TabsList className="w-full">
          <TabsTrigger value="strength">Strength</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="strength">
          <StrengthTab lifts={strength.lifts} hadError={strength.error} forcedState={forcedState} />
        </TabsContent>
        <TabsContent value="body">
          <BodyTab body={body.body} hadError={body.error} forcedState={forcedState} />
        </TabsContent>
        <TabsContent value="photos">
          <PhotosTab
            dates={photos.dates}
            userId={userId}
            hadError={photos.error}
            forcedState={forcedState}
          />
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarTab
            calendar={calendar.calendar}
            hadError={calendar.error}
            forcedState={forcedState}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
