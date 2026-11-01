# Waiting on you

Autopilot never stops to ask. When something needs you, it adds a line here, does everything else it
can, and moves on. Do the item (or answer it), tick it, then run `/autopilot` again.

Format: `- [ ] <task-id> · <what is needed> · <why> · <exact step for you>`

## Open

- [ ] P0-02 · FYI: confirm the `pgcrypto` extension is acceptable · the base migration runs `create extension if not exists pgcrypto` (for the seed's password hashing); it's pre-installed on Supabase local so it's a no-op, but the contract lists "adding a Postgres extension" as approval-required · no action needed unless you object; it's standard on Supabase.

## Done

- [x] P0-03 · Confirm the "chalk and iron" visual direction (D-005) · **Approved by the human 2026-11-01.** Claude now drives P0-03 directly (autopilot turned off for the interactive design work; guard prompts on globals.css are approved by the human in-session).
- [x] P0-03 · Apply the design tokens to `src/app/globals.css` · Approved — Claude applies them (run shadcn init first, then paste the design-system tokens).
- [x] P0-03 · Decide how `shadcn init` touches `globals.css` · Approved — shadcn init first, then paste tokens over its output.
