import { NextResponse, type NextRequest } from 'next/server';
import { HOME_FOR, roleOf, updateSession, type AppRole } from '@/lib/supabase/middleware';

// Each protected area requires a role; everyone else is redirected to their own home or to login.
const AREA_ROLE: Record<string, AppRole> = {
  '/coach': 'trainer',
  '/client': 'client',
  '/admin': 'admin',
};

const AUTH_PAGES = new Set(['/login', '/signup']);

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;
  const role = roleOf(user);

  const area = Object.keys(AREA_ROLE).find((a) => path === a || path.startsWith(`${a}/`));
  if (area) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '';
      url.searchParams.set('next', path);
      return NextResponse.redirect(url);
    }
    if (role !== AREA_ROLE[area]) {
      const url = request.nextUrl.clone();
      url.pathname = role ? HOME_FOR[role] : '/login';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // A signed-in user never needs the login/signup pages — send them home.
  if (user && role && AUTH_PAGES.has(path)) {
    const url = request.nextUrl.clone();
    url.pathname = HOME_FOR[role];
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
