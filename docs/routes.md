# Routes

> Part of the PT Platform spec. Section numbers (§) are shared across all docs/ files; CLAUDE.md maps each § to its file.

## 4. Routes

### Public
- `/` landing page, `/pricing`
- `/c/[slug]` trainer storefront (bio, certifications, testimonials, products)
- `/c/[slug]/p/[productSlug]` product page
- `/checkout/[productId]` (requires login; creates account inline if needed)
- `/checkout/result?order=[id]`

### Trainer (`/coach`)
- `/coach` dashboard: at-risk clients, check-ins to review, today's activity, revenue summary
- `/coach/clients` list with filters; `/coach/clients/new` invite; CSV import
- `/coach/clients/[id]` tabs: Overview · Program · Workout log · Progress · Check-ins · Nutrition · Notes & files · Billing
- `/coach/programs`, `/coach/programs/[id]` builder
- `/coach/exercises` library
- `/coach/checkins` review queue
- `/coach/messages`
- `/coach/forms` intake and check-in form builder
- `/coach/products`, `/coach/orders`, `/coach/earnings`
- `/coach/settings` profile, storefront, branding, plan, notifications

### Client (`/client`)
- `/client` Today: workout, habits, macro target, check-in due
- `/client/workout/[workoutLogId]` workout player
- `/client/calendar`
- `/client/progress` PRs, charts, photos, metrics
- `/client/checkin/[id]`, `/client/intake`
- `/client/messages`
- `/client/billing` purchases, plan status, pay renewal
- `/client/settings` units, notifications

### Admin (`/admin`)
- trainers, orders, payments + payment events, ledger and payouts, platform settings

### API route handlers
- `GET /api/payments/whish/callback/success`
- `GET /api/payments/whish/callback/failure`
- `GET /api/cron/reconcile-payments` (every 5 min)
- `GET /api/cron/renewals` (daily)
- `GET /api/cron/reminders` (hourly)
- Cron routes require `Authorization: Bearer ${CRON_SECRET}`.
