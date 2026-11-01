// Autopilot state and backlog status, computed from files on disk only (backlog, progress, contracts,
// approvals, last verify). Shared by scripts/autopilot.mjs, the Stop gate, the session briefing and the
// guards, so every part of the harness agrees on "what's next" and "are we done".
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fingerprint } from './fingerprint.mjs';

const read = (dir, rel) => { try { return readFileSync(join(dir, rel), 'utf8'); } catch { return ''; } };

export const DONE = new Set(['done', 'parked']);
const RANK = { none: 0, draft: 1, approved: 2, building: 3, in_progress: 4, verifying: 5, blocked: 6, parked: 7, done: 8 };

export function loadPolicy(dir) {
  try { return JSON.parse(read(dir, '.harness/autopilot.json') || '{}'); } catch { return {}; }
}

export function loadState(dir) {
  try { return { enabled: false, idle: 0, ...JSON.parse(read(dir, '.harness/autopilot-state.json') || '{}') }; }
  catch { return { enabled: false, idle: 0 }; }
}

export function saveState(dir, state) {
  mkdirSync(join(dir, '.harness'), { recursive: true });
  writeFileSync(join(dir, '.harness/autopilot-state.json'), JSON.stringify(state, null, 2) + '\n');
}

export const autopilotOn = (dir) => loadState(dir).enabled === true;

// Package name matches the policy list ("@radix-ui/*" style prefixes allowed).
export function isPreapproved(dir, name) {
  const list = loadPolicy(dir).preapproved_dependencies ?? [];
  return list.some((p) => (p.endsWith('/*') ? name.startsWith(p.slice(0, -1)) : name === p));
}

export function contractFile(dir, id) {
  try {
    const f = readdirSync(join(dir, 'tasks')).find((x) => x.startsWith(`${id}-`) && /\.ya?ml$/.test(x));
    return f ? `tasks/${f}` : '';
  } catch { return ''; }
}

export function activeScopeIncludes(dir, path) {
  const id = read(dir, '.harness/active-task').trim();
  const f = id && contractFile(dir, id);
  if (!f) return false;
  const m = read(dir, f).match(/^scope:\s*\n((?:[ \t]+.*\n?)+)/m);
  return !!m && m[1].includes(path.split('/').slice(0, 2).join('/'));
}

export function backlog(dir) {
  const rows = [];
  for (const line of read(dir, 'tasks/backlog.md').split('\n')) {
    const m = line.match(/^\|\s*(P(\d+)-\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$/);
    if (m) rows.push({ id: m[1], phase: Number(m[2]), title: m[3], ui: m[4], depsRaw: m[5] });
  }
  return rows;
}

function progressStatuses(dir) {
  const map = {};
  for (const line of read(dir, '.harness/progress.md').split('\n')) {
    const m = line.match(/^\|\s*(P\d+-\d+)\s*\|[^|]*\|\s*([a-z_]+)\s*\|/);
    if (m) map[m[1]] = m[2];
  }
  return map;
}

function openApprovals(dir) {
  const text = read(dir, '.harness/approvals.md');
  const open = text.split(/^## /m).find((s) => s.startsWith('Open')) ?? '';
  return open.split('\n').filter((l) => /^\s*- \[ \]/.test(l)).map((l) => l.replace(/^\s*- \[ \]\s*/, '').trim());
}

export function computeStatus(dir) {
  const policy = loadPolicy(dir);
  const phases = new Set(policy.phases ?? [0, 1, 2, 3]);
  const all = backlog(dir);
  const prog = progressStatuses(dir);
  const statusOf = (id) => {
    const f = contractFile(dir, id);
    const c = f ? (read(dir, f).match(/^status:\s*([a-z_]+)/m)?.[1] ?? 'draft') : 'none';
    const p = prog[id] ?? 'none';
    if (p === 'blocked' && c !== 'done' && c !== 'parked') return 'blocked';
    return (RANK[p] ?? 0) >= (RANK[c] ?? 0) ? p : c;
  };
  const deps = (t) => t.depsRaw.split(/[,\s]+/).flatMap((d) => {
    if (/^P\d+$/.test(d)) return all.filter((x) => x.phase === Number(d.slice(1))).map((x) => x.id);
    return /^P\d+-\d+$/.test(d) ? [d] : [];
  });
  const tasks = all.filter((t) => phases.has(t.phase)).map((t) => ({ ...t, status: statusOf(t.id), deps: deps(t) }));
  const remaining = tasks.filter((t) => !DONE.has(t.status));
  const building = remaining.filter((t) => t.status === 'building');
  const blocked = remaining.filter((t) => t.status === 'blocked');
  const ready = remaining
    .filter((t) => !['blocked', 'building'].includes(t.status) && t.deps.every((d) => DONE.has(statusOf(d))))
    .sort((a, b) => Number(['approved', 'in_progress', 'verifying'].includes(b.status)) - Number(['approved', 'in_progress', 'verifying'].includes(a.status)));
  const approvals = openApprovals(dir);
  const base = { total: tasks.length, done: tasks.length - remaining.length, building, blocked, ready, approvals, parked: tasks.filter((t) => t.status === 'parked') };

  if (!tasks.length) return { ...base, state: 'NEEDS-HUMAN', action: 'tasks/backlog.md has no tasks in the autopilot phases.' };
  if (!remaining.length) {
    let lv = null; try { lv = JSON.parse(read(dir, '.harness/last-verify.json') || 'null'); } catch {}
    const green = lv && lv.mode === 'full' && lv.result === 'pass' && lv.fingerprint === fingerprint(dir);
    return green
      ? { ...base, state: 'COMPLETE', action: 'Every task is done or parked and verify --full is green on the current code. Write the final report.' }
      : { ...base, state: 'CONTINUE', action: 'All tasks are closed. Run `node scripts/verify.mjs --full` on the final tree and fix anything red.' };
  }
  if (!ready.length && building.length) return { ...base, state: 'WAITING', action: `Builders are running (${building.map((t) => t.id).join(', ')}). Merge and verify each one as it reports back.` };
  if (!ready.length) return { ...base, state: 'NEEDS-HUMAN', action: 'Every remaining task is blocked or waits on a blocked task. See .harness/approvals.md.' };

  const next = ready[0];
  const action = {
    none: `Draft the contract for ${next.id}, run the autopilot self-check, approve it under D-006.`,
    draft: `Run the autopilot self-check on the ${next.id} contract and approve it under D-006.`,
    approved: `Build ${next.id} (yourself, or as part of a builder wave).`,
    in_progress: `Continue building ${next.id}.`,
    verifying: `Finish verifying ${next.id}: verify --full, ui-reviewer if UI, verifier, receipt.`,
  }[next.status] ?? `Continue ${next.id}.`;
  return { ...base, state: 'CONTINUE', next, action };
}

export function formatStatus(s) {
  const lines = [`AUTOPILOT: ${s.state}`];
  if (s.next) lines.push(`Next: ${s.next.id} — ${s.next.title} (status: ${s.next.status})`);
  lines.push(`Do: ${s.action}`);
  if (s.ready.length > 1) lines.push(`Ready now (wave candidates, in order): ${s.ready.slice(0, 8).map((t) => `${t.id}[${t.status}]`).join(', ')}`);
  if (s.building.length) lines.push(`With builders: ${s.building.map((t) => t.id).join(', ')}`);
  if (s.blocked.length) lines.push(`Blocked: ${s.blocked.map((t) => t.id).join(', ')}`);
  lines.push(`Progress: ${s.done}/${s.total} done or parked · ${s.approvals.length} item(s) waiting on the human in .harness/approvals.md`);
  return lines.join('\n');
}

// Changes whenever real work happens: code, commits, task state, receipts, approvals.
export function progressKey(dir) {
  const h = createHash('sha1');
  for (const f of ['.harness/progress.md', '.harness/approvals.md']) h.update(read(dir, f));
  try { h.update(readdirSync(join(dir, '.harness/receipts')).join(',')); } catch {}
  try { for (const f of readdirSync(join(dir, 'tasks'))) if (/\.ya?ml$/.test(f)) h.update(read(dir, `tasks/${f}`).match(/^status:.*$/m)?.[0] ?? ''); } catch {}
  h.update(fingerprint(dir));
  h.update(spawnSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).stdout ?? '');
  return h.digest('hex');
}

export const hasAutopilotPolicy = (dir) => existsSync(join(dir, '.harness/autopilot.json'));
