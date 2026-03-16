import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TransactionType, BalanceType, VerificationStatus, Role } from "@prisma/client";
import { z } from "zod";

export const dynamic = 'force-dynamic';

// 1. VALIDATION STRICTE (Anti-Injection)
const withdrawSchema = z.object({
  amount: z.number().positive("Le montant doit être supérieur à 0"),
  paymentMethod: z.string().min(2, "Moyen de paiement requis (ex: WAVE, ORANGE_MONEY)"),
  paymentNumber: z.string().min(8, "Numéro de compte/téléphone invalide")
});

export async function POST(request: Request) {
  try {
    // 2. SÉCURITÉ PÉRIMÉTRIQUE
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const validation = withdrawSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({ error: "Données invalides", details: validation.error.format() }, { status: 400 });
    }

    const { amount, paymentMethod, paymentNumber } = validation.data;

    // 3. EXÉCUTION ATOMIQUE (Anti-Double-Spend)
    const result = await prisma.$transaction(async (tx) => {
        // Lecture avec verrouillage de plage implicite (Serializable)
        const agent = await tx.user.findUnique({
            where: { id: userId },
            select: { 
                role: true, 
                walletBalance: true, 
                kyc: { select: { status: true } } 
            }
        });

        // A. Vérification des droits
        if (!agent || agent.role !== Role.AGENT) {
            throw new Error("Accès refusé. Profil Agent requis.");
        }

        // B. Conformité KYC (Lutte Anti-Blanchiment)
        if (agent.kyc?.status !== VerificationStatus.VERIFIED) {
            throw new Error("Accréditation (KYC) requise pour effectuer un retrait.");
        }

        // C. Contrôle de solvabilité
        if (agent.walletBalance < amount) {
            throw new Error("Solde insuffisant pour ce retrait.");
        }

        // D. Mutation financière
        const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { walletBalance: { decrement: amount } }
        });

        // E. Audit Trail (Inscription au Grand Livre)
        const transaction = await tx.transaction.create({
            data: {
                amount: amount,
                type: TransactionType.DEBIT, // Constante stricte [cite: 63]
                balanceType: BalanceType.WALLET,
                reason: `Retrait de commissions vers ${paymentMethod} (${paymentNumber})`,
                status: "SUCCESS", 
                userId: userId,
                reference: `WDR-${Date.now().toString().slice(-6)}-${userId.substring(0, 6)}`
            }
        });

        return { newBalance: updatedUser.walletBalance, transactionId: transaction.id };
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("[API_AGENT_WITHDRAW]", error);
    // Renvoi du message d'erreur métier généré dans la transaction
    return NextResponse.json({ error: error.message || "Erreur interne lors du retrait." }, { status: 400 });
  }
}
