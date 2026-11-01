# UI principles

Who we design for, in what conditions, and the rules that follow. Evidence is in `research.md`.

## The four people and the moment they're in

| Person | Where | State of mind | What the UI must do |
| --- | --- | --- | --- |
| **Client mid-workout** | Gym floor, phone in one hand, sweaty, between sets, often bright light, sometimes no signal | 30 seconds of attention, then back to the bar | Show the next set, the target and last time's numbers; log in one tap; start the rest timer by itself |
| **Coach between sessions** | Gym or car, phone, 2–5 minutes | Triage: who needs me today? | Lead with exceptions (missed workouts, overdue check-ins, unpaid renewals) and one-tap actions (message, reply, mark paid) |
| **Coach at a desk** | Laptop, evening, 30–90 minutes | Building programs, reviewing a week of check-ins | Dense, keyboard-friendly tables and grids; fast duplication; nothing hidden behind hover-only controls |
| **Buyer from Instagram** | Phone, one link in a bio, low trust, never heard of us | "Is this coach legit, what do I get, what does it cost?" | Coach first, offer second, price and total visible, Whish checkout in a single page |

## Principles

1. **The number is the interface.** Weight, reps, compliance and money are what people come for.
   Numbers are large, condensed, tabular (they don't jiggle as they change), and always paired with
   their unit. Decoration never competes with them.

2. **One tap for the common case.** Pre-fill from the prescription and from last time. The likely
   action is one tap; editing is the exception. No confirmation dialogs for reversible actions —
   offer Undo instead.

3. **Exceptions first.** Coach screens sort by what needs attention, not by name or date. A client
   who is on track is a quiet row; a client who missed three workouts is a loud one, with the reason
   in words.

4. **Thumb first, desk second.** Every client screen and every daily coach task is designed at
   360 px first, with primary actions in the lower half. Desktop layouts add density, never
   capability the phone lacks.

5. **Show only what was prescribed.** The player shows the columns the coach used. Builders reveal
   advanced fields (tempo, RPE, %1RM) on demand. New coaches see a short setup checklist, not every
   feature.

6. **Always say what state things are in.** Loading, empty, saved, syncing, offline, paid, overdue —
   each has a distinct, visible treatment. Never a blank panel, never a spinner that could mean anything.

7. **Earn trust where money moves.** On the storefront and checkout, show who the coach is, exactly
   what the buyer gets, the full price before payment, and what happens after paying. Errors say
   precisely what to fix.

8. **One memorable moment.** The personal record. When a set beats a record, the row turns plate
   yellow and a short, single animation plays. Everything else stays calm, which is why it lands.

## What we deliberately avoid

- A wall of identical KPI cards on the dashboard. Use a prioritized list with a few numbers.
- Hamburger menus hiding primary destinations on mobile.
- Hover-only controls (they don't exist on phones and hide actions on desktop).
- Pie and donut charts, gauges, 3D anything, and dual-axis charts.
- Toasts as the only record of something important (payments, failures) — those also live on the page.
- Modal stacks. One dialog at a time; long flows are pages or sheets.
- Feeds, streaks and badges that add noise. The PR moment is the one celebration.
