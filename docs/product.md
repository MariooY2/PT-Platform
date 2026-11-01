# Product and roles

> Part of the PT Platform spec. Section numbers (§) are shared across all docs/ files; CLAUDE.md maps each § to its file.

## 1. Product summary

A web platform for personal trainers (starting in Lebanon) to:

- manage clients and track their training, body metrics, nutrition and check-ins accurately (planned vs actual for every set);
- build and assign multi-week programs from an exercise library;
- coach clients through a mobile-first client app (PWA) with chat;
- sell self-guided programs, monthly coaching plans and session packages from a public storefront, paid through **Whish** (Lebanese payment provider) or confirmed manually (cash, transfer).

Users: **trainer** (paying customer), **client** (coached or program buyer), **admin** (platform staff).
Language: **English only** for now (Arabic deferred — see `.harness/decisions.md` D-004). Currencies: **USD and LBP**.

---

## 3. Roles and authentication

- Supabase Auth: email + password, magic link, Google OAuth. (Phone OTP later.)
- `profiles.role` is one of `trainer`, `client`, `admin`. Set at signup:
  - `/signup` (trainer signup page) → `trainer`, then onboarding wizard (business name, slug, brand colour, currency, language).
  - `/invite/[token]` → `client`, linked to the inviting trainer.
  - Checkout signup on a storefront → `client`, linked to that trainer with `source = 'purchase'`.
  - `admin` only via seed or SQL.
- Middleware redirects by role: trainers → `/coach`, clients → `/client`, admins → `/admin`. Unauthenticated users hitting protected areas → `/login?next=...`.
- A client belongs to one or more trainers via `trainer_clients` (normally one).
