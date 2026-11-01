// Quick-entry parser (P1-05): expands coach shorthand into prescribed sets. Pure and exhaustively
// unit-tested; invalid input returns { ok: false, error } so the editor can keep the text and flag it,
// never silently drop it (docs/ui/screens/program-builder.md). Examples it must handle:
//   "4x5 @80%"  "3x8-10 RPE8"  "5x5 100kg"  "3x30s"

export type ParsedSet = {
  reps_min: number | null;
  reps_max: number | null;
  weight_kg: number | null;
  percent_1rm: number | null;
  rpe: number | null;
  rir: number | null;
  duration_sec: number | null;
};

export type QuickEntryResult = { ok: true; sets: ParsedSet[] } | { ok: false; error: string };

const EMPTY: ParsedSet = {
  reps_min: null,
  reps_max: null,
  weight_kg: null,
  percent_1rm: null,
  rpe: null,
  rir: null,
  duration_sec: null,
};

const EXAMPLE = 'Try 4x5 @80%, 3x8-10 RPE8, 5x5 100kg or 3x30s.';

export function parseQuickEntry(raw: string): QuickEntryResult {
  const input = (raw ?? '').trim();
  if (!input) return { ok: false, error: `Enter a prescription. ${EXAMPLE}` };

  const parts = input.split(/\s+/);
  const head = parts[0];
  // <count> x <reps | reps-range | durationS>
  const m = /^(\d+)x(\d+)(?:-(\d+))?(s)?$/i.exec(head);
  if (!m) return { ok: false, error: `Couldn't read "${head}". ${EXAMPLE}` };

  const count = Number.parseInt(m[1], 10);
  if (count < 1 || count > 20) return { ok: false, error: 'Set count must be between 1 and 20.' };

  const set: ParsedSet = { ...EMPTY };
  if (m[4] === 's') {
    if (m[3]) return { ok: false, error: "A time set can't use a rep range (e.g. 3x30s)." };
    set.duration_sec = Number.parseInt(m[2], 10);
  } else {
    set.reps_min = Number.parseInt(m[2], 10);
    set.reps_max = m[3] ? Number.parseInt(m[3], 10) : set.reps_min;
    if (set.reps_max < set.reps_min) return { ok: false, error: 'The rep range is backwards.' };
  }

  for (const tok of parts.slice(1)) {
    let mm: RegExpExecArray | null;
    if ((mm = /^@(\d+(?:\.\d+)?)%$/.exec(tok))) set.percent_1rm = Number.parseFloat(mm[1]);
    else if ((mm = /^(\d+(?:\.\d+)?)kg$/i.exec(tok))) set.weight_kg = Number.parseFloat(mm[1]);
    else if ((mm = /^rpe(\d+(?:\.\d+)?)$/i.exec(tok))) set.rpe = Number.parseFloat(mm[1]);
    else if ((mm = /^rir(\d+)$/i.exec(tok))) set.rir = Number.parseInt(mm[1], 10);
    else return { ok: false, error: `Couldn't read "${tok}". Use @80%, 100kg, RPE8 or RIR2.` };
  }

  return { ok: true, sets: Array.from({ length: count }, () => ({ ...set })) };
}
