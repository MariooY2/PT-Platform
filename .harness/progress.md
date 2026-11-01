# Progress

One row per task that has a contract. Status: draft · approved · building (with a parallel builder) · in_progress · verifying · done ·
parked (done locally; `(human)` lines wait in approvals.md) · blocked.

| ID | Title | Status | Attempts | Receipt | Notes |
| --- | --- | --- | --- | --- | --- |
| P0-01 | Scaffold Next.js + tooling | done | 1 | [P0-01](receipts/P0-01.md) | verify --full green (fp c12ef5a4); verifier ACCEPT |
| P0-02 | Local Supabase, base schema, RLS | done | 3 | [P0-02](receipts/P0-02.md) | verifier ACCEPT vs P0-02-database.yaml; 21 RLS tests; trainers-insert hole closed (D-014); dup contract removed |
| P0-03 | Design system, UI gallery, screenshot + axe suite | verifying | 1 | — | verify --full green (fp 28e6b206); gallery + screenshots (4) + axe both themes; awaiting ui-reviewer + verifier |
| P0-04 | Auth, roles, onboarding, routing | draft | 0 | — | |
| P0-05 | Navigation and layout shells | draft | 0 | — | |
| P0-06 | CI and Vercel preview | draft | 0 | — | |

## Blocked items needing the human

None yet.
