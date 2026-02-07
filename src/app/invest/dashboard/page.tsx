import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

import ContractModal from "@/components/invest/ContractModal";
import DashboardView from "@/components/invest/DashboardView";

export const dynamic = 'force-dynamic';

// --- SÉCURITÉ & DONNÉES ---
async function getAuthenticatedUser() {
  // 1. AUTHENTIFICATION STANDARDISÉE
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return null;

  try {
    // 2. RÉCUPÉRATION DES DONNÉES
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        // A. Conformité légale
        investmentContracts: {
            orderBy: { signedAt: 'desc' }
        },
        // B. Graphique financier
        transactions: {
            orderBy: { createdAt: 'asc' },
            where: {
                OR: [
                    { type: "CREDIT" },
                    { type: "DEBIT" }
                ]
            }
        },
        // ✅ C. CORRECTION SCHEMA : On inclut le coffre-fort
        finance: {
            select: { walletBalance: true }
        }
      }
    });

    return user;

  } catch (error) {
    console.error("Erreur Auth Dashboard Invest:", error);
    return null; 
  }
}

// --- PAGE PRINCIPALE (SERVER COMPONENT) ---
export default async function InvestorPage() {
  // 1. Authentification
  const user = await getAuthenticatedUser();

  // Sécurité : Si pas connecté -> Redirection Login
  if (!user) {
    redirect("/login?type=investor");
  }

  // Sécurité : Vérification du Rôle
  if (user.role !== "INVESTOR" && user.role !== "SUPER_ADMIN") {
     redirect("/dashboard"); 
  }

  // 2. Logique Juridique : Le contrat est-il signé ?
  const hasSignedContract = user.investmentContracts && user.investmentContracts.length > 0;

  // SCÉNARIO A : PAS DE CONTRAT -> BLOCAGE (MODAL)
  if (!hasSignedContract) {
    return (
      <ContractModal 
        user={{
          id: user.id,
          name: user.name || "Actionnaire",
          email: user.email || "",
          // ✅ CORRECTION ACCÈS : On passe par la relation finance
          amount: user.finance?.walletBalance || 0,
          packName: user.backerTier || "Standard"
        }} onSuccess={function (): void {
          throw new Error("Function not implemented.");
        } }        // Note: L'action de succès doit être gérée par le composant client
      />
    );
  }

  // SCÉNARIO B : TOUT EST OK -> DASHBOARD
  // On passe l'utilisateur (Note: DashboardView devra peut-être être adapté pour lire finance.walletBalance aussi)
  return <DashboardView user={user} />;
}
