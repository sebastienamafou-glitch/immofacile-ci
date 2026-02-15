import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Corrige l'erreur : Property 'role' does not exist on type 'User'
   */
  interface Session {
    user: {
      id: string;
      role: string; // ✅ On déclare que le rôle existe !
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
  }
}
