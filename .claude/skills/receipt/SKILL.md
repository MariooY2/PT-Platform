---
name: receipt
description: Write the change receipt for a task from recorded evidence — what changed, what is proven, what is not, and what still needs the human.
argument-hint: "[task-id]"
---

Write `.harness/receipts/<ID>.md` for task $ARGUMENTS (default: `.harness/active-task`), using
`.harness/receipt-template.md`.

The receipt is a summary of what the system can prove, not of what was said in the session.

1. **Gather evidence, don't recall it.**
   - Contract: `tasks/<ID>-*.yaml`.
   - Commits: `git log --oneline <start>..HEAD` and `git diff --stat <start>..HEAD`.
   - Checks: `.harness/last-verify.json` — mode must be `full`, result `pass`, and its fingerprint must
     match the current code (run `node scripts/verify.mjs --full` again if unsure).
   - Verifier: its latest report in this session (verdict, acceptance table, findings).
   - Artifacts: `.harness/evidence/<ID>/`.
2. **Fill every section.**
   - **Verified**: one row per acceptance line, each citing its evidence (step name, test name,
     artifact path, or "verifier"). A line without evidence moves to Not verified.
   - **Not verified**: never left blank. List what could not be checked locally (real Whish sandbox,
     production config, a device you could not run). If truly everything was checked, write that.
   - **Decisions**: link `.harness/decisions.md` entries made during the task.
   - **Risks** and **Approval needed** (push, deploy, remote migration, new dependency).
3. **Consistency check.** If the receipt says `done` but any acceptance line lacks evidence, the
   verifier did not ACCEPT, or the verify run is stale — change the status to `blocked` and say why.
4. Link the receipt from `.harness/progress.md`. Commit with the task's closing commit.
