import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      agencyId?: string | null;
      walletBalance: number; // ✅ Défini pour l'interface utilisateur
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    agencyId?: string | null;
    finance?: {
      walletBalance: number;
    } | null; // ✅ Correspond à la relation un-à-un dans ton schéma [cite: 7, 12]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    agencyId?: string | null;
    walletBalance?: number;
  }
}
