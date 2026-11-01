# Decisions

Choices made, why, and who made them. Newest first. A decision changes only by a new entry that
supersedes the old one.

Format:

```
## D-NNN — <decision> (YYYY-MM-DD, decided by: human | claude-with-approval)
Why: <reason>
Alternatives considered: <...>
Affects: <docs / tasks / code>
```

## D-024 — on /coach/exercises the empty-state primary is consolidated into the always-present header action (2026-11-01, decided by: autopilot (D-006))
Why: patterns.md §States puts the one primary action inside the EmptyState, but the global library is
never truly empty (only the "My exercises" view can be), and rendering a New exercise button both in the
PageHeader and in the empty card gave two primaries and a layout reflow when toggling filters. So the
header "New exercise" action is always present (the single primary in every state), the empty-state copy
names it ("Use New exercise to add one"), and loading.tsx mirrors it with a same-size skeleton so the
first paint doesn't shift. This keeps one primary per view with no reflow.
Affects: src/features/exercises/components/exercise-library.tsx, src/app/coach/(app)/exercises/loading.tsx, P1-04.

## D-023 — the global exercise seed carries no third-party video URLs (2026-11-01, decided by: autopilot (D-006))
Why: the ~148 seeded global exercises have no video_url. Seeding real YouTube URLs can't be verified
from here (dead/incorrect embeds in demo data are worse than none) and raises licensing questions. The
video render path (thumbnail on the card, youtube-nocookie iframe in the detail dialog) is proven by the
P1-04 A6 e2e, which creates a custom exercise with a video and asserts the embed; coaches add their own
video links. Cards without a video stay compact (no reserved media box) so the library doesn't read as a
wall of empty thumbnails.
Affects: supabase/seed.sql, src/features/exercises/components/exercise-card.tsx, tests/e2e/exercises.spec.ts, P1-04.

## D-022 — the PWA install prompt shows unconditionally on Today, not "after the first completed workout" (2026-11-01, decided by: autopilot (D-006))
Why: docs/ui/screens/client-app.md:33 says the install prompt appears "after the first completed
workout", but no workouts exist until P1-07, and docs/platform.md §10 (the Phase-1 gate authority) only
requires "install prompt on the client Today screen". So the card renders unconditionally and dismissibly
(hidden after dismiss or in standalone display-mode). Revisit when P1-07 lands workout completion.
Affects: tasks/P1-13-pwa.yaml (out_of_scope), src/features/pwa/components/install-prompt.tsx, P1-13.

## D-021 — "not found" for an unauthorized client is proven by content + no-leak, not HTTP 404 (2026-11-01, decided by: autopilot (D-006))
Why: the client profile calls notFound() when the trainer is not linked to the client. Under Next 16
cacheComponents the route streams, so the response has already flushed a 200 before notFound() runs —
the HTTP status cannot change to 404. The security-meaningful properties still hold: the not-found
boundary renders and no client data leaks. The P1-01 A6 e2e therefore asserts the not-found UI + that
no client data appears (and no profile chrome), not `status === 404`. Contract A6 says "not-found /
redirect", which this satisfies.
Affects: tests/e2e/clients.spec.ts (A6), src/app/coach/(app)/clients/[id]/page.tsx, P1-01.

## D-020 — profiles_select_trainer_of uses has_client_link() (any status), not is_trainer_of() (2026-11-01, decided by: autopilot (D-006))
Why: is_trainer_of() matches only active/paused links, so after a coach archives a client they could no
longer read that client's profile (name/avatar), showing "Unnamed client" in the Clients list and
profile header — right where the P1-01 "…" Archive action (A10) leaves them. This parallels D-019 for
notes/files: a coach who is linked to a client (any status) keeps read access to that client's profile.
A trainer with no link still sees nothing. New migration 20261101080000 replaces the base-schema policy
(never edits the committed one); RLS test added.
Affects: supabase/migrations/20261101080000_profiles_trainer_any_status.sql, tests/rls/client_notes_files.test.ts, P1-01. See [[D-019]].

## D-019 — client_notes / client_files RLS uses an any-status link check, not is_trainer_of() (2026-11-01, decided by: autopilot (D-006))
Why: is_trainer_of() matches only active/paused trainer_clients links, so archiving a client would lock
the coach out of their own notes and files about that client. The policies instead check
`exists(select 1 from trainer_clients tc where tc.trainer_id = auth.uid() and tc.client_id = <row>.client_id)`
for any status. This still "mirrors the table" per docs/security.md §6 — the trainer owns the row and
is linked to the client — without coupling note access to the client's active state.
Affects: P1-01 (client_notes, client_files migrations + RLS tests), docs/security.md intent.

## D-018 — coach "More" (mobile) is a flat list of every destination not in the bottom bar (2026-11-01, decided by: autopilot (D-006))
Why: `docs/ui/patterns.md` summarises coach More as "programs, exercises, store, settings", where
"store" is the Products/Orders/Earnings group. The mobile More page must surface everything the
bottom bar omits, so it is a flat link list of Programs, Exercises, Forms, Products, Orders, Earnings,
Settings — the same destinations as the desktop sidebar's Library + Store + Settings groups, just
ungrouped. No labels or destinations differ from the sidebar; only the mobile presentation is flat.
Affects: src/components/shared/nav/nav-items.ts (COACH_MORE), src/app/coach/(app)/more/page.tsx, P0-05.

## D-017 — admin mobile navigation is a bottom bar of the sidebar destinations (2026-11-01, decided by: autopilot (D-006))
Why: `docs/ui/patterns.md` specifies the admin desktop sidebar but leaves mobile as "not optimised;
usable". The app's shared AppShell needs a mobile nav, so admin reuses its five sidebar destinations
(Trainers, Orders, Payments, Payouts, Settings) as a labelled bottom bar below `lg`, matching the
coach/client bottom-bar pattern rather than inventing a new structure.
Alternatives considered: no mobile nav (sidebar `hidden lg:flex` leaves mobile with no navigation —
not "usable"); a hamburger drawer (more components, no spec need at this phase).
Affects: src/components/shared/nav/nav-items.ts (ADMIN_BOTTOM), src/app/admin/layout.tsx, P0-05.
Flagged for the human in .harness/approvals.md — revert if a different admin mobile nav is wanted.

## D-013 — inline error text uses destructive-soft-foreground in dark (2026-11-01, decided by: autopilot (D-006))
Why: axe (WCAG AA) flagged inline error text — dark `--destructive` (#c93c3c) on the dark `--background`
(#121821) is 3.56:1, below 4.5:1 for normal text. `--destructive` is correct for solid buttons/icons
(white on destructive) but not as body text in dark. Inline field errors/messages now use
`text-destructive dark:text-destructive-soft-foreground` (light #A51F1F and dark #FF9C9C both pass AA on
background and card). Applied to FormMessage, FormLabel error state, and inline field error text.
Alternatives considered: darken the `--destructive` token (gated, and it would dull the solid button);
larger/bold error text (14px normal can't reach 3:1 large-text exemption).
Affects: src/components/ui/form.tsx, src/app/dev/ui/page.tsx; future screens' inline errors.
Also: radix-nova's resting `dark:bg-input/30` on Input/SelectTrigger composited to ~#363e49, where the
muted-foreground placeholder was 4.32:1 (under AA). Removed it so controls are `bg-transparent` on the card
(placeholder 6.2:1); structure comes from the border, per the design direction.

## D-012 — input border contrast is measured against card (2026-11-01, decided by: autopilot (D-006), palette human-approved via D-005)
Why: the contrast test (A1) recomputes WCAG ratios from globals.css. All text pairs meet AA 4.5:1 and the
focus `ring` meets 3:1 against both background and card. `--input` (#8A939D light) is 3.12:1 against `card`
but 2.87:1 against the page `background` (#F5F6F4) — a hair under 3:1. The design says input/ring meet 3:1
"against the surfaces they sit on"; form controls sit on `card` (raised panels/sheets/forms), so the test
asserts input vs card. Tokens are human-owned and were approved whole (D-005), so the hex is not changed.
How to apply: place inputs on a card/panel surface (not bare on the page background); if an input must sit
directly on `background`, wrap it in a card or the border will be slightly under the non-text contrast floor.
Affects: tests/unit/tokens-contrast.test.ts, docs/ui note for future screens.

## D-011 — shadcn base is radix-nova, standardized toolchain (2026-11-01, decided by: human-approved P0-03)
Why: shadcn CLI 4.23 only ships the new "radix-nova" styles (no classic preset). Kept it (its classes are
semantic tokens + interaction details that match the spec once our tokens load), with three fixes:
- `cn` standardized on clsx + tailwind-merge (`src/lib/utils.ts`). The radix-nova registry declares a `cn`
  package as a dependency, so **every `shadcn add` re-installs it** (and the stray `shadcn` runtime dep). After
  any `shadcn add`: rewrite `from "cn"` → `from "@/lib/utils"` across `src/components/ui/**`, then
  `pnpm remove cn shadcn`, and confirm `grep '"cn"' package.json` is empty. `cn`/`shadcn` are not pre-approved.
- Overlay scrims (`dialog.tsx`, `sheet.tsx`) use `bg-black/N` — the one permitted raw color, because a scrim
  must darken in both themes (a `foreground/N` token would invert). It lives inside `src/components/ui/`, where
  `check-architecture` is warning-tier by design.
- `destructive` button restored to SOLID (`bg-destructive`/`-foreground`) per design-system (delete/refund/errors);
  `-soft` tokens are for banners/chips only.
- Button sizes set to the spec: `sm` 36px (h-9), `default` 44px (h-11), `lg` 48px (h-12), icons to match.
- shadcn 4 has no `form` component; `src/components/ui/form.tsx` is the hand-authored RHF wrapper (react-hook-form + zod, pre-approved).
Alternatives considered: re-init with a classic preset (none exists in shadcn 4); hand-author all 18 components (a week of work for the same result).
Affects: src/components/ui/**, src/lib/utils.ts, package.json, P0-04/P0-05 (builders must run the cn-import fixup after `shadcn add`).

## D-016 — Slug DB check, button hover contrast, OAuth/email-confirm deferral (2026-11-01, decided by: autopilot (D-006))
- **Slug format in the DB**: migration `20261101062024_trainers_slug_format_check.sql` adds a CHECK matching
  the Zod `slugSchema`, so a trainer can't bypass validation via a direct REST PATCH of their own slug
  (verifier A5). Tested in tests/rls (bad-slug update → 23514).
- **Primary button hover** is `hover:bg-primary/90` (was radix-nova's `/80`, which lightened to #4c72da and
  gave white text only 4.44:1 — below AA). `/90` is ~5.5:1. App-wide for the default button variant.
- **Google OAuth deferred**: the contract says it's "present but disabled unless env vars set" and "not
  required for acceptance". It needs a cloud OAuth app + redirect URLs (human/approval_required) and an
  `/auth/callback` route; deferred and queued in approvals.md rather than shipping dead/misconfigured code.
- **Email auto-confirm**: signup uses `email_confirm: true` (local dev has confirmations off anyway). Turning
  on real email confirmation is a cloud auth setting = human (approval_required); queued in approvals.md.
- **checkSlugAction** is callable anonymously (reads slugs via the admin client) — low impact (storefront
  slugs are semi-public); note for P2 storefront to gate if needed.

## D-015 — Auth server-action input hardening (2026-11-01, decided by: autopilot (D-006))
Why: the P0-04 verifier found an open redirect — `signInAction`'s `next` param (from `/login?next=`) was
only checked with `.startsWith('/')`, which `//evil.com` passes (protocol-relative → external). Fixed with
`safeNext()` (must start with a single `/`, no `//`, no `://`, no backslash) and magic-link/reset now validate
email with Zod, not a hand-rolled regex. Role/trainer/slug were already server-side (D-010/D-014); this closes
the remaining unvalidated client input. Also: `completeOnboardingAction` now checks `roleOf(user)==='trainer'`
(defense in depth). Auth forms preserve typed values on error via `defaultValue` from the returned state
(React 19 form reset otherwise clears them), never the password.
Affects: src/features/auth/actions.ts, src/features/onboarding/actions.ts, src/features/auth/components/auth-forms.tsx.
Follow-up for P1-02 (invite creation): `trainer_clients.invite_expires_at` has no DB default and isn't in the
`authenticated` column grants, so trainer-created invites must set it server-side (or add a `now()+14d` default).

## D-014 — Becoming a trainer / pgcrypto / client link-read (2026-11-01, decided by: autopilot (D-006))
- **Trainer creation is service-role-only.** The P0-02 verifier found that `trainers_insert_own` + the column
  INSERT grant let any authenticated user (incl. a client) insert their own `trainers` row. Migration
  `20261101042136_trainers_insert_service_only.sql` drops that policy and revokes INSERT on `public.trainers`
  from `authenticated`; P0-04 onboarding creates the trainers row via the admin client / a security-definer
  function. Same boundary as role/plan/client_id (extends [[D-010]]). Tested: a client inserting its own
  trainers row is denied.
- **pgcrypto**: the base migration runs `create extension if not exists pgcrypto` for the seed's
  `crypt()`/`gen_salt()`. It is pre-installed on Supabase local, so this is a no-op; recorded because the
  contract's `approval_required` lists adding an extension (queued as an FYI in approvals.md).
- **Client reads their own trainer_clients link** (`trainer_clients_client_select`): intentional — a client
  must see their own coaching link/status in the client app. §6's policy table marks the Client column "—"
  for trainer-owned rows; this one own-row read is the documented exception (coach-only fields like
  `goals`/`injuries_notes` remain read-only to the client, which is acceptable for their own record).

## D-010 — Privileged columns are service-role-only (column privileges) (2026-11-01, decided by: autopilot (D-006))
Why: the P0-02 verifier found two self-escalation paths — a client could `update profiles set role='admin'`
on itself (then `is_admin()` opens everything), and a trainer could insert a `trainer_clients` row linking
an arbitrary `client_id` and then read that client via `is_trainer_of`. RLS controls rows, not columns, so
the fix is PostgreSQL column privileges: `authenticated` is granted INSERT/UPDATE only on non-privileged
columns. `profiles.role`, `trainers.plan` and `trainer_clients.client_id` become writable only by the
service role (seed) or security-definer server code — i.e. role is set at signup and client linking at
invite-accept (P0-04), never by a user via the API.
Alternatives considered: BEFORE triggers guarded by `auth.role()='authenticated'` — rejected as fragile
(depends on JWT-claim GUCs that are empty for the postgres/seed context and vary by CLI version); column
privileges are static and PostgREST-native.
Affects: supabase/migrations/20261101025837_harden_rls_column_privileges.sql, tests/rls/isolation.test.ts, P0-04 (signup role + invite-accept must use the admin client / a security-definer function).

## D-009 — e2e uses a dedicated port (3100) (2026-11-01, decided by: autopilot (D-006))
Why: during P0-02 the default port 3000 was held by an unrelated local process (a peer session's Remotion
render), so Playwright's `next start` could not bind and e2e failed. A fixed, project-specific port (3100,
overridable via `PORT`) decouples this project's e2e from other local dev servers and prevents the flake
recurring across tasks.
Alternatives considered: kill whatever holds 3000 (unsafe — could be another project's work); rely on the
port clearing (fragile, timing-dependent).
Affects: playwright.config.ts (baseURL + webServer), P0-01 scaffold artifact amended under P0-02.

## D-008 — P0-01 scaffold choices (2026-11-01, decided by: autopilot (D-006))
Why: get a green scaffold within the contract's allowed packages and the harness checks.
- **Tailwind v4 via `@tailwindcss/postcss` + `postcss`**, not `@tailwindcss/turbopack` (what create-next-app 16's
  empty template emits): the turbopack plugin is not in the autopilot pre-approved list; postcss is. Turbopack
  (default bundler in Next 16) reads `postcss.config.mjs`, so build/dev/e2e all pass. The turbopack CSS rule was
  removed from `next.config.ts`.
- **Prettier and ESLint ignore harness-owned paths** (`docs/`, `tasks/`, `scripts/`, `.claude/`, `.github/`,
  `.harness/`, `supabase/`) and prose docs (`README.md`, `CLAUDE.md`, `AGENTS.md`). These are not app code; the
  app's formatter/linter must not rewrite or fail on files the task may not edit. This is config scoping, not
  weakening a check — `check-architecture.mjs`, typecheck and the test suites are untouched.
- **`engines.node` = `">=24.0.0"`** to match the installed LTS (Node 24). Revisit in P0-06 if Vercel/CI pins another LTS.
- **Root layout uses an explicit `{ children: ReactNode }` type**, not Next 16's generated `LayoutProps<'/'>` global,
  so `tsc --noEmit` is green on a fresh tree before any build generates `.next/types`.
Alternatives considered: turbopack Tailwind plugin (not pre-approved); formatting the harness docs (out of scope, risks churn).
Affects: package.json, next.config.ts, postcss.config.mjs, .prettierrc.json, .prettierignore, eslint.config.mjs, src/app/layout.tsx.

## D-007 — Parallel builders with a serial schema lane (2026-11-01, decided by: human)
Why: the owner wants independent tasks built in parallel by agents. One local Supabase stack and one set of
ports can't be shared safely, so the orchestrator does contracts, schema (migrations, RLS, seed, types),
merging, `verify --full` and reviews; `builder` agents in git worktrees do only the app code, checked with fast verify.
Alternatives considered: one Supabase stack per worktree (too heavy for a laptop); fully sequential (slow).
Affects: .claude/agents/builder.md, .claude/skills/autopilot/SKILL.md, guard-bash/guard-paths builder rules, settings `worktree.baseRef: head`.

## D-006 — Autopilot: the human pre-approves the run (2026-11-01, decided by: human)
Why: the owner wants one prompt to build the whole product without re-prompting per task.
What it means: while `node scripts/autopilot.mjs` is on, Claude approves the contracts it drafts (after a strict
self-check that the verifier re-checks), installs the dependencies listed in `.harness/autopilot.json`, and never
waits for answers: everything in the policy's `human_only` list is queued in `.harness/approvals.md`. Pushes, deploys,
remote database changes, secrets, harness files, tokens and UI specs stay with the human. The Stop hook keeps the
session going until COMPLETE / NEEDS-HUMAN, with a loop breaker after 3 continuations without progress.
Affects: CLAUDE.md, .claude/skills/autopilot/, .claude/hooks/stop-gate.mjs, guard-bash.mjs, guard-paths.mjs, session-start.mjs, scripts/autopilot.mjs.

## D-005 — Visual direction "chalk and iron" (2026-11-01, decided by: human; approved 2026-11-01)
Why: grounded in the gym itself (chalk surfaces, iron ink, 20 kg competition blue, 15 kg plate yellow
for PRs only), numbers-first with one typeface (Archivo, condensed for figures); avoids generic
template looks. All values are tokens, so a brand change is one file.
Alternatives considered: shadcn defaults (neutral, indistinct), dark-first "athletic" theme (poor in bright gyms).
Affects: docs/ui/design-system.md, P0-03.

## D-004 — English only for now; Arabic deferred (2026-11-01, decided by: human)
Why: the owner wants English only at launch.
Consequence: no i18n library, no RTL, no `_ar` columns. Adding Arabic later is its own project
(i18n library, message files, logical CSS properties, Arabic typography, RTL screenshots).
Affects: docs/product.md, docs/platform.md §9, docs/data-model.md, docs/architecture.md.

## D-003 — Payments go through a provider interface with a mock first (2026-11-01, decided by: human)
Why: lets Phase 2 be built and tested locally before Whish sandbox credentials arrive.
Alternatives considered: integrate Whish directly.
Affects: docs/payments.md §8.1, P2-01, P2-09.

## D-002 — Platform is the merchant of record at launch (option A) (2026-11-01, decided by: pending human confirmation)
Why: trainers need no Whish merchant account; commission is simple to collect.
Alternatives considered: each trainer connects their own Whish (option B), planned for Phase 4.
Affects: ledger_entries, payouts, P2-06.

## D-001 — Build with a harness: contracts, checks, verifier, receipts (2026-11-01, decided by: human)
Why: reliable autonomous work comes from the environment, not longer prompts.
Affects: CLAUDE.md, docs/HARNESS.md, tasks/, .claude/, scripts/.
