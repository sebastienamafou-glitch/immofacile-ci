import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
// ✅ IMPORT DU STATUT STRICT
import { TransactionType, BalanceType, Prisma, InvestmentStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const distributeSchema = z.object({
  amount: z.number().positive("Le montant global doit être positif"),
  periodName: z.string().min(2, "Le nom de la période est requis")
});

export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const validation = distributeSchema.safeParse(body);
    
    if (!validation.success) {
        return NextResponse.json({ error: "Données invalides", details: validation.error.format() }, { status: 400 });
    }

    const { amount: globalDividendPool, periodName } = validation.data;

    // 🔒 CORRECTION 1 : Utilisation de l'Enum InvestmentStatus.ACTIVE (Le statut "SUCCESS" n'existe pas)
    const investors = await prisma.user.findMany({
        where: { 
            role: "INVESTOR", 
            isActive: true,
            investmentContracts: { some: { status: InvestmentStatus.ACTIVE } } 
        },
        select: {
            id: true,
            investmentContracts: { 
                where: { status: InvestmentStatus.ACTIVE }, 
                select: { amount: true } 
            }
        }
    });

    if (investors.length === 0) {
        return NextResponse.json({ error: "Aucun investisseur éligible avec des fonds validés." }, { status: 400 });
    }

    let totalInvestedCapital = 0;
    const shareholderMap = investors.map(investor => {
        // 🔒 CORRECTION 2 : Typage explicite de 'sum' et 'contract' pour éviter l'erreur 'any' implicite
        const userCapital = investor.investmentContracts.reduce((sum: number, contract: { amount: number }) => sum + contract.amount, 0);
        totalInvestedCapital += userCapital;
        return { userId: investor.id, userCapital };
    });

    if (totalInvestedCapital === 0) {
        return NextResponse.json({ error: "Capital total validé nul." }, { status: 400 });
    }

    const prismaOperations: Prisma.PrismaPromise<unknown>[] = [];
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

                // 🔒 CORRECTION 3 : Ciblage de la table UserFinance via nested update
                prismaOperations.push(
                    prisma.user.update({
                        where: { id: shareholder.userId },
                        data: { 
                            finance: { update: { walletBalance: { increment: shareAmount } } } 
                        }
                    })
                );

                prismaOperations.push(
                    prisma.transaction.create({
                        data: {
                            amount: shareAmount,
                            type: TransactionType.CREDIT,
                            balanceType: BalanceType.WALLET,
                            reason: `Dividendes - ${periodName}`,
                            status: "SUCCESS",
                            userId: shareholder.userId,
                            reference: `DIV-${periodName.replace(/\s+/g, '')}-${shareholder.userId.substring(0,6)}-${timestamp}`
                        }
                    })
                );
            }
        }
    }

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

  } catch (error: unknown) {
    console.error("[API_FINANCE_DISTRIBUTE]", error);
    return NextResponse.json({ error: "Erreur critique lors de la distribution." }, { status: 500 });
  }
}
