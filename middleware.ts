import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Check if user has the "auth_cookie"
  const authCookie = request.cookies.get('cyt_auth');
  const { pathname } = request.nextUrl;

  // 2. If they are already on the login page, let them stay
  if (pathname === '/login') {
    if (authCookie?.value === process.env.APP_PASSWORD) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 3. If they are trying to access app pages without the cookie, boot them to login
  if (!authCookie || authCookie.value !== process.env.APP_PASSWORD) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Protect these routes
export const config = {
  matcher: ['/', '/auditions/:path*', '/casting/:path*', '/callbacks/:path*'],
};