import { describe, expect, it } from 'vitest';
import {
  inviteEmailSchema,
  MAX_IMPORT_ROWS,
  normalizeEmail,
  parseInviteCsv,
} from '@/features/clients/invite-schemas';

describe('inviteEmailSchema', () => {
  it('trims and lowercases a valid email', () => {
    expect(inviteEmailSchema.parse('  Maya@Example.COM ')).toBe('maya@example.com');
  });

  it('rejects an empty or malformed email', () => {
    expect(inviteEmailSchema.safeParse('').success).toBe(false);
    expect(inviteEmailSchema.safeParse('not-an-email').success).toBe(false);
    expect(inviteEmailSchema.safeParse('a@b').success).toBe(false);
  });
});

describe('normalizeEmail', () => {
  it('matches the schema normalization for duplicate detection', () => {
    expect(normalizeEmail(' Omar@Example.com ')).toBe('omar@example.com');
  });
});

describe('parseInviteCsv', () => {
  it('reads valid rows and keeps only email + goals', () => {
    const csv = 'email,name,phone,goals\nmaya@example.com,Maya,0100,Get strong\n';
    const out = parseInviteCsv(csv);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.parsed.valid).toEqual([{ email: 'maya@example.com', goals: 'Get strong' }]);
    expect(out.parsed.invalid).toEqual([]);
    expect(out.parsed.total).toBe(1);
  });

  it('ignores unknown columns, including a client_id a caller tries to smuggle in', () => {
    const csv =
      'email,client_id,role\nlina@example.com,33333333-0000-0000-0000-000000000009,admin\n';
    const out = parseInviteCsv(csv);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const row = out.parsed.valid[0]!;
    expect(row).toEqual({ email: 'lina@example.com', goals: '' });
    // No client_id (or any other key) leaks through into the persisted shape.
    expect(Object.keys(row).sort()).toEqual(['email', 'goals']);
  });

  it('reports invalid rows by line number instead of dropping them', () => {
    const csv = 'email\nok@example.com\nnope\n\nalso-bad@\n';
    const out = parseInviteCsv(csv);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.parsed.valid.map((r) => r.email)).toEqual(['ok@example.com']);
    // Blank line is skipped (greedy), so the two invalids are on their own lines.
    expect(out.parsed.invalid.map((r) => r.line)).toEqual([3, 4]);
    expect(out.parsed.invalid[0]!.value).toBe('nope');
  });

  it('de-duplicates the same email within the file (case-insensitively)', () => {
    const csv = 'email\nSam@example.com\nsam@example.com\n';
    const out = parseInviteCsv(csv);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.parsed.valid).toEqual([{ email: 'sam@example.com', goals: '' }]);
    expect(out.parsed.duplicatesInFile).toBe(1);
  });

  it('rejects a file with no email column', () => {
    const out = parseInviteCsv('name,phone\nMaya,0100\n');
    expect(out).toEqual({
      ok: false,
      error: 'Add an “email” column header, with one client per row.',
    });
  });

  it('rejects an empty file', () => {
    expect(parseInviteCsv('   ')).toEqual({ ok: false, error: 'That file is empty.' });
  });

  it('rejects a header with no data rows', () => {
    const out = parseInviteCsv('email\n');
    expect(out.ok).toBe(false);
  });

  it('rejects more rows than the cap', () => {
    const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `c${i}@example.com`);
    const out = parseInviteCsv(`email\n${rows.join('\n')}\n`);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toContain(String(MAX_IMPORT_ROWS));
  });
});
