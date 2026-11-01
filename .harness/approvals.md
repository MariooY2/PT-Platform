# Waiting on you

Autopilot never stops to ask. When something needs you, it adds a line here, does everything else it
can, and moves on. Do the item (or answer it), tick it, then run `/autopilot` again.

Format: `- [ ] <task-id> · <what is needed> · <why> · <exact step for you>`

## Open

- [ ] P0-04 · (later) Google OAuth · the contract lists it as "present but disabled unless env vars set"; it needs a Google OAuth app + cloud redirect URLs (approval-gated) and an /auth/callback route · deferred (D-016) — set up the OAuth app + envs when you want it, then it can be added. Not required for P0-04 acceptance.
- [ ] P0-04 · (later) Real email confirmation · signup auto-confirms locally (local confirmations are off); turning on email confirmation is a cloud Supabase auth setting · enable it in the cloud project at deploy time (P0-06), then remove `email_confirm: true` from the signup action.
- [ ] P0-05 · FYI: admin mobile navigation (D-017) · patterns.md leaves admin mobile "not optimised; usable", so autopilot made it a labelled bottom bar reusing the five sidebar destinations · no action needed unless you want a different admin mobile nav (e.g. a drawer) — say so and it'll be changed.
- [ ] P0-05 · FYI: `buyer` seed account deferred · the contract originally listed a `buyer` seed account; autopilot deferred it to P2-02 (no P0-05 route uses it, and adding it would churn the tests/rls row counts). Recorded as a scope note in tasks/P0-05-shells.yaml · no action needed; it's added when storefront/checkout work (P2) needs it.
- [ ] P0-02 · FYI: confirm the `pgcrypto` extension is acceptable · the base migration runs `create extension if not exists pgcrypto` (for the seed's password hashing); it's pre-installed on Supabase local so it's a no-op, but the contract lists "adding a Postgres extension" as approval-required · no action needed unless you object; it's standard on Supabase.

## Done

- [x] P0-03 · Confirm the "chalk and iron" visual direction (D-005) · **Approved by the human 2026-11-01.** Claude now drives P0-03 directly (autopilot turned off for the interactive design work; guard prompts on globals.css are approved by the human in-session).
- [x] P0-03 · Apply the design tokens to `src/app/globals.css` · Approved — Claude applies them (run shadcn init first, then paste the design-system tokens).
- [x] P0-03 · Decide how `shadcn init` touches `globals.css` · Approved — shadcn init first, then paste tokens over its output.
