# PT Platform

Coaching and program-selling platform for personal trainers (Next.js + Supabase + Whish).
This repository starts as a **harness**: the environment Claude Code works inside. The app itself is
built task by task from the contracts in `tasks/`.

## Set up (Windows)

1. **Pick a writable folder outside Program Files**, e.g. `C:\dev\pt-platform`. Unzip this kit there.
   (`C:\Program Files (x86)\` is write-protected, and its parentheses break unquoted paths in PowerShell.)
2. Install: [Node.js LTS](https://nodejs.org), pnpm (`npm install -g pnpm`), [Git for Windows](https://git-scm.com/downloads/win),
   [Docker Desktop](https://www.docker.com/products/docker-desktop/), the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started),
   and [Claude Code](https://code.claude.com/docs/en/quickstart).
3. In PowerShell:
   ```powershell
   cd C:\dev\pt-platform
   git init
   git add -A
   git commit -m "chore: harness"
   claude
   ```
4. When Claude Code asks whether to trust the folder, accept: the project's permission rules and hooks
   only apply in a trusted folder.

## Build the whole product with one prompt (autopilot)

1. Finish **Set up** above (Docker Desktop running, `git init`, first commit, folder trusted).
2. Start Claude Code in auto mode, so tool calls don't each wait for a click:
   ```powershell
   claude --permission-mode auto
   ```
3. Type this one line and leave it running:
   ```
   /goal Run /autopilot until `node scripts/autopilot.mjs status` prints AUTOPILOT: COMPLETE or AUTOPILOT: NEEDS-HUMAN
   ```

What happens: Claude becomes the orchestrator. It drafts and approves each contract after a strict
self-check, does the database work itself, and sends independent tasks to up to 3 `builder` agents at
once. Each builder works in its own git worktree. Claude then merges their work, runs the full checks,
has the `ui-reviewer` and `verifier` agents review every task in parallel, writes the receipts, and
moves to the next wave. It never stops to ask you anything. Anything that needs you (pushes, deploys,
remote Supabase, Whish credentials, extra packages, harness changes) is added to
`.harness/approvals.md`, and Claude carries on with everything else.

- `/goal` checks after every turn whether the condition holds. It also retries after network errors,
  and it resumes after a usage limit resets as long as the session is still open. Typing just
  `/autopilot` also works, because the project's Stop hook keeps the session going.
- **If the session closes:** run `claude --continue` (the goal is restored), or start Claude again and
  type `/autopilot`. All progress is in files and commits, so nothing is lost.
- **Check progress at any time:** run `node scripts/autopilot.mjs status`, or open `.harness/progress.md`
  and `.harness/receipts/`.
- **Stop it:** `/goal clear`, then `/autopilot off`.
- **Tune it:** edit `.harness/autopilot.json`: which phases, how many builders, and which packages are
  pre-approved. Phase 4 is never built automatically.
- Building the whole product is many hours of work across several usage windows on your plan. The run
  pauses when you hit a limit and picks up where it left off.

## Work with it step by step

| You type | What happens |
| --- | --- |
| `Review tasks/P0-01-scaffold.yaml with me` | Claude walks you through the contract; you tighten it, then say **approved** |
| `/work P0-01` | Claude implements inside the contract's scope, runs the checks, gets the verifier's verdict, writes a receipt |
| `/contract P1-01` | Claude drafts the next contract from `tasks/backlog.md` and stops for your approval |
| `/verify` or `/verify full` | Runs the scripted checks and reports from `.harness/last-verify.json` |
| `/harness-upgrade <what went wrong>` | Turns a failure into a lasting rule, check or hook |
| `/harness-upgrade review` | End-of-phase audit: what to keep, simplify or delete |

After each task, read `.harness/receipts/<ID>.md`: what changed, what is proven, what is **not**
verified, and what needs your approval (pushes, deploys, remote database changes).

## Develop the app

The app is a Next.js (App Router, TypeScript strict) project managed with pnpm. On Windows, install
Node.js LTS (≥ 24), pnpm (`npm install -g pnpm`), Docker Desktop (for the local Supabase stack, used
from P0-02 on) and the Supabase CLI, then:

```powershell
cd C:\dev\pt-platform
pnpm install
pnpm exec playwright install chromium   # one-time browser download for e2e tests
pnpm dev                                 # http://localhost:3000
```

Everyday scripts (full list in `docs/commands.md`):

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build, then serve it |
| `pnpm lint` | ESLint |
| `pnpm format:check` / `pnpm format` | Prettier check / write |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | End-to-end tests (Playwright) |
| `pnpm test:rls` | RLS isolation tests against the local Supabase stack |
| `pnpm db:types` | Regenerate Supabase types (needs the local stack running) |

### Seed accounts (local only)

`supabase db reset` seeds five accounts, all with the password **`Password123!`** (an obvious local
test value — never a real credential):

| Email | Role |
| --- | --- |
| `admin@ptplatform.test` | admin |
| `trainer.a@ptplatform.test` | trainer (Alpha Strength) |
| `trainer.b@ptplatform.test` | trainer (Beta Fitness) |
| `client.one@ptplatform.test` | client (Trainer Alpha's client) |
| `client.two@ptplatform.test` | client (Trainer Beta's client) |

Verify before committing:

```powershell
node scripts/verify.mjs          # fast: architecture, format, lint, typecheck, unit tests
node scripts/verify.mjs --full   # also RLS tests, production build, e2e tests
```

## What's where

| Path | Purpose |
| --- | --- |
| `CLAUDE.md` | Always-loaded map: the loop, where everything is, hard rules, recovery table |
| `docs/` | The product spec split by § so tasks load only what they need; `docs/HARNESS.md` explains the harness |
| `docs/ui/` | UI research, principles, design system (tokens ready to paste), patterns, copy rules, screen-by-screen specs, UI checklist |
| `tasks/` | Task contracts (Phase 0 written in full) and the backlog |
| `.harness/` | Durable state: facts, decisions, progress, lessons, receipts, last verify result, trace |
| `.claude/settings.json` | Permission rules and hook wiring |
| `.claude/hooks/` | Guards (block or ask), auto-format, trace, session briefing, Stop gate |
| `.claude/agents/verifier.md` | Fresh-context reviewer that tries to reject finished work |
| `.claude/agents/ui-reviewer.md` | Design reviewer that grades screenshots against the UI checklist and screen specs |
| `.claude/agents/builder.md` | Parallel builder: implements one task's app code in its own git worktree |
| `.claude/skills/autopilot/` | `/autopilot`: works the whole backlog, in waves, without stopping |
| `.harness/autopilot.json`, `.harness/approvals.md` | Autopilot policy (yours to edit) and the list of things waiting on you |
| `.claude/rules/ui.md` | UI rules that load automatically whenever Claude opens a screen file |
| `.claude/skills/` | `/autopilot`, `/contract`, `/work`, `/verify`, `/receipt`, `/harness-upgrade` |
| `scripts/` | `verify.mjs` (check ladder) and `check-architecture.mjs` (static rules) |
| `.github/workflows/ci.yml` | Same checks in CI, independent of the agent |

## Before Phase 2

Ask Whish's business team for merchant API docs and sandbox credentials, and put the docs in
`docs/whish/`. Payment tasks stop and ask if that folder is empty.
