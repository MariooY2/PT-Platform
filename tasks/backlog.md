# Backlog

Phase 0 contracts are written in full. Later tasks are one line each here; draft the contract just in
time with `/contract <ID>`, so it is written against the codebase as it is by then. Status lives in
`.harness/progress.md`. Tasks with a UI spec get a `ui:` block in their contract and finish with
screenshots, axe and the `ui-reviewer`.

## Phase 0 — Foundation (gate: docs/phases.md §13)

| ID | Task | UI spec | Depends on |
| --- | --- | --- | --- |
| P0-01 | Scaffold Next.js + tooling + harness scripts | — | — |
| P0-02 | Local Supabase, base schema, RLS, RLS tests | — | P0-01 |
| P0-03 | Design system, `/dev/ui` gallery, screenshot + axe suite | design-system, patterns | P0-02 |
| P0-04 | Auth, roles, onboarding, setup checklist, role routing | auth-onboarding-admin | P0-03 |
| P0-05 | Navigation and layout shells for every area | patterns, all area specs | P0-04 |
| P0-06 | CI and Vercel preview | — | P0-05 |

## Phase 1 — Core coaching

| ID | Task | UI spec | Depends on |
| --- | --- | --- | --- |
| P1-01 | Clients list and profile: status, tags, notes, files (§7.2) | coach: Clients, Client profile | P0 |
| P1-02 | Invite by email and link, CSV import (§7.2) | coach: Clients (invite dialog) | P1-01 |
| P1-03 | Form builder and intake on first login (§7.7) | program-builder: Forms; client-app: Check-in | P1-01 |
| P1-04 | Exercise library and ~150-exercise seed (§7.3) | program-builder: Exercise library | P0 |
| P1-05 | Program builder: week grid, workout editor, quick entry, supersets (§7.4) | program-builder: Builder | P1-04 |
| P1-06 | Templates and assignment by deep copy, with preview (§7.4) | program-builder: Assign | P1-05 |
| P1-07 | Client Today screen and workout player with set logging (§7.5) | client-app: Today, Workout player | P1-06 |
| P1-08 | PRs, progress charts, body metrics, progress photos (§7.6) | client-app: Progress; coach: Client profile | P1-07 |
| P1-09 | Habits (§7.6) | client-app: Today | P1-01 |
| P1-10 | Weekly check-ins and coach review queue (§7.7) | client-app: Check-in; coach: Check-in review | P1-03 |
| P1-11 | Real-time messaging with images and voice notes (§7.8) | client-app + coach: Messages | P1-01 |
| P1-12 | Coach Today: needs attention, check-ins to review, today's training (§7.15) | coach: Today | P1-07, P1-10 |
| P1-13 | PWA manifest and install prompt (§10) | client-app: Today | P0-05 |

## Phase 2 — Selling with Whish

| ID | Task | UI spec | Depends on |
| --- | --- | --- | --- |
| P2-01 | Payment provider interface, mock provider, payment tables (§8.1) | — | P1 |
| P2-02 | Products, storefront, product pages, coupons (§7.10) | storefront: Storefront, Product page, Products | P2-01 |
| P2-03 | Checkout, callbacks, fulfil_order, reconciliation job (§8.2–§8.3) | storefront: Checkout, Result | P2-02 |
| P2-04 | Manual payments (§7.12) | storefront: Orders; coach: Client profile Billing | P2-03 |
| P2-05 | Coaching renewals: invoices, past_due, paused (§7.13) | client-app: Billing, Today (paused) | P2-03 |
| P2-06 | Ledger and earnings page (§7.14) | storefront: Earnings | P2-03 |
| P2-07 | Admin basics: trainers, orders, payment events, payouts (§7.17) | auth-onboarding-admin: Admin | P2-06 |
| P2-08 | Receipt and sale emails with Resend (§7.11) | copy | P2-03 |
| P2-09 | Real Whish provider against sandbox — needs `docs/whish/` and credentials (§8.1) | — | P2-03 |

## Phase 3 — Retention and business

| ID | Task | UI spec | Depends on |
| --- | --- | --- | --- |
| P3-01 | Nutrition targets, TDEE calculator, daily macro logs (§7.9) | client-app: Today; coach: Client profile Nutrition | P1 |
| P3-02 | Full business dashboard (§7.15) | coach: Today numbers line | P2 |
| P3-03 | Automations, in-app notifications, web push, morning digest (§7.16) | patterns: feedback | P1 |
| P3-04 | Session packs and attendance (§5 In-person) | coach: Client profile Billing | P2-03 |
| P3-05 | Offline workout logging with an IndexedDB queue (§10) | patterns: Offline and sync | P1-07 |
| P3-06 | Trainer plan limits (§13 Phase 3) | storefront: Products | P2 |
