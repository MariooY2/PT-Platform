# Storefront, checkout and the coach's store (`/c/[slug]`, `/checkout`, `/coach/products|orders|earnings`)

Person and moment: "Buyer from Instagram" — on a phone, low trust, one link. Evidence for checkout
decisions: Baymard findings in `research.md`.

## Storefront — `/c/[slug]`

Open with the coach, then the offers. The trainer's brand color may tint the header band only;
everything else uses platform tokens so contrast stays guaranteed.

```
Mobile                                   Desktop
┌──────────────────────────────┐         ┌───────────────────────┬──────────────────────┐
│ [photo]  Rami Fitness         │         │ [large photo]          │ Programs and coaching│
│ Strength coach · Beirut       │         │ Rami Fitness           │ ┌──────────────────┐ │
│ NASM-CPT · 8 years coaching   │         │ Strength coach · Beirut│ │ 12-Week Strength │ │
│ [Instagram]                   │         │ Certifications         │ │ $49 one-time     │ │
│                               │         │ Bio (≤ 75 ch lines)    │ │ [View program]   │ │
│ Programs and coaching         │         │ Transformations        │ └──────────────────┘ │
│ ┌──────────────────────────┐ │         │ Testimonials           │ ┌──────────────────┐ │
│ │ 1:1 Coaching             │ │         │                        │ │ 1:1 Coaching     │ │
│ │ Custom program, weekly    │ │         │                        │ │ $120 / month     │ │
│ │ check-ins, chat           │ │         │                        │ └──────────────────┘ │
│ │ $120 / month   [View]     │ │         └───────────────────────┴──────────────────────┘
│ └──────────────────────────┘ │
│ … transformations, testimonials, FAQ │
│ [ Choose a plan ]  (sticky)   │
└──────────────────────────────┘
```

- `OfferCard`: name, three-line "what you get", price with billing interval in `num-lg`, **View**.
  Coaching shows "per month, renew any time"; programs show "one-time, yours to keep".
- Transformations only with the client's public consent; captions state the timeframe.
- Trust: certifications, years coaching, testimonials with first name + initial, "Secure payment with
  Whish" mark near prices, a clear contact/FAQ section ("What happens after I pay?").
- Unpublished storefront: owner sees a preview banner with **Publish storefront**; visitors get a
  neutral "This page isn't available yet".
- SEO and link previews: title "Rami Fitness — strength coaching in Beirut", description, OG image
  with coach photo and name.

## Product page — `/c/[slug]/p/[product]`

Hero: product name, price, one-line promise, **Buy now** / **Start coaching** (lg button). Then:
what's included (checklist), who it's for, week 1 preview (programs: day cards with exercise
names), how it works after paying (3 steps), FAQ, coach card. Sticky buy button on mobile after the
hero scrolls away.

## Checkout — `/checkout/[productId]`

One page, ≤ 6 fields, total visible before anything is typed.

```
┌──────────────────────────────┐
│ ← Rami Fitness                │
│ 12-Week Strength              │
│ One-time · instant access     │
│ Price                  $49.00 │
│ Discount (SPRING10)    −$4.90 │
│ Total                  $44.10 │  ← always visible, no surprises later
│ [Add discount code]           │
│                               │
│ Your account                  │  ← skipped when signed in
│ Email      [               ]  │
│ Password   [               ]  │  ← or "Email me a sign-in link"
│ Name       [               ]  │
│                               │
│ [  Pay $44.10 with Whish   ]  │  ← amount in the button
│ You'll confirm on Whish's     │
│ secure page, then come back   │
│ here with access.             │
│ 🔒 Payment handled by Whish   │
└──────────────────────────────┘
```

- Guest-style: the account is created inline as part of paying — no separate signup step.
- Errors are specific and inline ("This email already has an account — sign in instead"), and keep
  everything typed. Coupon errors say why ("This code expired on 1 Nov").
- After **Pay**: a short "Taking you to Whish…" state, then redirect.

## Result — `/checkout/result`

- Paid: "You're in." + what was bought + the first next step (**Start week 1** or **Fill in your
  intake form**) + receipt emailed note.
- Pending: progress indicator with "Confirming your payment with Whish…" (polls up to 60 s), then
  "Still confirming. We'll email you as soon as it's done" + **Check again**. Never says "failed" while pending.
- Failed: "Payment didn't go through. You weren't charged." + **Try again** + contact the coach link.

## Coach store pages

- **Products** (`/coach/products`): list of offers with status (Draft/Published), price, sales
  count. Editor as a form page with a live mobile preview beside it on desktop. **Publish** requires
  name, price, description and (for programs) a linked program — missing items are listed, not just
  a disabled button.
- **Orders** (`/coach/orders`): table: Date · Client · Product · Total · Method (Whish / Cash /
  Transfer) · Status chip (Paid, Pending, Needs review, Refunded, Failed). "Needs review" rows sort
  first with an explanation. **Record payment** for cash.
- **Earnings** (`/coach/earnings`): balance owed in `num-lg` with the next payout date, then a line
  chart of monthly earnings and a ledger table (Sale +, Platform fee −, Whish fee −, Payout −) with
  running balance. Every number links to its order.

## Acceptance checks

- On a 360 px phone, the first offer's price is visible within one scroll of the storefront.
- Checkout shows the total before any field is filled, has ≤ 6 inputs for a new buyer, and the pay
  button includes the amount.
- Pending and failed results are distinct and neither claims success.
- Trainer brand color never reduces text contrast below AA (it is only used as a header band with
  automatically chosen black or white text).
