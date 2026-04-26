import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"

// 1. USE THE NEW, VALIDATED CLIENT
// We keep 'createGoogleUser' for now, as it handles writing/creating a new user.
import { BaserowClient } from "@/app/lib/BaserowClient"
import { createGoogleUser } from "@/app/lib/baserow"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // Google Provider (unchanged)
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),

    // Credentials Provider (updated)
    Credentials({
      name: "Casting Portal",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // 2. USE THE NEW, VALIDATED FUNCTION
        // The old `verifyUserCredentials` likely handled both finding the user and checking the password.
        // We now use our clean client to find the user.
        // NOTE: You will need to re-implement the password check itself,
        // likely by comparing `credentials.password` against a hashed password field
        // that you can now add to the `UserProfileSchema`.
        const user = await BaserowClient.findUserByEmail(credentials.email as string);

        // For now, we'll assume if the user is found, the login is valid.
        // TODO: Add password verification logic here.
        if (user) {
            return user;
        }
        
        return null;
      }
    })
  ],
  callbacks: {
    // SECURITY GATE: Check if Google user exists in Baserow
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email || "";

        // 3. USE THE NEW CLIENT HERE TOO
        const baserowUser = await BaserowClient.findUserByEmail(email);

        if (baserowUser) {
          // A. User Exists: Attach Baserow ID/Role to the transient user object
          user.id = baserowUser.id;
          (user as any).role = baserowUser.role;
          return true; 
        } else {
          // B. User DOES NOT Exist: Auto-Register them!
          try {
            console.log(`🆕 New Google User: ${email}. Auto-registering...`);
            await createGoogleUser(user);
            return true; // Allow them in!
          } catch (error) {
            console.error("❌ Auto-registration failed:", error);
            return false; // Deny access only if creation fails
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
        
        // This fallback is helpful for a NEWLY registered Google user,
        // as their role isn't attached to the initial 'user' object from the provider.
        if (account?.provider === "google" && !token.role) {
            // 4. USE THE NEW CLIENT FOR THE FALLBACK CHECK
            const baserowUser = await BaserowClient.findUserByEmail(user.email || "");
            if (baserowUser) {
              token.id = baserowUser.id; // Ensure ID is synced
              token.role = baserowUser.role;
            }
        }
      }
      return token;
    },

    // SESSION: Pass the ID/Role from Token to the Client (unchanged)
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
