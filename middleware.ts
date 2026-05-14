import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const pathname = nextUrl.pathname

  // 🟢 1. CRITICAL: API & STATIC BYPASS
  // This ensures your Stripe sandbox and other APIs never get rewritten or 
  // caught in tenant logic.
  if (
    pathname.startsWith("/api") || 
    pathname.startsWith("/_next") || 
    pathname.includes(".") // Catch files like favicon.ico, etc.
  ) {
    return NextResponse.next();
  }

  // ==========================================
  // 2. TOP-LEVEL ROUTES (Sandbox)
  // ==========================================
  if (pathname.startsWith("/sandbox")) {
    if (pathname !== "/sandbox/login") {
      const sandboxAuth = req.cookies.get("sandbox_access")?.value;
      if (sandboxAuth !== process.env.SANDBOX_PASSWORD) {
        return NextResponse.redirect(new URL("/sandbox/login", req.url));
      }
    }
    return NextResponse.next();
  }

  // ==========================================
  // 3. DOMAIN & TENANT EXTRACTION
  // ==========================================
  const hostname = req.headers.get('host') || '';
  
  // On Vercel, use your actual production domain
  const mainDomain = process.env.NODE_ENV === 'production' 
    ? 'open-backstage.org' 
    : 'localhost:3000';

  const currentHost = hostname.split(':')[0];
  const baseHost = mainDomain.split(':')[0];

  const isMainDomain = currentHost === baseHost || currentHost === `www.${baseHost}`;
  
  const tenant = currentHost.endsWith(`.${baseHost}`) && currentHost !== `www.${baseHost}`
    ? currentHost.replace(`.${baseHost}`, '')
    : null;

  // ==========================================
  // 4. PUBLIC MARKETING SITE LOGIC
  // ==========================================
  if (isMainDomain) {
    return NextResponse.rewrite(new URL(`/home${pathname}${nextUrl.search}`, req.url));
  }

  // ==========================================
  // 5. TENANT DASHBOARD LOGIC (cytfred.open-backstage.org)
  // ==========================================
  if (tenant) {
    const isOnLoginPage = pathname.startsWith("/login");
    const isPublicTenantRoute = pathname.startsWith("/audition-form");

    if (!isLoggedIn && !isOnLoginPage && !isPublicTenantRoute) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (isLoggedIn && isOnLoginPage) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Rewrite to the [tenant] dynamic folder
    return NextResponse.rewrite(new URL(`/${tenant}${pathname}${nextUrl.search}`, req.url));
  }

  return NextResponse.next();
})

export const config = {
  // Keeping the matcher clean
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};