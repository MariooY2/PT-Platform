# PT Platform — agent map

You are building PT Platform: a Next.js + Supabase web app for personal trainers in Lebanon
(client tracking, program delivery, selling programs with Whish). This file is the always-loaded
map. Load details only when the task in front of you needs them.

## The operating loop — every change goes through it

1. **Contract.** No code change without an approved contract in `tasks/`. Draft one with `/contract`.
   Work only on the task named in `.harness/active-task`, and only once its `status` is `approved`.
2. **Context.** Read the docs the contract's `context` lists, then the exact files. Nothing else by default.
3. **Act.** Stay inside `scope`. Never break a `constraints` line. Stop and ask before anything in
   `approval_required`.
4. **Check.** Run `node scripts/verify.mjs` while working and `node scripts/verify.mjs --full` before
   claiming done. The Stop hook re-runs the fast checks whenever code changed since the last green run.
5. **Attack.** UI tasks go to the `ui-reviewer` subagent first; then every task goes to the
   `verifier` subagent. Each must return `VERDICT: ACCEPT`.
6. **Receipt.** Run `/receipt` to write `.harness/receipts/<ID>.md`. Only claims backed by evidence.
7. **State.** Update `.harness/progress.md`, and `decisions.md`, `facts.md`, `lessons.md` when relevant.

`/work <ID>` runs steps 2–7 for an approved contract. `/verify` runs the checks. `/harness-upgrade`
turns a failure or a correction into a lasting fix.

**Autopilot** (`/autopilot`, D-006/D-007): one prompt builds the whole backlog. You are the orchestrator:
you approve your own contracts after a strict self-check, run the schema lane, send independent tasks to
`builder` agents in parallel worktrees, merge, verify and review. You never wait for answers — anything
that needs the human goes into `.harness/approvals.md` and you move on. Follow
`.claude/skills/autopilot/SKILL.md`; `node scripts/autopilot.mjs status` says what's next.

## Project map

| Need | Go to |
| --- | --- |
| Product, users, roles (§1, §3) | `docs/product.md` |
| Stack, folder structure, conventions (§2) | `docs/architecture.md` |
| Routes and API handlers (§4) | `docs/routes.md` |
| Tables and columns (§5) | `docs/data-model.md` |
| Row-level security and storage (§6) | `docs/security.md` |
| Feature behaviour by module (§7) | `docs/features.md` |
| Payments, Whish, env vars (§8) | `docs/payments.md` + official docs in `docs/whish/` |
| Formatting, PWA, cron jobs, non-functional (§9–§12) | `docs/platform.md` |
| **Any screen: design system, patterns, copy, screen specs** | `docs/ui/README.md` first, then `docs/ui/screens/` |
| Phase gates and out-of-scope (§13–§14) | `docs/phases.md` |
| Commands (dev, test, db, verify) | `docs/commands.md` |
| How this harness works, and changing it | `docs/HARNESS.md` |
| Task contracts and backlog | `tasks/` (`tasks/backlog.md`) |
| Autopilot policy, what waits on the human | `.harness/autopilot.json`, `.harness/approvals.md` |
| Run state: facts, decisions, progress, lessons, receipts | `.harness/` |

## Rules that hold everywhere

Most of these are enforced by `.claude/settings.json`, hooks and `scripts/check-architecture.mjs`.
A block is not an obstacle to route around: report it and stop.

- Secrets stay server-side. Only `NEXT_PUBLIC_*` reaches the browser. Never read or print `.env*`
  (except `.env.example`). The service key and `WHISH_SECRET` are used only in `src/lib/supabase/admin.ts`,
  `src/lib/payments/**`, `src/app/api/**`.
- Every new table: a new migration, `enable row level security`, policies per §6, regenerated types,
  RLS tests. Never edit a committed migration — add a new one.
- Never edit generated files (`src/lib/supabase/types.ts`): run `pnpm db:types`.
- Server code validates every input with Zod. Prices, totals and user/trainer IDs never come from the browser.
- UI follows `docs/ui/`: design tokens only (no raw or palette colors, no off-scale text sizes),
  every data view has loading/empty/no-results/error states, 360 px first, English copy per
  `docs/ui/copy.md`. UI tasks finish with screenshots + axe (`verify --full`) and a `ui-reviewer` ACCEPT.
  (`.claude/rules/ui.md` loads these rules whenever you open a UI file.)
- No new dependency, deploy, push, remote database change or secret change without the human saying yes.
- Never weaken a check, test, contract acceptance line or harness file to make work pass. Changes to
  `tasks/*.yaml`, `scripts/`, `.claude/` and CI ask the human first.
- Never write "passed" for a check you did not run. Evidence comes from `.harness/last-verify.json`,
  test output or the verifier's report.

## Done means

Every acceptance line in the contract has evidence, `node scripts/verify.mjs --full` is green on the
current tree, the verifier returned ACCEPT, and the receipt lists what was **not** verified. Anything
less is `blocked` or `in_progress`, said plainly.

## When something fails

Classify first, then act. A retry must change at least one relevant condition.

| Failure | Next action |
| --- | --- |
| Tool or network timeout | Retry once with a longer timeout |
| Invalid command or arguments | Fix the call; check `docs/commands.md` |
| Missing context | Read the specific doc or file named in the map; don't guess |
| Failing test or type error | Read the failure, reproduce it with the narrowest command, fix the cause |
| Blocked by a hook or permission rule | Stop. Explain what you were trying to do and ask (autopilot: queue it in approvals.md, move on) |
| Contract is ambiguous or contradicts the docs | Stop and ask; record the answer in `.harness/decisions.md` (autopilot: take the reading closest to docs/, record it as a decision, flag it in approvals.md) |
| Same failure 3 times with no new information | Stop the loop, mark the task `blocked`, write what you tried |

Budget per task: 3 attempts per failure class, no more than the contract's `budget` allows.
After a human correction or a blocked task, run `/harness-upgrade`.

## Known facts (keep short; details in `.harness/facts.md`)

- The owner works on Windows. Hooks and scripts are Node, so they run there without bash or jq.
- Local Supabase needs Docker Desktop running.
- English only for now (D-004): no i18n library, no Arabic, no RTL.
