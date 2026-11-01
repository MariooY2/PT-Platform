---
name: contract
description: Draft or revise a task contract in tasks/ before any code change. Use when starting a backlog task, when the human asks for work that has no approved contract, or when the scope of the current task changes.
argument-hint: "[task-id or short description]"
---

Turn the request into a task contract. Do not change any code in this skill.

Request: $ARGUMENTS

1. **Find the task.** If the request is a backlog ID (e.g. `P1-03`), read its row in `tasks/backlog.md`.
   If it is a description, pick the next free ID in the right phase. If a contract file already exists
   for the ID, you are revising it: show the human what you change and why.
2. **Gather only what the contract needs.** Read the § sections of `docs/` that the task touches (use
   the map in CLAUDE.md), `.harness/facts.md`, `.harness/decisions.md`, and skim the files the task
   will change so scope reflects the real codebase.
3. **Write `tasks/<ID>-<short-name>.yaml`** from `tasks/_template.yaml`, with `status: draft`:
   - `objective`: the outcome, in one or two sentences.
   - `context`: the smallest set of docs needed, with § numbers.
   - `scope`: concrete paths. `constraints`: what must not change or happen.
   - `acceptance`: 3–7 lines. Each names evidence a command, a test, an artifact or the verifier can
     check. Prefer named tests and `node scripts/verify.mjs --full` steps over prose. Include the
     unhappy paths (wrong role, other tenant's data, invalid input, duplicate submission).
   - `approval_required`: new dependencies, remote changes, deploys, anything irreversible.
   - `budget` and `notes` (facts that save rediscovery).
4. **Check it against these questions.** What outcome must exist? What is in scope? What must not
   change? What evidence proves completion? What needs human approval? Rewrite any line that a
   machine or the verifier could not check.
5. **Add the row** to `.harness/progress.md` with status `draft`.
6. **Stop.** Show the contract to the human and ask for approval or changes. Do not start work.
   Exception: when autopilot is on (`node scripts/autopilot.mjs status` says ON), run the self-check in
   `.claude/skills/autopilot/SKILL.md` §A and approve it yourself under D-006 instead of stopping.

When the human approves in chat: set `status: approved`, `approved_by: <human>`, `approved_at: <date>`,
write the ID to `.harness/active-task`, update `.harness/progress.md`, and commit the contract
(`chore(tasks): approve <ID>`). Then suggest `/work <ID>`.
