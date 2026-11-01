# Client app (`/client`)

Phone-shaped everywhere (single column, max 560 px). Bottom tabs: **Today · Progress · Messages · More**.
Person and moment: `principles.md` → "Client mid-workout".

## Today — `/client`

The answer to "what do I do today?" in one glance.

```
┌──────────────────────────────┐
│ Good evening, Maya     [avatar]│
│ ┌──────────────────────────┐ │
│ │ Week 3 · Day 2            │ │  ← today's workout card (or rest day / no program)
│ │ Lower body — strength     │ │
│ │ 6 exercises · ~55 min     │ │
│ │ Squat, RDL, Split squat…  │ │
│ │ [      Start workout     ]│ │  ← primary, 48 px, lower half of screen
│ └──────────────────────────┘ │
│ Check-in due today        >  │  ← warning-soft banner only when due/overdue
│ Habits                        │
│ ☐ 8,000 steps   ☑ 2 L water  │  ← tap to tick, optimistic
│ Macros today  1,450 / 2,200   │  ← only if coach set targets (Phase 3)
├──────────────────────────────┤
│ Today  Progress  Messages More│
└──────────────────────────────┘
```

- States: workout scheduled · workout in progress (card says **Resume workout**, shows sets done) ·
  completed today (summary + PRs) · rest day ("Rest day. Next: Upper body on Thu") · no program
  ("Your coach is preparing your program" or, for buyers, the program's start CTA) · coaching paused
  (renewal banner with **Pay now**, history still visible).
- Install prompt (PWA) appears once, after the first completed workout, as a dismissible card.

## Workout player — `/client/workout/[id]`

The most important screen in the product. Goal: a pre-filled set logs in **1 tap**; an edited set in ≤ 3.

```
┌──────────────────────────────┐
│ ←  Lower body       12:41 Finish│  ← elapsed time; Finish always reachable
│ Exercise 2 of 6 ▓▓░░░░        │
│ Romanian deadlift        [▶ ⓘ]│  ← demo video / coach notes (pinned)
│ 3 × 8–10 · rest 2:00          │  ← the prescription, in words
│ "Keep the bar close" — coach  │
│                               │
│ Set  Last time   kg     reps ✓│
│  1   60 × 10    [62.5] [ 10 ] ◯│  ← pre-filled from prescription/last time
│  2   60 × 10    [62.5] [ 10 ] ◯│
│  3   60 × 9     [62.5] [  9 ] ◯│
│ + Add set                     │
│                               │
│ ┌──────────────────────────┐ │
│ │ Rest  1:42   −15  +15 Skip│ │  ← RestTimerBar, sticky bottom, after ✓
│ └──────────────────────────┘ │
│ [ ‹ Previous ]   [  Next ›  ] │
└──────────────────────────────┘
```

- **Columns:** Set · Last time · the prescribed measures only (kg + reps; or time; or distance) · RPE
  only if prescribed · ✓. Numbers in `num-xl` inside 48 px inputs.
- **Pre-fill:** target weight from prescription, else last time's weight; reps from the top of the
  prescribed range, else last time. Tapping a field selects its content so typing replaces it.
- **Complete:** tap ✓ → row turns `success-soft` with a check, rest timer starts with the
  prescribed rest, focus moves to the next set. Undo by tapping ✓ again. No dialog.
- **PR:** if the set beats the client's record, the row fills `pr-soft`, a `PRBadge` ("PR") appears,
  one 600 ms animation and a short vibration where supported.
- **Rest timer:** sticky bar, counts down, −15 / +15 / Skip, vibrates and shows "Rest done" at zero;
  keeps running if the screen locks (based on a timestamp, not an interval count).
- **Supersets:** exercises with the same group label (A1, A2) show together; ✓ on A1 moves to A2
  without rest; rest starts after the last exercise of the group.
- **Swap / skip:** "…" menu on the exercise: Swap exercise (picker filtered to the same muscle
  group), Skip exercise, Add note. Delete a set by swiping left or via the row's "…".
- **Finish:** confirm only if sets are unlogged ("4 sets aren't logged. Finish anyway?"), then the
  summary: duration, total volume, sets completed, PRs, an optional session RPE (1–10 slider) and
  note to the coach → **Save and finish**.
- **Sync:** `SyncIndicator` next to the timer (see `patterns.md`).
- Keep the screen awake while the player is open (Screen Wake Lock API where supported).

## Progress — `/client/progress`

Tabs: **Strength · Body · Photos · Calendar**.

- Strength: list of main lifts with latest e1RM and change over 6 weeks (`num-lg` + muted delta);
  tap → line chart with direct labels and the PR history below it.
- Body: weight chart (daily dots faint, 7-day average line), measurements table, **Log weight** button.
- Photos: front/side/back grid by date; compare two dates side by side; private by default with a
  lock note ("Only you and your coach can see these").
- Calendar: month view with completed (filled), partial (half), missed (outline) days; compliance %
  for the month in words.

## Check-in — `/client/checkin/[id]`

One question per screen on mobile with a progress bar, large tap targets for scales (1–10 as 10
buttons, not a slider), photo upload with camera capture, **Send check-in** at the end. After
sending: "Sent to Rami. You'll see the reply here." The coach's reply appears on the same page.

## Messages — `/client/messages`

Single thread with the coach. Composer pinned to the bottom with text, photo and hold-to-record
voice note. Messages grouped by day; read receipts as a small muted "Seen". The workout summary and
check-ins can be referenced as cards in the thread.

## More → Billing, settings

- Billing: current plan, next renewal date (absolute), status chip, **Pay now** when an invoice is
  open; purchase history with receipts. Failed payment shows a `destructive-soft` banner explaining
  that nothing was charged and how to retry.
- Settings: units (kg/lb), theme (System/Light/Dark), notifications, account, sign out.

## Acceptance checks for client screens

- At 360 × 740 px, today's primary action is visible without scrolling.
- In the player, a pre-filled set logs with one tap; there is no confirmation dialog for logging,
  editing or deleting a set.
- Every target in the player is ≥ 48 px; inputs open the numeric keypad.
- The rest timer stays correct after locking and unlocking the phone for 60 s.
- All states listed above exist and are reachable in the UI gallery or seed data.
