# Waiting on you

Autopilot never stops to ask. When something needs you, it adds a line here, does everything else it
can, and moves on. Do the item (or answer it), tick it, then run `/autopilot` again.

Format: `- [ ] <task-id> · <what is needed> · <why> · <exact step for you>`

## Open

- [ ] P0-04 · (later) Google OAuth · the contract lists it as "present but disabled unless env vars set"; it needs a Google OAuth app + cloud redirect URLs (approval-gated) and an /auth/callback route · deferred (D-016) — set up the OAuth app + envs when you want it, then it can be added. Not required for P0-04 acceptance.
- [ ] P0-04 · (later) Real email confirmation · signup auto-confirms locally (local confirmations are off); turning on email confirmation is a cloud Supabase auth setting · enable it in the cloud project at deploy time (P0-06), then remove `email_confirm: true` from the signup action.
- [ ] P0-05 · FYI: admin mobile navigation (D-017) · patterns.md leaves admin mobile "not optimised; usable", so autopilot made it a labelled bottom bar reusing the five sidebar destinations · no action needed unless you want a different admin mobile nav (e.g. a drawer) — say so and it'll be changed.
- [ ] P0-05 · FYI: `buyer` seed account deferred · the contract originally listed a `buyer` seed account; autopilot deferred it to P2-02 (no P0-05 route uses it, and adding it would churn the tests/rls row counts). Recorded as a scope note in tasks/P0-05-shells.yaml · no action needed; it's added when storefront/checkout work (P2) needs it.
- [ ] P0-06 · (human) Create the remote and let CI run · the workflow `.github/workflows/ci.yml` is inert until the repo has a remote and a push · `git remote add origin <your-repo-url>` then `git push -u origin master` (NOTE: your working branch is `master`, but the repo's default is `main` — decide which to push, e.g. `git push -u origin master:main`). Actions then runs `node scripts/verify.mjs --full` on every push/PR; confirm it goes green.
- [ ] P0-06 · (human) Set up the cloud Supabase project · the preview needs a hosted database · `supabase link --project-ref <ref>` then `supabase db push` (applies the migrations); then enable email confirmation in the project's Auth settings (and remove `email_confirm: true` from the signup action — see the P0-04 email-confirmation line in this file).
- [ ] P0-06 · (human) Set up the Vercel preview · import the GitHub repo in the Vercel dashboard (Next.js preset, root = repo root); set env vars NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SITE_URL from the cloud Supabase project; confirm the preview URL renders /login. (Autopilot cannot run the deploy CLI or set these secrets.)
- [ ] P1-04 · FYI: edit + archive of custom exercises deferred · the P1-04 objective prose says "create, edit and archive", but the acceptance lines (A1-A9) only test create; the builder shipped create + a list that already filters is_archived=false, so edit/archive can be added later with no schema change · no action needed unless you want edit/archive pulled forward — otherwise it rides with a later exercises task.
- [ ] P1-13 / harness · add a `.gitattributes` to normalize line endings · fresh builder worktrees check out every file as CRLF (repo has core.autocrlf=true, no .gitattributes), so a builder's first `node scripts/verify.mjs` format:check fails on all ~112 files until it runs `prettier --write .` (which makes zero content change); a committed .gitattributes fixes it permanently but is a harness/config change · create `C:\dev\pt-platform\.gitattributes` containing `* text=auto eol=lf`, then `git add .gitattributes && git add --renormalize . && git commit`.
- [ ] P1 (program-builder) · docs reconciliation · docs/ui/screens/program-builder.md:10 says the Programs empty state is "Start blank or duplicate the sample program." but docs/ui/copy.md:29-30 (the governing copy authority) says "Start with a blank program or a template." The P0-05 placeholder used copy.md; program-builder.md still has the stale line · reconcile program-builder.md to copy.md before the P1 program-builder task is contracted (or confirm which wording wins).
- [ ] P0-02 · FYI: confirm the `pgcrypto` extension is acceptable · the base migration runs `create extension if not exists pgcrypto` (for the seed's password hashing); it's pre-installed on Supabase local so it's a no-op, but the contract lists "adding a Postgres extension" as approval-required · no action needed unless you object; it's standard on Supabase.

## Done

- [x] P0-03 · Confirm the "chalk and iron" visual direction (D-005) · **Approved by the human 2026-11-01.** Claude now drives P0-03 directly (autopilot turned off for the interactive design work; guard prompts on globals.css are approved by the human in-session).
- [x] P0-03 · Apply the design tokens to `src/app/globals.css` · Approved — Claude applies them (run shadcn init first, then paste the design-system tokens).
- [x] P0-03 · Decide how `shadcn init` touches `globals.css` · Approved — shadcn init first, then paste tokens over its output.
