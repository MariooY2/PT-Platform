# Facts

Stable things that are true about this environment. Delete an entry when it stops being true.
Format: `- <fact> (source, date)`.

- The owner develops on Windows; hooks and scripts are Node so they need neither bash nor jq. (setup, 2026-11-01)
- Keep the project out of `C:\Program Files (x86)\`: it is write-protected and its parentheses break unquoted shell paths. Use something like `C:\dev\pt-platform`. (setup, 2026-11-01)
- Local Supabase requires Docker Desktop to be running. (setup, 2026-11-01)
- `create-next-app` refuses a non-empty folder; scaffold into a temp dir and move files up. The temp dir name cannot start with `_` (npm name rule), but `guard-bash.mjs` `SAFE_DELETE` only allows deleting `_scaffold`, so scaffold into e.g. `ptp-scaffold`, then `mv ptp-scaffold _scaffold && rm -rf _scaffold`. (P0-01, 2026-11-01)
- Stack as scaffolded (P0-01): Next.js 16.4.3 (App Router, Turbopack default), React 19.3.0, Tailwind v4 (`@tailwindcss/postcss`), TypeScript 5.9 strict, ESLint 9 flat config, Prettier 3, Vitest 3, Playwright 1.64. pnpm 12.6. (P0-01, 2026-11-01)
- `guard-bash.mjs` parses `pnpm install`/`add` args; a trailing `2>&1` or pipe is misread as a package name and blocked. Run `pnpm install` with no redirection/pipe. (P0-01, 2026-11-01)
- esbuild (via Vitest) build script is disabled in `pnpm-workspace.yaml` `allowBuilds` (prebuilt binary on Windows); first `pnpm install` errors ERR_PNPM_IGNORED_BUILDS until that line is set. (P0-01, 2026-11-01)
- e2e needs the Playwright browser: `pnpm exec playwright install chromium` (one-time, not a package). `playwright.config.ts` webServer runs `pnpm start --port 3100` (dedicated port, D-009), so `verify --full` builds before e2e. (P0-01/P0-02, 2026-11-01)
- Local Supabase: `supabase status -o json` exposes both legacy `ANON_KEY`/`SERVICE_ROLE_KEY` (JWT `eyJ…`) and new `PUBLISHABLE_KEY`/`SECRET_KEY` (`sb_…`). API at http://127.0.0.1:54321, DB at 54322. RLS tests read keys from that JSON via vitest globalSetup. (P0-02, 2026-11-01)
- `supabase start` can fail once on the very first boot right after pulling images (`DbSetupError: error running container: exit 1`) before any migration runs; simply re-running `supabase start` (images now cached) succeeds. (P0-02, 2026-11-01)
- Seeding `auth.users` by SQL needs `extensions.crypt(..., extensions.gen_salt('bf'))`, confirmed email, an `auth.identities` email row, and the token columns (`confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`) set to `''` not NULL — else `signInWithPassword` fails. Verified working for all 5 seed accounts (password `Password123!`). (P0-02, 2026-11-01)
- `cacheComponents: true` (next.config) means P0-04 pages that call `cookies()` (via `src/lib/supabase/server.ts`) will need a Suspense boundary or `connection()`; not an issue until auth pages exist. (P0-02, 2026-11-01)
- Whish has no public developer portal; endpoint details come from Whish's business team. Community SDKs (`whish-pay` on npm, `laravel-whish-pay`) list sandbox base `https://lb.sandbox.whish.money/itel-service/api` — unverified. (research, 2026-11-01)
- Whish's known API surface has no recurring billing or refund call; renewals are invoices. (research, 2026-11-01)
