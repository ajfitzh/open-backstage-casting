import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const pathname = nextUrl.pathname

  // --- 1. DOMAIN & TENANT EXTRACTION ---
  const hostname = req.headers.get('host') || '';
  const mainDomain = process.env.NODE_ENV === 'production' 
    ? 'open-backstage.org' 
    : 'localhost:3000';

  // Extract just the host without the port for clean comparison
  const currentHost = hostname.split(':')[0];
  const baseHost = mainDomain.split(':')[0];

  const isMainDomain = currentHost === baseHost;
  const tenant = currentHost.endsWith(`.${baseHost}`) && currentHost !== `www.${baseHost}`
    ? currentHost.replace(`.${baseHost}`, '')
    : null;

  // --- 2. PUBLIC MARKETING SITE LOGIC ---
  if (isMainDomain || currentHost === `www.${baseHost}`) {
    // Bypass auth entirely for the public marketing site and rewrite to (marketing) folder
    // Note: We include nextUrl.search to preserve any query parameters like ?ref=twitter
    return NextResponse.rewrite(new URL(`/(marketing)${pathname}${nextUrl.search}`, req.url));
  }

  // --- 3. TENANT DASHBOARD LOGIC (Subdomains) ---
  if (tenant) {
    const isOnLoginPage = pathname.startsWith("/login");
    const isOnSandbox = pathname.startsWith("/sandbox");
    const isOnSandboxLogin = pathname === "/sandbox/login";

    // A. Sandbox Auth Checks
    if (isOnSandbox && !isOnSandboxLogin) {
      const sandboxAuth = req.cookies.get("sandbox_access")?.value;
      if (sandboxAuth !== process.env.SANDBOX_PASSWORD) {
        return NextResponse.redirect(new URL("/sandbox/login", req.url));
      }
    }

    // B. Standard Auth Checks
    // Protect all tenant routes EXCEPT the login pages
    if (!isLoggedIn && !isOnLoginPage && !isOnSandboxLogin) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // If they are already logged in, keep them away from the login page
    if (isLoggedIn && isOnLoginPage) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // C. The Final Rewrite
    // If they passed all auth checks, secretly render the [tenant] folder!
    return NextResponse.rewrite(new URL(`/${tenant}${pathname}${nextUrl.search}`, req.url));
  }

  // Fallback for anything else
  return NextResponse.next();
})

export const config = {
  // Your existing matcher, keeping static files, images, and API routes fast!
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)"],
}