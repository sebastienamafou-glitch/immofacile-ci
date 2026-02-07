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

    // 4. REQUÊTE HAUTE PRÉCISION
    const properties = await prisma.property.findMany({
      where: { ownerId: owner.id },
      include: {
        leases: {
            include: {
                payments: {
                    where: {
                        date: { gte: startDate, lte: endDate },
                        status: 'SUCCESS',
                        // On garde les revenus locatifs, on exclut les cautions
                        type: { in: ['LOYER', 'CHARGES'] } 
                    }
                }
            }
        },
        incidents: {
            where: {
                updatedAt: { gte: startDate, lte: endDate },
                status: { in: ['RESOLVED', 'CLOSED'] }, // On ne déduit que les factures payées/fermées
                finalCost: { not: null }
            }
        }
      }
    });

    // 5. MOTEUR DE CALCUL (Correction Fiscale)
    let totalRevenue = 0;
    let totalExpenses = 0;

    const breakdown = properties.map((prop) => {
        
        // REVENUS : On prend le NET PERÇU (amountOwner)
        // Si ancien paiement avant migration, fallback sur une estimation (net = 90% brut) ou 0
        const propRevenue = prop.leases.reduce((sum, lease) => {
            return sum + lease.payments.reduce((pSum, p) => {
                // ✅ CORRECTIF CRITIQUE : Seul l'argent reçu dans le wallet est imposable
                return pSum + (p.amountOwner || 0); 
            }, 0);
        }, 0);

        // DÉPENSES : Coût final des incidents
        const propExpenses = prop.incidents.reduce((sum, inc) => {
            return sum + (inc.finalCost || 0);
        }, 0);
        
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
