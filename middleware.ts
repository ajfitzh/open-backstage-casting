import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const pathname = nextUrl.pathname
  
  const isOnLoginPage = pathname.startsWith("/login")
  const isOnSandbox = pathname.startsWith("/sandbox")
  const isOnSandboxLogin = pathname === "/sandbox/login"

  // --- NEW: SANDBOX LOGIC ---
  if (isOnSandbox && !isOnSandboxLogin) {
    const sandboxAuth = req.cookies.get("sandbox_access")?.value
    // If the cookie doesn't match your env variable, send them to the sandbox login
    if (sandboxAuth !== process.env.SANDBOX_PASSWORD) {
      return NextResponse.redirect(new URL("/sandbox/login", nextUrl.origin))
    }
    return NextResponse.next()
  }

  if (isOnSandboxLogin) {
    return NextResponse.next()
  }
  // --- END SANDBOX LOGIC ---

  // 1. Existing Auth.js: If trying to access protected routes while logged out
  if (!isLoggedIn && !isOnLoginPage) {
    return NextResponse.redirect(new URL("/login", nextUrl.origin))
  }

  // 2. Existing Auth.js: If logged in but trying to go to login page
  if (isLoggedIn && isOnLoginPage) {
    return NextResponse.redirect(new URL("/", nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)"],
}