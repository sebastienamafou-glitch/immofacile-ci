'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// ⚠️ ON RETIRE userId DES PARAMÈTRES
export async function signInvestmentContract(signatureData: string | undefined) {
  try {
    const headersList = headers();
    
    // 🛡️ 1. IDENTIFICATION VIA SESSION (SÉCURISÉ)
    const userId = headersList.get("x-user-id");
    if (!userId) return { success: false, error: "Session expirée" };

    if (!signatureData) return { success: false, error: "Signature manquante" };

    const ip = headersList.get('x-forwarded-for') || 'Unknown IP';
    const userAgent = headersList.get('user-agent') || 'Unknown User-Agent';

    // 2. On récupère les infos user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "Utilisateur introuvable" };

    // 3. CRÉATION CONTRAT
    const newContract = await prisma.investmentContract.create({
      data: {
        userId: userId, // ✅ On utilise l'ID sécurisé
        ipAddress: ip,
        userAgent: userAgent,
        signatureData: signatureData,
        amount: user.walletBalance || 0, 
        packName: user.backerTier || "Standard"
      }
    });

    revalidatePath('/invest/dashboard');
    
    return { 
        success: true, 
        contractId: newContract.id 
    };

  } catch (error) {
    console.error("Erreur signature:", error);
    return { success: false, error: "Erreur serveur" };
  }
}
