# Copy

Words are interface. Every label, button, empty state and error follows this file.

## Voice

Plain, direct, a little warm — a good coach, not a marketing page. Sentence case. Active voice.
No exclamation marks except the PR moment. No jargon from the code ("entitlement", "trainer_clients",
"webhook") in the UI. Errors never apologize and are never vague.

## Words we use

| Use | Not |
| --- | --- |
| Client | Athlete, user, member, trainee |
| Coach (in UI copy) / trainer (in marketing) | PT, instructor |
| Program (multi-week) · Workout (one session) · Exercise · Set | Plan (ambiguous), routine, session (reserved for in-person) |
| Coaching plan (monthly 1:1) · Session pack (in-person) · Program (self-guided product) | Subscription, package, bundle |
| Check-in | Report, survey, form submission |
| Log (a set / a workout) | Record, track, submit |
| Personal record (PR) | Best, max (unless it is literally 1RM) |
| Renewal · Pay now | Invoice due, billing event |
| Paid in cash / by Whish transfer | Manual payment |

## Patterns

- **Buttons:** verb + object. "Invite client", "Assign program", "Log set", "Finish workout",
  "Pay $49 with Whish". The final checkout button includes the amount.
- **Empty states:** what this area is for + the next step. "Programs you build appear here. Start
  with a blank program or a template." → **New program**
- **Errors:** what happened + how to fix it. "That slug is taken. Try rami-fitness-beirut." /
  "Payment didn't go through. Your card or Whish balance wasn't charged. Try again or choose another way to pay."
- **Confirmations:** name the consequence. "Delete '12-Week Strength'? 3 clients are following it;
  their copies stay, the template is removed." → **Delete program**
- **Success toasts:** past tense of the button. "Program assigned to Rami and 2 others."
- **Numbers in sentences:** "3 workouts missed this week", "Last time: 60 kg × 8".
- **Dates:** "Today", "Yesterday", "Mon 3 Nov", "3 Nov 2026". Times use 12-hour with am/pm
  ("6:30 pm"); the format lives only in the formatting components, so switching to 24-hour is a
  one-line change if trainers prefer it.

## The PR moment

"New PR — 100 kg × 5" in the row, and in the finish summary: "2 new personal records". The only
place an exclamation-style celebration is allowed is the finish summary headline: "Strong session."
