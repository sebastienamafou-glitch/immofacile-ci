import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardView from "@/components/investor/DashboardView";
// ✅ Importation des types générés automatiquement par Prisma
import { Transaction, InvestmentContract, VerificationStatus } from "@prisma/client";

// ✅ 1. TYPAGE STRICT (Data Transfer Object)
// Définit exactement ce que le composant DashboardView a le droit de recevoir
export interface InvestorDashboardData {
  id: string;
  name: string | null;
  email: string | null;
  walletBalance: number;
  backerTier: string;
  kycStatus: VerificationStatus | "UNINITIALIZED";
  transactions: Transaction[];
  investmentContracts: InvestmentContract[];
}

export default async function DashboardPage() {
  // 1. Sécurité : Vérification de la session
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // 2. Récupération optimisée en DB
  // 🛡️ SÉCURITÉ : On utilise `select` au lieu de `include` pour éviter de 
  // récupérer le mot de passe (password) ou d'autres données sensibles.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      backerTier: true,
      // On ne récupère QUE le solde du portefeuille
      finance: { 
        select: { walletBalance: true } 
      },
      // On ne récupère QUE le statut KYC
      kyc: { 
        select: { status: true } 
      },
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 10 // Bonne pratique : limiter l'historique initial
      },
      investmentContracts: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { signedAt: 'desc' }
      }
    }
  });

  if (!user) redirect("/login");

  // 3. Formatage strict des données pour le front
  // On mappe les résultats de la DB vers notre interface sécurisée
  const safeUser: InvestorDashboardData = {
    id: user.id,
    name: user.name,
    email: user.email,
    walletBalance: user.finance?.walletBalance || 0,
    backerTier: user.backerTier || "Investisseur",
    kycStatus: user.kyc?.status || "UNINITIALIZED",
    transactions: user.transactions,
    investmentContracts: user.investmentContracts
  };

  // 4. Affichage
  return <DashboardView user={safeUser} />;
}
