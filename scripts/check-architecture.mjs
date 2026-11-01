#!/usr/bin/env node
// Static rules that should never depend on the model remembering them. No dependencies.
// Exit 1 when any error is found. Warnings print but do not fail.
//   node scripts/check-architecture.mjs [--json]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const findings = [];
const add = (severity, rule, file, line, message) => findings.push({ severity, rule, file, line, message });
const rel = (p) => relative(projectDir, p).split(sep).join('/');

const SKIP = new Set(['node_modules', '.next', 'dist', 'build', 'out', 'coverage', 'playwright-report', 'test-results', '.git']);
function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(full);
  }
  return out;
}
const read = (f) => { try { return readFileSync(f, 'utf8'); } catch { return ''; } };
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

const SECRET_VARS = ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'WHISH_SECRET', 'CRON_SECRET', 'RESEND_API_KEY', 'VAPID_PRIVATE_KEY'];
const SECRET_ALLOWED = [
  'src/lib/supabase/admin.ts', 'src/lib/payments/', 'src/app/api/', 'src/lib/email/', 'src/lib/push/',
  'src/lib/env.server.ts', 'src/lib/env/server', 'scripts/', 'tests/', 'supabase/',
];

const srcFiles = walk(join(projectDir, 'src'), ['.ts', '.tsx', '.js', '.jsx', '.mjs']);

// 1. Secrets never reach client code, and are read only in server-only locations.
for (const file of srcFiles) {
  const text = read(file);
  const r = rel(file);
  const firstCode = text.replace(/^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/, '');
  const isClient = /^['"]use client['"]/.test(firstCode);
  for (const v of SECRET_VARS) {
    let idx = text.indexOf(v);
    while (idx !== -1) {
      if (isClient) add('error', 'secret-in-client', r, lineOf(text, idx), `${v} referenced in a "use client" file`);
      else if (!SECRET_ALLOWED.some((p) => r === p || r.startsWith(p))) {
        add('error', 'secret-location', r, lineOf(text, idx), `${v} may only be read in: ${SECRET_ALLOWED.join(', ')}`);
      }
      idx = text.indexOf(v, idx + v.length);
    }
  }
  if (isClient) {
    const m = text.match(/from\s+['"][^'"]*lib\/supabase\/admin['"]/);
    if (m) add('error', 'secret-in-client', r, lineOf(text, m.index), 'client component imports the Supabase admin client');
  }
  const pub = text.match(/NEXT_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE)[A-Z0-9_]*/);
  if (pub) add('error', 'secret-public-prefix', r, lineOf(text, pub.index), `${pub[0]} would ship a secret to the browser`);
}

// 2. Every table created in a migration has row-level security enabled.
const migDir = join(projectDir, 'supabase', 'migrations');
if (existsSync(migDir)) {
  const files = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
  const created = new Map();
  const enabled = new Set();
  // Only tables in the public schema are exposed through the Supabase API, so only they need RLS here.
  const NAME = String.raw`(?:"?(\w+)"?\s*\.\s*)?"?(\w+)"?`;
  const isPublic = (schema) => !schema || schema.toLowerCase() === 'public';
  for (const f of files) {
    const text = read(join(migDir, f)).replace(/--[^\n]*/g, '');
    for (const m of text.matchAll(new RegExp(String.raw`create\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?${NAME}`, 'gi'))) {
      if (!isPublic(m[1])) continue;
      const name = m[2].toLowerCase();
      if (!created.has(name)) created.set(name, `supabase/migrations/${f}:${lineOf(text, m.index)}`);
    }
    for (const m of text.matchAll(new RegExp(String.raw`alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${NAME}\s+enable\s+row\s+level\s+security`, 'gi'))) {
      if (isPublic(m[1])) enabled.add(m[2].toLowerCase());
    }
  }
  for (const [name, where] of created) {
    if (!enabled.has(name)) {
      const [file, line] = where.split(':');
      add('error', 'rls-missing', file, Number(line), `table "${name}" is created but never gets "enable row level security"`);
    }
  }
}

// 3. Design tokens only (docs/ui/design-system.md): no raw colors, no off-palette Tailwind colors,
//    no off-scale type sizes. Tokens live in src/app/globals.css; everything else uses them.
const TOKEN_FILES = ['src/app/globals.css', 'src/styles/tokens.css'];
const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const UTIL = 'bg|text|border|ring|fill|stroke|from|to|via|outline|divide|decoration|placeholder|shadow|accent|caret';
const RAW_COLOR_CLASS = new RegExp(String.raw`(?<![\w-])(?:[a-z0-9-]+:)*(?:${UTIL})-(?:\[(?:#|rgb|rgba|hsl|hsla|oklch|oklab|color)[^\]]*\]|(?:${PALETTE})-\d{2,3}(?:\/\d+)?|white|black)(?![\w-])`, 'g');
const INLINE_COLOR = /style=\{\{[^}]*?(#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\()/g;
const ARBITRARY_TEXT = /(?<![\w-])(?:[a-z0-9-]+:)*text-\[\d+(?:\.\d+)?(?:px|rem|em)\](?![\w-])/g;
for (const file of srcFiles.filter((f) => /\.(tsx|jsx)$/.test(f))) {
  const text = read(file);
  const r = rel(file);
  const severity = r.startsWith('src/components/ui/') ? 'warning' : 'error';
  for (const m of text.matchAll(RAW_COLOR_CLASS)) {
    add(severity, 'ui-raw-color', r, lineOf(text, m.index), `"${m[0]}" bypasses the color tokens; use a semantic token (bg-primary, text-muted-foreground, border-border, bg-success…)`);
  }
  for (const m of text.matchAll(INLINE_COLOR)) {
    add(severity, 'ui-raw-color', r, lineOf(text, m.index), 'inline style color; use a token class or var(--token)');
  }
  for (const m of text.matchAll(ARBITRARY_TEXT)) {
    add(severity, 'ui-type-scale', r, lineOf(text, m.index), `"${m[0]}" is off the type scale; use text-xs…text-4xl or a named text style`);
  }
}
for (const file of walk(join(projectDir, 'src'), ['.css'])) {
  const r = rel(file);
  if (TOKEN_FILES.includes(r)) continue;
  const text = read(file);
  for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(/g)) {
    add('error', 'ui-raw-color', r, lineOf(text, m.index), `color literal outside ${TOKEN_FILES[0]}; define a token there`);
  }
}

// 4. No focused tests left behind.
const testFiles = [
  ...walk(join(projectDir, 'tests'), ['.ts', '.tsx', '.js', '.mjs']),
  ...srcFiles.filter((f) => /\.(test|spec)\.[jt]sx?$/.test(f)),
];
for (const file of testFiles) {
  const text = read(file);
  for (const m of text.matchAll(/\b(?:it|test|describe)\.only\s*\(/g)) {
    add('error', 'focused-test', rel(file), lineOf(text, m.index), '.only() skips the rest of the suite');
  }
}

// 5. .env.example exists once the app exists, lists every variable, and holds no real secrets.
const REQUIRED_ENV = [
  'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'PAYMENTS_PROVIDER', 'WHISH_ENV', 'WHISH_CHANNEL', 'WHISH_SECRET', 'WHISH_WEBSITE_URL',
  'RESEND_API_KEY', 'EMAIL_FROM', 'CRON_SECRET', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY',
];
const envExample = join(projectDir, '.env.example');
if (existsSync(join(projectDir, 'package.json'))) {
  if (!existsSync(envExample)) add('error', 'env-example', '.env.example', 1, 'missing (docs/payments.md §8.4)');
  else {
    const text = read(envExample);
    const vars = new Map();
    text.split('\n').forEach((l, i) => {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*([^#]*)/);
      if (m) vars.set(m[1], { value: m[2].trim().replace(/^['"]|['"]$/g, ''), line: i + 1 });
    });
    for (const v of REQUIRED_ENV) if (!vars.has(v)) add('error', 'env-example', '.env.example', 1, `missing ${v}`);
    for (const v of SECRET_VARS) {
      const e = vars.get(v);
      if (e && e.value && !/(example|changeme|your[-_]|xxx|placeholder|<|local)/i.test(e.value)) {
        add('error', 'env-example', '.env.example', e.line, `${v} looks like a real value; leave it empty or use a placeholder`);
      }
    }
  }
}

// Report
const errors = findings.filter((f) => f.severity === 'error');
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ errors: errors.length, findings }, null, 2));
} else {
  for (const f of findings) console.log(`${f.severity.toUpperCase().padEnd(7)} ${f.rule.padEnd(20)} ${f.file}:${f.line}  ${f.message}`);
  console.log(`check-architecture: ${errors.length} error(s), ${findings.length - errors.length} warning(s)`);
}
process.exit(errors.length ? 1 : 0);
