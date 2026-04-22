import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TransactionType, BalanceType, VerificationStatus, Role } from "@prisma/client";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const withdrawSchema = z.object({
  amount: z.number().positive("Le montant doit être supérieur à 0"),
  paymentMethod: z.string().min(2, "Moyen de paiement requis (ex: WAVE, ORANGE_MONEY)"),
  paymentNumber: z.string().min(8, "Numéro de compte/téléphone invalide")
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const validation = withdrawSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: "Données invalides", details: validation.error.format() }, { status: 400 });
    }

    const { amount, paymentMethod, paymentNumber } = validation.data;

    const result = await prisma.$transaction(async (tx) => {
        const agent = await tx.user.findUnique({
            where: { id: userId },
            select: { 
                role: true, 
                finance: { select: { walletBalance: true } }, // 🔒 CORRECTION
                kyc: { select: { status: true } } 
            }
        });

        if (!agent || agent.role !== Role.AGENT) {
            throw new Error("Accès refusé. Profil Agent requis.");
        }

        if (agent.kyc?.status !== VerificationStatus.VERIFIED) {
            throw new Error("Accréditation (KYC) requise pour effectuer un retrait.");
        }

        const currentBalance = agent.finance?.walletBalance || 0; // 🔒 CORRECTION
        if (currentBalance < amount) {
            throw new Error("Solde insuffisant pour ce retrait.");
        }

        // 🔒 CORRECTION : Mise à jour ciblée sur la table UserFinance
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { 
                finance: { update: { walletBalance: { decrement: amount } } } 
            },
            include: { finance: true }
        });

        const transaction = await tx.transaction.create({
            data: {
                amount: amount,
                type: TransactionType.DEBIT,
                balanceType: BalanceType.WALLET,
                reason: `Demande de paiement agence vers ${paymentMethod} (${paymentNumber})`,
                status: "SUCCESS", 
                userId: userId,
                reference: `WDR-${Date.now().toString().slice(-6)}-${userId.substring(0, 6)}`
            }
        });

        return { newBalance: updatedUser.finance?.walletBalance || 0, transactionId: transaction.id };
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ success: true, data: result });

  } catch (error: unknown) {
    console.error("[API_AGENT_WITHDRAW]", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur interne lors du retrait.";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
