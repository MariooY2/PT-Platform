# Harness specification

This is the environment Claude Code works inside while building PT Platform. The model supplies the
reasoning; this harness supplies the contract, the context, the boundaries, the memory, the evidence
and the recovery rules. It follows the eight-field harness spec: if a field below is empty, the agent
is improvising, not working autonomously.

Read this file when you are changing the harness. Claude Code reads it only for `/harness-upgrade`.

---

## 1. Contract

| Field | Where it lives |
| --- | --- |
| Objective, scope, constraints, acceptance evidence, approval-required actions, budget | One YAML file per task in `tasks/`, from `tasks/_template.yaml` |
| Which task is active | `.harness/active-task` (one task ID) |
| What comes next | `tasks/backlog.md` |

Rules:

- A contract starts as `draft`. Only the human approves it; Claude then sets `status: approved`.
- Every acceptance line names its evidence: a command, a test, an artifact path or the verifier.
  "Works well" is not acceptance.
- Once approved and committed, a contract changes only with the human's say-so (the path guard asks).
- Phase 0 contracts are written in full. Later contracts are drafted just in time with `/contract`,
  so they reflect what the codebase actually looks like by then.

## 2. Context

| Layer | Contents | Loaded |
| --- | --- | --- |
| Always | `CLAUDE.md`: loop, project map, hard rules, recovery table | Every session |
| Path-scoped | `.claude/rules/ui.md`: UI rules and the UI evidence step | When Claude opens a file under `src/app`, `src/components` or feature components |
| Session state | Active contract, progress, recent lessons, last verify result | `SessionStart` hook, on startup, resume, `/clear` and after compaction |
| On demand | `docs/*.md`, split by §, and `docs/ui/` (design system, patterns, copy, screen specs) | When the contract's `context` or `ui:` block names them |
| Exact files | Source files, migrations, tests | When the step needs them |

Freshness rules: `docs/commands.md` is updated in the same commit as `package.json`;
`.harness/facts.md` entries are deleted when they stop being true; the SessionStart summary is
rebuilt from files every time, never carried over from the transcript.

## 3. Tools

Claude Code's built-in tools, narrowed by policy:

| Tool | Preconditions | Side effects | Evidence | Timeout / retry |
| --- | --- | --- | --- | --- |
| Read / Grep / Glob | Path not in `.env*` (deny rule) | None | File content | — |
| Edit / Write | Path passes `guard-paths.mjs` (not a secret, not generated, not a committed migration) | File change, auto-formatted by `post-edit.mjs` | Diff; trace line | — |
| Bash | Command passes deny/ask rules and `guard-bash.mjs` | Varies | Exit code + output; trace line | Default tool timeout; retry once on timeout |
| `scripts/verify.mjs` | `package.json` exists | Writes `.harness/last-verify.json` | Per-step pass/fail with output tails and a tree fingerprint | Per-step timeout 10 min |
| `ui-reviewer` subagent | UI task; screenshots exist | None (reads screenshots and code) | `VERDICT` + findings per route/state | One run per attempt |
| `verifier` subagent | Contract and diff exist | None (read and run tests only) | `VERDICT` + findings with file:line | One run per attempt |

## 4. State

| Kind | File | Written when |
| --- | --- | --- |
| Facts | `.harness/facts.md` | Something true about the environment is discovered (a command quirk, a version) |
| Decisions | `.harness/decisions.md` | A choice is made, with the reason and who made it |
| Progress | `.harness/progress.md` | A task changes status |
| Lessons | `.harness/lessons.md` | A failure should change future behaviour (via `/harness-upgrade`) |
| Checkpoint | A git commit per completed step, plus the receipt | After each green step |
| Evidence | `.harness/last-verify.json`, `.harness/evidence/<ID>/` | Every verify run; screenshots and reports |
| Raw history | `.harness/trace.log` + Claude Code transcripts | Every tool call (hook) |

Raw history is kept for audit. Execution runs from compiled state, not from replaying the transcript.

## 5. Policy

| Risk class | Examples | Gate | Enforced by |
| --- | --- | --- | --- |
| Low risk | Read, search, `git status/diff/log`, run checks | Automatic | `permissions.allow` |
| Reversible change | Edit source, run tests, local `supabase db reset`, commit | Automatic, traced | `permissions.allow`, `post-edit.mjs`, `trace.mjs` |
| External effect | `git push`, Vercel deploys, `supabase db push / link / secrets / functions deploy`, adding a dependency, editing contracts or harness files | Ask the human | `permissions.ask`, `guard-bash.mjs`, `guard-paths.mjs` |
| Irreversible or sensitive | Reading `.env`, force push, remote DB reset, `rm -rf` outside build folders, `curl … \| sh`, publishing packages, `--no-verify` | Blocked | `permissions.deny`, `guard-bash.mjs`, `guard-paths.mjs` |

Budget limits: 3 attempts per failure class per task; the contract's `budget` caps files changed;
the Stop gate re-runs checks at most once per stop (it yields when `stop_hook_active` is set).

Guard hooks use `onFailure: "block"`, so a broken guard fails closed rather than letting everything through.

## 6. Verification

Cheapest deterministic checks first, a model only where judgement is needed:

1. `check-architecture.mjs`: secrets in client code, RLS enabled for every created table, design
   tokens only (no raw/palette colors, no off-scale text sizes), no `.only` in tests
2. `format:check` → `lint` → `typecheck` → `test` (fast mode, also run by the Stop gate)
3. `test:rls` → `build` → `test:e2e` (`--full`); for UI routes listed in `tests/e2e/ui-routes.ts`,
   the e2e suite saves screenshots (360/1280 px, light/dark) and runs an axe scan
4. `ui-reviewer` subagent (UI tasks): reads every screenshot against `docs/ui/checklist.md` and the screen spec
5. `verifier` subagent: fresh context, the contract, the diff and the verify report; tries to reject
6. The human reads the receipt and approves anything in `approval_required`

Acceptance rule: every contract acceptance line has evidence, `--full` is green on the current tree
fingerprint, the verifier says ACCEPT. The receipt's NOT VERIFIED section is never empty by omission:
if everything was verified, it says so explicitly.

## 7. Recovery

| Failure class | Action | Limit |
| --- | --- | --- |
| Timeout | Retry with a longer timeout | 1 retry |
| Invalid arguments | Repair the call | 2 |
| Missing context | Read the named source | — |
| Failing check | Reproduce narrowly, fix the cause | 3 per distinct failure |
| Policy block | Stop and ask | 0 retries |
| Contradictory requirements | Escalate to the human | 0 |
| Repeated unchanged failure | Stop the loop, mark `blocked` | — |

Safe rollback: every green step is a commit, so `git restore` / `git revert` returns to the last good
state. Local data rolls back with `supabase db reset`. Nothing remote changes without approval.

## 8. Observability

- **Trace:** `.harness/trace.log`, one line per tool call, failure, verify run and stop-gate decision.
- **Metrics** (counted from receipts and progress at each phase review): first-pass acceptance rate,
  verifier rejections per task, Stop-gate blocks per task, human interventions per task, unsupported
  claims found in review, time from approval to done.
- **Change receipt:** `.harness/receipts/<ID>.md`, from `.harness/receipt-template.md`.

---

## 9. Autopilot and parallel builders (D-006, D-007)

One prompt (`/goal Run /autopilot until … COMPLETE or NEEDS-HUMAN`, in auto mode) works the whole backlog.

| Piece | What it does |
| --- | --- |
| `scripts/autopilot.mjs on/off/status` + `scripts/lib/autopilot.mjs` | Computes the next task, the ready-in-parallel set, and COMPLETE / NEEDS-HUMAN / WAITING from files only (backlog, progress, contracts, approvals, last verify) |
| Stop hook (`stop-gate.mjs`) | While autopilot is on, sends every early stop back with the next step; lets go on COMPLETE, NEEDS-HUMAN, WAITING for builders, or after 3 stops without progress (loop breaker). Claude Code's own cap is 8 consecutive blocks without a tool call |
| `/goal` (built into Claude Code) | A small model checks the condition after each turn; retries transient errors and resumes after usage limits |
| Auto mode | Removes per-tool prompts; its classifier still blocks risky actions. `ask` rules still prompt even in auto mode, so in autopilot the guards turn every ask into "deny + queue in approvals.md" so nothing stalls |
| `.harness/autopilot.json` | The human's pre-approval: phases, max builders, pre-approved packages, what stays human-only. Claude can't edit it |
| `builder` agent (`isolation: worktree`) | App-code lane of one task in `.claude/worktrees/<name>`, fast verify only. Hooks block builders from the database, e2e, dev servers, `.harness/`, merging and pushing |
| Orchestrator (main session) | Contracts + self-check, schema lane, merges, `verify --full`, parallel `ui-reviewer` + `verifier`, receipts, approvals |
| `worktree.baseRef: "head"` | Builders branch from the orchestrator's current commit (with the schema already in it), not from the remote |

Why a serial schema lane: there is one local Supabase stack and one set of ports. Builders that reset the
database or start servers in parallel would corrupt each other's evidence.

## Instruction ladder

Rules move down this ladder as far as is practical. The prompt explains judgement; the harness
enforces invariants.

| Rule | Explanation | Automated check | Enforced policy |
| --- | --- | --- | --- |
| Use the formatter | CLAUDE.md | `format:check` | `post-edit.mjs` formats every edit |
| Secrets stay server-side | CLAUDE.md | `check-architecture.mjs` | `.env*` read deny + `guard-bash.mjs` |
| RLS on every table | docs/security.md | `check-architecture.mjs` + `test:rls` | Verifier rubric |
| Don't edit generated types or committed migrations | CLAUDE.md | — | `guard-paths.mjs` |
| Design tokens only | docs/ui/design-system.md, `.claude/rules/ui.md` | `check-architecture.mjs` (ui-raw-color, ui-type-scale) | Token edits in `globals.css` ask the human |
| Accessible, readable UI | docs/ui/patterns.md | axe in `test:e2e`, token contrast unit test | ui-reviewer rubric |
| Screens match their spec | docs/ui/screens/ | Screenshot suite | ui-reviewer, `/work` step |
| Don't weaken checks or contracts | CLAUDE.md | — | `guard-paths.mjs` asks |
| Never claim unrun checks passed | CLAUDE.md | `last-verify.json` fingerprint | Stop gate + verifier |
| No deploy or remote DB change without approval | CLAUDE.md | — | `permissions.ask` + `guard-bash.mjs` |

## Keeping the harness small

The harness decays like any code. At the end of every phase, run `/harness-upgrade review`. For each
hook, check, rule and skill it asks: which failure does this prevent, how often did that failure
happen this phase, what does it cost in time, and what happens if we delete it? Remove what no longer
earns its place. Add only what an observed failure justifies.

Turn the Stop gate off for one machine with `"env": { "HARNESS_STOP_GATE": "0" }` in
`.claude/settings.local.json` (for example while doing pure docs work).
