---
name: harness-upgrade
description: Turn a failure, a human correction or a blocked task into a lasting harness change; with "review", audit the harness for parts that no longer earn their place.
argument-hint: "[what went wrong | review]"
---

The weakest fix corrects one output. This one changes the system so the failure cannot recur quietly.

Input: $ARGUMENTS

## Mode A — after a failure or correction

1. **Reconstruct what happened** from evidence: `.harness/trace.log` (tail the relevant window),
   `.harness/last-verify.json`, the receipt or progress notes, `git log`. State the observable failure
   in one sentence.
2. **Diagnose the failure class** — pick one:
   contract was ambiguous · important context was invisible · wrong tool exposed or misused ·
   a precondition was missing · the result was unverifiable · policy lived only in the prompt ·
   recovery was too broad · the trace was insufficient.
3. **Propose the smallest durable change**, as far down the ladder as practical:
   explanation (CLAUDE.md / docs) → checklist (skill step) → template (task template field) →
   automated check (`scripts/check-architecture.mjs`, a test) → enforced policy (hook or permission rule).
   Prefer a deterministic check over another instruction. Name the exact file and rule.
4. **Record the lesson** in `.harness/lessons.md` (format at the top of that file), including the
   harness change or "proposed, awaiting approval".
5. **Ask before changing harness files.** Edits to `scripts/`, `.claude/`, CI, `CLAUDE.md` and
   `docs/HARNESS.md` go through the human (the path guard asks). After approval, make the change,
   prove the new check catches the original failure, and commit (`chore(harness): <rule>`).

## Mode B — `review` (end of each phase)

For every hook, check, permission rule, skill section and CLAUDE.md rule, answer:
which failure does it prevent? How often did that failure happen this phase (count from
`.harness/trace.log` and receipts)? What does it cost in time or friction? Can the same result be
achieved more simply now? What happens if we delete it?

Also report the phase metrics: first-pass acceptance rate, verifier rejections per task, Stop-gate
blocks per task, human interventions per task, unsupported claims caught, time from approval to done.

Output a table of keep / simplify / delete recommendations with evidence, and apply only what the
human approves. The best harness is the smallest one that reliably closes the gap between intent and evidence.
