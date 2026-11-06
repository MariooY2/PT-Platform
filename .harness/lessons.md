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

## L-011 — a receipt must not pre-fill ANY verdict-dependent cell before the verdict exists (2026-11-06, task P1-08)
What happened: the P1-08 receipt was staged ahead of the re-review with the header verdict set to "pending"
but the A7 table cell still reading "ui-reviewer ACCEPT | pass". The re-run verifier (a92f711) REJECTED on
exactly that — a "passed" written for a check nobody had recorded yet (CLAUDE.md: never write passed for a
check you did not run) — even though A1–A6 were sound. Compounding it: the ui-reviewer and verifier ran in
parallel, and the verifier searched .harness/ for a ui-reviewer ACCEPT, found none (it had just landed and
wasn't persisted anywhere durable), and reported "no record exists." Second time this class was flagged
(the first-round P1-08 verifier flagged the same pre-declared header).
Failure class: verification
Harness change: proposed (queued in approvals) — (1) a receipt-consistency check that fails if any row cites
a reviewer verdict while the header says the review is pending; (2) persist every reviewer hand-back to
`.harness/evidence/<ID>/review-<agent>.md` on arrival, so a concurrently-running reviewer/verifier can SEE a
parallel verdict instead of reporting it absent. Behaviour until then: never fill a verdict cell (header, row
or summary) until that verdict is in hand; stage receipts with every verdict-dependent cell left "pending".

## L-010 — the e2e suite outgrew verify.mjs's 600s test:e2e cap (2026-11-06, task P1-08/P1-12/P3-05)
What happened: after the Phase-1 UI wave, `tests/e2e/ui.spec.ts` screenshots every route × state × theme ×
viewport (and resizes the viewport per shot for the inner-scroll full-page capture), so `--full` began
hitting the hard 600s `test:e2e` timeout in scripts/verify.mjs. Mitigations applied without touching the
harness: a shared memoized `supabase status` (tests/e2e/supabase-admin.ts) instead of one spawn per spec;
ui.spec skips the viewport resize when a page fits; Playwright local workers → 75%. Also learned: a run
that TIMES OUT leaves its e2e-created users uncleaned (afterAll never runs), which then fails the next
`test:rls` (isolation.test.ts asserts exact seeded counts) until a `supabase db reset`.
Failure class: verification
Harness change: proposed (human — scripts/ is human-owned) — raise the `test:e2e` step timeout in
scripts/verify.mjs (e.g. 600s → 1200s) for headroom as the suite grows, and/or shard ui.spec. Queued in
approvals.md.

## L-009 — two build-only traps that fast verify can't catch (2026-11-06, task P1-08)
What happened: the P1-08 builder hit (and fixed) two errors that only `next build` surfaces, not
`node scripts/verify.mjs` (fast, no build): (1) a `'use server'` file may export ONLY async functions —
a non-async const export (e.g. PROGRESS_BUCKET) breaks the build; (2) a Server Component must not read a
runtime value dotted off a module that is `'use client'` (e.g. importing PROGRESS_TABS from a client
module) — it must live in a plain module. Fast verify passes; `--full`'s build fails.
Failure class: verification
Harness change: proposed — add a cheap static check (grep/lint) for a non-async export in a 'use server'
file and a Server→'use client' runtime-value import, so these surface in fast verify, not only at --full.

## L-008 — Zod 4 `z.string().uuid()` rejects the project's deterministic seed ids (2026-11-02, task P1-06/P1-05)
What happened: P1-05's actions.ts gated every id with `const uuid = z.string().uuid()`. Zod 4's uuid check
enforces RFC-4122 version/variant nibbles, which the deterministic seed ids (e.g.
bbbb0000-0000-0000-0000-000000000001) lack — so every server action on the seeded sample-template route
(/coach/programs/bbbb…-0001: Add workout / Publish / quick-entry / superset) would have returned the
generic error. The P1-05 e2e missed it because it operated on a freshly created program (a real v4 uuid).
The P1-06 builder caught it and switched to a format-only `uuidLike` regex (matching clients/schemas.ts).
Failure class: verification
Harness change: proposed — a single shared `uuidLike` validator, and a review note that `z.string().uuid()`
must not gate ids that can be seed ids. Reinforces L-007: exercise the real seeded route, not only a
freshly created row.

## L-007 — the contract self-check verified "evidence named" on paper, not against the diff (2026-11-02, task P1-05/P1-03)
What happened: P1-05 passed its autopilot self-check and a green verify --full, but the verifier later found
A6 ("editing a client copy doesn't change the template") had ZERO test, Zod was missing on 7 of 8 server
actions (constraint line 37), and supersets were an A1-only toggle (A5 wants A1/A2). P1-03's A6 named
screenshots for /client/checkin/[id] that never existed (route not in ui-routes; seed had only submitted
responses). Each acceptance line *named* checkable evidence, so the self-check passed — but nothing confirmed
the evidence was actually produced by the diff. Green --full only proves the tests that exist pass, not that
the contract's required tests were written.
Failure class: verification
Harness change: proposed, awaiting approval — the contract self-check (and/or a close-time gate) should, for
each acceptance line, grep the diff for the specific artifact it names (a test file/case, a ui-routes entry +
screenshot, a Zod schema per server action) and fail if absent, rather than trusting the line's own wording.
Target for the next /harness-upgrade.

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
