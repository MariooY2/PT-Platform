import { describe, expect, it } from 'vitest';
import {
  attentionReason,
  checkinPreview,
  compliancePct,
  complianceWindowStart,
  daysBetween,
  daysSinceLastWorkout,
  isCheckinOverdue,
  isWorkoutMissed,
  mostRecentScheduledOn,
  scheduledCountInWindow,
  sortBySeverity,
  type AttentionItem,
} from '@/features/coach-today/lib';
import type { Question } from '@/features/forms/schemas';

describe('daysBetween', () => {
  it('counts calendar days, positive when the second date is later', () => {
    expect(daysBetween('2026-11-01', '2026-11-06')).toBe(5);
    expect(daysBetween('2026-11-06', '2026-11-06')).toBe(0);
    expect(daysBetween('2026-11-06', '2026-11-01')).toBe(-5);
  });
});

describe('sortBySeverity', () => {
  const rows: Array<Pick<AttentionItem, 'clientName' | 'kind' | 'days'>> = [
    { clientName: 'Overdue 3', kind: 'checkin_overdue', days: 3 },
    { clientName: 'Missed 6', kind: 'missed_workout', days: 6 },
    { clientName: 'Overdue 5', kind: 'checkin_overdue', days: 5 },
    { clientName: 'Missed 9', kind: 'missed_workout', days: 9 },
  ];

  it('puts missed workouts before overdue check-ins, then most urgent first within each', () => {
    const sorted = sortBySeverity(rows).map((r) => r.clientName);
    expect(sorted).toEqual(['Missed 9', 'Missed 6', 'Overdue 5', 'Overdue 3']);
  });

  it('does not mutate the input array', () => {
    const copy = [...rows];
    sortBySeverity(rows);
    expect(rows).toEqual(copy);
  });
});

describe('attentionReason', () => {
  it('states the reason in words with the number', () => {
    expect(attentionReason({ kind: 'missed_workout', days: 6 })).toBe('No workout in 6 days');
    expect(attentionReason({ kind: 'checkin_overdue', days: 3 })).toBe('Check-in 3 days late');
  });

  it('uses the singular for one day', () => {
    expect(attentionReason({ kind: 'checkin_overdue', days: 1 })).toBe('Check-in 1 day late');
  });
});

describe('daysSinceLastWorkout / isWorkoutMissed', () => {
  const today = '2026-11-06';

  it('is null with no active program', () => {
    expect(daysSinceLastWorkout('2026-10-20', null, today)).toBeNull();
    expect(isWorkoutMissed(null)).toBe(false);
  });

  it('counts days since the last completed workout', () => {
    expect(daysSinceLastWorkout('2026-10-30', '2026-01-01', today)).toBe(7);
    expect(isWorkoutMissed(7)).toBe(true);
  });

  it('falls back to days since the program started when nothing was ever completed', () => {
    expect(daysSinceLastWorkout(null, '2026-10-30', today)).toBe(7);
  });

  it('is not missed under the 5-day threshold', () => {
    expect(isWorkoutMissed(daysSinceLastWorkout('2026-11-03', '2026-01-01', today))).toBe(false); // 3 days
    expect(isWorkoutMissed(4)).toBe(false);
    expect(isWorkoutMissed(5)).toBe(true);
  });
});

describe('mostRecentScheduledOn', () => {
  it('returns today when the weekday is today', () => {
    // 2026-11-06 is a Friday (weekday 5).
    expect(mostRecentScheduledOn('2026-11-06', 5)).toBe('2026-11-06');
  });

  it('walks back to the most recent earlier occurrence', () => {
    expect(mostRecentScheduledOn('2026-11-06', 1)).toBe('2026-11-02'); // Monday, 4 days back
    expect(mostRecentScheduledOn('2026-11-06', 6)).toBe('2026-10-31'); // Saturday, last week
  });
});

describe('isCheckinOverdue', () => {
  const today = '2026-11-06'; // Friday

  it('is overdue when the scheduled day was ≥2 days ago with no submission since', () => {
    const r = isCheckinOverdue(today, 1, null); // Monday = 4 days ago
    expect(r).toEqual({ overdue: true, daysLate: 4 });
  });

  it('is not overdue within 2 days of the scheduled day', () => {
    expect(isCheckinOverdue(today, 5, null).overdue).toBe(false); // today
    expect(isCheckinOverdue(today, 4, null).overdue).toBe(false); // yesterday = 1 day
  });

  it('is cleared by a submission on or after the scheduled occurrence', () => {
    expect(isCheckinOverdue(today, 1, '2026-11-02').overdue).toBe(false); // submitted on the day
    expect(isCheckinOverdue(today, 1, '2026-11-03').overdue).toBe(false); // submitted after
    expect(isCheckinOverdue(today, 1, '2026-11-01').overdue).toBe(true); // submitted before the occurrence
  });
});

describe('compliance', () => {
  it('window start is inclusive of today across the full span', () => {
    expect(complianceWindowStart('2026-11-06', 14)).toBe('2026-10-24');
  });

  it('counts only program workouts scheduled inside the window', () => {
    // Program starts 2026-10-26 (Mon). Week 1: day1=Mon 26, day3=Wed 28, day5=Fri 30.
    const workouts = [
      { week: 1, day: 1 },
      { week: 1, day: 3 },
      { week: 1, day: 5 },
      { week: 3, day: 1 }, // 2026-11-09 — after today, excluded
    ];
    expect(scheduledCountInWindow(workouts, '2026-10-26', '2026-11-06', 14)).toBe(3);
  });

  it('is a rounded percentage, null when nothing was expected, capped at 100', () => {
    expect(compliancePct(3, 4)).toBe(75);
    expect(compliancePct(2, 3)).toBe(67);
    expect(compliancePct(0, 5)).toBe(0);
    expect(compliancePct(5, 0)).toBeNull();
    expect(compliancePct(6, 5)).toBe(100);
  });
});

describe('checkinPreview', () => {
  const q = (id: string, type: Question['type'], label: string): Question => ({
    id,
    type,
    label,
    required: false,
  });

  it('surfaces a low scale answer first', () => {
    const questions = [q('energy', 'scale', 'Energy'), q('notes', 'text', 'Notes')];
    expect(checkinPreview(questions, { energy: 3, notes: 'tired' })).toBe('Energy 3/10');
  });

  it('skips a healthy scale and shows the weight next', () => {
    const questions = [q('energy', 'scale', 'Energy'), q('weight', 'weight', 'Weight')];
    expect(checkinPreview(questions, { energy: 8, weight: 71.4 })).toBe('Weight 71.4 kg');
  });

  it('falls back to the first free-text answer, truncated', () => {
    const questions = [q('notes', 'long_text', 'Notes')];
    const long = 'x'.repeat(80);
    const preview = checkinPreview(questions, { notes: long });
    expect(preview).toMatch(/…$/);
    expect(preview!.length).toBe(60);
  });

  it('is null when there is nothing readable', () => {
    expect(checkinPreview([q('photo', 'photo', 'Photo')], {})).toBeNull();
  });
});
