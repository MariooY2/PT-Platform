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

## L-004 — radix-nova components use `data-<word>:` variants that have no matching @custom-variant, so those states/animations are dead (2026-11-01, task P1-01/P1-04)
What happened: the shadcn radix-nova components use shorthand variants like `data-active:`, `data-horizontal:`/`data-vertical:`, `data-checked:`, `data-open:`/`data-closed:`. Radix actually emits `data-state=…` / `data-orientation=…`, and no `@custom-variant` maps the shorthands (globals.css defines only `dark` — the radix-nova variant definitions were dropped when the D-005 "chalk and iron" tokens replaced shadcn's generated globals.css). So those styles never apply: Tabs' active pill + orientation were dead (clients profile rendered tabs as a left column, active tab failed AA contrast), and Checkbox's checked fill was dead. Caught only when the clients profile (Tabs) and the New-exercise dialog (Checkbox) became the first screens to use them. Fixed tabs.tsx and checkbox.tsx to `data-[state=…]` / `data-[orientation=…]`. The remaining hits are animation-only (dialog/dropdown/popover/select/sheet/tooltip enter/leave) plus separator sizing — cosmetic, queued for the human.
Failure class: verification
Harness change: proposed (approvals) — either add the missing `@custom-variant` definitions to src/app/globals.css (one place, fixes every component; design-token file → human) or convert the remaining `src/components/ui/*.tsx` shorthands to `data-[state=…]`/`data-[orientation=…]`. check-architecture should grow a rule flagging `data-(active|checked|open|closed|horizontal|vertical)[:/]` in components. See [[L-002]].

## L-005 — an auth/gate layout that reads the session forces every child route dynamic (2026-11-01, task P1-03)
What happened: P1-03's intake gate added `await connection()` + a session read to src/app/client/(app)/layout.tsx. Under Next 16 cacheComponents, a layout accessing cookies/connection() OUTSIDE <Suspense> blocks prerendering of its static children, so `verify --full`'s build failed: `Route "/client/billing": Next.js encountered uncached or runtime data during prerendering`. The gate must run before children render (a redirect), so it can't go in Suspense — therefore every route under that layout is inherently dynamic. Fixed by adding `await connection()` to all six static client (app) placeholder pages (billing, checkins, messages, progress, settings, more); client Today already had it. Caught only by the build step (fast verify can't see it).
Failure class: verification
Harness change: proposed — when a wave adds a session-reading gate to a layout, the orchestrator must make every page in that segment dynamic (connection()) in the same integration. A check-architecture rule could flag a page under a connection()-using layout that itself lacks connection()/Suspense. See [[L-002]].

## L-006 — controls at the fold under the sticky bottom nav need 44px, not the 24px axe minimum (2026-11-01, task P1-05/P1-03)
What happened: the program builder's day-column "Add" (size="sm" = h-9/36px) and the forms question-editor's icon-sm (36px) controls failed axe target-size (wcag22aa) at 360px: the sticky bottom nav obscures the bottom ~56px of the viewport, so a 36px control at the fold is clipped to ~12px (< the 24px minimum) and sits ~13px from the nav (target-offset). Cards passed because they're ≥44px (≥24px remains when obscured). Fix: use the default 44px size (design-system.md:82 mandates 44px everywhere anyway) for any interactive control in a scrollable list/grid on mobile. The AppShell `pb-16` fixes the scroll-END overlap but NOT the fold (mid-page content under the nav at scroll-top).
Failure class: verification
Harness change: proposed — a checklist/lint note that interactive controls in mobile list/grid rows use the 44px size, not sm/icon-sm. See [[L-005]].
