// middleware.ts
import { auth } from "@/auth"

export default auth(() => {
  // req.auth contains the user session
  // If you want to protect a route:
  // if (!req.auth && req.nextUrl.pathname !== "/login") {
  //   const newUrl = new URL("/login", req.nextUrl.origin)
  //   return Response.redirect(newUrl)
  // }
})

export const config = {
  // The matcher prevents middleware from running on static assets and API routes
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}