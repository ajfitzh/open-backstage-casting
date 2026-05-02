import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { headers } from "next/headers"

// 🟢 Use the updated standalone functions from our refactored baserow.ts
import { findUserByEmail, createGoogleUser } from "@/app/lib/baserow"

// --- COOKIE SHARING CONFIG ---
const useSecureCookies = process.env.NODE_ENV === "production"
const cookiePrefix = useSecureCookies ? "__Secure-" : ""
const sharedDomain = process.env.NODE_ENV === "production" ? ".open-backstage.org" : "localhost"

// --- TENANT HELPER ---
// Dynamically extracts the tenant so auth knows which database to query
function getTenantContext() {
  const hostList = headers();
  const host = hostList.get("host") || "";

  // 🟢 DEV BYPASS: Google OAuth hates subdomains on localhost.
  // This forces local dev to always check the 'cytfred' database so you can log in at localhost:3000
  if (process.env.NODE_ENV === "development" && host.includes("localhost")) {
    return "cytfred";
  }

  // Prod extraction
  const mainDomain = process.env.NODE_ENV === "production" ? "open-backstage.org" : "localhost:3000";
  const currentHost = host.split(":")[0];
  const baseHost = mainDomain.split(":")[0];

  if (currentHost === baseHost || currentHost === `www.${baseHost}`) {
    return null; // They are on the marketing site
  }

  return currentHost.replace(`.${baseHost}`, "");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),

    Credentials({
      name: "Casting Portal",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const tenant = getTenantContext();
        if (!tenant) throw new Error("Cannot log in directly from the marketing site.");

        // 🟢 Fetch user from the specific tenant's database
        const user = await findUserByEmail(tenant, credentials.email as string);

        // TODO: Add password verification logic here (bcrypt compare)
        if (user) {
            return user;
        }
        
        return null;
      }
    })
  ],
  // 🟢 CROSS-DOMAIN COOKIES: This allows the session to jump between subdomains
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
    // SECURITY GATE: Check if Google user exists in Baserow
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const tenant = getTenantContext();
        if (!tenant) return false; // Deny if no tenant context

        const email = user.email || "";
        const baserowUser = await findUserByEmail(tenant, email);

        if (baserowUser) {
          // A. User Exists: Attach Baserow ID/Role to the transient user object
          user.id = baserowUser.id;
          (user as any).role = baserowUser.role;
          return true; 
        } else {
          // B. User DOES NOT Exist: Auto-Register them!
          try {
            console.log(`🆕 New Google User: ${email}. Auto-registering to ${tenant}...`);
            await createGoogleUser(tenant, user);
            return true; 
          } catch (error) {
            console.error("❌ Auto-registration failed:", error);
            return false; 
          }
        }
      }
      return true; // Credentials login is already verified in authorize()
    },

    // TOKEN: Persist the ID/Role from signIn into the Token
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        
        // Fallback for a NEWLY registered Google user
        if (account?.provider === "google" && !token.role) {
            const tenant = getTenantContext();
            if (tenant) {
              const baserowUser = await findUserByEmail(tenant, user.email || "");
              if (baserowUser) {
                token.id = baserowUser.id; 
                token.role = baserowUser.role;
              }
            }
        }
      }
      return token;
    },

    // SESSION: Pass the ID/Role from Token to the Client
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
})