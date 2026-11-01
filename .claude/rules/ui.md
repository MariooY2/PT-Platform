---
paths:
  - "src/app/**/*.{tsx,jsx,css}"
  - "src/components/**/*"
  - "src/features/**/components/**/*"
  - "tests/e2e/ui*.ts"
---

# UI rules (loaded because you opened a UI file)

- Before building or changing a screen, read `docs/ui/README.md` and the screen's spec in
  `docs/ui/screens/`. Follow it; if it is wrong or silent, propose a change and record the decision
  in `.harness/decisions.md` rather than improvising.
- Tokens only (`docs/ui/design-system.md`): semantic color classes, the type scale and `num*`
  utilities, the radius hierarchy. `check-architecture.mjs` fails on raw or palette colors and
  arbitrary text sizes.
- Build every data view with its loading, empty, no-results and error states (`docs/ui/patterns.md`).
- Design at 360 px first. Touch targets ≥ 44 px (≥ 48 px in the workout player). No hover-only controls.
- Copy follows `docs/ui/copy.md`: sentence case, verb + object buttons, specific errors, our terms.
- Use the formatting components (`Money`, `Weight`, `Reps`, `Duration`, `RelativeDate`) for every
  number, price and date.
- Finish with evidence: add the route and its states to `tests/e2e/ui-routes.ts`, run
  `node scripts/verify.mjs --full` (screenshots + axe), then delegate to the `ui-reviewer` agent.
  The task is not done until it returns `VERDICT: ACCEPT`.
