# Progress

One row per task that has a contract. Status: draft · approved · building (with a parallel builder) · in_progress · verifying · done ·
parked (done locally; `(human)` lines wait in approvals.md) · blocked.

| ID | Title | Status | Attempts | Receipt | Notes |
| --- | --- | --- | --- | --- | --- |
| P0-01 | Scaffold Next.js + tooling | done | 1 | [P0-01](receipts/P0-01.md) | verify --full green (fp c12ef5a4); verifier ACCEPT |
| P0-02 | Local Supabase, base schema, RLS | done | 3 | [P0-02](receipts/P0-02.md) | verifier ACCEPT vs P0-02-database.yaml; 21 RLS tests; trainers-insert hole closed (D-014); dup contract removed |
| P0-03 | Design system, UI gallery, screenshot + axe suite | done | 2 | [P0-03](receipts/P0-03.md) | verifier ACCEPT (A1-A7) + ui-reviewer ACCEPT (A8); verify --full green (fp 690cb5d6) |
| P0-04 | Auth, roles, onboarding, routing | done | 1 | [P0-04](receipts/P0-04.md) | verifier ACCEPT (A1-A5) + ui-reviewer ACCEPT (A6); verify --full green (fp 6579a889) |
| P0-05 | Navigation and layout shells | done | 2 | [receipt](receipts/P0-05.md) | verify --full green (fp 5eee889c); verifier + ui-reviewer ACCEPT (HEAD 6cbb3ec); D-017/D-018 recorded |
| P0-06 | CI and Vercel preview | parked | 1 | [receipt](receipts/P0-06.md) | verifier ACCEPT (A1-A4 local); A5-A7 (push, preview deploy, cloud Supabase) are (human) in approvals.md; verify --full green (fp 5eee889c) |
| P1-01 | Clients list and profile | done | 3 | [receipt](receipts/P1-01.md) | verifier + ui-reviewer ACCEPT; verify --full green (fp ff4ad8d6); D-019/D-020/D-021; tabs+checkbox variant fix (L-004) |
| P1-04 | Exercise library and global seed | done | 3 | [receipt](receipts/P1-04.md) | verifier + ui-reviewer ACCEPT; verify --full green (fp ff4ad8d6); ~148 seed; D-023/D-024; videoUrl http(s) refine |
| P1-13 | PWA manifest and install prompt | done | 2 | [receipt](receipts/P1-13.md) | verifier + ui-reviewer ACCEPT; verify --full green (fp ff4ad8d6); D-022; manifest + install card + og icons |
| P1-02 | Invite by email and link, CSV import | done | 1 | [P1-02](receipts/P1-02.md) | Verifier + ui-reviewer ACCEPT; verify --full green (fp 9cca7fac). Merged f2c127e; invite dialog (copy-link+WhatsApp, email, CSV), mock email provider, invite_expires_at +14d (D-015), clients L-002 fix 033d89e. Real email send is (human). |
| P1-03 | Form builder, intake, check-in review | done | 2 | [P1-03](receipts/P1-03.md) | Verifier + ui-reviewer ACCEPT; verify --full green (fp 9cca7fac). Merged 9f85cfd. SECURITY fix 5112877 (tenant guard pins trainer_id/form_id/client_id on client updates, re-probed closed); both /client/checkin screens seeded + routed; checkin_schedules RLS + A5 ordering tests added. |
| P1-09 | Habits (coach sets, client ticks) | done | 1 | [P1-09](receipts/P1-09.md) | Verifier + ui-reviewer ACCEPT; verify --full green (fp 9cca7fac). Merged 73fb7b3; /client Today ticks + /coach/clients/[id] habits (D-025); optimistic + idempotent upsert. |
| P1-05 | Program builder (grid, editor, quick entry, supersets) | done | 2 | [P1-05](receipts/P1-05.md) | Verifier + ui-reviewer ACCEPT; verify --full green (fp 9cca7fac). Schema (f764f6e, RLS) + parser (f500400, 12 unit) + builder UI. Fix pass 5112877: Zod on all 8 actions, real A1/A2 supersets, A6 copy-integrity + nested-row RLS tests, loading.tsx, copy. Inner-scroll shell 86af58e (D-029). v1 keyboard/preview deferrals recorded. |
| P1-06 | Templates and assignment by deep copy, with preview | done | 2 | [P1-06](receipts/P1-06.md) | Verifier + ui-reviewer ACCEPT; verify --full green (fp f720667e). Atomic copy_program_for_client() + assign dialog + read-only preview + Used-by count. Fixed a latent P1-05 Zod-uuid bug (L-008). |
| P1-10 | Weekly check-in scheduling and due generation | parked | 2 | [P1-10](receipts/P1-10.md) | Verifier + ui-reviewer ACCEPT; verify --full green (fp f720667e). A1–A6 proven; weekday + settings default (prefill, D-032) + due-generation endpoint (fails closed) + /client/checkins. PARKED on A7 (human): register the vercel.json cron + CRON_SECRET (approvals.md). Parked counts as done for dependents. |
| P1-07 | Client Today + workout player with set logging | done | 2 | [P1-07](receipts/P1-07.md) | Verifier + ui-reviewer ACCEPT; verify --full green (fp 13e9d72c). 3 tables + RLS + Epley PR trigger + client-read-exercises policy; Today + player (outside the (app) group); idempotent client_generated_id upserts; prefill + previous performance + rest timer + finish-with-RPE. Offline/swap/skip/unscheduled/supersets deferred. |
| P1-08 | Progress — strength, body, photos, calendar | verifying | 1 | — | Merged 86bb634. Fixed a real bug: calendar used an invalid date literal (2026-11-31) → Calendar failed to load in 30/29/28-day months (now half-open range). Build/rls green; final --full gated on an e2e-suite timing issue (600s cap vs grown screenshot suite), being addressed. Reviews pending. |
| P1-12 | Coach Today — needs attention, check-ins, today's training | verifying | 0 | — | Merged c1527f7. No schema lane. Build/rls/coach-today e2e green; final --full gated on the shared e2e-suite timing issue. Reviews pending. Message action → client profile (P1-11); renewal/snooze/revenue deferred. |
| P3-05 | Offline workout logging (IndexedDB queue) | verifying | 0 | — | Merged a69a2ab. Dexie outbox + service worker (gated off by default) + SyncIndicator; flush via P1-07's idempotent upsert. Build/rls/offline e2e green; final --full gated on the shared e2e-suite timing issue. Reviews pending. SW production-enable parked (human). |
| P1-11 | Messaging (realtime coach↔client) | blocked | 0 | — | Held on the human NEXT_PUBLIC build-env fix. P1-11 is the first browser-side realtime Supabase consumer; `verify --full`'s `pnpm build` and CI run with no NEXT_PUBLIC_* env, so a realtime channel is empty-configured in e2e and cannot be verified. Not contracted yet — build it once the `harness (P1-01) · inject NEXT_PUBLIC_*` approval lands. See approvals.md. |

## Blocked items needing the human

- **P1-11** (messaging) — held on the human NEXT_PUBLIC build-env fix (first browser-side realtime
  Supabase consumer; `verify --full`/CI build runs with no NEXT_PUBLIC_* env, so a realtime channel
  can't be verified in e2e). Not contracted yet. See approvals.md. Everything else in Phase 1 is done
  or parked; the app-shell block (P1-02/03/05/09) was resolved by the inner-scroll shell (D-029).
