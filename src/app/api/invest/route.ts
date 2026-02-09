import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. Vérification Sécurité
    const session = await auth();
    
    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    
    const userId = session.user.id;

    // 2. Récupération Parallèle (Optimisation Performance ⚡️)
    // On lance les deux requêtes en même temps pour gagner du temps
    const [user, investments] = await Promise.all([
        // Requête A : Infos Utilisateur & KYC
        prisma.user.findUnique({
            where: { id: userId },
            select: { 
                id: true,
                isVerified: true, // Le statut global
                kyc: {            // Les détails KYC (Table liée)
                    select: {
                        status: true,
                        rejectionReason: true
                    }
                }
            }
        }),
        // Requête B : Investissements
        prisma.investmentContract.findMany({
            where: { userId: userId },
            orderBy: { signedAt: 'desc' }, 
            select: {
                id: true,
                amount: true,
                status: true,
                signedAt: true,
                packName: true,
                paymentReference: true
            }
        })
    ]);

    if (!user) {
        return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 403 });
    }

    // 3. Calculs Financiers
    const totalInvested = investments.reduce((acc, inv) => {
        // On compte les investissements ACTIFS et EN ATTENTE (fonds engagés)
        if (inv.status === 'ACTIVE' || inv.status === 'PENDING') {
            return acc + inv.amount;
        }
        return acc;
    }, 0);

    const activeCount = investments.filter(i => i.status === 'ACTIVE').length;
    
    // Projection simple (ex: 15% annuel)
    const projectedEarnings = Math.round(totalInvested * 0.15); 

    // 4. Préparation de la réponse
    return NextResponse.json({
      success: true,
      
      // ✅ NOUVEAU : On renvoie les données KYC fraîches au Frontend
      kyc: {
          isVerified: user.isVerified,       // Boolean simple
          status: user.kyc?.status || "NONE", // Statut détaillé (PENDING, REJECTED...)
          rejectionReason: user.kyc?.rejectionReason || null
      },

      stats: {
        totalInvested,
        activeCount,
        projectedEarnings
      },

      investments: investments.map(inv => ({
          id: inv.id,
          amount: inv.amount,
          status: inv.status,
          createdAt: inv.signedAt, // Mapping pour l'affichage
          packName: inv.packName || "Investissement Standard",
          isSigned: !!inv.signedAt 
      }))
    });

  } catch (error: any) {
    console.error("🔥 Error GET /investor/dashboard:", error.message);
    return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 });
  }
}
