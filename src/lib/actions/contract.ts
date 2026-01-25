'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function signInvestmentContract(userId: string, signatureData: string | undefined) {
  try {
    if (!signatureData) return { success: false, error: "Signature manquante" };

    const headersList = headers();
    const ip = headersList.get('x-forwarded-for') || 'Unknown IP';
    const userAgent = headersList.get('user-agent') || 'Unknown User-Agent';

    // 1. On récupère les infos user
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // 2. ✅ ON CRÉE LE CONTRAT ET ON LE STOCKE DANS UNE VARIABLE
    const newContract = await prisma.investmentContract.create({
      data: {
        userId: userId,
        ipAddress: ip,
        userAgent: userAgent,
        signatureData: signatureData,
        amount: user?.walletBalance || 0, 
        packName: user?.backerTier || "Standard"
      }
    });

    revalidatePath('/invest/dashboard');
    
    // 3. ✅ RETURN CRITIQUE : ON RENVOIE L'ID POUR LE PAIEMENT
    return { 
        success: true, 
        contractId: newContract.id 
    };

  } catch (error) {
    console.error("Erreur signature:", error);
    return { success: false, error: "Erreur serveur" };
  }
}
