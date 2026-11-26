// auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { headers } from "next/headers"
import bcrypt from "bcryptjs" // 🟢 NEW: Added bcryptjs for secure password comparison
import { authConfig } from "@/auth.config"

// Use the updated standalone functions from our refactored baserow.ts
import { findUserByEmail, createGoogleUser } from "@/app/lib/baserow"

// --- TENANT HELPER ---
// Dynamically extracts the tenant so auth knows which database to query
async function getTenantContext() {
  const hostList = await headers(); 
  const host = hostList.get("host") || "";

  if (process.env.NODE_ENV === "development" && host.includes("localhost")) {
    const currentHost = host.split(":")[0]; // Strips the port
    if (currentHost !== "localhost") {
        return currentHost.replace(".localhost", ""); // Extracts 'e2e'
    }
    return "cytfred"; // Fallback for your normal localhost:3000 work
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
  ...authConfig,
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
        // 🟢 Require both email and password
        if (!credentials?.email || !credentials?.password) return null;

        // Clean up autofill spaces!
        const email = (credentials.email as string).trim();
        const rawPassword = credentials.password as string;
        
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

        // 🟢 DEV BYPASS: Intercept BEFORE strict password checking!
        if (process.env.NODE_ENV === "development" && rawPassword === "dev-mode-bypass") {
            console.log(`⚠️ DEV MODE: Bypassing password check. Forcing login!`);
            // If the user exists in the DB, log in as them. Otherwise, forge a local admin session.
            return user ? user : { 
                id: "dev-bypass-9999", 
                name: "Local Admin", 
                email: email, 
                role: "Admin" 
            };
        }

        // --- NORMAL PROD LOGIN ---
        if (user) {
            console.log(`✅ Success! Found user in Baserow: ${user.name}`);
            
            // SECURITY FIX: Actually check the password!
            if (!user.appPassword) {
                console.log(`❌ Failed: User found, but no password set (Guest account).`);
                return null;
            }

            // Compare the typed password against the hash saved in Baserow
            const isValid = await bcrypt.compare(rawPassword, user.appPassword);
            
            if (isValid) {
                console.log(`✅ Success! Valid password match.`);
                return user;
            } else {
                console.log(`❌ Failed: Invalid password.`);
                return null;
            }
        } 
        
        console.log(`❌ Failed: Email not found in Baserow PEOPLE table.`);
        return null;
      }
    })
  ],
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const tenant = await getTenantContext(); 
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
            const tenant = await getTenantContext(); 
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
  },
})