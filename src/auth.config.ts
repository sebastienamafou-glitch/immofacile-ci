import type { NextAuthConfig } from "next-auth";

export default {
  providers: [], 
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth; 
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.role = (user.role as string) || "UNASSIGNED";
        token.agencyId = user.agencyId;
        // ✅ On récupère le solde depuis le nouveau modèle financier 
        token.walletBalance = user.finance?.walletBalance ?? 0;
      }
      
      if (trigger === "update" && session) {
        if (session.role) token.role = session.role as string;
        if (session.agencyId !== undefined) token.agencyId = session.agencyId as string | null;
        if (session.walletBalance !== undefined) token.walletBalance = session.walletBalance;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;
        session.user.role = token.role as string; 
        session.user.agencyId = token.agencyId as string | null | undefined; 
        session.user.walletBalance = (token.walletBalance as number) ?? 0;
      }
      return session;
    }
  },
} satisfies NextAuthConfig;
