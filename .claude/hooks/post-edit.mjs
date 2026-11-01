// PostToolUse for Edit and Write: format the file so "use the formatter" is infrastructure, not a reminder.
// A file the formatter cannot parse is reported back to Claude (exit 2 shows stderr to Claude).
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { projectDir, readInput, toProjectPath } from './lib.mjs';

const input = await readInput();
const p = toProjectPath(input?.tool_input?.file_path);
if (!p || !/\.(tsx?|jsx?|mjs|cjs|json|css|md|mdx|ya?ml|html)$/.test(p) || p.startsWith('.harness/')) process.exit(0);

let bin;
try { bin = createRequire(join(projectDir, 'package.json')).resolve('prettier/bin/prettier.cjs'); } catch { process.exit(0); }

const res = spawnSync(process.execPath, [bin, '--write', '--log-level', 'warn', '--ignore-unknown', p], {
  cwd: projectDir, encoding: 'utf8', timeout: 45000,
});
if (res.status === 2 || /SyntaxError/.test(res.stderr ?? '')) {
  process.stderr.write(`Formatter could not parse ${p}. Fix the syntax:\n${(res.stderr ?? '').slice(0, 1500)}`);
  process.exit(2);
}
process.exit(0);
