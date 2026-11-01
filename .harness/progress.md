# Progress

One row per task that has a contract. Status: draft · approved · building (with a parallel builder) · in_progress · verifying · done ·
parked (done locally; `(human)` lines wait in approvals.md) · blocked.

| ID | Title | Status | Attempts | Receipt | Notes |
| --- | --- | --- | --- | --- | --- |
| P0-01 | Scaffold Next.js + tooling | done | 1 | [P0-01](receipts/P0-01.md) | verify --full green (fp c12ef5a4); verifier ACCEPT |
| P0-02 | Local Supabase, base schema, RLS | done | 2 | [P0-02](receipts/P0-02.md) | verify --full green (fp ddb21d27); 16 RLS tests; verifier ACCEPT (RLS hardened, D-010) |
| P0-03 | Design system, UI gallery, screenshot + axe suite | blocked | 0 | — | NEEDS-HUMAN: applying design tokens to globals.css is gated (guard-paths + human_only) and D-005 is pending review. See approvals.md. Blocks P0-04/05/06 and all of Phase 1-3. |
| P0-04 | Auth, roles, onboarding, routing | draft | 0 | — | |
| P0-05 | Navigation and layout shells | draft | 0 | — | |
| P0-06 | CI and Vercel preview | draft | 0 | — | |

## Blocked items needing the human

None yet.
