# Language and formatting, PWA, scheduled jobs, non-functional requirements

> Part of the PT Platform spec. Section numbers (§) are shared across all docs/ files; CLAUDE.md maps each § to its file.

## 9. Language and formatting

- English only for now (D-004). No i18n library and no RTL; adding Arabic later is a separate project
  (introduce an i18n library, move copy into message files, switch to logical CSS properties).
- `<html lang="en">`. Fonts per `docs/ui/design-system.md`.
- Dates: day-first via `Intl.DateTimeFormat('en-GB', …)` (e.g. "3 Nov 2026"), times in `Asia/Beirut`.
- Money: `Intl.NumberFormat('en-US', { style: 'currency', currency })` for USD; LBP shown as
  "LBP 1,500,000" with no decimals.
- Units: store metric; show kg/cm or lb/in from the user's `unit_system`.

---

## 10. PWA and offline

- Phase 1: web app manifest (name, icons, theme colour, `display: standalone`, start URL `/client`), install prompt on the client Today screen.
- Phase 3: service worker caching the app shell and the current week's assigned workouts; workout player writes set logs to an IndexedDB queue (Dexie) and syncs on reconnect by upserting on `client_generated_id`; visible "saved offline / synced" indicator.

---

## 11. Scheduled jobs

Vercel Cron (or Supabase pg_cron calling the routes):

| Job | Schedule | Phase |
| --- | --- | --- |
| Reconcile pending payments | every 5 min | 2 |
| Create renewal invoices, set past_due / paused | daily 06:00 Asia/Beirut | 2 |
| Check-in due + reminders, missed-workout nudges, at-risk flags | hourly | 3 (flags computed on read in Phase 1) |
| Trainer morning digest email | daily 07:00 Asia/Beirut | 3 |

---

## 12. Non-functional requirements

- **Security:** RLS everywhere; Zod validation; rate-limit login, signup, invite and checkout endpoints; signed URLs for private files; no PII in URLs; security headers.
- **Privacy:** health data and photos are sensitive; transformation photos are public only with `public_consent`; a client can request account deletion (admin-assisted in MVP).
- **Performance:** Server Components and streaming; paginate lists (25 per page); images through `next/image`; client Today screen interactive in under 2 s on a mid-range phone over 4G.
- **Accessibility:** WCAG 2.1 AA; keyboard-accessible builder; labels on all inputs; sufficient contrast in both themes.
- **Observability:** structured server logs for payments and cron; optional Sentry.
- **Quality gates:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` all pass before a phase is called done.
