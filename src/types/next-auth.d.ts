import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Extension de l'interface Session pour inclure le rôle et l'ID agence
   * Cela permet d'utiliser session.user.role et session.user.agencyId sans erreur
   */
  interface Session {
    user: {
      id: string;
      role: string;
      agencyId?: string | null; // ✅ Ajout pour la gestion des accès agence
    } & DefaultSession["user"];
  }

  /**
   * Extension de l'interface User pour la compatibilité avec Prisma et les Adaptateurs
   */
  interface User {
    role: string;
    agencyId?: string | null;
  }
}

declare module "next-auth/jwt" {
  /**
   * Extension du jeton JWT pour stocker les informations de session
   */
  interface JWT {
    role: string;
    agencyId?: string | null;
  }
}
