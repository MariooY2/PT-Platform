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

## L-002 — a Server Component that reads the Supabase session in its body must `await connection()` first (2026-11-01, task P1-01/P1-04)
What happened: P1-04's /coach/exercises and P1-01's /coach/clients/[id] both read `supabase.auth.getUser()` directly in the page body with only `export const instant = false`. Fast verify and `next build` passed, but `verify --full`'s e2e step failed at request time: "Route …: Next.js encountered the unstable value `Date.now()` while prerendering" (supabase-js `_emitInitialSession` → `__loadSession`). `instant = false` does NOT prevent the prerender pass from running the body. The fix is `await connection()` before the Supabase read (or putting the read inside a `<Suspense>` boundary, as /coach/clients does). Found only by `verify --full` (build + e2e), not the fast lane.
Failure class: verification
Harness change: proposed — add a check-architecture rule (or builder-brief note) that a `src/app/**/page.tsx` which calls `supabase.auth.getUser()`/`createClient()` in the default export body must also `await connection()` or wrap the read in Suspense. Until then, builder briefs for Supabase pages must state this. (Harness-file change needs the human: /harness-upgrade.) See [[L-001]].

## L-003 — the verify/e2e build has no NEXT_PUBLIC_* env, so browser Supabase clients are empty-configured (2026-11-01, task P1-01)
What happened: P1-01's file upload used the browser Supabase client (createClient from supabase/browser, which reads build-time NEXT_PUBLIC_SUPABASE_URL/ANON_KEY). In the A5 e2e the upload silently failed ("No files yet" + error alert) because `verify.mjs`'s `pnpm build` runs with no NEXT_PUBLIC_* env — only the Playwright webServer injects them at runtime for `pnpm start`, which is too late for the client bundle. Server-side Supabase (reads env at runtime) was unaffected, which is why it went unnoticed until the first browser-side e2e. Fixed in FilesPanel by fetching the public url/anon key from a server action at runtime (works from one build in every environment). Systemic fix (so all future browser-Supabase e2e works): inject NEXT_PUBLIC_SUPABASE_URL/ANON_KEY into the build step of scripts/verify.mjs and .github/workflows/ci.yml from `supabase status` — queued for the human (harness change).
Failure class: verification
Harness change: proposed (queued in approvals.md) — export NEXT_PUBLIC_SUPABASE_URL/ANON_KEY before `pnpm build` in verify.mjs/ci.yml. See [[L-002]].
