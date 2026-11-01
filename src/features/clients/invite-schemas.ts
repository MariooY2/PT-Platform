import Papa from 'papaparse';
import { z } from 'zod';

/**
 * Invite input validation + server-side CSV parsing (papaparse). Pure and framework-free so it unit
 * tests without a database. The write path (invite-actions) always re-derives trainer_id from the
 * session and never accepts a client_id from here (D-010/D-014); imports create 'invited' rows only.
 */

/** Normalize an email for storage and for duplicate detection (case-insensitive, trimmed). */
export const inviteEmailSchema = z
  .string()
  .trim()
  .min(1, 'Enter an email address.')
  .toLowerCase()
  .pipe(z.email('Enter a valid email address.'));

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

// We read only the `email` and `goals` columns (features.md §7.2 also lists name and phone, but
// trainer_clients has no column for them yet — see the task hand-back). Any other column is ignored.

/** A sensible cap so a huge paste can't create thousands of rows in one action call. */
export const MAX_IMPORT_ROWS = 500;
/** Byte ceiling on the uploaded text, checked before parsing (and again in the browser). */
export const MAX_CSV_BYTES = 1_000_000;

const MAX_GOALS = 2000;

export interface ValidInviteRow {
  email: string;
  /** Persisted. Empty string when absent. */
  goals: string;
}

export interface InvalidInviteRow {
  /** 1-based line in the file (the header is line 1). */
  line: number;
  value: string;
  reason: string;
}

export interface ParsedCsv {
  valid: ValidInviteRow[];
  invalid: InvalidInviteRow[];
  /** Rows dropped because the same email appeared earlier in the file. */
  duplicatesInFile: number;
  /** Total data rows seen (excludes the header). */
  total: number;
}

export type CsvParseOutcome = { ok: true; parsed: ParsedCsv } | { ok: false; error: string };

function cell(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  return typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
}

/**
 * Parse a CSV of invites entirely on the server. Unknown columns (including a `client_id` column a
 * caller might try to smuggle in) are ignored — only `email` and `goals` are ever read. Invalid rows
 * are reported by line number, never silently dropped; in-file duplicate emails are de-duplicated.
 */
export function parseInviteCsv(text: string): CsvParseOutcome {
  if (text.length > MAX_CSV_BYTES) {
    return { ok: false, error: 'That file is too large. Keep it under 1 MB.' };
  }
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'That file is empty.' };

  const result = Papa.parse<Record<string, unknown>>(trimmed, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const headers = (result.meta.fields ?? []).map((h) => h.toLowerCase());
  if (!headers.includes('email')) {
    return { ok: false, error: 'Add an “email” column header, with one client per row.' };
  }

  const dataRows = result.data;
  if (dataRows.length === 0) {
    return { ok: false, error: 'No client rows found. Add one client per row under the header.' };
  }
  if (dataRows.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      error: `That file has too many rows. Import up to ${MAX_IMPORT_ROWS} at a time.`,
    };
  }

  const valid: ValidInviteRow[] = [];
  const invalid: InvalidInviteRow[] = [];
  const seen = new Set<string>();
  let duplicatesInFile = 0;

  dataRows.forEach((row, i) => {
    const line = i + 2; // header is line 1
    const rawEmail = cell(row, 'email');
    const parsedEmail = inviteEmailSchema.safeParse(rawEmail);
    if (!parsedEmail.success) {
      invalid.push({
        line,
        value: rawEmail,
        reason: parsedEmail.error.issues[0]?.message ?? 'Invalid email.',
      });
      return;
    }
    const email = parsedEmail.data;
    if (seen.has(email)) {
      duplicatesInFile += 1;
      return;
    }
    seen.add(email);
    valid.push({ email, goals: cell(row, 'goals').slice(0, MAX_GOALS) });
  });

  return { ok: true, parsed: { valid, invalid, duplicatesInFile, total: dataRows.length } };
}
