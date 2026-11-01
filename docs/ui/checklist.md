# UI acceptance checklist

Every task that adds or changes a screen passes this list before it is done. Items marked **auto**
are checked by scripts; the rest are checked by the `ui-reviewer` agent from screenshots and code.

## Evidence the task must produce

- [ ] The route(s) are listed in `tests/e2e/ui-routes.ts` with the states to capture.
- [ ] `node scripts/verify.mjs --full` is green. It runs, for each listed route: screenshots at
      360 × 740 and 1280 × 800, light and dark, saved to `.harness/evidence/ui/<route>/`; and an
      axe scan with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`. **auto**
- [ ] `ui-reviewer` returned `VERDICT: ACCEPT`.

## Tokens and visual consistency

- [ ] No raw colors, palette colors or off-scale text sizes outside `globals.css`. **auto**
- [ ] Numbers use `num`, `num-lg` or `num-xl` and show their unit.
- [ ] Radii follow the hierarchy (controls `md`, cards `xl`, sheets `2xl` top, chips `full`).
- [ ] Shadows only on floating elements. Structure comes from borders and spacing.
- [ ] One primary button per view. Its label is a verb + object.
- [ ] `pr` / `pr-soft` appear only for personal records.

## States

- [ ] Loading (skeleton shaped like the content), empty (purpose + one action), no-results
      (clear filters) and error (what failed + Try again) all exist and are captured.
- [ ] Every status-like value uses `StatusChip` with a word, not color alone.
- [ ] Optimistic actions restore state and explain if the server rejects them.

## Layout and touch

- [ ] Works at 360 px with no horizontal scroll; tables become stacked rows below 768 px.
- [ ] Primary actions on mobile sit in the lower half or are sticky at the bottom.
- [ ] Touch targets ≥ 44 px (≥ 48 px in the workout player). Inputs have ≥ 16 px text.
- [ ] Numeric fields open the right keyboard (`inputmode`).
- [ ] No hover-only controls.

## Accessibility (beyond axe)

- [ ] Visible focus ring on every interactive element; logical tab order; dialogs trap and return focus.
- [ ] Icon-only buttons have `aria-label`; charts have a one-sentence text summary.
- [ ] Contrast holds for any user-supplied color (trainer brand band uses computed black/white text).
- [ ] Animations respect `prefers-reduced-motion`.

## Copy

- [ ] Follows `copy.md`: sentence case, our terms (client, program, workout, check-in, coaching plan),
      no internal jargon, no all-caps labels.
- [ ] Errors say what happened and how to fix it; empty states say what the area is for and what to do.
- [ ] Toast text matches the action's button name.

## Spec fidelity

- [ ] The screen matches its spec in `docs/ui/screens/` (layout, sort order, columns, states, actions),
      or the difference is recorded in `.harness/decisions.md` with the reason.
- [ ] The screen spec's own acceptance checks pass.
