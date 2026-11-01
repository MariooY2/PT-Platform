# Features by module

> Part of the PT Platform spec. Section numbers (§) are shared across all docs/ files; CLAUDE.md maps each § to its file.

## 7. Features by module

Each feature lists the phase it belongs to. Phase gates are in §13 (docs/phases.md); task-level acceptance lives in each task contract under tasks/.

### 7.1 Trainer onboarding (Phase 0–1)
Wizard after signup: business name, storefront slug (validated, unique), brand colour, logo, default currency, language. Creates default intake and weekly check-in forms.

### 7.2 Clients (Phase 1)
- List: search, filter by status and tag, sort by last activity; columns: name, status, program, compliance (last 14 days), last workout, next check-in, payment status.
- Invite by email (sends invite link) or by copyable link (for WhatsApp). Invite tokens expire after 14 days.
- CSV import (name, email, phone, goals) creating `invited` rows.
- Profile tabs as in §4. At-risk flag when: no workout logged in 5 days while a program is active, a check-in overdue by 2+ days, an invoice overdue, or no login for 7 days.
- Notes timeline and file uploads (trainer-only).

### 7.3 Exercise library (Phase 1)
- Seed ~150 common exercises (names, muscles, equipment, category; video URL optional).
- Trainers add/edit/archive their own; YouTube URL or uploaded video/GIF.
- Search and filter by muscle, equipment, category.

### 7.4 Program builder (Phase 1)
- Program = weeks × days grid. Add workouts to days; reorder by drag and drop; duplicate a workout, a day or a whole week.
- Workout editor: add exercises from the library, set group labels for supersets/circuits, per-set prescriptions (`prescribed_sets`), rest, tempo, notes.
- Save as template; assign template to one or many clients with a start date (deep copy). Edit a client's copy independently.
- Progression rules: later (Phase 4).

### 7.5 Client workout player and logging (Phase 1; offline in Phase 3)
- Today screen shows the scheduled workout from the active assignment (`start_date` + week/day).
- Player: one exercise at a time, demo video, prescription, **previous performance for this exercise**, inputs for reps/weight/RPE per set prefilled from the prescription, rest timer that starts on set completion, notes, finish with session RPE.
- Every log write uses a `client_generated_id` so retries never duplicate.
- Clients can log an unscheduled workout or swap an exercise (logged against the actual exercise).

### 7.6 Progress (Phase 1)
- PR detection on each set log; PR badges in the player and on the progress page.
- Charts: e1RM per exercise over time, weekly volume per muscle group, body weight trend, compliance %.
- Body metrics entry (client or trainer). Progress photos upload (front/side/back), side-by-side compare by date, private storage.
- Habits: trainer defines, client ticks/enters daily.

### 7.7 Check-ins and intake (Phase 1)
- Form builder (question types in §5). One default intake and one default weekly check-in form per trainer.
- Intake shown to new clients on first login.
- Weekly check-in becomes due on the scheduled weekday; client fills it on `/client/checkin/[id]`.
- Trainer review queue sorted by oldest unreviewed; reply inline; marks reviewed.

### 7.8 Messaging (Phase 1)
- 1:1 trainer–client chat using Supabase Realtime: text, images, voice notes (record in browser), files. Unread counts. Broadcast to selected clients (creates individual messages).

### 7.9 Nutrition (Phase 3)
- Targets per client with a TDEE calculator (Mifflin–St Jeor + activity factor). Client logs daily totals (calories + macros). Adherence shown to trainer.

### 7.10 Storefront and products (Phase 2)
- Trainer creates products (§5). Product page: cover, description, price, what's included, week-1 preview for programs, FAQs.
- Storefront at `/c/[slug]`: bio, certifications, testimonials (trainer-entered), transformation photos (only with `public_consent`), product cards. Toggle publish.
- Coupons with validation on the server.
- SEO metadata and Open Graph images for storefront and product pages.

### 7.11 Checkout and fulfilment (Phase 2) — see §8
- On successful payment, fulfilment by product type:
  - `program` → entitlement + deep-copy the product's program to the buyer + assignment starting today + `trainer_clients` row (`source = 'purchase'`, status `active`).
  - `coaching` → entitlement + `coaching_subscriptions` row (period = 1 month) + `trainer_clients` + conversation + intake form due.
  - `session_pack` → entitlement with `sessions_remaining = sessions_count`.
- Emails: receipt to buyer, "new sale" to trainer.

### 7.12 Manual payments (Phase 2)
- Trainer can record a payment for any order or invoice: method (cash, Whish transfer, OMT, bank, other), note. Runs the same fulfilment. Manual payments carry no platform commission.

### 7.13 Coaching renewals (Phase 2)
- Whish (per the API surface known so far) has **no recurring billing**, so renewals are invoices:
  - Daily cron: for active coaching subscriptions ending within 3 days and without an open invoice → create invoice, notify client (email + in-app) with a pay link to `/client/billing`.
  - Paying an invoice creates an order (`kind = 'renewal'`) and a Whish payment; on success the period extends by one month.
  - After `current_period_end` unpaid → `past_due`; after `grace_days` → `paused`: client app shows a "renew to continue" screen (logs history stays visible), trainer is notified.
  - Trainer can mark an invoice paid manually.

### 7.14 Earnings and payouts (Phase 2 ledger; Phase 4 payout tooling)
- Trainer `/coach/earnings`: sales list, platform fees, provider fees, balance owed, payout history.
- Ledger entries written atomically during fulfilment: `sale` (+total), `platform_fee` (−commission), `provider_fee` (−Whish fee if known).
- Admin records payouts (Phase 2: manual form; Phase 4: batch tooling).

### 7.15 Trainer dashboard (Phase 1 basic, Phase 3 full)
- Phase 1: at-risk clients, check-ins to review, today's completed workouts.
- Phase 3: active clients, MRR, revenue by product, overdue invoices, compliance distribution.

### 7.16 Automations and notifications (Phase 3)
- Welcome message on client join; missed-workout nudge; check-in reminder; renewal reminder; trainer digest email each morning.
- Web push for the PWA (opt-in), in-app notification centre, email fallbacks. Each user controls notification preferences.

### 7.17 Admin (Phase 2 basic)
- List trainers (approve/suspend), orders, payments with their event logs, re-run status check on a payment, ledger per trainer, record payouts, edit platform settings.
