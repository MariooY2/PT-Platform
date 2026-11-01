// Content fingerprint of the code that checks care about. Docs, tasks and run state are excluded,
// so editing them never invalidates a green verify run. Used by verify.mjs and the Stop gate.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT_DIRS = ['src', 'app', 'supabase', 'tests', 'messages', 'scripts', 'public'];
const ROOT_FILE_PATTERNS = [
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
  /^tsconfig.*\.json$/,
  /^next\.config\.[cm]?[jt]s$/,
  /^middleware\.[jt]s$/,
  /^(eslint|prettier|vitest|playwright|postcss|tailwind)\.config\.[cm]?[jt]s$/,
  /^eslint\.config\.mjs$/,
  /^\.prettierrc.*$/,
  /^\.prettierignore$/,
  /^components\.json$/,
];
const SKIP_DIRS = new Set([
  'node_modules', '.next', 'dist', 'build', 'out', 'coverage', '.turbo',
  'playwright-report', 'test-results', '.temp', '.branches', '.git',
]);

function walk(dir, files) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, files);
    else if (e.isFile()) files.push(full);
  }
}

export function codeFiles(projectDir) {
  const files = [];
  for (const d of ROOT_DIRS) {
    const full = join(projectDir, d);
    if (existsSync(full) && statSync(full).isDirectory()) walk(full, files);
  }
  for (const name of readdirSync(projectDir)) {
    if (ROOT_FILE_PATTERNS.some((re) => re.test(name))) files.push(join(projectDir, name));
  }
  return files
    .map((f) => relative(projectDir, f).split(sep).join('/'))
    .sort();
}

export function fingerprint(projectDir) {
  const h = createHash('sha256');
  for (const rel of codeFiles(projectDir)) {
    h.update(rel);
    h.update('\0');
    try { h.update(readFileSync(join(projectDir, rel))); } catch { h.update('<unreadable>'); }
    h.update('\0');
  }
  return h.digest('hex').slice(0, 16);
}
