# Commands

> The scaffold task (P0-01) creates the `package.json` scripts below. Keep this file in step with
> `package.json`: when a command changes, update it here in the same commit.

## Harness

| Command | What it does |
| --- | --- |
| `node scripts/verify.mjs` | Fast checks: architecture rules → format → lint → typecheck → unit tests. Writes `.harness/last-verify.json` |
| `node scripts/verify.mjs --full` | Everything above, then RLS tests → production build → e2e tests |
| `node scripts/check-architecture.mjs` | Static rules only (secrets in client code, RLS on every table, design tokens only, `.only` in tests, `.env.example`) |

## App (created by P0-01)

| Script | Expected command |
| --- | --- |
| `pnpm dev` | `next dev` |
| `pnpm build` | `next build` |
| `pnpm lint` | `eslint .` |
| `pnpm format:check` | `prettier --check .` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | `vitest run` (unit) |
| `pnpm test:rls` | RLS test suite against the local Supabase stack |
| `pnpm test:e2e` | `playwright test` |
| `pnpm db:types` | `supabase gen types typescript --local > src/lib/supabase/types.ts` |
| `pnpm verify` | `node scripts/verify.mjs` |

## Database (local only)

| Command | When |
| --- | --- |
| `supabase start` | Start the local stack (Docker Desktop must be running) |
| `supabase status` | Show local URLs and keys |
| `supabase migration new <name>` | Create a new migration file |
| `supabase db reset` | Rebuild the local database from migrations + `seed.sql` |
| `pnpm db:types` | Regenerate types after any schema change |

Remote database commands (`supabase db push`, `supabase link`, `supabase secrets set`,
`supabase functions deploy`) always ask the human first.
