// Appends one line per tool call or failure to .harness/trace.log so a run can be reconstructed.
import { readInput, toProjectPath, trace } from './lib.mjs';

const i = await readInput();
const ev = i.hook_event_name ?? 'event';
const tool = i.tool_name ?? '';
const ti = i.tool_input ?? {};
const who = i.agent_type ? `[${i.agent_type}] ` : '';

let detail = '';
if (ti.command) detail = String(ti.command);
else if (ti.file_path || ti.notebook_path) detail = toProjectPath(ti.file_path ?? ti.notebook_path) ?? String(ti.file_path ?? ti.notebook_path);
else if (ti.pattern) detail = `pattern=${ti.pattern}`;
else if (ti.subagent_type) detail = `agent=${ti.subagent_type} ${ti.description ?? ''}`;
else if (ti.url) detail = String(ti.url);

const status = ev === 'PostToolUseFailure' ? `FAIL ${String(i.error ?? '').split('\n')[0]}` : 'ok';
const ms = i.duration_ms != null ? ` ${i.duration_ms}ms` : '';
trace(`${who}${tool} ${status}${ms}  ${detail}`);
process.exit(0);
