# Interaction patterns

Cross-screen rules. Screen-specific layouts live in `screens/`.

## Navigation

| Area | Mobile (< 768 px) | Desktop (≥ 1024 px) |
| --- | --- | --- |
| Client app `/client` | Bottom bar, 4 labelled tabs: **Today · Progress · Messages · More** (More = check-ins, billing, settings) | Same bottom bar centered under the 560 px column — the client app stays phone-shaped |
| Coach `/coach` | Bottom bar, 5 labelled tabs: **Today · Clients · Check-ins · Messages · More** (More = programs, exercises, store, settings) | Left sidebar, 240 px, grouped: *Coaching* (Today, Clients, Check-ins, Messages), *Library* (Programs, Exercises, Forms), *Store* (Products, Orders, Earnings), then Settings |
| Storefront `/c/[slug]` | No app chrome: coach name at top, sticky "Choose a plan" button after scrolling past the offers | Two columns: coach on the left, offers on the right |
| Admin `/admin` | Not optimised; usable | Left sidebar like the coach area |

- Tabs show a badge count only for things that need action (unreviewed check-ins, unread messages).
- The current tab is marked by color **and** weight, not color alone.
- Back navigation: browser back always works; detail pages have a back arrow in the page header on mobile.
- Never more than two levels of navigation visible at once.

## Page header

Title (what this page is, in the user's words) · optional one-line context · at most one primary
action on the right (desktop) or as a bottom-anchored button (mobile). Secondary actions go in a
"…" menu. No breadcrumbs on mobile.

## Lists and tables

- Desktop coach lists are tables: sortable columns, sticky header, 25 rows per page, row click opens
  the detail, row actions in a "…" menu at the end (always visible, not on hover).
- Below 768 px the same data becomes stacked rows: primary text (name), one line of status, a chip,
  and a chevron. No horizontal scrolling tables on phones.
- Default sort answers "what needs me first" (see each screen spec), not alphabetical.
- Filters are chips above the list; active filters show a count and a "Clear filters" action.

## The three non-happy states (required for every data view)

| State | Looks like | Copy |
| --- | --- | --- |
| Loading | `ListSkeleton` shaped like the real content, shown after 150 ms; reserves space so nothing shifts | None |
| Empty (nothing exists yet) | `EmptyState`: icon, one sentence on what this area is for, one primary action | "Invite your first client to start tracking their training." → **Invite client** |
| No results (filters exclude everything) | Same frame, different message | "No clients match these filters." → **Clear filters** |
| Error | `ErrorState`: what failed, what to do, **Try again** | "Couldn't load check-ins. Check your connection and try again." |

Never show "No data" while loading. Never leave a blank panel.

## Forms

- Labels above fields, always visible (placeholders are examples, not labels). Optional fields say
  "(optional)"; required is the default.
- One column. Group related fields with a heading. Primary button at the end, full width on mobile.
- Validate on blur and on submit, never on every keystroke. Errors appear under the field, say what
  to do ("Enter a weight between 0 and 500 kg"), and move focus to the first error on submit.
- Keep everything the user typed after any error. Disable the submit button only while submitting,
  with a spinner inside it and the label changing to the action in progress ("Saving…").
- Numeric keyboards: weight `inputmode="decimal"`, reps and counts `inputmode="numeric"`,
  phone `type="tel"`, email `type="email" autocomplete="email"`. Inputs are 16 px text or larger.
- Long editors (program builder, form builder) autosave with a visible "Saved · 2 s ago" status.
  No "unsaved changes" traps.

## Actions and feedback

- One primary button per view. Its label is a verb that says what happens ("Assign program", not "Submit").
- The same action keeps the same name everywhere: button **Publish storefront** → toast "Storefront published".
- Reversible actions (archive client, remove exercise, delete a set) happen immediately with an
  **Undo** toast for 6 s. Irreversible or money-related actions (delete a program used by clients,
  refund, mark paid) use a confirmation dialog that names the consequence and repeats the action
  as the confirm label.
- Toasts confirm, they don't inform: anything the user must not miss (payment failed, renewal
  overdue) also appears on the page itself.
- Optimistic updates for logging sets, ticking habits and sending messages; reconcile silently, and
  if the server rejects, restore the previous state and say why.

## Offline and sync (client app)

`SyncIndicator` in the player header: nothing when synced; "Saved on this phone" (muted) when queued;
"Couldn't sync — will retry" (warning) after repeated failure. Phase 1 is online-only but the
indicator and `client_generated_id` exist from the start so Phase 3 offline mode needs no UI redesign.

## Dates, numbers, money

- Use the formatting components (`Money`, `Weight`, `Reps`, `Duration`, `RelativeDate`), never inline formatting.
- Relative dates for recent events ("2 h ago", "Yesterday"), absolute for older ("3 Nov") and for
  anything contractual (renewal dates, payments: "3 Nov 2026").
- Weight: one decimal max, unit always shown ("62.5 kg"). Sets: "62.5 kg × 8".
- Money: "$49" for whole dollars, "$49.50" otherwise; "LBP 1,500,000"; totals labelled "Total".

## Accessibility (floor, not goal)

- WCAG 2.2 AA. axe scans every route in the UI test list (light and dark) during `verify --full`.
- Visible focus on every interactive element (`ring` token, 2 px). Logical tab order. Skip link on
  coach pages. Dialogs trap focus and return it on close.
- Touch targets ≥ 44 × 44 px; ≥ 48 px in the player.
- Every input has a label; every icon-only button has `aria-label`; every chart has a text summary;
  status is never color-only.
- Respect `prefers-reduced-motion`. Respect the OS text size: layouts survive 200% zoom without
  horizontal scroll.

## Performance budgets

LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 (75th percentile) on a mid-range Android phone over 4G.
Server Components by default; client components only where interaction needs them. Images via
`next/image` with explicit sizes. Charts load lazily below the fold. The workout player must respond
to a tap in under 100 ms (optimistic UI).
