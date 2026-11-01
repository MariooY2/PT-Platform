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

## D-005 — Visual direction "chalk and iron" (2026-11-01, decided by: pending human review)
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
