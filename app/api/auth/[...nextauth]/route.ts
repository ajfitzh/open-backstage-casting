// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyUserCredentials } from "@/app/lib/baserow";

// Define authentication configuration
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Casting Portal",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "actor@example.com" },
        digitalId: { label: "Digital ID", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.digitalId) {
          return null;
        }

        // Call the logic we added to lib/baserow.ts
        const user = await verifyUserCredentials(credentials.email, credentials.digitalId);

        if (user) {
          // Any object returned will be saved in the `user` property of the JWT
          return user;
        } else {
          // Returning null indicates an error
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login', // We will build this custom page next
  },
  callbacks: {
    // 1. JWT Callback: Called whenever a token is created or updated
    async jwt({ token, user }) {
      // If user is defined, this is the initial login
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;   // Cast needed because default User type is limited
        token.cytId = (user as any).cytId;
      }
      return token;
    },
    // 2. Session Callback: Called whenever the client checks user session
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).cytId = token.cytId;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET, 
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };