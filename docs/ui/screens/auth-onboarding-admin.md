# Auth, onboarding and admin

## Sign in / sign up — `/login`, `/signup`, `/invite/[token]`

- Single centered column (max 400 px), product name at top, one task per page.
- `/login`: email + password with **Sign in**, "Email me a sign-in link" as a secondary option,
  "Forgot password?" link. Errors: "Email or password is wrong" (never which one).
- `/signup` is for coaches: name, email, password, **Create coach account**. Clients don't sign up
  here; the page says "Joining a coach? Use the link they sent you."
- `/invite/[token]`: "Rami invited you to train with them" with the coach's photo, then name +
  password (email pre-filled and locked) → **Join Rami**. Expired: "This invite expired. Ask Rami for
  a new link." with no form.
- Show/hide password toggle (44 px target). Password rules shown before typing, checked live after
  the first blur.

## Coach onboarding — `/coach/onboarding`

Three short steps with a progress indicator, skippable after step 1:

1. **Your business:** business name, storefront address (`yourapp.com/c/` + slug, availability
   checked as they type with a suggestion if taken).
2. **Your look:** photo or logo, brand color (picker restricted to colors that keep AA contrast in
   the header band), short bio.
3. **Your money:** default currency (USD/LBP), how you get paid out (Whish phone number).

Then land on **Today** with the setup checklist.

## Setup checklist (replaces the empty dashboard)

A card titled "Get set up" with 5 items, each with one action and a done state:
Invite your first client · Build or duplicate a program · Assign it · Set your weekly check-in day ·
Publish your storefront (optional). Progress "2 of 5". Dismissible once 3 are done. This is the
progressive-disclosure answer to "too many features at first" (`research.md`).

## Admin — `/admin`

Functional, dense, desktop-oriented; same tokens and components. Sidebar: Trainers · Orders ·
Payments · Payouts · Settings. Payments detail shows the event log as a timeline (create request,
callback, status check) with raw payloads collapsible. Destructive admin actions (suspend trainer,
refund) use confirmation dialogs that name the consequence.

## Acceptance checks

- Every auth error message is specific and keeps typed values (except passwords).
- The invite page shows who invited the person before asking for anything.
- The onboarding slug field checks availability without a page reload and suggests an alternative.
