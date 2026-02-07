'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth"; 
import { headers } from "next/headers"; // Juste pour l'IP

export async function signInvestmentContract(signatureData: string | undefined) {
  try {
    // 🛡️ 1. IDENTIFICATION VIA SESSION
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return { success: false, error: "Session expirée. Veuillez vous reconnecter." };
    if (!signatureData) return { success: false, error: "Signature manquante." };

    // Métadonnées d'audit (IP/UserAgent sont ok via headers car informatifs)
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for') || 'Unknown IP';
    const userAgent = headersList.get('user-agent') || 'Unknown UA';

    // 2. Récupération Données (Avec relation Finance)
    const user = await prisma.user.findUnique({ 
        where: { id: userId },
        include: { finance: true } //  Important pour lire le solde
    });

    if (!user) return { success: false, error: "Utilisateur introuvable." };

    // 3. CRÉATION CONTRAT
    const newContract = await prisma.investmentContract.create({
      data: {
        userId: userId,
        ipAddress: ip,
        userAgent: userAgent,
        signatureData: signatureData,
        // Correction : le solde est dans user.finance, pas user direct
        amount: user.finance?.walletBalance || 0, 
        packName: user.backerTier || "Standard"
      }
    });

    revalidatePath('/invest/dashboard');
    
    return { success: true, contractId: newContract.id };

  } catch (error) {
    console.error("Erreur signature:", error);
    return { success: false, error: "Impossible de signer le contrat." };
  }
}
