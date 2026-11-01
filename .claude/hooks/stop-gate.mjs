// Stop gate.
// 1. Checks: when code changed since the last green verify, run the fast checks before Claude ends its
//    turn. Red checks send Claude back once with the failure (a second stop is allowed — no loops).
// 2. Autopilot (node scripts/autopilot.mjs on): while the backlog is unfinished, every stop is sent back
//    with the next step, so one prompt builds the whole product. It lets Claude stop only when the work is
//    COMPLETE, NEEDS-HUMAN, WAITING on background builders, or when nothing changed for
//    max_idle_continuations stops in a row (the loop breaker).
// Disable per machine: "env": { "HARNESS_STOP_GATE": "0" } in .claude/settings.local.json.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fingerprint } from '../../scripts/lib/fingerprint.mjs';
import { computeStatus, formatStatus, loadPolicy, loadState, progressKey, saveState } from '../../scripts/lib/autopilot.mjs';
import { projectDir, readInput, trace } from './lib.mjs';

const input = await readInput();
if (process.env.HARNESS_STOP_GATE === '0') process.exit(0);

const out = (obj) => { process.stdout.write(JSON.stringify(obj)); process.exit(0); };

// ---- 1. Checks on changed code ----
let red = null; // { step, summary } when the fast checks fail on the current code
if (existsSync(join(projectDir, 'package.json'))) {
  const lastPath = join(projectDir, '.harness', 'last-verify.json');
  const readLast = () => { try { return JSON.parse(readFileSync(lastPath, 'utf8')); } catch { return null; } };
  const fp = fingerprint(projectDir);
  let last = readLast();
  if (!(last && last.fingerprint === fp && last.mode)) {
    const res = spawnSync(process.execPath, ['scripts/verify.mjs'], { cwd: projectDir, encoding: 'utf8', timeout: 14 * 60 * 1000 });
    last = readLast();
    if (!last || last.fingerprint !== fp) {
      trace(`stop-gate could-not-verify status=${res.status}`);
      last = null;
      red = { step: 'verify', summary: 'scripts/verify.mjs did not produce a result for the current code. Run it and read the output.' };
    }
  }
  if (last && !(last.result === 'pass' || last.result === 'no-project')) {
    const failing = (last.steps ?? []).find((s) => !['pass', 'skipped'].includes(s.status));
    red = { step: failing?.name ?? 'unknown step', summary: failing ? `${failing.name} ${failing.status}:\n${String(failing.output ?? '').slice(-2500)}` : 'see .harness/last-verify.json' };
  }
}

// ---- 2. Autopilot ----
const state = loadState(projectDir);
if (state.enabled) {
  const s = computeStatus(projectDir);
  if (s.state === 'COMPLETE') {
    saveState(projectDir, { ...state, enabled: false, completed_at: new Date().toISOString(), idle: 0 });
    trace('stop-gate autopilot COMPLETE');
    out({ systemMessage: `Autopilot: COMPLETE — ${s.done}/${s.total} tasks done or parked. ${s.approvals.length} item(s) wait on you in .harness/approvals.md.` });
  }
  if (s.state === 'NEEDS-HUMAN' && !red) {
    trace('stop-gate autopilot NEEDS-HUMAN');
    out({ systemMessage: `Autopilot paused: everything left needs you. See .harness/approvals.md, then run /autopilot again.` });
  }
  if (s.state === 'WAITING' && !red) {
    trace('stop-gate autopilot WAITING');
    process.exit(0); // background builders will report back and start the next turn
  }
  const key = progressKey(projectDir);
  const idle = state.last_key === key ? (state.idle ?? 0) + 1 : 0;
  const maxIdle = loadPolicy(projectDir).max_idle_continuations ?? 3;
  if (idle >= maxIdle) {
    saveState(projectDir, { ...state, idle: 0, last_key: key });
    trace(`stop-gate autopilot IDLE-BREAK idle=${idle}`);
    out({ systemMessage: `Autopilot paused: no progress after ${idle} continuations (next was ${s.next?.id ?? '—'}). Read the last message, then type "continue" or run /autopilot to resume.` });
  }
  saveState(projectDir, { ...state, idle, last_key: key });
  trace(`stop-gate autopilot CONTINUE next=${s.next?.id ?? '-'} idle=${idle}${red ? ` red=${red.step}` : ''}`);
  out({
    decision: 'block',
    reason: (red ? `First fix the failing checks (node scripts/verify.mjs):\n${red.summary}\n\n` : '')
      + `Autopilot is on and the product is not finished — keep working, do not wait for the human.\n${formatStatus(s)}\n\n`
      + 'Follow .claude/skills/autopilot/SKILL.md. Anything that needs the human goes into .harness/approvals.md; then move on '
      + 'to the next unblocked task. If you are truly stuck on this task, mark it blocked in .harness/progress.md with what you tried.',
  });
}

// ---- Manual mode: checks only ----
if (!red) { trace('stop-gate pass'); process.exit(0); }
if (red.step === 'verify') out({ systemMessage: `Stop gate: ${red.summary}` });
if (input.stop_hook_active) {
  trace(`stop-gate yield-still-failing step=${red.step}`);
  out({ systemMessage: `Stop gate: checks are still failing (${red.step}). The task is not done — see .harness/last-verify.json.` });
}
trace(`stop-gate block step=${red.step}`);
out({
  decision: 'block',
  reason: `The fast checks fail on the code you just changed (node scripts/verify.mjs).\n${red.summary}\n\n`
    + 'Fix the cause and re-run the checks. If you cannot fix it now, end your turn by telling the human plainly that '
    + 'the checks are failing and the task is not done — you will be allowed to stop.',
});
