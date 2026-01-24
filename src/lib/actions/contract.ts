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

    // On récupère d'abord l'user pour avoir le montant et le pack (pour l'historique)
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // ✅ ON CRÉE DANS LA NOUVELLE TABLE DÉDIÉE
    await prisma.investmentContract.create({
      data: {
        userId: userId,
        ipAddress: ip,
        userAgent: userAgent,
        signatureData: signatureData,
        amount: user?.walletBalance || 0, // On fige le montant dans le contrat
        packName: user?.backerTier || "Standard"
      }
    });

    revalidatePath('/invest/dashboard');
    return { success: true };

  } catch (error) {
    console.error("Erreur signature:", error);
    return { success: false, error: "Erreur serveur" };
  }
}
