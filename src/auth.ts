import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import authConfig from "@/auth.config"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"

export const { 
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  // @ts-ignore - Nécessaire car PrismaAdapter v5 a un conflit de type interne connu avec NextAuth v5
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ identifier: z.string(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { identifier, password } = parsedCredentials.data;
          
          // Recherche par email ou par téléphone [cite: 2, 3]
          const user = await prisma.user.findFirst({
            where: { OR: [{ email: identifier }, { phone: identifier }] }
          });

          if (!user || !user.password) return null;

          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.agencyId = user.agencyId; // ✅ Sécurisé par l'augmentation de module 
      }

      // Mise à jour dynamique via session [cite: 82]
      if (trigger === "update") {
        if (session?.role) token.role = session.role;
        if (session?.agencyId) token.agencyId = session.agencyId;
      }

      return token;
    },

    async session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.agencyId = token.agencyId; // ✅ Injecté proprement sans 'any'
      }
      return session;
    }
  },
  debug: process.env.NODE_ENV === "development",
})
