// SessionStart: compile durable state into a short briefing. Runs on startup, resume, /clear and
// after compaction, so the agent always works from files on disk rather than a fading transcript.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fingerprint } from '../../scripts/lib/fingerprint.mjs';
import { projectDir, readInput, trace } from './lib.mjs';
import { autopilotOn, computeStatus, formatStatus } from '../../scripts/lib/autopilot.mjs';

const input = await readInput();
const read = (rel) => { try { return readFileSync(join(projectDir, rel), 'utf8'); } catch { return ''; } };
const out = [];

const activeId = read('.harness/active-task').trim();
let contractFile = '';
if (activeId && existsSync(join(projectDir, 'tasks'))) {
  contractFile = readdirSync(join(projectDir, 'tasks')).find((f) => f.startsWith(`${activeId}-`) && /\.ya?ml$/.test(f)) ?? '';
}
const contract = contractFile ? read(`tasks/${contractFile}`) : '';
const field = (name) => {
  const m = contract.match(new RegExp(`^${name}:\\s*(>[-+]?\\s*\\n((?:[ \\t]+.*\\n?)+)|(.*))$`, 'm'));
  if (!m) return '';
  return (m[2] ? m[2].replace(/\s+/g, ' ') : m[3] ?? '').trim();
};
const listUnder = (name) => {
  const m = contract.match(new RegExp(`^${name}:\\s*\\n((?:[ \\t]+.*\\n?)+)`, 'm'));
  return m ? m[1].split('\n').map((l) => l.trim()).filter((l) => l.startsWith('- ')).map((l) => l.slice(2).replace(/\s+#.*$/, '')) : [];
};

out.push('## Harness briefing (compiled from files by .claude/hooks/session-start.mjs)');
const auto = autopilotOn(projectDir);
if (auto) {
  out.push('AUTOPILOT IS ON: keep working through the backlog per .claude/skills/autopilot/SKILL.md. Do not wait for the human;',
    'queue anything that needs them in .harness/approvals.md. Re-read the state below rather than relying on memory.');
  try { out.push(formatStatus(computeStatus(projectDir))); } catch (e) { out.push(`Autopilot status failed: ${e.message}`); }
}
if (!activeId) out.push('No active task. Pick the next one from tasks/backlog.md and draft its contract with /contract.');
else if (!contract) out.push(`Active task ${activeId} has no contract file in tasks/. Draft it with /contract ${activeId}.`);
else {
  const status = field('status') || 'unknown';
  out.push(`Active task: ${activeId} — ${field('title')} (status: ${status})`);
  out.push(`Contract: tasks/${contractFile}`);
  out.push(`Objective: ${field('objective')}`);
  const claims = [...contract.matchAll(/^\s*- id:\s*(\S+)\s*\n\s*claim:\s*(.+)$/gm)].map((m) => `  ${m[1]}: ${m[2].trim()}`);
  if (claims.length) out.push('Acceptance:', ...claims);
  const appr = listUnder('approval_required');
  if (appr.length) out.push(`Ask the human before: ${appr.join('; ')}`);
  if (status === 'draft') out.push(auto
    ? 'Next: the contract is a draft. Run the autopilot self-check, approve it under D-006, then build it.'
    : 'Next: the contract is a draft. Show it to the human and wait for approval before changing code.');
  else if (status === 'approved' || status === 'in_progress') out.push(`Next: continue the loop for ${activeId} (/work ${activeId}).`);
  else if (status === 'verifying') out.push('Next: finish verification (verify --full, verifier subagent), then /receipt.');
  else if (status === 'blocked') out.push(auto
    ? 'Next: this task is blocked. Make sure its approvals.md entry exists, then move to the next unblocked task.'
    : 'Next: this task is blocked. Read its receipt or progress notes and ask the human what changed.');
  else if (status === 'done') out.push('Next: this task is done. Pick the next task from tasks/backlog.md.');
}

try {
  const lv = JSON.parse(read('.harness/last-verify.json') || 'null');
  if (lv) {
    const current = lv.fingerprint === fingerprint(projectDir) ? 'matches the current code' : 'is STALE (code changed since)';
    const bad = (lv.steps ?? []).filter((s) => s.status !== 'pass' && s.status !== 'skipped').map((s) => `${s.name}:${s.status}`);
    out.push(`Last verify: ${lv.result} (${lv.mode}, ${lv.timestamp}) — ${current}${bad.length ? `; failing: ${bad.join(', ')}` : ''}`);
  } else out.push('Last verify: never run.');
} catch { out.push('Last verify: unreadable .harness/last-verify.json.'); }

const open = read('.harness/progress.md').split('\n')
  .filter((l) => /^\|\s*P\d/.test(l) && !/\|\s*done\s*\|/.test(l)).slice(0, 8);
if (open.length) out.push('Open tasks (from .harness/progress.md):', ...open.map((l) => `  ${l.trim()}`));

const lessons = [...read('.harness/lessons.md').matchAll(/^## (L-\d+.*)$/gm)].slice(0, 5).map((m) => `  ${m[1]}`);
if (lessons.length) out.push('Recent lessons:', ...lessons);

out.push(auto
  ? 'Rules: no code change without an approved contract (autopilot approves under D-006 after its self-check); evidence comes from .harness/last-verify.json, never memory.'
  : 'Rules: no code change without an approved contract; evidence comes from .harness/last-verify.json, never memory.');
process.stdout.write(out.join('\n').slice(0, 8000) + '\n');
trace(`session-start source=${input.source ?? '?'} active=${activeId || '-'}`);
process.exit(0);
