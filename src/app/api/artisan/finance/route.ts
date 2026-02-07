import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";


export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ : Session Serveur
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    // 2. RÉCUPÉRATION DONNÉES (CORRECTION SCHEMA)
    const artisan = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        // ✅ On passe par la relation Finance pour le solde
        finance: {
            select: { walletBalance: true }
        },
        // Historique des transactions (Liaison User -> Transaction toujours valide)
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20 
        },
        // Jobs en cours
        incidentsAssigned: {
            where: { status: { in: ['IN_PROGRESS'] } }
        }
      }
    });

    if (!artisan) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    // 3. CALCUL DES KPIS
    // ✅ Récupération sécurisée du solde
    const currentBalance = artisan.finance?.walletBalance || 0;

    const totalEarnings = artisan.transactions
        .filter(t => t.type === 'CREDIT' && t.status === 'SUCCESS')
        .reduce((acc, curr) => acc + curr.amount, 0);

    // 4. FORMATAGE
    const history = artisan.transactions.map(t => ({
        id: t.id,
        description: t.reason || "Transaction",
        date: t.createdAt.toISOString(),
        amount: t.amount,
        location: "Mobile Money",
        status: t.status,
        type: t.type 
    }));

    return NextResponse.json({
      balance: currentBalance, // ✅ Valeur corrigée
      totalEarnings,
      pendingJobs: artisan.incidentsAssigned.length,
      history
    });

  } catch (error) {
    console.error("Erreur Finance:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
