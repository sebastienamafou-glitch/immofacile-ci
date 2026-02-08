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
  // ❌ J'ai retiré "update" ici, car il n'existe pas côté serveur
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        // ... (votre code de connexion existant, ne changez rien)
        console.log("🔍 [AUTH] Tentative de connexion...");
        const parsedCredentials = z
          .object({ identifier: z.string(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { identifier, password } = parsedCredentials.data;
          const user = await prisma.user.findFirst({
            where: { OR: [{ email: identifier }, { phone: identifier }] }
          });

          if (!user) return null;

          const passwordsMatch = await bcrypt.compare(password, user.password || "");
          if (passwordsMatch) return user;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    // ✅ On garde cette logique, c'est elle qui fait le travail !
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        // @ts-ignore
        token.role = user.role;
      }

      // C'est ICI que la magie opère quand le client appelle update()
      if (trigger === "update" && session?.role) {
        console.log("🔄 [JWT] Mise à jour du Rôle vers :", session.role);
        token.role = session.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;
        // @ts-ignore
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  debug: true, 
})
