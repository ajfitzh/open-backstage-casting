import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isOnLoginPage = nextUrl.pathname.startsWith("/login")

  // 1. If trying to access protected routes while logged out
  if (!isLoggedIn && !isOnLoginPage) {
    // Construct the URL manually to be safe
    return NextResponse.redirect(new URL("/login", nextUrl.origin))
  }

  // 2. If logged in but trying to go to login page
  if (isLoggedIn && isOnLoginPage) {
    return NextResponse.redirect(new URL("/", nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}