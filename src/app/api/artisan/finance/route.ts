import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ
    const userId = request.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // 2. RÉCUPÉRATION USER + TRANSACTIONS
    const artisan = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        walletBalance: true,
        // On récupère l'historique des transactions liées à cet utilisateur
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20 // On limite aux 20 dernières pour l'affichage initial
        },
        // On récupère aussi les jobs en cours pour le KPI "Pending"
        incidentsAssigned: {
            where: { status: { in: ['IN_PROGRESS'] } }
        }
      }
    });

    if (!artisan) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    // 3. CALCUL DES KPIS
    // Pour le "Total Earnings", on somme toutes les transactions de type "CREDIT"
    const totalEarnings = artisan.transactions
        .filter(t => t.type === 'CREDIT')
        .reduce((acc, curr) => acc + curr.amount, 0);

    // 4. FORMATAGE POUR LE FRONTEND
    const history = artisan.transactions.map(t => ({
        id: t.id,
        description: t.reason || "Transaction",
        date: t.createdAt.toISOString(),
        amount: t.amount,
        location: "Mobile Money", // Ou une vraie localisation si dispo
        status: t.status,
        type: t.type // Utile pour le frontend pour savoir si c'est + ou -
    }));

    return NextResponse.json({
      balance: artisan.walletBalance,
      totalEarnings,
      pendingJobs: artisan.incidentsAssigned.length,
      history
    });

  } catch (error) {
    console.error("Erreur Finance:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
