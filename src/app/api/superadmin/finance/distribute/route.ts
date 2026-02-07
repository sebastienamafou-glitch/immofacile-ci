import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. SÉCURITÉ BLINDÉE (Auth v5)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, role: true }
    });

    if (!admin || admin.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // 2. VALIDATION INPUT
    const body = await request.json();
    const { amount, periodName } = body; 

    if (!amount || amount <= 0) {
        return NextResponse.json({ error: "Montant global invalide." }, { status: 400 });
    }
    const globalDividendPool = parseInt(amount);

    // 3. RECUPERATION INVESTISSEURS
    const investors = await prisma.user.findMany({
        where: { 
            role: "INVESTOR", 
            isActive: true,
            investmentContracts: { some: {} } 
        },
        include: {
            investmentContracts: { select: { amount: true } }
        }
    });

    if (investors.length === 0) {
        return NextResponse.json({ error: "Aucun investisseur éligible." }, { status: 400 });
    }

    // 4. CALCUL MASSE MONÉTAIRE
    let totalInvestedCapital = 0;
    const shareholderMap = investors.map(investor => {
        const userCapital = investor.investmentContracts.reduce((sum, contract) => sum + contract.amount, 0);
        totalInvestedCapital += userCapital;
        return { userId: investor.id, userCapital };
    });

    if (totalInvestedCapital === 0) {
        return NextResponse.json({ error: "Capital total nul." }, { status: 400 });
    }

    // 5. PRÉPARATION TRANSACTION (ACID)
    const prismaOperations = [];
    let distributedCheck = 0;
    let beneficiariesCount = 0;

    for (const shareholder of shareholderMap) {
        if (shareholder.userCapital > 0) {
            // Règle de trois : Part = (Capital User / Capital Total) * Enveloppe
            const rawShare = (shareholder.userCapital / totalInvestedCapital) * globalDividendPool;
            const shareAmount = Math.floor(rawShare);

            if (shareAmount > 0) {
                beneficiariesCount++;
                distributedCheck += shareAmount;

                // A. Crédit Wallet (Correction Schema : UserFinance)
                // On utilise upsert pour créer le wallet s'il n'existe pas
                prismaOperations.push(
                    prisma.userFinance.upsert({
                        where: { userId: shareholder.userId },
                        create: {
                            userId: shareholder.userId,
                            walletBalance: shareAmount,
                            version: 1,
                            kycTier: 1
                        },
                        update: { 
                            walletBalance: { increment: shareAmount },
                            version: { increment: 1 } // Optimistic Lock simple
                        }
                    })
                );

                // B. Trace Transaction (Correction Schema : balanceType)
                prismaOperations.push(
                    prisma.transaction.create({
                        data: {
                            amount: shareAmount,
                            type: "CREDIT",
                            balanceType: "WALLET", // ✅ OBLIGATOIRE MAINTENANT
                            reason: `DIVIDENDE_${periodName || 'GENERIC'}`,
                            status: "SUCCESS",
                            userId: shareholder.userId
                        }
                    })
                );
            }
        }
    }

    // 6. EXÉCUTION ATOMIQUE
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
