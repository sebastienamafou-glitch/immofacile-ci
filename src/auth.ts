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
  signOut
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        console.log("🔍 [AUTH] Tentative de connexion...");
        const parsedCredentials = z
          .object({ identifier: z.string(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { identifier, password } = parsedCredentials.data;
          const user = await prisma.user.findFirst({
            where: { OR: [{ email: identifier }, { phone: identifier }] }
          });

          if (!user) {
            console.log("❌ [AUTH] Utilisateur non trouvé:", identifier);
            return null;
          }

          const passwordsMatch = await bcrypt.compare(password, user.password || "");
          if (passwordsMatch) {
            console.log("✅ [AUTH] Mot de passe OK pour:", user.email);
            return user;
          } else {
             console.log("❌ [AUTH] Mot de passe incorrect");
          }
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log("🎟️ [JWT] Création token pour User ID:", user.id);
        token.sub = user.id;
        // @ts-ignore
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("📦 [SESSION] Récupération session. Token Sub:", token?.sub);
      if (token?.sub && session.user) {
        session.user.id = token.sub;
        // @ts-ignore
        session.user.role = token.role as string;
      } else {
        console.warn("⚠️ [SESSION] Token incomplet ou User manquant");
      }
      return session;
    }
  },
  // Ajout de debug pour voir les erreurs internes
  debug: true, 
})
