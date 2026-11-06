import { execFileSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The local Supabase connection, resolved ONCE per worker process and memoized. Each e2e spec used to
// spawn `pnpm exec supabase status` at module scope; with ~13 specs that was many slow CLI spawns per
// run (and a flood of CLI output). Importing this shared module collapses it to one call per worker.
let cached: { url: string; serviceKey: string } | undefined;

export function supabaseEnv(): { url: string; serviceKey: string } {
  if (!cached) {
    const status = JSON.parse(
      execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
        encoding: 'utf8',
        shell: process.platform === 'win32',
      }),
    ) as Record<string, string>;
    cached = {
      url: status.API_URL ?? status.api_url,
      serviceKey:
        status.SERVICE_ROLE_KEY ??
        status.service_role_key ??
        status.SECRET_KEY ??
        status.secret_key,
    };
  }
  return cached;
}

/** A service-role Supabase client bound to the local stack (sessions disabled). */
export function makeAdmin(): SupabaseClient {
  const { url, serviceKey } = supabaseEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
