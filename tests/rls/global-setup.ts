import { execFileSync } from 'node:child_process';
import type { GlobalSetupContext } from 'vitest/node';

/**
 * Reads the live local Supabase URL and keys from `supabase status -o json` and provides them to
 * the RLS tests. Throws if the stack is down so `test:rls` fails loudly instead of passing with
 * nothing run (the harness forbids false evidence).
 */
export default function setup({ provide }: GlobalSetupContext) {
  let raw: string;
  try {
    raw = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
  } catch (e) {
    throw new Error(
      'RLS tests need the local Supabase stack. Run `pnpm exec supabase start` first. Original: ' +
        (e as Error).message,
    );
  }

  const s = JSON.parse(raw) as Record<string, string>;
  const url = s.API_URL ?? s.api_url;
  const anon = s.ANON_KEY ?? s.anon_key ?? s.PUBLISHABLE_KEY ?? s.publishable_key;
  const service = s.SERVICE_ROLE_KEY ?? s.service_role_key ?? s.SECRET_KEY ?? s.secret_key;

  if (!url || !anon || !service) {
    throw new Error(
      'Could not read url/anon/service from supabase status. Saw keys: ' +
        Object.keys(s).join(', '),
    );
  }

  provide('supabaseUrl', url);
  provide('supabaseAnonKey', anon);
  provide('supabaseServiceKey', service);
}

declare module 'vitest' {
  interface ProvidedContext {
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseServiceKey: string;
  }
}
