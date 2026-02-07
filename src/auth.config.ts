import type { NextAuthConfig } from "next-auth"

export default {
  providers: [], 
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // ✅ ON AUTORISE TOUT ICI.
      // Pourquoi ? Parce que c'est le fichier 'middleware.ts' qui fait déjà tout le travail de sécurité.
      // Si on retourne 'false' ici, cela crée un conflit avec le middleware.
      return true; 
    },
  },
} satisfies NextAuthConfig
