import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      // If there is a token, the user is authenticated.
      // You can add role checks here later (e.g., if (token.role === 'admin'))
      return !!token;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protects everything EXCEPT:
  // 1. /api/auth/* (Login endpoints)
  // 2. /api/upload (S3 upload endpoint)
  // 3. /login (The login page itself)
  // 4. /_next/* (Next.js internals and static assets)
  // 5. /favicon.ico, .png, .jpg, .svg (Public images)
  matcher: [
    "/((?!api/auth|api/upload|login|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};