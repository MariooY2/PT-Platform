import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateDueCheckins } from '@/features/checkins/due';

// A cron endpoint: never prerender, always run on request.
export const dynamic = 'force-dynamic';

/**
 * Due-generation cron (docs/platform.md §11, features §7.7). Vercel Cron calls this on a schedule
 * with `Authorization: Bearer <CRON_SECRET>`; the registration (vercel.json) + the secret are set by
 * the human (parked in approvals.md). We FAIL CLOSED: with no CRON_SECRET configured, every request
 * is refused, so the job never runs unauthenticated.
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? request.headers.get('x-cron-secret') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : header;
  return provided.length > 0 && provided === secret;
}

async function handle(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = createAdminClient();
  const { created } = await generateDueCheckins(supabase);
  return NextResponse.json({ created });
}

export async function GET(request: Request): Promise<NextResponse> {
  return handle(request);
}

export async function POST(request: Request): Promise<NextResponse> {
  return handle(request);
}
