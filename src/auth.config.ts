import type { NextAuthConfig } from "next-auth";

export default {
  providers: [], 
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      return true; 
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        // On respecte l'exigence de next-auth.d.ts : une string stricte avec un fallback
        token.role = (user.role as string) || "GUEST";
        token.agencyId = user.agencyId; 
      }
      
      if (trigger === "update" && session) {
        if (session.role) token.role = session.role as string;
        if (session.agencyId !== undefined) token.agencyId = session.agencyId as string | null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;
        session.user.role = token.role as string; 
        session.user.agencyId = token.agencyId as string | null | undefined; 
      }
      return session;
    }
  },
} satisfies NextAuthConfig;
