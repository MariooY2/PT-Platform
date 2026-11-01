# Program builder, exercise library, forms (`/coach/programs`, `/coach/exercises`, `/coach/forms`)

Desktop-first (coach at a desk), fully usable on a phone for small edits. Fast entry beats
drag-and-drop, but both work.

## Programs list — `/coach/programs`

Tabs: **Templates · Client copies**. Columns: Name · Weeks · Workouts per week · Used by (n clients)
· Updated. Actions: **New program** (blank or duplicate a template), "…" (Duplicate, Assign, Archive).
Empty: "Programs you build appear here. Start blank or duplicate the sample program." (seed one sample).

## Builder — `/coach/programs/[id]`

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ← 12-Week Strength (template)        Saved · 2 s ago   [Preview] [Assign] │
│ Week [1][2][3][4]…[+]   Duplicate week ▾                                  │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬────────┤
│ Mon      │ Tue      │ Wed      │ Thu      │ Fri      │ Sat      │ Sun    │
│┌────────┐│          │┌────────┐│          │┌────────┐│          │        │
││Lower A ││  Rest    ││Upper A ││  Rest    ││Lower B ││ + Add    │ + Add  │
││6 ex.   ││          ││5 ex.   ││          ││6 ex.   ││          │        │
│└────────┘│          │└────────┘│          │└────────┘│          │        │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴────────┘
 Selecting a workout opens the editor in a right-side panel (desktop) or full screen (mobile):
┌──────────────────────────────────────────────┐
│ Lower A                         ⋯   ×         │
│ A1 Back squat          Sets  Reps   Load  Rest │
│                         4    5      80%   3:00 │
│ A2 —                                           │
│ B1 Romanian deadlift    3    8–10   RPE 8 2:00 │
│ B2 Walking lunge        3    12/leg  —    2:00 │  ← B1/B2 = superset, shown with a bracket
│ + Add exercise   (/ to search)                 │
│ Notes for client                               │
└──────────────────────────────────────────────┘
```

- **Week × day grid** with week tabs; days hold workout cards (title + exercise count). Drag to
  move or copy (hold Alt); "…" on a card: Duplicate, Move to day, Delete (Undo).
- **Duplicate week** copies a whole week forward, with an option to add a progression (e.g. +2.5 kg
  or +1 rep) — the simple form of the Phase 4 progression rules.
- **Workout editor:** rows are exercises; cells are a compact prescription. Keyboard-first: Tab moves
  across cells, Enter adds a row, `/` opens the exercise picker, ⌘D duplicates a row. Default columns:
  Sets · Reps · Load · Rest. Tempo, RPE/RIR, %1RM, time and distance appear via "Columns ▾" and only
  for exercises that use them. Per-set overrides (e.g. a heavy top set) expand the row into set lines.
- **Quick entry:** a prescription cell accepts coach shorthand and expands it: `4x5 @80%`,
  `3x8-10 RPE8`, `5x5 100kg`, `3x30s`. Invalid input stays in the cell with a red underline and a
  tooltip example. Parsing lives in one tested function.
- **Supersets:** select rows → "Group as superset" → labels A1/A2 and a bracket; ungroup the same way.
- **Autosave** with status in the header; no Save button. Conflicts (two tabs) show a banner to reload.
- **Preview** shows exactly what the client will see on a phone frame for any day.
- **Template vs copy:** the header says which one is open. Editing a client copy shows a muted line
  "Changes apply to Maya only."

## Assign — dialog from builder, programs list or client profile

Step 1: pick clients (search, multi-select, shows who already has an active program). Step 2: start
date (defaults to next Monday) and a preview of week 1. **Assign program** → toast "Assigned to Maya
and 2 others", with a link to each copy. Assigning over an active program asks whether to replace it
or queue it after the current one.

## Exercise library — `/coach/exercises` and the picker

- Grid on desktop (name, muscle, equipment, video thumbnail), list on mobile. Filters: muscle group,
  equipment, category, "My exercises". Search is instant (client-side over the loaded library).
- Exercise detail: video (YouTube embed or upload), instructions, muscles, equipment; "Used in 4
  programs". **New exercise** for custom ones.
- Picker (`Command` component): opens with `/` or "+ Add exercise", recent exercises first, search
  as you type, Enter adds and keeps the picker open for the next one, Esc closes.

## Forms builder — `/coach/forms`

Two defaults (Intake, Weekly check-in) plus custom forms. Editor: list of questions with type icons;
add question → choose type (short text, long text, number, 1–10 scale, choice, yes/no, photo,
weight); drag to reorder; **Preview** shows the client phone view. The weekly schedule (weekday) is
set per client in the client profile, with a default in Settings.

## Acceptance checks

- A coach can build a 4-day week of 5 exercises each using only the keyboard.
- `4x5 @80%`, `3x8-10 RPE8`, `5x5 100kg` and `3x30s` expand correctly (unit tests); invalid input
  is kept and flagged, never silently dropped.
- Editing a client copy never changes the template (test) and the UI says which one is open.
- The preview matches the client player for the same workout.
