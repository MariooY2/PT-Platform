# Phase 0 gate receipt — Foundation

Date: 2026-11-01 · Phase 0 tasks: P0-01…P0-06 (6/6 closed: 5 done, 1 parked)

Maps each docs/phases.md §13 "Phase 0 — Accept when" line to evidence, or to the human when it can
only be proven off this machine. Per-task detail is in the linked receipts.

| # | Gate line | Evidence | Status |
| --- | --- | --- | --- |
| 1 | Fresh clone → `pnpm i`, `supabase start`, `supabase db reset`, `pnpm dev` works; README documents it | README.md "Set up" + "Develop the app" + "Continuous integration"; `.github/workflows/ci.yml` runs exactly this chain (install → supabase start → db reset → full build/test) on a clean runner — see [P0-06](receipts/P0-06.md) A1 | met locally; a literal fresh-clone-on-a-new-machine run is (human) |
| 2 | Trainer signs up → onboarding wizard → lands on `/coach` | [P0-04](receipts/P0-04.md) (auth + onboarding e2e, `tests/e2e/auth.spec.ts`) | met |
| 3 | Trainer creates invite link → new user opens it, signs up → lands on `/client`, linked to that trainer | [P0-04](receipts/P0-04.md) (invite flow e2e) | met |
| 4 | Wrong-role access redirects correctly; unauthenticated access goes to login | [P0-04](receipts/P0-04.md) (`src/middleware.ts` + e2e); relied on by [P0-05](receipts/P0-05.md) nav | met |
| 5 | UI gallery + all four shells pass axe + the UI checklist at 360 and 1280, light and dark | [P0-03](receipts/P0-03.md) (gallery axe + ui-reviewer) and [P0-05](receipts/P0-05.md) A3/A4/A6 (four shells: screenshots + axe + ui-reviewer ACCEPT) | met |
| 6a | RLS tests for the base tables pass | [P0-02](receipts/P0-02.md) (21 RLS tests, `pnpm test:rls`) | met |
| 6b | lint, typecheck, tests pass | `verify --full` green across the phase; enforced on every push/PR by [P0-06](receipts/P0-06.md) A1 | met |
| 6c | deploys to a Vercel preview | [P0-06](receipts/P0-06.md) A6/A7 — Vercel project + cloud Supabase + env vars + preview URL | (human) |

## Not met locally (the human's to complete)
- The Vercel preview deployment and the cloud Supabase project it reads (gate line 6c). CI proves the
  code passes the full gate on a clean machine; standing up the hosted preview is human-only
  (.harness/autopilot.json). Exact steps are in .harness/approvals.md (P0-06 A5–A7, and the P0-04
  email-confirmation line).

## Harness proposals from Phase 0 (need the human — /harness-upgrade)
- L-001: add a check that flags a Server Component passing a function/component (e.g. a lucide icon)
  as a prop to a `'use client'` component — the production build catches it but the fast lane doesn't.
  Recorded in .harness/lessons.md; proposed as a check-architecture.mjs rule.

## Decisions recorded in Phase 0
D-004, D-005, D-008…D-016 (earlier tasks), D-017 (admin mobile bottom bar), D-018 (flat coach More).
See .harness/decisions.md.
