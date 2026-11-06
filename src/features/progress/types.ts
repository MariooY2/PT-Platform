import type { Compliance, DayStatus, SeriesPoint } from './lib';
import type { PhotoPose } from './schemas';

// The tab identifiers as a plain-module runtime value, so the server page can read them without
// dotting into the 'use client' component module (which React forbids).
export const PROGRESS_TABS = ['strength', 'body', 'photos', 'calendar'] as const;
export type ProgressTab = (typeof PROGRESS_TABS)[number];

// View models shared by the server queries and the client components (so components never import the
// server-only query module). Every number stays in its base unit (kg, cm, %); formatting is the UI's job.

export type PrType = 'max_weight' | 'e1rm' | 'max_reps';

export interface PrEntry {
  type: PrType;
  value: number;
  achievedAt: string;
}

export interface StrengthLift {
  exerciseId: string;
  name: string;
  latestE1rm: number; // kg
  deltaE1rm: number | null; // kg change over 6 weeks (null → first session)
  series: SeriesPoint[]; // e1RM over time
  prs: PrEntry[]; // the current personal records for this lift
  lastSession: string; // yyyy-MM-dd
}

export interface BodyMeasurementRow {
  id: string;
  measuredOn: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  notes: string | null;
}

export interface BodyProgress {
  points: { date: string; weightKg: number }[];
  average: SeriesPoint[];
  latestWeight: number | null;
  deltaWeight: number | null;
  rows: BodyMeasurementRow[];
}

export interface ProgressPhotoView {
  id: string;
  pose: PhotoPose;
  url: string | null;
  takenOn: string;
}

export interface PhotoDate {
  date: string;
  photos: ProgressPhotoView[];
}

export interface CalendarProgress {
  year: number; // full year
  month: number; // 1-based
  statuses: Record<string, DayStatus>;
  compliance: Compliance;
}
