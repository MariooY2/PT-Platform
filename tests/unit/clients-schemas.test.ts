import { describe, expect, it } from 'vitest';
import {
  detailsSchema,
  noteSchema,
  parseTags,
  statusChangeSchema,
} from '@/features/clients/schemas';

describe('parseTags', () => {
  it('splits, trims, drops empties and dedupes (case-insensitive)', () => {
    expect(parseTags(' strength , Mobility, strength ,, ')).toEqual(['strength', 'Mobility']);
  });
  it('accepts an array', () => {
    expect(parseTags(['a', 'a', 'b'])).toEqual(['a', 'b']);
  });
  it('handles null/empty', () => {
    expect(parseTags(null)).toEqual([]);
    expect(parseTags('')).toEqual([]);
  });
  it('caps at 20 tags', () => {
    const many = Array.from({ length: 30 }, (_, i) => `t${i}`).join(',');
    expect(parseTags(many)).toHaveLength(20);
  });
});

describe('statusChangeSchema', () => {
  it('accepts the three UI statuses', () => {
    for (const s of ['active', 'paused', 'archived']) {
      expect(statusChangeSchema.safeParse(s).success).toBe(true);
    }
  });
  it('rejects statuses that only the invite flow may set', () => {
    expect(statusChangeSchema.safeParse('invited').success).toBe(false);
    expect(statusChangeSchema.safeParse('lead').success).toBe(false);
    expect(statusChangeSchema.safeParse('nonsense').success).toBe(false);
  });
});

describe('detailsSchema', () => {
  it('parses goals, injuries and tags from a comma string', () => {
    const r = detailsSchema.safeParse({ goals: 'Get strong', injuries: '', tags: 'a, b, a' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toEqual({ goals: 'Get strong', injuries: '', tags: ['a', 'b'] });
  });
  it('rejects an over-long goals field', () => {
    expect(
      detailsSchema.safeParse({ goals: 'x'.repeat(2001), injuries: '', tags: '' }).success,
    ).toBe(false);
  });
});

describe('noteSchema', () => {
  it('requires a non-empty body', () => {
    expect(noteSchema.safeParse({ body: '   ' }).success).toBe(false);
    expect(noteSchema.safeParse({ body: 'Progressing well' }).success).toBe(true);
  });
});
