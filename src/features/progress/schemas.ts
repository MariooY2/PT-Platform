import { z } from 'zod';

// Format-only id check (the seed's deterministic uuids use zero variant bits that z.uuid() rejects);
// RLS + the session client are the real guard. Mirrors features/workouts/schemas.ts.
export const uuidLike = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid id',
  );

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-11-06')
  .optional();

const measurementCm = (label: string) =>
  z.coerce
    .number()
    .min(0, `${label} must be 0 or more.`)
    .max(500, `Enter ${label.toLowerCase()} between 0 and 500 cm.`)
    .nullish();

/**
 * Log a body-metric entry. Weight and every measurement are optional, but at least one value must be
 * present (an empty entry is meaningless). measured_on defaults to the client's "today" server-side.
 * Numbers are coerced from the form strings and range-checked here and again by the table CHECKs.
 */
export const logBodyMetricSchema = z
  .object({
    measuredOn: isoDate,
    weightKg: z.coerce
      .number()
      .min(0, 'Enter a weight between 0 and 500 kg.')
      .max(500, 'Enter a weight between 0 and 500 kg.')
      .nullish(),
    bodyFatPct: z.coerce
      .number()
      .min(0, 'Enter a body-fat % between 0 and 100.')
      .max(100, 'Enter a body-fat % between 0 and 100.')
      .nullish(),
    waistCm: measurementCm('Waist'),
    hipsCm: measurementCm('Hips'),
    chestCm: measurementCm('Chest'),
    armCm: measurementCm('Arm'),
    thighCm: measurementCm('Thigh'),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine(
    (v) =>
      [v.weightKg, v.bodyFatPct, v.waistCm, v.hipsCm, v.chestCm, v.armCm, v.thighCm].some(
        (n) => n != null,
      ),
    { message: 'Enter at least one value.', path: ['weightKg'] },
  );
export type LogBodyMetricInput = z.infer<typeof logBodyMetricSchema>;

export const photoPoseSchema = z.enum(['front', 'side', 'back']);
export type PhotoPose = z.infer<typeof photoPoseSchema>;

/**
 * Record a progress photo after the bytes were uploaded to the private bucket. The storage path is
 * re-checked against the session's own folder in the action; taken_on defaults to "today" server-side.
 */
export const registerPhotoSchema = z.object({
  pose: photoPoseSchema,
  storagePath: z.string().min(1).max(500),
  takenOn: isoDate,
});
export type RegisterPhotoInput = z.infer<typeof registerPhotoSchema>;

export const photoIdSchema = uuidLike;
