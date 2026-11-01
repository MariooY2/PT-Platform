# Architecture, stack and conventions

> Part of the PT Platform spec. Section numbers (§) are shared across all docs/ files; CLAUDE.md maps each § to its file.

## 2. Tech stack and conventions

| Concern | Choice |
| --- | --- |
| Framework | Next.js, latest stable, **App Router**, TypeScript `strict`, Server Components by default, Server Actions for mutations |
| Package manager | pnpm |
| Styling / UI | Tailwind CSS, shadcn/ui, lucide-react icons |
| Forms / validation | React Hook Form + Zod (schemas shared between client and server) |
| Backend | Supabase: Postgres, Auth, Storage, Realtime |
| Supabase in Next.js | `@supabase/ssr` with three clients: server (cookies), browser, and admin (service/secret key, server-only, used only for payment callbacks, cron and admin tasks) |
| DB workflow | Supabase CLI, local stack, SQL migrations in `supabase/migrations/`, `supabase/seed.sql`, generated types in `src/lib/supabase/types.ts` |
| UI | Design system and screen specs in `docs/ui/` (read before building any screen) |
| Charts | Recharts |
| Dates | date-fns (+ `date-fns-tz`), default timezone `Asia/Beirut` |
| Email | Resend + React Email templates |
| PWA | Serwist (or the currently recommended Next.js PWA approach — check before installing) |
| Offline queue | IndexedDB via Dexie (Phase 3) |
| Web push | `web-push` with VAPID keys (Phase 3) |
| Tests | Vitest (unit), Playwright (e2e), RLS tests against the local Supabase stack |
| Hosting | Vercel (app + cron), Supabase cloud |

### Folder structure

```
src/
  app/
    (marketing)/            # landing, pricing
    (auth)/                 # login, signup, invite/[token], reset
    coach/                  # trainer dashboard
    client/                 # client PWA
    c/[slug]/               # public storefront + product pages
    checkout/               # checkout + result pages
    admin/                  # platform admin
    api/                    # route handlers (payment callbacks, cron)
  components/
    ui/                     # shadcn/ui
    shared/
  features/                 # one folder per domain: clients, programs, exercises, logging,
                            # progress, checkins, messaging, nutrition, commerce, payments, billing
    <feature>/
      actions.ts            # server actions
      queries.ts            # server-side reads
      schemas.ts            # zod
      components/
  lib/
    supabase/               # server.ts, browser.ts, admin.ts, types.ts, middleware.ts
    payments/               # provider interface, mock provider, whish provider, fulfilment
    utils/
supabase/ migrations/ seed.sql tests/
docs/ whish/               # put Whish's official API docs in docs/whish/
.harness/                   # run state: facts, decisions, progress, lessons, receipts
```

### Conventions

- UI copy is English, written to `docs/ui/copy.md`. No i18n library for now (D-004).
- Colors, type sizes, spacing and radii come from the design tokens in `docs/ui/design-system.md` — no raw hex values or arbitrary pixel sizes in components.
- Store measurements in metric (kg, cm, m, seconds). Convert to lb/in only in the UI.
- Money: `numeric(12,2)` + `currency text check (currency in ('USD','LBP'))`. All totals computed on the server.
- IDs: `uuid` primary keys, `default gen_random_uuid()`. Every table has `created_at timestamptz default now()`; mutable tables also have `updated_at` maintained by a trigger.
- Mobile-first: every client screen must work at 360 px wide; trainer screens must be usable on a phone and comfortable on desktop.
