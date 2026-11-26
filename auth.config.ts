import type { NextAuthConfig } from "next-auth";

const useSecureCookies = process.env.NODE_ENV === "production";
const cookiePrefix = useSecureCookies ? "__Secure-" : "";
const sharedDomain = process.env.NODE_ENV === "production" ? ".open-backstage.org" : undefined;

// Edge-safe NextAuth config used by middleware.ts (no bcryptjs or Node-only imports)
export const authConfig = {
  providers: [],
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        domain: sharedDomain,
      },
    },
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      if (url.includes("localhost:3001") || url.includes("open-backstage.org")) {
        return url;
      }
      return baseUrl;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role || "Guest";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
} satisfies NextAuthConfig;
