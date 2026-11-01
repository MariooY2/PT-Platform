import { describe, expect, it } from 'vitest';
import { exerciseInputSchema, parseExerciseForm } from '@/features/exercises/schemas';
import { youtubeEmbedUrl } from '@/features/exercises/media';

function form(entries: Array<[string, string]>): FormData {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
}

describe('exerciseInputSchema', () => {
  it('accepts a valid custom exercise and never reads a trainer id', () => {
    const fd = form([
      ['name', '  Paused front squat  '],
      ['primaryMuscle', 'quads'],
      ['secondaryMuscles', 'glutes'],
      ['secondaryMuscles', 'core'],
      ['equipment', 'barbell'],
      ['category', 'strength'],
      ['videoUrl', 'https://youtube.com/watch?v=abc123'],
      ['instructions', 'Brace, descend, pause 2s.'],
      // A hostile client tries to set its own trainer_id — the schema must ignore it.
      ['trainerId', '00000000-0000-0000-0000-000000000000'],
      ['trainer_id', '00000000-0000-0000-0000-000000000000'],
    ]);
    const parsed = parseExerciseForm(fd);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.name).toBe('Paused front squat'); // trimmed
    expect(parsed.data.primaryMuscle).toBe('quads');
    expect(parsed.data.secondaryMuscles).toEqual(['glutes', 'core']);
    expect(parsed.data.equipment).toBe('barbell');
    expect(parsed.data).not.toHaveProperty('trainerId');
    expect(parsed.data).not.toHaveProperty('trainer_id');
  });

  it('rejects an empty name with a specific, fixable message', () => {
    const fd = form([
      ['name', '   '],
      ['primaryMuscle', 'chest'],
      ['category', 'strength'],
    ]);
    const parsed = parseExerciseForm(fd);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]?.message).toBe('Enter an exercise name.');
  });

  it('rejects a muscle outside the shared taxonomy', () => {
    const parsed = exerciseInputSchema.safeParse({
      name: 'Mystery move',
      primaryMuscle: 'spleen',
      secondaryMuscles: [],
      category: 'strength',
      videoUrl: '',
      instructions: '',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects an invalid video link with a specific message', () => {
    const fd = form([
      ['name', 'Good morning'],
      ['primaryMuscle', 'hamstrings'],
      ['category', 'strength'],
      ['videoUrl', 'not-a-url'],
    ]);
    const parsed = parseExerciseForm(fd);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]?.message).toContain('valid video link');
  });

  it('treats the "none" equipment sentinel and a blank video as unset', () => {
    const fd = form([
      ['name', 'Plank'],
      ['primaryMuscle', 'core'],
      ['equipment', 'none'],
      ['category', 'mobility'],
      ['videoUrl', ''],
    ]);
    const parsed = parseExerciseForm(fd);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.equipment).toBeUndefined();
    expect(parsed.data.videoUrl).toBe('');
  });
});

describe('youtubeEmbedUrl', () => {
  it('builds a nocookie embed URL from the common YouTube link shapes', () => {
    const expected = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(expected);
    expect(youtubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(expected);
    expect(youtubeEmbedUrl('https://youtube.com/embed/dQw4w9WgXcQ')).toBe(expected);
    expect(youtubeEmbedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(expected);
  });

  it('returns null for non-YouTube or missing links', () => {
    expect(youtubeEmbedUrl('')).toBeNull();
    expect(youtubeEmbedUrl(null)).toBeNull();
    expect(youtubeEmbedUrl('https://vimeo.com/12345')).toBeNull();
    expect(youtubeEmbedUrl('not a url')).toBeNull();
  });
});
