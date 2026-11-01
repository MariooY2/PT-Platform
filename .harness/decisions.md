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

## D-013 — inline error text uses destructive-soft-foreground in dark (2026-11-01, decided by: autopilot (D-006))
Why: axe (WCAG AA) flagged inline error text — dark `--destructive` (#c93c3c) on the dark `--background`
(#121821) is 3.56:1, below 4.5:1 for normal text. `--destructive` is correct for solid buttons/icons
(white on destructive) but not as body text in dark. Inline field errors/messages now use
`text-destructive dark:text-destructive-soft-foreground` (light #A51F1F and dark #FF9C9C both pass AA on
background and card). Applied to FormMessage, FormLabel error state, and inline field error text.
Alternatives considered: darken the `--destructive` token (gated, and it would dull the solid button);
larger/bold error text (14px normal can't reach 3:1 large-text exemption).
Affects: src/components/ui/form.tsx, src/app/dev/ui/page.tsx; future screens' inline errors.

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
- `cn` standardized on clsx + tailwind-merge (`src/lib/utils.ts`); the non-pre-approved `cn` package and the
  stray `shadcn` runtime dep were removed. After any `shadcn add`, rewrite `from "cn"` → `from "@/lib/utils"`.
- `destructive` button restored to SOLID (`bg-destructive`/`-foreground`) per design-system (delete/refund/errors);
  `-soft` tokens are for banners/chips only.
- Button sizes set to the spec: `sm` 36px (h-9), `default` 44px (h-11), `lg` 48px (h-12), icons to match.
- shadcn 4 has no `form` component; `src/components/ui/form.tsx` is the hand-authored RHF wrapper (react-hook-form + zod, pre-approved).
Alternatives considered: re-init with a classic preset (none exists in shadcn 4); hand-author all 18 components (a week of work for the same result).
Affects: src/components/ui/**, src/lib/utils.ts, package.json, P0-04/P0-05 (builders must run the cn-import fixup after `shadcn add`).

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
