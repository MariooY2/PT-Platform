---
name: work
description: Run the full harness loop on an approved task contract — implement inside scope, check, get the verifier's verdict, write the receipt and update state.
argument-hint: "[task-id]"
disable-model-invocation: true
---

Work task: $ARGUMENTS (if empty, use the ID in `.harness/active-task`).

## 0. Preconditions — stop if any fails
- `tasks/<ID>-*.yaml` exists and its `status` is `approved` or `in_progress`. If it is `draft`, stop
  and ask the human to approve it (or run `/contract`). In autopilot, approve it per
  `.claude/skills/autopilot/SKILL.md` §A instead, and never stop to ask: queue in `.harness/approvals.md`.
- Every task in `depends_on` is `done` (or `parked`) in `.harness/progress.md`.
- Write the ID to `.harness/active-task`, set status `in_progress` in the contract and progress, and
  note the starting commit (`git rev-parse HEAD`) — the verifier needs it as the diff base.

## 1. Plan (short, in chat)
Read only the contract's `context` docs and the files in `scope`. If the contract has a `ui:` block,
also read `docs/ui/README.md` and the specs it names. List the steps, the files each step
touches, and which acceptance line each step serves. If the plan needs anything outside `scope` or
anything in `approval_required`, stop and ask now — not halfway through.

## 2. Implement in small, green steps
For each step: change the code → `node scripts/verify.mjs` → commit when green
(`feat(<area>): <what>`, conventional commits). Keep migrations additive. Regenerate types after
schema changes. Write the tests that the acceptance lines name, as you go.

On failure, classify before acting (CLAUDE.md recovery table). Each retry must change something
relevant. Count attempts per failure; at 3 with no new information, stop and mark the task `blocked`.

## 3. Prove it
1. If the task changed UI, add its routes and states (from the contract's `ui:` block) to
   `tests/e2e/ui-routes.ts` so the screenshot and axe suite covers them.
2. `node scripts/verify.mjs --full` must pass on the final tree. Capture any other artifacts the
   contract asks for in `.harness/evidence/<ID>/`.
3. If the task changed UI: delegate to the `ui-reviewer` subagent with the task ID and starting commit.
   On REJECT, fix its findings (each fix is an attempt), re-run `verify --full`, and ask again.
4. Set status `verifying`. Delegate to the `verifier` subagent with: the task ID, the starting commit,
   and nothing else — let it gather its own evidence.
5. If it returns REJECT: fix only the findings it lists (each fix is an attempt), re-run
   `verify --full`, and ask the verifier again. Two rejections on the same finding → stop, `blocked`.

## 4. Close
- Run `/receipt <ID>`.
- Status `done` only if: `--full` passed on the current fingerprint, the verifier said ACCEPT (and the
  ui-reviewer, for UI tasks), and the receipt is written. `parked` if everything local is proven and only
  lines marked `(human)` remain (each one in `.harness/approvals.md`). Otherwise `blocked`, with what was
  tried and what is needed from the human.
- Update `.harness/progress.md` (status, attempts, receipt link), and add to `facts.md`,
  `decisions.md` and `lessons.md` whatever this task taught. Commit (`chore(harness): close <ID>`).
- If anything went wrong along the way (a block, a rejection, a human correction), run
  `/harness-upgrade` before picking the next task.
- Report to the human in three lines: outcome, receipt path, anything awaiting their approval.
