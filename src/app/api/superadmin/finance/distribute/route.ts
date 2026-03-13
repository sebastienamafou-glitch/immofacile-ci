import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TransactionType, BalanceType } from "@prisma/client";
import { z } from "zod";

export const dynamic = 'force-dynamic';

// 1. VALIDATION STRICTE
const distributeSchema = z.object({
  amount: z.number().positive("Le montant global doit être positif"),
  periodName: z.string().min(2, "Le nom de la période est requis")
});

export async function POST(request: Request) {
  try {
    // 2. SÉCURITÉ BLINDÉE (Auth v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { role: true }
    });

    if (!admin || admin.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // 3. VALIDATION INPUT
    const body = await request.json();
    const validation = distributeSchema.safeParse(body);
    
    if (!validation.success) {
        return NextResponse.json({ error: "Données invalides", details: validation.error.format() }, { status: 400 });
    }

    const { amount: globalDividendPool, periodName } = validation.data;

    // 4. RÉCUPÉRATION SÉCURISÉE DES INVESTISSEURS (Uniquement les contrats validés)
    const investors = await prisma.user.findMany({
        where: { 
            role: "INVESTOR", 
            isActive: true,
            investmentContracts: { some: { status: "SUCCESS" } } 
        },
        select: {
            id: true,
            investmentContracts: { 
                where: { status: "SUCCESS" }, // Filtre anti-fonds fantômes
                select: { amount: true } 
            }
        }
    });

    if (investors.length === 0) {
        return NextResponse.json({ error: "Aucun investisseur éligible avec des fonds validés." }, { status: 400 });
    }

    // 5. CALCUL MASSE MONÉTAIRE
    let totalInvestedCapital = 0;
    const shareholderMap = investors.map(investor => {
        const userCapital = investor.investmentContracts.reduce((sum, contract) => sum + contract.amount, 0);
        totalInvestedCapital += userCapital;
        return { userId: investor.id, userCapital };
    });

    if (totalInvestedCapital === 0) {
        return NextResponse.json({ error: "Capital total validé nul." }, { status: 400 });
    }

    // 6. PRÉPARATION TRANSACTION (ACID)
    const prismaOperations = [];
    let distributedCheck = 0;
    let beneficiariesCount = 0;
    const timestamp = Date.now();

    for (const shareholder of shareholderMap) {
        if (shareholder.userCapital > 0) {
            const rawShare = (shareholder.userCapital / totalInvestedCapital) * globalDividendPool;
            const shareAmount = Math.floor(rawShare);

            if (shareAmount > 0) {
                beneficiariesCount++;
                distributedCheck += shareAmount;

                // A. Crédit Wallet unifié (Modèle User)
                prismaOperations.push(
                    prisma.user.update({
                        where: { id: shareholder.userId },
                        data: { walletBalance: { increment: shareAmount } }
                    })
                );

                // B. Trace Transaction (Typage Strict Prisma)
                prismaOperations.push(
                    prisma.transaction.create({
                        data: {
                            amount: shareAmount,
                            type: TransactionType.CREDIT,
                            balanceType: BalanceType.WALLET,
                            reason: `Dividendes - ${periodName}`,
                            status: "SUCCESS",
                            userId: shareholder.userId,
                            reference: `DIV-${periodName.replace(/\s+/g, '')}-${shareholder.userId.substring(0,6)}-${timestamp}`,
                            previousHash: "GENESIS"
                        }
                    })
                );
            }
        }
    }

    // 7. EXÉCUTION ATOMIQUE
    if (prismaOperations.length > 0) {
        await prisma.$transaction(prismaOperations);
    }

    return NextResponse.json({
        success: true,
        report: {
            poolAmount: globalDividendPool,
            realDistributed: distributedCheck,
            beneficiaries: beneficiariesCount,
            remainder: globalDividendPool - distributedCheck,
            capitalBase: totalInvestedCapital
        }
    });

  } catch (error) {
    console.error("[API_FINANCE_DISTRIBUTE]", error);
    return NextResponse.json({ error: "Erreur critique lors de la distribution." }, { status: 500 });
  }
}
