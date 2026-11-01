# Design system

The visual language of PT Platform. Task P0-04 turns this into code (`src/app/globals.css`, fonts,
base components, the `/dev/ui` gallery). After that, components use **tokens only** —
`scripts/check-architecture.mjs` rejects raw colors, Tailwind palette colors (`bg-blue-500`,
`text-white`) and off-scale font sizes outside `globals.css`.

The brand name is not chosen yet. Every brand value is a token, so renaming or recoloring is a
one-file change.

## Direction: "chalk and iron"

The world of a strength gym: chalk-white surfaces, iron-graphite ink, the competition blue of a
20 kg plate as the one brand color, and the yellow of a 15 kg plate reserved for personal records.
Big condensed numerals do the talking, like weights stenciled on plates. Structure comes from
borders and spacing, not shadows or gradients. Calm everywhere, so the PR moment stands out.

## Color tokens

Names follow shadcn/ui so its components work unchanged; `success`, `warning`, `pr` and the `-soft`
variants are added the documented way (`:root` + `.dark` + `@theme inline`). Every text pair below
meets WCAG AA (4.5:1); `input` and `ring` meet 3:1 against the surfaces they sit on. A unit test in
P0-04 recomputes these ratios from `globals.css`.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `background` / `foreground` | `#F5F6F4` / `#161B22` | `#121821` / `#E8ECF1` | Page surface and body text |
| `card` / `card-foreground` | `#FFFFFF` / `#161B22` | `#1A212B` / `#E8ECF1` | Raised surfaces: lists, panels, sheets |
| `popover` / `popover-foreground` | `#FFFFFF` / `#161B22` | `#1A212B` / `#E8ECF1` | Menus, popovers, dialogs |
| `primary` / `primary-foreground` | `#1F4FD1` / `#FFFFFF` | `#7AA2FF` / `#0B1530` | The one primary action per view, links, selection |
| `secondary` / `secondary-foreground` | `#E8EBEE` / `#161B22` | `#242C37` / `#E8ECF1` | Secondary buttons, segmented controls |
| `muted` / `muted-foreground` | `#EEF0F2` / `#59636E` | `#202833` / `#9AA5B1` | Quiet fills; secondary text, units, captions |
| `accent` / `accent-foreground` | `#EAF0FD` / `#163B9E` | `#1E2A44` / `#C9D7FF` | Hover/selected rows, info notes |
| `destructive` / `destructive-foreground` | `#C42B2B` / `#FFFFFF` | `#C93C3C` / `#FFFFFF` | Delete, refund, errors |
| `destructive-soft` / `-soft-foreground` | `#FCE8E8` / `#A51F1F` | `#3A1C1F` / `#FF9C9C` | Error banners, failed payment rows |
| `success` / `success-foreground` | `#13795B` / `#FFFFFF` | `#4FD1A1` / `#06261B` | Paid, completed, on track |
| `success-soft` / `-soft-foreground` | `#E3F4EC` / `#0F6B50` | `#12302A` / `#4FD1A1` | Status chips, success banners |
| `warning` / `warning-foreground` | `#B45309` / `#FFFFFF` | `#F7B267` / `#2A1704` | At-risk, overdue, past due |
| `warning-soft` / `-soft-foreground` | `#FDF0D5` / `#7A3A08` | `#33260F` / `#F7B267` | Attention chips and banners |
| `pr` / `pr-foreground` | `#F5C518` / `#161B22` | `#F5C518` / `#161B22` | Personal records only. Never for warnings or decoration |
| `pr-soft` / `-soft-foreground` | `#FFF4CC` / `#161B22` | `#33290A` / `#F5C518` | The PR row highlight in the player |
| `border` | `#DDE1E5` | `#2A3340` | Dividers and card edges (decorative) |
| `input` | `#8A939D` | `#76828F` | Form control borders (≥3:1) |
| `ring` | `#1F4FD1` | `#7AA2FF` | Focus ring, always visible on keyboard focus |
| `chart-1` … `chart-5` | `#1F4FD1` `#0F8A7E` `#C77700` `#7048E8` `#6B7785` | `#7AA2FF` `#3CC4B4` `#F2A93B` `#A48BFF` `#9AA5B1` | Series, in this order; never use red/green as a series pair |
| `sidebar` … | Same as `card` / `foreground`; `sidebar-primary` = `primary` | Same as dark `card` | Coach desktop navigation |

Meaning is never carried by color alone: status chips always include a word ("Overdue",
"Paid"), and chart series are labelled directly.

## Typography

One family: **Archivo** (Google Fonts, variable: weight 100–900, width 62–125), loaded with
`next/font/google` including the `wdth` axis. Text uses normal width; numbers and headings use the
condensed width, which reads like weights stenciled on plates and saves horizontal space in tables
and the player.

| Style (utility) | Size / line height | Width / weight | Use |
| --- | --- | --- | --- |
| `num-xl` | 40 / 40 px | 75% / 700, tabular | The weight and reps being logged in the player |
| `num-lg` | 28 / 32 px | 75% / 650, tabular | Dashboard figures, PRs, totals, prices on product pages |
| `num` | inherit | 85% / 600, tabular | Numbers inside text and tables |
| `text-2xl` heading | 24 / 30 px | 85% / 700 | Page titles |
| `text-lg` heading | 18 / 26 px | 100% / 650 | Section titles, card titles |
| `text-base` | 16 / 24 px | 100% / 400 | Body. Minimum size for all inputs (prevents mobile zoom) |
| `text-sm` | 14 / 20 px | 100% / 400–500 | Dense coach tables, secondary text, buttons |
| `text-xs` | 12 / 16 px | 100% / 500 | Captions, units, timestamps. Never smaller than 12 px |

- Sentence case everywhere. No all-caps labels, no letter-spaced eyebrows above headings.
- Lines of prose stay under ~75 characters (`max-w-prose`).
- Units are smaller and muted next to their number: **62.5** kg, **8** reps.
- Tabular figures are required for `num*`. P0-04 verifies Archivo's support in the gallery
  (equal widths for "000" and "111"); if missing, the number styles switch to a family that has
  them, with the human's approval.

## Space, size and shape

- **Spacing:** Tailwind's 4 px scale. Page gutters 16 px (mobile), 24 px (tablet), 32 px (desktop).
  Related items 8–12 px apart, groups 24 px, sections 32–48 px.
- **Widths:** client screens are a single column, max 560 px, centered on larger screens. Coach
  content max 1200 px; tables may go full width.
- **Touch targets:** 44 × 44 px minimum everywhere; 48 px rows and buttons in the workout player.
  Icon buttons get the full 44 px hit area even when the icon is 20 px.
- **Radius (hierarchy, not one value):** `--radius: 0.625rem`. Inputs and buttons `rounded-md`
  (8 px); cards and panels `rounded-xl` (14 px); bottom sheets `rounded-t-2xl`; chips and avatars
  `rounded-full`; table cells square.
- **Elevation:** surfaces are separated by borders, not shadows. Shadows only for things that float:
  menus and popovers `shadow-md`, dialogs and sheets `shadow-xl`, the sticky rest-timer bar `shadow-lg`.
- **Icons:** `lucide-react`, 20 px in content, 24 px in navigation, always with a text label in
  navigation; icon-only buttons need `aria-label`.

## Motion

| Token | Value | Use |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Everything |
| `--dur-press` | 120 ms | Button press, checkbox |
| `--dur-state` | 180 ms | Row completion, tab change, toasts |
| `--dur-sheet` | 260 ms | Sheets, dialogs, rest timer bar |
| PR moment | 600 ms, once | Row fills with `pr-soft`, badge scales 0.9 → 1, short vibration where supported |

Motion answers an action; nothing animates on page load. With `prefers-reduced-motion: reduce`,
transforms are removed and only color changes remain.

## Dark mode

Follows the system by default, with a Light / Dark / System choice in settings (`next-themes`,
class strategy — a dependency P0-04 asks approval for). Both themes are first-class: screenshots and
axe scans run in both.

## Components

### From shadcn/ui (install as needed, restyled only through tokens)

Button · Input · Textarea · Label · Select · Checkbox · Switch · RadioGroup · Tabs · Dialog ·
Sheet / Drawer (mobile bottom sheets) · DropdownMenu · Popover · Tooltip (desktop hints only, never
essential info) · Sonner toasts · Table · Badge · Avatar · Progress · Skeleton · Calendar ·
Command (exercise search) · Form (React Hook Form + Zod) · Separator · ScrollArea.

Button variants: `default` (primary, one per view), `secondary`, `outline`, `ghost`, `destructive`,
`link`. Sizes: `sm` 36 px (desktop tables only), `default` 44 px, `lg` 48 px (player, checkout).

### Product components (built in P0-04/P0-05, specified in `patterns.md` and `screens/`)

| Component | Purpose |
| --- | --- |
| `AppShell`, `SideNav`, `BottomNav`, `PageHeader` | Navigation and page frame per area |
| `EmptyState`, `ErrorState`, `ListSkeleton` | The three non-happy states every data view needs |
| `StatusChip` | Word + color for statuses (Active, Paused, Overdue, Paid, Failed…) |
| `AttentionRow` | A client who needs attention, with the reason in words and one action |
| `Money`, `Weight`, `Reps`, `Duration`, `RelativeDate` | Formatting components; never format inline |
| `SetRow`, `ExerciseCard`, `RestTimerBar`, `PRBadge`, `SyncIndicator` | Workout player |
| `WeekGrid`, `WorkoutEditor`, `PrescriptionCell`, `ExercisePicker` | Program builder |
| `MetricChart` | Line and bar charts with direct labels (Recharts) |
| `CheckinCard`, `MessageThread`, `Composer` | Check-ins and chat |
| `OfferCard`, `PriceSummary`, `WhishPayButton` | Storefront and checkout |

## Charts

- Line for anything over time (e1RM, body weight, weekly volume trend); bars for comparisons across
  categories (volume per muscle group). Bars start at zero; lines may not.
- One highlighted series in `chart-1`; context in `muted-foreground`. Label the latest value directly
  on the chart instead of relying on a legend. No dual axes, pies, donuts or gauges.
- Body weight shows the daily points faintly with a 7-day average line on top.
- Every chart has an accessible summary sentence ("Squat e1RM up 7.5 kg in 6 weeks").

## Starting `globals.css`

P0-04 runs `shadcn init`, keeps its structure, and replaces values with these. Token names must not change.

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  --background: #F5F6F4;  --foreground: #161B22;
  --card: #FFFFFF;        --card-foreground: #161B22;
  --popover: #FFFFFF;     --popover-foreground: #161B22;
  --primary: #1F4FD1;     --primary-foreground: #FFFFFF;
  --secondary: #E8EBEE;   --secondary-foreground: #161B22;
  --muted: #EEF0F2;       --muted-foreground: #59636E;
  --accent: #EAF0FD;      --accent-foreground: #163B9E;
  --destructive: #C42B2B; --destructive-foreground: #FFFFFF;
  --destructive-soft: #FCE8E8; --destructive-soft-foreground: #A51F1F;
  --success: #13795B;     --success-foreground: #FFFFFF;
  --success-soft: #E3F4EC; --success-soft-foreground: #0F6B50;
  --warning: #B45309;     --warning-foreground: #FFFFFF;
  --warning-soft: #FDF0D5; --warning-soft-foreground: #7A3A08;
  --pr: #F5C518;          --pr-foreground: #161B22;
  --pr-soft: #FFF4CC;     --pr-soft-foreground: #161B22;
  --border: #DDE1E5;      --input: #8A939D;   --ring: #1F4FD1;
  --chart-1: #1F4FD1; --chart-2: #0F8A7E; --chart-3: #C77700; --chart-4: #7048E8; --chart-5: #6B7785;
  --sidebar: #FFFFFF; --sidebar-foreground: #161B22;
  --sidebar-primary: #1F4FD1; --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #EAF0FD; --sidebar-accent-foreground: #163B9E;
  --sidebar-border: #DDE1E5; --sidebar-ring: #1F4FD1;
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --dur-press: 120ms; --dur-state: 180ms; --dur-sheet: 260ms;
}

.dark {
  --background: #121821;  --foreground: #E8ECF1;
  --card: #1A212B;        --card-foreground: #E8ECF1;
  --popover: #1A212B;     --popover-foreground: #E8ECF1;
  --primary: #7AA2FF;     --primary-foreground: #0B1530;
  --secondary: #242C37;   --secondary-foreground: #E8ECF1;
  --muted: #202833;       --muted-foreground: #9AA5B1;
  --accent: #1E2A44;      --accent-foreground: #C9D7FF;
  --destructive: #C93C3C; --destructive-foreground: #FFFFFF;
  --destructive-soft: #3A1C1F; --destructive-soft-foreground: #FF9C9C;
  --success: #4FD1A1;     --success-foreground: #06261B;
  --success-soft: #12302A; --success-soft-foreground: #4FD1A1;
  --warning: #F7B267;     --warning-foreground: #2A1704;
  --warning-soft: #33260F; --warning-soft-foreground: #F7B267;
  --pr: #F5C518;          --pr-foreground: #161B22;
  --pr-soft: #33290A;     --pr-soft-foreground: #F5C518;
  --border: #2A3340;      --input: #76828F;   --ring: #7AA2FF;
  --chart-1: #7AA2FF; --chart-2: #3CC4B4; --chart-3: #F2A93B; --chart-4: #A48BFF; --chart-5: #9AA5B1;
  --sidebar: #1A212B; --sidebar-foreground: #E8ECF1;
  --sidebar-primary: #7AA2FF; --sidebar-primary-foreground: #0B1530;
  --sidebar-accent: #1E2A44; --sidebar-accent-foreground: #C9D7FF;
  --sidebar-border: #2A3340; --sidebar-ring: #7AA2FF;
}

@theme inline {
  --font-sans: var(--font-archivo), ui-sans-serif, system-ui, sans-serif;
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);   --color-foreground: var(--foreground);
  --color-card: var(--card);               --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);         --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);         --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);     --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);             --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);           --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive); --color-destructive-foreground: var(--destructive-foreground);
  --color-destructive-soft: var(--destructive-soft); --color-destructive-soft-foreground: var(--destructive-soft-foreground);
  --color-success: var(--success);         --color-success-foreground: var(--success-foreground);
  --color-success-soft: var(--success-soft); --color-success-soft-foreground: var(--success-soft-foreground);
  --color-warning: var(--warning);         --color-warning-foreground: var(--warning-foreground);
  --color-warning-soft: var(--warning-soft); --color-warning-soft-foreground: var(--warning-soft-foreground);
  --color-pr: var(--pr);                   --color-pr-foreground: var(--pr-foreground);
  --color-pr-soft: var(--pr-soft);         --color-pr-soft-foreground: var(--pr-soft-foreground);
  --color-border: var(--border);  --color-input: var(--input);  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1); --color-chart-2: var(--chart-2); --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4); --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar); --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary); --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent); --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border); --color-sidebar-ring: var(--sidebar-ring);
}

@utility num { font-stretch: 85%; font-weight: 600; font-variant-numeric: tabular-nums; }
@utility num-lg { font-stretch: 75%; font-weight: 650; font-size: 1.75rem; line-height: 2rem; font-variant-numeric: tabular-nums; }
@utility num-xl { font-stretch: 75%; font-weight: 700; font-size: 2.5rem; line-height: 2.5rem; font-variant-numeric: tabular-nums; }

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground antialiased; }
  h1, h2 { font-stretch: 85%; }
  :focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }
  }
}
```
