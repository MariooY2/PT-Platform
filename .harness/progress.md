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
| P1-02 | Invite by email and link, CSV import | building | 0 | — | No schema; builder on app code from base e1f57407 |
| P1-03 | Form builder, intake, check-in review | building | 0 | — | Schema lane done (e1f57407); builder on app code from base e1f57407 |
| P1-09 | Habits (coach sets, client ticks) | building | 0 | — | Schema lane done (e1f57407); builder on app code from base e1f57407 |
| P1-05 | Program builder (grid, editor, quick entry, supersets) | approved | 0 | — | Approved (D-006); runs as its own wave AFTER P1-02/03/09 (biggest P1 task); schema + parser + UI split |

## Blocked items needing the human

None yet.
