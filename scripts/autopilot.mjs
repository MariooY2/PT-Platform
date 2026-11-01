#!/usr/bin/env node
// Autopilot switch and status.
//   node scripts/autopilot.mjs on      turn autopilot on (the Stop hook then keeps the session working)
//   node scripts/autopilot.mjs off     turn it off
//   node scripts/autopilot.mjs status  what's next, what's ready in parallel, what waits on the human
// The last line of `status` is the machine-readable state: AUTOPILOT: CONTINUE | WAITING | NEEDS-HUMAN | COMPLETE.
import { resolve } from 'node:path';
import { computeStatus, formatStatus, hasAutopilotPolicy, loadState, saveState } from './lib/autopilot.mjs';

const dir = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
const cmd = process.argv[2] ?? 'status';

if (!hasAutopilotPolicy(dir)) {
  console.error('No .harness/autopilot.json policy. The human must add it before autopilot can run.');
  process.exit(1);
}

const state = loadState(dir);
if (cmd === 'on') {
  saveState(dir, { ...state, enabled: true, started_at: new Date().toISOString(), idle: 0, last_key: null });
  console.log('Autopilot is ON. Work the backlog per .claude/skills/autopilot/SKILL.md; the Stop hook keeps the session going.');
} else if (cmd === 'off') {
  saveState(dir, { ...state, enabled: false, stopped_at: new Date().toISOString() });
  console.log('Autopilot is OFF.');
} else if (cmd !== 'status') {
  console.error('Usage: node scripts/autopilot.mjs on|off|status');
  process.exit(2);
}

const s = computeStatus(dir);
const text = formatStatus(s);
const [first, ...rest] = text.split('\n');
console.log(`Autopilot is ${loadState(dir).enabled ? 'ON' : 'OFF'}.`);
console.log(rest.join('\n'));
if (s.approvals.length) console.log('Waiting on the human:\n' + s.approvals.map((a) => `  - ${a}`).join('\n'));
console.log(first);
