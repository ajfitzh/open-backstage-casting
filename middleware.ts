import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const pathname = nextUrl.pathname

  // ==========================================
  // 1. TOP-LEVEL ROUTES (Bypass Rewrites)
  // ==========================================
  // Because /sandbox is in the root `app/sandbox` folder, it cannot be rewritten
  // to /home or /[tenant]. We must handle it first and pass it through.
  if (pathname.startsWith("/sandbox")) {
    if (pathname !== "/sandbox/login") {
      const sandboxAuth = req.cookies.get("sandbox_access")?.value;
      if (sandboxAuth !== process.env.SANDBOX_PASSWORD) {
        return NextResponse.redirect(new URL("/sandbox/login", req.url));
      }
    }
    // Let Next.js render app/sandbox/... directly without path alterations
    return NextResponse.next();
  }

  // ==========================================
  // 2. DOMAIN & TENANT EXTRACTION
  // ==========================================
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

  // ==========================================
  // 3. PUBLIC MARKETING SITE LOGIC
  // ==========================================
  if (isMainDomain || currentHost === `www.${baseHost}`) {
    // Bypass auth entirely for the public marketing site.
    // Rewrite to the /home folder to avoid dynamic route conflicts
    return NextResponse.rewrite(new URL(`/home${pathname}${nextUrl.search}`, req.url));
  }

  // ==========================================
  // 4. TENANT DASHBOARD LOGIC (Subdomains)
  // ==========================================
  if (tenant) {
    const isOnLoginPage = pathname.startsWith("/login");

    // Protect all standard tenant routes
    if (!isLoggedIn && !isOnLoginPage) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // If they are already logged in, keep them away from the login page
    if (isLoggedIn && isOnLoginPage) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // --- THE FINAL REWRITE ---
    // Secretly render the [tenant] folder!
    return NextResponse.rewrite(new URL(`/${tenant}${pathname}${nextUrl.search}`, req.url));
  }

  // Fallback for anything else
  return NextResponse.next();
})

export const config = {
  // Your existing matcher, keeping static files, images, and API routes fast!
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)"],
}