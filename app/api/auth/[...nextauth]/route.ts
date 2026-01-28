import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { verifyUserCredentials, findUserByEmail } from "@/app/lib/baserow";

export const authOptions: NextAuthOptions = {
  providers: [
    // 1. Google One-Click
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    // 2. Custom Password
    CredentialsProvider({
      name: "Casting Portal",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        return await verifyUserCredentials(credentials.email, credentials.password);
      }
    })
  ],
  callbacks: {
    // SECURITY GATE: Called when Google tries to sign in
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        // Check if this Google Email actually exists in our Baserow Roster
        const baserowUser = await findUserByEmail(user.email || "");
        if (baserowUser) {
            // Attach the Baserow ID to the user object so we can use it later
            user.id = baserowUser.id;
            (user as any).role = baserowUser.role;
            return true; // Allow access
        }
        return false; // Deny access (Not in roster)
      }
      return true; // Allow credentials login (already verified in authorize)
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        // If they logged in via Google, fetch their role fresh from Baserow if needed
        if (account?.provider === "google" && !token.role) {
             const baserowUser = await findUserByEmail(user.email || "");
             if (baserowUser) token.role = baserowUser.role;
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
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };