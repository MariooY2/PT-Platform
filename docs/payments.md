# Payments and Whish

> Part of the PT Platform spec. Section numbers (§) are shared across all docs/ files; CLAUDE.md maps each § to its file.

## 8. Payments

### 8.1 Provider interface

```ts
// src/lib/payments/types.ts
export type Currency = 'USD' | 'LBP';

export interface CreatePaymentInput {
  externalId: number;          // numeric, unique (Postgres sequence)
  amount: number;
  currency: Currency;
  description: string;         // shown on the pay page, e.g. "Rami Fitness – 12-Week Strength"
  successCallbackUrl: string;
  failureCallbackUrl: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
}

export interface PaymentStatusResult {
  status: 'success' | 'failed' | 'pending';
  amount?: number;
  currency?: Currency;
  raw: unknown;
}

export interface PaymentProvider {
  name: 'whish' | 'mock';
  createPayment(input: CreatePaymentInput): Promise<{ collectUrl: string; raw: unknown }>;
  getStatus(externalId: number, currency: Currency): Promise<PaymentStatusResult>;
}
```

- `getPaymentProvider()` returns the provider from `PAYMENTS_PROVIDER` (`mock` | `whish`).
- **MockProvider**: `collectUrl` points to `/dev/mock-pay?externalId=...` (only available when not in production) with "Pay" and "Fail" buttons that call our callback routes exactly like Whish would, then redirect. `getStatus` reads the mock outcome stored in a table or memory.
- **WhishProvider**: thin `fetch` client, server-only. Base URL from `WHISH_ENV` (`sandbox` | `production`). Credentials from `WHISH_CHANNEL`, `WHISH_SECRET`, `WHISH_WEBSITE_URL`.
  - **Before implementing, read `docs/whish/`** (official Whish merchant API docs supplied by the owner) for exact endpoint paths, header names, request/response fields and the callback format. If that folder is empty, stop and ask.
  - Community references (unofficial, verify everything): the `whish-pay` npm SDK and the `laravel-whish-pay` package. They describe: create payment (amount, currency, invoice, externalId, success/failure callback URLs, success/failure redirect URLs → `collectUrl`), payment status by currency + externalId (`success`/`failed`/`pending`), a rate (fee) call and a balance call; sandbox base `https://lb.sandbox.whish.money/itel-service/api`, production `https://whish.money/itel-service/api`; the success callback arrives as a GET with `externalId` and `currency` query params.

### 8.2 Checkout flow

1. Buyer clicks **Buy** on a product page → login/signup if needed → `/checkout/[productId]` shows summary, coupon field, total.
2. Server action `startCheckout({ productId, couponCode })`:
   - Load product (must be published, trainer storefront published). Compute `subtotal`, `discount`, `total` **on the server**.
   - Insert `orders` (`pending`) and `payments` (`created`, `external_id = nextval('payment_external_id_seq')`).
   - Call `provider.createPayment(...)` with callback URLs `${NEXT_PUBLIC_SITE_URL}/api/payments/whish/callback/success|failure` and redirect URLs `${NEXT_PUBLIC_SITE_URL}/checkout/result?order=<id>`.
   - Log `create_request` and `create_response` in `payment_events`. Save `collect_url`, set payment `pending`.
   - Redirect the buyer to `collectUrl`.
3. **Callback handler** (success and failure routes):
   - Parse `externalId` + `currency`; find the payment (unknown → log `error`, return 200).
   - Log the raw callback.
   - **Always call `provider.getStatus()`** and log it. Never trust the callback or redirect alone.
   - If `success` **and** amount and currency match the order total (tolerance 0.01 USD / 1 LBP) → call `fulfil_order(order_id)`.
   - If `success` but mismatched → order `needs_review`, alert admin by email.
   - If `failed` → payment `failed`, order `failed`.
   - Return 200 quickly in every case once processed.
4. **`fulfil_order(order_id)`** — a Postgres `security definer` function (called via the admin client) that runs in one transaction:
   - `select ... for update` on the order; if already `paid`, return (idempotent).
   - Mark payment `success` + `verified_at`, order `paid` + `paid_at`.
   - Create entitlement and type-specific records (§7.11), increment coupon `redeemed_count`, write ledger entries.
   - Emails are sent by server code after the function returns.
5. **Result page** `/checkout/result?order=` shows the order status from our DB. If still pending, poll every 3 s for up to 60 s and offer "Check again", which triggers a server-side `getStatus` + fulfilment.
6. **Reconciliation cron** (every 5 min): payments in `created`/`pending` older than 10 minutes and younger than 48 hours → `getStatus` → fulfil or fail. Log `reconcile` events.

### 8.3 Payment rules (non-negotiable)

- Whish secret and Supabase service key are server-only.
- Totals are computed on the server; the browser never sends a price.
- One `external_id` per payment, unique in the DB; duplicate callbacks are no-ops.
- Every request/response/callback is logged in `payment_events`.
- Callback URLs must be HTTPS in production. For sandbox testing locally, use a tunnel (e.g. ngrok) and set `NEXT_PUBLIC_SITE_URL` to the tunnel URL.
- Refunds are done in the Whish merchant dashboard; admin marks the order `refunded` in our app, which revokes the entitlement and writes a negative `refund` ledger entry.

### 8.4 Environment variables

```
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # or the new publishable key
SUPABASE_SERVICE_ROLE_KEY=            # or the new secret key — server only
PAYMENTS_PROVIDER=mock                # mock | whish
WHISH_ENV=sandbox                     # sandbox | production
WHISH_CHANNEL=
WHISH_SECRET=
WHISH_WEBSITE_URL=
RESEND_API_KEY=
EMAIL_FROM=
CRON_SECRET=
VAPID_PUBLIC_KEY=                     # Phase 3
VAPID_PRIVATE_KEY=                    # Phase 3
```

Provide `.env.example` with all of these.
