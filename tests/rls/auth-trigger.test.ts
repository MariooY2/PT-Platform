import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, inject, it } from 'vitest';
import type { Database } from '../../src/lib/supabase/types';

const url = inject('supabaseUrl');
const serviceKey = inject('supabaseServiceKey');

const admin: SupabaseClient<Database> = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let created: string[] = [];
afterEach(async () => {
  for (const id of created) await admin.auth.admin.deleteUser(id);
  created = [];
});

// The trigger guarantees a profile row for every new auth user, defaulting role to 'client'.
// The seed proves the app_metadata.role path (its 6 profiles get admin/trainer/client from
// raw_app_meta_data at insert time). At runtime GoTrue writes app_metadata after the row insert,
// so the signup server action sets role server-side via the admin client (never client-supplied).
describe('handle_new_user trigger', () => {
  it('creates a profile row for a new auth user (full_name from metadata, default role client)', async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: `trigger-${Date.now()}@ptplatform.test`,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: { full_name: 'Trigger User' },
    });
    expect(error).toBeNull();
    const id = data.user!.id;
    created.push(id);

    const prof = await admin.from('profiles').select('role, full_name').eq('id', id).single();
    expect(prof.error).toBeNull();
    expect(prof.data?.full_name).toBe('Trigger User');
    expect(prof.data?.role).toBe('client');
  });
});
