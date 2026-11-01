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
| P1-02 | Invite by email and link, CSV import | verifying | 0 | — | Merged f2c127e; migration 20261101103000 defaults invite_expires_at +14d (D-015). Code-complete; green on every route. Clients L-002 prerender fix 033d89e. Waiting on a green tree (blocked only by P1-03's /coach/forms target-size — app-shell, see approvals); closes with no further code change once forms is green. Real email send is (human). |
| P1-03 | Form builder, intake, check-in review | blocked | 1 | — | Merged 9f85cfd. Blocked on A5 (zero-axe at 360): `/coach/forms` default fails WCAG 2.2 target-size — the fixed bottom nav obscures Question 2's move-chevrons mid-page at the fold (44×9px). Spec (program-builder.md §Forms) is silent on a phone builder-as-own-view, so this is the app-shell overlap, not a P1-03 layout bug; no per-card tweak produces a 56px control-free band. Needs the human-gated inner-scroll shell (see approvals). All other P1-03 routes/acceptance green. |
| P1-09 | Habits (coach sets, client ticks) | verifying | 0 | — | Merged 73fb7b3; /client default + /coach/clients/[id] habits routes added (D-025). Code-complete; green on every route. Waiting on a green tree (blocked only by P1-03's forms target-size — app-shell, see approvals); closes with no further code change once forms is green. |
| P1-05 | Program builder (grid, editor, quick entry, supersets) | verifying | 1 | — | Schema (f764f6e, 7 RLS) + parser (f500400, 12 unit) + builder UI on master. Day-grid target-size cleared by 4871cbc (grid-cols-2 + Add in card header + min-h-24) — `/coach/programs/[id]` passes target-size in verify --full e2e. Code-complete; green on every route. Waiting on a green tree (blocked only by P1-03's forms target-size — app-shell, see approvals); closes with no further code change once forms is green. v1 keyboard/preview deferrals recorded in the contract. |

## Blocked items needing the human

- **P1-03** blocked on A5 (zero-axe at 360). `/coach/forms` fails WCAG 2.2 `target-size`: the
  `fixed bottom-0` nav overlaps mid-page interactive controls at scroll-top (Question 2's move
  chevrons, obscured to 44×9px). This is the shared app-shell overlap, not a per-task bug — the same
  mechanism hit `/coach/programs/[id]` (fixable there only because its fold could land on empty card
  body; the forms builder is uniformly dense and has no such band). The fix is the human-gated
  inner-scroll shell + a coordinated `tests/e2e/ui.spec.ts` screenshot change — see the
  `harness / design-system · persistent bottom nav obscures…` line in approvals.md. **Resolving it
  turns the tree green and closes P1-02, P1-05 and P1-09 (all code-complete) with no further code
  change, and unblocks P1-03.**
