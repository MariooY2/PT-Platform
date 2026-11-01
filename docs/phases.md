# Phases, gates and scope

> Part of the PT Platform spec. Section numbers (§) are shared across all docs/ files; CLAUDE.md maps each § to its file.

## 13. Phases and acceptance criteria

### Phase 0 — Foundation
Build: scaffold, tooling, Supabase local stack, base migrations (`profiles`, `trainers`, `trainer_clients`), auth with roles, role-based middleware, design system foundation (tokens, type, core components, UI gallery), layout shells and navigation for `/coach`, `/client`, `/c/[slug]`, `/admin`, `.env.example`, `CLAUDE.md` summarising this spec's rules and conventions, seed with an admin, two trainers, two clients.

Accept when:
- [ ] Fresh clone → `pnpm i`, `supabase start`, `supabase db reset`, `pnpm dev` works; README documents it.
- [ ] Trainer signs up → onboarding wizard → lands on `/coach`.
- [ ] Trainer creates an invite link → new user opens it, signs up → lands on `/client`, linked to that trainer.
- [ ] Wrong-role access redirects correctly; unauthenticated access goes to login.
- [ ] The UI gallery and all four shells pass the axe scan and the UI checklist at 360 px and 1280 px, in light and dark mode.
- [ ] RLS tests for the base tables pass; lint, typecheck, tests pass; deploys to a Vercel preview.

### Phase 1 — Core coaching
Build: §7.2 clients, §7.3 exercises (+ seed), §7.4 program builder, §7.5 player and logging (online), §7.6 progress, §7.7 check-ins and intake, §7.8 messaging, §7.15 basic dashboard, PWA manifest.

Accept when:
- [ ] Trainer invites a client, client completes intake, trainer sees answers.
- [ ] Trainer builds a 4-week program with supersets, saves as template, assigns it to two clients; editing one client's copy doesn't change the template or the other client.
- [ ] Client sees today's workout, logs every set with previous performance shown, finishes; trainer sees planned vs actual for each set.
- [ ] A heavier set creates a PR and it appears on the progress page; charts render from real logs.
- [ ] Weekly check-in becomes due, client submits with a photo, trainer replies from the queue.
- [ ] Trainer and client chat in real time with an image and a voice note.
- [ ] At-risk flags appear for a client with no workouts in 5 days.
- [ ] RLS tests cover every new table; e2e tests cover invite → intake → assign → log → check-in.

### Phase 2 — Selling with Whish
Build: §7.10 storefront and products, §8 payments (mock provider first, then Whish), §7.11 fulfilment, §7.12 manual payments, §7.13 renewals, §7.14 ledger + earnings page, §7.17 basic admin, receipts.

Accept when:
- [ ] Trainer publishes a storefront with three products (program, coaching, session pack).
- [ ] With `PAYMENTS_PROVIDER=mock`: buying each product type fulfils correctly; the program appears in the buyer's app immediately.
- [ ] Sending the same success callback twice fulfils once; a callback whose verified amount doesn't match puts the order in `needs_review`; a fake callback for an unknown externalId changes nothing.
- [ ] If the callback never arrives, the reconciliation job fulfils the order.
- [ ] Coaching renewal invoice is created 3 days before period end; paying it extends the period; leaving it unpaid moves the plan to `past_due` then `paused`.
- [ ] Trainer records a cash payment and the client gets access.
- [ ] Ledger shows sale, platform fee and balance; admin sees payment event logs.
- [ ] With `PAYMENTS_PROVIDER=whish` and sandbox credentials: a real sandbox payment completes end to end through a tunnel.

### Phase 3 — Retention and business
Build: §7.9 nutrition, §7.15 full dashboard, §7.16 automations and notifications (web push, digest), session packs + `sessions` attendance, §10 offline logging, plan limits for trainer tiers (Free: 3 clients, no storefront).

### Phase 4 — Growth (do not build unless asked)
Payout batch tooling, studio/team seats, Lebanese food database and food logging, WhatsApp notifications, progression rules, native mobile apps, public coach marketplace, trainers bringing their own Whish credentials (merchant model B).

---

## 14. Out of scope for now

Native iOS/Android apps, wearable integrations, video calls, AI-generated programs, a public marketplace, automated payouts.
