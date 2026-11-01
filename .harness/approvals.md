# Waiting on you

Autopilot never stops to ask. When something needs you, it adds a line here, does everything else it
can, and moves on. Do the item (or answer it), tick it, then run `/autopilot` again.

Format: `- [ ] <task-id> · <what is needed> · <why> · <exact step for you>`

## Open

The autonomous run reached a design gate and stopped (NEEDS-HUMAN). P0-03 builds the design system,
whose core step — writing the tokens into `src/app/globals.css` — is reserved for you (guard-paths +
the autopilot `human_only` list), and the visual direction is not yet signed off. P0-04, P0-05, P0-06
and all of Phases 1–3 depend on P0-03, so nothing else can proceed until this is unblocked.

- [ ] P0-03 · Confirm the "chalk and iron" visual direction (D-005) · it is recorded as "pending human review" and the entire UI is built on it · read `docs/ui/design-system.md` + `.harness/decisions.md` D-005, then reply "approved" or ask for changes.
- [ ] P0-03 · Apply the design tokens to `src/app/globals.css` · token edits are gated and the autonomous run is denied from writing them · paste the §"Starting globals.css" block from `docs/ui/design-system.md` into `src/app/globals.css` verbatim and commit it yourself (simplest — the guard prompts on every globals.css edit), or tell Claude to do it and approve each prompt.
- [ ] P0-03 · Decide how `shadcn init` touches `globals.css` · the shadcn CLI regenerates `globals.css` for Tailwind v4 and would overwrite the tokens · preferred: run `shadcn init` first, then paste the tokens; or approve the single rewrite and re-apply the design-system values after.

After these, re-run `/autopilot` (or `node scripts/autopilot.mjs status`) to resume from P0-03.

## Done
