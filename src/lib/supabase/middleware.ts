import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

/**
 * Refreshes the Supabase auth session on every request (reads/writes cookies) and returns the
 * current user. Must run in middleware so Server Components always see a fresh session.
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}

export type AppRole = 'trainer' | 'client' | 'admin';

/** Role is stored in the JWT's app_metadata (admin-set), so routing needs no DB query. */
export function roleOf(user: User | null): AppRole | null {
  const role = user?.app_metadata?.role;
  return role === 'trainer' || role === 'client' || role === 'admin' ? role : null;
}

export const HOME_FOR: Record<AppRole, string> = {
  trainer: '/coach',
  client: '/client',
  admin: '/admin',
};
