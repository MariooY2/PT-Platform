import { z } from 'zod';

/**
 * A client is addressed by their profile id (= auth user id = trainer_clients.client_id).
 * Format-only check (not RFC-variant strict): the deterministic test/seed ids use zero variant
 * bits that `z.uuid()` would reject, and the real guard is RLS + the session trainer, not the shape.
 */
export const clientIdSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid id',
  );

/**
 * Only these statuses can be set from the UI "…" menu. `lead`/`invited` are reached through the
 * invite flow (P1-02), never from the browser, so they are intentionally excluded here.
 */
export const statusChangeSchema = z.enum(['active', 'paused', 'archived']);
export type StatusChange = z.infer<typeof statusChangeSchema>;

const MAX_TAG_LENGTH = 30;
const MAX_TAGS = 20;

/** Split a free-text tag field ("strength, mobility") into clean, deduped, capped tags. */
export function parseTags(input: string | string[] | null | undefined): string[] {
  const raw = Array.isArray(input) ? input : (input ?? '').split(',');
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw) {
    const tag = part.trim().slice(0, MAX_TAG_LENGTH);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export const detailsSchema = z.object({
  goals: z.string().trim().max(2000, 'Keep goals under 2000 characters.'),
  injuries: z.string().trim().max(2000, 'Keep injury notes under 2000 characters.'),
  tags: z
    .union([z.string(), z.array(z.string())])
    .transform(parseTags)
    .pipe(z.array(z.string()).max(MAX_TAGS, `Up to ${MAX_TAGS} tags.`)),
});
export type DetailsInput = z.input<typeof detailsSchema>;

export const noteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Write a note first.')
    .max(4000, 'Keep notes under 4000 characters.'),
});

export const registerFileSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  storagePath: z.string().trim().min(1).max(1024),
});
