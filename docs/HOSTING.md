# Hosting / deployment runbook

The app is a Next.js 16 app on Supabase. The code is green locally (`node scripts/verify.mjs --full`).
Going live is a handful of steps **only you can do** — autopilot cannot run deploys, set secrets, or
touch a cloud database. Do them in order. After step C you have a working preview URL.

Everything here is also tracked as `(human)` lines in `.harness/approvals.md`.

---

## A. Push the repo to GitHub

1. Create an empty repo on github.com (e.g. `pt-platform`), no README.
2. From the project folder:
   ```bash
   git remote add origin https://github.com/<you>/pt-platform.git
   git push -u origin master:main      # your working branch is master; the repo default is main
   ```
   CI (`.github/workflows/ci.yml`) then runs `node scripts/verify.mjs --full` on every push/PR.

## B. Create the cloud Supabase project + apply the schema

1. Create a project at supabase.com. Note its **project ref** and the **db password**.
2. Link and push the migrations (this creates every table + RLS on the cloud DB):
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   Do **not** push `supabase/seed.sql` to production — the seed is local demo data only.
3. In the Supabase dashboard → **Authentication → Providers/Settings**: turn **email confirmations ON**.
   (Tell me once this is on and I'll remove `email_confirm: true` from the signup action — it's a one-line
   code change that must land together with this setting, or local signups break.)
4. From **Project Settings → API**, copy three values for step C:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only; never prefix it with NEXT_PUBLIC)

## C. Deploy the web app

1. Import the GitHub repo in your deploy platform (the stack targets a Next.js host; preset = Next.js,
   root = repo root).
2. Set these Environment Variables (Production):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...            # from B.4
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...       # from B.4
   SUPABASE_SERVICE_ROLE_KEY=...           # from B.4
   NEXT_PUBLIC_SITE_URL=https://<your-production-domain>
   ```
3. Deploy (a push to `main` triggers it). Confirm the preview URL renders `/login`.

**After step C you have a live preview** of everything built so far (auth, clients, programs + the
workout player, forms/check-ins, habits, exercises, PWA).

---

## D. Optional — features that need extra secrets (do when you want them)

- **Real invite emails** (otherwise invites work by copy-link only): set `RESEND_API_KEY`, `EMAIL_FROM`,
  verify a sending domain, and set `EMAIL_PROVIDER=resend`.
- **Weekly check-in auto-generation**: add a cron schedule (in the host's cron config) hitting
  `GET /api/cron/checkins` with header `Authorization: Bearer $CRON_SECRET`, and set `CRON_SECRET` in the
  deploy env. Until then a coach can still set each client's check-in day; it just won't auto-fire.
- **Payments (selling programs via Whish)**: Phase 2 — not built yet.

## E. Nice-to-have (not a blocker for hosting)

- The `NEXT_PUBLIC_*` build-env item in `.harness/approvals.md` is about the **local/CI** verify build
  (so browser-Supabase e2e isn't empty-configured); production reads the env vars you set in step C, so
  it does not block hosting. It does gate verifying P1-11 (messaging) in CI.

---

## What's NOT done yet (so you know what "hosting" shows)

Phase 1 is partially complete. Remaining Phase-1 tasks (autopilot is working through them): P1-08
(progress charts + PR history), P1-11 (realtime messaging — gated on the NEXT_PUBLIC item above), P1-12
(coach Today). Phases 2–4 (storefront + Whish payments, nutrition, admin, offline) are future work. You
can host the preview now and redeploy as tasks land (every push to `main` redeploys).
