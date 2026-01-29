import { auth } from "@/auth"
import { NextResponse } from "next/navigation"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnLoginPage = req.nextUrl.pathname.startsWith("/login")

  // 1. If NOT logged in and NOT on login page -> Send to /login
  if (!isLoggedIn && !isOnLoginPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }

  // 2. If logged in and TRYING to go to /login -> Send to /
  if (isLoggedIn && isOnLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  // Protect everything EXCEPT static files, images, and the favicon
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}