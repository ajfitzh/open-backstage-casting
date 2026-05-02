import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { headers } from "next/headers"

// Use the updated standalone functions from our refactored baserow.ts
import { findUserByEmail, createGoogleUser } from "@/app/lib/baserow"

// --- COOKIE SHARING CONFIG ---
const useSecureCookies = process.env.NODE_ENV === "production"
const cookiePrefix = useSecureCookies ? "__Secure-" : ""
// FIXED: Use undefined in local dev so the browser doesn't reject the cookie!
const sharedDomain = process.env.NODE_ENV === "production" ? ".open-backstage.org" : undefined;

// --- TENANT HELPER ---
// Dynamically extracts the tenant so auth knows which database to query
// NEXT.JS 15 FIX: Made this function async to await headers()
async function getTenantContext() {
  const hostList = await headers(); // Await the headers promise
  const host = hostList.get("host") || "";

  // DEV BYPASS: Google OAuth hates subdomains on localhost.
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
        if (!credentials?.email) return null;

        // Clean up autofill spaces!
        const email = (credentials.email as string).trim();
        console.log(`\n🔐 --- LOGIN ATTEMPT ---`);
        console.log(`📧 Email: "${email}"`);

        // Await the async tenant context
        const tenant = await getTenantContext();
        console.log(`🏢 Tenant Context: "${tenant}"`);

        if (!tenant) {
            console.log("❌ Failed: No tenant context found.");
            return null;
        }

        // Fetch user from the specific tenant's database
        const user = await findUserByEmail(tenant, email);

        if (user) {
            console.log(`✅ Success! Found user in Baserow: ${user.name}`);
            return user;
        } 
        
        console.log(`❌ Failed: Email not found in Baserow PEOPLE table.`);
        
        // THE MASTER KEY (DEV ONLY)
        if (process.env.NODE_ENV === "development") {
            console.log(`⚠️ DEV MODE: Bypassing database check. Forcing login!`);
            return { 
                id: "1", 
                name: "Local Admin Override", 
                email: email, 
                role: "Admin" 
            };
        }

        return null;
      }
    })
  ],
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

    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const tenant = await getTenantContext(); // Await tenant context
        if (!tenant) return false; 

        const email = user.email || "";
        const baserowUser = await findUserByEmail(tenant, email);

        if (baserowUser) {
          user.id = baserowUser.id;
          (user as any).role = baserowUser.role;
          return true; 
        } else {
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
      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        
        if (account?.provider === "google" && !token.role) {
            const tenant = await getTenantContext(); // Await tenant context
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