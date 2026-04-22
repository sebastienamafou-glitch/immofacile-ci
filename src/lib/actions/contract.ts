'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth"; 
import { headers } from "next/headers"; 
import { InvestmentPack } from "@prisma/client";

export async function signInvestmentContract(signatureData: string | undefined) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return { success: false, error: "Session expirée. Veuillez vous reconnecter." };
    if (!signatureData) return { success: false, error: "Signature manquante." };

    const headersList = headers();
    const ip = headersList.get('x-forwarded-for') || 'Unknown IP';
    const userAgent = headersList.get('user-agent') || 'Unknown UA';

    const user = await prisma.user.findUnique({ 
        where: { id: userId },
        include: { finance: true } 
    });

    if (!user) return { success: false, error: "Utilisateur introuvable." };

    // 🔒 CORRECTION : Conversion sécurisée vers l'Enum strict
    const validPacks = Object.values(InvestmentPack) as string[];
    const safePackName = (user.backerTier && validPacks.includes(user.backerTier)) 
        ? (user.backerTier as InvestmentPack) 
        : InvestmentPack.STARTER;

    const newContract = await prisma.investmentContract.create({
      data: {
        userId: userId,
        ipAddress: ip,
        userAgent: userAgent,
        signatureData: signatureData,
        amount: user.finance?.walletBalance || 0, 
        packName: (user.backerTier as InvestmentPack) || InvestmentPack.STARTER // 🔒 CORRECTION
      }
    });

    revalidatePath('/investor/dashboard');
    
    return { success: true, contractId: newContract.id };

  } catch (error) {
    console.error("Erreur signature:", error);
    return { success: false, error: "Impossible de signer le contrat." };
  }
}
