import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('cyt_auth');
  const { pathname } = request.nextUrl;
  
  // FIX: Fallback to 'cytfred' if the environment variable is missing
  const APP_PASSWORD = process.env.APP_PASSWORD || 'cytfred';

  // 1. PUBLIC ASSETS IGNORE (Safety Net)
  // If the matcher misses something, this ensures we don't block images
  if (pathname.match(/\.(png|jpg|jpeg|svg|css|js|ico)$/)) {
    return NextResponse.next();
  }

  // 2. ALREADY LOGGED IN?
  // If user is on /login but has the cookie, bump them to Dashboard
  if (pathname === '/login') {
    if (authCookie?.value === APP_PASSWORD) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next(); // Let them view the login page
  }

  // 3. PROTECTED ROUTES
  // If they lack the cookie, send them to login
  if (!authCookie || authCookie.value !== APP_PASSWORD) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything EXCEPT internal Next.js files and static assets
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};