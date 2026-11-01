---
name: autopilot
description: Build the whole product from one prompt — work every backlog task to done without stopping, running independent tasks in parallel with builder agents in git worktrees. Use when the human says autopilot, "finish the product", "keep going until done", or a /goal asks to work the backlog.
argument-hint: "[on | off | status]"
---

Argument: $ARGUMENTS — `off`: run `node scripts/autopilot.mjs off`, report, stop. `status`: run
`node scripts/autopilot.mjs status`, report, stop. Anything else (or empty): run the autopilot.

You are the **orchestrator**. The human pre-approved this run (D-006, D-007, `.harness/autopilot.json`):
you draft and approve contracts yourself, install pre-approved dependencies, and never stop to ask.
Everything in the policy's `human_only` list goes into `.harness/approvals.md` instead — then you
carry on with the work that doesn't need it. The Stop hook sends you back whenever you stop early.

## Start
1. `node scripts/autopilot.mjs on`, then read `.harness/autopilot.json` and the status it prints.
2. Never use AskUserQuestion. Never end a turn to wait for an answer. Keep chat output short — the
   files are the record (progress, receipts, approvals), and the human reads those.

## The loop — repeat until status says COMPLETE or NEEDS-HUMAN
Run `node scripts/autopilot.mjs status`. It names the next task and the tasks ready now.

### A. Contracts (you, sequentially — they're small)
For each task you are about to build that has no approved contract:
1. Follow `.claude/skills/contract/SKILL.md` steps 1–5.
2. **Self-check** (this replaces the human review, so be strict): every behaviour in the backlog
   row's § sections and every item in the named UI spec's acceptance list maps to an acceptance line;
   unhappy paths are covered (wrong role, other trainer's data, invalid input, double submit);
   every line names checkable evidence; scope is concrete; anything needing the human is a separate
   line marked `(human)` so the task can be **parked** rather than blocked.
3. Mark `## Schema lane` in the contract's `notes` with the migrations/RLS/seed/types work, if any.
4. Set `status: approved`, `approved_by: autopilot (D-006)`, `approved_at: <today>`; add the progress
   row; commit `chore(tasks): approve <ID> (autopilot)`.

### B. Pick the wave
From the ready list, take up to `max_parallel_builders` tasks whose `scope` paths don't overlap (new
files in different feature folders are fine; shared files such as layout, nav or package.json are an
overlap). Phase 0 tasks and anything touching shared foundations run alone. If the wave is one task,
skip C's builders and do the whole task yourself with `.claude/skills/work/SKILL.md` (sections 0–4).

### C. Build the wave
1. **Schema lane first, by you, in the main checkout**, task by task: migrations, RLS policies, seed,
   `supabase db reset`, `pnpm db:types`, RLS tests (`pnpm test:rls`). Commit per task
   (`feat(db): <what> [<ID>]`). Builders branch from your HEAD, so they get the schema and types.
2. Set each wave task to `building` in `.harness/progress.md` and commit.
3. **Spawn one `builder` per task, all in the same message**, with `run_in_background: false` so you
   get every report back together. Give each: the task ID, the contract path, the base commit, and
   "the schema lane is done". Nothing else — the contract is the brief.
4. While they run you have nothing to do; don't start other code changes in the main checkout.

### D. Integrate (you, one task at a time, in the order they reported)
1. `git merge --no-ff <branch> -m "merge <ID>: <title>"`. Lockfile conflict: take one side
   (`git checkout --theirs pnpm-lock.yaml`), then `pnpm install`. Other conflicts: resolve keeping both
   tasks' intent. NEEDS-SCHEMA: add the migration yourself (new file), regenerate types, finish the code.
   BLOCKED: set the task `blocked`, add its approvals line, continue with the others.
2. Add the reported UI routes to `tests/e2e/ui-routes.ts`; record reported facts/decisions/lessons.
3. After all merges: `node scripts/verify.mjs --full` on the combined tree. Fix integration failures
   here (each fix is an attempt). Then `git worktree remove <path>` and `git branch -d <branch>` for
   each merged builder.

### E. Review in parallel
Spawn, in one message: a `ui-reviewer` for each UI task and a `verifier` for each task. Give each its
task ID and its diff base (`<merge commit>^1`), and tell the verifiers that `verify --full` already
passed on this tree (they check the fingerprint instead of re-running it). REJECT → fix the findings,
re-run `verify --full`, re-review only that task. Two rejections on the same finding → `blocked`.

### F. Close each task
Follow `.claude/skills/receipt/SKILL.md`. Status:
- `done` — every acceptance line has evidence, `--full` green, verifier (and ui-reviewer) ACCEPT.
- `parked` — everything local is proven, but some `(human)` lines need the human (deploy, real Whish,
  a credential). Receipt lists them under "Not verified"; each has an approvals line. Parked counts as
  done for dependencies.
- `blocked` — 3 attempts on one failure without new information, or a decision only the human can
  make. Write what you tried and what is needed in progress.md and approvals.md, then move on.
Update progress.md, commit `chore(harness): close <IDs>`.

### G. End of a phase
When the last task of a phase closes: write `.harness/receipts/phase-<N>.md` mapping each gate line in
`docs/phases.md` §13 to evidence or "(human)". Harness improvements you'd make go into approvals.md
as proposals (`/harness-upgrade` changes harness files, which need the human). Then continue.

## Recovery
- After a context compaction or a resume, the session briefing shows the autopilot status: trust it
  and the files over memory, then continue the loop.
- Tasks stuck in `building` with no builder running (the session was interrupted): look for their
  branch (`git worktree list`); if it has commits, integrate it (D); otherwise build it again.
- Auto mode's safety classifier blocked an action: don't look for a workaround. Queue it in
  approvals.md and continue.

## Hard rules (still apply in autopilot)
Never push, deploy, touch the remote Supabase project, read `.env*`, edit harness files, the
autopilot policy, design tokens or docs/ui specs, weaken a check or acceptance line, or write
"passed" for a check you didn't run.

## When it ends
COMPLETE or NEEDS-HUMAN: send the human a short summary — tasks done / parked / blocked, the phase
receipts, and the list in `.harness/approvals.md` with exactly what they need to do. Then stop.
