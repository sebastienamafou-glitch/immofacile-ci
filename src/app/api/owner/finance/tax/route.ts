import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. SÉCURITÉ ZERO TRUST
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

    // 2. RÉCUPÉRATION PROPRIÉTAIRE
    const owner = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { id: true, name: true, email: true }
    });

    if (!owner) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

    // 3. FILTRES TEMPORELS
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    // 4. RÉCUPÉRATION GLOBALE DES PROPRIÉTÉS ET DÉPENSES
    const properties = await prisma.property.findMany({
      where: { ownerId: owner.id },
      include: {
        incidents: {
            where: {
                updatedAt: { gte: startDate, lte: endDate },
                status: { in: ['RESOLVED', 'CLOSED'] },
                finalCost: { not: null }
            }
        }
      }
    });

    // 5. RÉCUPÉRATION DES REVENUS (Option A : via Transactions comptables)
    // On prend toutes les transactions de crédit liées à ce propriétaire dans l'année.
    const transactions = await prisma.transaction.findMany({
        where: {
            userId: owner.id,
            type: 'CREDIT',
            status: 'SUCCESS',
            createdAt: { gte: startDate, lte: endDate }
        }
    });

    // 6. VENTILATION PAR PROPRIÉTÉ
    let totalRevenue = 0;
    let totalExpenses = 0;

    const breakdown = properties.map((prop) => {
        // DÉPENSES : Coût final des incidents pour cette propriété
        const propExpenses = prop.incidents.reduce((sum, inc) => {
            return sum + (inc.finalCost || 0);
        }, 0);
        
        // REVENUS : On cherche dans le 'reason' de la transaction si le titre de la propriété y figure.
        // C'est pourquoi nous avons formaté les raisons comme "Loyer/Caution (Net) - Titre de la propriété"
        const propRevenue = transactions
            .filter(tx => tx.reason.includes(prop.title))
            .reduce((sum, tx) => sum + tx.amount, 0);

        totalRevenue += propRevenue;
        totalExpenses += propExpenses;

        return {
            id: prop.id,
            title: prop.title,
            commune: prop.commune,
            rev: propRevenue,
            exp: propExpenses,
            net: propRevenue - propExpenses
        };
    });

    // Ajouter les revenus "orphelins" (qui ne correspondent à aucune propriété activement listée)
    const categorizedRevenue = breakdown.reduce((sum, p) => sum + p.rev, 0);
    const orphanRevenue = transactions.reduce((sum, tx) => sum + tx.amount, 0) - categorizedRevenue;

    if (orphanRevenue > 0) {
        totalRevenue += orphanRevenue;
        breakdown.push({
            id: "other",
            title: "Autres revenus (Akwaba / Historique)",
            commune: "-",
            rev: orphanRevenue,
            exp: 0,
            net: orphanRevenue
        });
    }

    return NextResponse.json({
      success: true,
      data: {
          year,
          ownerName: owner.name,
          ownerEmail: owner.email,
          revenue: totalRevenue,
          expenses: totalExpenses,
          net: totalRevenue - totalExpenses,
          properties: breakdown
      }
    });

  } catch (error: any) {
    console.error("Erreur API Tax:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
