---
name: verify
description: Run the project's deterministic checks and report them from recorded evidence. Use before every commit, after any code change you want to confirm, and with "full" before claiming a task is done.
argument-hint: "[full]"
---

This project's checks are scripted; run them, never estimate them. This skill replaces the bundled
`/verify` for this project.

Mode: $ARGUMENTS (empty = fast)

1. Run `node scripts/verify.mjs` (fast) — or `node scripts/verify.mjs --full` when the argument is
   `full` or you are about to claim a task is done.
2. Read `.harness/last-verify.json`. Report from it, not from memory: result, mode, fingerprint, and
   for any failing step its name and the relevant lines of its output.
3. If a step is `missing`, the package.json script does not exist yet — say so; do not count it as passing.
4. If it failed, classify the failure (CLAUDE.md recovery table) and fix the cause before committing.
   Never commit on a red fast check.
5. With `full` at the end of a task, delegate to the `verifier` subagent next (task ID + starting
   commit), then `/receipt`.

Never write that a check passed unless it appears as `pass` in `.harness/last-verify.json` with a
fingerprint that matches the current code.
