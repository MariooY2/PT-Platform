// PreToolUse guard for Bash and PowerShell. The model proposes; this policy authorizes.
// deny = prohibited (irreversible or sensitive), ask = external effect (human approves), silent = normal flow.
// Text matching is a policy layer, not a sandbox: permission rules and the verifier back it up.
// Autopilot: every "ask" becomes "deny + queue it in .harness/approvals.md", so the session never stalls.
// Builders (commands running inside .claude/worktrees/<name>) also stay off the shared database and ports.
import { decide, projectDir, readInput, trace } from './lib.mjs';
import { autopilotOn, isPreapproved } from '../../scripts/lib/autopilot.mjs';

const input = await readInput();
const cmd = String(input?.tool_input?.command ?? '');
const tool = input?.tool_name ?? 'Bash';
const c = cmd.replace(/\s+/g, ' ').trim();
const auto = autopilotOn(projectDir);
const inWorktree = /[\\/]\.claude[\\/]worktrees[\\/]/.test(String(input?.cwd ?? ''));
const QUEUE = 'Autopilot does not wait for answers: do not retry this. Add a line to .harness/approvals.md '
  + '("- [ ] <task-id> · <what> · <why> · <exact command for the human>"), do everything else you can, and continue with the next task.';
function askOrQueue(why) {
  if (auto) { trace(`guard-bash DENY(autopilot) ${tool}: ${c}`); decide('deny', `Needs the human: ${why} ${QUEUE}`); }
  trace(`guard-bash ASK ${tool}: ${c}`); decide('ask', why);
}

const DENY = [
  [/\bgit\b[^|;&]*\bpush\b[^|;&]*(\s--force\b|\s-f\b|\s--force-with-lease\b|\s\+\S)/i, 'Force-pushing rewrites remote history.'],
  [/\bgit\b[^|;&]*\s--no-verify\b/i, '--no-verify skips the checks this project relies on.'],
  [/\bsupabase\s+db\s+reset\b[^|;&]*(--linked|--db-url)/i, 'Resetting a remote database destroys its data.'],
  [/\bsupabase\s+projects\s+delete\b/i, 'Deleting a Supabase project is irreversible.'],
  [/\bgh\s+repo\s+delete\b/i, 'Deleting a repository is irreversible.'],
  [/\b(curl|wget|iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b[^\n]*\|\s*(sudo\s+)?((ba|z|da)?sh|iex|Invoke-Expression|node|python3?)\b/i, 'Piping a download straight into a shell or interpreter runs unreviewed code.'],
  [/\b(npm|pnpm|yarn|bun)\s+publish\b/i, 'Publishing a package is a public, irreversible action.'],
  [/(^|[\s;&|(])(cat|less|more|head|tail|type|bat|grep|rg|sed|awk|cp|mv|scp|base64|xxd|od|strings|Get-Content|gc|Copy-Item|Select-String|sls|code|vi|vim|nano|notepad)\b[^|;&]*(^|[\s/\\'"])\.env(?!\.example\b)(\.[\w.-]+)?(?=$|[\s'";|&)])/i, '.env files hold secrets; read .env.example instead.'],
  [/(^|[\s;&|(])(source|\.)\s+\S*\.env(?!\.example\b)/i, 'Loading .env into the shell exposes secrets in command output.'],
  [/(^|[;&|]\s*|^\s*)(printenv|export\s+-p)\b/i, 'Dumping the environment can print secrets.'],
  [/(^|[;&|]\s*)env\s*($|[|;&>])/i, 'Dumping the environment can print secrets.'],
  [/\b(Get-ChildItem|gci|dir|ls)\s+env:/i, 'Dumping the environment can print secrets.'],
  [/\b(echo|printf|Write-Output|Write-Host)\b[^\n]*\$\{?(env:)?(SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|WHISH_SECRET|CRON_SECRET|RESEND_API_KEY|VAPID_PRIVATE_KEY)\b/i, 'Printing a secret puts it in the transcript.'],
  [/\b(mkfs|format\s+[a-z]:|diskpart)\b|\bdd\s+if=/i, 'Disk-level commands are never needed here.'],
];

// Evidence integrity: only scripts/verify.mjs writes last-verify.json, only hooks write trace.log.
if (/\.harness[\\/](last-verify\.json|trace\.log)/i.test(c) && !/^node\s+scripts[\\/]verify\.mjs\b/.test(c)
    && /(>|\btee\b|\bcp\b|\bmv\b|\brm\b|\bdel\b|Set-Content|Add-Content|Out-File|Remove-Item|Copy-Item|Move-Item|sed\s+-i|truncate)/i.test(c)) {
  trace(`guard-bash DENY evidence-file ${tool}: ${c}`);
  decide('deny', 'Blocked: .harness/last-verify.json and trace.log are evidence written only by scripts/verify.mjs and the hooks. Run `node scripts/verify.mjs` instead.');
}

for (const [re, why] of DENY) {
  if (re.test(c)) {
    trace(`guard-bash DENY ${tool}: ${c}`);
    decide('deny', `Blocked by project policy: ${why} If this is genuinely needed, stop and ask the human to run it.`);
  }
}

// Parallel builders share one local Supabase stack and one set of ports with the orchestrator.
if (inWorktree) {
  const BUILDER_DENY = [
    [/\bsupabase\b(?!\s+(status|--version|-v|--help)\b)|\bdb:(types|reset)\b/i, 'Builders do not use the local database; the orchestrator owns the schema lane. Report NEEDS-SCHEMA.'],
    [/\b(pnpm|npm)\s+(run\s+)?test:(e2e|rls)\b|\bplaywright\s+test\b/i, 'e2e and RLS tests run in the orchestrator after merge. Run `node scripts/verify.mjs` (fast) here.'],
    [/\bverify\.mjs\b[^|;&]*--full\b/i, 'verify --full runs in the orchestrator after merge. Run `node scripts/verify.mjs` (fast) here.'],
    [/\b(pnpm|npm)\s+(run\s+)?(dev|start)\b|\bnext\s+(dev|start)\b/i, 'Dev servers collide on ports between parallel builders. Prove behaviour with unit tests; e2e runs after merge.'],
    [/\bgit\s+(merge|rebase|pull|worktree|switch|checkout\s+(main|master)\b)/i, 'Builders stay on their own branch; the orchestrator merges.'],
  ];
  for (const [re, why] of BUILDER_DENY) {
    if (re.test(c)) { trace(`guard-bash DENY builder ${tool}: ${c}`); decide('deny', `Blocked for builders: ${why}`); }
  }
}

// Recursive deletes: allow known build folders, deny anything that escapes the project, ask otherwise.
const SAFE_DELETE = /^(\.\/)?(node_modules|\.next|dist|build|out|coverage|\.turbo|playwright-report|test-results|_scaffold|\.harness\/evidence(\/[\w.\-/]+)?|supabase\/\.temp)\/?$/;
const rmMatch = c.match(/(?:^|[;&|]\s*)(?:sudo\s+)?rm\s+((?:-[a-zA-Z]+\s+|--[a-z-]+\s+)*)(.*?)(?=$|[;&|])/);
const psMatch = c.match(/\b(Remove-Item|rm|ri|del|rmdir|rd)\b([^;&|]*)/i);
function checkTargets(targets) {
  const list = targets.split(/\s+/).filter((t) => t && !t.startsWith('-'));
  if (!list.length) return null;
  for (const t of list) {
    const x = t.replace(/^['"]|['"]$/g, '').replace(/\\/g, '/');
    if (x === '/' || x === '~' || x === '.' || x === '..' || x === '*' || x.startsWith('/') || x.startsWith('~')
        || /^[a-z]:/i.test(x) || x.includes('..') || x.includes('$')) return 'deny';
  }
  return list.every((t) => SAFE_DELETE.test(t.replace(/^['"]|['"]$/g, '').replace(/\\/g, '/'))) ? 'allow' : 'ask';
}
if (rmMatch && /(-[a-zA-Z]*[rR][a-zA-Z]*|--recursive)/.test(rmMatch[1] || '')) {
  const verdict = checkTargets(rmMatch[2] || '');
  if (verdict === 'deny') { trace(`guard-bash DENY rm ${c}`); decide('deny', 'Blocked: recursive delete outside the project or of the project root.'); }
  if (verdict === 'ask') askOrQueue('Recursive delete of something other than a build folder — confirm the exact paths.');
} else if (psMatch && /-Recurse|\/s\b/i.test(psMatch[2] || '')) {
  const verdict = checkTargets((psMatch[2] || '').replace(/-(Recurse|Force|Path|LiteralPath)\b/gi, ' ').replace(/\/[sq]\b/gi, ' '));
  if (verdict === 'deny') { trace(`guard-bash DENY delete ${c}`); decide('deny', 'Blocked: recursive delete outside the project or of the project root.'); }
  if (verdict === 'ask') askOrQueue('Recursive delete of something other than a build folder — confirm the exact paths.');
}

const ASK = [
  [/\bgit\b(\s+-[cC]\s+\S+)*\s+push\b/i, 'Pushing to the remote is an external effect.'],
  [/\bgit\s+(reset\s+--hard|clean\s+-[a-z]*f|checkout\s+--\s+\.|restore\s+(--staged\s+)?\.(\s|$))/i, 'This discards uncommitted work.'],
  [/\bvercel\b(?!\s+(--version|-v|whoami|help)\b)/i, 'Vercel commands deploy or pull production settings.'],
  [/\bsupabase\s+(db\s+(push|pull)|link|unlink|secrets|functions\s+deploy|projects|orgs|login|migration\s+repair|storage\s+(rm|cp|mv))\b/i, 'This touches the remote Supabase project.'],
  [/\bsupabase\s+gen\s+types\b[^|;&]*(--project-id|--linked|--db-url)/i, 'Generating types from a remote project reads production schema.'],
  [/\bgh\s+(pr\s+merge|release|secret|variable|workflow\s+run|api\s+-X\s*(POST|PUT|PATCH|DELETE))\b/i, 'This changes GitHub state.'],
  [/\bdocker\s+(system\s+prune|volume\s+(rm|prune)|rm\s+-f)\b/i, 'This can wipe the local Supabase data volumes.'],
  [/\bngrok\b|\bcloudflared\s+tunnel\b/i, 'A tunnel exposes the local app to the internet.'],
  [/\bpsql\b[^\n]*postgres(ql)?:\/\/[^\s]*@(?!(127\.0\.0\.1|localhost)[:/])/i, 'Connecting to a non-local database.'],
  [/\b(curl|wget|Invoke-WebRequest|Invoke-RestMethod|iwr|irm)\b(?=[^\n]*(-X\s*(POST|PUT|PATCH|DELETE)|--data\b|\s-d\s|\s-F\s|-Method\s+(Post|Put|Patch|Delete)))(?![^\n]*(localhost|127\.0\.0\.1))/i, 'Sending data to an external service.'],
];
for (const [re, why] of ASK) {
  if (re.test(c)) askOrQueue(why);
}

// New dependencies need approval. In autopilot, packages in .harness/autopilot.json are pre-approved (pnpm only).
const pkgName = (t) => (t.startsWith('@') ? '@' + t.slice(1).split('@')[0] : t.split('@')[0]);
let preapprovedAdd = false;
for (const m of c.matchAll(/\b(pnpm|npm|yarn|bun)\s+(add|install|i)\b([^;&|]*)/gi)) {
  const real = m[3].split(/\s+/).filter((t) => t && !t.startsWith('-')).map(pkgName);
  if (!real.length) continue;
  if (auto && m[1].toLowerCase() === 'pnpm' && real.every((n) => isPreapproved(projectDir, n))) { preapprovedAdd = true; continue; }
  askOrQueue(`Adds dependencies (${real.join(', ')})${auto ? ' that are not pre-approved in .harness/autopilot.json (use pnpm)' : ''}. Check the contract's allowed packages, then approve.`);
}
const runner = c.match(/\b(npx|bunx|pnpm\s+dlx|pnpm\s+exec|yarn\s+dlx)\s+(?:-[\w-]+\s+)*(@?[\w./-]+)/i);
const RUNNER_OK = /^(create-next-app(@[\w.-]+)?|shadcn(@[\w.-]+)?|shadcn-ui(@[\w.-]+)?|supabase|playwright|@playwright\/test|prettier|eslint|tsc|vitest|next|tsx)$/i;
if (runner && !/^pnpm\s+exec$/i.test(runner[1]) && !RUNNER_OK.test(runner[2])) {
  askOrQueue(`Runs a package that is not on the project's tool list (${runner[2]}).`);
}

if (preapprovedAdd) { trace(`guard-bash ALLOW preapproved dependency ${c}`); decide('allow', 'Pre-approved dependency (.harness/autopilot.json, D-006).'); }
process.exit(0);
