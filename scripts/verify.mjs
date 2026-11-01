#!/usr/bin/env node
// Deterministic check ladder, cheapest first. Writes evidence to .harness/last-verify.json.
//   node scripts/verify.mjs            fast: architecture, format, lint, typecheck, unit tests
//   node scripts/verify.mjs --full     fast + RLS tests, production build, e2e tests
//   --keep-going                       run every step even after a failure
// Exit code 0 = pass (or no project yet), 1 = fail.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprint } from './lib/fingerprint.mjs';

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const mode = args.has('--full') ? 'full' : 'fast';
const keepGoing = args.has('--keep-going');
const isWin = process.platform === 'win32';
const STEP_TIMEOUT_MS = 10 * 60 * 1000;
const TAIL = 4000;

const harnessDir = join(projectDir, '.harness');
mkdirSync(harnessDir, { recursive: true });
const outFile = join(harnessDir, 'last-verify.json');

function trace(line) {
  try { appendFileSync(join(harnessDir, 'trace.log'), `${new Date().toISOString()}  verify  ${line}\n`); } catch {}
}

function write(report) {
  writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n');
}

const pkgPath = join(projectDir, 'package.json');
const started = Date.now();

if (!existsSync(pkgPath)) {
  const report = {
    version: 1, timestamp: new Date().toISOString(), mode, result: 'no-project',
    fingerprint: fingerprint(projectDir), steps: [],
    note: 'No package.json yet. Task P0-01 creates the app and the scripts these checks run.',
  };
  write(report);
  trace(`${mode} no-project`);
  console.log('verify: no package.json yet — nothing to check (P0-01 creates it).');
  process.exit(0);
}

let scripts = {};
try { scripts = JSON.parse(readFileSync(pkgPath, 'utf8')).scripts ?? {}; } catch (e) {
  console.error(`verify: package.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

const fp = fingerprint(projectDir);
const steps = [
  { name: 'architecture', kind: 'node', cmd: ['scripts/check-architecture.mjs'] },
  { name: 'format:check', kind: 'pnpm' },
  { name: 'lint', kind: 'pnpm' },
  { name: 'typecheck', kind: 'pnpm' },
  { name: 'test', kind: 'pnpm' },
];
if (mode === 'full') {
  steps.push({ name: 'test:rls', kind: 'pnpm' }, { name: 'build', kind: 'pnpm' }, { name: 'test:e2e', kind: 'pnpm' });
}

const results = [];
let failed = false;

for (const step of steps) {
  if (failed && !keepGoing) {
    results.push({ name: step.name, status: 'skipped', reason: 'earlier step failed' });
    continue;
  }
  if (step.kind === 'pnpm' && !scripts[step.name]) {
    results.push({
      name: step.name, status: 'missing',
      output: `package.json has no "${step.name}" script. Add it (see docs/commands.md).`,
    });
    failed = true;
    continue;
  }
  const t0 = Date.now();
  const res = step.kind === 'node'
    ? spawnSync(process.execPath, step.cmd, { cwd: projectDir, encoding: 'utf8', timeout: STEP_TIMEOUT_MS })
    : spawnSync('pnpm', ['run', step.name], {
        cwd: projectDir, encoding: 'utf8', timeout: STEP_TIMEOUT_MS, shell: isWin,
        env: { ...process.env, CI: '1', FORCE_COLOR: '0' },
      });
  const output = `${res.stdout ?? ''}${res.stderr ?? ''}`;
  let status = res.status === 0 ? 'pass' : 'fail';
  if (res.error?.code === 'ETIMEDOUT') status = 'timeout';
  else if (res.error) status = 'error';
  const entry = { name: step.name, status, exitCode: res.status, durationMs: Date.now() - t0 };
  if (status !== 'pass') entry.output = (res.error ? `${res.error.message}\n` : '') + output.slice(-TAIL);
  results.push(entry);
  if (status !== 'pass') failed = true;
  console.log(`${status === 'pass' ? 'PASS' : status.toUpperCase().padEnd(4)}  ${step.name}  (${entry.durationMs} ms)`);
}

const report = {
  version: 1,
  timestamp: new Date().toISOString(),
  mode,
  result: failed ? 'fail' : 'pass',
  fingerprint: fp,
  durationMs: Date.now() - started,
  steps: results,
};
write(report);
trace(`${mode} ${report.result} fp=${fp} ${results.filter((r) => r.status !== 'pass').map((r) => `${r.name}:${r.status}`).join(' ')}`.trim());

if (failed) {
  const first = results.find((r) => r.status !== 'pass' && r.status !== 'skipped');
  console.log(`\nverify (${mode}): FAIL at ${first?.name}. Details in .harness/last-verify.json`);
  if (first?.output) console.log(`\n--- ${first.name} output (tail) ---\n${first.output}`);
  process.exit(1);
}
console.log(`\nverify (${mode}): PASS · fingerprint ${fp}`);
