// Fichier : src/app/invest/dashboard/page.tsx

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardView from "@/components/invest/DashboardView";

export default async function DashboardPage() {
  // 1. Sécurité
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // 2. Récupération des données (Directement en DB, pas via API)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      finance: true, // ✅ C'EST ICI QU'ON RÉCUPÈRE walletBalance
      transactions: true,
      investmentContracts: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { signedAt: 'desc' }
      },
      kyc: true // Pour le statut vérifié
    }
  });

  if (!user) redirect("/login");

  // 3. Préparation des données pour le composant
  // On s'assure que les valeurs ne sont jamais null/undefined
  const safeUser = {
    ...user,
    walletBalance: user.finance?.walletBalance || 0, // 🛡️ Protection anti-crash
    backerTier: user.backerTier || "Investisseur",
    transactions: user.transactions || [],
    investmentContracts: user.investmentContracts || []
  };

  // 4. Affichage
  return <DashboardView user={safeUser} />;
}
