# UI research — findings and what they mean for us

Researched 2026-11-01. Each finding names its source and the design decision it drives. Vendor
comparison articles are biased (noted where relevant); treat them as signals, not proof.

## 1. Logging a set must be nearly instant

| Finding | Source | Decision |
| --- | --- | --- |
| Fast trackers show last session's weight and reps on the same screen, pre-fill values so a repeat set needs 0–1 edits, save with one button, and never show a confirmation dialog on save. Slow ones open to a feed, force routine selection, or confirm every set. (Article is published by one of the apps it ranks.) | [LastLift: fastest workout tracker apps](https://lastlift.pages.dev/articles/fastest-workout-tracker-apps/) | Set rows are pre-filled from the prescription; the previous performance sits in the same row; one tap on ✓ completes a set; no confirm dialogs anywhere in the player. Target: a pre-filled set logs in 1 tap, an edited set in ≤3. |
| Hevy: tapping the set number changes set type; a PREVIOUS value shows during logging; completing a set starts the rest timer automatically; rest time is per exercise; swipe left to delete a set; live PR notification when a set beats a record; pinned notes per exercise. | [Hevy: track workouts](https://www.hevyapp.com/features/track-workouts/) | Same interaction model, so lifters who know Hevy or Strong feel at home: auto rest timer on ✓, per-exercise rest from the prescription, PR moment on completion, coach notes pinned to the exercise. |
| Everfit users say workout tracking "can feel overly detailed", demanding attention mid-exercise. (Competitor comparison.) | [FitBudd: Everfit vs Trainerize vs TrueCoach](https://www.fitbudd.com/insights/everfit-vs-trainerize-vs-truecoach?c84a98fb_page=9) | Show only the fields the coach prescribed. RPE, tempo and distance columns appear only when used. |

## 2. Coaches drown in features and devices

| Finding | Source | Decision |
| --- | --- | --- |
| Trainerize reviewers: Android app "slow" and misses notifications; trainers must use "BOTH a computer … and the app"; backend workout setup is "confusing at times"; trainers want to preview a workout before assigning it. Praise: fast workout building, video demos, morning reports showing who followed the plan. | [Capterra: Trainerize reviews](https://www.capterra.com/p/140262/Trainerize/reviews/?page=5) | Every daily coach task works on a phone. Android performance is tested, not assumed. Assigning always shows a preview. The dashboard leads with "who followed the plan and who didn't". |
| Trainerize: steep learning curve, overwhelming at first, needs constant internet. (Competitor article.) | [FitBudd: Trainerize pros and cons](https://fitbudd.com/grow/pros-and-cons-trainerize-app-reviews) | Progressive disclosure: a new coach sees a setup checklist and a few destinations, not every feature. The client player shows sync state and (Phase 3) works offline. |
| TrueCoach's text-based weekly builder is limited for complex, multi-phase programs. (Competitor comparison.) | [FitBudd comparison](https://www.fitbudd.com/insights/everfit-vs-trainerize-vs-truecoach?c84a98fb_page=9) | Structured week × day grid with fast keyboard entry, duplication and templates — structure without slowness. |

## 3. Our users are on Android phones, in gyms

| Finding | Source | Decision |
| --- | --- | --- |
| Lebanon, October 2026: Android 69.34%, iOS 30.66% of mobile OS share. | [StatCounter: mobile OS share, Lebanon](https://gs.statcounter.com/os-market-share/mobile/lebanon) | Design and test on a mid-range Android Chrome first (360 px wide), iOS Safari second. Performance budgets assume mid-range hardware. |
| Bottom navigation: keep to 5 destinations max, put core features within thumb reach, pair icons with labels, avoid hiding primary destinations behind a hamburger; use "More" as overflow. | [UX Planet: one-handed tab bars](https://uxplanet.org/one-handed-use-of-tab-bar-bottom-navigation-best-practices-for-reachability-73376377444b) | Client app: 4 labelled bottom tabs. Coach on mobile: 5 labelled bottom tabs including More. Primary actions sit in the bottom half of the screen. |
| `inputmode="decimal"` shows a numeric keypad with a decimal separator; `numeric` shows digits only; inputmode controls the keyboard while `type` controls validation. | [Digital Thrive: inputmode](https://www.digitalthriveai.com/en-us/resources/docs/web-development/inputmode/) | Weight fields: `type="text" inputmode="decimal"`; reps: `inputmode="numeric"`; validate with Zod, not the browser. |

## 4. Accessibility and performance floors

| Finding | Source | Decision |
| --- | --- | --- |
| WCAG 2.2 SC 2.5.8 (AA): pointer targets at least 24×24 CSS px (or 24 px spacing). AAA 2.5.5 is 44×44; Apple HIG recommends 44 pt, Material 48 dp. | [AllAccessible: WCAG 2.5.8 guide](https://allaccessible.org/blog/wcag-258-target-size-minimum-implementation-guide) | Our floor is above AA: 44×44 px for every touch target; 48 px rows and buttons inside the workout player (sweaty hands, glances). |
| SC 1.4.3: 4.5:1 for normal text, 3:1 for large text (≥24 px, or ≥18.5 px bold). | [W3C: Understanding contrast minimum](https://w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | Every token pair in `design-system.md` is checked; a unit test recomputes the ratios from `globals.css`. |
| `@axe-core/playwright` scans pages with WCAG tags (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`); automated checks catch contrast, missing labels, duplicate IDs, but not everything. | [Playwright: accessibility testing](https://playwright.dev/docs/accessibility-testing) | An axe scan runs on every route in the UI test list during `verify --full`; the `ui-reviewer` agent covers what axe cannot (focus order, clarity, hierarchy). |
| Core Web Vitals "good": LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, at the 75th percentile. | [web.dev: CWV thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds?hl=en) | Budgets in `patterns.md`; skeletons reserve layout space so nothing shifts. |

## 5. Empty states, dashboards and checkout

| Finding | Source | Decision |
| --- | --- | --- |
| Design empty states on purpose: show system status, teach what the area is for, give a direct path to fill it; never show "No records" while still loading. | [NN/g: empty state interface design](https://nngroup.com/articles/empty-state-interface-design) | Every list has three distinct states: loading (skeleton), empty (purpose + one action), no-results (filters + clear). |
| Dashboards should use length and 2D position (bars, points on axes) for quick, preattentive reading. | [NN/g: data visualizations for dashboards](https://www.nngroup.com/videos/data-visualizations-dashboards/) | Bars and lines only; no pies, gauges or donut charts for comparisons. |
| Checkout: 70.22% average abandonment; 39% leave over unexpected costs, 19% over forced account creation, 18% over a long or complex process, 14% can't see the total upfront; optimized flows have ~12 form elements; 98% of sites lack specific error messages. | [Baymard: checkout flow UX](https://baymard.com/blog/checkout-flow-ux-optimization) | One-page checkout showing the full total before payment, account created with just email + password (or magic link) inline, ≤6 fields, specific inline errors, data preserved on error. |
| shadcn/ui themes with semantic OKLCH/CSS-variable pairs (`primary` / `primary-foreground`, `muted`, `destructive`, `chart-1…5`, `sidebar-*`), dark values under `.dark`, and new colors exposed to Tailwind v4 via `@theme inline`. | [shadcn/ui: theming](https://ui.shadcn.com/docs/theming) | Our tokens use shadcn's names, plus `success`, `warning`, `info` and `pr` added the documented way. |
| Archivo is a free variable family (Google Fonts, OFL) with weight 100–900 and width 62–125. | [Font Alternatives: Archivo](https://fontalternatives.com/fonts/archivo/) | One family for everything: normal width for text, condensed width for big numbers. Tabular figures must be verified in P0-04. |
