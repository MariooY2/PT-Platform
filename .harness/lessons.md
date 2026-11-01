# Lessons

Failures that should change future behaviour. Each lesson names the harness change it produced, so
the fix lives in infrastructure, not only in this file. Newest first.

Format:

```
## L-NNN — <one-line lesson> (YYYY-MM-DD, task <ID>)
What happened: <observable failure>
Failure class: contract | context | tool | precondition | verification | policy | recovery | trace
Harness change: <file and rule added, or "proposed, awaiting approval">
```

## L-001 — a Server Component must not pass a component reference to a Client Component (2026-11-01, task P0-05)
What happened: AppShell (server) passed nav arrays containing `icon` lucide components as props to the
BottomNav/SideNav client islands. Fast verify (`verify.mjs`) passed, but `verify --full` failed at the
`next build` step with "Functions cannot be passed directly to Client Components" while prerendering
the shell pages. Fixed by passing a serializable `variant` string and having the client islands import
their own item arrays from nav-items.ts.
Failure class: verification
Harness change: proposed — add a `check-architecture.mjs` rule (or lint) that flags a Server Component
file passing a value imported from `lucide-react` (or any function/component) as a prop to a `'use client'`
component. Until then, the lesson is: the production build is the gate that catches RSC boundary errors,
so `verify --full` (which runs `next build`) must pass before a UI task with client/server composition is
considered done — the fast lane cannot catch it. (Harness-file change needs the human: /harness-upgrade.)
