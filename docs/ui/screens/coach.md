# Coach area (`/coach`) — daily work

Mobile: bottom tabs **Today · Clients · Check-ins · Messages · More**. Desktop: left sidebar
(`patterns.md`). Person and moment: "Coach between sessions" (phone) and "Coach at a desk".

## Today (dashboard) — `/coach`

A prioritized to-do list, not a wall of KPI cards.

```
Desktop                                                   Mobile
┌──────────┬────────────────────────────────────────┐   ┌──────────────────────┐
│ sidebar  │ Today · Mon 3 Nov                       │   │ Today · Mon 3 Nov    │
│          │                                         │   │ Needs attention (4)  │
│          │ Needs attention (4)                     │   │ Maya K.            > │
│          │ Maya K.   No workout in 6 days  [Message]│   │ No workout in 6 days │
│          │ Omar H.   Check-in 3 days late  [Message]│   │ Omar H.            > │
│          │ Lina S.   Renewal overdue $80   [Mark paid]│ │ Check-in 3 days late │
│          │ Karim B.  Hasn't opened app 8 d [Message]│   │ …                    │
│          │                                         │   │ Check-ins to review 3│
│          │ Check-ins to review (3)     Today's training│ │ Today's training     │
│          │ Rami A. · 2h ago  >         ✓ 9 done · 2 PRs│ │ This month  $1,240   │
│          │ …                           ◐ 1 in progress │ └──────────────────────┘
│          │                                         │
│          │ This month: $1,240 earned · 23 active clients · 81% compliance │
└──────────┴────────────────────────────────────────┘
```

- **Needs attention:** `AttentionRow`s sorted by severity: overdue renewal > missed workouts (≥ 5
  days with an active program) > check-in overdue (≥ 2 days) > not opened app (≥ 7 days). Each row
  states the reason in words with the number, and one action that resolves it (Message opens the
  thread with a suggested first line the coach can edit; Mark paid opens the manual-payment dialog).
  Snooze a row for 3 days via "…".
- **Check-ins to review:** oldest first, with the client's name and a one-line preview of anything
  flagged (weight change, low energy score).
- **Today's training:** completed workouts and PRs from today; tap → the client's workout log.
- **Numbers line:** 3–4 figures in `num` at the bottom, not cards. Revenue appears only after the
  store is set up.
- Empty (new coach): the setup checklist from `auth-onboarding-admin.md` replaces the lists.

## Clients — `/coach/clients`

- Desktop table columns: Client (avatar + name) · Status chip · Program (name + week) ·
  Compliance 14 d (percentage with a thin bar) · Last workout (relative date) · Next check-in · Plan (Paid / Due / Overdue chip) · "…".
- Default sort: needs attention first, then last activity. Filters: Status, Tag, Program, Plan status.
  Search by name or email.
- Mobile rows: name, status line ("Week 3 of 12 · 86% · trained yesterday"), plan chip, chevron.
- Primary action: **Invite client** (dialog: email or copy-link tab; the link has a WhatsApp share button).
- Empty: "Invite your first client to start tracking their training." + **Invite client** + "Import from CSV".

## Client profile — `/coach/clients/[id]`

Header: avatar, name, status chip, program and week, plan status; actions **Message**, **Assign program**, "…"
(Pause, Archive, Edit details). Tabs (scrollable on mobile):

| Tab | Content |
| --- | --- |
| Overview | Goals and injuries (editable), compliance last 4 weeks (bar per week), latest check-in summary, recent PRs, upcoming renewal |
| Program | The client's copy of the program as the week grid (read and edit in place; edits never touch the template) |
| Workout log | Sessions newest first; each expands to **planned vs actual** per set: prescribed in muted text, actual in `num`, differences highlighted (missed reps in `warning-soft-foreground`, PRs with `PRBadge`) |
| Progress | Same charts the client sees, plus body metrics entry |
| Check-ins | Timeline of responses with the coach's replies |
| Nutrition | Targets and adherence (Phase 3) |
| Notes & files | Private timeline; files with upload; "Only you can see notes" label |
| Billing | Plan, renewals, payments, **Record payment** |

## Check-in review — `/coach/checkins`

Queue on the left (desktop) or as a list (mobile), oldest unreviewed first. Detail: answers with
change vs last check-in (weight −0.8 kg, energy 6 → 4 highlighted), photos side by side with the
previous set, the week's compliance, and a reply box. **Send reply** marks it reviewed and opens the
next one. Keyboard: J/K to move, R to reply (desktop).

## Messages — `/coach/messages`

Two-pane on desktop (threads list with unread dots | thread), single pane on mobile. Thread header
links to the client profile. Broadcast: "New broadcast" → pick clients by filter → message → sends as
individual messages (stated in the dialog).

## Acceptance checks for coach screens

- On a 360 px phone, a coach can see who needs attention and message one of them in ≤ 2 taps from Today.
- No action is available only on hover; every row action exists in a visible "…" menu.
- Planned vs actual is readable at a glance: prescribed and logged values are visually distinct and
  aligned column by column.
- Tables become stacked rows below 768 px; nothing scrolls horizontally.
