// Shared helpers for the harness hooks. Node only, so hooks run on Windows without bash or jq.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export async function readInput() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const text = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(text || '{}'); } catch { return {}; }
}

export const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());

// Absolute or relative path -> forward-slash path relative to the project, or null if outside it.
export function toProjectPath(p) {
  if (!p) return null;
  const abs = isAbsolute(p) ? p : resolve(projectDir, p);
  const r = relative(projectDir, abs);
  if (r.startsWith('..') || isAbsolute(r)) return null;
  return r.split(sep).join('/');
}

export function isTracked(projectPath, cwd = projectDir) {
  const res = spawnSync('git', ['ls-files', '--error-unmatch', '--', projectPath], { cwd, encoding: 'utf8' });
  return res.status === 0;
}

export function trace(line) {
  try {
    const dir = join(projectDir, '.harness');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'trace.log');
    if (existsSync(file) && statSync(file).size > 5 * 1024 * 1024) renameSync(file, `${file}.1`);
    appendFileSync(file, `${new Date().toISOString()}  ${line.replace(/\s+/g, ' ').slice(0, 400)}\n`);
  } catch {}
}

export function decide(decision, reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason },
  }));
  process.exit(0);
}
