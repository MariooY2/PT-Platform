import { describe, expect, it } from 'vitest';
import {
  compliance,
  dailyWeights,
  dayStatuses,
  e1rmSeries,
  monthMatrix,
  rolling7,
  scaleSeries,
  sixWeekChange,
  weightChange,
  type DayStatus,
} from '@/features/progress/lib';

describe('e1rmSeries', () => {
  it('keeps the best Epley e1RM per day, ascending by date', () => {
    const series = e1rmSeries([
      { date: '2026-10-01', weightKg: 80, reps: 5 }, // 93.33
      { date: '2026-10-01', weightKg: 82.5, reps: 5 }, // 96.25 — best that day
      { date: '2026-09-20', weightKg: 70, reps: 8 }, // 88.67
    ]);
    expect(series.map((p) => p.date)).toEqual(['2026-09-20', '2026-10-01']);
    expect(series[1].value).toBeCloseTo(96.25, 2);
  });

  it('drops sets with no reps and returns [] when empty', () => {
    expect(e1rmSeries([{ date: '2026-10-01', weightKg: 80, reps: 0 }])).toEqual([]);
    expect(e1rmSeries([])).toEqual([]);
  });
});

describe('sixWeekChange', () => {
  const today = '2026-11-01';
  it('uses the most recent point on/before the cutoff as the baseline', () => {
    const r = sixWeekChange(
      [
        { date: '2026-09-10', value: 90 }, // before cutoff (9-20)
        { date: '2026-09-15', value: 92 }, // latest before cutoff → baseline
        { date: '2026-10-25', value: 100 },
      ],
      today,
    );
    expect(r.baseline).toBe(92);
    expect(r.latest).toBe(100);
    expect(r.delta).toBe(8);
  });

  it('falls back to the earliest point when nothing is old enough', () => {
    const r = sixWeekChange(
      [
        { date: '2026-10-20', value: 95 },
        { date: '2026-10-28', value: 99 },
      ],
      today,
    );
    expect(r.baseline).toBe(95);
    expect(r.delta).toBe(4);
  });

  it('returns a null delta for a single point', () => {
    expect(sixWeekChange([{ date: '2026-10-20', value: 95 }], today)).toEqual({
      latest: 95,
      baseline: null,
      delta: null,
    });
  });
});

describe('dailyWeights + rolling7 + weightChange', () => {
  it('dedupes to the last-seen value per day', () => {
    const points = dailyWeights([
      { measuredOn: '2026-10-01', weightKg: 72 },
      { measuredOn: '2026-10-01', weightKg: 71.8 }, // later same-day → wins
      { measuredOn: '2026-10-08', weightKg: 71.2 },
      { measuredOn: '2026-10-15', weightKg: null }, // skipped
    ]);
    expect(points).toEqual([
      { date: '2026-10-01', weightKg: 71.8 },
      { date: '2026-10-08', weightKg: 71.2 },
    ]);
  });

  it('rolling7 averages only the trailing 7-day window', () => {
    const avg = rolling7([
      { date: '2026-10-01', weightKg: 72 },
      { date: '2026-10-03', weightKg: 70 }, // within 6 days of 10-01 → avg 71
      { date: '2026-10-20', weightKg: 68 }, // outside → just itself
    ]);
    expect(avg[0].value).toBeCloseTo(72, 5);
    expect(avg[1].value).toBeCloseTo(71, 5);
    expect(avg[2].value).toBeCloseTo(68, 5);
  });

  it('weightChange reports latest minus earliest', () => {
    expect(
      weightChange([
        { date: '2026-10-01', weightKg: 72 },
        { date: '2026-10-20', weightKg: 70.6 },
      ]),
    ).toEqual({ latest: 70.6, delta: expect.closeTo(-1.4, 5) });
    expect(weightChange([])).toEqual({ latest: null, delta: null });
  });
});

describe('dayStatuses', () => {
  const today = '2026-11-06';
  it('classifies done / partial / missed / upcoming', () => {
    const m = dayStatuses(
      ['2026-11-02', '2026-11-04', '2026-11-08'], // scheduled: done, missed, upcoming
      [
        { date: '2026-11-02', status: 'completed' },
        { date: '2026-11-05', status: 'in_progress' }, // ad-hoc partial (not scheduled)
      ],
      today,
    );
    expect(m.get('2026-11-02')).toBe('done');
    expect(m.get('2026-11-04')).toBe('missed'); // scheduled, past, no log
    expect(m.get('2026-11-05')).toBe('partial');
    expect(m.get('2026-11-08')).toBe('upcoming');
  });

  it('a completed log outranks a same-day skipped log', () => {
    const m = dayStatuses(
      [],
      [
        { date: '2026-11-01', status: 'skipped' },
        { date: '2026-11-01', status: 'completed' },
      ],
      today,
    );
    expect(m.get('2026-11-01')).toBe('done');
  });
});

describe('compliance', () => {
  it('counts done over done+partial+missed', () => {
    const c = compliance(['done', 'done', 'partial', 'missed', 'upcoming'] as DayStatus[]);
    expect(c).toMatchObject({ done: 2, partial: 1, missed: 1, total: 4, pct: 50 });
    expect(c.words).toBe('You did 2 of 4 workouts — 50%');
  });

  it('reads nothing scheduled as a sentence, not 0%', () => {
    expect(compliance(['upcoming'] as DayStatus[]).words).toBe('No workouts scheduled this month');
  });

  it('singular workout', () => {
    expect(compliance(['done'] as DayStatus[]).words).toBe('You did 1 of 1 workout — 100%');
  });
});

describe('monthMatrix', () => {
  it('is Monday-first, full weeks, and contains every day of the month', () => {
    const weeks = monthMatrix(2026, 11); // November 2026: 1st is a Sunday
    expect(weeks[0]).toHaveLength(7);
    // Monday-first grid for a month starting Sunday → first row is the prior week.
    expect(weeks[0][0]).toBe('2026-10-26'); // Monday before the 1st
    expect(weeks.flat()).toContain('2026-11-01');
    expect(weeks.flat()).toContain('2026-11-30');
    for (const w of weeks) expect(w).toHaveLength(7);
  });
});

describe('scaleSeries', () => {
  it('centres a single point', () => {
    const { scaled, path } = scaleSeries([{ date: '2026-10-01', value: 90 }], 300, 100);
    expect(scaled).toHaveLength(1);
    expect(scaled[0].x).toBe(150);
    expect(path.startsWith('M150')).toBe(true);
  });

  it('spaces points linearly in time within the padded box', () => {
    const { scaled, path } = scaleSeries(
      [
        { date: '2026-10-01', value: 80 },
        { date: '2026-10-11', value: 100 },
      ],
      300,
      100,
      10,
    );
    expect(scaled[0].x).toBeCloseTo(10, 5); // left pad
    expect(scaled[1].x).toBeCloseTo(290, 5); // right pad
    // higher value sits higher on the canvas (smaller y)
    expect(scaled[1].y).toBeLessThan(scaled[0].y);
    expect(path).toMatch(/^M/);
    expect(path).toContain('L');
  });
});
