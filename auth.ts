import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
// 🟢 1. Added 'createGoogleUser' to imports
import { verifyUserCredentials, findUserByEmail, createGoogleUser } from "@/app/lib/baserow"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // 1. Google One-Click
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // 2. Custom Password
    Credentials({
      name: "Casting Portal",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        // Verify against Baserow
        const user = await verifyUserCredentials(credentials.email as string, credentials.password as string);
        return user;
      }
    })
  ],
  callbacks: {
    // SECURITY GATE: Check if Google user exists in Baserow
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email || "";
        const baserowUser = await findUserByEmail(email);

        if (baserowUser) {
          // A. User Exists: Attach Baserow ID/Role to the transient user object
          user.id = baserowUser.id;
          (user as any).role = baserowUser.role;
          return true; 
        } else {
          // 🟢 B. User DOES NOT Exist: Auto-Register them!
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
        
        // Double check Google role if needed
        // (This is helpful for the NEW user we just created, as they won't have the role attached to 'user' yet)
        if (account?.provider === "google" && !token.role) {
             const baserowUser = await findUserByEmail(user.email || "");
             if (baserowUser) {
                token.id = baserowUser.id; // Ensure ID is synced
                token.role = baserowUser.role;
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
    error: '/login', // Error code will be passed as a query param
  },
  secret: process.env.NEXTAUTH_SECRET,
})