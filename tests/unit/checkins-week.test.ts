import { describe, expect, it } from 'vitest';
import {
  addDays,
  dueThisWeek,
  isoWeekRange,
  scheduledDateInWeek,
  weekdayOf,
  zonedDateString,
} from '@/features/checkins/week';

describe('zonedDateString', () => {
  it('returns the Beirut calendar date for an instant', () => {
    // 2026-11-04T21:30:00Z is 2026-11-04 23:30 in Beirut (UTC+2) → same day.
    expect(zonedDateString(new Date('2026-11-04T21:30:00Z'))).toBe('2026-11-04');
  });

  it('rolls to the next day once Beirut passes midnight', () => {
    // 2026-11-04T22:30:00Z is 2026-11-05 00:30 in Beirut → next day.
    expect(zonedDateString(new Date('2026-11-04T22:30:00Z'))).toBe('2026-11-05');
  });
});

describe('weekdayOf', () => {
  it('maps dates to 0=Sun..6=Sat', () => {
    expect(weekdayOf('2026-11-01')).toBe(0); // Sunday
    expect(weekdayOf('2026-11-02')).toBe(1); // Monday
    expect(weekdayOf('2026-11-07')).toBe(6); // Saturday
  });
});

describe('addDays', () => {
  it('adds and subtracts across month boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
  });
});

describe('isoWeekRange', () => {
  it('runs Monday..Sunday for a mid-week date', () => {
    // 2026-11-04 is a Wednesday.
    expect(isoWeekRange('2026-11-04')).toEqual({ start: '2026-11-02', end: '2026-11-08' });
  });

  it('treats Sunday as the last day of its ISO week', () => {
    // 2026-11-01 is a Sunday; its ISO week is Mon 26 Oct .. Sun 1 Nov.
    expect(isoWeekRange('2026-11-01')).toEqual({ start: '2026-10-26', end: '2026-11-01' });
  });
});

describe('scheduledDateInWeek', () => {
  const wed = '2026-11-04'; // Wednesday, ISO week Mon 2 Nov .. Sun 8 Nov
  it('finds each weekday within the same ISO week', () => {
    expect(scheduledDateInWeek(wed, 1)).toBe('2026-11-02'); // Monday
    expect(scheduledDateInWeek(wed, 3)).toBe('2026-11-04'); // Wednesday
    expect(scheduledDateInWeek(wed, 0)).toBe('2026-11-08'); // Sunday = last day of the week
    expect(scheduledDateInWeek(wed, 6)).toBe('2026-11-07'); // Saturday
  });
});

describe('dueThisWeek', () => {
  const wed = '2026-11-04'; // Wednesday

  it('is due when the weekday is today or earlier this week', () => {
    expect(dueThisWeek(wed, 3).due).toBe(true); // Wednesday = today
    expect(dueThisWeek(wed, 1).due).toBe(true); // Monday already passed
  });

  it('is not due when the weekday is still ahead this week', () => {
    const r = dueThisWeek(wed, 5); // Friday
    expect(r.due).toBe(false);
    expect(r.dueDate).toBe('2026-11-06');
  });

  it('reports the ISO week bounds alongside the due date', () => {
    const r = dueThisWeek(wed, 0); // Sunday = last day
    expect(r).toMatchObject({
      weekStart: '2026-11-02',
      weekEnd: '2026-11-08',
      dueDate: '2026-11-08',
    });
    expect(r.due).toBe(false); // Sunday is still ahead of a Wednesday
  });
});
