# Task contracts

Every piece of work starts as a contract: what must exist, what may change, what must not, what
evidence proves it is done, and what needs your approval.

## Lifecycle

1. **Draft.** `/contract P1-03` (or a plain description) makes Claude write `tasks/<ID>-<name>.yaml`
   with `status: draft`, then stop and show it to you.
2. **Approve.** Read it. Tighten anything vague. Say "approved". Claude sets `status: approved`,
   records who and when, and writes the ID to `.harness/active-task`.
3. **Work.** `/work P1-03` runs the loop: implement inside scope → checks → verifier → receipt.
4. **Done or blocked.** The task ends `done` with a receipt, or `blocked` with what was tried and what
   is needed from you. Status is tracked in `.harness/progress.md`.

## Writing good acceptance lines

| Weak | Strong |
| --- | --- |
| "Program builder works" | "e2e test `builds 4-week program with superset` passes in `--full`" |
| "Secure" | "RLS test: trainer B gets 0 rows from trainer A's programs" |
| "Looks good on mobile" | "Screenshots at 360 px in `.harness/evidence/P1-05/`, checked by the verifier" |

If a line cannot be checked by a command, a test, an artifact or the verifier, rewrite it until it can.

In **autopilot** (`/autopilot`), Claude approves the contracts it drafts after a strict self-check
(D-006), and the verifier re-checks that each one covers its spec. Status and approval fields can always
change; in autopilot a committed contract can gain lines but never lose or rewrite them.

Committed contracts can only change with your approval: the path guard asks you before Claude edits
any tracked file in `tasks/`.
