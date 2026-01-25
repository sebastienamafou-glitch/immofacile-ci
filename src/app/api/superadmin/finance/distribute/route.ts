import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

// --- HELPER DE SÉCURITÉ (Admin Only) ---
async function checkSuperAdmin(request: Request) {
  const userEmail = request.headers.get("x-user-email");
  if (!userEmail) return null;
  
  const admin = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!admin || admin.role !== Role.SUPER_ADMIN) return null;
  
  return admin;
}

// =====================================================================
// POST : VERSER LES DIVIDENDES (Batch Processing)
// =====================================================================
export async function POST(request: Request) {
  try {
    // 1. Sécurité (Gatekeeper)
    const admin = await checkSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

    // 2. Validation de l'input
    const body = await request.json();
    const { amount, periodName } = body; // ex: 10000000, "T1 2026"

    if (!amount || amount <= 0) {
        return NextResponse.json({ error: "Montant global invalide." }, { status: 400 });
    }
    const globalDividendPool = parseInt(amount);

    // 3. Récupération des Actionnaires (Ceux qui ont des contrats signés)
    // On ne rémunère que le capital ACTIF (engagé dans des contrats), pas l'argent qui dort sur le wallet.
    const investors = await prisma.user.findMany({
        where: { 
            role: Role.INVESTOR, 
            isActive: true,
            // Optimisation : On ne prend que ceux qui ont au moins 1 contrat
            investmentContracts: { some: {} } 
        },
        include: {
            investmentContracts: {
                select: { amount: true } // On a besoin que du montant pour le calcul
            }
        }
    });

    if (investors.length === 0) {
        return NextResponse.json({ error: "Aucun investisseur éligible (aucun contrat actif)." }, { status: 400 });
    }

    // 4. Calcul de la "Masse Monétaire" (Total Capital Investi)
    let totalInvestedCapital = 0;
    
    // On prépare une map pour stocker le capital de chacun
    const shareholderMap = investors.map(investor => {
        // Somme des contrats de cet investisseur
        const userCapital = investor.investmentContracts.reduce((sum, contract) => sum + contract.amount, 0);
        totalInvestedCapital += userCapital;
        
        return {
            userId: investor.id,
            userCapital: userCapital,
            userName: investor.name
        };
    });

    if (totalInvestedCapital === 0) {
        return NextResponse.json({ error: "Capital total investi nul. Impossible de calculer les parts." }, { status: 400 });
    }

    // 5. Préparation de la Transaction Atomique (Le cœur du réacteur)
    // On va empiler toutes les opérations de crédit pour les exécuter en une fois.
    const prismaOperations = [];
    let distributedCheck = 0; // Pour vérifier à la fin combien on a distribué réellement
    let beneficiariesCount = 0;

    for (const shareholder of shareholderMap) {
        if (shareholder.userCapital > 0) {
            // --- FORMULE FINANCIÈRE ---
            // Part = (Capital User / Capital Total) * Enveloppe Dividendes
            const rawShare = (shareholder.userCapital / totalInvestedCapital) * globalDividendPool;
            
            // On arrondit à l'entier inférieur pour ne pas distribuer plus que l'enveloppe (Safety)
            const shareAmount = Math.floor(rawShare);

            if (shareAmount > 0) {
                beneficiariesCount++;
                distributedCheck += shareAmount;

                // Opération A : Créditer le Wallet
                prismaOperations.push(
                    prisma.user.update({
                        where: { id: shareholder.userId },
                        data: { walletBalance: { increment: shareAmount } }
                    })
                );

                // Opération B : Créer la ligne comptable (Historique)
                prismaOperations.push(
                    prisma.transaction.create({
                        data: {
                            amount: shareAmount,
                            type: "CREDIT", // Entrée d'argent
                            reason: `DIVIDENDE_${periodName || 'GENERIC'}`, // ex: DIVIDENDE_T1_2026
                            status: "SUCCESS",
                            userId: shareholder.userId,
                            createdAt: new Date()
                        }
                    })
                );
            }
        }
    }

    // 6. Exécution (ACID)
    if (prismaOperations.length > 0) {
        await prisma.$transaction(prismaOperations);
    }

    // 7. Rapport d'exécution
    return NextResponse.json({
        success: true,
        report: {
            poolAmount: globalDividendPool,
            realDistributed: distributedCheck,
            beneficiaries: beneficiariesCount,
            remainder: globalDividendPool - distributedCheck, // Le petit reliquat dû aux arrondis
            capitalBase: totalInvestedCapital
        }
    });

  } catch (error) {
    console.error("[API_FINANCE_DISTRIBUTE]", error);
    return NextResponse.json({ error: "Erreur critique lors de la distribution." }, { status: 500 });
  }
}
