# UI map

Read this before building or changing any screen. It takes two minutes and saves rework.

| You are… | Read |
| --- | --- |
| Building any screen | `principles.md` (once per session), then the screen's spec in `screens/` |
| Choosing colors, type, spacing, components | `design-system.md` |
| Building lists, forms, navigation, empty/loading/error states | `patterns.md` |
| Writing any visible text | `copy.md` |
| Finishing a UI task | `checklist.md` |
| Wondering why a decision was made | `research.md` |

| Area | Spec |
| --- | --- |
| Client app: today, workout player, progress, check-ins, messages, billing | `screens/client-app.md` |
| Coach daily work: today, clients, client profile, check-in review, messages | `screens/coach.md` |
| Program builder, exercise library, forms builder, assigning | `screens/program-builder.md` |
| Storefront, product page, checkout, result; coach products, orders, earnings | `screens/storefront.md` |
| Sign in, sign up, invites, coach onboarding, setup checklist, admin | `screens/auth-onboarding-admin.md` |

## The short version

1. Design at 360 px first; desktop adds density, never missing capability.
2. Tokens only. If a value you need doesn't exist, add a token in `globals.css` (that edit asks the
   human) rather than hard-coding it.
3. Every data view has loading, empty, no-results and error states.
4. One primary action per view, named with a verb. No confirm dialogs for reversible actions — Undo.
5. Big tabular numbers with units. The PR yellow is for personal records only.
6. Finish with evidence: routes in `tests/e2e/ui-routes.ts`, `verify --full` green (screenshots +
   axe), then the `ui-reviewer` agent.

If a spec is wrong or missing something, don't silently deviate: propose the change, and record the
decision in `.harness/decisions.md`.
